# Backend — POC UI Agêntica

Este é o servidor da prova de conceito. Ele recebe os PDFs do currículo e da vaga, extrai o texto, passa para o modelo de linguagem Claude e emite os blocos de interface em tempo real para o frontend via protocolo AG-UI.


## Tecnologias

### Mastra

Mastra é um framework Node.js para construir agentes de IA. Um agente, neste contexto, é um programa que recebe uma instrução em linguagem natural, decide quais ferramentas usar e em qual sequência, executa essas ferramentas e produz uma resposta.

O Mastra cuida de toda a complexidade de orquestrar chamadas ao modelo de linguagem, executar tools, gerenciar memória de conversa e expor o agente via HTTP. O desenvolvedor define o agente (instrução do sistema, modelo e tools disponíveis) e o Mastra faz o resto.

O comando `mastra dev` sobe um servidor de desenvolvimento com hot reload. O comando `mastra build` e `mastra start` são usados em produção.

### TypeScript com módulos ESM

O projeto usa TypeScript compilado como ES Modules nativos — indicado pelo campo `"type": "module"` no `package.json`. Os arquivos `.ts` são compilados para `.mjs` e usam `import/export` em vez de `require/module.exports`. O Mastra exige ESM.

### Anthropic API via @ai-sdk/anthropic

O modelo de linguagem usado é o `claude-sonnet-4-5`, da Anthropic. A integração usa `@ai-sdk/anthropic`, que faz parte do Vercel AI SDK — uma camada de abstração sobre APIs de diferentes provedores de IA. Isso facilita trocar o modelo futuramente sem mudar a lógica do agente.

A chave de API deve ser definida na variável de ambiente `ANTHROPIC_API_KEY`.

### AG-UI via @ag-ui/mastra

AG-UI (Agent-to-UI) é um protocolo aberto que padroniza como agentes se comunicam com interfaces de usuário. Ele define um conjunto de tipos de eventos transmitidos via SSE.

SSE (Server-Sent Events) é um mecanismo HTTP onde o servidor mantém a conexão aberta e envia eventos incrementalmente ao cliente. É o mesmo modelo de streaming que você vê em interfaces de chat de IA, onde o texto aparece palavra por palavra.

A biblioteca `@ag-ui/mastra` adapta um agente Mastra para emitir eventos no formato AG-UI. A rota `/awp` do servidor recebe o POST do frontend e responde com o stream SSE contendo os eventos à medida que o modelo processa.

Os tipos de eventos produzidos neste projeto são:

- `TEXT_MESSAGE_CHUNK` — um fragmento de texto da resposta do modelo (streaming)
- `TOOL_CALL_START` e `TOOL_CALL_END` — anunciam o início e fim de uma chamada de tool
- `TOOL_CALL_RESULT` — contém o resultado da execução da tool (aqui, as mensagens A2UI)

### A2UI v0.9

A2UI é uma especificação de formato JSON para descrever interfaces de usuário de forma declarativa. Em vez de HTML, você descreve componentes (Card, Column, Text, Icon, etc.) em objetos JSON, e o renderer no frontend os transforma em componentes visuais reais.

Uma "surface" A2UI é um painel isolado com seu próprio modelo de componentes e modelo de dados. O fluxo para criar uma surface é sempre de três mensagens:

```
createSurface       — registra a surface com ID único e define o catálogo de componentes
updateComponents    — define a árvore de componentes (quem é filho de quem, quais props)
updateDataModel     — fornece os dados dinâmicos que os componentes referenciam por caminho
```

Os componentes referenciam dados do modelo via JSON Pointer: `{ "path": "/score" }` significa "leia o campo score da raiz do modelo de dados". Isso separa estrutura de dados — o layout não muda quando os dados mudam, apenas os valores exibidos.

O catálogo básico (`https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json`) define os componentes disponíveis neste projeto: Text, Card, Column, Row, List, Icon, Button, Divider e outros.

### pdf-parse

Biblioteca Node.js que extrai texto de arquivos PDF. O backend usa isso para converter os PDFs (que chegam do frontend como strings base64) em texto puro antes de enviá-los ao modelo.

### Zod

Biblioteca de validação e definição de schemas em TypeScript. É usada para declarar e validar os inputs e outputs das tools do agente, garantindo em runtime que os dados têm a estrutura esperada antes de chegar aos builders.

### Hono

Framework HTTP leve que o Mastra usa internamente. O código do projeto usa `registerApiRoute` (que usa Hono) para definir a rota `/awp` e `streamSSE` para emitir o stream de eventos.


## Arquitetura

```
Frontend
  |
  | POST /awp com RunAgentInput (AG-UI)
  v
src/mastra/index.ts
  |  detecta [CURRICULO base64]: e [VAGA base64]: nas mensagens
  |  extrai o texto de cada PDF com pdf-parse
  |  substitui o bloco base64 pelo texto puro
  v
pdfAnalystAgent
  |  lê currículo e vaga como texto
  |  decide chamar renderSurface(template, dados)
  v
src/tools/render-surface.tool.ts
  |  valida os dados com Zod
  |  roteia para o builder do template escolhido
  v
src/a2ui/templates/*.ts
  |  monta as mensagens A2UI [createSurface, updateComponents, updateDataModel]
  v
TOOL_CALL_RESULT (AG-UI)
  |  emitido via stream SSE de volta ao frontend
  v
Frontend — renderer A2UI
```

### O agente

O agente `pdfAnalystAgent` é definido em `src/mastra/agents/pdf-analyst.agent.ts`. Ele recebe:

