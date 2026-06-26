import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { 
  HelpCircle, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  UserPlus, 
  Filter, 
  TrendingUp, 
  Info, 
  Lightbulb, 
  ArrowRight,
  Bookmark,
  Award,
  BookOpen,
  CheckCircle,
  Calendar,
  Globe,
  Target,
  MessageSquare,
  DollarSign,
  Calculator,
  Stethoscope,
  Package,
  Clock,
  ClipboardList,
  FileText,
  Users2,
  Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { InteractiveVideoPlayer } from './InteractiveVideoPlayer';

interface TourStep {
  title: string;
  subtitle?: string;
  description: string;
  route: string;
  target: string;
  icon: React.ComponentType<any>;
  badge: string;
}

const tourSteps: TourStep[] = [
  {
    title: "Bem-Vindo ao Treinamento Stark! 🚀",
    subtitle: "Aprenda a operar o ClinicFlow AI do zero em poucos passos.",
    description: "Olá! Eu sou o Jarvis, seu assistente Stark. Vou te guiar passo a passo, de aba em aba, para você dominar todo o ClinicFlow AI com riqueza de detalhes de forma prática. Vamos começar nosso Onboarding?",
    route: "/",
    target: "body",
    icon: Sparkles,
    badge: "Boas-Vindas"
  },
  {
    title: "Sua Central de Inteligência Integrada",
    subtitle: "Insights preditivos e dados operacionais da clínica.",
    description: "Este é o seu Dashboard Principal. Nele agrupamos os indicadores cruciais de faturamento líquido, taxa de absenteísmo médio, ticket histórico do paciente e pendências geradas pela inteligência artificial.",
    route: "/",
    target: "header h1",
    icon: TrendingUp,
    badge: "Visão Geral"
  },
  {
    title: "Formulário Prático para Novo Agendamento",
    subtitle: "Aprenda sobre cada campo do agendamento.",
    description: "Nós abrimos o painel de marcação de consulta de forma automática para você. Veja como os dados estão divididos:\n\n1. Paciente: Escolha quem receberá o serviço ou crie um novo na hora de forma ágil.\n2. Profissional: Defina o profissional de saúde responsável por executar o protocolo.\n3. Procedimento ou Combo: Identifique qual tratamento ou plano será faturado.\n4. Horário e Tempo: Programe a duração da consulta em minutos e escolha dia e hora na agenda.\n5. Status da Consulta: Defina se está 'Confirmado', 'Agendado' ou se o paciente já 'Chegou' na sala de espera para monitoramento operacional.",
    route: "/agenda",
    target: "#onboarding-btn-new-appointment",
    icon: Calendar,
    badge: "Novo Agendamento"
  },
  {
    title: "Gestão Completa de Fichas de Pacientes",
    subtitle: "Mantenha a base de dados unificada.",
    description: "Na aba Pacientes, gerencie o histórico clínico e cadastros de todos os seus clientes. O cabeçalho abriga os atalhos para cadastrar novos perfis e segmentar buscas avançadas instantaneamente.",
    route: "/pacientes",
    target: "#onboarding-btn-new-patient",
    icon: UserPlus,
    badge: "Pacientes"
  },
  {
    title: "Cadastro Prático de Novos Pacientes",
    subtitle: "Campos essenciais para faturamento e automação.",
    description: "Abrimos para você o formulário de cadastro de paciente. Para obter o máximo de conversão, estes quatro dados são fundamentais:\n\n1. Nome Completo: Identificação única primária do paciente no sistema.\n2. Celular / WhatsApp: O dado mais importante! Através dele nossa inteligência artificial Stark dispara lembretes automatizados 24 horas antes do horário e envia recomendações de pós-operatório.\n3. CPF: Obrigatório para relatórios fiscais, recibos e notas fiscais automáticas.\n4. Canal de Origem (Indicação/Redes): Indique se o paciente veio do Instagram, Indicação ou Google Search para calcularmos qual canal obteve maior retorno financeiro.",
    route: "/pacientes",
    target: "#onboarding-btn-new-patient",
    icon: Info,
    badge: "Cadastro"
  },
  {
    title: "Segmentação por Filtros Avançados",
    subtitle: "Expanda as ferramentas de busca inteligente.",
    description: "Para segmentar sua base de dados instantaneamente, clique no botão 'Filtros Avançados' para liberar o painel extra de filtragem refinada.",
    route: "/pacientes",
    target: "#onboarding-btn-adv-filters",
    icon: Filter,
    badge: "Filtros"
  },
  {
    title: "Como Configurar Filtros Avançados",
    subtitle: "Segmentação cruzada para aniversariantes ou campanhas de captação.",
    description: "Neste menu extra, selecione a Origem do Paciente (ex: descobrir quem veio do Instagram) ou pelo Mês de Nascimento (perfeito para planejar presentes ou descontos especiais em datas comemorativas).",
    route: "/pacientes",
    target: "#onboarding-select-referral",
    icon: Lightbulb,
    badge: "Segmentações"
  },
  {
    title: "Comercial e CRM Integrado",
    subtitle: "Acompanhe e converta novas oportunidades.",
    description: "Esta é a aba Comercial. Aqui, todo interessado (Lead) que interage com a clínica é representado por um card de pipeline visual. Você pode arrastá-los entre as etapas de avaliação, orçamento e fechamento.",
    route: "/comercial",
    target: "body",
    icon: Target,
    badge: "Comercial"
  },
  {
    title: "Controle de Mensagens no WhatsApp",
    subtitle: "Acompanhe os disparos inteligentes em tempo real.",
    description: "Aqui você monitora o painel de atendimento e o status das campanhas de pós-operatório, lembretes de consulta e reengajamento automático que a IA envia para os seus contatos.",
    route: "/whatsapp",
    target: "body",
    icon: MessageSquare,
    badge: "WhatsApp"
  },
  {
    title: "Fluxo de Caixa e Tesouraria",
    subtitle: "Acompanhe de perto as metas de capital.",
    description: "Na aba Financeiro, você acompanha as entradas e saídas da clínica. Ao registrar um lançamento associado ao prontuário, o sistema calcula o LTV (Lifetime Value) correspondente dele automaticamente.",
    route: "/financeiro",
    target: "body",
    icon: DollarSign,
    badge: "Financeiro"
  },
  {
    title: "Controle Inteligente de Custos e Insumos",
    subtitle: "Gestão integrada de estoque de materiais gringos.",
    description: "Na aba de Custos e Precificação, gerencie todo o estoque clínico de luvas, agulhas, cânulas e ampolas. O sistema monitora a quantidade física atual contra o mínimo estipulado para evitar falta de insumos.",
    route: "/custos",
    target: "body",
    icon: Calculator,
    badge: "Insumos"
  },
  {
    title: "Registro de Custos e Estoque Mínimo",
    subtitle: "Configure insumos de forma fracionada e assertiva.",
    description: "Para cada insumo no estoque comercial, configure as seguintes divisões:\n\n1. Nome do Item: Denominação do item para controle.\n2. Tipo de Unidade de Compra: Informe se o item é adquirido por Pacote fechado, por Unidade individual ou se é comprado por Peso (Kilo).\n3. Valor de Custo Unitário: O valor individual pago por item ou grama fracionada.\n4. Estoque de Segurança (Mínimo): O valor em quantidade mínima que disparará avisos automáticos para reabastecimento.",
    route: "/custos",
    target: "body",
    icon: Bookmark,
    badge: "Cadastro de Insumos"
  },
  {
    title: "Projetando Seus Serviços e Procedimentos",
    subtitle: "Defina seus protocolos clínicos e preços.",
    description: "Na aba de Serviços, gerencie os tratamentos disponibilizados na sua clínica médico-estética de alto padrão. Cada serviço tem durações específicas e precificação.",
    route: "/servicos",
    target: "#onboarding-btn-new-service",
    icon: Stethoscope,
    badge: "Serviços"
  },
  {
    title: "Estrutura do Cadastro de Serviços",
    subtitle: "Vincule gastos de materiais e calcule margem líquida.",
    description: "Para criar ou editar serviços, o formulário se divide em:\n\n1. Nome e Categoria: Classificação para busca e relatórios.\n2. Preço de Venda: Valor final cobrado do paciente.\n3. Duração Média: Tempo exigido que ficará reservado no seu grid de horários da agenda.\n4. Insumos Associados: Vincule quais itens do estoque de materiais (ex: Toxina, Luvas, Seringa) são consumidos por padrão a cada sessão de consulta do serviço. O ClinicFlow deduzirá o material automaticamente no estoque e calculará a margem líquida real de lucro do procedimento!",
    route: "/servicos",
    target: "#onboarding-btn-new-service",
    icon: Info,
    badge: "Margem de Lucro"
  },
  {
    title: "Venda Recorrente com Planos e Pacotes",
    subtitle: "Crie combos de alta conversão e atração.",
    description: "Na aba de Pacotes, projete combos comerciais contendo múltiplos procedimentos de sessões consecutivas repetidas para aumentar o ticket médio e fidelizar o cliente no longo prazo.",
    route: "/pacotes",
    target: "#onboarding-btn-new-package",
    icon: Package,
    badge: "Planos"
  },
  {
    title: "Como Configurar Planos e Pacotes",
    subtitle: "Agrupe sessões recorrentes com inteligência clínica.",
    description: "O formulário de registro de planos e pacotes de tratamento oferece as seguintes opções:\n\n1. Título do Combo: Nome marcante do pacote comercial.\n2. Quantidade Total de Sessões: Quantidade de vezes que o cliente virá à clínica realizar os atendimentos.\n3. Intervalo de Retorno: Tempo médio de dias ideal entre cada aplicação das sessões (ex. 15 dias).\n4. Valor com Desconto: Percentual promocional ou valor reduzido em relação às sessões avulsas.",
    route: "/pacotes",
    target: "#onboarding-btn-new-package",
    icon: Info,
    badge: "Criar Pacote"
  },
  {
    title: "Alertas de Retornos Programados",
    subtitle: "Acompanhamento do pós-procedimento focado em fidelização.",
    description: "A tela de Retornos avisa de forma preditiva quais pacientes já alcançaram a data limite ideal para uma consulta de retoque ou nova avaliação, elevando o retorno ativo.",
    route: "/retornos",
    target: "body",
    icon: Clock,
    badge: "Retornos"
  },
  {
    title: "Prontuários e Evoluções Clínicas",
    subtitle: "Acompanhamento de saúde digital integrado.",
    description: "Esta aba agrupa as evoluções clínicas, laudos de exames, anamneses e fotos de comparação antes-depois no perfil de cada paciente em conformidade com as normas sanitárias.",
    route: "/prontuarios",
    target: "body",
    icon: ClipboardList,
    badge: "Prontuários"
  },
  {
    title: "Divisão por Pastas de Arquivos Digitais",
    subtitle: "Organização empresarial rápida sem papéis.",
    description: "Na aba Documentos, organizamos todos os termos da clínica. O formulário de Criar Pasta solicita:\n\n1. Nome do Diretório: Crie nomes funcionais (ex: 'Termos de Consentimento', 'Laudos Externos', 'Contratos').\n2. Nível de Acesso: Facilita que a recepção e corpo médico localizem e anexem arquivos em segundos sem burocracia física.",
    route: "/documentos",
    target: "#onboarding-btn-new-folder",
    icon: FileText,
    badge: "Nova Pasta"
  },
  {
    title: "Armazenamento em Nuvem com Upload de Arquivos",
    subtitle: "Anexe termos de consentimento, exames ou fotos.",
    description: "O painel de Upload de Arquivos Digitais auxilia na digitalização da papelada. Ele é dividido em:\n\n1. Pasta de Destino: Escolha em qual das pastas do diretório o arquivo será arquivado.\n2. Categoria do Arquivo: Informe o tipo do documento para filtros inteligentes (Anexo clínico, Termo legal, Exame complementar).\n3. Área de Drop: Arraste arquivos diretamente para a nuvem de qualquer dispositivo de forma instantânea.",
    route: "/documentos",
    target: "#onboarding-btn-upload-file",
    icon: FileText,
    badge: "Upload Digital"
  },
  {
    title: "Gestão de Equipe e Níveis de Acesso",
    subtitle: "Controle de médicos, recepção e permissões.",
    description: "Na aba Equipe, o formulário de convite e cadastro de especialistas se divide em:\n\n1. Dados Pessoais: Nome completo, endereço de e-mail e telefone móvel.\n2. Conselho Regional (CRM / CRO): Registro legal do especialista para validade de prescrições e laudos emitidos.\n3. Nível Hierárquico: Defina se o novo login terá nível de Administrador (acesso completo à faturas e configurações), Médico (foco em prontuários e agenda clínica) ou Recepcionista (controle de agenda básica e atendimentos).",
    route: "/equipe",
    target: "#onboarding-btn-invite-member",
    icon: Users2,
    badge: "Equipe"
  },
  {
    title: "Você Concluiu seu Onboarding! 🎉",
    subtitle: "Agora você está pronto para operar.",
    description: "Parabéns! Você completou todas as etapas do treinamento interativo Stark e aprendeu a usar o sistema por completo aba por aba. O botão flutuante de 'Dúvidas' estará sempre disponível no rodapé!",
    route: "/",
    target: "body",
    icon: CheckCircle,
    badge: "Finalizado"
  }
];

interface DoubtItem {
  id: string;
  question: string;
  category: string;
  targetStep: number;
  longSummary: string;
}

const doubtsDb: DoubtItem[] = [
  {
    id: "d1",
    question: "Como Cadastrar Novos Pacientes?",
    category: "Pacientes",
    targetStep: 4,
    longSummary: "Acesse a aba 'Pacientes' e clique em 'Novo Paciente' no cabeçalho direito. Informe os dados cadastrais básicos e salve."
  },
  {
    id: "d2",
    question: "Quais Dados são Cruciais para o Cadastro?",
    category: "Dados Cruciais",
    targetStep: 4,
    longSummary: "Os dados cruciais são Nome, WhatsApp/Telefone (essencial para as automações e lembretes por bot), CPF (relatórios fiscais) e Origem."
  },
  {
    id: "d3",
    question: "Como Configurar os Filtros Avançados?",
    category: "Buscas e Filtros",
    targetStep: 6,
    longSummary: "Acesse a aba 'Pacientes', clique em 'Filtros Avançados' e selecione a Origem do Paciente ou o Mês de Nascimento para pesquisar aniversariantes."
  },
  {
    id: "d4",
    question: "Como Fazer um Novo Agendamento?",
    category: "Agenda",
    targetStep: 2,
    longSummary: "Vá para a aba 'Agenda' e clique no botão 'Novo agendamento' no menu superior direito. Preencha os dados do horário e confirme."
  },
  {
    id: "d5",
    question: "Como Cadastrar Insumos e Estoque Mínimo?",
    category: "Estoque",
    targetStep: 11,
    longSummary: "Acesse 'Custos e Preços' e clique em 'Adicionar Custo / Insumo'. Defina o custo unitário e se é um pacote contendo embalagem interna ou se é por quilo."
  },
  {
    id: "d6",
    question: "Como Vincular Insumos a um Serviço?",
    category: "Precificação",
    targetStep: 13,
    longSummary: "Acesse 'Serviços', clique em 'Novo Serviço' ou selecione um para editar, e na janela de edição selecione os itens cadastrados no estoque vinculando a quantidade necessária."
  },
  {
    id: "d7",
    question: "Como Funciona o Histórico de Despesas de Insumos?",
    category: "Financeiro",
    targetStep: 10,
    longSummary: "Fica na aba 'Custos e Preços'. Toda vez que um atendimento é faturado consumindo insumos, uma linha de despesa é deitada no histórico no rodapé."
  },
  {
    id: "d8",
    question: "Como e Onde Configurar Combos de Tratamento?",
    category: "Pacotes",
    targetStep: 15,
    longSummary: "Vá na aba 'Pacotes' e clique em 'Novo pacote' para estruturar combos promocionais de sessões repetidas com descontos especiais."
  },
  {
    id: "d9",
    question: "Como Funciona a Pasta de Arquivos e Uploads?",
    category: "Documentos",
    targetStep: 19,
    longSummary: "Diga adeus ao papel. Na aba 'Documentos', clique em 'Nova Pasta' para criar divisões e depois em 'Upload Documentos' para carregar arquivos."
  },
  {
    id: "e1",
    question: "Como Cadastrar Equipe e Níveis de Acesso?",
    category: "Equipe",
    targetStep: 20,
    longSummary: "Vá na aba 'Equipe', clique em 'Convidar membro' e insira os dados do profissional e o nível hierárquico (médico, recepção, etc) de login."
  }
];

export function OnboardingTour() {
  const { isTourActive, currentTourStep, startTour, nextTourStep, prevTourStep, endTour } = useStore();
  const [isDoubtHubOpen, setIsDoubtHubOpen] = useState(false);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [doubtSearch, setDoubtSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'doubts' | 'video'>('doubts');
  
  const navigate = useNavigate();
  const location = useLocation();

  const isModalStep = isTourActive && [2, 4, 11, 13, 15, 18, 19, 20].includes(currentTourStep);

  // Listener to allow any external component to open the Doubt Hub using dispatchEvent
  useEffect(() => {
    const handleOpenHub = () => setIsDoubtHubOpen(true);
    window.addEventListener('open-doubt-hub', handleOpenHub);
    return () => window.removeEventListener('open-doubt-hub', handleOpenHub);
  }, []);

  // Handle route matching and automatic redirect during the tour
  useEffect(() => {
    if (!isTourActive) return;
    const stepConfig = tourSteps[currentTourStep];
    if (stepConfig && stepConfig.route !== location.pathname) {
      navigate(stepConfig.route);
    }
  }, [currentTourStep, isTourActive, location.pathname, navigate]);

  // Handle automatic open/close of respective registration modals during onboarding steps
  useEffect(() => {
    if (!isTourActive) {
      window.dispatchEvent(new CustomEvent('close-onboarding-modals'));
      return;
    }

    // Always clean up existing modals first on step changes
    window.dispatchEvent(new CustomEvent('close-onboarding-modals'));

    const stepConfig = tourSteps[currentTourStep];
    if (!stepConfig) return;

    // Wait a brief period for route changing and component mounting before showing modal
    const timer = setTimeout(() => {
      if (currentTourStep === 2) {
        window.dispatchEvent(new CustomEvent('open-onboarding-appointment-modal'));
      } else if (currentTourStep === 4) {
        window.dispatchEvent(new CustomEvent('open-onboarding-patient-modal'));
      } else if (currentTourStep === 11) {
        window.dispatchEvent(new CustomEvent('open-onboarding-cost-modal'));
      } else if (currentTourStep === 13) {
        window.dispatchEvent(new CustomEvent('open-onboarding-service-modal'));
      } else if (currentTourStep === 15) {
        window.dispatchEvent(new CustomEvent('open-onboarding-package-modal'));
      } else if (currentTourStep === 18) {
        window.dispatchEvent(new CustomEvent('open-onboarding-folder-modal'));
      } else if (currentTourStep === 19) {
        window.dispatchEvent(new CustomEvent('open-onboarding-upload-modal'));
      } else if (currentTourStep === 20) {
        window.dispatchEvent(new CustomEvent('open-onboarding-member-modal'));
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [currentTourStep, isTourActive, location.pathname]);

  // Handle tracking element bounding box for target highlight spotlight overlay
  useEffect(() => {
    if (!isTourActive) {
      setHighlightRect(null);
      return;
    }

    const stepConfig = tourSteps[currentTourStep];
    if (!stepConfig || stepConfig.target === 'body') {
      setHighlightRect(null);
      return;
    }

    const updatePosition = () => {
      const element = document.querySelector(stepConfig.target);
      if (element) {
        setHighlightRect(element.getBoundingClientRect());
      } else {
        setHighlightRect(null);
      }
    };

    updatePosition();
    
    // Periodically retry in case page is rendering / loading tabs asynchronously
    let attempts = 0;
    const interval = setInterval(() => {
      updatePosition();
      attempts++;
      if (attempts > 12) clearInterval(interval);
    }, 150);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isTourActive, currentTourStep, location.pathname]);

  const handleStartFullTour = () => {
    setIsDoubtHubOpen(false);
    startTour(0);
  };

  const handleResolveDoubtStep = (targetStep: number) => {
    setIsDoubtHubOpen(false);
    // Directly pre-set the specific step matching the user's doubt and active onboarding mode
    startTour(targetStep);
  };

  const filteredDoubts = doubtsDb.filter(d => 
    d.question.toLowerCase().includes(doubtSearch.toLowerCase()) || 
    d.category.toLowerCase().includes(doubtSearch.toLowerCase()) ||
    d.longSummary.toLowerCase().includes(doubtSearch.toLowerCase())
  );

  return (
    <>


      {/* 1. TOUR SPOTLIGHT HIGHLIGHT BOX */}
      {isTourActive && highlightRect && !isModalStep && (
        <div 
          className="fixed z-[90] border-3 border-indigo-500 rounded-2xl pointer-events-none transition-all duration-300 shadow-[0_0_0_1000px_rgba(15,23,42,0.6),0_0_30px_rgba(99,102,241,0.9)]"
          style={{
            top: highlightRect.top - 8,
            left: highlightRect.left - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16,
          }}
        />
      )}

      {/* 2. ACTIVE TOUR ASSISTANT DIALOG CONTAINER */}
      <AnimatePresence>
        {isTourActive && (
          <div className={cn(
            "fixed z-[100] select-none pointer-events-none transition-all duration-550 ease-out",
            isModalStep 
              ? "lg:right-8 lg:top-1/2 lg:-translate-y-1/2 lg:left-auto lg:bottom-auto lg:w-[480px] lg:max-w-[35vw] inset-x-0 bottom-4 flex justify-center p-4" 
              : "inset-x-0 bottom-4 sm:bottom-8 flex justify-center p-4"
          )}>
            <motion.div
              layout
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className={cn(
                "bg-slate-900 border-2 border-indigo-500/30 shadow-2xl pointer-events-auto relative overflow-hidden text-white shadow-indigo-950/20 transition-all duration-550 ease-out",
                isModalStep 
                  ? "max-w-md w-full p-6 md:p-8 rounded-[2rem]" 
                  : "max-w-2xl w-full p-8 md:p-10 rounded-[2.5rem]"
              )}
            >
              {/* Subtle tech grid backing */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1.5px,transparent_1.5px)] bg-[size:15px_15px] opacity-40" />
              <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative space-y-4">
                
                {/* Upper line: Badge and counter */}
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-indigo-400">
                  <div className="flex items-center gap-1.5 font-sans">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                    <span>{tourSteps[currentTourStep].badge}</span>
                  </div>
                  <span className="font-mono">
                    Etapa {currentTourStep + 1} de {tourSteps.length}
                  </span>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <h3 className="text-2xl font-black italic tracking-tight text-white uppercase">
                    {tourSteps[currentTourStep].title}
                  </h3>
                  {tourSteps[currentTourStep].subtitle && (
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
                      {tourSteps[currentTourStep].subtitle}
                    </p>
                  )}
                  <p className="text-sm text-slate-300 font-medium leading-relaxed whitespace-pre-line mt-3 text-justify">
                    {tourSteps[currentTourStep].description}
                  </p>
                </div>

                {/* Controls footer */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <button 
                    onClick={endTour}
                    className="text-xs text-slate-400 hover:text-white font-bold transition-all"
                  >
                    Sair do Onboarding
                  </button>

                  <div className="flex items-center gap-2">
                    {currentTourStep > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={prevTourStep}
                        className="h-9 px-3 text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800 rounded-xl font-bold"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Anterior
                      </Button>
                    )}

                    <Button
                      type="button"
                      onClick={() => {
                        if (currentTourStep < tourSteps.length - 1) {
                          nextTourStep();
                        } else {
                          endTour();
                        }
                      }}
                      className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black italic rounded-xl text-xs uppercase tracking-wider"
                    >
                      {currentTourStep === tourSteps.length - 1 ? 'Concluir' : 'Entendi, Próximo'}
                      <ChevronRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. HELP CENTER & DOUBTS HUB OVERLAY */}
      <AnimatePresence>
        {isDoubtHubOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDoubtHubOpen(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            />

            {/* Hub Modal */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative border border-slate-100"
            >
              
              {/* Close Button */}
              <button
                onClick={() => setIsDoubtHubOpen(false)}
                className="absolute top-6 right-6 p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors z-[120] cursor-pointer shadow-sm border border-slate-200"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Title & Description */}
              <div className="space-y-2 mb-4 text-center select-none">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-black text-[9px] uppercase rounded-full tracking-wide">
                  Central de Suporte Stark
                </span>
                <h2 className="text-2xl font-black text-slate-900 italic tracking-tight">
                  Como podemos ajudar no seu Onboarding?
                </h2>
                <p className="text-slate-500 text-xs font-semibold max-w-lg mx-auto leading-relaxed">
                  Aprenda de forma prática! Use nosso assistente de passos em tempo real ou assista ao nosso robô preenchendo os formulários clínico-estéticos nas vídeoaulas.
                </p>
              </div>

              {/* Tabs Selection */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-5 items-center w-full max-w-sm mx-auto select-none border border-slate-200/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('doubts')}
                  className={cn(
                    "flex-1 h-9 rounded-xl font-bold italic uppercase text-[10px] tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                    activeTab === 'doubts' 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                      : "text-slate-650 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80"
                  )}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Questões Principais</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('video')}
                  className={cn(
                    "flex-1 h-9 rounded-xl font-bold italic uppercase text-[10px] tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                    activeTab === 'video' 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                      : "text-slate-650 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80"
                  )}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Vídeoaulas do Onboarding</span>
                </button>
              </div>

              {activeTab === 'doubts' ? (
                <>
                  {/* Search Bar */}
                  <div className="relative mb-5 shrink-0">
                    <input 
                      type="text"
                      placeholder="Busque por sua dúvida (ex: cadastrar, filtro)..."
                      value={doubtSearch}
                      onChange={(e) => setDoubtSearch(e.target.value)}
                      className="w-full h-11 bg-slate-50 border border-slate-150 rounded-2xl px-5 font-bold text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Doubt Grid Cards & Quick Action */}
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0 no-scrollbar">
                    
                    {filteredDoubts.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 space-y-2">
                        <p className="font-extrabold italic text-sm">Nenhuma dúvida correspondente encontrada.</p>
                        <p className="text-xs">Tente buscar termos mais simples, ou clique abaixo para iniciar o guia completo.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredDoubts.map(d => (
                          <div 
                            key={d.id}
                            onClick={() => handleResolveDoubtStep(d.targetStep)}
                            className="p-5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-150 hover:border-indigo-200/50 rounded-2xl cursor-pointer transition-all flex flex-col justify-between text-left group animate-in fade-in zoom-in-95 duration-150"
                          >
                            <div className="space-y-2">
                              <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-500 text-[8px] font-black uppercase tracking-wider rounded-md">
                                {d.category}
                              </span>
                              <h4 className="font-extrabold text-sm text-slate-800 leading-snug group-hover:text-indigo-950 transition-colors">
                                {d.question}
                              </h4>
                              <p className="text-[11px] font-medium leading-relaxed text-slate-500">
                                {d.longSummary}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 text-indigo-600 font-black text-[10px] uppercase tracking-wider mt-4 italic">
                              <span>Aprender na Prática</span>
                              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 overflow-y-auto pr-1 min-h-0 no-scrollbar animate-in fade-in zoom-in-95 duration-150">
                  <InteractiveVideoPlayer />
                </div>
              )}

              {/* Bottom quick tour starter */}
              <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 select-none shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-900 leading-none">Novo por aqui?</p>
                    <p className="text-[10px] text-slate-500 font-semibold leading-normal mt-0.5">Faça o tour interativo por todas as abas do sistema.</p>
                  </div>
                </div>

                <Button
                  onClick={handleStartFullTour}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black italic rounded-xl px-6 h-11 uppercase text-[10px] tracking-wider w-full sm:w-auto"
                >
                  Iniciar Tour Completo
                </Button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
