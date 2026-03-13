# Fluxo n8n + Supabase para o formulario

Objetivo:

1. Receber o formulario.
2. Normalizar os campos.
3. Pedir para a IA classificar o perfil.
4. Salvar o historico no Supabase.
5. Responder para o formulario.

## 1. Tabela no Supabase

No Supabase, abra o SQL Editor e rode o arquivo:

- `supabase_beta_tester_history.sql`

Isso cria uma tabela simples de historico chamada `public.beta_tester_history`.

Ela guarda:

- dados originais do formulario
- classificacao da IA
- mensagem final exibida no front
- payload bruto

Observacao de seguranca:

- a tabela fica com `RLS` habilitado
- sem policies publicas
- o acesso no `n8n` pode ser feito com a `service_role`, como a documentacao do node Supabase do n8n orienta

Fontes:

- [Supabase credentials no n8n](https://docs.n8n.io/integrations/builtin/credentials/supabase/)
- [Supabase node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.supabase/)
- [Hardening the Data API](https://supabase.com/docs/guides/api/hardening-data-api)

## 2. Credencial do Supabase no n8n

Crie uma credencial `Supabase` no `n8n` com:

- `Host`: URL do projeto no Supabase
- `Service Role Secret`: chave `service_role`

Segundo a documentacao oficial do `n8n`, essa credencial usa `Host` + `Service Role Secret`.

## 3. Fluxo sugerido

Monte assim:

1. `Webhook`
2. `Edit Fields`
3. `AI Agent`
4. `Code`
5. `Supabase`
6. `Respond to Webhook`

## 4. Webhook

No `Webhook`:

- `HTTP Method`: `POST`
- `Path`: `cadastro-ia`
- `Respond`: `Using 'Respond to Webhook' Node`

## 5. Edit Fields

Esse node pega o body do webhook e deixa tudo com nome simples.

Crie estes campos:

- `nome` = `{{$json.body.nome}}`
- `email` = `{{$json.body.email}}`
- `whatsapp` = `{{$json.body.whatsapp}}`
- `area_atuacao` = `{{$json.body.area_atuacao}}`
- `formatos_aula` = `{{$json.body.formatos_aula}}`
- `tempo_atuacao` = `{{$json.body.tempo_atuacao}}`
- `alunos_mes` = `{{$json.body.alunos_mes}}`
- `renda_principal` = `{{$json.body.renda_principal}}`
- `organizacao_atual` = `{{$json.body.organizacao_atual}}`
- `principal_dor` = `{{$json.body.principal_dor}}`
- `problema_financeiro` = `{{$json.body.problema_financeiro}}`
- `crescer_6_meses` = `{{$json.body.crescer_6_meses}}`
- `funcionalidades_desejadas` = `{{$json.body.funcionalidades_desejadas}}`
- `interesse_beta` = `{{$json.body.interesse_beta}}`
- `feedback_disponibilidade` = `{{$json.body.feedback_disponibilidade}}`
- `observacoes` = `{{$json.body.observacoes}}`

## 6. AI Agent

A ideia aqui nao e fazer texto solto. E melhor pedir um JSON bem objetivo.

Use um prompt como este:

```text
Voce esta analisando respostas de um formulario para selecionar beta testers de uma aplicacao de gestao para aulas particulares.

Avalie o perfil e responda APENAS em JSON valido.

Objetivo:
- identificar se a pessoa parece um beta tester forte
- resumir as dores e o potencial do perfil
- gerar uma mensagem curta para aparecer no formulario

Regras de classificacao:
- "perfil" deve ser: "alto potencial", "medio potencial" ou "baixo potencial"
- "prioridade" deve ser: "alta", "media" ou "baixa"
- "score" deve ser um numero inteiro de 0 a 10
- "resumo_ia" deve ter no maximo 2 frases
- "mensagem_ia" deve ser amigavel, em portugues do Brasil, com no maximo 3 frases

Pontos que aumentam o score:
- tem alunos ativos
- quer crescer
- sente dor real de agenda, cobranca ou financeiro
- usa processos improvisados como WhatsApp, planilha ou caderno
- quer testar beta
- topa dar feedback

Dados:
Nome: {{$json.nome}}
Email: {{$json.email}}
WhatsApp: {{$json.whatsapp}}
Area de atuacao: {{$json.area_atuacao}}
Formatos de aula: {{$json.formatos_aula}}
Tempo de atuacao: {{$json.tempo_atuacao}}
Alunos por mes: {{$json.alunos_mes}}
Renda principal: {{$json.renda_principal}}
Organizacao atual: {{$json.organizacao_atual}}
Principal dor: {{$json.principal_dor}}
Problema financeiro: {{$json.problema_financeiro}}
Crescer em 6 meses: {{$json.crescer_6_meses}}
Funcionalidades desejadas: {{$json.funcionalidades_desejadas}}
Interesse beta: {{$json.interesse_beta}}
Feedback disponibilidade: {{$json.feedback_disponibilidade}}
Observacoes: {{$json.observacoes}}

Formato esperado:
{
  "perfil": "alto potencial",
  "prioridade": "alta",
  "score": 9,
  "resumo_ia": "Professor com operacao ativa e dor clara de gestao.",
  "mensagem_ia": "Seu perfil combina muito com o beta porque voce ja vive uma rotina real de aulas e tem dores concretas que a ferramenta quer resolver."
}
```

## 7. Code

Depois do `AI Agent`, use um `Code` node para juntar:

- os dados do formulario
- a resposta JSON da IA

Use este codigo:

```javascript
const original = $input.first().json;
const raw = original.output || original.text || original.response || "{}";

let parsed;

try {
  parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
} catch {
  parsed = {
    perfil: "medio potencial",
    prioridade: "media",
    score: 5,
    resumo_ia: "A IA nao retornou JSON valido, entao aplicamos um fallback.",
    mensagem_ia: "Recebemos seu perfil e vamos analisar com mais cuidado para o beta."
  };
}

return [
  {
    json: {
      nome: original.nome,
      email: original.email,
      whatsapp: original.whatsapp,
      area_atuacao: original.area_atuacao,
      formatos_aula: original.formatos_aula,
      tempo_atuacao: original.tempo_atuacao,
      alunos_mes: original.alunos_mes,
      renda_principal: original.renda_principal,
      organizacao_atual: original.organizacao_atual,
      principal_dor: original.principal_dor,
      problema_financeiro: original.problema_financeiro,
      crescer_6_meses: original.crescer_6_meses,
      funcionalidades_desejadas: original.funcionalidades_desejadas,
      interesse_beta: original.interesse_beta,
      feedback_disponibilidade: original.feedback_disponibilidade,
      observacoes: original.observacoes,
      perfil: parsed.perfil,
      prioridade: parsed.prioridade,
      score: parsed.score,
      resumo_ia: parsed.resumo_ia,
      mensagem_ia: parsed.mensagem_ia,
      raw_payload: original,
      origem: "formulario-web",
      n8n_execution_id: $execution.id
    }
  }
];
```

## 8. Supabase

No node `Supabase`:

- `Resource`: `Row`
- `Operation`: `Create a new row`
- `Table`: `beta_tester_history`

Mapeie os campos da tabela para os campos do `Code`.

Os mais importantes:

- `nome` -> `{{$json.nome}}`
- `email` -> `{{$json.email}}`
- `whatsapp` -> `{{$json.whatsapp}}`
- `area_atuacao` -> `{{$json.area_atuacao}}`
- `formatos_aula` -> `{{$json.formatos_aula}}`
- `tempo_atuacao` -> `{{$json.tempo_atuacao}}`
- `alunos_mes` -> `{{$json.alunos_mes}}`
- `renda_principal` -> `{{$json.renda_principal}}`
- `organizacao_atual` -> `{{$json.organizacao_atual}}`
- `principal_dor` -> `{{$json.principal_dor}}`
- `problema_financeiro` -> `{{$json.problema_financeiro}}`
- `crescer_6_meses` -> `{{$json.crescer_6_meses}}`
- `funcionalidades_desejadas` -> `{{$json.funcionalidades_desejadas}}`
- `interesse_beta` -> `{{$json.interesse_beta}}`
- `feedback_disponibilidade` -> `{{$json.feedback_disponibilidade}}`
- `observacoes` -> `{{$json.observacoes}}`
- `perfil` -> `{{$json.perfil}}`
- `prioridade` -> `{{$json.prioridade}}`
- `score` -> `{{$json.score}}`
- `resumo_ia` -> `{{$json.resumo_ia}}`
- `mensagem_ia` -> `{{$json.mensagem_ia}}`
- `origem` -> `{{$json.origem}}`
- `n8n_execution_id` -> `{{$json.n8n_execution_id}}`
- `raw_payload` -> `{{$json.raw_payload}}`

## 9. Respond to Webhook

Depois do Supabase, use um `Edit Fields` pequeno ou outro `Code` para montar a resposta final do front.

Exemplo simples:

```javascript
return [
  {
    json: {
      message: $json.mensagem_ia,
      perfil: $json.perfil,
      prioridade: $json.prioridade,
      score: $json.score
    }
  }
];
```

No `Respond to Webhook`:

- `Respond With`: `First Incoming Item`

## 10. Resultado final

Com isso, cada envio:

1. entra pelo formulario
2. e analisado pela IA
3. fica salvo no Supabase
4. volta para a tela com mensagem personalizada

## 11. Melhorias futuras

Depois da primeira versao funcionando, vale adicionar:

- filtro no n8n para mandar WhatsApp apenas para `prioridade = alta`
- planilha ou dashboard com os melhores perfis
- automacao para marcar leads como `contatado`, `convidado` ou `entrou no beta`
