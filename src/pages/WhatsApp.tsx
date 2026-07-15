import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare, Search, Send, MoreVertical, Smile, Paperclip,
  CheckCheck, Phone, Video, Globe, Sparkles, Link as LinkIcon,
  Wifi, WifiOff, QrCode, Settings, RefreshCw, CheckCircle2, AlertCircle,
  Key, Server, Loader2, Eye, EyeOff, Smartphone, Users, Clock,
  HeadphonesIcon, ArrowRight, ArrowLeft, UserCheck, PhoneOff, RotateCcw,
  MessageCircle, Filter, X, Mic, Trash2, Pause, UploadCloud, FileText,
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { cn } from '../lib/utils';
import { useStore } from '../store';
import type { WaChat, WaMessage } from '../store';
import { toast } from 'sonner';
import {
  getConnectionState, fetchChats, fetchMessages, sendTextMessage,
  sendMediaMessage, sendWhatsAppAudio, fetchContacts, toRemoteJid, formatTime, formatDateLabel,
} from '../services/evolutionApi';

type MainTab = 'contatos' | 'fila' | 'atendimento' | 'conexao';

// ─── Avatar helpers ───────────────────────────────────────────────────────────
function Avatar({ name, url, size = 10 }: { name: string; url?: string; size?: number }) {
  const initials = (name || '?').trim().charAt(0).toUpperCase();
  const colors = ['bg-indigo-100 text-indigo-700', 'bg-violet-100 text-violet-700',
    'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700'];
  const color = colors[(name || '').charCodeAt(0) % colors.length];
  const sz = `w-${size} h-${size}`;
  if (url) return <img src={url} alt={name} className={`${sz} rounded-2xl object-cover shrink-0`} />;
  return (
    <div className={`${sz} ${color} rounded-2xl flex items-center justify-center font-black shrink-0 text-sm`}>
      {initials}
    </div>
  );
}

