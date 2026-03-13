const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3000);
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "";
const HTML_FILE = path.join(__dirname, "formulario_cadastro_ia.html");

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function sendHtml(response, html) {
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(html);
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function validatePayload(payload) {
  const requiredTextFields = [
    "nome",
    "email",
    "whatsapp",
    "area_atuacao",
    "tempo_atuacao",
    "alunos_mes",
    "renda_principal",
    "principal_dor",
    "problema_financeiro",
    "crescer_6_meses",
    "interesse_beta",
    "feedback_disponibilidade"
  ];

  const requiredListFields = [
    "formatos_aula",
    "organizacao_atual",
    "funcionalidades_desejadas"
  ];

  for (const field of requiredTextFields) {
    if (!payload[field] || !String(payload[field]).trim()) {
      return `O campo "${field}" e obrigatorio.`;
    }
  }

  for (const field of requiredListFields) {
    if (!Array.isArray(payload[field]) || payload[field].length === 0) {
      return `Selecione pelo menos uma opcao em "${field}".`;
    }
  }

  return null;
}

function buildDemoMessage(payload) {
  const formato = Array.isArray(payload.formatos_aula) ? payload.formatos_aula[0] : "aulas";
  const organizacao = Array.isArray(payload.organizacao_atual) ? payload.organizacao_atual[0] : "sua rotina atual";
  const funcionalidade = Array.isArray(payload.funcionalidades_desejadas) ? payload.funcionalidades_desejadas[0] : "uma ferramenta mais organizada";
  const options = [
    `${payload.nome}, seu perfil tem cara de beta forte: voce atua com ${payload.area_atuacao}, atende ${payload.alunos_mes.toLowerCase()} e ainda quer crescer nos proximos meses. Isso ja cheira a "me passa o acesso agora".`,
    `${payload.nome}, quando alguem organiza ${formato.toLowerCase()} usando ${organizacao.toLowerCase()}, o universo costuma responder com uma planilha misteriosa e tres lembretes perdidos. Boa noticia: voce parece exatamente o tipo de pessoa que aproveitaria ${funcionalidade.toLowerCase()}.`,
    `Leitura rapida do seu perfil: dor clara em "${payload.principal_dor}", interesse beta "${payload.interesse_beta.toLowerCase()}" e abertura para feedback "${payload.feedback_disponibilidade.toLowerCase()}". Traduzindo: voce nao veio so passear, veio validar produto.`,
    `${payload.nome}, pequena curiosidade de bastidor: professor autonomo que ja vive confusao com "${payload.problema_financeiro.toLowerCase()}" costuma valorizar qualquer ferramenta que tire cobranca e agenda do modo sobrevivencia para o modo negocio.`
  ];
  return options[Math.floor(Math.random() * options.length)];
}

function normalizeResponse(result, fallbackMessage) {
  if (!result || typeof result !== "object") {
    return { message: fallbackMessage, source: "n8n" };
  }

  for (const key of ["message", "output", "text"]) {
    if (typeof result[key] === "string" && result[key].trim()) {
      return { message: result[key].trim(), source: "n8n" };
    }
  }

  return { message: fallbackMessage, source: "n8n" };
}

async function callN8n(payload) {
  const fallbackMessage = buildDemoMessage(payload);

  if (!N8N_WEBHOOK_URL) {
    return { message: fallbackMessage, source: "demo" };
  }

  const response = await fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`O n8n respondeu com status ${response.status}.`);
  }

  if (!text.trim()) {
    return { message: fallbackMessage, source: "n8n" };
  }

  try {
    return normalizeResponse(JSON.parse(text), fallbackMessage);
  } catch {
    return { message: text.trim() || fallbackMessage, source: "n8n" };
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/formulario_cadastro_ia.html")) {
      const html = await fs.readFile(HTML_FILE, "utf8");
      sendHtml(response, html);
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, {
        ok: true,
        mode: N8N_WEBHOOK_URL ? "n8n" : "demo"
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/cadastro") {
      const raw = await readBody(request);
      const payload = raw ? JSON.parse(raw) : {};
      const validationError = validatePayload(payload);

      if (validationError) {
        sendJson(response, 400, { error: validationError });
        return;
      }

      const result = await callN8n(payload);
      sendJson(response, 200, result);
      return;
    }

    sendJson(response, 404, { error: "Rota nao encontrada." });
  } catch (error) {
    sendJson(response, 500, {
      error: error.message || "Erro interno no servidor."
    });
  }
});

server.listen(PORT, () => {
  console.log(`Servidor local em http://localhost:${PORT}`);
  console.log(N8N_WEBHOOK_URL ? "Modo: conectado ao n8n" : "Modo: demo local");
});
