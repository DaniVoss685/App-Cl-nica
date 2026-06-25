import React, { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { motion } from 'motion/react';
import { 
  MessageSquare, 
  Search, 
  User, 
  Send, 
  MoreVertical, 
  Smile, 
  Paperclip,
  CheckCheck,
  Clock,
  Phone,
  Video,
  Globe,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { cn } from '../lib/utils';
import { useStore } from '../store';

type Msg = {
  id: string;
  sender: 'patient' | 'clinic';
  text: string;
  time: string;
};

export function WhatsApp() {
  const { patients } = useStore();
  
  // Set default active patient
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '1');
  const [messageInput, setMessageInput] = useState('');
  const [copied, setCopied] = useState(false);

  // Initial mock conversations per patient
  const [conversations, setConversations] = useState<Record<string, Msg[]>>({
    '1': [
      { id: 'm1', sender: 'patient', text: 'Bom dia! Gostaria de confirmar se o meu preenchimento labial está mantido para amanhã às 09:00.', time: '10:42' },
      { id: 'm2', sender: 'clinic', text: 'Olá Maria! Sim, seu protocolo está confirmado e todos os materiais já foram reservados para você. ✨', time: '10:45' },
      { id: 'm3', sender: 'clinic', text: 'Lembrando que recomendamos jejum leve de 2 horas. Te aguardamos!', time: '10:45' }
    ],
    '2': [
      { id: 'm4', sender: 'patient', text: 'Olá, esqueci qual profissional irá fazer a minha consulta de avaliação.', time: '09:12' },
      { id: 'm5', sender: 'clinic', text: 'Olá João! Sua consulta será com a Dra. Beatriz Stark.', time: '09:15' }
    ],
    '3': [
      { id: 'm6', sender: 'patient', text: 'Gostaria de agendar uma sessão de preenchimento labial, vocês têm horários para a semana que vem?', time: 'Ontem' },
      { id: 'm7', sender: 'clinic', text: 'Olá Ana! Com certeza. Vou te enviar nosso link de auto-agendamento profissional para você escolher o melhor horário!', time: 'Ontem' }
    ]
  });

  const activePatient = patients.find(p => p.id === selectedPatientId) || patients[0];
  const activeMessages = conversations[selectedPatientId] || [];

  // Copy auto-scheduling link to clipboard
  const handleCopyLink = () => {
    const link = `${window.location.origin}/agendamento-online`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Insert standard template containing the auto-scheduling link
  const handleInsertTemplate = () => {
    const name = activePatient?.name || 'paciente';
    const firstName = name.split(' ')[0];
    const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
    
    const text = `Olá, ${capitalizedName}! Para agendar sua próxima sessão ou procedimento de estética de forma 100% online no nosso portal, basta clicar no link abaixo e escolher o profissional e horário de sua preferência:\n\n🔗 ${window.location.origin}/agendamento-online\n\nÉ super prático! Caso tenha dúvidas, estamos à disposição por aqui. ✨`;
    setMessageInput(text);
  };

  // Send message
  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newMsg: Msg = {
      id: Math.random().toString(),
      sender: 'clinic',
      text: messageInput,
      time: timeStr
    };

    setConversations(prev => ({
      ...prev,
      [selectedPatientId]: [...(prev[selectedPatientId] || []), newMsg]
    }));
    
    setMessageInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const searchAndOpenPortal = () => {
    window.open(`${window.location.origin}/agendamento-online`, '_blank');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50 border-t border-slate-200"
    >
      {/* Sidebar - Chat List */}
      <div className="w-[350px] bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black italic text-slate-900 leading-none">Conversas</h2>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                <MessageSquare className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Buscar contatos..." className="pl-10 h-10 bg-slate-50 border-transparent focus:bg-white rounded-xl" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {patients.slice(0, 5).map((p) => {
            const isSelected = p.id === selectedPatientId;
            const lastMsgArray = conversations[p.id] || [];
            const lastMsg = lastMsgArray[lastMsgArray.length - 1];
            
            return (
              <div 
                key={p.id} 
                onClick={() => setSelectedPatientId(p.id)}
                className={cn(
                  "flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 border-b border-slate-50 transition-colors",
                  isSelected && "bg-slate-50 relative after:absolute after:left-0 after:top-0 after:bottom-0 after:w-1 after:bg-indigo-600"
                )}
              >
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black shrink-0 capitalize">
                  {p.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h4 className="font-bold text-slate-900 text-sm truncate italic capitalize">{p.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">{lastMsg ? lastMsg.time : '10:45'}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {lastMsg ? lastMsg.text : 'Sem mensagens anteriores.'}
                    </p>
                    {p.id === '2' && !isSelected && (
                      <Badge className="bg-indigo-600 text-[8px] font-bold h-4 w-4 flex items-center justify-center p-0 rounded-full text-white">1</Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-black capitalize">
              {activePatient?.name.charAt(0) || 'P'}
            </div>
            <div>
              <h3 className="font-black italic text-slate-900 text-sm capitalize">{activePatient?.name || 'Paciente'}</h3>
              <p className="text-[10px] text-green-500 font-bold flex items-center gap-1 italic">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                Online agora
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-slate-400" onClick={handleCopyLink}>
              <LinkIcon className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400"><Phone className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" className="text-slate-400"><Video className="w-5 h-5" /></Button>
            <div className="w-px h-6 bg-slate-100 mx-2"></div>
            <Button variant="ghost" size="icon" className="text-slate-400"><MoreVertical className="w-5 h-5" /></Button>
          </div>
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 flex flex-col">
          <div className="flex justify-center mb-2">
            <Badge className="bg-white/80 backdrop-blur-sm text-slate-400 border-none font-bold text-[10px] py-1 px-3 shadow-sm lowercase tracking-wide">
              Hoje
            </Badge>
          </div>

          <div className="flex flex-col gap-4 flex-1">
            {activeMessages.map((msg) => {
              const isClinic = msg.sender === 'clinic';
              const containsLink = msg.text.includes('/agendamento-online');

              return (
                <motion.div 
                  key={msg.id} 
                  initial={{ opacity: 0, x: isClinic ? 30 : -30, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 140, damping: 14 }}
                  className={cn(
                    "flex flex-col gap-1 max-w-[70%] transition-all",
                    isClinic ? "ml-auto items-end" : "items-start"
                  )}
                >
                  <div 
                    className={cn(
                      "p-4 rounded-[1.5rem] shadow-sm text-sm space-y-2 whitespace-pre-wrap leading-relaxed",
                      isClinic 
                        ? "bg-indigo-600 text-white rounded-br-none shadow-indigo-100" 
                        : "bg-white text-slate-800 rounded-bl-none border border-slate-100"
                    )}
                  >
                    <p>{msg.text}</p>
                    
                    {/* Render Interactive Auto-Scheduling card if it has the booking route */}
                    {containsLink && (
                      <div className={cn(
                        "mt-3 p-4 rounded-xl border flex flex-col gap-3 text-left transition-all",
                        isClinic 
                          ? "bg-indigo-950/40 border-indigo-400/40 text-white"
                          : "bg-indigo-50 border-indigo-100 text-slate-900"
                      )}>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <Globe className="w-4 h-4 text-indigo-300 animate-pulse" />
                          </div>
                          <div>
                            <p className="font-black text-[11px] uppercase tracking-wider italic">Stark Clinic • Portal</p>
                            <p className="text-[10px] opacity-70">Auto-agendamento de alta performance</p>
                          </div>
                        </div>

                        <Button 
                          onClick={searchAndOpenPortal}
                          className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider italic rounded-lg shadow-md flex items-center justify-center gap-2"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          Simular como Paciente (Abre Nova Aba)
                        </Button>
                      </div>
                    )}

                    <div className="flex justify-end items-center gap-1">
                      <span className={cn("text-[9px] font-mono", isClinic ? "opacity-75 text-indigo-200" : "text-slate-400")}>
                        {msg.time}
                      </span>
                      {isClinic && <CheckCheck className="w-3.5 h-3.5 text-indigo-200" />}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Clinician Assistant Quick Sharing Ribbon */}
        <div className="px-6 py-3 bg-indigo-50/80 border-t border-indigo-100/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs italic">
          <div className="flex items-center gap-2 text-indigo-950 font-black uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" /> Assistente de Auto-Agendamento
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              onClick={handleInsertTemplate} 
              size="sm" 
              variant="outline" 
              className="flex-1 sm:flex-none h-9 border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 font-extrabold uppercase italic px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm text-xs"
            >
              <MessageSquare className="w-4 h-4" /> Inserir Convite no Chat
            </Button>
            <Button 
              onClick={handleCopyLink} 
              size="sm" 
              className="flex-1 sm:flex-none h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase italic px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-md text-xs"
            >
              {copied ? <CheckCheck className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
              {copied ? 'Link Copiado!' : 'Copiar Link'}
            </Button>
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600 shrink-0"><Smile className="w-6 h-6" /></Button>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600 shrink-0"><Paperclip className="w-6 h-6" /></Button>
          <div className="flex-1 relative flex items-center">
            <Input 
              placeholder="Digite sua mensagem..." 
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyPress}
              className="h-12 border-slate-200 bg-slate-50/50 focus:bg-white rounded-2xl pr-14 focus:ring-indigo-500 font-bold italic text-slate-800" 
            />
            <Button 
              onClick={handleSendMessage}
              size="icon" 
              className="absolute right-1 top-1 h-10 w-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-100"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
