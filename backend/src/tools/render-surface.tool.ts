import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { buildMatchScore } from '../a2ui/templates/match-score.template.js';
import { buildRequisitos } from '../a2ui/templates/requisitos.template.js';
import { buildPontosFortes } from '../a2ui/templates/pontos-fortes.template.js';
import { buildSugestoes } from '../a2ui/templates/sugestoes.template.js';
import type { A2UIMessage } from '../a2ui/types.js';

/*
 * Roteador de templates A2UI v0.9.
 *
 * Arquitetura: o agente decide O QUE mostrar (template + dados);
 * o layout válido é garantido pelos builders em src/a2ui/templates/.
 * O LLM nunca compõe layout — nunca haverá alucinação de estrutura A2UI.
 *
 * O resultado { messages } é devolvido como TOOL_CALL_RESULT no stream AG-UI.
 * O frontend filtra esse evento e entrega as mensagens ao renderer A2UI.
 */

// ---- Schemas Zod por template ----

const matchScoreDataSchema = z.object({
    score: z.string().describe('Nota de aderência, ex.: "82%".'),
    resumo: z.string().describe('Uma frase resumindo a avaliação geral.'),
});

const requisitosDataSchema = z.object({
    itens: z.array(
        z.object({
            requisito: z.string().describe('Nome do requisito da vaga.'),
            situacao: z
                .enum(['coberto', 'lacuna'])
                .describe('"coberto" se o candidato atende, "lacuna" se não atende.'),
            nota: z
                .string()
                .optional()
                .describe('Observação opcional sobre o requisito.'),
        }),
    ),
});

const pontosfortesDataSchema = z.object({
    itens: z.array(
        z.object({
            titulo: z.string().describe('Nome curto do ponto forte.'),
            descricao: z.string().describe('Explicação de por que é um ponto forte para esta vaga.'),
        }),
    ),
});

const sugestoesDataSchema = z.object({
    itens: z.array(
        z.object({
            sugestao: z
                .string()
                .describe('Sugestão prática para melhorar o currículo em relação à vaga.'),
        }),
    ),
});

// Schema plano (type:object no topo) — necessário para a Anthropic API aceitar o tool.
// z.discriminatedUnion como top-level gera oneOf sem "type":"object", que a API rejeita.
// A validação de data por template é feita no execute().
const inputSchema = z.object({
    template: z
        .enum(['matchScore', 'requisitos', 'pontosFortes', 'sugestoes'])
        .describe('Qual template de UI renderizar.'),
    surfaceId: z
        .string()
        .optional()
        .describe('ID único da surface. Gerado automaticamente se omitido.'),
    data: z
        .record(z.unknown())
        .describe(
            'Dados do template. matchScore: {score,resumo}. ' +
            'requisitos: {itens:[{requisito,situacao,nota?}]}. ' +
            'pontosFortes: {itens:[{titulo,descricao}]}. ' +
            'sugestoes: {itens:[{sugestao}]}.',
        ),
});

const outputSchema = z.object({
    messages: z.array(z.record(z.string(), z.unknown())),
});

export const renderSurfaceTool = createTool({
    id: 'renderSurface',
    description: [
        'Renderiza um bloco de UI estruturada (A2UI v0.9) para o usuário.',
        'Chame uma vez por bloco temático, na ordem: matchScore → requisitos → pontosFortes → sugestoes.',
        'Preencha "data" apenas com informação extraída dos documentos — nunca invente.',
    ].join(' '),
    inputSchema,
    outputSchema,
    execute: async (context): Promise<{ messages: A2UIMessage[] }> => {
        const surfaceId =
            context.surfaceId ?? `${context.template}-${randomUUID().slice(0, 8)}`;

        let messages: A2UIMessage[] = [];

        // Valida e estreita data em runtime por template (schema plano no inputSchema
        // não garante tipos de data em compile-time — fazemos aqui com parse do Zod).
        switch (context.template) {
            case 'matchScore':
                messages = buildMatchScore(surfaceId, matchScoreDataSchema.parse(context.data));
                break;
            case 'requisitos':
                messages = buildRequisitos(surfaceId, requisitosDataSchema.parse(context.data));
                break;
            case 'pontosFortes':
                messages = buildPontosFortes(surfaceId, pontosfortesDataSchema.parse(context.data));
                break;
            case 'sugestoes':
                messages = buildSugestoes(surfaceId, sugestoesDataSchema.parse(context.data));
                break;
        }

        return { messages };
    },
});
