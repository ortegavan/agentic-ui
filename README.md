# UI Agêntica

Este repositório é uma prova de conceito de UI agêntica: uma interface que não é desenhada com antecedência pelo desenvolvedor, mas gerada em tempo real por um agente de inteligência artificial com base no contexto da conversa.

O cenário escolhido é análise de currículo versus vaga de emprego. O usuário faz upload dos dois documentos em PDF, digita uma pergunta e o agente responde com cards estruturados contendo nota de aderência, lista de requisitos, pontos fortes e sugestões de melhoria.

## O que é UI agêntica

Em aplicações tradicionais, o desenvolvedor decide com antecedência quais componentes a tela vai ter, onde cada um fica e quais dados ele exibe. O layout é estático e controlado inteiramente pelo código.

Em uma UI agêntica, essa decisão passa a ser do agente. Ele recebe uma tarefa, processa informações e decide quais blocos visuais fazem sentido exibir, em qual ordem e com quais dados. A interface muda a cada execução, moldada pela saída do modelo.

Isso não significa que o modelo gera HTML ou CSS livremente — o que produziria resultados imprevisíveis e difíceis de controlar. Em vez disso, ele chama funções bem definidas (chamadas tools) que constroem os componentes visuais com segurança usando uma especificação formal chamada A2UI.

## Tecnologias e papéis

O projeto é dividido em dois subprojetos que se comunicam via protocolo AG-UI.

**Backend** — construído com Mastra, um framework Node.js para agentes de IA. Ele recebe os PDFs, extrai o texto, repassa para o modelo Claude (Anthropic) e emite eventos em tempo real para o frontend.

**Frontend** — construído com Angular 21. Ele envia a requisição, escuta o stream de eventos e usa o renderer A2UI para montar os cards na tela conforme chegam.

**AG-UI** — protocolo padronizado de comunicação entre agentes e interfaces. Define um conjunto de tipos de eventos (início de stream, chunk de texto, resultado de tool, etc.) transmitidos via SSE (Server-Sent Events), que é um mecanismo HTTP de fluxo unidirecional do servidor para o cliente.

**A2UI** — especificação de formato para descrever componentes de interface em JSON. Em vez de HTML, o agente emite mensagens do tipo "crie uma surface com um Card contendo uma Column com estes Texts". O renderer no frontend interpreta essas mensagens e monta os componentes Angular reais.

## Fluxo geral

```
Usuário
  |
  | upload dos PDFs + pergunta
  v
Frontend (Angular :4200)
  |
  | POST com SSE para /awp
  v
Backend (Mastra :4113)
  |
  | extrai texto dos PDFs antes de enviar ao modelo
  | envia conversa ao Claude claude-sonnet-4-5
  v
Anthropic API
  |
  | Claude analisa e chama renderSurface(template, dados)
  v
Backend — tool renderSurface
  |
  | monta mensagens A2UI (createSurface + updateComponents + updateDataModel)
  | emite TOOL_CALL_RESULT via SSE
  v
Frontend — AgentService
  |
  | A2uiRendererService processa as mensagens A2UI
  | atualiza lista de surfaces
  v
<a2ui-v09-surface> renderiza o card na tela
```

O modelo nunca gera JSON de layout diretamente. Ele sempre chama a tool `renderSurface` passando apenas o nome do template e os dados extraídos dos documentos. O código da tool é quem monta as mensagens A2UI com estrutura garantida.

## Pré-requisitos

- Node.js 20 ou superior
- pnpm 9 ou superior (instale com `npm install -g pnpm`)
- Chave de API da Anthropic (crie em console.anthropic.com)

## Como rodar

**1. Clone o repositório**

```
git clone <url-do-repo>
cd agentic-ui
```

**2. Configure a chave da Anthropic**

Crie um arquivo `.env` dentro da pasta `backend`:

```
cd backend
echo "ANTHROPIC_API_KEY=sk-ant-SUA_CHAVE_AQUI" > .env
```

Substitua `sk-ant-SUA_CHAVE_AQUI` pela sua chave real.

**3. Instale as dependências e suba o backend**

```
cd backend
pnpm install
PORT=4113 pnpm dev
```

Aguarde até aparecer no terminal:

```
mastra  ready
Studio: http://localhost:4113
API:    http://localhost:4113/api
```

**4. Em outro terminal, suba o frontend**

```
cd frontend
pnpm install
pnpm start
```

Aguarde o build terminar e acesse http://localhost:4200.

**5. Use a aplicação**

- Clique em "Currículo (PDF)" e selecione o arquivo do currículo
- Clique em "Vaga (PDF)" e selecione o arquivo da vaga
- Digite uma pergunta no campo de texto, por exemplo: "Sou adequado para esta vaga?"
- Pressione Enter ou clique em Analisar
- Aguarde o agente processar — os cards aparecem conforme cada bloco é gerado

## Estrutura do repositório

```
agentic-ui/
  backend/    — servidor Mastra com agente, tools e templates A2UI
  frontend/   — aplicação Angular com renderer A2UI
  README.md   — este arquivo
```

Cada subprojeto tem seu próprio README com detalhes de arquitetura e decisões de design.
