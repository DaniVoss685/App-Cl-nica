import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { motion } from 'motion/react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Target, 
  MessageSquare, 
  ChevronRight, 
  Plus, 
  Timer, 
  TrendingUp,
  BrainCircuit,
  UserPlus,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { OpportunityModal } from '../components/modals/OpportunityModal';

export function Comercial() {
  const { opportunities, removeOpportunity } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [defaultStage, setDefaultStage] = useState<string>('lead');

  const stages = [
    { id: 'lead', name: 'Lead', icon: UserPlus, color: 'bg-blue-500' },
    { id: 'contatado', name: 'Contatado', icon: MessageSquare, color: 'bg-amber-500' },
    { id: 'agendamento', name: 'Agendamento', icon: Timer, color: 'bg-indigo-500' },
    { id: 'pós-venda', name: 'Pós-Venda', icon: TrendingUp, color: 'bg-green-500' }
  ];

  // Calcular estatísticas reais de cada estágio do funil
  const stageStats = useMemo(() => {
    return stages.map(stage => {
      const stageOpps = (opportunities || []).filter(o => o.stage === stage.id);
      const count = stageOpps.length;
      const totalValue = stageOpps.reduce((sum, o) => sum + (o.value || 0), 0);
      return {
        ...stage,
        count,
        totalValue
      };
    });
  }, [opportunities]);

  // Gerar sugestão comercial dinâmica da IA Copilot com base nos dados do CRM
  const copilotSuggestion = useMemo(() => {
    const totalCount = (opportunities || []).length;
    const leads = (opportunities || []).filter(o => o.stage === 'lead');
    const contatados = (opportunities || []).filter(o => o.stage === 'contatado');

    if (totalCount === 0) {
      return {
        badge: 'Copilot Inativo',
        title: 'Ative sua Inteligência Comercial',
        message: 'Nenhuma oportunidade ativa cadastrada no momento. Cadastre seu primeiro lead ou potencial cliente clicando no botão abaixo para ativar a análise preditiva da IA.',
        buttonLabel: 'Cadastrar Primeiro Lead',
        action: () => {
          setSelectedOppId(null);
          setIsModalOpen(true);
        }
      };
    }

    if (leads.length > 0) {
      return {
        badge: 'IA Copilot',
        title: 'Sugestão Comercial do Dia',
        message: `Identificamos ${leads.length} leads no estágio inicial que ainda não foram contatados. Recomendamos disparar um roteiro de abordagem personalizada via WhatsApp para convertê-los.`,
        buttonLabel: 'Executar abordagem',
        action: () => {
          // Ação simulada ou abrir contato com o primeiro lead
          const firstLead = leads[0];
          if (firstLead.phone) {
            window.open(`https://wa.me/55${firstLead.phone.replace(/\D/g, '')}`, '_blank');
          } else {
            setSelectedOppId(firstLead.id);
            setIsModalOpen(true);
          }
        }
      };
    }

    if (contatados.length > 0) {
      return {
        badge: 'IA Copilot',
        title: 'Agendamento de Consulta',
        message: `Você possui ${contatados.length} oportunidades qualificadas que já receberam contato. Sugerimos formalizar a proposta de tratamento e oferecer vagas livres na agenda de amanhã.`,
        buttonLabel: 'Ver oportunidades',
        action: () => {}
      };
    }

    return {
      badge: 'IA Copilot',
      title: 'Acompanhamento de Funil',
      message: 'Excelente! Todos os seus leads foram qualificados e direcionados. Continue monitorando os orçamentos e agendamentos para manter a margem comercial estável.',
      buttonLabel: 'Monitorar Funil',
      action: () => {}
    };
  }, [opportunities]);

  const handleOpenNewOpportunity = () => {
    setSelectedOppId(null);
    setIsModalOpen(true);
  };

  const handleEditOpportunity = (id: string) => {
    setSelectedOppId(id);
    setIsModalOpen(true);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="p-6 space-y-8 max-w-[1600px] mx-auto font-sans"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic">Funil Comercial / CRM</h1>
          <p className="text-slate-500">Gestão de leads e conversão de novos protocolos.</p>
        </div>
        <Button 
          onClick={handleOpenNewOpportunity}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-11 px-6 shadow-lg shadow-indigo-200"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nova oportunidade
        </Button>
      </div>

      {/* Cards do Funil */}
      <motion.div 
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.08 } }
        }}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {stageStats.map((stage) => (
          <motion.div
            key={stage.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
            }}
            whileHover={{ y: -4 }}
          >
            <Card 
              onClick={() => {
                // Ao clicar no card, podemos pré-filtrar ou abrir um lead desse estágio se houver
                const firstOpp = (opportunities || []).find(o => o.stage === stage.id);
                if (firstOpp) {
                  handleEditOpportunity(firstOpp.id);
                } else {
                  setSelectedOppId(null);
                  setDefaultStage(stage.id);
                  setIsModalOpen(true);
                }
              }}
              className="p-6 bg-white border-slate-200 rounded-[2rem] shadow-sm relative group overflow-hidden border-b-4 border-b-transparent hover:border-b-indigo-500 transition-all cursor-pointer h-full select-none"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-300">
                <stage.icon className="w-16 h-16 text-indigo-500" />
              </div>
              <div className="relative">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 transition-transform group-hover:rotate-12", stage.color)}>
                  <stage.icon className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-slate-900 italic tracking-tight capitalize">{stage.name}</h3>
                <p className="text-slate-500 text-sm font-bold mt-1">
                  {stage.count} {stage.count === 1 ? 'oportunidade' : 'oportunidades'}
                </p>
                <p className="text-indigo-600 text-lg font-mono font-black mt-2">
                  {stage.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Próximas Ações / Lista de Oportunidades */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white border-slate-200 rounded-[2rem] shadow-sm overflow-hidden p-6">
            <h3 className="text-lg font-black text-slate-900 italic mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              Oportunidades Ativas
            </h3>
            
            <div className="space-y-4">
              {(!opportunities || opportunities.length === 0) ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-slate-350 mb-3" />
                  <p className="text-sm font-bold italic text-slate-600">Nenhuma oportunidade cadastrada no funil</p>
                  <p className="text-xs text-slate-450 mt-1 max-w-sm">Cadastre novos contatos ou leads no botão superior para monitorar seu andamento.</p>
                </div>
              ) : (
                opportunities.map((opp) => (
                  <div 
                    key={opp.id} 
                    onClick={() => handleEditOpportunity(opp.id)}
                    className="group p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center font-black italic text-indigo-600 text-xl border border-slate-100 uppercase select-none">
                        {opp.name?.slice(0, 2) || 'LD'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm italic tracking-tight capitalize">{opp.name}</h4>
                        <p className="text-xs text-slate-500">
                          Origem: {opp.source || 'Instagram'} • {opp.phone || 'Sem celular'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <Badge variant="outline" className={cn(
                        "bg-white text-[9px] font-bold border-slate-200 italic uppercase",
                        opp.stage === 'lead' ? 'text-blue-600 border-blue-200' :
                        opp.stage === 'contatado' ? 'text-amber-600 border-amber-200' :
                        opp.stage === 'agendamento' ? 'text-indigo-600 border-indigo-200' :
                        'text-green-600 border-green-200'
                      )}>
                        {opp.stage}
                      </Badge>
                      <span className="text-sm font-mono font-black text-slate-700">
                        {opp.value ? opp.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                      </span>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => handleEditOpportunity(opp.id)}
                        className="rounded-xl text-indigo-600 hover:bg-white hover:shadow-sm"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Painel Copilot da IA */}
        <div className="space-y-6">
          <Card className="p-8 bg-slate-950 border-slate-800 rounded-[2rem] shadow-2xl relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 p-8 opacity-20">
              <BrainCircuit className="w-24 h-24 text-indigo-500 animate-pulse" />
            </div>
            <div className="relative space-y-6">
              <Badge className="bg-indigo-600 text-white font-black italic border-none px-3 py-1 uppercase">
                {copilotSuggestion.badge}
              </Badge>
              <h3 className="text-2xl font-black italic leading-tight">
                {copilotSuggestion.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">
                {copilotSuggestion.message}
              </p>
              <Button 
                onClick={copilotSuggestion.action}
                className="w-full bg-white text-slate-900 hover:bg-slate-200 font-bold rounded-xl h-12 shadow-[0_0_20px_rgba(255,255,255,0.2)] italic"
              >
                {copilotSuggestion.buttonLabel}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <OpportunityModal 
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        opportunityId={selectedOppId}
        defaultStage={defaultStage}
      />
    </motion.div>
  );
}
