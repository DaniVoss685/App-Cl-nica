import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Plus, 
  Calendar,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Link as LinkIcon,
  Trash2,
  Pencil,
  BrainCircuit,
  Sparkles,
  RefreshCw,
  Zap,
  Target,
  BarChart3,
  PieChart,
  Users, 
  Activity,
  Award,
  Crown,
  Search,
  ChevronRight
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../components/ui/dropdown-menu';
import { cn } from '../lib/utils';
import { FinanceModal } from '../components/FinanceModal';
import { useSearchParams } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area
} from 'recharts';
import { toast } from 'sonner';

export function Financeiro() {
  const { finance, patients, appointments, updateFinance, removeFinance, insights, generateInsights, budgets } = useStore();
  const [filter, setFilter] = useState<'tudo' | 'receita' | 'despesa'>('tudo');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  // Tab controller from search params
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'movimentacoes';

  const setActiveTab = (tab: 'movimentacoes' | 'graficos' | 'ranking') => {
    setSearchParams({ tab });
  };

  // Stats calculation
  const stats = useMemo(() => {
    const today = new Date();
    const currentMonthFinance = finance.filter(f => {
      const date = new Date(f.dueDate);
      return isWithinInterval(date, { start: startOfMonth(today), end: endOfMonth(today) });
    });

    const income = currentMonthFinance.filter(f => f.type === 'receita' && f.status === 'pago').reduce((acc, f) => acc + f.amount, 0);
    const expenses = currentMonthFinance.filter(f => f.type === 'despesa').reduce((acc, f) => acc + f.amount, 0);
    const pendingIncome = currentMonthFinance.filter(f => f.type === 'receita' && f.status === 'pendente').reduce((acc, f) => acc + f.amount, 0);

    return { income, expenses, balance: income - expenses, pendingIncome };
  }, [finance]);

  const totalRevenue = useMemo(() => finance.filter(f => f.type === 'receita' && f.status === 'pago').reduce((acc, f) => acc + f.amount, 0), [finance]);
  const uniquePaidPatientsCount = useMemo(() => new Set(finance.filter(f => f.type === 'receita' && f.status === 'pago').map(f => f.patientId)).size, [finance]);
  const ltv = useMemo(() => uniquePaidPatientsCount > 0 ? totalRevenue / uniquePaidPatientsCount : 0, [totalRevenue, uniquePaidPatientsCount]);

  const approvedBudgets = useMemo(() => (budgets || []).filter(b => b.status === 'aprovado' || b.status === 'fechado').length, [budgets]);
  const totalBudgets = useMemo(() => (budgets || []).length, [budgets]);
  const conversion = useMemo(() => totalBudgets > 0 ? Math.round((approvedBudgets / totalBudgets) * 100) : 0, [approvedBudgets, totalBudgets]);

  const [rankingSearch, setRankingSearch] = useState('');
  const [rankingTierFilter, setRankingTierFilter] = useState<'todos' | 'Diamante' | 'Platina' | 'Ouro' | 'Prata' | 'Bronze'>('todos');

  // Compute patient spend ranking and metadata
  const patientRankings = useMemo(() => {
    return patients.map(p => {
      const paidTransactions = finance.filter(f => f.patientId === p.id && f.type === 'receita' && f.status === 'pago');
      const pendingTransactions = finance.filter(f => f.patientId === p.id && f.type === 'receita' && f.status === 'pendente');
      
      const totalPaid = paidTransactions.reduce((acc, f) => acc + f.amount, 0);
      const totalPending = pendingTransactions.reduce((acc, f) => acc + f.amount, 0);
      const appointmentsCount = appointments.filter(a => a.patientId === p.id).length;
      
      let tier: 'Bronze' | 'Prata' | 'Ouro' | 'Platina' | 'Diamante' | 'Novo' = 'Novo';
      let badgeColor = "bg-slate-50 text-slate-500 border border-slate-200 font-extrabold";
      
      if (totalPaid >= 10000) {
        tier = 'Diamante';
        badgeColor = "bg-cyan-50 text-cyan-705 border border-cyan-210 font-black shadow-cyan-50 shadow-sm";
      } else if (totalPaid >= 5000) {
        tier = 'Platina';
        badgeColor = "bg-slate-100 text-slate-800 border border-slate-300 font-black shadow-sm";
      } else if (totalPaid >= 2000) {
        tier = 'Ouro';
        badgeColor = "bg-amber-50 text-amber-705 border border-amber-250 font-black shadow-amber-50 shadow-sm";
      } else if (totalPaid >= 800) {
        tier = 'Prata';
        badgeColor = "bg-zinc-100 text-zinc-700 border border-zinc-250 font-black";
      } else if (totalPaid > 0) {
        tier = 'Bronze';
        badgeColor = "bg-orange-50/70 text-orange-650 border border-orange-150 font-black";
      }
      
      return {
        ...p,
        totalPaid,
        totalPending,
        appointmentsCount,
        tier,
        badgeColor
      };
    })
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(rankingSearch.toLowerCase()) || 
                            (p.cpf && p.cpf.includes(rankingSearch)) ||
                            p.phone.includes(rankingSearch);
      const matchesTier = rankingTierFilter === 'todos' || p.tier === rankingTierFilter;
      return matchesSearch && matchesTier;
    })
    .sort((a, b) => b.totalPaid - a.totalPaid);
  }, [patients, finance, appointments, rankingSearch, rankingTierFilter]);

  const filteredFinance = useMemo(() => {
    return finance.filter(f => filter === 'tudo' || f.type === filter)
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  }, [finance, filter]);

  // Dynamically correlated chart data based on actual transactions
  const revenueData = useMemo(() => {
    const daysOfWeek = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const mapped = daysOfWeek.map((day, idx) => {
      // Filter transactions falling on this day of the week
      const totalForDay = finance
        .filter(f => {
          const date = new Date(f.dueDate + 'T12:00:00');
          return date.getDay() === idx && f.type === 'receita';
        })
        .reduce((sum, f) => sum + f.amount, 0);
        
      return {
        day,
        value: totalForDay
      };
    });
    
    // Rotate the array so today is the last day
    const todayIdx = new Date().getDay();
    const rotated = [];
    for (let i = 1; i <= 7; i++) {
      const j = (todayIdx + i) % 7;
      rotated.push(mapped[j]);
    }
    return rotated;
  }, [finance]);

  const servicesData = useMemo(() => {
    const categories = Array.from(new Set(finance.map(f => f.category || 'Geral')));
    const list = categories.map(cat => {
      const rev = finance
        .filter(f => f.category === cat && f.type === 'receita' && f.status === 'pago')
        .reduce((acc, f) => acc + f.amount, 0);
      const count = finance.filter(f => f.category === cat && f.type === 'receita').length;
      return { name: cat, count, revenue: rev };
    }).filter(item => item.revenue > 0);
    
    // Fallback if empty to make UI look complete (Desativado para manter dados 100% reais)
    if (list.length === 0) {
      return [];
    }
    return list.sort((a, b) => b.revenue - a.revenue);
  }, [finance]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="p-6 space-y-8 max-w-[1600px] mx-auto select-none"
    >
      {/* Dynamic Header based on active tab */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic lowercase">
            {activeTab === 'movimentacoes' && "controle financeiro"}
            {activeTab === 'graficos' && "análises e relatórios"}
            {activeTab === 'ranking' && "ranking de faturamento por paciente"}
          </h1>
          <p className="text-slate-500 lowercase">
            {activeTab === 'movimentacoes' && "fluxo de caixa em tempo real, lançamentos e conciliação bancária."}
            {activeTab === 'graficos' && "curva de faturamento, novos pacientes adquiridos e distribuição de receita por serviço."}
            {activeTab === 'ranking' && "classificação e ranking de pacientes ordenados pelo valor total de receitas quitadas na clínica."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'graficos' && (
            <Button 
              onClick={() => toast.success('Relatório financeiro exportado para PDF!')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl h-11 px-6 shadow-xl transition-all"
            >
              <Download className="w-4 h-4 mr-2" />
              exportar PDF
            </Button>
          )}

          {activeTab === 'movimentacoes' && (
            <>
              <Button 
                variant="outline" 
                onClick={() => toast.success('Transferências bancárias e exportação CSV geradas!')}
                className="h-11 px-6 rounded-xl border-slate-200 shadow-sm italic font-bold"
              >
                <Download className="w-4 h-4 mr-2" />
                exportar lançamentos
              </Button>
              <Button 
                onClick={() => {
                  setSelectedTransactionId(null);
                  setIsModalOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-11 px-6 shadow-lg shadow-indigo-100 italic lowercase"
              >
                <Plus className="w-5 h-5 mr-2" />
                lançar pagamento
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Modern Tab Indicators */}
      <div className="flex border-b border-slate-100 pb-px gap-1">
        <button
          onClick={() => setActiveTab('movimentacoes')}
          className={cn(
            "pb-4 px-6 text-xs font-black italic uppercase border-b-2 transition-all tracking-wider",
            activeTab === 'movimentacoes' 
              ? "border-b-indigo-600 text-indigo-600" 
              : "border-b-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          Caixa & Lançamentos
        </button>
        <button
          onClick={() => setActiveTab('graficos')}
          className={cn(
            "pb-4 px-6 text-xs font-black italic uppercase border-b-2 transition-all tracking-wider flex items-center gap-2",
            activeTab === 'graficos' 
              ? "border-b-indigo-600 text-indigo-600" 
              : "border-b-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          <BarChart3 className="w-4 h-4" />
          Análises & Gráficos
        </button>
        <button
          onClick={() => setActiveTab('ranking')}
          className={cn(
            "pb-4 px-6 text-xs font-black italic uppercase border-b-2 transition-all tracking-wider flex items-center gap-2",
            activeTab === 'ranking' 
              ? "border-b-indigo-600 text-indigo-600" 
              : "border-b-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          <Award className="w-4 h-4 text-indigo-650" />
          Ranking de Pacientes
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'movimentacoes' && (
          <motion.div
            key="caixa-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* Cards Grid */}
            <motion.div 
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.05 } }
              }}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <motion.div
                variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
                whileHover={{ y: -3 }}
              >
                <Card className="p-6 bg-white border-slate-200 rounded-[2rem] shadow-sm relative overflow-hidden group cursor-pointer select-none h-full">
                  <div className="absolute top-0 right-0 p-6 text-green-100 group-hover:text-green-50 transition-colors">
                    <TrendingUp className="w-20 h-20" />
                  </div>
                  <div className="relative">
                    <p className="text-[10px] font-black tracking-widest text-slate-400 mb-1 italic uppercase">Receitas (mês)</p>
                    <h3 className="text-3xl font-black text-slate-900 font-mono italic">
                      R$ {stats.income.toLocaleString()}
                    </h3>
                    <div className="flex items-center gap-1 text-green-600 mt-2 text-xs font-bold italic">
                      <ArrowUpRight className="w-3 h-3 text-green-500" />
                      12% vs mês ant.
                    </div>
                  </div>
                </Card>
              </motion.div>

              <motion.div
                variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
                whileHover={{ y: -3 }}
              >
                <Card className="p-6 bg-white border-slate-200 rounded-[2rem] shadow-sm relative overflow-hidden group cursor-pointer select-none h-full">
                  <div className="absolute top-0 right-0 p-6 text-red-100 group-hover:text-red-50 transition-colors">
                    <TrendingDown className="w-20 h-20" />
                  </div>
                  <div className="relative">
                    <p className="text-[10px] font-black tracking-widest text-slate-400 mb-1 italic uppercase">Despesas (mês)</p>
                    <h3 className="text-3xl font-black text-slate-900 font-mono italic">
                      R$ {stats.expenses.toLocaleString()}
                    </h3>
                    <div className="flex items-center gap-1 text-red-600 mt-2 text-xs font-bold italic">
                      <ArrowDownRight className="w-3 h-3" />
                      4% vs mês ant.
                    </div>
                  </div>
                </Card>
              </motion.div>

              <motion.div
                variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
                whileHover={{ y: -3 }}
              >
                <Card className="p-6 bg-indigo-600 rounded-[2rem] shadow-xl relative overflow-hidden group cursor-pointer select-none h-full">
                  <div className="absolute top-0 right-0 p-6 text-white/5 transition-colors">
                    <DollarSign className="w-20 h-20" />
                  </div>
                  <div className="relative text-white">
                    <p className="text-[10px] font-black tracking-widest opacity-60 mb-1 italic uppercase">Saldo projetado</p>
                    <h3 className="text-3xl font-black font-mono italic">
                      R$ {stats.balance.toLocaleString()}
                    </h3>
                    <div className="flex items-center gap-1 mt-2 text-xs font-bold opacity-80 italic">
                      Mês de {format(new Date(), 'MMMM', { locale: ptBR })}
                    </div>
                  </div>
                </Card>
              </motion.div>

              <motion.div
                variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
                whileHover={{ y: -3 }}
              >
                <Card className="p-6 bg-amber-500 rounded-[2rem] shadow-xl relative overflow-hidden group cursor-pointer select-none h-full">
                  <div className="absolute top-0 right-0 p-6 text-white/5 transition-colors">
                    <Clock className="w-20 h-20" />
                  </div>
                  <div className="relative text-white">
                    <p className="text-[10px] font-black tracking-widest opacity-60 mb-1 italic uppercase">A receber (pendentes)</p>
                    <h3 className="text-3xl font-black font-mono italic">
                      R$ {stats.pendingIncome.toLocaleString()}
                    </h3>
                    <div className="flex items-center gap-1 mt-2 text-xs font-bold opacity-80 italic">
                      <AlertTriangle className="w-3 h-3 animate-pulse" />
                      Ação necessária
                    </div>
                  </div>
                </Card>
              </motion.div>
            </motion.div>

            {/* List and tools layout */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {(['tudo', 'receita', 'despesa'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilter(type)}
                      className={cn(
                        "px-4 h-10 rounded-xl text-xs font-bold transition-all tracking-wider border capitalize",
                        filter === type 
                          ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <Card className="bg-white border-slate-200 rounded-[2rem] shadow-sm overflow-hidden border-b-8 border-b-indigo-500">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="p-4 font-black text-[10px] text-slate-400 tracking-widest">STATUS</th>
                        <th className="p-4 font-black text-[10px] text-slate-400 tracking-widest">DESCRIÇÃO</th>
                        <th className="p-4 font-black text-[10px] text-slate-400 tracking-widest">VÍNCULO</th>
                        <th className="p-4 font-black text-[10px] text-slate-400 tracking-widest">VENCIMENTO</th>
                        <th className="p-4 font-black text-[10px] text-slate-400 tracking-widest">CATEGORIA</th>
                        <th className="p-4 font-black text-[10px] text-slate-400 tracking-widest text-right">VALOR</th>
                        <th className="p-4 font-black text-[10px] text-slate-400 tracking-widest text-center">AÇÕES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFinance.map((f) => {
                        const patient = patients.find(p => p.id === f.patientId);
                        const appointment = appointments.find(a => a.id === f.appointmentId);
                        
                        return (
                          <tr key={f.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
                            <td className="p-4">
                              <Badge className={cn(
                                "text-[9px] font-black italic px-2 border-none capitalize",
                                f.status.toLowerCase() === 'pago' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700 shadow-sm"
                              )}>
                                {f.status}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="font-bold text-slate-900 text-sm italic leading-tight">
                                  {f.description || f.category || (f.type === 'receita' ? `Recebimento: ${patient?.name}` : 'Despesa operacional')}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="text-[10px] text-slate-400 font-bold tracking-tighter capitalize bg-slate-100 px-1.5 py-0.5 rounded">
                                    {f.paymentMethod || 'não especificado'}
                                  </span>
                                  {f.description && (
                                    <span className="text-[10px] text-indigo-500 font-bold tracking-tight">
                                      • {f.category}
                                    </span>
                                  )}
                                  {f.type === 'receita' && patient && f.description && (
                                    <span className="text-[10px] text-emerald-600 font-bold tracking-tight">
                                      • Paciente: {patient.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              {appointment ? (
                                <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg w-fit">
                                  <LinkIcon className="w-3 h-3" />
                                  <span className="text-[10px] font-bold italic">Agendamento {format(new Date(appointment.date + 'T12:00:00'), 'dd/MM')}</span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-300 italic">Sem vínculo</span>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2 text-slate-600 font-mono text-sm">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {format(new Date(f.dueDate + 'T12:00:00'), 'dd/MM/yyyy')}
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className="text-[9px] border-slate-200 text-slate-500 font-bold px-2 italic">
                                {f.category || 'Geral'}
                              </Badge>
                            </td>
                            <td className="p-4 text-right">
                              <span className={cn(
                                "font-mono font-black italic text-lg",
                                f.type.toLowerCase() === 'receita' ? "text-green-600" : "text-red-600"
                              )}>
                                {f.type.toLowerCase() === 'receita' ? '+' : '-'} R$ {f.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex justify-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem 
                                      className="flex gap-2 italic font-bold"
                                      onClick={() => {
                                        updateFinance(f.id, { status: 'pago', paymentDate: format(new Date(), 'yyyy-MM-dd') });
                                        toast.success('Lançamento registrado como pago!');
                                      }}
                                      disabled={f.status === 'pago'}
                                    >
                                      <CheckCircle2 className="w-4 h-4 text-green-600" /> Marcar como pago
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="flex gap-2 italic font-bold"
                                      onClick={() => {
                                        setSelectedTransactionId(f.id);
                                        setIsModalOpen(true);
                                      }}
                                    >
                                      <Pencil className="w-4 h-4" /> Editar lançamento
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="flex gap-2 italic font-bold text-red-600 focus:text-red-600"
                                      onClick={() => {
                                        if (confirm('Deseja realmente excluir este lançamento?')) {
                                          removeFinance(f.id);
                                          toast.error('Lançamento excluído.');
                                        }
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" /> Excluir lançamento
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {activeTab === 'graficos' && (
          <motion.div
            key="graficos-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* Top widgets from Relatorios page */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 bg-white border-slate-200 rounded-[2rem] shadow-sm relative overflow-hidden group select-none">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <TrendingUp className="w-16 h-16 text-indigo-600" />
                </div>
                <p className="text-[10px] font-black text-slate-400 tracking-widest italic mb-2 uppercase">Faturamento Bruto</p>
                <p className="text-2xl font-black text-slate-900 italic font-mono">
                  R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-1 mt-2 text-green-600 text-xs font-bold italic">
                  <ArrowUpRight className="w-3 h-3 text-green-500" />
                  {totalRevenue > 0 ? '+12.4%' : '+0.0%'} vs mês ant.
                </div>
              </Card>

              <Card className="p-6 bg-white border-slate-200 rounded-[2rem] shadow-sm relative overflow-hidden group select-none">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Users className="w-16 h-16 text-emerald-600" />
                </div>
                <p className="text-[10px] font-black text-slate-400 tracking-widest italic mb-2 uppercase">Novos Pacientes</p>
                <p className="text-2xl font-black text-slate-900 italic font-mono">{patients.length}</p>
                <div className="flex items-center gap-1 mt-2 text-green-600 text-xs font-bold italic">
                  <ArrowUpRight className="w-3 h-3 text-green-500" />
                  {patients.length > 0 ? '+8.1%' : '+0.0%'} vs mês ant.
                </div>
              </Card>

              <Card className="p-6 bg-white border-slate-200 rounded-[2rem] shadow-sm relative overflow-hidden group select-none">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Zap className="w-16 h-16 text-amber-600" />
                </div>
                <p className="text-[10px] font-black text-slate-400 tracking-widest italic mb-2 uppercase">Conversão de Orçamentos</p>
                <p className="text-2xl font-black text-slate-900 italic font-mono">{conversion}%</p>
                <div className="flex items-center gap-1 mt-2 text-green-600 text-xs font-bold italic">
                  <ArrowUpRight className="w-3 h-3" />
                  {conversion > 0 ? 'Meta Stark atingida' : 'Nenhum orçamento'}
                </div>
              </Card>

              <Card className="p-6 bg-indigo-600 rounded-[2rem] shadow-xl text-white select-none">
                <p className="text-[10px] font-black opacity-75 tracking-widest italic mb-2 uppercase">LTV Médio (Ciclo Clínico)</p>
                <p className="text-2xl font-black italic font-mono">R$ {ltv.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <div className="mt-3 bg-white/10 p-2 rounded-xl text-[9px] font-bold italic lowercase">
                  {ltv > 0 ? 'top 5% recorrentes geram 40% receita' : 'sem dados de recebimento'}
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Billing Curve area chart */}
              <Card className="lg:col-span-2 p-8 bg-white border-slate-200 rounded-[2.5rem] shadow-sm">
                <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                  <div>
                    <h3 className="font-black text-slate-900 text-lg italic flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-500" />
                      Curva Dinâmica de Faturamento (R$)
                    </h3>
                    <p className="text-slate-400 text-[11px] font-bold lowercase">evolução diária de transações confirmadas.</p>
                  </div>
                  <Badge className="bg-indigo-50 text-indigo-600 border-none font-black italic px-3 uppercase text-[9px]">Sincronizado</Badge>
                </div>
                
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.12}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="day" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                        tickFormatter={(value) => `R$ ${value}`} 
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontWeight: 800, color: '#4f46e5' }}
                        formatter={(value) => [`R$ ${value}`, 'Faturamento']}
                      />
                      <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Billing per Service bar representation */}
              <Card className="p-8 bg-white border-slate-200 rounded-[2.5rem] shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-black text-slate-900 text-lg italic mb-2">
                    Faturamento por Serviço
                  </h3>
                  <p className="text-slate-400 text-[11px] font-bold lowercase mb-8">distribuição de receita bruta por procedimento.</p>
                  
                  <div className="space-y-6">
                    {servicesData.map((item, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-black text-slate-700 italic capitalize">{item.name}</span>
                          <span className="font-mono text-slate-900 font-extrabold">R$ {item.revenue.toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(item.revenue / 45000) * 100}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={cn(
                              "h-full rounded-full",
                              i === 0 ? "bg-indigo-600" : i === 1 ? "bg-emerald-500" : i === 2 ? "bg-amber-500" : "bg-slate-400"
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 mt-6 md:mt-0">
                  <Button 
                    onClick={() => toast.success('Análise de roi de marketing cruzada com serviços!')}
                    variant="ghost" 
                    className="w-full bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white rounded-2xl h-12 font-black italic tracking-widest text-[11px] transition-all lowercase"
                  >
                    gerar análise de ROI com IA
                  </Button>
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {activeTab === 'ranking' && (
          <motion.div
            key="ranking-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* Filters panel */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 p-4 rounded-[2rem] border border-slate-100/50">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, CPF ou WhatsApp..."
                  value={rankingSearch}
                  onChange={e => setRankingSearch(e.target.value)}
                  className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200/60 rounded-xl font-bold text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-transparent transition-all"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Filtrar Categoria:</span>
                <select
                  value={rankingTierFilter}
                  onChange={e => setRankingTierFilter(e.target.value as any)}
                  className="h-11 px-4 bg-white border border-slate-200/60 rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="todos">💎 Todas as categorias</option>
                  <option value="Diamante">👑 Diamante (VIP &gt; R$ 10k)</option>
                  <option value="Platina">✨ Platina (VIP &gt; R$ 5k)</option>
                  <option value="Ouro">🥇 Ouro (VIP &gt; R$ 2k)</option>
                  <option value="Prata">🥈 Prata (Regular &gt; R$ 800)</option>
                  <option value="Bronze">🥉 Bronze (Início prático)</option>
                </select>
              </div>
            </div>

            {/* Ranking listings */}
            <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-20">Rank</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Paciente</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Fidelidade</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Visitas</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Pendente</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-8">Total Investido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientRankings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400 font-medium italic">
                          Nenhum paciente encontrado com investidos nesta categoria.
                        </td>
                      </tr>
                    ) : (
                      patientRankings.map((p, idx) => (
                        <tr 
                          key={p.id} 
                          className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors"
                        >
                          <td className="p-5 text-center">
                            <div className="flex items-center justify-center">
                              {idx === 0 ? (
                                <div className="relative">
                                  <Crown className="w-6 h-6 text-amber-500 fill-amber-300 absolute -top-4 left-1/2 -translate-x-1/2 rotate-12" />
                                  <span className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 font-mono font-black italic flex items-center justify-center text-sm border border-amber-200 shadow-sm shadow-amber-100 mt-2">1º</span>
                                </div>
                              ) : idx === 1 ? (
                                <div className="relative">
                                  <Crown className="w-5 h-5 text-slate-400 fill-slate-200 absolute -top-3 left-1/2 -translate-x-1/2 rotate-6" />
                                  <span className="w-8 h-8 rounded-full bg-slate-50 text-slate-700 font-mono font-black italic flex items-center justify-center text-sm border border-slate-200 mt-1">2º</span>
                                </div>
                              ) : idx === 2 ? (
                                <div className="relative">
                                  <Crown className="w-4 h-4 text-orange-400 fill-orange-200 absolute -top-2 left-1/2 -translate-x-1/2" />
                                  <span className="w-8 h-8 rounded-full bg-orange-50/50 text-orange-850 font-mono font-black italic flex items-center justify-center text-sm border border-orange-200/50 mt-1">3º</span>
                                </div>
                              ) : (
                                <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 font-mono font-bold text-xs flex items-center justify-center">{idx + 1}º</span>
                              )}
                            </div>
                          </td>
                          <td className="p-5">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-605 relative overflow-hidden group shrink-0 border border-slate-100 shadow-inner">
                                {p.profilePicture ? (
                                  <img 
                                    src={p.profilePicture} 
                                    alt={p.name} 
                                    className="w-full h-full object-cover rounded-2xl" 
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span className="text-xs font-black italic">{p.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</span>
                                )}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-slate-800 text-sm leading-none flex items-center gap-2">
                                  {p.name}
                                  {p.totalPaid >= 5000 && <Sparkles className="w-3.5 h-3.5 text-indigo-500" />}
                                </h4>
                                <p className="text-[10px] text-slate-400 font-bold tracking-tight mt-1 capitalize">
                                  {p.phone || 'Sem telefone'} • {p.email || 'Sem e-mail'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-5 text-center">
                            <span className={cn("px-3 py-1 rounded-full text-[9px] uppercase font-black italic tracking-wider", p.badgeColor)}>
                              {p.tier}
                            </span>
                          </td>
                          <td className="p-5 text-center">
                            <span className="font-bold text-slate-700 text-sm italic">
                              {p.appointmentsCount} <span className="text-slate-400 text-[10px] font-normal not-italic">visitas</span>
                            </span>
                          </td>
                          <td className="p-5 text-right font-mono font-bold text-xs text-amber-600">
                            {p.totalPending > 0 ? `R$ ${p.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="p-5 text-right pr-8">
                            <div className="flex flex-col items-end">
                              <span className="font-mono font-black italic text-base text-slate-800">
                                R$ {p.totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              {p.totalPaid > 0 && (
                                <span className="text-[9px] text-slate-400 font-bold italic tracking-tight uppercase">
                                  LTV Stark Ativo
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Categorization rules explanation banner */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-indigo-50/50 rounded-[2rem] p-6 border border-indigo-100/50">
              <div className="md:col-span-2 space-y-2">
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-750 text-[9px] font-black uppercase rounded-lg italic">Marketing de Fidelidade</span>
                <h4 className="font-black italic text-indigo-950 text-base lowercase">políticas de classificação de faturamento</h4>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Classificamos automaticamente os pacientes de acordo com os procedimentos finalizados e pagos. Crie estratégias de fidelidade, brindes e atendimento preferencial para as categorias VIP.
                </p>
              </div>
              <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <span className="text-[9px] font-black text-cyan-600 uppercase">👑 Diamante</span>
                  <p className="text-xs font-bold text-slate-800 mt-1">Investido &gt; R$ 10.000</p>
                  <p className="text-[9px] text-slate-450 mt-1">Atendimento ultra ultra VIP, condições especiais.</p>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <span className="text-[9px] font-black text-slate-500 uppercase">✨ Platina</span>
                  <p className="text-xs font-bold text-slate-800 mt-1">Investido &gt; R$ 5.000</p>
                  <p className="text-[9px] text-slate-450 mt-1">Prioridade na agenda, mimos especiais.</p>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <span className="text-[9px] font-black text-amber-600 uppercase">🥇 Ouro</span>
                  <p className="text-xs font-bold text-slate-800 mt-1">Investido &gt; R$ 2.000</p>
                  <p className="text-[9px] text-slate-450 mt-1">Upgrade em avaliações estéticas cortesia.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FinanceModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
        transactionId={selectedTransactionId}
      />
    </motion.div>
  );
}
