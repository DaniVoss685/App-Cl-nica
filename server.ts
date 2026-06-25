import express from "express";
import path from "path";
import "dotenv/config";
import axios from "axios";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Evolution API Proxy Helper
  const evolutionProxy = async (req: express.Request, res: express.Response, endpoint: string) => {
    let apiUrl = (process.env.VITE_EVOLUTION_API_URL || "").trim();
    const apiKey = (process.env.VITE_EVOLUTION_API_KEY || "").trim();
    
    if (!apiUrl || !apiKey) {
      console.warn("[WhatsApp API] Missing configuration.");
      if (endpoint.includes("connectionState")) {
        return res.json({ instance: { state: "disconnected" } });
      }
      return res.status(400).json({ error: "Evolution API not configured" });
    }

    try {
      // Ensure apiUrl doesn't end with slash
      apiUrl = apiUrl.replace(/\/$/, "");
      
      // Some users might include /instance in their apiUrl, but we add it in our service.
      // If we detect /instance/instance, we fix it.
      let cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
      
      const fullUrl = `${apiUrl}${cleanEndpoint}`.replace("/instance/instance", "/instance");
      
      console.log(`[WhatsApp Proxy] ${req.method} ${endpoint} -> ${fullUrl}`);
      
      const response = await axios({
        method: req.method,
        url: fullUrl,
        data: req.body,
        headers: {
          "apikey": apiKey,
          "Content-Type": "application/json",
          "accept": "application/json"
        },
        timeout: 10000
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

  // WhatsApp Proxy Routes
  app.use("/api/whatsapp", (req, res) => {
    // req.url in app.use is the part after the mount point
    evolutionProxy(req, res, req.url);
  });

  // Jarvis AI Processing Route
  app.post("/api/jarvis/query", async (req, res) => {
    const { query, context } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Ambiente não configurado para IA." });
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
      res.status(500).json({ error: "Falha nos sistemas, senhor." });
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
