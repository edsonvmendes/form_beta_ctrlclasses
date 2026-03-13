function buildDemoMessage(payload) {
  const formato = Array.isArray(payload.formatos_aula) ? payload.formatos_aula[0] : "aulas";
  const organizacao = Array.isArray(payload.organizacao_atual) ? payload.organizacao_atual[0] : "sua rotina atual";
  const funcionalidade = Array.isArray(payload.funcionalidades_desejadas) ? payload.funcionalidades_desejadas[0] : "uma ferramenta mais organizada";
  const options = [
    `${payload.nome}, seu perfil tem cara de beta forte: voce atua com ${payload.area_atuacao}, atende ${String(payload.alunos_mes).toLowerCase()} e ainda quer crescer nos proximos meses. Isso ja cheira a "me passa o acesso agora".`,
    `${payload.nome}, quando alguem organiza ${String(formato).toLowerCase()} usando ${String(organizacao).toLowerCase()}, o universo costuma responder com uma planilha misteriosa e tres lembretes perdidos. Boa noticia: voce parece exatamente o tipo de pessoa que aproveitaria ${String(funcionalidade).toLowerCase()}.`,
    `Leitura rapida do seu perfil: dor clara em "${payload.principal_dor}", interesse beta "${String(payload.interesse_beta).toLowerCase()}" e abertura para feedback "${String(payload.feedback_disponibilidade).toLowerCase()}". Traduzindo: voce nao veio so passear, veio validar produto.`,
    `${payload.nome}, pequena curiosidade de bastidor: professor autonomo que ja vive confusao com "${String(payload.problema_financeiro).toLowerCase()}" costuma valorizar qualquer ferramenta que tire cobranca e agenda do modo sobrevivencia para o modo negocio.`
  ];

  return options[Math.floor(Math.random() * options.length)];
}

function normalizeResponse(result, fallbackMessage) {
  if (!result || typeof result !== "object") {
    return { message: fallbackMessage, source: "n8n" };
  }

  for (const key of ["message", "output", "text", "mensagem_ia"]) {
    if (typeof result[key] === "string" && result[key].trim()) {
      return { message: result[key].trim(), source: "n8n" };
    }
  }

  return { message: fallbackMessage, source: "n8n" };
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

async function parseBody(req) {
  if (typeof req.body === "string") {
    return req.body ? JSON.parse(req.body) : {};
  }

  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Metodo nao permitido." });
    return;
  }

  try {
    const payload = await parseBody(req);
    const validationError = validatePayload(payload);

    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const fallbackMessage = buildDemoMessage(payload);
    const webhookUrl = process.env.N8N_WEBHOOK_URL || "";

    if (!webhookUrl) {
      res.status(200).json({ message: fallbackMessage, source: "demo" });
      return;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await response.text();

    if (!response.ok) {
      res.status(502).json({ error: `O n8n respondeu com status ${response.status}.` });
      return;
    }

    if (!text.trim()) {
      res.status(200).json({ message: fallbackMessage, source: "n8n" });
      return;
    }

    try {
      res.status(200).json(normalizeResponse(JSON.parse(text), fallbackMessage));
    } catch {
      res.status(200).json({ message: text.trim() || fallbackMessage, source: "n8n" });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message || "Erro interno na funcao."
    });
  }
};
