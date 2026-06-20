import { CATALOG_ID } from '../types.js';
import type { A2UIMessage, RequisitosData } from '../types.js';

/**
 * requisitos
 * ----------
 * Grade de requisitos da vaga: cobertos vs lacunas.
 *
 * Usa o padrão de template data-bound (exemplo 34_child-list-template.json):
 *   List.children = { componentId: "item-row", path: "/itens" }
 * O renderer instancia item-row para cada elemento do array /itens.
 * Caminhos RELATIVOS (sem barra inicial) referenciam campos de cada item.
 *
 * Layout:
 *   Card → Column → [
 *     Text "Requisitos da vaga" (h3)
 *     List → item-row (template por item) → Row → [
 *       Text { path: "requisito" } (body, weight:1)
 *       Icon { path: "icone" }     — "check" ou "close" (mapeado pelo builder)
 *       Text { path: "nota" }      (caption, weight:1)
 *     ]
 *   ]
 *
 * O builder converte situacao:'coberto'|'lacuna' em nome de ícone válido
 * do catálogo antes de popular o data model. O LLM nunca escolhe ícones.
 */
export function buildRequisitos(surfaceId: string, data: RequisitosData): A2UIMessage[] {
    // Transforma enum do LLM em nome de ícone válido no catálogo
    const itens = data.itens.map((item) => ({
        requisito: item.requisito,
        icone: item.situacao === 'coberto' ? 'check' : 'close',
        nota: item.nota ?? '',
    }));

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
                        text: 'Requisitos da vaga',
                        variant: 'h3',
                    },
                    {
                        id: 'lista',
                        component: 'List',
                        // Template data-bound: item-row é instanciado para cada elemento de /itens
                        children: { componentId: 'item-row', path: '/itens' },
                    },
                    // Componente-template de linha — compartilhado por todas as instâncias
                    {
                        id: 'item-row',
                        component: 'Row',
                        children: ['req-nome', 'req-icone', 'req-nota'],
                        align: 'center',
                    },
                    {
                        id: 'req-nome',
                        component: 'Text',
                        text: { path: 'requisito' },
                        variant: 'body',
                        weight: 1,
                    },
                    {
                        id: 'req-icone',
                        component: 'Icon',
                        // Caminho relativo resolve para o campo "icone" de cada item
                        name: { path: 'icone' },
                    },
                    {
                        id: 'req-nota',
                        component: 'Text',
                        text: { path: 'nota' },
                        variant: 'caption',
                        weight: 1,
                    },
                ],
            },
        },
        {
            version: 'v0.9',
            updateDataModel: {
                surfaceId,
                value: { itens },
            },
        },
    ];
}
