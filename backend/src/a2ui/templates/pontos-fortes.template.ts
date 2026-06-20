import { CATALOG_ID } from '../types.js';
import type { A2UIMessage, PontosfortesData } from '../types.js';

/**
 * pontosFortes
 * ------------
 * Lista os pontos fortes do candidato em relação à vaga analisada.
 *
 * Layout:
 *   Card → Column → [
 *     Text "Pontos fortes" (h3)
 *     List → forte-row (template por item) → Column → [
 *       Text { path: "titulo" }    (h4)
 *       Text { path: "descricao" } (body)
 *     ]
 *   ]
 *
 * Cada item exibe um ponto forte com título em destaque e descrição explicativa.
 * O LLM fornece apenas { itens: [{ titulo, descricao }] }.
 */
export function buildPontosFortes(surfaceId: string, data: PontosfortesData): A2UIMessage[] {
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
                        text: 'Pontos fortes',
                        variant: 'h3',
                    },
                    {
                        id: 'lista',
                        component: 'List',
                        children: { componentId: 'forte-row', path: '/itens' },
                    },
                    {
                        id: 'forte-row',
                        component: 'Column',
                        children: ['forte-titulo', 'forte-desc'],
                    },
                    {
                        id: 'forte-titulo',
                        component: 'Text',
                        text: { path: 'titulo' },
                        variant: 'h4',
                    },
                    {
                        id: 'forte-desc',
                        component: 'Text',
                        text: { path: 'descricao' },
                        variant: 'body',
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
