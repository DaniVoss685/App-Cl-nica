import express from "express";
import "dotenv/config";
import axios from "axios";
import https from "https";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Evolution API Proxy Helper
// Accepts credentials either from .env OR from request headers (x-evo-url, x-evo-key).
// The header-based approach allows browser clients to pass credentials from localStorage
// through this local proxy without CORS issues.
const evolutionProxy = async (req: express.Request, res: express.Response, endpoint: string) => {
  // Priority: request headers > .env
  let apiUrl = (
    (req.headers["x-evo-url"] as string) ||
    process.env.VITE_EVOLUTION_API_URL ||
    ""
  ).trim();
  const apiKey = (
    (req.headers["x-evo-key"] as string) ||
    process.env.VITE_EVOLUTION_API_KEY ||
    ""
  ).trim();

  if (!apiUrl || !apiKey) {
    console.warn("[WhatsApp Proxy] Missing credentials (no .env and no x-evo-url/x-evo-key headers).");
    if (endpoint.includes("connectionState")) {
      return res.json({ instance: { state: "disconnected" } });
    }
    return res.status(400).json({ error: "Evolution API credentials not configured. Set VITE_EVOLUTION_API_URL and VITE_EVOLUTION_API_KEY in .env or send x-evo-url/x-evo-key headers." });
  }

  try {
    apiUrl = apiUrl.replace(/\/$/, "");
    let cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const fullUrl = `${apiUrl}${cleanEndpoint}`.replace("/instance/instance", "/instance");

    console.log(`[WhatsApp Proxy] ${req.method} ${endpoint} -> ${fullUrl}`);

    // Strip our custom headers before forwarding
    const forwardHeaders: Record<string, string> = {
      "apikey": apiKey,
      "Content-Type": "application/json",
      "accept": "application/json",
    };

    const response = await axios({
      method: req.method as any,
      url: fullUrl,
      data: Object.keys(req.body || {}).length > 0 ? req.body : undefined,
      headers: forwardHeaders,
      timeout: 15000,
    });

    console.log(`[WhatsApp Proxy] Success: ${response.status}`);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: error.message };
    console.error(`[WhatsApp Proxy] Error ${status}:`, JSON.stringify(data));
    res.status(status).json(data);
  }
};

