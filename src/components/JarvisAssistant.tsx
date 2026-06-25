import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Volume2, VolumeX, X, BrainCircuit, Sparkles, Zap, Shield, Activity, Cpu } from 'lucide-react';
import { useStore } from '../store';
import { format, isToday, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

// Use the Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const JarvisAssistant: React.FC = () => {
  const { appointments, patients, finance, packages, professionals, clinicName, activateAI } = useStore();
  
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [showInterface, setShowInterface] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [voiceBars, setVoiceBars] = useState<number[]>(new Array(30).fill(4));

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!activateAI) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && !recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcriptPart = result[0].transcript.toLowerCase().trim();
          
          if (result.isFinal) {
            console.log('Jarvis Final Result:', transcriptPart);
            
            // Wake word check - much more permissive
            if (!showInterface && (transcriptPart.includes('jarvis') || transcriptPart.includes('jávis') || transcriptPart.includes('javes'))) {
              console.log('Jarvis activated via wake word');
              activateJarvis();
              return;
            }

            // If in interface, process the query
            if (showInterface && !isProcessing && transcriptPart.length > 2) {
              processQuery(transcriptPart);
            }
          } else {
            interimTranscript += transcriptPart;
          }
        }

        if (showInterface) {
          setTranscript(interimTranscript || transcript);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') setPermissionError(true);
        if (['network', 'aborted', 'no-speech'].includes(event.error)) {
          // Silent recovery - remove log noise
          return;
        }
        console.error('Jarvis Speech Error:', event.error);
      };

      recognition.onend = () => {
        // Auto-restart if not manually stopped and JARVIS is enabled
        if (recognitionRef.current && activateAI) {
          try { 
            // Small delay to prevent tight loop restart on some browser errors
            setTimeout(() => {
              if (recognitionRef.current) recognition.start();
            }, 1000);
          } catch (e) {}
        }
      };

      recognitionRef.current = recognition;
      try { recognition.start(); } catch (e) {}
    }

    return () => {
      if (recognitionRef.current) {
        const rec = recognitionRef.current;
        recognitionRef.current = null;
        try { rec.abort(); } catch (e) {}
      }
    };
  }, [showInterface, activateAI]);

  // Voice bar animation animation
  useEffect(() => {
    const interval = setInterval(() => {
      if (isSpeaking) {
        setVoiceBars(v => v.map(() => 8 + Math.random() * 40));
      } else if (isListening && showInterface) {
        setVoiceBars(v => v.map(() => 4 + Math.random() * 20));
      } else {
        setVoiceBars(v => v.map(() => 4));
      }
    }, 80);
    return () => clearInterval(interval);
  }, [isSpeaking, isListening, showInterface]);

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    
    // Explicit cancel to avoid queuing errors
    window.speechSynthesis.cancel();

    // Small delay to ensure browser register cancel and reset state
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      
      const voices = window.speechSynthesis.getVoices();
      // Try to find a good male voice or standard Portuguese
      const preferredVoice = voices.find(v => v.lang.includes('pt-BR') && (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('homem'))) || 
                             voices.find(v => v.lang.includes('pt-BR')) || 
                             voices[0];
      
      if (preferredVoice) utterance.voice = preferredVoice;
      
      utterance.rate = 1.0; 
      utterance.pitch = 0.8; // Deeper for Jarvis

      utterance.onstart = () => {
        setIsSpeaking(true);
        console.log('Jarvis started talking');
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        console.log('Jarvis finished talking');
      };
      utterance.onerror = (e) => {
        setIsSpeaking(false);
        console.error('Jarvis speech error', e);
      };
      
      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  const activateJarvis = () => {
    if (showInterface) return;
    setShowInterface(true);
    setIsListening(true);
    setTranscript('');
    setResponse('Atendendo, senhor.');
    speak('Sim, senhor? Como posso ajudá-lo hoje?');
  };

  const clinicDataSummary = useMemo(() => {
    const today = new Date();
    const apptsToday = appointments.filter(a => isToday(parseISO(a.date)));
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    
    const revenueThisMonth = finance
      .filter(f => f.type === 'receita' && f.status === 'pago' && f.paymentDate && isWithinInterval(parseISO(f.paymentDate), { start: monthStart, end: monthEnd }))
      .reduce((sum, f) => sum + f.amount, 0);

    const pendingRevenueThisMonth = finance
      .filter(f => f.type === 'receita' && f.status === 'pendente' && isWithinInterval(parseISO(f.dueDate), { start: monthStart, end: monthEnd }))
      .reduce((sum, f) => sum + f.amount, 0);

    return {
      clinicName,
      totalPatients: patients.length,
      appointmentsToday: apptsToday.length,
      revenueThisMonth,
      pendingRevenueThisMonth,
      totalPackages: packages.length,
      totalProfessionals: professionals.length,
      todayAppointmentsDetail: apptsToday.map(a => {
        const patient = patients.find(p => p.id === a.patientId);
        const professional = professionals.find(p => p.id === a.professionalId);
        return `${a.startTime}: ${patient?.name || 'Paciente'} com Dr(a) ${professional?.name || 'Profissional'}`;
      }).join('\n')
    };
  }, [appointments, patients, finance, packages, professionals, clinicName]);

  const processQuery = async (query: string) => {
    if (!query || query.length < 3 || isProcessing) return;
    
    setIsProcessing(true);
    setTranscript(query);
    setResponse('Analisando registros...');
    
    try {
      const res = await fetch('/api/jarvis/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          context: clinicDataSummary
        })
      });

      if (!res.ok) throw new Error('Falha no núcleo.');
      
      const data = await res.json();
      const aiResponse = data.text || "Senhor, os dados parecem inconsistentes. Não consegui uma resposta.";
      
      setResponse(aiResponse);
      speak(aiResponse);
    } catch (error) {
      const msg = "Senhor, perdi a conexão com os servidores centrais da Stark Industries.";
      setResponse(msg);
      speak(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const closeJarvis = () => {
    setShowInterface(false);
    setIsListening(false);
    window.speechSynthesis?.cancel();
  };

  if (!activateAI) return null;

  return (
    <>
      {/* Invisible listener indicator */}
      <AnimatePresence>
        {!showInterface && !permissionError && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed bottom-6 right-6 z-[100]"
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-cyan-400 rounded-full animate-ping opacity-20"></div>
              <button 
                onClick={activateJarvis}
                className="relative bg-slate-900 border border-cyan-400/40 p-4 rounded-full shadow-[0_0_25px_rgba(34,211,238,0.3)] text-cyan-400 hover:text-white transition-all hover:scale-110 active:scale-95"
              >
                <Cpu className="w-6 h-6" />
                <span className="absolute -top-10 right-0 bg-slate-900 text-[10px] px-2 py-1 rounded border border-cyan-400/30 opacity-0 group-hover:opacity-100 transition-opacity font-mono text-cyan-400 whitespace-nowrap">
                  PROTOCOL JARVIS ACTIVE
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInterface && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/98 backdrop-blur-2xl"
          >
            {/* GRID OVERLAY */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

            <div className="relative w-full max-w-6xl h-screen md:h-auto flex flex-col md:flex-row items-center gap-16 px-8 py-12">
              <button 
                onClick={closeJarvis}
                className="absolute top-4 right-4 p-4 text-slate-500 hover:text-white transition-colors z-50"
              >
                <X className="w-10 h-10" />
              </button>

              {/* ARC REACTOR CORE */}
              <div className="relative flex-none">
                <div className="relative w-72 h-72 md:w-[450px] md:h-[450px] flex items-center justify-center">
                  {/* Outer Rings */}
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 rounded-full border border-cyan-500/10"
                  ></motion.div>
                  <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-4 rounded-full border-2 border-cyan-500/10 border-dashed"
                  ></motion.div>
                  
                  {/* Middle Ring with Pulse */}
                  <motion.div 
                    animate={{ 
                      scale: isSpeaking ? [1, 1.05, 1] : 1,
                      borderColor: isSpeaking ? 'rgba(34,211,238,0.5)' : 'rgba(34,211,238,0.1)'
                    }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute inset-16 rounded-full border-4 border-cyan-400/10 flex items-center justify-center"
                  >
                    <div className="w-full h-full rounded-full border border-cyan-400/20 rotate-45"></div>
                  </motion.div>

                  {/* CORE */}
                  <div className="relative w-40 h-40 md:w-64 md:h-64 rounded-full flex items-center justify-center">
                    <motion.div 
                      animate={{ 
                        boxShadow: isProcessing ? [
                          '0 0 40px rgba(34,211,238,0.4)',
                          '0 0 80px rgba(34,211,238,0.6)',
                          '0 0 40px rgba(34,211,238,0.4)'
                        ] : '0 0 30px rgba(34,211,238,0.2)'
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-full h-full rounded-full bg-slate-900 border-2 border-cyan-400 relative flex items-center justify-center overflow-hidden shadow-[inset_0_0_20px_rgba(34,211,238,0.3)]"
                    >
                      <BrainCircuit 
                        className={`w-20 h-20 md:w-32 md:h-32 ${isProcessing ? 'text-white' : 'text-cyan-400'} transition-all`}
                        style={{ filter: isSpeaking ? 'drop-shadow(0 0 10px cyan)' : 'none' }}
                      />
                      
                      {/* Scanline Effect */}
                      <motion.div 
                        animate={{ y: [-200, 200] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                        className="absolute w-full h-[10%] bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent pointer-events-none"
                      />
                    </motion.div>
                  </div>

                  {/* HUD Elements around Core */}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 bg-cyan-400 rounded-full"
                      animate={{ 
                        rotate: 360,
                        opacity: [0.2, 1, 0.2]
                      }}
                      transition={{ 
                        rotate: { duration: 20 + i * 2, repeat: Infinity, ease: 'linear' },
                        opacity: { duration: 2, repeat: Infinity, delay: i * 0.25 }
                      }}
                      style={{ 
                        transformOrigin: 'center center',
                        top: '50%',
                        left: '50%',
                        marginTop: '-4px',
                        marginLeft: '-4px',
                        transform: `rotate(${i * 45}deg) translateY(-180px)`
                      }}
                    ></motion.div>
                  ))}
                </div>
              </div>

              {/* HUD CONSOLE */}
              <div className="flex-1 flex flex-col justify-center gap-10 w-full max-w-2xl">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-[2px] w-12 bg-cyan-500 shadow-[0_0_10px_cyan]"></div>
                    <span className="text-cyan-400 font-mono text-xs tracking-[0.6em] uppercase">Status: Protocolo Ativo</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h1 className="text-4xl md:text-6xl font-black text-white title-font italic tracking-tighter">JARVIS</h1>
                    <span className="text-cyan-500 font-mono text-xs">v4.2.0</span>
                  </div>
                </div>

                <div className="space-y-8 bg-slate-900/40 p-8 rounded-3xl border border-cyan-500/10 backdrop-blur-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 flex gap-2">
                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-cyan-500/40 rounded-full"></div>
                  </div>

                  {/* TRANSCRIPT */}
                  <div className="min-h-[40px] border-l-2 border-indigo-500/30 pl-4">
                    <p className="text-slate-400 text-sm font-mono tracking-wide leading-relaxed">
                      {transcript || (isProcessing ? 'Sincronizando com satélites Stark...' : 'Monitorando vetores de voz em tempo real...')}
                    </p>
                  </div>

                  {/* VOICE BARS */}
                  <div className="flex items-center gap-1.5 h-12">
                    {voiceBars.map((h, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: h }}
                        className="w-1 bg-cyan-500 rounded-full opacity-60 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                      ></motion.div>
                    ))}
                  </div>

                  {/* AI RESPONSE */}
                  <div className="relative pt-4">
                    <AnimatePresence mode="wait">
                      {response ? (
                        <motion.div
                          key={response}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-6"
                        >
                          <p className="text-white text-2xl font-bold leading-tight font-sans tracking-tight">
                            {response}
                          </p>
                        </motion.div>
                      ) : (
                        <div className="flex items-center gap-3 text-cyan-500/20 py-8">
                          <Activity className="w-8 h-8 animate-pulse" />
                          <span className="text-sm font-mono uppercase tracking-[0.3em]">Aguardando Comando do Usuário</span>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* METRICS HUD */}
                  <div className="grid grid-cols-2 gap-4 pt-6 mt-6 border-t border-cyan-500/10">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">CPU LOAD</p>
                      <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          animate={{ width: isProcessing ? '85%' : '15%' }}
                          className="h-full bg-cyan-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">NEURAL SYNC</p>
                      <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          animate={{ width: isSpeaking ? '95%' : '40%' }}
                          className="h-full bg-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => { setTranscript(''); setResponse(''); }}
                    className="flex-1 py-4 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 font-mono text-xs uppercase tracking-widest hover:border-cyan-500 hover:text-white transition-all flex items-center justify-center gap-2 group"
                  >
                    <Shield className="w-4 h-4 group-hover:text-cyan-400" /> Limpar Registros
                  </button>
                  <button 
                    onClick={closeJarvis}
                    className="px-10 py-4 rounded-xl bg-indigo-600 text-white font-mono text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                  >
                    Encerrar Protocolo
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PERMISSION NOTIFICATION */}
      <AnimatePresence>
        {permissionError && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-8 left-8 right-8 md:left-auto md:w-[400px] z-[400] bg-slate-950 border-2 border-red-500/50 p-8 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.2)]"
          >
            <div className="flex flex-col gap-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 border border-red-500/20">
                <MicOff className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Veto de Acesso</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Senhor, a segurança do navegador bloqueou o acesso ao microfone. Sem a entrada de áudio, meus protocolos de reconhecimento vocal estão inativos.
                </p>
                <button 
                  onClick={() => setPermissionError(false)}
                  className="mt-6 w-full py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 font-mono text-xs uppercase hover:bg-red-500 hover:text-white transition-all"
                >
                  Confirmar Ciência
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
