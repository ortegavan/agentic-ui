# Backend — POC UI Agêntica (Currículo × Vaga)

## Arquitetura

```
Frontend (Angular 21)
   │  POST /awp  (AG-UI RunAgentInput)
   ▼
src/mastra/index.ts         ← pré-processa PDFs base64 → texto
   │
   ▼
pdfAnalystAgent             ← lê currículo + vaga, raciocina
   │  tool call: renderSurface(template, data)
   ▼
src/tools/render-surface.tool.ts   ← roteia para o builder correto
   │
   ▼
src/a2ui/templates/*.ts     ← monta mensagens A2UI v0.9 válidas
   │  [createSurface, updateComponents, updateDataModel]
   ▼
TOOL_CALL_RESULT (AG-UI)    ← viaja de volta pelo stream SSE
   │
   ▼
Frontend                    ← entrega ao renderer A2UI
```

### Por que o backend monta o layout?

O LLM **nunca compõe JSON A2UI**. Ele só escolhe `template` e fornece `data`.
Os builders em `src/a2ui/templates/` geram as mensagens A2UI v0.9 válidas.
Isso elimina alucinações de estrutura (componentes ou props inventados).

### Transporte: AG-UI

- `POST /awp` recebe um `RunAgentInput` e responde com stream SSE.
- Cada evento é um `BaseEvent` do `@ag-ui/core`.
- O resultado de `renderSurface` viaja como `TOOL_CALL_RESULT`.

### Formato: A2UI v0.9

Três tipos de mensagem por surface:

| Mensagem | Conteúdo |
|---|---|
| `createSurface` | abre a surface (id, catalogId, sendDataModel) |
| `updateComponents` | lista plana de componentes com IDs e hierarquia por referência |
| `updateDataModel` | dados separados, vinculados via `{ path: "/campo" }` |

Catálogo: `https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json`

## Templates disponíveis

| Template | Dados esperados | Componentes |
|---|---|---|
| `matchScore` | `{ score, resumo }` | Card → Column → [caption, **h1**, Divider, body] |
| `requisitos` | `{ itens: [{ requisito, situacao, nota? }] }` | Card → List data-bound de Rows |
| `pontosFortes` | `{ itens: [{ titulo, descricao }] }` | Card → List data-bound de Columns |
| `sugestoes` | `{ itens: [{ sugestao }] }` | Card → List data-bound de Rows com ícone |

## Como rodar

### Pré-requisitos

- Node.js 20+
- pnpm

### Instalação

```bash
cd backend
cp .env.example .env
# edite .env e preencha ANTHROPIC_API_KEY
pnpm install
pnpm dev
```

O servidor sobe em `http://localhost:4111`.

## Como testar a rota `/awp` sem o frontend

### Teste mínimo (texto simples, sem PDF)

```bash
curl -X POST http://localhost:4111/awp \
  -H "Content-Type: application/json" \
  -d '{
    "runId": "test-run-1",
    "messages": [
      {
        "role": "user",
        "content": "Analise este candidato para esta vaga:\n\n[Texto do currículo extraído — 2 página(s)]:\nJoão Silva, 5 anos de experiência em desenvolvimento Angular e TypeScript. Formação em Ciência da Computação. Experiência com RxJS, NgRx, testes unitários com Jest.\n\n[Texto da vaga extraído — 1 página(s)]:\nVaga: Desenvolvedor Frontend Sênior. Requisitos: Angular 15+, TypeScript, RxJS, testes unitários, inglês intermediário. Diferencial: NgRx, experiência com design systems."
      }
    ]
  }' \
  --no-buffer
```

### Teste com PDF real (base64)

O frontend deve embutir os PDFs no `content` da mensagem usando os marcadores:

```
[CURRICULO base64]: <conteúdo base64 do PDF do currículo>
[VAGA base64]: <conteúdo base64 do PDF da vaga>
```

O backend extrai o texto automaticamente antes de enviar ao modelo.

### Verificar eventos AG-UI

A resposta é um stream SSE. Cada linha `data: {...}` é um evento AG-UI.
Eventos relevantes:
- `TEXT_MESSAGE_CONTENT` — texto do agente
- `TOOL_CALL_START` / `TOOL_CALL_END` — chamada a `renderSurface`
- `TOOL_CALL_RESULT` — contém `{ messages: [...] }` com as mensagens A2UI

## Dependências principais

| Pacote | Papel |
|---|---|
| `@mastra/core` | Framework de agentes (Agent, createTool) |
| `mastra` | CLI (`mastra dev`, `mastra build`) |
| `@ag-ui/mastra` | Adaptador AG-UI para Mastra (MastraAgent) |
| `@ag-ui/core` | Tipos de eventos AG-UI |
| `@ai-sdk/anthropic` | Provider Anthropic para Vercel AI SDK |
| `hono` | Servidor HTTP (embutido no Mastra) |
| `pdf-parse` | Extração de texto de PDFs |
| `zod` | Validação de schemas das tools |
