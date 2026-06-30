/**
 * evolutionApi.ts
 * Client-side service that calls the local /api/whatsapp proxy (server.ts),
 * which in turn forwards to the actual Evolution API, avoiding CORS issues.
 * Credentials are passed as custom headers x-evo-url and x-evo-key.
 */

import type { WaChat, WaMessage } from '../store';

// ─── Internal helpers ────────────────────────────────────────────────────────

function buildHeaders(url?: string, key?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'accept': 'application/json',
  };
  // Only send credentials if they are non-empty — proxy falls back to .env if absent
  if (url && url.trim()) headers['x-evo-url'] = url.trim();
  if (key && key.trim()) headers['x-evo-key'] = key.trim();
  return headers;
}

async function proxyGet(url: string, key: string, path: string): Promise<any> {
  const res = await fetch(`/api/whatsapp${path}`, {
    method: 'GET',
    headers: buildHeaders(url, key),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err?.message || err?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function proxyPost(url: string, key: string, path: string, body: unknown): Promise<any> {
  const res = await fetch(`/api/whatsapp${path}`, {
    method: 'POST',
    headers: buildHeaders(url, key),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err?.message || err?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Text extractor (handles Evolution API v1 and v2 message formats) ────────

function extractText(msg: any): string {
  const content = msg?.message || msg;
  if (content?.imageMessage) {
    return content.imageMessage.caption || '[Imagem]';
  }
  if (content?.audioMessage) {
    return '[Áudio]';
  }
  if (content?.documentMessage) {
    return content.documentMessage.caption || content.documentMessage.title || content.documentMessage.fileName || '[Documento]';
  }
  if (content?.videoMessage) {
    return content.videoMessage.caption || '[Vídeo]';
  }
  return (
    content?.conversation ||
    content?.extendedTextMessage?.text ||
    content?.stickerMessage?.url ||
    msg?.body ||
    msg?.text ||
    ''
  );
}

// ─── Chat normalizer ──────────────────────────────────────────────────────────

function normalizeChat(raw: any): WaChat {
  const id: string = raw.remoteJid ?? raw.id?.remote ?? raw.jid ?? raw.id ?? '';
  const name: string =
    raw.name ||
    raw.pushName ||
    raw.verifiedName ||
    raw.id?.user ||
    id.split('@')[0];

  const lastMsgRaw = raw.messages?.[0] ?? raw.lastMessage;
  const lastMessage = lastMsgRaw ? extractText(lastMsgRaw) : '';
  const lastMessageTimestamp: number =
    lastMsgRaw?.messageTimestamp ??
    lastMsgRaw?.timestamp ??
    raw.updatedAt ??
    0;

  const lastMessageFromMe: boolean = 
    lastMsgRaw?.key?.fromMe ?? 
    lastMsgRaw?.fromMe ?? 
    false;

  const remoteJidAlt = lastMsgRaw?.key?.remoteJidAlt ?? lastMsgRaw?.remoteJidAlt ?? raw.remoteJidAlt ?? undefined;

  return {
    id,
    name,
    lastMessage,
    lastMessageTimestamp: typeof lastMessageTimestamp === 'number'
      ? lastMessageTimestamp
      : Math.floor(new Date(lastMessageTimestamp).getTime() / 1000),
    unreadCount: raw.unreadCount ?? 0,
    isGroup: id.includes('@g.us'),
    profilePicUrl: raw.profilePicUrl || undefined,
    lastMessageFromMe,
    remoteJidAlt: (remoteJidAlt && typeof remoteJidAlt === 'string') ? remoteJidAlt : undefined,
  };
}

// ─── Message normalizer ───────────────────────────────────────────────────────

function normalizeMessage(raw: any, apiUrl?: string): WaMessage {
  const content = raw?.message || raw;
  let text = extractText(raw);
  
  let mediaType: WaMessage['mediaType'];
  let mediaUrl: string | undefined;
  let mediaMimeType: string | undefined;

  if (content?.imageMessage) {
    mediaType = 'image';
    mediaUrl = content.imageMessage.url || content.imageMessage.directPath;
    mediaMimeType = content.imageMessage.mimetype || 'image/jpeg';
    if (!text) text = content.imageMessage.caption || '[Imagem]';
  } else if (content?.audioMessage) {
    mediaType = 'audio';
    mediaUrl = content.audioMessage.url || content.audioMessage.directPath;
    mediaMimeType = content.audioMessage.mimetype || 'audio/ogg';
    if (!text) text = '[Áudio]';
  } else if (content?.documentMessage) {
    mediaType = 'document';
    mediaUrl = content.documentMessage.url || content.documentMessage.directPath;
    mediaMimeType = content.documentMessage.mimetype || 'application/pdf';
    const docName = content.documentMessage.title || content.documentMessage.fileName || 'Documento';
    if (!text) text = content.documentMessage.caption || docName;
  } else if (content?.videoMessage) {
    mediaType = 'video';
    mediaUrl = content.videoMessage.url || content.videoMessage.directPath;
    mediaMimeType = content.videoMessage.mimetype || 'video/mp4';
    if (!text) text = content.videoMessage.caption || '[Vídeo]';
  }

  // Resolve relative URLs to absolute by prepending the Evolution API base URL
  if (mediaUrl && !mediaUrl.startsWith('http') && apiUrl) {
    const cleanApiUrl = apiUrl.replace(/\/$/, "");
    const cleanPath = mediaUrl.startsWith('/') ? mediaUrl : `/${mediaUrl}`;
    mediaUrl = `${cleanApiUrl}${cleanPath}`;
  }

  return {
    id: raw.key?.id ?? raw.id ?? String(Math.random()),
    fromMe: raw.key?.fromMe ?? raw.fromMe ?? false,
    text,
    timestamp: raw.messageTimestamp ?? raw.timestamp ?? 0,
    status: raw.status,
    pushName: raw.pushName,
    mediaType,
    mediaUrl,
    mediaMimeType,
  };
}

// ─── Public API functions ─────────────────────────────────────────────────────

export async function getConnectionState(
  apiUrl: string, apiKey: string, instance: string
): Promise<string> {
  const data = await proxyGet(apiUrl, apiKey, `/instance/connectionState/${instance}`);
  return data?.instance?.state ?? data?.state ?? 'disconnected';
}

export async function fetchChats(
  apiUrl: string, apiKey: string, instance: string, limit = 50
): Promise<WaChat[]> {
  // Evolution v2: POST /chat/findChats/{instance}
  try {
    const data = await proxyPost(apiUrl, apiKey, `/chat/findChats/${instance}`, {
      where: {},
      limit,
    });
    const list: any[] = Array.isArray(data) ? data : (data?.chats ?? data?.data ?? []);
    return list.map(normalizeChat);
  } catch {
    // Try v1 fallback: GET /chat/findChats/{instance}
    const data = await proxyGet(apiUrl, apiKey, `/chat/findChats/${instance}`);
    const list: any[] = Array.isArray(data) ? data : (data?.chats ?? []);
    return list.map(normalizeChat);
  }
}

export async function fetchMessages(
  apiUrl: string, apiKey: string, instance: string, remoteJid: string, limit = 30
): Promise<WaMessage[]> {
  // Garante que o remoteJid tenha o código de país 55 se for número brasileiro sem DDI
  let cleanJid = remoteJid;
  if (remoteJid && !remoteJid.includes('@g.us')) {
    const parts = remoteJid.split('@');
    const num = parts[0].replace(/\D/g, '');
    if (num.length === 10 || num.length === 11) {
      cleanJid = `55${num}@s.whatsapp.net`;
    }
  }

  // 1. Tentar POST /chat/findMessages/{instance} (V2 Padrão)
  try {
    const data = await proxyPost(apiUrl, apiKey, `/chat/findMessages/${instance}`, {
      where: { key: { remoteJid: cleanJid } },
      limit,
    });
    const list: any[] = Array.isArray(data) ? data : (data?.messages?.records ?? data?.messages ?? data?.data?.records ?? data?.data ?? []);
    return list.map(raw => normalizeMessage(raw, apiUrl)).sort((a, b) => a.timestamp - b.timestamp);
  } catch {
    // 2. Tentar POST /messages/findMessages/{instance} (V2 Plural Alternativo)
    try {
      const data = await proxyPost(apiUrl, apiKey, `/messages/findMessages/${instance}`, {
        where: { key: { remoteJid: cleanJid } },
        limit,
      });
      const list: any[] = Array.isArray(data) ? data : (data?.messages?.records ?? data?.messages ?? data?.data?.records ?? data?.data ?? []);
      return list.map(raw => normalizeMessage(raw, apiUrl)).sort((a, b) => a.timestamp - b.timestamp);
    } catch {
      // 3. Tentar GET /chat/findMessages/{instance} (v1/v2 GET Fallback)
      try {
        const data = await proxyGet(
          apiUrl, apiKey,
          `/chat/findMessages/${instance}?where[key][remoteJid]=${encodeURIComponent(cleanJid)}&limit=${limit}`
        );
        const list: any[] = Array.isArray(data) ? data : (data?.messages?.records ?? data?.messages ?? []);
        return list.map(raw => normalizeMessage(raw, apiUrl)).sort((a, b) => a.timestamp - b.timestamp);
      } catch {
        // 4. Tentar GET /messages/findMessages/{instance} (v1/v2 Plural GET Fallback)
        try {
          const data = await proxyGet(
            apiUrl, apiKey,
            `/messages/findMessages/${instance}?where[key][remoteJid]=${encodeURIComponent(cleanJid)}&limit=${limit}`
          );
          const list: any[] = Array.isArray(data) ? data : (data?.messages?.records ?? data?.messages ?? []);
          return list.map(raw => normalizeMessage(raw, apiUrl)).sort((a, b) => a.timestamp - b.timestamp);
        } catch {
          // 5. Tentar POST /message/findMessages/{instance} (Singular Fallback)
          try {
            const data = await proxyPost(apiUrl, apiKey, `/message/findMessages/${instance}`, {
              where: { key: { remoteJid: cleanJid } },
              limit,
            });
            const list: any[] = Array.isArray(data) ? data : (data?.messages?.records ?? data?.messages ?? data?.data?.records ?? data?.data ?? []);
            return list.map(raw => normalizeMessage(raw, apiUrl)).sort((a, b) => a.timestamp - b.timestamp);
          } catch {
            return [];
          }
        }
      }
    }
  }
}

export async function sendTextMessage(
  apiUrl: string, apiKey: string, instance: string, remoteJid: string, text: string
): Promise<WaMessage> {
  let number = remoteJid.includes('@') ? remoteJid.split('@')[0] : remoteJid;
  
  // Se o número de destino possuir letras (como JIDs de teste alfanuméricos "cmqu..."),
  // enviamos apenas o ID limpo sem o sufixo '@s.whatsapp.net'
  const hasLetters = /[a-zA-Z]/.test(number);
  if (!hasLetters) {
    number = number.replace(/\D/g, '');
    if (number.length === 10 || number.length === 11) {
      number = `55${number}`;
    }
  }

  let data: any;
  try {
    // Evolution v2 format: text directly at root
    data = await proxyPost(apiUrl, apiKey, `/message/sendText/${instance}`, {
      number,
      text,
    });
  } catch (err: any) {
    // Fallback to Evolution v1 format: text inside textMessage object
    console.warn('[evolutionApi] sendText v2 failed, trying v1 fallback:', err.message);
    data = await proxyPost(apiUrl, apiKey, `/message/sendText/${instance}`, {
      number,
      textMessage: { text },
    });
  }

  // Build a WaMessage from the response
  return {
    id: data?.key?.id ?? data?.id ?? `out-${Date.now()}`,
    fromMe: true,
    text,
    timestamp: data?.messageTimestamp ?? Math.floor(Date.now() / 1000),
    status: 'PENDING',
  };
}

export async function sendMediaMessage(
  apiUrl: string,
  apiKey: string,
  instance: string,
  remoteJid: string,
  mediaBase64: string, // Base64 puro
  mediaType: 'image' | 'audio' | 'video' | 'document',
  mimeType: string,
  fileName: string,
  caption?: string
): Promise<WaMessage> {
  // Limpa o JID de envio usando a mesma lógica que implementamos no sendTextMessage
  let number = remoteJid.includes('@') ? remoteJid.split('@')[0] : remoteJid;
  const hasLetters = /[a-zA-Z]/.test(number);
  if (!hasLetters) {
    number = number.replace(/\D/g, '');
    if (number.length === 10 || number.length === 11) {
      number = `55${number}`;
    }
  }

  // Faz a requisição de envio de mídia
  const data = await proxyPost(apiUrl, apiKey, `/message/sendMedia/${instance}`, {
    number,
    mediatype: mediaType,
    mimetype: mimeType,
    media: mediaBase64,
    fileName,
    caption: caption || '',
  });

  return {
    id: data?.key?.id ?? data?.id ?? `out-media-${Date.now()}`,
    fromMe: true,
    text: caption || fileName || `[${mediaType}]`,
    timestamp: data?.messageTimestamp ?? Math.floor(Date.now() / 1000),
    status: 'PENDING',
    mediaType,
    mediaMimeType: mimeType,
  };
}

export async function fetchContacts(
  apiUrl: string, apiKey: string, instance: string, limit = 100
): Promise<{ id: string; name: string; phone: string }[]> {
  try {
    const data = await proxyPost(apiUrl, apiKey, `/chat/findContacts/${instance}`, {
      where: {},
      limit,
    });
    const list: any[] = Array.isArray(data) ? data : (data?.contacts ?? data?.data ?? []);
    return list.map(c => ({
      id: c.id ?? c.remoteJid ?? '',
      name: c.name ?? c.pushName ?? c.verifiedName ?? c.id?.split('@')[0] ?? '',
      phone: (c.id ?? '').split('@')[0],
    }));
  } catch {
    const data = await proxyGet(apiUrl, apiKey, `/chat/findContacts/${instance}`);
    const list: any[] = Array.isArray(data) ? data : [];
    return list.map(c => ({
      id: c.id ?? '',
      name: c.name ?? c.pushName ?? '',
      phone: (c.id ?? '').split('@')[0],
    }));
  }
}

/** Format phone number for Evolution API remoteJid */
export function toRemoteJid(phone: string): string {
  if (!phone) return '';
  // If it already has @, return as is
  if (phone.includes('@')) return phone;

  // Remove non-digits
  let digits = phone.replace(/\D/g, '');

  // Se for celular/fixo do Brasil sem DDI (10 ou 11 dígitos), prefixa com 55
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }

  return `${digits}@s.whatsapp.net`;
}

/** Format timestamp to HH:MM */
export function formatTime(timestamp: number): string {
  if (!timestamp) return '';
  const d = new Date(timestamp * 1000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Format timestamp to relative date label */
export function formatDateLabel(timestamp: number): string {
  if (!timestamp) return '';
  const d = new Date(timestamp * 1000);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
