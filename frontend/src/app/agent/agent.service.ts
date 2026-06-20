import { Injectable, inject, signal } from '@angular/core';
import { HttpAgent } from '@ag-ui/client';
import { EventType, type BaseEvent, type TextMessageChunkEvent, type ToolCallResultEvent } from '@ag-ui/core';
import { A2uiRendererService } from '@a2ui/angular/v0_9';
import type { A2uiMessage } from '@a2ui/web_core/v0_9';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const BACKEND_URL = 'http://localhost:4113/awp';

@Injectable({ providedIn: 'root' })
export class AgentService {
  private readonly renderer = inject(A2uiRendererService);
  private readonly http = new HttpAgent({ url: BACKEND_URL });
  private streamingMsgId: string | null = null;

  readonly messages = signal<ChatMessage[]>([]);
  readonly surfaceIds = signal<string[]>([]);
  readonly isRunning = signal(false);

  enviar(pergunta: string, curriculoBase64: string, vagaBase64: string): void {
    // Remove todas as surfaces anteriores do renderer (singleton) para permitir re-análise.
    // Sem isso, createSurface com o mesmo surfaceId lançaria "Surface X already exists".
    for (const id of [...this.renderer.surfaceGroup.surfacesMap.keys()]) {
      this.renderer.processMessages([{ version: 'v0.9', deleteSurface: { surfaceId: id } } as A2uiMessage]);
    }

    this.surfaceIds.set([]);
    this.streamingMsgId = null;

    const content = `${pergunta}\n\n[CURRICULO base64]:${curriculoBase64}\n\n[VAGA base64]:${vagaBase64}`;
    this.messages.update(msgs => [...msgs, { role: 'user', content: pergunta }]);
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
      this.streamingMsgId = msgId;
      this.messages.update(msgs => [...msgs, { role: 'assistant', content: chunk.delta! }]);
    } else {
      this.messages.update(msgs => {
        const copy = [...msgs];
        const last = copy[copy.length - 1];
        if (last?.role === 'assistant') {
          copy[copy.length - 1] = { role: 'assistant', content: last.content + chunk.delta };
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
      this.surfaceIds.update(ids => [...ids, ...newIds]);
    }
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isToolResult(v: unknown): v is { messages: unknown[] } {
  return isObject(v) && 'messages' in v && Array.isArray((v as { messages: unknown[] }).messages);
}