// WhatsApp Media Proxy — downloads media from remote url and streams to browser avoiding CORS issues
app.get("/api/whatsapp-media", async (req, res) => {
  const mediaUrl = req.query.url as string;
  const apiKey = (req.query.key as string) || (req.headers["x-evo-key"] as string) || process.env.VITE_EVOLUTION_API_KEY || "";
  const msgId = req.query.msgId as string;
  const jid = req.query.jid as string;
  const instance = (req.query.instance as string) || process.env.VITE_EVOLUTION_INSTANCE_NAME || "";
  
  // Se tivermos as informações de ID da mensagem e JID para descriptografar via Evolution API
  if (msgId && jid && instance && apiKey) {
    try {
      console.log(`[WhatsApp Media Proxy] Buscando mensagem ${msgId} no JID ${jid} para decodificar mídia...`);
      const evolutionUrl = process.env.VITE_EVOLUTION_API_URL || "http://localhost:8080";
      const cleanEvoUrl = evolutionUrl.replace(/\/$/, "");
      
      // 1. Busca a mensagem bruta na Evolution API
      const findRes = await axios.post(`${cleanEvoUrl}/chat/findMessages/${instance}`, {
        where: { 
          key: { 
            id: msgId,
            remoteJid: jid
          } 
        },
        limit: 10
      }, {
        headers: { 'apikey': apiKey },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        timeout: 12000
      });
      
      let msgs = findRes.data?.messages?.records || findRes.data?.records || findRes.data?.data?.records || findRes.data?.data || findRes.data || [];
      let rawMsg = msgs.find((m: any) => (m.key?.id === msgId) || (m.id === msgId));
      
      if (!rawMsg) {
        console.log(`[WhatsApp Media Proxy] Mensagem não encontrada com JID. Tentando fallback apenas com ID...`);
        try {
          const fallbackRes = await axios.post(`${cleanEvoUrl}/chat/findMessages/${instance}`, {
            where: { 
              key: { 
                id: msgId
              } 
            },
            limit: 10
          }, {
            headers: { 'apikey': apiKey },
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            timeout: 12000
          });
          msgs = fallbackRes.data?.messages?.records || fallbackRes.data?.records || fallbackRes.data?.data?.records || fallbackRes.data?.data || fallbackRes.data || [];
          rawMsg = msgs.find((m: any) => (m.key?.id === msgId) || (m.id === msgId));
        } catch (fErr: any) {
          console.error(`[WhatsApp Media Proxy] Fallback de busca falhou:`, fErr.message);
        }
      }
      
      if (rawMsg) {
        console.log(`[WhatsApp Media Proxy] Mensagem encontrada! Chamando getBase64FromMediaMessage...`);
        // 2. Chama getBase64FromMediaMessage para decodificar
        const decodeRes = await axios.post(`${cleanEvoUrl}/chat/getBase64FromMediaMessage/${instance}`, {
          message: rawMsg
        }, {
          headers: { 'apikey': apiKey },
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
          timeout: 15000
        });
        
        const mediaData = decodeRes.data;
        let base64Str = mediaData.base64 || mediaData.buffer || mediaData.media || mediaData;
        if (base64Str && typeof base64Str === "object") {
          base64Str = base64Str.base64 || base64Str.buffer || base64Str.media;
        }
        
        if (base64Str && typeof base64Str === "string") {
          // Remove o prefixo data URI se existir
          if (base64Str.includes(",")) {
            base64Str = base64Str.split(",")[1];
          }
          const buffer = Buffer.from(base64Str, "base64");
          let mimeType = mediaData.mimetype || mediaData.mimeType || "image/jpeg";
          
          // Força content-type de áudio apropriado se aplicável
          const isAudio = (mediaUrl && (mediaUrl.toLowerCase().includes("audio") || mediaUrl.toLowerCase().includes(".ogg") || mediaUrl.toLowerCase().includes(".opus") || mediaUrl.toLowerCase().includes("recording"))) || mimeType.includes("audio");
          if (isAudio) {
            mimeType = "audio/ogg";
          }
          
          console.log(`[WhatsApp Media Proxy] Mídia decodificada com sucesso! MimeType: ${mimeType}, Size: ${buffer.length} bytes`);
          res.setHeader("Content-Type", mimeType);
          res.setHeader("Content-Length", buffer.length);
          res.setHeader("Accept-Ranges", "bytes");
          return res.send(buffer);
        }
      }
    } catch (err: any) {
      console.error(`[WhatsApp Media Proxy] Falha ao descriptografar mídia via getBase64:`, err.message);
      if (err.response) {
        console.error(`[WhatsApp Media Proxy] Detalhes do erro:`, err.response.status, JSON.stringify(err.response.data));
      }
    }
  }
  
  // Fallback: download bruto tradicional
  if (!mediaUrl) {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  try {
    console.log(`[WhatsApp Media Proxy] Fazendo fallback de download direto para URL: ${mediaUrl}`);
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });

    const response = await axios({
      method: "GET",
      url: mediaUrl,
      responseType: "arraybuffer",
      headers: {
        "apikey": apiKey
      },
      httpsAgent,
      timeout: 20000
    });

    let contentType = response.headers["content-type"];
    
    const isAudio = mediaUrl.toLowerCase().includes("audio") || 
                    mediaUrl.toLowerCase().includes(".ogg") || 
                    mediaUrl.toLowerCase().includes(".opus") || 
                    mediaUrl.toLowerCase().includes("recording") ||
                    (contentType && String(contentType).toLowerCase().includes("audio"));

    if (isAudio) {
      contentType = "audio/ogg";
    } else if (!contentType || contentType === "application/octet-stream") {
      contentType = "application/octet-stream";
    }

    res.setHeader("Content-Type", String(contentType));
    res.setHeader("Content-Length", response.data.length);
    res.setHeader("Accept-Ranges", "bytes");
    
    res.send(response.data);
  } catch (error: any) {
    console.error("[WhatsApp Media Proxy Fallback] Error downloading media:", error.message);
    res.status(500).json({ error: "Failed to load media" });
  }
});

// WhatsApp Proxy Routes — forward everything under /api/whatsapp/* to Evolution API
app.use("/api/whatsapp", (req, res) => {
  evolutionProxy(req, res, req.url);
});

// Jarvis AI Processing Route
app.post("/api/jarvis/query", async (req, res) => {
  const { query, context } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ 
      error: "missing_api_key", 
      message: "Ambiente não configurado para IA. Por favor, adicione GEMINI_API_KEY no arquivo .env" 
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: `
      Você é JARVIS (Just A Rather Very Intelligent System), a inteligência artificial pessoal do Sr. Stark, agora gerenciando a clínica "${context.clinicName}".
      
      DIRETRIZES DE PERSONALIDADE:
      - Tom: Altamente sofisticado, britânico, calmo, porém levemente sarcástico se provocado.
      - Tratamento: Use sempre "Senhor" para se referir ao usuário.
      - Inteligência: Demonstre que você tem controle total sobre os sistemas. Use termos como "Escaneando registros", "Compilando dados", "Protocolo de gestão ativo".
      
      REGISTROS DA UNIDADE:
      - Unidade: ${context.clinicName}
      - Pacientes na Rede: ${context.totalPatients}
      - Protocolos de Agendamento hoje: ${context.appointmentsToday}
      - Volume Financeiro Liquidado (Mês): R$ ${context.revenueThisMonth}
      - Projeção Pendente: R$ ${context.pendingRevenueThisMonth}
      - Pacotes de Tratamento: ${context.totalPackages}
      - Equipe Técnica: ${context.totalProfessionals}
      
      DETALHAMENTO DA AGENDA DE HOJE:
      ${context.todayAppointmentsDetail || 'Nenhum protocolo de agendamento detectado para o ciclo atual.'}
      
      INSTRUÇÕES DE RESPOSTA:
      1. Responda com precisão aos dados. Se não souber algo, diga que está "recalculando os vetores de dados" ou que a informação não consta no "Banco de Dados Central da Stark".
      2. Seja breve mas elegante. Não soe como um robô básico.
      3. Fale exclusivamente em Português do Brasil.
      4. No final de relatórios, use "Aguardo seus comandos, senhor." ou "Sistemas em 100%, senhor.".
    `
    });

    const result = await model.generateContent(query);
    const response = await result.response;
    res.json({ text: response.text() });
  } catch (error: any) {
    console.error("[Jarvis AI] Error:", error);
    const isAuthError = error.message?.includes("API_KEY") || error.status === 403 || error.status === 400;
    res.status(500).json({ 
      error: isAuthError ? "invalid_api_key" : "system_failure", 
      message: "Falha nos sistemas, senhor." 
    });
  }
});