// ─── Chat row ─────────────────────────────────────────────────────────────────
function ChatRow({ chat, isSelected, onClick, badge }: {
  chat: WaChat;
  isSelected?: boolean;
  onClick: () => void;
  badge?: React.ReactNode;
}) {
  const { patients } = useStore();

  const displayName = useMemo(() => {
    const patient = (patients || []).find(p => {
      if (!p.phone) return false;
      const jidNum = toRemoteJid(p.phone);
      return chat.id === jidNum || chat.remoteJidAlt === jidNum;
    });
    return patient ? patient.name : chat.name;
  }, [chat, patients]);

  const profilePic = useMemo(() => {
    const patient = (patients || []).find(p => {
      if (!p.phone) return false;
      const jidNum = toRemoteJid(p.phone);
      return chat.id === jidNum || chat.remoteJidAlt === jidNum;
    });
    return chat.profilePicUrl || patient?.profilePicture;
  }, [chat, patients]);

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3.5 cursor-pointer hover:bg-slate-50 border-b border-slate-50 transition-colors relative',
        isSelected && 'bg-indigo-50/60 after:absolute after:left-0 after:top-0 after:bottom-0 after:w-0.5 after:bg-indigo-600'
      )}
    >
      <Avatar name={displayName} url={profilePic} size={11} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-1">
          <h4 className="font-bold text-slate-900 text-sm truncate">{displayName}</h4>
          {chat.lastMessageTimestamp > 0 && (
            <span className="text-[10px] text-slate-400 shrink-0">{formatTime(chat.lastMessageTimestamp)}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-1">
          <p className="text-xs text-slate-500 truncate mt-0.5">{chat.lastMessage || 'Sem mensagens'}</p>
          {badge}
          {!badge && chat.unreadCount > 0 && (
            <span className="shrink-0 bg-indigo-600 text-white text-[9px] font-bold h-4 min-w-4 px-1 rounded-full flex items-center justify-center">
              {chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
        <Icon className="w-8 h-8 text-slate-300" />
      </div>
      <div>
        <p className="font-black italic text-slate-500 text-base uppercase tracking-wide">{title}</p>
        <p className="text-sm text-slate-400 mt-1 max-w-xs">{subtitle}</p>
      </div>
    </div>
  );
}

// Helper to compress images on the client side before uploading
function compressImage(file: File, maxW = 1200, maxH = 1200, quality = 0.85): Promise<{ base64: string; type: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxW) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          }
          if (height > maxH) {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const base64 = canvas.toDataURL('image/jpeg', quality);
          resolve({
            base64: base64.split(',')[1],
            type: 'image/jpeg'
          });
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Erro ao carregar imagem'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

// ─── Chat window (used in Em Atendimento) ─────────────────────────────────────
function ChatWindow({ chat }: { chat: WaChat }) {
  const {
    evolutionApiUrl, evolutionApiKey, evolutionInstance,
    whatsappMessages, upsertWhatsappMessages, addOutboundMessage,
    setChatStatus, patients,
  } = useStore();

  const messages: WaMessage[] = whatsappMessages[chat.id] || [];
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inserted, setInserted] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Estados de Drag & Drop e fila de arquivos pendentes
  const [pendingFiles, setPendingFiles] = useState<{
    id: string;
    file: File;
    preview: string;
    mediaType: 'image' | 'audio' | 'video' | 'document';
  }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);

  const addFilesToPending = async (filesList: FileList) => {
    const newPending: typeof pendingFiles = [];
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`O arquivo ${file.name} é muito grande. Limite de 15MB.`);
        continue;
      }

      let mediaType: 'image' | 'audio' | 'video' | 'document' = 'document';
      let previewUrl = '';

      if (file.type.startsWith('image/')) {
        mediaType = 'image';
        previewUrl = URL.createObjectURL(file);
      } else {
        if (file.type.startsWith('audio/')) {
          mediaType = 'audio';
        } else if (file.type.startsWith('video/')) {
          mediaType = 'video';
        }
        previewUrl = '';
      }

      newPending.push({
        id: `file-${Date.now()}-${Math.random()}`,
        file,
        preview: previewUrl,
        mediaType,
      });
    }

    if (newPending.length > 0) {
      setPendingFiles(prev => [...prev, ...newPending]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await addFilesToPending(e.dataTransfer.files);
    }
  };

  const moveFile = (index: number, direction: 'left' | 'right') => {
    const nextIndex = direction === 'left' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= pendingFiles.length) return;

    const newList = [...pendingFiles];
    const temp = newList[index];
    newList[index] = newList[nextIndex];
    newList[nextIndex] = temp;
    setPendingFiles(newList);
  };

  const removePendingFile = (id: string) => {
    const fileToRemove = pendingFiles.find(f => f.id === id);
    if (fileToRemove && fileToRemove.preview.startsWith('blob:')) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    setPendingFiles(prev => prev.filter(f => f.id !== id));
  };

  // Pré-preencher a caixa de digitação se houver texto nos parâmetros de URL
  useEffect(() => {
    const textParam = searchParams.get('text');
    if (textParam) {
      setText(textParam);
      
      // Limpa o parâmetro de texto para evitar repetições
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('text');
      setSearchParams(newParams);
    }
  }, [chat.id, searchParams, setSearchParams]);

  const displayName = useMemo(() => {
    const patient = (patients || []).find(p => {
      if (!p.phone) return false;
      const jidNum = toRemoteJid(p.phone);
      return chat.id === jidNum || chat.remoteJidAlt === jidNum;
    });
    return patient ? patient.name : chat.name;
  }, [chat, patients]);

  const displayPhone = useMemo(() => {
    const patient = (patients || []).find(p => {
      if (!p.phone) return false;
      const jidNum = toRemoteJid(p.phone);
      return chat.id === jidNum || chat.remoteJidAlt === jidNum;
    });
    if (patient && patient.phone) {
      return patient.phone;
    }
    if (chat.remoteJidAlt) {
      const num = chat.remoteJidAlt.split('@')[0];
      return num.startsWith('55') ? num.substring(2) : num;
    }
    const cleanId = chat.id.split('@')[0];
    return cleanId.startsWith('55') ? cleanId.substring(2) : cleanId;
  }, [chat, patients]);

  const profilePic = useMemo(() => {
    const patient = (patients || []).find(p => {
      if (!p.phone) return false;
      const jidNum = toRemoteJid(p.phone);
      return chat.id === jidNum || chat.remoteJidAlt === jidNum;
    });
    return chat.profilePicUrl || patient?.profilePicture;
  }, [chat, patients]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Emoji Picker & Recording states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const clinicalEmojis = [
    '😊', '👍', '🙏', '❤️', '🗓️', '⏰', '🩺', '🦷', '⚕️', '✅', '❌', 
    '👋', '🎉', '🤔', '😅', '💡', '💬', '📍', '🏥', '🤝', '🌟', '👩‍⚕️', '👨‍⚕️'
  ];

  // Timer para gravação de áudio
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const localBlobUrl = URL.createObjectURL(audioBlob);
        
        // Converte para base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Pure = (reader.result as string).split(',')[1];
          await sendRecordedAudio(base64Pure, localBlobUrl, audioBlob.type);
        };
        // Para todas as tracks do microfone
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      toast.error('Não foi possível acessar o microfone. Verifique as permissões.');
      console.error('Audio recorder error:', err);
    }
  };

  const stopRecording = (cancel = false) => {
    if (mediaRecorder && isRecording) {
      if (cancel) {
        mediaRecorder.onstop = () => {
          mediaRecorder.stream.getTracks().forEach(track => track.stop());
        };
      }
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const sendRecordedAudio = async (base64Pure: string, localBlobUrl: string, mimeType: string) => {
    setSending(true);
    let destinationJid = chat.id;
    if (chat.remoteJidAlt) {
      destinationJid = chat.remoteJidAlt;
    } else {
      const hasLetters = /[a-zA-Z]/.test(chat.id.split('@')[0]);
      if (hasLetters && patients && patients.length > 0) {
        const patient = patients.find(p => p.name.toLowerCase().trim() === chat.name.toLowerCase().trim());
        if (patient && patient.phone) {
          destinationJid = toRemoteJid(patient.phone);
        }
      }
    }

    const optimisticId = `opt-audio-${Date.now()}`;
    const optimistic: WaMessage = {
      id: optimisticId,
      fromMe: true,
      text: '[Áudio]',
      timestamp: Math.floor(Date.now() / 1000),
      status: 'PENDING',
      mediaType: 'audio',
      mediaUrl: localBlobUrl,
      mediaMimeType: mimeType,
    };
    addOutboundMessage(chat.id, optimistic);

    try {
      const sent = await sendWhatsAppAudio(
        evolutionApiUrl,
        evolutionApiKey,
        evolutionInstance,
        destinationJid,
        base64Pure
      );
      const resolvedMsg = {
        ...sent,
        mediaUrl: localBlobUrl,
        mediaMimeType: mimeType
      };
      addOutboundMessage(chat.id, resolvedMsg, optimisticId);
      // Removido toast.success para áudio conforme pedido do usuário
    } catch (err: any) {
      toast.error(`Falha ao enviar áudio: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const sendPendingFiles = async () => {
    if (pendingFiles.length === 0) return;
    setSending(true);

    const filesToSend = [...pendingFiles];
    setPendingFiles([]); // Limpa a fila na interface imediatamente

    let destinationJid = chat.id;
    if (chat.remoteJidAlt) {
      destinationJid = chat.remoteJidAlt;
    } else {
      const hasLetters = /[a-zA-Z]/.test(chat.id.split('@')[0]);
      if (hasLetters && patients && patients.length > 0) {
        const patient = patients.find(p => p.name.toLowerCase().trim() === chat.name.toLowerCase().trim());
        if (patient && patient.phone) {
          destinationJid = toRemoteJid(patient.phone);
        }
      }
    }

    for (const pending of filesToSend) {
      const file = pending.file;
      const mediaType = pending.mediaType;

      try {
        let base64Pure = '';
        let fileType = file.type;
        let previewUrl = '';

        if (file.type.startsWith('image/')) {
          try {
            const compressed = await compressImage(file);
            base64Pure = compressed.base64;
            fileType = compressed.type;
            previewUrl = `data:${compressed.type};base64,${compressed.base64}`;
          } catch (err) {
            console.warn('[Image Compress] Fallback to raw image:', err);
            const resData: string = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
              reader.readAsDataURL(file);
            });
            base64Pure = resData.split(',')[1];
            previewUrl = resData;
          }
        } else {
          const resData: string = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            reader.readAsDataURL(file);
          });
          base64Pure = resData.split(',')[1];
          previewUrl = resData;
        }

        if (!base64Pure) continue;

        const optimisticId = `opt-media-${Date.now()}-${Math.random()}`;
        const optimistic: WaMessage = {
          id: optimisticId,
          fromMe: true,
          text: file.name,
          timestamp: Math.floor(Date.now() / 1000),
          status: 'PENDING',
          mediaType,
          mediaUrl: previewUrl,
          mediaMimeType: fileType,
        };
        addOutboundMessage(chat.id, optimistic);

        try {
          const sent = await sendMediaMessage(
            evolutionApiUrl,
            evolutionApiKey,
            evolutionInstance,
            destinationJid,
            base64Pure,
            mediaType,
            fileType,
            file.name
          );
          addOutboundMessage(chat.id, sent, optimisticId);
          // O usuário explicitamente pediu para não exibir toasts de sucesso no envio de fotos e PDFs
        } catch (err: any) {
          toast.error(`Falha ao enviar arquivo ${file.name}: ${err.message}`);
        }
      } catch (err: any) {
        toast.error(`Erro ao processar arquivo ${file.name}: ${err.message}`);
      }
    }

    setSending(false);
  };

  const formatRecordTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleEmojiClick = (emoji: string) => {
    setText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await addFilesToPending(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const loadMessages = useCallback(async () => {
    // evolutionInstance é necessário para a URL. Se não estiver na store, não há como prosseguir.
    if (!evolutionInstance) return;

    const hasMessages = (whatsappMessages[chat.id] || []).length > 0;
    
    // Só ativa o spinner de loading inicial se a tela estiver vazia,
    // permitindo atualizações de polling silenciosas e fluidas em background.
    if (!hasMessages) {
      setLoading(true);
    }

    try {
      const msgs = await fetchMessages(evolutionApiUrl, evolutionApiKey, evolutionInstance, chat.id, 50);
      if (msgs.length > 0) upsertWhatsappMessages(chat.id, msgs);
    } catch (err: any) {
      console.warn('[ChatWindow] Could not load messages:', err.message);
    } finally {
      setLoading(false);
    }
  }, [chat.id, evolutionApiUrl, evolutionApiKey, evolutionInstance, upsertWhatsappMessages, whatsappMessages]);

  // Initial load
  useEffect(() => {
    loadMessages();
  }, [chat.id]);

  // Polling every 8s for new messages
  useEffect(() => {
    const interval = setInterval(() => {
      loadMessages();
    }, 8000);
    pollingRef.current = interval;
    return () => clearInterval(interval);
  }, [chat.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && pendingFiles.length === 0) return;
    if (sending) return;

    // Garante status de atendimento imediatamente
    setChatStatus(chat.id, 'atendimento');

    // 1. Envia a mensagem de texto se houver
    if (trimmed) {
      // Traduz JID alfanumérico para número real
      let destinationJid = chat.id;
      if (chat.remoteJidAlt) {
        destinationJid = chat.remoteJidAlt;
      } else {
        const hasLetters = /[a-zA-Z]/.test(chat.id.split('@')[0]);
        if (hasLetters && patients && patients.length > 0) {
          const patient = patients.find(p => p.name.toLowerCase().trim() === chat.name.toLowerCase().trim());
          if (patient && patient.phone) {
            destinationJid = toRemoteJid(patient.phone);
          }
        }
      }

      // Optimistic update
      const optimisticId = `opt-${Date.now()}`;
      const optimistic: WaMessage = {
        id: optimisticId,
        fromMe: true,
        text: trimmed,
        timestamp: Math.floor(Date.now() / 1000),
        status: 'PENDING',
      };
      addOutboundMessage(chat.id, optimistic);
      setText('');
      setSending(true);

      try {
        const sent = await sendTextMessage(evolutionApiUrl, evolutionApiKey, evolutionInstance, destinationJid, trimmed);
        addOutboundMessage(chat.id, sent, optimisticId);
      } catch (err: any) {
        toast.error(`Falha ao enviar mensagem: ${err.message}`);
      } finally {
        setSending(false);
      }
    }

    // 2. Envia os arquivos da fila se houver
    if (pendingFiles.length > 0) {
      await sendPendingFiles();
    }
  };

  const handleInsertTemplate = () => {
    const tpl = `Olá, ${displayName.split(' ')[0]}! Para agendar sua próxima sessão de forma 100% online, acesse:\n\n🔗 ${window.location.origin}/agendamento-online\n\nQualquer dúvida, estamos à disposição! ✨`;
    setText(tpl);
    setInserted(true);
    setTimeout(() => setInserted(false), 2000);
  };

  const handleFinish = () => {
    setChatStatus(chat.id, 'finalizado');
    setShowFinishModal(true);
  };

  // Group messages by date
  const grouped = useMemo(() => {
    const groups: { label: string; messages: WaMessage[] }[] = [];
    let currentLabel = '';
    messages.forEach(m => {
      const label = formatDateLabel(m.timestamp);
      if (label !== currentLabel) {
        groups.push({ label, messages: [] });
        currentLabel = label;
      }
      groups[groups.length - 1].messages.push(m);
    });
    return groups;
  }, [messages]);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white">
      {/* Header */}
      <div className="p-3 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Avatar name={displayName} url={profilePic} size={10} />
          <div>
            <h3 className="font-black italic text-slate-900 text-sm">{displayName}</h3>
            <p className="text-[10px] text-green-500 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              {displayPhone}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            onClick={handleFinish}
            size="sm"
            variant="outline"
            className="h-8 text-xs font-bold border-red-200 text-red-600 hover:bg-red-50 rounded-xl px-3"
          >
            <PhoneOff className="w-3.5 h-3.5 mr-1.5" />
            Finalizar
          </Button>
          <Button
            onClick={loadMessages}
            variant="ghost" size="icon"
            className="text-slate-400 h-8 w-8"
            title="Atualizar mensagens"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Messages (with Drag and Drop support) */}
      <div 
        className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50/40 relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-indigo-600/10 backdrop-blur-[1px] border-2 border-dashed border-indigo-500 rounded-2xl flex flex-col items-center justify-center gap-2 z-[99] pointer-events-none animate-in fade-in duration-100">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shadow-md">
              <UploadCloud className="w-6 h-6 animate-bounce" />
            </div>
            <p className="text-sm font-bold text-indigo-700 font-sans">Solte suas Fotos ou PDFs aqui para anexar</p>
          </div>
        )}
        {loading && messages.length === 0 && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        )}
        {grouped.map(group => (
          <div key={group.label}>
            <div className="flex justify-center mb-3">
              <span className="bg-white text-slate-400 text-[10px] font-bold px-3 py-1 rounded-full border border-slate-100 shadow-sm">{group.label}</span>
            </div>
            <div className="space-y-2">
              {group.messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex', msg.fromMe ? 'justify-end' : 'justify-start')}
                >
                  <div className={cn(
                    'max-w-[72%] px-4 py-2.5 rounded-2xl shadow-sm text-sm whitespace-pre-wrap leading-relaxed',
                    msg.fromMe
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'
                  )}>
                    {!msg.fromMe && msg.pushName && (
                      <p className="text-[9px] font-black text-indigo-400 mb-1 uppercase">{msg.pushName}</p>
                    )}
                    
                    {/* Exibição de Imagem */}
                    {(msg.mediaType === 'image' || msg.text === '[Imagem]' || msg.text === '[imagem]' || (msg.text && (msg.text.endsWith('.png') || msg.text.endsWith('.jpg') || msg.text.endsWith('.jpeg')))) && (
                      <div className="mt-1 rounded-lg overflow-hidden border border-slate-100 max-w-[280px]">
                        <img 
                          src={msg.mediaUrl && (msg.mediaUrl.startsWith('data:') || msg.mediaUrl.startsWith('blob:')) ? msg.mediaUrl : `/api/whatsapp-media?url=${encodeURIComponent(msg.mediaUrl || 'image')}&key=${encodeURIComponent(evolutionApiKey)}&msgId=${msg.id}&jid=${encodeURIComponent(chat.id)}&instance=${encodeURIComponent(evolutionInstance)}`} 
                          alt="Imagem" 
                          className="w-full h-auto object-cover max-h-60 cursor-pointer" 
                          onClick={() => window.open(msg.mediaUrl && (msg.mediaUrl.startsWith('data:') || msg.mediaUrl.startsWith('blob:')) ? msg.mediaUrl : `/api/whatsapp-media?url=${encodeURIComponent(msg.mediaUrl || 'image')}&key=${encodeURIComponent(evolutionApiKey)}&msgId=${msg.id}&jid=${encodeURIComponent(chat.id)}&instance=${encodeURIComponent(evolutionInstance)}`, '_blank')} 
                        />
                      </div>
                    )}
                    
                    {/* Exibição de Áudio */}
                    {(msg.mediaType === 'audio' || msg.text === '[Áudio]' || msg.text === '[audio]') && (
                      <div className="mt-1 py-1 shrink-0">
                        <audio 
                          src={msg.mediaUrl && (msg.mediaUrl.startsWith('data:') || msg.mediaUrl.startsWith('blob:')) ? msg.mediaUrl : `/api/whatsapp-media?url=${encodeURIComponent(msg.mediaUrl || 'audio')}&key=${encodeURIComponent(evolutionApiKey)}&msgId=${msg.id}&jid=${encodeURIComponent(chat.id)}&instance=${encodeURIComponent(evolutionInstance)}`} 
                          controls 
                          className="max-w-full rounded-lg" 
                          style={{ maxHeight: '40px' }} 
                        />
                      </div>
                    )}
                    
                    {/* Exibição de Documento / PDF */}
                    {(msg.mediaType === 'document' || msg.text === '[Documento]' || msg.text === '[documento]' || (msg.text && msg.text.endsWith('.pdf'))) && (
                      <div className="mt-1 flex items-center gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-100 max-w-[280px] text-slate-800">
                        <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                          <Paperclip className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{msg.text && !msg.text.startsWith('[') ? msg.text : 'Documento'}</p>
                          <a
                            href={msg.mediaUrl && (msg.mediaUrl.startsWith('data:') || msg.mediaUrl.startsWith('blob:')) ? msg.mediaUrl : `/api/whatsapp-media?url=${encodeURIComponent(msg.mediaUrl || 'document')}&key=${encodeURIComponent(evolutionApiKey)}&msgId=${msg.id}&jid=${encodeURIComponent(chat.id)}&instance=${encodeURIComponent(evolutionInstance)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-indigo-600 font-bold hover:underline mt-1 block"
                          >
                            Visualizar / Baixar
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {/* Exibição de Texto Livre (apenas se não for mídia tratada acima) */}
                    {msg.mediaType !== 'audio' && msg.text !== '[Áudio]' && msg.text !== '[audio]' && 
                     msg.mediaType !== 'document' && msg.text !== '[Documento]' && msg.text !== '[documento]' && (!msg.text || !msg.text.endsWith('.pdf')) &&
                     msg.mediaType !== 'image' && msg.text !== '[Imagem]' && msg.text !== '[imagem]' && (!msg.text || (!msg.text.endsWith('.png') && !msg.text.endsWith('.jpg') && !msg.text.endsWith('.jpeg'))) && (
                      <p className="text-sm">{msg.text || <span className="italic opacity-60">[mensagem de mídia]</span>}</p>
                    )}
                    
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className={cn('text-[9px] font-mono', msg.fromMe ? 'text-indigo-200' : 'text-slate-400')}>
                        {formatTime(msg.timestamp)}
                      </span>
                      {msg.fromMe && (
                        <CheckCheck className={cn(
                          'w-3 h-3',
                          msg.status === 'READ' ? 'text-blue-300' : 'text-indigo-300'
                        )} />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      <div className="px-4 py-2 bg-indigo-50/70 border-t border-indigo-100/40 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-indigo-800 font-black uppercase tracking-wider text-[10px] italic">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Assistente
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleInsertTemplate}
            size="sm"
            variant="outline"
            className="h-8 text-xs font-bold border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl px-3"
          >
            {inserted ? <CheckCheck className="w-3.5 h-3.5 mr-1" /> : <Globe className="w-3.5 h-3.5 mr-1" />}
            Inserir link de agendamento
          </Button>
        </div>
      </div>

      {/* File Previews Bar */}
      {pendingFiles.length > 0 && (
        <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex flex-wrap gap-3 shrink-0">
          {pendingFiles.map((pf, idx) => (
            <div key={pf.id} className="relative w-28 h-28 bg-white border border-slate-200/80 rounded-xl p-2 flex flex-col justify-between shadow-sm group">
              {pf.mediaType === 'image' ? (
                <img src={pf.preview} alt="Preview" className="w-full h-16 object-cover rounded-lg" />
              ) : (
                <div className="w-full h-16 bg-slate-50 text-slate-400 rounded-lg flex flex-col items-center justify-center gap-1">
                  <FileText className="w-6 h-6 text-indigo-500" />
                  <span className="text-[9px] text-slate-500 px-1 truncate w-full text-center font-bold">{pf.file.name}</span>
                </div>
              )}
              
              {/* Controls (Move left, Move right, Remove) */}
              <div className="flex items-center justify-between gap-1 mt-1 bg-slate-50/85 px-1 py-0.5 rounded-lg border border-slate-100">
                <div className="flex gap-0.5">
                  <button 
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveFile(idx, 'left')}
                    className="p-0.5 hover:bg-slate-200/60 rounded text-slate-500 disabled:opacity-30 cursor-pointer"
                    title="Mover para esquerda"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    type="button"
                    disabled={idx === pendingFiles.length - 1}
                    onClick={() => moveFile(idx, 'right')}
                    className="p-0.5 hover:bg-slate-200/60 rounded text-slate-500 disabled:opacity-30 cursor-pointer"
                    title="Mover para direita"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <button 
                  type="button"
                  onClick={() => removePendingFile(pf.id)}
                  className="p-0.5 hover:bg-red-50 rounded text-red-500 cursor-pointer"
                  title="Remover arquivo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 bg-white border-t border-slate-100 flex items-end gap-2 shrink-0 relative">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileChange}
          accept="image/*,application/pdf,audio/*,video/*"
          multiple
        />

        {/* Emoji Picker Popover */}
        {showEmojiPicker && (
          <div className="absolute bottom-16 left-3 bg-white border border-slate-150 p-3 rounded-2xl shadow-2xl flex flex-wrap gap-2 w-64 z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-155">
            {clinicalEmojis.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                className="w-7 h-7 text-lg hover:bg-slate-50 rounded flex items-center justify-center transition-colors cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {isRecording ? (
          /* Recording Panel */
          <div className="flex-grow flex items-center justify-between bg-red-50/70 border border-red-100 px-4 py-2.5 rounded-xl animate-in zoom-in-95 duration-100">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              <span className="text-xs font-bold text-red-600 italic font-mono uppercase tracking-wider">Gravando Voz: {formatRecordTime(recordingTime)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                onClick={() => stopRecording(true)} 
                variant="ghost" 
                size="icon" 
                className="text-red-500 hover:bg-red-100/50 hover:text-red-700 h-8 w-8 rounded-lg"
                title="Descartar Gravação"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button 
                onClick={() => stopRecording(false)} 
                className="bg-red-600 hover:bg-red-700 text-white font-bold h-8 px-3 rounded-lg text-[10px] uppercase tracking-wider italic flex items-center gap-1 shadow active:scale-95 transition-all"
                title="Enviar Áudio"
              >
                <Send className="w-3.5 h-3.5" /> Enviar
              </Button>
            </div>
          </div>
        ) : (
          /* Normal Inputs */
          <>
            <div className="relative">
              <Button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                variant="ghost" 
                size="icon" 
                className={cn("text-slate-400 h-9 w-9 shrink-0 rounded-xl", showEmojiPicker && "bg-slate-50 text-indigo-600")}
              >
                <Smile className="w-5 h-5" />
              </Button>
            </div>

            <Button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={sending}
              variant="ghost" 
              size="icon" 
              className="text-slate-400 h-9 w-9 shrink-0 rounded-xl"
              title="Anexar Foto ou Arquivo"
            >
              <Paperclip className="w-5 h-5" />
            </Button>

            <div className="flex-grow relative">
              <textarea
                rows={1}
                placeholder="Digite sua mensagem..."
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                className="w-full resize-none border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all max-h-32 font-sans"
              />
            </div>

            {text.trim() ? (
              <Button
                onClick={handleSend}
                disabled={sending}
                size="icon"
                className="h-9 w-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shrink-0 active:scale-95 transition-all"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
              </Button>
            ) : (
              <Button
                onClick={startRecording}
                disabled={sending}
                size="icon"
                variant="outline"
                className="h-9 w-9 border-indigo-200 text-indigo-650 hover:bg-indigo-50 hover:border-indigo-350 rounded-xl shadow-sm shrink-0 active:scale-95 transition-all animate-pulse"
                title="Gravar Áudio de Voz"
              >
                <Mic className="w-4 h-4 text-indigo-600" />
              </Button>
            )}
          </>
        )}
      </div>

      {/* Modal de Finalização de Atendimento */}
      <AnimatePresence>
        {showFinishModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center z-[9999] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150"
            >
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-slate-900 italic uppercase tracking-wider mb-2">Atendimento Encerrado</h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                O atendimento com o paciente foi encerrado com sucesso e removido da lista ativa.
              </p>
              <Button 
                onClick={() => setShowFinishModal(false)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-xl shadow-lg shadow-emerald-600/10 active:scale-95 transition-all"
              >
                Entendido
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tab: Contatos ─────────────────────────────────────────────────────────────
function ContactsTab({ onStartChat }: { onStartChat: (chat: WaChat) => void }) {
  const { 
    whatsappChats, setWhatsappChats, setChatStatus, patients 
  } = useStore();
  const [search, setSearch] = useState('');

  // Mapeia os pacientes cadastrados para o formato de contatos do WhatsApp
  const patientContacts = useMemo(() => {
    return (patients || [])
      .filter(p => p.phone && p.phone.trim())
      .map(p => {
        const jidNum = toRemoteJid(p.phone);
        // Tenta encontrar por JID numérico, JID alternativo ou pelo nome exato do paciente
        const chat = whatsappChats.find(ch => 
          ch.id === jidNum || 
          ch.remoteJidAlt === jidNum ||
          ch.name.toLowerCase().trim() === p.name.toLowerCase().trim()
        );
        const activeJid = chat ? chat.id : jidNum;
        return {
          id: activeJid,
          name: p.name,
          phone: p.phone,
          isPatient: true,
          patientStatus: p.status,
          profilePicUrl: chat?.profilePicUrl || p.profilePicture,
        };
      });
  }, [patients, whatsappChats]);

  // Apenas pacientes cadastrados na clínica, ordenados alfabeticamente
  const filtered = useMemo(() => {
    const list = [...patientContacts].sort((a, b) => a.name.localeCompare(b.name));
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.phone.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
    );
  }, [patientContacts, search]);

  const handleStart = (c: { id: string; name: string; phone: string }) => {
    // Busca ou cria WaChat para a store
    let chat = whatsappChats.find(ch => ch.id === c.id);
    if (!chat) {
      chat = { 
        id: c.id, 
        name: c.name, 
        lastMessage: '', 
        lastMessageTimestamp: Math.floor(Date.now() / 1000), 
        unreadCount: 0, 
        isGroup: false 
      };
      setWhatsappChats([chat, ...whatsappChats]);
    }
    setChatStatus(c.id, 'atendimento');
    onStartChat(chat);
    toast.success(`Conversa com ${c.name} iniciada em "Em Atendimento"`);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="p-4 border-b border-slate-100 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black italic text-slate-800 uppercase tracking-wide text-sm">
              Contatos ({filtered.length})
            </h3>
            <p className="text-xs text-slate-400">Apenas pacientes cadastrados na clínica são exibidos</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="pl-10 h-10 bg-slate-50 border-transparent rounded-xl"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <EmptyState 
            icon={Users} 
            title="Nenhum contato" 
            subtitle="Nenhum paciente cadastrado encontrado para o termo buscado." 
          />
        ) : (
          filtered.map(c => (
            <div
              key={c.id}
              className="flex items-center gap-3 p-3.5 hover:bg-slate-50 border-b border-slate-50 transition-colors bg-indigo-50/10 hover:bg-indigo-50/20"
            >
              <Avatar name={c.name} url={c.profilePicUrl} size={10} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900 text-sm truncate">{c.name}</p>
                  <Badge 
                    variant="secondary" 
                    className="bg-indigo-100 text-indigo-700 border-indigo-200 font-black uppercase text-[9px] tracking-wide py-0.5 px-1.5 rounded-lg shrink-0"
                  >
                    Paciente
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">{c.phone}</p>
              </div>
              <Button
                onClick={() => handleStart(c)}
                size="sm"
                variant="outline"
                className="h-8 text-xs font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl px-3 shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                Conversar
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FilaTab({ onAttend }: { onAttend: (chat: WaChat) => void }) {
  const { whatsappChats, chatStatuses, setChatStatus, setMultipleChatStatuses } = useStore();
  const [search, setSearch] = useState('');

  // Chats in queue = status 'fila' OR (not in attendance/finished AND (unread messages OR lastMessage from patient))
  const queueChats = useMemo(() => {
    return whatsappChats.filter(c => {
      const st = chatStatuses[c.id];
      if (st === 'atendimento' || st === 'finalizado') return false;
      const hasIncoming = c.unreadCount > 0 || (c.lastMessage && !c.lastMessageFromMe);
      return st === 'fila' || hasIncoming;
    });
  }, [whatsappChats, chatStatuses]);

  const filtered = useMemo(() => {
    if (!search.trim()) return queueChats;
    const q = search.toLowerCase();
    return queueChats.filter(c => c.name.toLowerCase().includes(q));
  }, [queueChats, search]);

  const handleAttend = (chat: WaChat) => {
    setChatStatus(chat.id, 'atendimento');
    onAttend(chat);
  };

  const handleRemove = (chatId: string) => {
    setChatStatus(chatId, 'finalizado');
  };

  const handleClearAll = () => {
    const ids = filtered.map(c => c.id);
    if (ids.length === 0) return;
    setMultipleChatStatuses(ids, 'finalizado');
    toast.success('Fila de atendimento limpa com sucesso!');
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="p-4 border-b border-slate-100 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black italic text-slate-800 uppercase tracking-wide text-sm">Em Fila</h3>
            <p className="text-xs text-slate-400">{filtered.length} contato{filtered.length !== 1 ? 's' : ''} aguardando</p>
          </div>
          {filtered.length > 0 && (
            <Button
              onClick={handleClearAll}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-bold border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl px-3 flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
              title="Limpar todos os contatos da fila"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar Todos
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar na fila..."
            className="pl-10 h-10 bg-slate-50 border-transparent rounded-xl"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <EmptyState icon={Clock} title="Fila vazia" subtitle="Nenhuma conversa aguardando atendimento no momento." />
        ) : (
          filtered.map(chat => (
            <div key={chat.id} className="flex items-center gap-3 p-3.5 hover:bg-amber-50/40 border-b border-slate-50 transition-colors">
              <Avatar name={chat.name} url={chat.profilePicUrl} size={11} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <p className="font-bold text-slate-900 text-sm truncate">{chat.name}</p>
                  {chat.lastMessageTimestamp > 0 && (
                    <span className="text-[10px] text-slate-400 shrink-0">{formatTime(chat.lastMessageTimestamp)}</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">{chat.lastMessage || 'Sem mensagens'}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  onClick={() => handleRemove(chat.id)}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                  title="Remover da fila"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
                <Button
                  onClick={() => handleAttend(chat)}
                  size="sm"
                  className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3"
                >
                  <ArrowRight className="w-3.5 h-3.5 mr-1" />
                  Atender
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Tab: Em Atendimento ──────────────────────────────────────────────────────
function AtendimentoTab({ initialChat }: { initialChat: WaChat | null }) {
  const { whatsappChats, chatStatuses } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(initialChat?.id ?? null);
  const [search, setSearch] = useState('');

  const atendimentoChats = useMemo(() =>
    whatsappChats.filter(c => chatStatuses[c.id] === 'atendimento'),
    [whatsappChats, chatStatuses]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return atendimentoChats;
    const q = search.toLowerCase();
    return atendimentoChats.filter(c => c.name.toLowerCase().includes(q));
  }, [atendimentoChats, search]);

  // Sync initial chat from parent
  useEffect(() => {
    if (initialChat) setSelectedId(initialChat.id);
  }, [initialChat]);

  const selectedChat = useMemo(() => {
    const found = whatsappChats.find(c => c.id === selectedId);
    if (!found) return null;
    if (chatStatuses[found.id] !== 'atendimento') return null;
    return found;
  }, [whatsappChats, selectedId, chatStatuses]);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Chat list sidebar */}
      <div className="w-72 border-r border-slate-100 flex flex-col shrink-0 bg-white">
        <div className="p-3 border-b border-slate-100 space-y-2 shrink-0">
          <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Em Atendimento ({filtered.length})</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="pl-9 h-9 text-sm bg-slate-50 border-transparent rounded-xl"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              Nenhuma conversa em atendimento
            </div>
          ) : (
            filtered.map(chat => (
              <ChatRow
                key={chat.id}
                chat={chat}
                isSelected={chat.id === selectedId}
                onClick={() => setSelectedId(chat.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Chat window */}
      {selectedChat ? (
        <ChatWindow chat={selectedChat} />
      ) : (
        <EmptyState
          icon={HeadphonesIcon}
          title="Selecione uma conversa"
          subtitle="Escolha um atendimento na lista ao lado para ver as mensagens."
        />
      )}
    </div>
  );
}

// ─── Tab: Conexão WhatsApp ─────────────────────────────────────────────────────
type ConnStatus = 'idle' | 'loading_qr' | 'qr_ready' | 'polling' | 'connected' | 'error';

function ConnectionTab() {
  const { evolutionApiUrl, evolutionApiKey, evolutionInstance, whatsappConnected, setEvolutionConfig, setWhatsappConnected } = useStore();
  const [url, setUrl] = useState(evolutionApiUrl);
  const [apiKey, setApiKey] = useState(evolutionApiKey);
  const [instance, setInstance] = useState(evolutionInstance);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<ConnStatus>(whatsappConnected ? 'connected' : 'idle');
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [qrExpiry, setQrExpiry] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAll = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (qrTimerRef.current) { clearInterval(qrTimerRef.current); qrTimerRef.current = null; }
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  const startPolling = useCallback((u: string, k: string, inst: string) => {
    pollingRef.current = setInterval(async () => {
      try {
        const state = await getConnectionState(u, k, inst);
        if (state === 'open') {
          stopAll();
          setStatus('connected');
          setWhatsappConnected(true);
          setQrBase64(null);
          toast.success('WhatsApp conectado com sucesso! ✅');
        }
      } catch (_) {}
    }, 3000);
  }, [stopAll, setWhatsappConnected]);

  const fetchQr = useCallback(async (u: string, k: string, inst: string) => {
    setStatus('loading_qr');
    setErrorMsg('');
    setQrBase64(null);
    stopAll();
    try {
      const res = await fetch(`/api/whatsapp/instance/connect/${inst}`, {
        headers: { 'x-evo-url': u, 'x-evo-key': k },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const qr: string | null = data?.qrcode?.base64 ?? data?.base64 ?? data?.qr ?? null;
      if (!qr) {
        const state = await getConnectionState(u, k, inst);
        if (state === 'open') { setStatus('connected'); setWhatsappConnected(true); toast.success('Já conectado! ✅'); return; }
        throw new Error('QR Code não retornado. Verifique se a instância existe.');
      }
      const qrSrc = qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`;
      setQrBase64(qrSrc);
      setStatus('polling');
      setQrExpiry(45);
      qrTimerRef.current = setInterval(() => {
        setQrExpiry(p => { if (p <= 1) { clearInterval(qrTimerRef.current!); qrTimerRef.current = null; return 0; } return p - 1; });
      }, 1000);
      startPolling(u, k, inst);
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e.message || 'Falha ao conectar.');
    }
  }, [stopAll, startPolling, setWhatsappConnected]);

  const handleConnect = async () => {
    if (!url.trim() || !apiKey.trim() || !instance.trim()) { toast.error('Preencha todos os campos.'); return; }
    setEvolutionConfig(url, apiKey, instance);
    await fetchQr(url.trim(), apiKey.trim(), instance.trim());
  };

  const handleDisconnect = () => {
    stopAll(); setStatus('idle'); setQrBase64(null); setWhatsappConnected(false);
    toast.info('Desconectado localmente.');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
      {/* Status Banner */}
      <div className={cn('rounded-2xl p-4 flex items-center gap-4 border-2 transition-all',
        status === 'connected' ? 'bg-emerald-50 border-emerald-200' :
        status === 'polling' ? 'bg-blue-50 border-blue-200' :
        status === 'error' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200')}>
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
          status === 'connected' ? 'bg-emerald-100' : status === 'polling' ? 'bg-blue-100' :
          status === 'loading_qr' ? 'bg-indigo-100' : status === 'error' ? 'bg-red-100' : 'bg-slate-100')}>
          {status === 'connected' && <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
          {status === 'polling' && <QrCode className="w-6 h-6 text-blue-600" />}
          {status === 'loading_qr' && <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />}
          {status === 'error' && <AlertCircle className="w-6 h-6 text-red-600" />}
          {status === 'idle' && <WifiOff className="w-6 h-6 text-slate-400" />}
        </div>
        <div className="flex-1">
          <p className={cn('font-black text-sm uppercase tracking-wider italic',
            status === 'connected' ? 'text-emerald-700' : status === 'polling' ? 'text-blue-700' :
            status === 'error' ? 'text-red-700' : 'text-slate-500')}>
            {status === 'connected' && '✅ WhatsApp Conectado'}
            {status === 'polling' && '📱 Escaneie o QR Code'}
            {status === 'loading_qr' && 'Gerando QR Code...'}
            {status === 'error' && 'Falha na conexão'}
            {status === 'idle' && 'WhatsApp Desconectado'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {status === 'connected' && `Instância: ${evolutionInstance || instance}`}
            {status === 'polling' && `QR Code expira em ${qrExpiry}s`}
            {status === 'error' && errorMsg}
            {status === 'idle' && 'Configure as credenciais abaixo'}
          </p>
        </div>
        {status === 'connected' && (
          <Button onClick={handleDisconnect} variant="outline" size="sm" className="text-xs font-bold border-red-200 text-red-600 hover:bg-red-50 rounded-xl">
            <WifiOff className="w-3.5 h-3.5 mr-1.5" />Desconectar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config form */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-3 pb-2 border-b border-slate-50">
            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center"><Settings className="w-4 h-4 text-indigo-600" /></div>
            <div>
              <h3 className="font-black italic text-slate-900 text-sm uppercase tracking-wide">Configuração da API</h3>
              <p className="text-xs text-slate-400">Evolution API — credenciais de acesso</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Server className="w-3 h-3" />URL da Evolution API</label>
            <Input type="url" placeholder="https://sua-evolution-api.com" value={url} onChange={e => setUrl(e.target.value)} className="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-sm" />
            <p className="text-[10px] text-slate-400">Sem barra no final</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Key className="w-3 h-3" />API Key</label>
            <div className="relative">
              <Input type={showKey ? 'text' : 'password'} placeholder="sua-api-key" value={apiKey} onChange={e => setApiKey(e.target.value)} className="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-sm pr-10" />
              <button type="button" onClick={() => setShowKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Smartphone className="w-3 h-3" />Nome da Instância</label>
            <Input placeholder="minha-clinica-zap" value={instance} onChange={e => setInstance(e.target.value)} className="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-sm" />
          </div>
          <Button onClick={handleConnect} disabled={!url.trim() || !apiKey.trim() || !instance.trim() || status === 'loading_qr'}
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black italic uppercase tracking-wider rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {status === 'loading_qr' ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando QR...</> : <><QrCode className="w-4 h-4" />{status === 'connected' ? 'Reconectar' : 'Salvar e Gerar QR Code'}</>}
          </Button>
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <div className="flex items-center gap-3 pb-2 border-b border-slate-50 mb-5">
            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center"><QrCode className="w-4 h-4 text-green-600" /></div>
            <div>
              <h3 className="font-black italic text-slate-900 text-sm uppercase tracking-wide">QR Code de Conexão</h3>
              <p className="text-xs text-slate-400">Escaneie com o WhatsApp do celular</p>
            </div>
            {status === 'polling' && <button onClick={() => fetchQr(url, apiKey, instance)} className="ml-auto p-2 text-slate-400 hover:text-indigo-600 rounded-xl"><RefreshCw className="w-4 h-4" /></button>}
          </div>
          <div className="flex-1 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {status === 'connected' && (
                <motion.div key="ok" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-3">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="w-10 h-10 text-emerald-500" /></div>
                  <p className="font-black text-emerald-700 text-lg italic uppercase">Conectado!</p>
                  <p className="text-sm text-slate-500">Instância <span className="font-bold">"{evolutionInstance || instance}"</span></p>
                </motion.div>
              )}
              {status === 'polling' && qrBase64 && (
                <motion.div key="qr" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-3 w-full">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden max-w-[200px]">
                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${(qrExpiry / 45) * 100}%` }} />
                    </div>
                    <span className={cn('text-xs font-bold tabular-nums', qrExpiry <= 10 ? 'text-red-500' : 'text-slate-400')}>{qrExpiry}s</span>
                  </div>
                  <div className="border-4 border-slate-100 rounded-2xl p-2 inline-block bg-white shadow-inner">
                    <img src={qrBase64} alt="QR Code" className="w-44 h-44 object-contain" />
                  </div>
                  <div className="text-xs text-slate-500 text-left max-w-[220px] mx-auto space-y-0.5">
                    <p className="font-bold">Como escanear:</p>
                    <p>1. Abra o WhatsApp no celular</p>
                    <p>2. ⋮ → Aparelhos conectados</p>
                    <p>3. Conectar um aparelho</p>
                  </div>
                </motion.div>
              )}
              {status === 'loading_qr' && (
                <motion.div key="spin" className="text-center space-y-3">
                  <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
                  <p className="text-sm text-slate-500 font-bold">Conectando...</p>
                </motion.div>
              )}
              {(status === 'error' || status === 'idle') && (
                <motion.div key="idle" className="text-center space-y-3">
                  <div className="w-16 h-16 bg-slate-50 border-2 border-dashed border-slate-200 rounded-full flex items-center justify-center mx-auto">
                    <QrCode className="w-8 h-8 text-slate-300" />
                  </div>
                  {status === 'error'
                    ? <p className="text-sm text-red-500 font-bold max-w-xs">{errorMsg}</p>
                    : <p className="text-sm text-slate-400">Preencha as configurações e clique em <span className="text-indigo-500 font-bold">Gerar QR Code</span></p>
                  }
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function WhatsApp() {
  const {
    whatsappConnected, evolutionApiUrl, evolutionApiKey, evolutionInstance,
    whatsappChats, chatStatuses, setWhatsappChats, setEvolutionConfig,
    syncWhatsappStateWithPatients, patients
  } = useStore();

  const [activeTab, setActiveTab] = useState<MainTab>('atendimento');
  const [pendingAtendimento, setPendingAtendimento] = useState<WaChat | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const phoneParam = searchParams.get('phone');

  useEffect(() => {
    if (phoneParam) {
      const cleanPhone = phoneParam.replace(/\D/g, '');
      if (!cleanPhone) return;
      
      // Procura a conversa nos chats locais
      let foundChat = whatsappChats.find(c => c.id.includes(cleanPhone) || (c.remoteJidAlt && c.remoteJidAlt.includes(cleanPhone)));
      
      if (!foundChat) {
        // Se a conversa não existir no state local, nós criamos um chat mockado
        const newChatJid = `55${cleanPhone}@s.whatsapp.net`;
        const patientName = patients.find(p => p.phone && p.phone.replace(/\D/g, '').includes(cleanPhone))?.name || `Paciente (${cleanPhone})`;
        
        const mockChat: WaChat = {
          id: newChatJid,
          name: patientName,
          unreadCount: 0,
          lastMessage: '',
          lastMessageTimestamp: Math.floor(Date.now() / 1000),
          lastMessageFromMe: false,
          profilePicUrl: '',
          isGroup: false
        };
        
        // Garante que o status do chat mockado seja 'atendimento' para que ele seja exibido na aba de Atendimento
        useStore.getState().setChatStatus(newChatJid, 'atendimento');
        
        // Insere o chat no array local de chats
        setWhatsappChats([...whatsappChats, mockChat]);
        foundChat = mockChat;
      } else {
        // Garante que a conversa existente seja promovida a 'atendimento'
        useStore.getState().setChatStatus(foundChat.id, 'atendimento');
      }
      
      setPendingAtendimento(foundChat);
      setActiveTab('atendimento');
      
      // Limpa o parâmetro phone da URL para evitar resets infinitos, mantendo o textParam
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('phone');
      setSearchParams(newParams);
    }
  }, [phoneParam, whatsappChats, patients, setWhatsappChats, searchParams, setSearchParams]);

  // Auto-fill store from .env vars on first load (if store is empty or different)
  useEffect(() => {
    const envUrl = (import.meta as any).env?.VITE_EVOLUTION_API_URL || '';
    const envKey = (import.meta as any).env?.VITE_EVOLUTION_API_KEY || '';
    const envInst = (import.meta as any).env?.VITE_EVOLUTION_INSTANCE_NAME || '';
    if (envUrl && (evolutionApiUrl !== envUrl || evolutionInstance !== envInst || evolutionApiKey !== envKey)) {
      setEvolutionConfig(envUrl, envKey, envInst);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincroniza dinamicamente estados do WhatsApp locais com os JIDs e nomes reais da Evolution API
  useEffect(() => {
    if (whatsappChats.length > 0 && patients.length > 0) {
      syncWhatsappStateWithPatients(patients);
    }
  }, [whatsappChats, patients, syncWhatsappStateWithPatients]);

  // Fetch chats on mount and every 8s when connected
  const loadChats = useCallback(async () => {
    // Requer ao menos a instância. URL e key podem vir do .env do servidor.
    if (!evolutionInstance) return;
    try {
      const chats = await fetchChats(evolutionApiUrl, evolutionApiKey, evolutionInstance, 80);
      if (chats.length > 0) {
        setWhatsappChats(chats.sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp));
      }
    } catch (e: any) {
      console.warn('[WhatsApp] Could not fetch chats:', e.message);
    }
  }, [evolutionApiUrl, evolutionApiKey, evolutionInstance, setWhatsappChats]);

  useEffect(() => {
    loadChats();
    const interval = setInterval(() => {
      loadChats();
    }, 8000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evolutionInstance]);

  // Counts
  const filaCount = useMemo(() =>
    whatsappChats.filter(c => {
      const st = chatStatuses[c.id];
      if (st === 'atendimento' || st === 'finalizado') return false;
      const hasIncoming = c.unreadCount > 0 || (c.lastMessage && !c.lastMessageFromMe);
      return st === 'fila' || hasIncoming;
    }).length,
    [whatsappChats, chatStatuses]
  );
  const atendimentoCount = useMemo(() =>
    whatsappChats.filter(c => chatStatuses[c.id] === 'atendimento').length,
    [whatsappChats, chatStatuses]
  );

  const handleStartChat = (chat: WaChat) => {
    setPendingAtendimento(chat);
    setActiveTab('atendimento');
  };

  const tabs: { id: MainTab; label: string; icon: any; badge?: number; dotColor?: string }[] = [
    { id: 'contatos', label: 'Contatos', icon: Users },
    { id: 'fila', label: 'Em Fila', icon: Clock, badge: filaCount, dotColor: 'bg-amber-400' },
    { id: 'atendimento', label: 'Em Atendimento', icon: HeadphonesIcon, badge: atendimentoCount, dotColor: 'bg-green-500' },
    { id: 'conexao', label: 'Conexão WhatsApp', icon: whatsappConnected ? Wifi : WifiOff, dotColor: whatsappConnected ? 'bg-emerald-500' : 'bg-amber-400' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col h-[calc(100vh-112px)] overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-sm"
    >
      {/* Tab Bar */}
      <div className="bg-white border-b border-slate-100 px-4 pt-3 flex items-center gap-0.5 shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl border-b-2 transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                {tab.badge}
              </span>
            )}
            {tab.dotColor && !tab.badge && (
              <span className={`w-2 h-2 ${tab.dotColor} rounded-full`} />
            )}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2 pb-1">
          <Button onClick={loadChats} variant="ghost" size="sm" className="h-8 text-slate-400 text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Atualizar
          </Button>
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'contatos' && (
          <motion.div key="contatos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col flex-1 overflow-hidden">
            <ContactsTab onStartChat={handleStartChat} />
          </motion.div>
        )}
        {activeTab === 'fila' && (
          <motion.div key="fila" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col flex-1 overflow-hidden">
            <FilaTab onAttend={chat => { setPendingAtendimento(chat); setActiveTab('atendimento'); }} />
          </motion.div>
        )}
        {activeTab === 'atendimento' && (
          <motion.div key="atendimento" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-1 overflow-hidden">
            <AtendimentoTab initialChat={pendingAtendimento} />
          </motion.div>
        )}
        {activeTab === 'conexao' && (
          <motion.div key="conexao" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col flex-1 overflow-hidden">
            <ConnectionTab />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
