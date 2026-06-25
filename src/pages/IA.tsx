import { Card, CardContent } from '../components/ui/card';
import { useStore } from '../store';
import { Sparkles, ArrowRight, BrainCircuit, Users, TrendingUp, CalendarX, RefreshCw, Activity, DollarSign, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';

export function IA() {
  const { insights, generateInsights } = useStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('comercial');

  useEffect(() => {
    if (insights.length === 0) {
      generateInsights();
    }
  }, [insights.length, generateInsights]);

  const handleManualAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      generateInsights();
      setIsAnalyzing(false);
    }, 1500);
  };

  const filteredInsights = insights.filter(i => {
    const type = i.type.toLowerCase();
    const message = i.message.toLowerCase();
    
    if (activeTab === 'comercial') return type === 'oportunidade' || type === 'comercial';
    if (activeTab === 'operacional') return type === 'operacional' || type === 'gargalo' || message.includes('atrasado');
    if (activeTab === 'financeiro') return type === 'financeiro' || message.includes('pagamento') || message.includes('faturamento');
    if (activeTab === 'agenda') return type === 'agenda' || type === 'sugestão' || message.includes('horário') || message.includes('sessão');
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600 flex items-center gap-2">
            <BrainCircuit className="h-8 w-8 text-indigo-600" /> Central Inteligente
          </h1>
          <p className="text-sm text-slate-500">Sua IA assistente analisando dados da clínica em tempo real 24/7.</p>
        </div>
        <Button onClick={handleManualAnalysis} disabled={isAnalyzing} className="bg-indigo-600 hover:bg-indigo-700">
          <RefreshCw className={`mr-2 h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} /> 
          {isAnalyzing ? 'Analisando...' : 'Forçar Nova Análise'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-t-4 border-t-indigo-500">
          <CardContent className="p-4 pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Oportunidades de Venda</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">R$ 5.400</h3>
              </div>
              <TrendingUp className="h-5 w-5 text-indigo-500" />
            </div>
            <p className="text-xs text-indigo-600 mt-2 font-medium">+3 novas sugestões hoje</p>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-red-500">
          <CardContent className="p-4 pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Risco de Perda</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">2</h3>
              </div>
              <Users className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-xs text-red-600 mt-2 font-medium">Pacientes inativos</p>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-amber-500">
          <CardContent className="p-4 pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Faltas não repostas</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">1</h3>
              </div>
              <CalendarX className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-xs text-amber-600 mt-2 font-medium">Reagendamento pendente</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100 bg-slate-50/50 overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setActiveTab('comercial')}
            className={cn(
              "px-6 py-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2",
              activeTab === 'comercial' ? "border-indigo-600 text-indigo-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
            )}
          >
            <TrendingUp className="w-4 h-4" /> Comercial
          </button>
          <button 
            onClick={() => setActiveTab('operacional')}
            className={cn(
              "px-6 py-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2",
              activeTab === 'operacional' ? "border-indigo-600 text-indigo-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
            )}
          >
            <Activity className="w-4 h-4" /> Operacional
          </button>
          <button 
            onClick={() => setActiveTab('financeiro')}
            className={cn(
              "px-6 py-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2",
              activeTab === 'financeiro' ? "border-indigo-600 text-indigo-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
            )}
          >
            <DollarSign className="w-4 h-4" /> Financeiro
          </button>
          <button 
            onClick={() => setActiveTab('agenda')}
            className={cn(
              "px-6 py-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2",
              activeTab === 'agenda' ? "border-indigo-600 text-indigo-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
            )}
          >
            <CalendarIcon className="w-4 h-4" /> Agenda
          </button>
        </div>

        <div className="p-6 space-y-4">
          {filteredInsights.length > 0 ? (
            filteredInsights.map(insight => (
              <Card key={insight.id} className="border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6 justify-between items-start">
                    <div className="flex-1 space-y-3">
                       <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-indigo-600" />
                        <span className="font-semibold text-indigo-900">{insight.type} Identificado</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed text-base">
                        {insight.message}
                      </p>
                      
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4 relative">
                        <div className="absolute -top-3 left-4 bg-white px-2 text-xs font-medium text-slate-500 border border-slate-200 rounded-full">
                          Mensagem Sugerida (WhatsApp)
                        </div>
                        <p className="text-sm text-slate-600 font-medium italic">
                          "Olá! Tudo bem? Verificamos que já faz alguns dias desde seu último atendimento e gostaríamos de saber como você está. Podemos agendar seu retorno para acompanhar sua evolução?"
                        </p>
                        <div className="flex justify-end mt-2">
                           <Button variant="ghost" size="sm" className="text-indigo-600 h-8">Copiar Mensagem</Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                        <ArrowRight className="mr-2 h-4 w-4" /> {insight.actionRequested}
                      </Button>
                      <Button variant="outline" className="w-full">
                        Ignorar Sugestão
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="py-20 text-center">
              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 opacity-20" />
              </div>
              <h3 className="text-slate-900 font-bold">Tudo em dia!</h3>
              <p className="text-slate-500 text-sm mt-1">Nenhum insight novo para esta categoria no momento.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
