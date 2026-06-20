import { Mastra } from '@mastra/core/mastra';
import { registerApiRoute } from '@mastra/core/server';
import { MastraAgent } from '@ag-ui/mastra';
import { streamSSE } from 'hono/streaming';
import { Buffer } from 'node:buffer';
import pdfParse from 'pdf-parse';
import { Agent } from '@mastra/core/agent';
import { anthropic } from '@ai-sdk/anthropic';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

"use strict";
const analyzePdfTool = createTool({
  id: "analyzePdf",
  description: "Extrai o texto de um PDF (recebido em base64) para que o agente possa analis\xE1-lo.",
  inputSchema: z.object({
    pdfBase64: z.string().describe("Conte\xFAdo do PDF codificado em base64.")
  }),
  outputSchema: z.object({
    text: z.string(),
    pages: z.number()
  }),
  execute: async (context) => {
    const buffer = Buffer.from(context.pdfBase64, "base64");
    const result = await pdfParse(buffer);
    return { text: result.text, pages: result.numpages };
  }
});

"use strict";
const CATALOG_ID = "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json";

"use strict";
function buildMatchScore(surfaceId, data) {
  return [
    {
      version: "v0.9",
      createSurface: {
        surfaceId,
        catalogId: CATALOG_ID,
        sendDataModel: true
      }
    },
    {
      version: "v0.9",
      updateComponents: {
        surfaceId,
        components: [
          { id: "root", component: "Card", child: "col" },
          {
            id: "col",
            component: "Column",
            children: ["label", "score", "div", "resumo"]
          },
          {
            id: "label",
            component: "Text",
            text: "Ader\xEAncia \xE0 vaga",
            variant: "caption"
          },
          {
            id: "score",
            component: "Text",
            text: { path: "/score" },
            variant: "h1"
          },
          { id: "div", component: "Divider" },
          {
            id: "resumo",
            component: "Text",
            text: { path: "/resumo" },
            variant: "body"
          }
        ]
      }
    },
    {
      version: "v0.9",
      updateDataModel: {
        surfaceId,
        value: data
      }
    }
  ];
}

"use strict";
function buildRequisitos(surfaceId, data) {
  const itens = data.itens.map((item) => ({
    requisito: item.requisito,
    icone: item.situacao === "coberto" ? "check" : "close",
    nota: item.nota ?? ""
  }));
  return [
    {
      version: "v0.9",
      createSurface: {
        surfaceId,
        catalogId: CATALOG_ID,
        sendDataModel: true
      }
    },
    {
      version: "v0.9",
      updateComponents: {
        surfaceId,
        components: [
          { id: "root", component: "Card", child: "col" },
          {
            id: "col",
            component: "Column",
            children: ["titulo", "lista"]
          },
          {
            id: "titulo",
            component: "Text",
            text: "Requisitos da vaga",
            variant: "h3"
          },
          {
            id: "lista",
            component: "List",
            // Template data-bound: item-row é instanciado para cada elemento de /itens
            children: { componentId: "item-row", path: "/itens" }
          },
          // Componente-template de linha — compartilhado por todas as instâncias
          {
            id: "item-row",
            component: "Row",
            children: ["req-nome", "req-icone", "req-nota"],
            align: "center"
          },
          {
            id: "req-nome",
            component: "Text",
            text: { path: "requisito" },
            variant: "body",
            weight: 1
          },
          {
            id: "req-icone",
            component: "Icon",
            // Caminho relativo resolve para o campo "icone" de cada item
            name: { path: "icone" }
          },
          {
            id: "req-nota",
            component: "Text",
            text: { path: "nota" },
            variant: "caption",
            weight: 1
          }
        ]
      }
    },
    {
      version: "v0.9",
      updateDataModel: {
        surfaceId,
        value: { itens }
      }
    }
  ];
}

"use strict";
function buildPontosFortes(surfaceId, data) {
  return [
    {
      version: "v0.9",
      createSurface: {
        surfaceId,
        catalogId: CATALOG_ID,
        sendDataModel: true
      }
    },
    {
      version: "v0.9",
      updateComponents: {
        surfaceId,
        components: [
          { id: "root", component: "Card", child: "col" },
          {
            id: "col",
            component: "Column",
            children: ["titulo", "lista"]
          },
          {
            id: "titulo",
            component: "Text",
            text: "Pontos fortes",
            variant: "h3"
          },
          {
            id: "lista",
            component: "List",
            children: { componentId: "forte-row", path: "/itens" }
          },
          {
            id: "forte-row",
            component: "Column",
            children: ["forte-titulo", "forte-desc"]
          },
          {
            id: "forte-titulo",
            component: "Text",
            text: { path: "titulo" },
            variant: "h4"
          },
          {
            id: "forte-desc",
            component: "Text",
            text: { path: "descricao" },
            variant: "body"
          }
        ]
      }
    },
    {
      version: "v0.9",
      updateDataModel: {
        surfaceId,
        value: { itens: data.itens }
      }
    }
  ];
}

