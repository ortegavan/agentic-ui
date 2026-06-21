# Frontend

Este é o cliente da prova de conceito. Ele permite que o usuário faça upload dos PDFs, envie perguntas ao agente e exibe os cards de análise conforme o backend os gera, em tempo real.

## Tecnologias

### Angular 21

Angular é um framework TypeScript para construir aplicações web. A versão 21 introduz um modelo de programação baseado em signals — um mecanismo reativo para gerenciar estado sem a dependência histórica do Zone.js.

Este projeto usa três características modernas do Angular 21:

**Standalone components** — cada componente é uma unidade independente que declara suas próprias dependências. Não existe mais o conceito de NgModule como camada obrigatória de organização.

**Signals** — são valores reativos que notificam o framework quando mudam. Em vez de `this.loading = true` sem nenhuma reatividade, usamos `this.loading.set(true)` e o template que lê `loading()` é atualizado automaticamente. O projeto usa `signal()` para estado local e `computed()` para valores derivados.

**Zoneless com OnPush** — o Zone.js é uma biblioteca que o Angular historicamente usava para detectar quando algo mudou na aplicação (interceptava timers, promessas, eventos DOM). Essa abordagem é conveniente mas tem custo de desempenho. No modo zoneless (`provideZonelessChangeDetection()`), o Angular só atualiza a view quando um signal muda ou quando o componente pede explicitamente (`markForCheck()`). Todos os componentes usam `ChangeDetectionStrategy.OnPush`, que diz ao Angular para só verificar o componente quando seus inputs mudarem.

### @ag-ui/client — HttpAgent

O `HttpAgent` é o cliente do protocolo AG-UI. Ele envia uma requisição POST para o backend e mantém a conexão aberta para receber o stream de eventos SSE.

SSE (Server-Sent Events) funciona assim: o cliente abre uma conexão HTTP normal, mas o servidor não fecha a resposta. Em vez disso, ele vai enviando linhas de texto formatadas conforme os eventos vão acontecendo. O `HttpAgent` abstrai isso e expõe um Observable RxJS — um fluxo de objetos de evento que o código pode assinar com `.subscribe()`.

O método `HttpAgent.run()` recebe o payload da requisição (ID de thread, ID de execução, mensagens) e retorna esse Observable. Cada item emitido é um evento AG-UI tipado.

### @a2ui/angular — SurfaceComponent e A2uiRendererService

O pacote `@a2ui/angular` fornece dois elementos centrais para renderizar interfaces descritas em A2UI:

**A2uiRendererService** — serviço singleton que mantém o estado interno de todas as surfaces ativas. O método `processMessages()` recebe um array de mensagens A2UI (`createSurface`, `updateComponents`, `updateDataModel`) e atualiza o modelo interno. É o "motor" do renderer.

**SurfaceComponent** (`<a2ui-v09-surface>`) — componente Angular que pega um `surfaceId` e renderiza dinamicamente os componentes daquela surface. Internamente, ele usa `ngComponentOutlet` para instanciar os componentes Angular corretos (CardComponent, ColumnComponent, TextComponent, etc.) com base nas mensagens A2UI processadas.

O catálogo de componentes (`BasicCatalog`) é o que mapeia nomes como `"Card"`, `"Text"`, `"Icon"` para os componentes Angular correspondentes. Ele é configurado em `app.config.ts` via `A2UI_RENDERER_CONFIG`.

## Como funciona o fluxo

```
Usuário seleciona PDFs e digita pergunta
  |
  | FileReader converte PDFs para base64
  v
app.ts — chama agent.enviar(pergunta, curriculoBase64, vagaBase64)
  |
  v
agent.service.ts — AgentService
  |
  | monta o conteúdo da mensagem com os marcadores base64
  | chama HttpAgent.run({ threadId, runId, messages })
  v
Backend via POST /awp (SSE)
  |
  | stream de eventos AG-UI começa a chegar
  v
AgentService — .subscribe() no Observable
  |
  |--- evento TEXT_MESSAGE_CHUNK
  |      acumula o texto delta em messages signal
  |      o chat na tela atualiza em tempo real
  |
  |--- evento TOOL_CALL_RESULT
         conteúdo é JSON com { messages: [...] }
         chama A2uiRendererService.processMessages(mensagens)
         extrai surfaceIds das mensagens createSurface
         atualiza surfaceIds signal
  |
  v
app.html — @for (id of agent.surfaceIds())
  |
  v
<a2ui-v09-surface [surfaceId]="id"> renderiza o card
```