app.post("/api/carne-legal-chat", async (req, res) => {
  const { question } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "missing_question", message: "Informe uma pergunta." });
  }

  if (!apiKey) {
    return res.status(503).json({
      error: "missing_api_key",
      message: "Ambiente não configurado para IA. Adicione GEMINI_API_KEY no .env."
    });
  }

  const receitaContext = `
Fontes oficiais Receita Federal usadas como base:
1. Tabela IRPF 2025, atualizada em 27/04/2026:
- A partir de maio/2025: isento até R$ 2.428,80; 7,5% com dedução R$ 182,16; 15% com dedução R$ 394,16; 22,5% com dedução R$ 675,49; 27,5% com dedução R$ 908,73.
- Dedução mensal por dependente: R$ 189,59. Limite mensal de desconto simplificado: R$ 607,20.

2. Deduções Carnê-Leão, Receita Federal:
- Podem ser deduzidos contribuição previdenciária oficial, dependentes, pensão alimentícia judicial/escritura pública e Livro Caixa.
- Livro Caixa: receitas e despesas da prestação de serviços sem vínculo empregatício.
- Despesas dedutíveis em Livro Caixa: remuneração de terceiros com vínculo e encargos, emolumentos pagos a terceiros e despesas de custeio necessárias à percepção da receita e à manutenção da fonte produtora.
- A dedução mensal de Livro Caixa é limitada ao rendimento recebido no mês; excesso pode ir para meses seguintes até dezembro.
- Despesa de custeio indispensável pode incluir aluguel de sala comercial, água, luz, telefone, material de expediente/consumo e contratação de pessoal.
- Locomoção, combustível, estacionamento, manutenção de veículo, seguro e IPVA não são dedutíveis, exceto regra específica de representante comercial autônomo.
- Tíquetes de caixa, recibos não identificados e similares não comprovam despesas de Livro Caixa.
- Leasing e depreciação de bens não são dedutíveis.
- Em imóvel residencial-profissional, pode-se deduzir um quinto de despesas como aluguel, energia, água, gás, taxas, impostos, telefone e condomínio quando não for possível comprovar a parte profissional.
- Consertos, manutenção e reforma de imóvel próprio não são dedutíveis.
- Benfeitorias em imóvel alugado podem ser dedutíveis se forem compensação contratual do aluguel, escrituradas e comprovadas.
- Publicações e roupas especiais necessárias à atividade, contribuições a conselhos/sindicatos, pagamentos a terceiros, propaganda ligada à atividade e congressos/seminários necessários podem ser dedutíveis se escriturados e comprovados.

3. Rendimentos Carnê-Leão, Receita Federal:
- Honorários recebidos de pessoa física por profissional autônomo estão sujeitos ao Carnê-Leão.
- Despesas comuns podem ser rateadas se escrituradas em Livro Caixa e comprovadas.
- Se a prestação de serviços de terceiros se tornar sistemática/habitual e o profissional recebe em nome próprio o total pago e paga os demais, pode haver equiparação à pessoa jurídica.
- Rendimentos de pessoa jurídica não estão sujeitos ao pagamento do Carnê-Leão, embora despesas de Livro Caixa possam ser informadas conforme a regra aplicável.
`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: `
Você é um assistente fiscal de apoio para uma clínica, especializado em dúvidas operacionais sobre Carnê-Leão e Livro Caixa.
Responda em português do Brasil, com tom claro e direto.
Use exclusivamente o contexto da Receita Federal fornecido abaixo. Se a pergunta depender de detalhe fora do contexto, diga que precisa validar com a contabilidade/Receita.
Não invente regra fiscal. Diferencie "em geral pode", "em geral não pode" e "depende de comprovação/atividade".
Sempre termine com uma linha "Fonte: Receita Federal - Carnê-Leão/Livro Caixa.".

${receitaContext}
`
    });

    const result = await model.generateContent(question.slice(0, 2000));
    const response = await result.response;
    res.json({ text: response.text() });
  } catch (error: any) {
    console.error("[Carne Legal Chat] Error:", error);
    res.status(500).json({
      error: "ai_failure",
      message: "Não foi possível consultar a IA fiscal agora."
    });
  }
});

export default app;
