import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  User, 
  Calendar, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Tv, 
  MousePointer, 
  CheckCircle, 
  Stethoscope, 
  DollarSign,
  Briefcase,
  Layers,
  Heart,
  FileText,
  Percent,
  Check,
  Scale,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

interface VideoSegment {
  time: number; // seconds
  focusField: string; // which input is highlighted
  typedText?: string; // simulation of text being typed
  activeSelectIndex?: number;
  explanation: string;
  cursorX: number; // percentage width
  cursorY: number; // percentage height
  actionType: 'idle' | 'typing' | 'clicking' | 'selecting' | 'success';
}

interface TutorialModule {
  id: string;
  title: string;
  badge: string;
  duration: number; // total seconds
  icon: React.ComponentType<any>;
  segments: VideoSegment[];
}

const TUTORIAL_MODULES: TutorialModule[] = [
  {
    id: 'paciente',
    title: "1. Ficha de Cadastro Clínico de Pacientes",
    badge: "Paciente",
    duration: 18,
    icon: User,
    segments: [
      {
        time: 0,
        focusField: 'none',
        explanation: "Bem-vindo ao guia prático! A ficha de cadastro de paciente unifica as informações básicas e garante controle automático para o WhatsApp do cliente.",
        cursorX: 52,
        cursorY: 82,
        actionType: 'idle'
      },
      {
        time: 3,
        focusField: 'name',
        typedText: 'Clarice Fontes Stark',
        explanation: "Iniciamos digitando o Nome Completo do paciente no primeiro passo. Ideal para emissões de contratos e termos legais.",
        cursorX: 35,
        cursorY: 34,
        actionType: 'typing'
      },
      {
        time: 7,
        focusField: 'phone',
        typedText: '(11) 99887-7665',
        explanation: "Depois, inserimos o Celular / WhatsApp para que o assistente Stark possa disparar mensagens de confirmação e pós-tratamento sem esforço.",
        cursorX: 30,
        cursorY: 53,
        actionType: 'typing'
      },
      {
        time: 11,
        focusField: 'cpf',
        typedText: '456.789.123-00',
        explanation: "Inserimos o CPF. O sistema valida os campos para que o prontuário e as emissões de recibos estéticos fiquem sempre corretos.",
        cursorX: 70,
        cursorY: 53,
        actionType: 'typing'
      },
      {
        time: 14,
        focusField: 'referral',
        explanation: "No passo seguinte, selecionamos a Origem: Instagram / Redes Sociais. Monitoramento perfeito do ROI das campanhas.",
        cursorX: 62,
        cursorY: 74,
        actionType: 'selecting'
      },
      {
        time: 16,
        focusField: 'btn-salvar',
        explanation: "Pronto! Clicamos em 'Avançar e Salvar' para integrar a ficha ao banco de dados.",
        cursorX: 82,
        cursorY: 90,
        actionType: 'clicking'
      },
      {
        time: 18,
        focusField: 'success',
        explanation: "Excelente! Cadastro finalizado. O prontuário do paciente já está disponível no catálogo.",
        cursorX: 50,
        cursorY: 50,
        actionType: 'success'
      }
    ]
  },
  {
    id: 'servico',
    title: "2. Serviços & Insumos de Margem Real",
    badge: "Serviço",
    duration: 22,
    icon: Stethoscope,
    segments: [
      {
        time: 0,
        focusField: 'none',
        explanation: "Nesta aula veremos como registrar um Procedimento associando seus custos do armário de insumos para projetar a Margem de Lucro Real.",
        cursorX: 52,
        cursorY: 82,
        actionType: 'idle'
      },
      {
        time: 4,
        focusField: 'serv-nome',
        typedText: 'Preenchimento Labial Gold',
        explanation: "Definimos o nome do protocolo de atendimento clínico-estético no campo inicial.",
        cursorX: 32,
        cursorY: 34,
        actionType: 'typing'
      },
      {
        time: 8,
        focusField: 'serv-preco',
        typedText: '1.500,00',
        explanation: "Informamos o Preço de Venda cobrado do cliente final.",
        cursorX: 72,
        cursorY: 34,
        actionType: 'typing'
      },
      {
        time: 12,
        focusField: 'serv-retorno',
        explanation: "Configuramos o retorno médico gratuito automático para 15 dias após o tratamento.",
        cursorX: 42,
        cursorY: 54,
        actionType: 'clicking'
      },
      {
        time: 16,
        focusField: 'serv-insumo',
        explanation: "Vinculamos os Insumos: 1x Seringa Ácido Ultradeep (R$ 450,00). Veja a margem líquida recalcular instantaneamente na tela!",
        cursorX: 32,
        cursorY: 78,
        actionType: 'selecting'
      },
      {
        time: 20,
        focusField: 'btn-confirmar-serv',
        explanation: "Tudo validado! Clicamos em 'Salvar Serviço' para atualizar o catálogo da clínica.",
        cursorX: 80,
        cursorY: 90,
        actionType: 'clicking'
      },
      {
        time: 22,
        focusField: 'success',
        explanation: "Sucesso! O serviço está registrado, integrando faturamento e controle de estoque de segurança.",
        cursorX: 50,
        cursorY: 50,
        actionType: 'success'
      }
    ]
  },
  {
    id: 'insumo',
    title: "3. Lançamento de Custos e Faturamento de Insumos",
    badge: "Estoque",
    duration: 18,
    icon: DollarSign,
    segments: [
      {
        time: 0,
        focusField: 'none',
        explanation: "Controle o almoxarife de insumos. Registre luvas, toxinas e ampolas e ganhe segurança de dedução em cada atendimento.",
        cursorX: 52,
        cursorY: 82,
        actionType: 'idle'
      },
      {
        time: 3,
        focusField: 'ins-nome',
        typedText: 'Seringa Ácido Ultradeep 1ml',
        explanation: "Inserimos a descrição ou marca do material do fornecedor estético.",
        cursorX: 35,
        cursorY: 32,
        actionType: 'typing'
      },
      {
        time: 7,
        focusField: 'ins-categoria',
        explanation: "Associaremos à categoria 'Insumos / Consumíveis' para facilitar o cálculo de dedução.",
        cursorX: 72,
        cursorY: 32,
        actionType: 'selecting'
      },
      {
        time: 11,
        focusField: 'ins-medida',
        explanation: "Escolhemos o tipo de medida: 'Pacote' contendo 100 sub-unidades.",
        cursorX: 32,
        cursorY: 54,
        actionType: 'clicking'
      },
      {
        time: 14,
        focusField: 'ins-valor',
        typedText: '450,00',
        explanation: "Digitamos o valor total de aquisição do pacote para calcular custos fracionários.",
        cursorX: 72,
        cursorY: 54,
        actionType: 'typing'
      },
      {
        time: 16,
        focusField: 'btn-salvar-ins',
        explanation: "Concluímos o lançamento clicando em 'Salvar Novo Lançamento de Estoque'.",
        cursorX: 80,
        cursorY: 90,
        actionType: 'clicking'
      },
      {
        time: 18,
        focusField: 'success',
        explanation: "Perfeito! Material inserido com auditoria de saldo mínimo inteligente.",
        cursorX: 50,
        cursorY: 50,
        actionType: 'success'
      }
    ]
  },
  {
    id: 'pacote',
    title: "4. Registro de Combos e Pacotes Promocionais",
    badge: "Pacote",
    duration: 18,
    icon: Briefcase,
    segments: [
      {
        time: 0,
        focusField: 'none',
        explanation: "Monte combos de múltiplos encontros e turbine o ticket médio da sua clínica de maneira controlada.",
        cursorX: 52,
        cursorY: 82,
        actionType: 'idle'
      },
      {
        time: 3,
        focusField: 'pac-nome',
        typedText: 'Combo Verão: 10 Seringas de Colágeno',
        explanation: "Definimos o nome do pacote comercial estimulador de fechamento rápido.",
        cursorX: 35,
        cursorY: 32,
        actionType: 'typing'
      },
      {
        time: 7,
        focusField: 'pac-preco',
        typedText: '4.500,00',
        explanation: "Atribuímos o preço exclusivo para o combo fechado ou parcelas.",
        cursorX: 72,
        cursorY: 32,
        actionType: 'typing'
      },
      {
        time: 11,
        focusField: 'pac-servicos',
        explanation: "Vinculamos os procedimentos que integram este pacote de sessões programadas.",
        cursorX: 42,
        cursorY: 54,
        actionType: 'clicking'
      },
      {
        time: 14,
        focusField: 'pac-sinal',
        explanation: "Definimos se exige pagamento antecipado (sinal). Configuramos porcentagem de 20%.",
        cursorX: 62,
        cursorY: 76,
        actionType: 'clicking'
      },
      {
        time: 16,
        focusField: 'btn-salvar-pac',
        explanation: "Feito! Clicamos para salvar e expor o combo na grade de vendas.",
        cursorX: 80,
        cursorY: 90,
        actionType: 'clicking'
      },
      {
        time: 18,
        focusField: 'success',
        explanation: "Ótimo! O pacote comercial está disponível no ERP.",
        cursorX: 50,
        cursorY: 50,
        actionType: 'success'
      }
    ]
  },
  {
    id: 'profissional',
    title: "5. Especialistas & Comissões de Execução",
    badge: "Profissional",
    duration: 18,
    icon: User,
    segments: [
      {
        time: 0,
        focusField: 'none',
        explanation: "Insira novos injetores e terapeutas na clínica. Defina seus expedientes de consultório para travar a agenda em conflitos.",
        cursorX: 52,
        cursorY: 82,
        actionType: 'idle'
      },
      {
        time: 3,
        focusField: 'prof-nome',
        typedText: 'Dr. Bruce Banner',
        explanation: "Digitamos o nome completo do médico ou especialista para as guias.",
        cursorX: 35,
        cursorY: 32,
        actionType: 'typing'
      },
      {
        time: 7,
        focusField: 'prof-esp',
        typedText: 'Dermatologia Estética',
        explanation: "Informamos a especialidade que será mostrada no agendamento do cliente.",
        cursorX: 72,
        cursorY: 32,
        actionType: 'typing'
      },
      {
        time: 11,
        focusField: 'prof-telefone',
        typedText: '(11) 98765-4321',
        explanation: "E o telefone de contato profissional rápido.",
        cursorX: 32,
        cursorY: 54,
        actionType: 'typing'
      },
      {
        time: 14,
        focusField: 'prof-horas',
        explanation: "Ajustamos os expedientes: das 08:00 às 18:00 com bloqueio automático nos feriados.",
        cursorX: 72,
        cursorY: 54,
        actionType: 'clicking'
      },
      {
        time: 16,
        focusField: 'btn-salvar-prof',
        explanation: "Clicamos em 'Salvar Profissional' para ativá-lo na grade de escala.",
        cursorX: 80,
        cursorY: 90,
        actionType: 'clicking'
      },
      {
        time: 18,
        focusField: 'success',
        explanation: "Visualização excelente! Especialista vinculado e pronto para as agendas.",
        cursorX: 50,
        cursorY: 50,
        actionType: 'success'
      }
    ]
  }
];

