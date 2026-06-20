import { CATALOG_ID } from '../types.js';
import type { A2UIMessage, MatchScoreData } from '../types.js';

/**
 * matchScore
 * ----------
 * Exibe a nota de aderência do currículo à vaga e um resumo de uma linha.
 *
 * Layout (A2UI v0.9):
 *   Card → Column → [
 *     Text "Aderência à vaga"  (caption)
 *     Text { path: "/score" }  (h1)   — nota percentual em destaque
 *     Divider
 *     Text { path: "/resumo" } (body) — frase de avaliação geral
 *   ]
 *
 * O LLM fornece apenas { score, resumo }; o layout é montado aqui
 * e nunca pelo modelo, garantindo conformidade com o catálogo.
 */
export function buildMatchScore(surfaceId: string, data: MatchScoreData): A2UIMessage[] {
    return [
        {
            version: 'v0.9',
            createSurface: {
                surfaceId,
                catalogId: CATALOG_ID,
                sendDataModel: true,
            },
        },
        {
            version: 'v0.9',
            updateComponents: {
                surfaceId,
                components: [
                    { id: 'root', component: 'Card', child: 'col' },
                    {
                        id: 'col',
                        component: 'Column',
                        children: ['label', 'score', 'div', 'resumo'],
                    },
                    {
                        id: 'label',
                        component: 'Text',
                        text: 'Aderência à vaga',
                        variant: 'caption',
                    },
                    {
                        id: 'score',
                        component: 'Text',
                        text: { path: '/score' },
                        variant: 'h1',
                    },
                    { id: 'div', component: 'Divider' },
                    {
                        id: 'resumo',
                        component: 'Text',
                        text: { path: '/resumo' },
                        variant: 'body',
                    },
                ],
            },
        },
        {
            version: 'v0.9',
            updateDataModel: {
                surfaceId,
                value: data as Record<string, unknown>,
            },
        },
    ];
}
