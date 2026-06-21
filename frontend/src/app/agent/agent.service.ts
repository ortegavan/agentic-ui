import { Injectable, inject, signal } from '@angular/core';
import { HttpAgent } from '@ag-ui/client';
import { EventType, type BaseEvent, type TextMessageChunkEvent, type ToolCallResultEvent } from '@ag-ui/core';
import { A2uiRendererService } from '@a2ui/angular/v0_9';
import type { A2uiMessage } from '@a2ui/web_core/v0_9';

export type TimelineItem =
  | { kind: 'text'; role: 'user' | 'assistant'; content: string }
  | { kind: 'surface'; surfaceId: string };

const BACKEND_URL = 'http://localhost:4113/awp';

@Injectable({ providedIn: 'root' })
export class AgentService {
  private readonly renderer = inject(A2uiRendererService);
  private readonly http = new HttpAgent({ url: BACKEND_URL });
  private streamingMsgId: string | null = null;
  // Índice do item de texto do assistant em streaming dentro de items.
  // Necessário porque uma surface pode ser inserida no array após esse item
  // antes de o streaming desse texto terminar, tornando [length - 1] inválido.
  private streamingIndex: number | null = null;

  readonly items = signal<TimelineItem[]>([]);
  readonly isRunning = signal(false);

  enviar(pergunta: string, curriculoBase64: string, vagaBase64: string): void {
    // Remove todas as surfaces do renderer singleton para permitir re-análise
    // sem o erro "Surface X already exists" (renderer é singleton e acumula estado).
    for (const id of [...this.renderer.surfaceGroup.surfacesMap.keys()]) {
      this.renderer.processMessages([{ version: 'v0.9', deleteSurface: { surfaceId: id } } as A2uiMessage]);
    }

    this.items.set([]);
    this.streamingMsgId = null;
    this.streamingIndex = null;

    const content = `${pergunta}\n\n[CURRICULO base64]:${curriculoBase64}\n\n[VAGA base64]:${vagaBase64}`;
    this.items.update(items => [...items, { kind: 'text', role: 'user', content: pergunta }]);
    this.isRunning.set(true);

    this.http
      .run({
        threadId: `thread-${Date.now()}`,
        runId: `run-${Date.now()}`,
        state: null,
        tools: [],
        context: [],
        forwardedProps: {},
        messages: [{ id: `msg-${Date.now()}`, role: 'user', content }],
      })
      .subscribe({
        next: (event: BaseEvent) => {
          if (event.type === EventType.TEXT_MESSAGE_CHUNK) {
            this.handleTextChunk(event as TextMessageChunkEvent);
          } else if (event.type === EventType.TOOL_CALL_RESULT) {
            this.handleToolResult((event as ToolCallResultEvent).content);
          }
        },
        error: (err) => {
          console.error('[AG-UI] stream error:', err);
          this.isRunning.set(false);
        },
        complete: () => this.isRunning.set(false),
      });
  }

  private handleTextChunk(chunk: TextMessageChunkEvent): void {
    if (!chunk.delta) return;
    const msgId = chunk.messageId ?? 'default';

    if (msgId !== this.streamingMsgId) {
      // Novo messageId: cria item de texto do assistant na timeline e grava seu índice.
      this.streamingMsgId = msgId;
      this.streamingIndex = this.items().length;
      this.items.update(items => [
        ...items,
        { kind: 'text', role: 'assistant', content: chunk.delta! },
      ]);
    } else {
      // Mesmo messageId: concatena ao item pelo índice gravado, não pelo último elemento.
      // Ponto de decisão: se o backend reutilizar o mesmo messageId após uma surface
      // ("texto de continuação"), o delta é concatenado ao item anterior. Se esse
      // comportamento parecer estranho, trate "texto após surface com mesmo msgId"
      // como novo item e avise para decidirmos.
      this.items.update(items => {
        if (this.streamingIndex === null) return items;
        const copy = [...items];
        const target = copy[this.streamingIndex];
        if (target?.kind === 'text' && target.role === 'assistant') {
          copy[this.streamingIndex] = { ...target, content: target.content + chunk.delta };
        }
        return copy;
      });
    }
  }

  private handleToolResult(rawContent: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return;
    }

    if (!isToolResult(parsed)) return;

    try {
      this.renderer.processMessages(parsed.messages as A2uiMessage[]);
    } catch (e) {
      console.error('[A2UI] processMessages threw:', e);
      return;
    }

    const newIds = parsed.messages
      .filter((m): m is { createSurface: { surfaceId: string } } => isObject(m) && 'createSurface' in m)
      .map(m => m.createSurface.surfaceId);

    if (newIds.length > 0) {
      this.items.update(items => [
        ...items,
        ...newIds.map(id => ({ kind: 'surface' as const, surfaceId: id })),
      ]);
    }
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isToolResult(v: unknown): v is { messages: unknown[] } {
  return isObject(v) && 'messages' in v && Array.isArray((v as { messages: unknown[] }).messages);
}