Quando o `surfaceIds` signal é atualizado, o Angular re-renderiza o bloco `@for` e cria um novo `<a2ui-v09-surface>`. O componente busca no `A2uiRendererService` o estado interno da surface (que já foi populado pelo `processMessages`) e monta os componentes dinamicamente.

### Por que o renderer já tem os dados quando o componente é criado

Isso funciona porque `processMessages()` é chamado antes de `surfaceIds.update()`. No momento em que o Angular detecta a mudança em `surfaceIds` e renderiza o `<a2ui-v09-surface>`, o renderer já conhece a estrutura e os dados da surface. Não há assincronicidade entre processar os dados e renderizar a view.

## Estrutura de pastas

```
frontend/
  src/
    app/
      agent/
        agent.service.ts   — gerencia o stream AG-UI e a comunicação com o renderer A2UI
      app.ts               — componente raiz: uploads, chat, trigger de análise
      app.html             — template com uploads, seção de chat e seção de surfaces
      app.scss             — estilos do layout geral
      app.config.ts        — configuração de providers Angular (A2UI, roteamento)
      app.routes.ts        — rotas (apenas a raiz nesta POC)
    index.html             — HTML base com link da fonte Material Icons
    styles.scss            — estilos globais e tokens CSS do A2UI
  package.json
  angular.json
  tsconfig.json
```

### app.config.ts — o que é configurado ali

O arquivo `app.config.ts` é o ponto de entrada de configuração do Angular. Os providers registrados são:

- `provideBrowserGlobalErrorListeners()` — captura erros não tratados no browser
- `provideZonelessChangeDetection()` — habilita o modo sem Zone.js
- `provideRouter(routes)` — sistema de roteamento
- `A2UI_RENDERER_CONFIG` com `BasicCatalog` — registra o catálogo de componentes A2UI
- `A2uiRendererService` — instancia o renderer como singleton no injetor raiz
- `provideMarkdownRenderer()` — habilita renderização de markdown nos componentes Text do A2UI

### Por que provideMarkdownRenderer é necessário

O `TextComponent` do A2UI injeta um token chamado `MarkdownRenderer` para renderizar textos com formatação markdown. Esse token não tem um provider padrão automático. Sem `provideMarkdownRenderer()`, o Angular não consegue criar o `TextComponent` e os textos dos cards aparecem em branco.

## Pré-requisito

O backend deve estar rodando em `http://localhost:4113`. Veja as instruções no README do backend.

## Como rodar

Instalação de dependências:

```
pnpm install
```

Modo de desenvolvimento (com live reload):

```
pnpm start
```

Aguarde o build terminar e acesse http://localhost:4200.

Build de produção:

```
pnpm build
```

Os arquivos de saída ficam em `dist/frontend/browser/`.

## Variáveis e tokens CSS do A2UI

O renderer A2UI usa custom properties CSS para theming. Os valores padrão ficam em `src/styles.scss` dentro do bloco `:root`. As propriedades mais relevantes para aparência dos cards são:

- `--a2ui-color-on-background` — cor base do texto nos componentes Text
- `--a2ui-text-caption-color` — cor do texto em variante caption
- `--a2ui-color-surface` — cor de fundo dos cards
- `--a2ui-color-primary` — cor primária (botões, destaques)
- `--a2ui-card-border-radius` — arredondamento dos cards
- `--a2ui-spacing-m` — espaçamento padrão usado internamente pelos componentes

Os ícones (check, close, info) usam a fonte Material Icons carregada em `src/index.html` via Google Fonts. Sem essa fonte, o browser exibiria o nome do ícone como texto puro.