"use strict";
function buildSugestoes(surfaceId, data) {
  return [
    {
      version: "v0.9",
      createSurface: {
        surfaceId,
        catalogId: CATALOG_ID,
        sendDataModel: true
      }
    },
    {
      version: "v0.9",
      updateComponents: {
        surfaceId,
        components: [
          { id: "root", component: "Card", child: "col" },
          {
            id: "col",
            component: "Column",
            children: ["titulo", "lista"]
          },
          {
            id: "titulo",
            component: "Text",
            text: "Sugest\xF5es de melhoria",
            variant: "h3"
          },
          {
            id: "lista",
            component: "List",
            children: { componentId: "sugestao-row", path: "/itens" }
          },
          {
            id: "sugestao-row",
            component: "Row",
            children: ["sug-icone", "sug-texto"],
            align: "center"
          },
          {
            id: "sug-icone",
            component: "Icon",
            name: "info"
          },
          {
            id: "sug-texto",
            component: "Text",
            text: { path: "sugestao" },
            variant: "body",
            weight: 1
          }
        ]
      }
    },
    {
      version: "v0.9",
      updateDataModel: {
        surfaceId,
        value: { itens: data.itens }
      }
    }
  ];
}

"use strict";
const matchScoreDataSchema = z.object({
  score: z.string().describe('Nota de ader\xEAncia, ex.: "82%".'),
  resumo: z.string().describe("Uma frase resumindo a avalia\xE7\xE3o geral.")
});
const requisitosDataSchema = z.object({
  itens: z.array(
    z.object({
      requisito: z.string().describe("Nome do requisito da vaga."),
      situacao: z.enum(["coberto", "lacuna"]).describe('"coberto" se o candidato atende, "lacuna" se n\xE3o atende.'),
      nota: z.string().optional().describe("Observa\xE7\xE3o opcional sobre o requisito.")
    })
  )
});
const pontosfortesDataSchema = z.object({
  itens: z.array(
    z.object({
      titulo: z.string().describe("Nome curto do ponto forte."),
      descricao: z.string().describe("Explica\xE7\xE3o de por que \xE9 um ponto forte para esta vaga.")
    })
  )
});
const sugestoesDataSchema = z.object({
  itens: z.array(
    z.object({
      sugestao: z.string().describe("Sugest\xE3o pr\xE1tica para melhorar o curr\xEDculo em rela\xE7\xE3o \xE0 vaga.")
    })
  )
});
const inputSchema = z.object({
  template: z.enum(["matchScore", "requisitos", "pontosFortes", "sugestoes"]).describe("Qual template de UI renderizar."),
  surfaceId: z.string().optional().describe("ID \xFAnico da surface. Gerado automaticamente se omitido."),
  data: z.record(z.unknown()).describe(
    "Dados do template. matchScore: {score,resumo}. requisitos: {itens:[{requisito,situacao,nota?}]}. pontosFortes: {itens:[{titulo,descricao}]}. sugestoes: {itens:[{sugestao}]}."
  )
});
const outputSchema = z.object({
  messages: z.array(z.record(z.string(), z.unknown()))
});
const renderSurfaceTool = createTool({
  id: "renderSurface",
  description: [
    "Renderiza um bloco de UI estruturada (A2UI v0.9) para o usu\xE1rio.",
    "Chame uma vez por bloco tem\xE1tico, na ordem: matchScore \u2192 requisitos \u2192 pontosFortes \u2192 sugestoes.",
    'Preencha "data" apenas com informa\xE7\xE3o extra\xEDda dos documentos \u2014 nunca invente.'
  ].join(" "),
  inputSchema,
  outputSchema,
  execute: async (context) => {
    const surfaceId = context.surfaceId ?? `${context.template}-${randomUUID().slice(0, 8)}`;
    let messages = [];
    switch (context.template) {
      case "matchScore":
        messages = buildMatchScore(surfaceId, matchScoreDataSchema.parse(context.data));
        break;
      case "requisitos":
        messages = buildRequisitos(surfaceId, requisitosDataSchema.parse(context.data));
        break;
      case "pontosFortes":
        messages = buildPontosFortes(surfaceId, pontosfortesDataSchema.parse(context.data));
        break;
      case "sugestoes":
        messages = buildSugestoes(surfaceId, sugestoesDataSchema.parse(context.data));
        break;
    }
    return { messages };
  }
});

