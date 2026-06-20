import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Buffer } from 'node:buffer';
import pdfParse from 'pdf-parse';

/**
 * analyzePdf
 * ----------
 * Extrai o texto de um PDF em base64. No fluxo normal, o backend já faz
 * essa extração em src/mastra/index.ts antes de o modelo ver a conversa
 * (evita ecoar base64 nos argumentos de tool). Esta tool é um fallback
 * para o caso de o agente receber um PDF bruto não pré-processado.
 */
export const analyzePdfTool = createTool({
    id: 'analyzePdf',
    description:
        'Extrai o texto de um PDF (recebido em base64) para que o agente possa analisá-lo.',
    inputSchema: z.object({
        pdfBase64: z.string().describe('Conteúdo do PDF codificado em base64.'),
    }),
    outputSchema: z.object({
        text: z.string(),
        pages: z.number(),
    }),
    execute: async (context) => {
        const buffer = Buffer.from(context.pdfBase64, 'base64');
        const result = await pdfParse(buffer);
        return { text: result.text, pages: result.numpages };
    },
});
