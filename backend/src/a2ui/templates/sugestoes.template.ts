import { CATALOG_ID } from '../types.js';
import type { A2UIMessage, SugestoesData } from '../types.js';

/**
 * sugestoes
 * ---------
 * Lista sugestões práticas para o candidato melhorar o currículo em relação à vaga.
 *
 * Layout:
 *   Card → Column → [
 *     Text "Sugestões de melhoria" (h3)
 *     List → sugestao-row (template por item) → Row → [
 *       Icon "info"                   — ícone fixo (literal, não data-bound)
 *       Text { path: "sugestao" }     (body, weight:1)
 *     ]
 *   ]
 *
 * O ícone 'info' é literal — o mesmo para todas as linhas.
 * O LLM fornece apenas { itens: [{ sugestao }] }.
 */
export function buildSugestoes(surfaceId: string, data: SugestoesData): A2UIMessage[] {
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
                        children: ['titulo', 'lista'],
                    },
                    {
                        id: 'titulo',
                        component: 'Text',
                        text: 'Sugestões de melhoria',
                        variant: 'h3',
                    },
                    {
                        id: 'lista',
                        component: 'List',
                        children: { componentId: 'sugestao-row', path: '/itens' },
                    },
                    {
                        id: 'sugestao-row',
                        component: 'Row',
                        children: ['sug-icone', 'sug-texto'],
                        align: 'center',
                    },
                    {
                        id: 'sug-icone',
                        component: 'Icon',
                        name: 'info',
                    },
                    {
                        id: 'sug-texto',
                        component: 'Text',
                        text: { path: 'sugestao' },
                        variant: 'body',
                        weight: 1,
                    },
                ],
            },
        },
        {
            version: 'v0.9',
            updateDataModel: {
                surfaceId,
                value: { itens: data.itens },
            },
        },
    ];
}