"use strict";
const pdfAnalystAgent = new Agent({
  id: "pdf-analyst",
  name: "Analista de Curr\xEDculo \xD7 Vaga",
  instructions: `
Voc\xEA \xE9 um analista especializado em recrutamento. Recebe o texto extra\xEDdo do curr\xEDculo
do candidato e a descri\xE7\xE3o de uma vaga e avalia se o candidato \xE9 adequado para ela.

FLUXO PRINCIPAL:
O backend j\xE1 extraiu o texto dos PDFs antes de voc\xEA receber a conversa \u2014 os marcadores
"[Texto do curr\xEDculo extra\xEDdo]" e "[Texto da vaga extra\xEDdo]" indicam esses blocos.
Use esses textos diretamente; s\xF3 chame analyzePdf se receber um PDF em base64 bruto.

AN\xC1LISE:
1. Leia os dois textos com aten\xE7\xE3o.
2. Identifique os requisitos expl\xEDcitos e impl\xEDcitos da vaga.
3. Cruze com as experi\xEAncias, habilidades e forma\xE7\xE3o do curr\xEDculo.
4. Calcule uma nota percentual de ader\xEAncia e elabore um resumo conciso.

RESPOSTA:
Responda em portugu\xEAs, de forma profissional e direta. Para cada bloco tem\xE1tico,
chame renderSurface na seguinte ordem:

  a. matchScore \u2014 nota percentual (ex.: "78%") + resumo de uma linha
  b. requisitos \u2014 lista completa de requisitos com situa\xE7\xE3o coberto|lacuna e nota opcional
  c. pontosFortes \u2014 3 a 5 pontos favor\xE1veis do candidato para esta vaga
  d. sugestoes \u2014 3 a 5 sugest\xF5es pr\xE1ticas de melhoria do curr\xEDculo para a vaga

Antes de cada chamada a renderSurface, escreva uma frase curta de texto
introduzindo o que o bloco vai mostrar. Ap\xF3s o \xFAltimo bloco, escreva uma
conclus\xE3o de 2-3 frases.

REGRAS ABSOLUTAS:
- Preencha "data" apenas com informa\xE7\xE3o fundamentada nos dois documentos.
- Nunca invente requisito, habilidade ou experi\xEAncia que n\xE3o esteja nos textos.
- N\xE3o repita a mesma informa\xE7\xE3o em blocos diferentes.
- Use surfaceId descritivo, ex.: "match-score-1", "requisitos-1".
`,
  model: anthropic("claude-sonnet-4-5"),
  tools: { analyzePdfTool, renderSurfaceTool }
});

"use strict";
const CURRICULO_MARKER = "[CURRICULO base64]:";
const VAGA_MARKER = "[VAGA base64]:";
async function substituirPdfBase64(content, marker, label, stopAt) {
  const markerIdx = content.indexOf(marker);
  if (markerIdx === -1) return content;
  const afterMarker = content.slice(markerIdx + marker.length);
  const stopIdx = stopAt ? afterMarker.indexOf(stopAt) : -1;
  const b64 = (stopIdx === -1 ? afterMarker : afterMarker.slice(0, stopIdx)).trim();
  const suffix = stopIdx === -1 ? "" : afterMarker.slice(stopIdx);
  const buffer = Buffer.from(b64, "base64");
  const result = await pdfParse(buffer);
  const prefix = content.slice(0, markerIdx).trim();
  return `${prefix}

[${label} \u2014 ${result.numpages} p\xE1gina(s)]:
${result.text}${suffix}`;
}
const mastra = new Mastra({
  agents: {
    "pdf-analyst": pdfAnalystAgent
  },
  server: {
    // CORS: Angular roda em :4200; Mastra em :4113 (mastra dev).
    cors: {
      origin: ["http://localhost:4200"],
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
      credentials: false
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
      registerApiRoute("/awp", {
        method: "POST",
        handler: async (c) => {
          const mastraCtx = c.get("mastra");
          const agent = mastraCtx.getAgent("pdf-analyst");
          const aguiAgent = new MastraAgent({
            agent,
            resourceId: "pdf-analyst"
          });
          const body = await c.req.json();
          body.tools = body.tools ?? [];
          for (const msg of body.messages ?? []) {
            if (typeof msg.content !== "string") continue;
            msg.content = await substituirPdfBase64(
              msg.content,
              CURRICULO_MARKER,
              "Texto do curr\xEDculo extra\xEDdo",
              VAGA_MARKER
              // para no próximo marcador, preservando a vaga
            );
            msg.content = await substituirPdfBase64(msg.content, VAGA_MARKER, "Texto da vaga extra\xEDdo");
          }
          return streamSSE(c, (stream) => new Promise((resolve, reject) => {
            aguiAgent.run(body).subscribe({
              next: (event) => stream.writeSSE({
                data: JSON.stringify(event)
              }),
              error: reject,
              complete: resolve
            });
          }));
        }
      })
    ]
  }
});

export { mastra };
