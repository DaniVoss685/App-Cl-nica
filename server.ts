import express from "express";
import path from "path";
import "dotenv/config";
import axios from "axios";
import https from "https";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function startServer() {
  const app = express();
  const PORT = 3000;

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
        
        const msgs = findRes.data?.messages?.records || findRes.data?.records || findRes.data?.data?.records || findRes.data?.data || findRes.data || [];
        const rawMsg = msgs.find((m: any) => (m.key?.id === msgId) || (m.id === msgId));
        
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
          const base64Str = mediaData.base64 || mediaData.buffer;
          
          if (base64Str && typeof base64Str === "string") {
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