export function InteractiveVideoPlayer() {
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // seconds
  const [isMuted, setIsMuted] = useState(false);
  const [typingState, setTypingState] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMockModalOpen, setIsMockModalOpen] = useState(true);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  const currentModule = TUTORIAL_MODULES[activeModuleIdx];

  // Find the active segment based on current elapsed seconds
  const currentSegment = (() => {
    const sorted = [...currentModule.segments].sort((a, b) => b.time - a.time);
    const matched = sorted.find(s => currentTime >= s.time);
    return matched || currentModule.segments[0];
  })();

  // Web Speech API Voice Narrator (Narrador Jarvis em tempo real)
  useEffect(() => {
    if (!isPlaying || isMuted) {
      window.speechSynthesis.cancel();
      return;
    }

    // Cancel any previous narration
    window.speechSynthesis.cancel();

    if (currentSegment && currentSegment.explanation) {
      // Create utterance
      const utterance = new SpeechSynthesisUtterance(currentSegment.explanation);
      utterance.lang = 'pt-BR';
      
      // Keep reference to prevent garbage collection mid-speech
      utteranceRef.current = utterance;
      
      // Attempt to find a Brazilian voice, ideally a male/robotic voice
      const voices = window.speechSynthesis.getVoices();
      const ptBrVoices = voices.filter(v => v.lang.startsWith('pt-BR'));
      
      // Look for a deeper or male-oriented Brazilian voice, falling back to any pt-BR
      const maleVoice = ptBrVoices.find(v => 
        v.name.toLowerCase().includes('male') || 
        v.name.toLowerCase().includes('homem') || 
        v.name.toLowerCase().includes('daniel') || 
        v.name.toLowerCase().includes('gasp')
      );
      const activeVoice = maleVoice || ptBrVoices[0];
      
      if (activeVoice) {
        utterance.voice = activeVoice;
      }
      
      // Crisp, robotic-butler-like constant parameters
      utterance.rate = 1.05; // Perfect steady pacing
      utterance.pitch = 0.90; // Deep, solid robotic tint

      window.speechSynthesis.speak(utterance);
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [currentSegment, isPlaying, isMuted]);

  // Load voices initially so browsers list them properly
  useEffect(() => {
    const handleVoicesChanged = () => {};
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
  }, []);

  // Esc key closes Fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Logic to handle auto playback
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= currentModule.duration) {
            setIsPlaying(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return currentModule.duration;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, activeModuleIdx, currentModule.duration]);

  // Reset timeline when module changes
  const selectModule = (index: number) => {
    setActiveModuleIdx(index);
    setIsPlaying(false);
    setCurrentTime(0);
    setTypingState('');
    setIsMockModalOpen(true);
  };

  // Helper function to calculate a simulated field's input value dynamically
  const getSimulatedValue = (fieldId: string) => {
    const segIndex = currentModule.segments.findIndex(s => s.focusField === fieldId);
    if (segIndex === -1) return '';
    const seg = currentModule.segments[segIndex];
    
    // If we've not yet reached the segment's start time, keep it clean and empty
    if (currentTime < seg.time) return '';
    
    // If this field is currently being typed in by the robot, show the partial typingState
    if (currentSegment.focusField === fieldId && currentSegment.actionType === 'typing') {
      return typingState;
    }
    
    // Once the segment has passed, return the complete final typed text stably
    return seg.typedText || '';
  };

  // Handle mock typing animation
  useEffect(() => {
    if (!isPlaying) return;
    
    if (currentSegment.actionType === 'typing' && currentSegment.typedText) {
      const text = currentSegment.typedText;
      let charIdx = 0;
      setTypingState('');
      
      const interval = setInterval(() => {
        setTypingState((prev) => {
          if (charIdx < text.length) {
            const nextChar = text[charIdx];
            charIdx++;
            return prev + nextChar;
          }
          clearInterval(interval);
          return prev;
        });
      }, 70); // Slightly faster typing for optimal viewing
      
      return () => clearInterval(interval);
    } else {
      setTypingState('');
    }
  }, [currentSegment, isPlaying]);

  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetVal = Number(e.target.value);
    setCurrentTime(targetVal);
    if (targetVal === currentModule.duration) {
      setIsPlaying(false);
    }
  };

  const handleRestart = () => {
    setCurrentTime(0);
    setTypingState('');
    setIsPlaying(true);
    setIsMockModalOpen(true);
  };

  return (
    <div className={cn(
      isFullScreen 
        ? "fixed inset-0 z-[99999] bg-slate-950 p-4 md:p-6 flex flex-col h-screen w-screen overflow-hidden" 
        : "w-full bg-white border border-slate-200/80 rounded-[2.5rem] p-6 text-slate-800 overflow-hidden shadow-xl relative font-sans"
    )}>
      {isFullScreen ? (
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none opacity-20" />
      ) : (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.015)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
          <div className="absolute -right-32 -top-32 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        </>
      )}
      
      <div className={cn("relative flex h-full flex-col justify-between", isFullScreen ? "max-w-full w-full mx-auto gap-3" : "space-y-6")}>
        
        {/* Fullscreen header option */}
        {isFullScreen && (
          <div className="flex items-center justify-between border-b border-white/10 pb-3 select-none shrink-0 w-full mb-2">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
              <div>
                <h4 className="text-white font-black uppercase italic tracking-wider text-sm md:text-base flex items-center gap-2">
                  <Tv className="w-4 h-4 text-indigo-400" />
                  Modo Tela Cheia Stark
                </h4>
                <p className="text-slate-400 text-[10px] font-semibold">
                  Vídeoaula ativa: <span className="text-indigo-400 font-bold">{currentModule.title}</span> • Pressione <kbd className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[8px] font-mono">ESC</kbd> para voltar
                </p>
              </div>
            </div>

            {/* Compact select buttons in fullscreen mode */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10 shrink-0">
              {TUTORIAL_MODULES.map((mod, idx) => {
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.id}
                    onClick={() => selectModule(idx)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black italic uppercase tracking-wider transition-all cursor-pointer",
                      activeModuleIdx === idx 
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" 
                        : "bg-transparent text-slate-400 hover:text-slate-200"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{mod.badge}</span>
                  </button>
                );
              })}
            </div>

            <Button
              onClick={() => setIsFullScreen(false)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-black italic uppercase text-[10px] tracking-wider rounded-xl px-4 h-9 flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Sair da Tela Cheia</span>
            </Button>
          </div>
        )}

        {/* Header containing courses and select panel with HIGH CONTRAST */}
        {!isFullScreen && (
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                  <Badge className="bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 uppercase tracking-widest text-[10px]">
                    Modo Vídeoaula Estética Stark
                  </Badge>
                </div>
                <h3 className="text-xl font-black tracking-tight italic uppercase flex items-center gap-2 text-slate-900">
                  <Tv className="w-5 h-5 text-indigo-600" />
                  Central de Vídeoaulas e Simuladores Clínicos
                </h3>
                <p className="text-xs text-slate-500 font-semibold leading-normal">
                  Aprenda a cadastrar no sistema assistindo ao robô em tempo real. Escolha um dos módulos abaixo:
                </p>
              </div>
              
              <button
                onClick={() => setIsFullScreen(true)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black italic uppercase text-[10px] tracking-wider rounded-xl px-4 h-10 border border-indigo-200 flex items-center gap-1.5 cursor-pointer select-none transition-all ml-auto md:ml-0"
              >
                <Maximize2 className="w-4 h-4 text-indigo-600 animate-pulse" />
                <span>Ver em Tela Cheia</span>
              </button>
            </div>
            
            {/* Module Selector - HIGH CONTRAST & BETTER STRUCTURED (Separated as requested) */}
            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-3xl space-y-3 select-none">
              <p className="text-[10px] font-black uppercase text-indigo-600 tracking-wider flex items-center gap-2 pl-0.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                Selecione o módulo para simular e assistir ao robô:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 w-full">
                {TUTORIAL_MODULES.map((mod, idx) => {
                  const Icon = mod.icon;
                  return (
                    <button
                      key={mod.id}
                      onClick={() => selectModule(idx)}
                      id={`onboarding-select-${mod.id}`}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 cursor-pointer group space-y-1 relative h-[78px]",
                        activeModuleIdx === idx 
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100 scale-[1.02]" 
                          : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                      )}
                    >
                      {activeModuleIdx === idx && (
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
                      )}
                      <Icon className={cn(
                        "w-4 h-4 transition-transform group-hover:scale-110",
                        activeModuleIdx === idx ? "text-white" : "text-indigo-600"
                      )} />
                      <span className="text-[10.5px] font-black uppercase italic tracking-wide block">
                        {mod.badge}
                      </span>
                      <span className={cn(
                        "text-[8.5px] font-bold block",
                        activeModuleIdx === idx ? "text-indigo-200" : "text-slate-400"
                      )}>
                        Duração: {mod.duration}s
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}


        {/* Video Canvas Arena - Simulated high contrast browser mockup */}
        <div className={cn(
          "relative bg-slate-100 rounded-3xl overflow-hidden border border-slate-205 transition-all shadow-[0_15px_30px_rgba(0,0,0,0.06)] flex flex-col w-full mx-auto",
          isFullScreen ? "flex-1 min-h-0 w-full" : "aspect-video"
        )}>
          
          {/* Faux browser navigation bar mockup */}
          <div className="w-full h-10 bg-slate-100/95 border-b border-slate-250 px-4 flex items-center gap-2 select-none shrink-0 relative z-10 justify-between">
            <div className="flex gap-1.5 items-center shrink-0">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="bg-white border border-slate-200 rounded-lg h-6 flex items-center px-4 mx-4 text-[10px] text-slate-500 font-mono italic max-w-md w-full justify-center">
              https://clinicflow-stark.ai/onboarding/{currentModule.id}
            </div>
            <div className="w-12 h-2" /> {/* alignment spacer */}
          </div>

          {/* SIMULATED WINDOW BODY (Exactly the style of real modals inside the app) */}
          <div className="flex-1 bg-slate-100 relative overflow-hidden flex flex-col">
            
            {/* Real Dashboard Background Mockup */}
            <div className="absolute inset-0 flex flex-col select-none opacity-80 bg-slate-50">
              {/* Header inside simulated app */}
              <div className="h-10 border-b border-slate-200 bg-white px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold italic text-[10px] text-indigo-700 uppercase tracking-widest">Stark Clinic ERP</span>
                  <span className="text-slate-300 text-[10px]">/</span>
                  <span className="text-[9px] font-black italic uppercase text-slate-500">{currentModule.badge}</span>
                </div>
                <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase italic">
                  <span>Indicadores Ativos</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                </div>
              </div>

              {/* Simulated content panel */}
              <div className="flex-1 p-4 grid grid-cols-4 gap-3 bg-slate-50">
                {/* Simulated Stats */}
                <div className="col-span-1 bg-white p-3 rounded-xl border border-slate-200 shadow-xs h-fit text-left">
                  <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">Faturamento</span>
                  <p className="text-sm font-black text-slate-900 mt-0.5">R$ 124.500</p>
                  <span className="text-[7px] text-emerald-600 font-bold leading-none block">▲ +12%</span>
                </div>
                <div className="col-span-1 bg-white p-3 rounded-xl border border-slate-200 shadow-xs h-fit text-left">
                  <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">Pacientes</span>
                  <p className="text-sm font-black text-slate-900 mt-0.5">1.820</p>
                  <span className="text-[7px] text-emerald-600 font-bold leading-none block">▲ +45 novos</span>
                </div>
                <div className="col-span-2 bg-white p-3 rounded-xl border border-slate-200 shadow-xs h-fit text-left space-y-1.5">
                  <span className="text-[7.5px] font-black uppercase text-indigo-600 tracking-wider flex items-center justify-between">
                    <span>Lista Registrada ({currentModule.badge})</span>
                    <span className="text-[8px] bg-indigo-50 px-1.5 py-0.5 rounded text-indigo-700 font-bold">ERP</span>
                  </span>
                  
                  {/* Dashboard data table */}
                  <div className="border border-slate-100 rounded-lg overflow-hidden text-[8.5px]">
                    <div className="bg-slate-100 text-[7px] p-1 font-black uppercase text-slate-400 border-b border-slate-150 grid grid-cols-3">
                      <span>Nome / Registro</span>
                      <span>Controle</span>
                      <span>Canal / Margem</span>
                    </div>

                    {/* Patient Module Table Rows */}
                    {currentModule.id === 'paciente' && (
                      <div className="divide-y divide-slate-100 bg-white">
                        <div className={cn("p-1 grid grid-cols-3 font-semibold text-slate-700", currentTime >= 18 && "bg-emerald-50/50")}>
                          <span className="font-extrabold">{currentTime >= 18 ? "Clarice Fontes Stark" : "---"}</span>
                          <span>{currentTime >= 18 ? "(11) 99887-7665" : "---"}</span>
                          <span className="font-bold text-indigo-600">{currentTime >= 10 ? "📸 Redes Sociais" : "---"}</span>
                        </div>
                        <div className="p-1 grid grid-cols-3 text-slate-500">
                          <span className="font-extrabold">Juliano Santos</span>
                          <span>(11) 98877-6655</span>
                          <span>🙋‍♂️ Indicação</span>
                        </div>
                      </div>
                    )}

                    {/* Service Module Table Rows */}
                    {currentModule.id === 'servico' && (
                      <div className="divide-y divide-slate-100 bg-white">
                        <div className={cn("p-1 grid grid-cols-3 font-semibold text-slate-700", currentTime >= 22 && "bg-emerald-50/50")}>
                          <span className="font-extrabold text-slate-900">{currentTime >= 22 ? "Preenchimento Labial" : "---"}</span>
                          <span>{currentTime >= 22 ? "R$ 1.500,00" : "---"}</span>
                          <span className="font-bold text-emerald-600">{currentTime >= 22 ? "70% Margem" : "---"}</span>
                        </div>
                        <div className="p-1 grid grid-cols-3 text-slate-500">
                          <span className="font-extrabold">Toxina Botulínica</span>
                          <span>R$ 1.200,50</span>
                          <span className="text-emerald-600 font-bold">65% Margem</span>
                        </div>
                      </div>
                    )}

                    {/* Inventory Module Table Rows */}
                    {currentModule.id === 'insumo' && (
                      <div className="divide-y divide-slate-100 bg-white">
                        <div className={cn("p-1 grid grid-cols-3 font-semibold text-slate-700", currentTime >= 18 && "bg-emerald-50/50")}>
                          <span className="font-extrabold">{currentTime >= 18 ? "Seringa Ácido Ultradeep" : "---"}</span>
                          <span>{currentTime >= 18 ? "Insumos" : "---"}</span>
                          <span className="font-bold text-emerald-600">{currentTime >= 18 ? "Saldo: 12 pac" : "---"}</span>
                        </div>
                        <div className="p-1 grid grid-cols-3 text-slate-500">
                          <span className="font-extrabold">Agulhas Estéticas</span>
                          <span>Insumos médicos</span>
                          <span>Saldo: 8 caixas</span>
                        </div>
                      </div>
                    )}

                    {/* Package Module Table Rows */}
                    {currentModule.id === 'pacote' && (
                      <div className="divide-y divide-slate-105 bg-white">
                        <div className={cn("p-1 grid grid-cols-3 font-semibold text-slate-700", currentTime >= 18 && "bg-emerald-50/50")}>
                          <span className="font-extrabold text-slate-900">{currentTime >= 18 ? "Combo Verão" : "---"}</span>
                          <span>{currentTime >= 18 ? "R$ 4.500" : "---"}</span>
                          <span className="font-bold text-indigo-600">{currentTime >= 18 ? "Reserva 20%" : "---"}</span>
                        </div>
                        <div className="p-1 grid grid-cols-3 text-slate-500">
                          <span className="font-extrabold">Plano Rejuvenescimento</span>
                          <span>R$ 3.200</span>
                          <span>Reserva 10%</span>
                        </div>
                      </div>
                    )}

                    {/* Professional Module Table Rows */}
                    {currentModule.id === 'profissional' && (
                      <div className="divide-y divide-slate-100 bg-white">
                        <div className={cn("p-1 grid grid-cols-3 font-semibold text-slate-700", currentTime >= 18 && "bg-emerald-50/50")}>
                          <span className="font-extrabold">{currentTime >= 18 ? "Dr. Bruce Banner" : "---"}</span>
                          <span>{currentTime >= 18 ? "Dermatologia" : "---"}</span>
                          <span className="font-bold text-emerald-650 text-emerald-600">{currentTime >= 18 ? "Ativo" : "---"}</span>
                        </div>
                        <div className="p-1 grid grid-cols-3 text-slate-500">
                          <span className="font-extrabold">Dra. Juliana Costa</span>
                          <span>Harmonização</span>
                          <span className="text-emerald-600">Ativo</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Closed / Minimized Overlay - Sleek, non-blocking Floating Notification */}
            {!isMockModalOpen && (
              <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md border border-slate-200 p-3 rounded-2xl shadow-xl z-[25] text-left animate-in slide-in-from-top-3 duration-200 select-none flex items-center gap-3 max-w-xs border-indigo-100">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                  <Sparkles className="w-4 h-4 animate-pulse text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[9px] font-black italic uppercase text-slate-900 tracking-wider">Formulário Minimizado</h4>
                  <p className="text-[8.5px] text-slate-500 leading-tight">O robô tutor continua preenchendo o sistema em segundo plano.</p>
                </div>
                <Button 
                  onClick={() => {
                    setIsMockModalOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black italic uppercase text-[8px] tracking-wider rounded-lg h-7 px-2.5 cursor-pointer shadow-xs shrink-0"
                >
                  Restaurar
                </Button>
              </div>
            )}

            {/* Modal Container Replica (Centered, mimicking the modal appearance on top of the clinic app) */}
            {isMockModalOpen && (
              <div className="absolute inset-x-0 top-0 bottom-12 bg-white flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-200">
              
              {/* MODAL HEADER: Replica of the real system (e.g. ServiceModal / PatientModal purple/indigo header) */}
              <div className="bg-indigo-600 px-6 py-4 text-white flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/25 flex items-center justify-center backdrop-blur-md">
                    {currentModule.id === 'paciente' && <User className="w-5 h-5 text-white" />}
                    {currentModule.id === 'servico' && <Stethoscope className="w-5 h-5 text-white" />}
                    {currentModule.id === 'insumo' && <DollarSign className="w-5 h-5 text-white" />}
                    {currentModule.id === 'pacote' && <Briefcase className="w-5 h-5 text-white" />}
                    {currentModule.id === 'profissional' && <User className="w-5 h-5 text-white" />}
                  </div>
                  <div className="text-left">
                    <h4 className="text-base font-black italic uppercase text-white leading-tight">
                      {currentModule.id === 'paciente' && "Novo Paciente"}
                      {currentModule.id === 'servico' && "Novo Serviço Cadastrado"}
                      {currentModule.id === 'insumo' && "Novo Lançamento de Custo / Insumo"}
                      {currentModule.id === 'pacote' && "Novo Combo / Pacote de Tratamento"}
                      {currentModule.id === 'profissional' && "Novo Especialista"}
                    </h4>
                    <p className="text-indigo-100 text-[10px] font-bold tracking-wider leading-none mt-0.5 uppercase">
                      {currentModule.id === 'paciente' && "Cadastre um novo paciente no sistema para iniciar a gestão"}
                      {currentModule.id === 'servico' && "Defina os dados de execução, valores e insumos vinculados"}
                      {currentModule.id === 'insumo' && "Almoxarife, materiais clínicos e insumos estéticos regulados"}
                      {currentModule.id === 'pacote' && "Agrupe procedimentos com desconto e agendamento programado"}
                      {currentModule.id === 'profissional' && "Defina a especialidade e escala horária do injetor"}
                    </p>
                  </div>
                </div>
                
                {/* Simulated close button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMockModalOpen(false);
                  }}
                  className="text-white bg-white/10 hover:bg-white/20 font-black italic text-[10px] uppercase tracking-wide border border-white/20 rounded-lg px-2.5 py-1 text-center shrink-0 cursor-pointer transition-colors"
                >
                  Fechar X
                </button>
              </div>

              {/* MODAL FORM REPLICA: EXACTLY matching fields and styling */}
              <div className="flex-1 overflow-y-auto bg-white p-6 md:p-8 text-left text-slate-800 flex items-center justify-center">
                <div className="max-w-2xl w-full mx-auto p-4 md:p-6 bg-slate-50/70 border border-slate-100 rounded-[2rem] shadow-xs">
                  
                  {/* MODAL 1 Form: Patient */}
                  {currentModule.id === 'paciente' && (
                    <div className="grid grid-cols-2 gap-4 text-left">
                      {/* Step index simulating the actual patient wizard */}
                      <div className="col-span-2 flex justify-center py-2 shrink-0">
                        <div className="flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-slate-100 shadow-xs">
                          <span className="w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">1</span>
                          <span className="text-[10px] font-black italic uppercase text-slate-800">Dados Básicos</span>
                          <span className="w-4 h-px bg-slate-200" />
                          <span className="w-5 h-5 bg-slate-200 text-slate-500 text-[10px] font-bold rounded-full flex items-center justify-center">2</span>
                          <span className="text-[10px] font-black italic uppercase text-slate-400">Origem & Ficha</span>
                        </div>
                      </div>

                      <div className={cn(
                        "col-span-2 p-3 rounded-2xl border transition-all space-y-1.5", 
                        currentSegment.focusField === 'name' ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-50" : "bg-white border-slate-150"
                      )}>
                        <label className="text-[10px] font-black uppercase text-slate-400 pl-0.5 italic tracking-wider font-extrabold">Nome Completo *</label>
                        <div className="h-9 bg-white border border-slate-100 rounded-xl px-3 font-bold text-xs flex items-center text-slate-900 shadow-inner">
                          {getSimulatedValue('name')}
                          {currentSegment.focusField === 'name' && isPlaying && <span className="w-1 bg-indigo-600 h-4 ml-1 animate-pulse" />}
                        </div>
                      </div>

                      <div className={cn(
                        "p-3 rounded-2xl border transition-all space-y-1.5", 
                        currentSegment.focusField === 'phone' ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-50" : "bg-white border-slate-150"
                      )}>
                        <label className="text-[10px] font-black uppercase text-slate-400 pl-0.5 italic tracking-wider font-extrabold">WhatsApp / Telefone *</label>
                        <div className="h-9 bg-white border border-slate-100 rounded-xl px-3 font-bold text-xs flex items-center text-slate-950 font-mono shadow-inner">
                          {getSimulatedValue('phone')}
                          {currentSegment.focusField === 'phone' && isPlaying && <span className="w-1 bg-indigo-600 h-4 ml-1 animate-pulse" />}
                        </div>
                      </div>

                      <div className={cn(
                        "p-3 rounded-2xl border transition-all space-y-1.5", 
                        currentSegment.focusField === 'cpf' ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-50" : "bg-white border-slate-150"
                      )}>
                        <label className="text-[10px] font-black uppercase text-slate-400 pl-0.5 italic tracking-wider font-extrabold">CPF do Paciente</label>
                        <div className="h-9 bg-white border border-slate-100 rounded-xl px-3 font-bold text-xs flex items-center text-slate-950 font-mono shadow-inner">
                          {getSimulatedValue('cpf')}
                          {currentSegment.focusField === 'cpf' && isPlaying && <span className="w-1 bg-indigo-600 h-4 ml-1 animate-pulse" />}
                        </div>
                      </div>

                      <div className={cn(
                        "col-span-2 p-3 rounded-2xl border transition-all space-y-1.5", 
                        currentSegment.focusField === 'referral' ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-50" : "bg-white border-slate-150"
                      )}>
                        <label className="text-[10px] font-black uppercase text-slate-400 pl-0.5 italic tracking-wider">Como nos Conheceu? (Origem)</label>
                        <div className="h-9 bg-white border border-slate-100 rounded-xl px-3 font-bold text-xs flex justify-between items-center text-slate-800 shadow-inner">
                          <span>{currentTime >= 14 ? "📸 Instagram / Redes Sociais" : "Selecione..."}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase italic">Editar ▼</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MODAL 2 Form: Service */}
                  {currentModule.id === 'servico' && (
                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div className={cn(
                        "col-span-2 p-3 rounded-2xl border transition-all space-y-1.5", 
                        currentSegment.focusField === 'serv-nome' ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-50" : "bg-white border-slate-150"
                      )}>
                        <label className="text-[10px] font-black uppercase text-slate-400 pl-0.5 italic tracking-wider font-extrabold">NOME DO SERVIÇO / PROCEDIMENTO *</label>
                        <div className="h-9 bg-white border border-slate-100 rounded-xl px-3 font-bold text-xs flex items-center text-slate-950 shadow-inner">
                          {getSimulatedValue('serv-nome')}
                          {currentSegment.focusField === 'serv-nome' && isPlaying && <span className="w-1 bg-indigo-600 h-4 ml-1 animate-pulse" />}
                        </div>
                      </div>

                      <div className={cn(
                        "p-3 rounded-2xl border transition-all space-y-1.5", 
                        currentSegment.focusField === 'serv-preco' ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-50" : "bg-white border-slate-150"
                      )}>
                        <label className="text-[10px] font-black uppercase text-slate-400 pl-0.5 italic tracking-wider font-extrabold">Preço de Venda (R$)</label>
                        <div className="h-9 bg-white border border-slate-100 rounded-xl px-3 font-black text-xs flex items-center text-emerald-600 font-mono shadow-inner">
                          R$ {getSimulatedValue('serv-preco')}
                          {currentSegment.focusField === 'serv-preco' && isPlaying && <span className="w-1 bg-indigo-600 h-4 ml-1 animate-pulse" />}
                        </div>
                      </div>

                      <div className={cn(
                        "p-3 rounded-2xl border transition-all space-y-1.5", 
                        currentSegment.focusField === 'serv-retorno' ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-50" : "bg-white border-slate-150"
                      )}>
                        <label className="text-[10px] font-black uppercase text-slate-400 pl-0.5 italic tracking-wider">Dias para Retorno</label>
                        <div className="flex gap-2 items-center">
                          <button type="button" className={cn(
                            "px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all",
                            currentTime >= 12 ? "bg-emerald-100 text-emerald-700 border border-emerald-300" : "bg-slate-200 text-slate-500"
                          )}>
                            {currentTime >= 12 ? "Retorno Ativo" : "Retorno Inativo"}
                          </button>
                          {currentTime >= 12 && (
                            <span className="font-mono text-xs font-extrabold text-slate-800 bg-slate-100 px-2 h-7 flex items-center justify-center rounded-lg border border-slate-250">
                              15 dias
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Insumos & Margem calculator logic replicates the actual ServiceModal formula */}
                      <div className={cn(
                        "col-span-2 p-4 bg-slate-100 border border-slate-200 rounded-2xl transition-all space-y-3",
                        currentSegment.focusField === 'serv-insumo' && "ring-2 ring-indigo-500 border-indigo-400"
                      )}>
                        <p className="text-[10px] font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          <span>Insumos e Custos Vinculados (Dedução do Armário)</span>
                        </p>
                        
                        <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm justify-between">
                          <span className="text-xs font-bold text-slate-700">
                            {currentTime >= 16 ? "• Seringa de Ácido Hialurônico Ultra R$450,00" : "Nenhum insumo incluído..."}
                          </span>
                          {currentTime >= 16 && (
                            <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200 uppercase tracking-widest leading-none shrink-0">
                              Dedução OK
                            </span>
                          )}
                        </div>

                        {currentTime >= 16 && (
                          <div className="bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-xl flex items-center justify-between text-left">
                            <div>
                              <span className="text-[8px] font-black uppercase text-indigo-500 block leading-none">Demonstração de Margem</span>
                              <span className="text-xs font-bold text-slate-700 leading-none">Preço: R$ 1.500,00 vs Custo: R$ 450,00</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] font-black uppercase text-emerald-600 block leading-none">Lucro Real Estimado</span>
                              <span className="text-sm font-black text-emerald-600 font-mono">R$ 1.050,00 (70% Margem!)</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* MODAL 3 Form: Cost item (Stock item/Insumo) */}
                  {currentModule.id === 'insumo' && (
                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div className={cn(
                        "col-span-2 p-3 rounded-2xl border transition-all space-y-1.5", 
                        currentSegment.focusField === 'ins-nome' ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-50" : "bg-white border-slate-150"
                      )}>
                        <label className="text-[10px] font-black uppercase text-slate-400 pl-0.5 italic tracking-wider">Descrição / Nome do Custo *</label>
                        <div className="h-9 bg-white border border-slate-100 rounded-xl px-3 font-bold text-xs flex items-center text-slate-950 shadow-inner">
                          {currentSegment.focusField === 'ins-nome' ? typingState : 'Seringa Ácido Ultradeep 1ml'}
                          {currentSegment.focusField === 'ins-nome' && isPlaying && <span className="w-1 bg-indigo-600 h-4 ml-1 animate-pulse" />}
                        </div>
                      </div>

                      <div className={cn(
                        "p-3 rounded-2xl border transition-all space-y-1.5", 
                        currentSegment.focusField === 'ins-categoria' ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-50" : "bg-white border-slate-150"
                      )}>
                        <label className="text-[10px] font-black uppercase text-slate-400 pl-0.5 italic tracking-wider">Categoria</label>
                        <div className="h-9 bg-white border border-slate-100 rounded-xl px-3 font-bold text-xs flex justify-between items-center text-slate-950 shadow-inner">
                          <span>{currentTime >= 11 ? "Insumos" : "Selecione..."}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Editar ▼</span>
                        </div>
                      </div>

                      <div className={cn(
                        "p-3 rounded-2xl border transition-all space-y-1.5", 
                        currentSegment.focusField === 'ins-medida' ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-50" : "bg-white border-slate-150"
                      )}>
                        <label className="text-[10px] font-black uppercase text-slate-400 pl-0.5 italic tracking-wider">Tipo de Medida</label>
                        <div className="flex gap-2">
                          <button type="button" className={cn(
                            "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase", 
                            currentTime >= 11 ? "bg-indigo-600 text-white border-indigo-300 shadow-md" : "bg-slate-200 text-slate-600"
                          )}>
                            Pacote
                          </button>
                          <button type="button" className="px-3 py-1.5 rounded-lg text-[9px] bg-slate-100 border-none text-slate-500 font-bold uppercase">
                            Unidade
                          </button>
                        </div>
                      </div>

                      {currentTime >= 11 && (
                        <div className="col-span-2 bg-indigo-50/50 p-3.5 border border-indigo-100 rounded-2xl flex items-center justify-between text-left">
                          <div>
                            <span className="text-[8px] font-black uppercase text-indigo-400 block leading-none">Fração de Estoque</span>
                            <span className="text-xs font-bold text-slate-700">100 unidades em cada pacote para fracionamento.</span>
                          </div>
                        </div>
                      )}

                      <div className={cn(
                        "col-span-2 p-3 rounded-2xl border transition-all space-y-0.5", 
                        currentSegment.focusField === 'ins-valor' ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-50" : "bg-white border-slate-150"
                      )}>
                        <label className="text-[10px] font-black uppercase text-slate-400 pl-0.5 italic tracking-wider">Preço de Custo Total (R$)</label>
                        <div className="h-9 bg-white border border-slate-100 rounded-xl px-3 font-bold text-xs flex items-center text-slate-950 font-mono shadow-inner">
                          R$ {currentSegment.focusField === 'ins-valor' ? typingState : (currentTime >= 16 ? '450,00' : '')}
                          {currentSegment.focusField === 'ins-valor' && isPlaying && <span className="w-1 bg-indigo-600 h-4 ml-1 animate-pulse" />}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MODAL 4 Form: Package */}
                  {currentModule.id === 'pacote' && (
                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div className={cn(
                        "col-span-2 p-3 rounded-2xl border transition-all space-y-1.5", 
                        currentSegment.focusField === 'pac-nome' ? "bg-indigo-50 border-indigo-300" : "bg-white border-slate-150"
                      )}>
                        <label className="text-[10px] font-black uppercase text-slate-400 pl-0.5 italic tracking-wider">NOME DO COMBO / PACOTE COMERCIAL *</label>
                        <div className="h-9 bg-white border border-slate-100 rounded-xl px-3 font-bold text-xs flex items-center text-slate-950 shadow-inner">
                          {currentSegment.focusField === 'pac-nome' ? typingState : 'Combo Verão: 10 Seringas de Colágeno'}
                          {currentSegment.focusField === 'pac-nome' && isPlaying && <span className="w-1 bg-indigo-600 h-4 ml-1 animate-pulse" />}
                        </div>
                      </div>

                      <div className={cn(
                        "p-3 rounded-2xl border transition-all space-y-1.5", 
                        currentSegment.focusField === 'pac-preco' ? "bg-indigo-50 border-indigo-300" : "bg-white border-slate-150"
                      )}>
                        <label className="text-[10px] font-black uppercase text-slate-400 pl-0.5 italic tracking-wider">Preço Promocional do Combo</label>
                        <div className="h-9 bg-white border border-slate-100 rounded-xl px-3 font-bold text-xs flex items-center text-emerald-600 font-mono shadow-inner">
                          R$ {currentSegment.focusField === 'pac-preco' ? typingState : (currentTime >= 11 ? '4.500,00' : '')}
                          {currentSegment.focusField === 'pac-preco' && isPlaying && <span className="w-1 bg-indigo-600 h-4 ml-1 animate-pulse" />}
                        </div>
                      </div>

                      <div className={cn(
                        "p-3 rounded-2xl border transition-all space-y-1.5", 
                        currentSegment.focusField === 'pac-servicos' ? "bg-indigo-50 border-indigo-300" : "bg-white border-slate-150"
                      )}>
                        <label className="text-[10px] font-black uppercase text-slate-400 pl-0.5 italic tracking-wider">Procedimentos Incluídos</label>
                        <div className="h-9 bg-white border border-slate-100 rounded-xl px-3 font-bold text-[10px] text-slate-700 flex items-center justify-between shadow-inner">
                          <span>{currentTime >= 11 ? '• 10x Seringas de Colágeno (Injetor)' : 'Nenhum serviço...'}</span>
                        </div>
                      </div>

                      <div className={cn(
                        "col-span-2 p-4 bg-slate-100 border border-slate-200 rounded-2xl transition-all space-y-2", 
                        currentSegment.focusField === 'pac-sinal' && "ring-2 ring-indigo-500 border-indigo-400"
                      )}>
                        <p className="text-[10px] font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1">
                          <Percent className="w-3.5 h-3.5" />
                          <span>Regra de Pagamento Antecipado</span>
                        </p>
                        <div className="flex items-center gap-3">
                          <button type="button" className={cn(
                            "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border",
                            currentTime >= 14 ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-slate-200 text-slate-500 border-transparent"
                          )}>
                            Exigir Sinal Ativo
                          </button>
                          {currentTime >= 14 && (
                            <span className="font-mono text-xs font-black text-rose-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                              20% (R$ 900,00 retido na reserva)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MODAL 5 Form: Professional */}
                  {currentModule.id === 'profissional' && (
                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div className={cn(
                        "p-3 rounded-2xl border transition-all space-y-1.5", 
                        currentSegment.focusField === 'prof-nome' ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-50" : "bg-white border-slate-150"
                      )}>
                        <label className="text-[10px] font-black uppercase text-slate-400 pl-0.5 italic tracking-wider">Nome do Injetor / Especialista *</label>
                        <div className="h-9 bg-white border border-slate-100 rounded-xl px-3 font-bold text-xs flex items-center text-slate-950 shadow-inner">
                          {currentSegment.focusField === 'prof-nome' ? typingState : 'Dr. Bruce Banner'}
                          {currentSegment.focusField === 'prof-nome' && isPlaying && <span className="w-1 bg-indigo-600 h-4 ml-1 animate-pulse" />}
                        </div>
                      </div>

                      <div className={cn(
                        "p-3 rounded-2xl border transition-all space-y-1.5", 
                        currentSegment.focusField === 'prof-esp' ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-50" : "bg-white border-slate-150"
                      )}>
                        <label className="text-[10px] font-black uppercase text-slate-400 pl-0.5 italic tracking-wider">Especialidade Clínica</label>
                        <div className="h-9 bg-white border border-slate-100 rounded-xl px-3 font-bold text-xs flex items-center text-slate-950 shadow-inner">
                          {currentSegment.focusField === 'prof-esp' ? typingState : (currentTime >= 11 ? 'Dermatologia Estética' : '')}
                          {currentSegment.focusField === 'prof-esp' && isPlaying && <span className="w-1 bg-indigo-600 h-4 ml-1 animate-pulse" />}
                        </div>
                      </div>

                      <div className={cn(
                        "p-3 rounded-2xl border transition-all space-y-1.5", 
                        currentSegment.focusField === 'prof-telefone' ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-50" : "bg-white border-slate-150"
                      )}>
                        <label className="text-[10px] font-black uppercase text-slate-400 pl-0.5 italic tracking-wider">WhatsApp profissional</label>
                        <div className="h-9 bg-white border border-slate-100 rounded-xl px-3 font-bold text-xs flex items-center text-slate-950 font-mono shadow-inner">
                          {currentSegment.focusField === 'prof-telefone' ? typingState : (currentTime >= 14 ? '(11) 98765-4321' : '')}
                          {currentSegment.focusField === 'prof-telefone' && isPlaying && <span className="w-1 bg-indigo-600 h-4 ml-1 animate-pulse" />}
                        </div>
                      </div>

                      <div className={cn(
                        "p-3 rounded-2xl border transition-all space-y-1.5", 
                        currentSegment.focusField === 'prof-horas' ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-50" : "bg-white border-slate-150"
                      )}>
                        <label className="text-[10px] font-black uppercase text-slate-400 pl-0.5 italic tracking-wider">Grade de Expediente</label>
                        <div className="flex gap-2">
                          <span className="font-mono text-xs font-bold text-slate-800 bg-white border border-slate-200 px-2 h-9 flex items-center rounded-xl">
                            08:00
                          </span>
                          <span className="text-slate-400 leading-9 font-bold">até</span>
                          <span className="font-mono text-xs font-bold text-slate-800 bg-white border border-slate-200 px-2 h-9 flex items-center rounded-xl">
                            18:00
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BOTTOM SUBMIT BUTTON ACTION BAR: Exactly matching modal footers */}
                  <div className="mt-6 flex justify-end gap-3 border-t border-slate-200/50 pt-5 select-none shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMockModalOpen(false);
                      }}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold italic rounded-xl px-5 h-12 text-xs uppercase tracking-wider shrink-0 transition-all border border-slate-200 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    
                    <button
                      type="button"
                      className={cn(
                        "font-black italic rounded-xl px-6 h-12 text-xs uppercase tracking-wider transition-all duration-300 inline-flex items-center gap-2",
                        currentSegment.focusField.startsWith('btn-salvar') || currentSegment.focusField.startsWith('btn-confirmar')
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100 scale-105" 
                          : "bg-indigo-600 text-white shadow-md shadow-indigo-150"
                      )}
                    >
                      {currentModule.id === 'paciente' && "Confirmar e Registrar Paciente"}
                      {currentModule.id === 'servico' && "Salvar Novo Serviço"}
                      {currentModule.id === 'insumo' && "Lançar no Estoque"}
                      {currentModule.id === 'pacote' && "Gravar Pacote de Venda"}
                      {currentModule.id === 'profissional' && "Salvar Cadastro de Especialista"}
                    </button>
                  </div>
                  
                </div>
              </div>

            </div>
            )}

            {/* Simulated mouse pointer following the segment timeline coordinates */}
            {isPlaying && (
              <div 
                className="absolute z-20 pointer-events-none transition-all duration-700 ease-out"
                style={{
                  left: `${currentSegment.cursorX}%`,
                  top: `${currentSegment.cursorY}%`,
                  transform: 'translate(-5px, -5px)'
                }}
              >
                <div className="relative">
                  <MousePointer className="w-5 h-5 text-indigo-600 drop-shadow-md stroke-2" />
                  <div className="absolute top-0 left-0 w-8 h-8 -m-1.5 rounded-full bg-indigo-600/35 animate-ping" />
                  <div className="absolute top-1 left-1.5 w-2.5 h-2.5 rounded-full bg-white border border-indigo-600 shadow-sm" />
                </div>
              </div>
            )}

            {/* Overlay for success/completed screens */}
            {currentSegment.focusField === 'success' && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-center p-6 space-y-4 animate-in fade-in duration-300 z-30">
                <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-400/50 rounded-full flex items-center justify-center text-emerald-400">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-white italic uppercase">Gravação Concluída!</h4>
                  <p className="text-slate-400 text-xs">O preenchimento desse modal foi simulado com todos os parâmetros ideais de uso no ClinicFlow.</p>
                </div>
                <Button 
                  onClick={handleRestart}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 font-extrabold italic uppercase text-[10px] tracking-wider rounded-xl px-5 h-9 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Assistir de Novo</span>
                </Button>
              </div>
            )}

            {/* Subtitles & Jarvis Narrator Explanation Overlays with HIGH CONTRAST */}
            <div className="absolute bottom-0 inset-x-0 bg-slate-900 px-5 py-3 flex items-center gap-3.5 z-20 select-none border-t border-slate-950">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0 border border-indigo-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <span className="text-[8px] font-black uppercase text-indigo-400 tracking-widest leading-none block">Orientador Jarvis (Stark)</span>
                <p className="text-slate-200 text-[11px] leading-normal font-bold tracking-tight mt-0.5 line-clamp-2 md:line-clamp-none">
                  {currentSegment.explanation}
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* Video progress and controls bar */}
        <div className={cn(
          "p-4 rounded-3xl flex flex-col md:flex-row items-center gap-4 transition-all w-full select-none",
          isFullScreen 
            ? "bg-slate-950 border border-white/10 text-white max-w-6xl mx-auto shrink-0 mt-4 shadow-2xl" 
            : "bg-slate-50 border border-slate-150 text-slate-800"
        )}>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                setIsPlaying(!isPlaying);
                if (!isMockModalOpen) setIsMockModalOpen(true);
              }}
              className={cn(
                "w-10 h-10 rounded-xl font-bold cursor-pointer transition-colors",
                isFullScreen 
                  ? "bg-slate-800 border-white/15 text-white hover:bg-slate-700" 
                  : "bg-white border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700"
              )}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleRestart}
              className={cn(
                "w-10 h-10 rounded-xl font-bold cursor-pointer transition-colors",
                isFullScreen 
                  ? "bg-slate-800 border-white/15 text-white hover:bg-slate-700" 
                  : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"
              )}
              title="Reiniciar Gravação"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Timeline Range Slider */}
          <div className="flex-1 flex items-center gap-3 w-full">
            <span className={cn(
              "text-[10px] font-mono font-black select-none",
              isFullScreen ? "text-slate-400" : "text-slate-500"
            )}>
              0:{currentTime.toString().padStart(2, '0')}
            </span>
            <input 
              type="range"
              min="0"
              max={currentModule.duration}
              value={currentTime}
              onChange={handleTimelineChange}
              className={cn(
                "flex-1 h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-600 bg-slate-200",
                isFullScreen ? "bg-slate-800" : "bg-slate-200"
              )} 
            />
            <span className={cn(
              "text-[10px] font-mono font-black select-none",
              isFullScreen ? "text-slate-400" : "text-slate-500"
            )}>
              0:{currentModule.duration}
            </span>
          </div>

          {/* Controls Right Side (Mute, Fullscreen switch & Active badge) */}
          <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto shrink-0 select-none">
            
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={cn(
                "transition-colors cursor-pointer",
                isFullScreen ? "text-slate-400 hover:text-white" : "text-slate-550 hover:text-indigo-600"
              )}
              title={isMuted ? "Ativar Áudio" : "Mutar Áudio"}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className={cn(
                "transition-all cursor-pointer flex items-center justify-center gap-1.5 font-black text-xs uppercase px-3.5 py-2 rounded-xl border leading-none h-10",
                isFullScreen 
                  ? "text-rose-455 text-rose-400 border-rose-500/30 hover:border-rose-500 bg-rose-500/10 hover:bg-rose-600 hover:text-white" 
                  : "text-indigo-700 border-indigo-205 border-indigo-200 hover:border-indigo-305 hover:text-indigo-800 bg-indigo-50/50 hover:bg-indigo-50"
              )}
              title={isFullScreen ? "Sair da Tela Cheia" : "Assistir em Tela Cheia"}
            >
              {isFullScreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Sair da Tela Cheia</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                  <span className="font-extrabold text-[10px] tracking-wide">Assistir em Tela Cheia</span>
                </>
              )}
            </button>

            <div className={cn(
              "text-[9px] font-black italic px-2.5 py-1.5 rounded-xl uppercase tracking-wider hidden md:block select-none",
              isFullScreen 
                ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400" 
                : "bg-indigo-50 border border-indigo-150 text-indigo-700"
            )}>
              Preenchimento Automotivo
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
