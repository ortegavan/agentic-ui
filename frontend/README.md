# Frontend — POC UI Agêntica

Frontend Angular 21 que consome o backend Mastra para análise de currículo vs. vaga usando o protocolo AG-UI e o renderer A2UI v0.9.

## Stack

- **Angular 21** — standalone, signals, OnPush
- **@a2ui/angular v0.10.1** — renderer oficial (subpath `./v0_9`)
- **@ag-ui/client v0.0.57** — `HttpAgent` para transporte SSE
- **pnpm** — gerenciador de pacotes

## Arquitetura

```
app.ts               — AppComponent: uploads, chat, trigger de análise
agent/agent.service  — HttpAgent + signals (messages, surfaceIds, isRunning)
app.config.ts        — Provider de A2UI_RENDERER_CONFIG + A2uiRendererService
```

### Fluxo de dados

1. Usuário faz upload dos PDFs (currículo + vaga) → lidos como base64 via `FileReader`
2. Pergunta é enviada ao backend via `HttpAgent.run()` (POST SSE em `http://localhost:4111/awp`)
3. Eventos `TEXT_MESSAGE_CHUNK` → acumulam texto em streaming na lista de mensagens
4. Eventos `TOOL_CALL_RESULT` → `A2uiRendererService.processMessages()` processa A2UI messages; `surfaceIds` signal atualizado
5. `<a2ui-v09-surface [surfaceId]="id">` renderiza cada cartão (score, requisitos, pontos fortes, sugestões)

## Pré-requisito

O backend **deve estar rodando** em `http://localhost:4111`:

```bash
cd ../backend
pnpm start
```

## Iniciar

```bash
pnpm install
pnpm start
# Acesse http://localhost:4200
```

## Build de produção

```bash
pnpm run build
```

> **Aviso de orçamento**: o bundle inicial ultrapassa 500 kB (chega a ~550 kB) por causa do renderer A2UI. Sem impacto funcional.