- Uma instrução (system prompt) que define seu papel de analista de RH, o fluxo de análise esperado, a ordem em que deve chamar os templates e as regras que não pode violar
- O modelo `claude-sonnet-4-5`
- Duas tools: `analyzePdfTool` e `renderSurfaceTool`

O agente não usa memória persistente — cada requisição é tratada de forma independente.

### As tools

**analyzePdfTool** (`src/tools/analyze-pdf.tool.ts`) — recebe um PDF em base64 e retorna o texto extraído. É um fallback: no fluxo normal, o backend já extrai o texto antes que o modelo veja a conversa. Esta tool existe para o caso de o agente receber um PDF bruto não pré-processado.

**renderSurfaceTool** (`src/tools/render-surface.tool.ts`) — recebe o nome de um template e os dados correspondentes, e retorna as mensagens A2UI que descrevem o card. O retorno tem a forma `{ messages: [...] }` e é emitido como `TOOL_CALL_RESULT` no stream AG-UI.

### Os templates A2UI

Os quatro templates em `src/a2ui/templates/` são funções TypeScript que recebem dados validados e devolvem arrays de mensagens A2UI:

| Template | Dados esperados | O que exibe |
|---|---|---|
| match-score | `{ score, resumo }` | Nota percentual em destaque e uma linha de resumo |
| requisitos | `{ itens: [{ requisito, situacao, nota? }] }` | Lista de requisitos com ícone de check ou X |
| pontos-fortes | `{ itens: [{ titulo, descricao }] }` | Lista de pontos favoráveis do candidato |
| sugestoes | `{ itens: [{ sugestao }] }` | Lista de sugestões práticas de melhoria |

### Pré-processamento de PDFs

O modelo tem um limite de tokens de saída. Se o frontend enviasse os PDFs como base64 diretamente na mensagem, o modelo poderia repetir esses dados ao construir os argumentos das tools, esgotando o limite antes de concluir a análise.

Para evitar isso, `src/mastra/index.ts` intercepta as mensagens antes de passá-las ao modelo. Ele detecta os marcadores `[CURRICULO base64]:` e `[VAGA base64]:` no conteúdo, extrai cada bloco base64, converte para texto com `pdf-parse` e substitui pelo texto extraído. O modelo recebe apenas o texto puro dos documentos.

### Por que o modelo nunca gera o layout

Uma alternativa de design seria pedir ao modelo que gerasse as mensagens A2UI diretamente — ou seja, que produzisse o JSON de componentes como parte da resposta. Essa abordagem foi descartada:

- O modelo pode alucinar estruturas inválidas: componentes inexistentes no catálogo, props com nomes errados, hierarquias incoerentes. Cada chamada seria um risco de produzir um card quebrado.
- O modelo gerando JSON de interface livre poderia ser manipulado via prompt injection para emitir componentes maliciosos.

A abordagem adotada inverte o controle: o modelo decide *o que mostrar* (qual template e quais dados extraídos dos documentos), mas o *como mostrar* é sempre determinado pelo código TypeScript dos builders. O modelo só pode escolher entre quatro templates bem definidos, e os dados são validados pelo Zod antes de chegar ao builder.


## Estrutura de pastas

```
backend/
  src/
    a2ui/
      templates/
        match-score.template.ts
        requisitos.template.ts
        pontos-fortes.template.ts
        sugestoes.template.ts
      types.ts                     — tipos TypeScript de componentes e mensagens A2UI
    mastra/
      agents/
        pdf-analyst.agent.ts       — definição do agente
      index.ts                     — configuração do Mastra e rota /awp
    tools/
      analyze-pdf.tool.ts          — extração de texto de PDF
      render-surface.tool.ts       — geração de mensagens A2UI
  package.json
  tsconfig.json
```


## Configuração

Crie um arquivo `.env` na raiz da pasta `backend`:

```
ANTHROPIC_API_KEY=sk-ant-SUA_CHAVE_AQUI
```

Substitua pelo valor real da sua chave de API da Anthropic. Sem essa variável, o servidor sobe mas as requisições ao modelo falham com erro de autenticação.


## Como rodar

Instalação de dependências:

```
pnpm install
```

Modo de desenvolvimento (com hot reload):

```
PORT=4113 pnpm dev
```

O terminal vai mostrar:

```
mastra  ready
Studio: http://localhost:4113
API:    http://localhost:4113/api
```

Modo de produção (compila e sobe o servidor otimizado):

```
pnpm build
PORT=4113 pnpm start
```

O servidor aceita requisições de `http://localhost:4200` (origem do frontend em desenvolvimento). Se precisar servir o frontend em outra porta, ajuste `cors.origin` em `src/mastra/index.ts`.


## Testando a rota sem o frontend

Para verificar se o servidor está funcionando sem precisar do frontend, envie uma requisição curl com o texto já extraído (sem PDFs):

```
curl -X POST http://localhost:4113/awp \
  -H "Content-Type: application/json" \
  -d '{
    "runId": "teste-1",
    "threadId": "thread-1",
    "messages": [
      {
        "id": "msg-1",
        "role": "user",
        "content": "Analise:\n\n[Texto do currículo extraído — 1 página(s)]:\nJoão Silva, 5 anos em Angular e TypeScript.\n\n[Texto da vaga extraído — 1 página(s)]:\nVaga: Desenvolvedor Frontend Sênior. Requisitos: Angular 15+, TypeScript."
      }
    ],
    "tools": [],
    "context": [],
    "forwardedProps": {},
    "state": null
  }' \
  --no-buffer
```

A resposta será um stream SSE com linhas no formato `data: {...}`. Cada linha é um evento AG-UI em JSON.
