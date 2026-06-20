import { Mastra } from '@mastra/core/mastra';
import { registerApiRoute } from '@mastra/core/server';
import { MastraAgent } from '@ag-ui/mastra';
import { streamSSE } from 'hono/streaming';
import { Buffer } from 'node:buffer';
import pdfParse from 'pdf-parse';
import { pdfAnalystAgent } from './agents/pdf-analyst.agent.js';

/*
 * Marcadores de PDF usados pelo frontend para embutir os documentos no body.
 * O pré-processamento abaixo substitui cada bloco [MARCADOR]: <base64>
 * pelo texto extraído antes de o modelo ver a conversa.
 *
 * Motivo: evitar que o modelo ecoe o base64 inteiro nos argumentos de tool,
 * o que esgotaria output tokens antes de completar qualquer tool call.
 */
const CURRICULO_MARKER = '[CURRICULO base64]:';
const VAGA_MARKER = '[VAGA base64]:';

async function substituirPdfBase64(
    content: string,
    marker: string,
    label: string,
    stopAt?: string,
): Promise<string> {
    const markerIdx = content.indexOf(marker);
    if (markerIdx === -1) return content;

    const afterMarker = content.slice(markerIdx + marker.length);

    // Extrai apenas o base64 até o próximo marcador (ou fim da string).
    // Sem isso, content.split(marker)[1] capturaria o restante da mensagem —
    // incluindo o marcador da vaga — corrompendo o decode e descartando a vaga.
    const stopIdx = stopAt ? afterMarker.indexOf(stopAt) : -1;
    const b64 = (stopIdx === -1 ? afterMarker : afterMarker.slice(0, stopIdx)).trim();
    const suffix = stopIdx === -1 ? '' : afterMarker.slice(stopIdx);

    const buffer = Buffer.from(b64, 'base64');
    const result = await pdfParse(buffer);
    const prefix = content.slice(0, markerIdx).trim();
    return `${prefix}\n\n[${label} — ${result.numpages} página(s)]:\n${result.text}${suffix}`;
}

export const mastra = new Mastra({
    agents: { 'pdf-analyst': pdfAnalystAgent },

    server: {
        // CORS: Angular roda em :4200; Mastra em :4113 (mastra dev).
        cors: {
            origin: ['http://localhost:4200'],
            allowMethods: ['GET', 'POST', 'OPTIONS'],
            allowHeaders: ['Content-Type'],
            credentials: false,
        },

        apiRoutes: [
            /*
             * POST /awp — endpoint AG-UI.
             * O frontend aponta HttpAgent para http://localhost:4111/awp.
             *
             * Decisão de arquitetura:
             *   - O agente decide O QUE mostrar (template + dados via renderSurface).
             *   - O layout A2UI válido é gerado por builders em src/a2ui/templates/.
             *   - O LLM nunca compõe layout; não há alucinação de estrutura.
             *   - Os PDFs são extraídos aqui, antes do modelo, para economizar tokens.
             */
            registerApiRoute('/awp', {
                method: 'POST',
                handler: async (c) => {
                    const mastraCtx = c.get('mastra');
                    const agent = mastraCtx.getAgent('pdf-analyst');
                    const aguiAgent = new MastraAgent({
                        agent,
                        resourceId: 'pdf-analyst',
                    });

                    const body = await c.req.json();

                    // @ag-ui/mastra@1.0.3 faz tools.reduce() sem checar undefined — garante array
                    body.tools = body.tools ?? [];

                    // Pré-processa cada mensagem substituindo blocos base64 pelo texto
                    for (const msg of body.messages ?? []) {
                        if (typeof msg.content !== 'string') continue;

                        msg.content = await substituirPdfBase64(
                            msg.content,
                            CURRICULO_MARKER,
                            'Texto do currículo extraído',
                            VAGA_MARKER,       // para no próximo marcador, preservando a vaga
                        );
                        msg.content = await substituirPdfBase64(
                            msg.content,
                            VAGA_MARKER,
                            'Texto da vaga extraído',
                        );
                    }

                    // Cast necessário: Context tipado do registerApiRoute diverge levemente
                    // da assinatura de streamSSE — incompatibilidade de tipos internos do Hono.
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return streamSSE(
                        c as any,
                        (stream) =>
                            new Promise<void>((resolve, reject) => {
                                aguiAgent.run(body).subscribe({
                                    next: (event) =>
                                        stream.writeSSE({
                                            data: JSON.stringify(event),
                                        }),
                                    error: reject,
                                    complete: resolve,
                                });
                            }),
                    );
                },
            }),
        ],
    },
});
