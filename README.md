# Cadastro com IA + n8n

Este mini projeto foi organizado para voce aprender o fluxo completo:

`formulario HTML -> servidor local Node -> webhook do n8n -> IA -> resposta na tela`

O detalhe importante: mesmo antes de configurar o `n8n`, o projeto funciona em modo demo. Isso te permite estudar em etapas.

## Rodando localmente

Na pasta do projeto:

```bash
npm start
```

Depois abra [http://localhost:3000](http://localhost:3000).

Tambem existe uma rota de diagnostico:

[http://localhost:3000/health](http://localhost:3000/health)

## O papel de cada arquivo

- `formulario_cadastro_ia.html`: interface do cadastro.
- `server.js`: servidor local que recebe o POST em `/api/cadastro`.
- `.env.example`: exemplo da variavel com a URL do webhook do `n8n`.

## Como pensar a arquitetura

O fluxo aqui ficou assim:

1. O usuario preenche nome, email, empresa e cargo.
2. O front envia isso para `POST /api/cadastro`.
3. O `server.js` valida os campos.
4. Se existir `N8N_WEBHOOK_URL`, ele encaminha o cadastro para o `n8n`.
5. O `n8n` chama uma IA e responde um JSON com `message`.
6. O navegador mostra essa mensagem no card final.

Se a variavel do `n8n` nao estiver definida, o servidor devolve uma resposta demo para voce testar a experiencia inteira.

## Como montar no n8n

A documentacao atual do `n8n` indica que o node `Webhook` pode responder de formas diferentes, e a forma mais didatica para este caso e usar `Respond to Webhook`, porque assim voce controla exatamente o JSON que volta para o navegador.

Fontes oficiais:

- [Webhook node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
- [Respond to Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/)
- [OpenAI node no n8n](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-langchain.openai/)

### Workflow sugerido

1. `Webhook`
2. `Edit Fields (Set)` ou `Code`
3. `OpenAI`
4. `Respond to Webhook`

### Configuracao do Webhook

No node `Webhook`:

- `HTTP Method`: `POST`
- `Path`: `cadastro-ia`
- `Respond`: `Using 'Respond to Webhook' Node`

Para testar, clique em `Listen for test event`.

## Exemplo de dado que chega ao n8n

```json
{
  "nome": "Edson",
  "email": "edson@email.com",
  "empresa": "Acme",
  "cargo": "Analista"
}
```

## Prompt simples para a IA

Use algo curto e bem controlado:

```text
Voce e um assistente divertido e simpatico.
Responda em portugues do Brasil.

Regras:
- Escolha apenas uma informacao entre nome, email, empresa ou cargo.
- Crie uma curiosidade ou comentario curto em tom engracado.
- Nao seja ofensivo.
- Nao invente fatos sensiveis.
- No maximo 3 frases.

Dados:
Nome: {{$json.nome}}
Email: {{$json.email}}
Empresa: {{$json.empresa}}
Cargo: {{$json.cargo}}
```

## O que o front espera receber

O front desta pasta espera algo nesse formato:

```json
{
  "message": "Edson, curiosidade rapida: quem trabalha como Analista normalmente desenvolve um radar secreto para planilhas suspeitas."
}
```

## Test URL e Production URL

Pela documentacao do `n8n`, o `Webhook` tem uma `Test URL` e uma `Production URL`.

- `Test URL`: usada quando voce esta testando e clicou em `Listen for test event`.
- `Production URL`: usada quando o workflow esta ativo para rodar de verdade.

Para estudar:

1. comece com a `Test URL`;
2. depois troque para a `Production URL`.

## Como ligar este projeto ao n8n

No PowerShell:

```powershell
$env:N8N_WEBHOOK_URL="http://localhost:5678/webhook-test/cadastro-ia"
npm start
```

Quando passar para producao, a URL normalmente muda de `webhook-test` para `webhook`.

## Ordem de aprendizado recomendada

Se voce esta comecando no `n8n`, faça nessa ordem:

1. Teste o formulario em modo demo.
2. Monte o node `Webhook`.
3. Faça o `Webhook` devolver resposta fixa primeiro.
4. Depois coloque a IA no meio.
5. Por fim, melhore o prompt para deixar o humor mais do seu jeito.

Esse caminho deixa tudo mais claro porque voce enxerga onde cada parte entra.
