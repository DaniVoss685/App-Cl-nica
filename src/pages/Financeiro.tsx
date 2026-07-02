import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
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
  AlertCircle,
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
  ChevronRight,
  ArrowLeftRight
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
  const [searchTerm, setSearchTerm] = useState('');

  // Tab controller from search params
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'painel'; // 'painel' or 'ranking'

  const setActiveTab = (tab: 'painel' | 'ranking') => {
    setSearchParams({ tab });
  };

  // Month navigation state
  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Compute all available months dynamically
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    finance.forEach(f => {
      const dateStr = (f.status === 'pago' && f.paymentDate) ? f.paymentDate : f.dueDate;
      if (dateStr && dateStr.length >= 7) {
        months.add(dateStr.substring(0, 7)); // 'yyyy-MM'
      }
    });
    months.add(currentMonthStr);
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [finance, currentMonthStr]);

  const formatMonthLabel = (monthStr: string) => {
    if (monthStr === 'todos') return 'Todo o Histórico';
    const [year, month] = monthStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    const label = format(date, 'MMMM yyyy', { locale: ptBR });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const filtered = finance.filter(f => {
      const dateStr = (f.status === 'pago' && f.paymentDate) ? f.paymentDate : f.dueDate;
      if (selectedMonth === 'todos') return true;
      return dateStr && dateStr.startsWith(selectedMonth);
    });

    const income = filtered.filter(f => f.type === 'receita' && f.status === 'pago').reduce((acc, f) => acc + f.amount, 0);
    const expenses = filtered.filter(f => f.type === 'despesa').reduce((acc, f) => acc + f.amount, 0);
    const pendingIncome = filtered.filter(f => f.type === 'receita' && f.status === 'pendente').reduce((acc, f) => acc + f.amount, 0);

    return { income, expenses, balance: income - expenses, pendingIncome };
  }, [finance, selectedMonth]);

  // Overall metrics filtered by selected month/all-time
  const totalRevenue = useMemo(() => {
    return finance.filter(f => {
      const dateStr = (f.status === 'pago' && f.paymentDate) ? f.paymentDate : f.dueDate;
      const matchesMonth = selectedMonth === 'todos' || (dateStr && dateStr.startsWith(selectedMonth));
      return matchesMonth && f.type === 'receita' && f.status === 'pago';
    }).reduce((acc, f) => acc + f.amount, 0);
  }, [finance, selectedMonth]);

  const uniquePaidPatientsCount = useMemo(() => {
    return new Set(finance.filter(f => {
      const dateStr = (f.status === 'pago' && f.paymentDate) ? f.paymentDate : f.dueDate;
      const matchesMonth = selectedMonth === 'todos' || (dateStr && dateStr.startsWith(selectedMonth));
      return matchesMonth && f.type === 'receita' && f.status === 'pago';
    }).map(f => f.patientId)).size;
  }, [finance, selectedMonth]);

  const ltv = useMemo(() => uniquePaidPatientsCount > 0 ? totalRevenue / uniquePaidPatientsCount : 0, [totalRevenue, uniquePaidPatientsCount]);

  const approvedBudgets = useMemo(() => {
    return (budgets || []).filter(b => {
      const matchesMonth = selectedMonth === 'todos' || (b.createdAt && b.createdAt.startsWith(selectedMonth));
      return matchesMonth && (b.status === 'aprovado' || b.status === 'fechado');
    }).length;
  }, [budgets, selectedMonth]);

  const totalBudgets = useMemo(() => {
    return (budgets || []).filter(b => {
      const matchesMonth = selectedMonth === 'todos' || (b.createdAt && b.createdAt.startsWith(selectedMonth));
      return matchesMonth;
    }).length;
  }, [budgets, selectedMonth]);

  const conversion = useMemo(() => totalBudgets > 0 ? Math.round((approvedBudgets / totalBudgets) * 100) : 0, [approvedBudgets, totalBudgets]);

  // Ranking & Loyalty list filter states
  const [rankingSearch, setRankingSearch] = useState('');
  const [rankingTierFilter, setRankingTierFilter] = useState<'todos' | 'Diamante' | 'Platina' | 'Ouro' | 'Prata' | 'Bronze'>('todos');
  const [rankingSort, setRankingSort] = useState<'totalPaid' | 'paymentScore'>('totalPaid');

  // Compute patient spend ranking and metadata
  const patientRankings = useMemo(() => {
    return patients.map(p => {
      const paidTransactions = finance.filter(f => f.patientId === p.id && f.type === 'receita' && f.status === 'pago');
      const pendingTransactions = finance.filter(f => f.patientId === p.id && f.type === 'receita' && f.status === 'pendente');
      const cardTransactions = finance.filter(f => f.patientId === p.id && f.paymentMethod === 'cartão de crédito');
      
      const totalPaid = paidTransactions.reduce((acc, f) => acc + f.amount, 0);
      const totalPending = pendingTransactions.reduce((acc, f) => acc + f.amount, 0);
      const appointmentsCount = appointments.filter(a => a.patientId === p.id).length;
      
      let paymentScore = 100;
      
      if (pendingTransactions.length > 0) {
        paymentScore -= 10;
        paymentScore -= Math.min(30, Math.floor(totalPending / 100));
        
        const overdueTxs = pendingTransactions.filter(f => {
          const [year, month, day] = f.dueDate.split('-');
          const due = new Date(Number(year), Number(month) - 1, Number(day));
          return due < new Date();
        });
        
        if (overdueTxs.length > 0) {
          paymentScore -= 20;
          
          const oldestDue = overdueTxs.reduce((oldest, f) => {
            const [year, month, day] = f.dueDate.split('-');
            const due = new Date(Number(year), Number(month) - 1, Number(day));
            return due < oldest ? due : oldest;
          }, new Date());
          
          const diffDays = Math.ceil(Math.abs(new Date().getTime() - oldestDue.getTime()) / (1000 * 60 * 60 * 24));
          paymentScore -= Math.min(30, diffDays * 0.5);
        }
      }
      
      if (cardTransactions.length > 0) {
        const avgInstallments = cardTransactions.reduce((sum, f) => sum + (f.cardInstallments || 1), 0) / cardTransactions.length;
        if (avgInstallments > 10) {
          paymentScore -= 10;
        } else if (avgInstallments > 6) {
          paymentScore -= 5;
        }
      }
      
      paymentScore = Math.max(0, Math.round(paymentScore));

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
        paymentScore,
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
    .sort((a, b) => {
      if (rankingSort === 'paymentScore') {
        return a.paymentScore - b.paymentScore; // Show lowest scores (debtors/late payers) first
      }
      return b.totalPaid - a.totalPaid;
    });
  }, [patients, finance, appointments, rankingSearch, rankingTierFilter, rankingSort]);

  // Unified dashboard filtered finance transactions
  const filteredFinance = useMemo(() => {
    return finance.filter(f => {
      // 1. Month filter
      const dateStr = (f.status === 'pago' && f.paymentDate) ? f.paymentDate : f.dueDate;
      const matchesMonth = selectedMonth === 'todos' || (dateStr && dateStr.startsWith(selectedMonth));
      if (!matchesMonth) return false;

      // 2. Type filter
      const matchesType = filter === 'tudo' || f.type === filter;
      if (!matchesType) return false;

      // 3. Search term filter
      if (searchTerm) {
        const patient = patients.find(p => p.id === f.patientId);
        const pName = (patient?.name || '').toLowerCase();
        const desc = (f.description || '').toLowerCase();
        const cat = (f.category || '').toLowerCase();
        const method = (f.paymentMethod || '').toLowerCase();
        const term = searchTerm.toLowerCase();
        return pName.includes(term) || desc.includes(term) || cat.includes(term) || method.includes(term);
      }

      return true;
    }).sort((a, b) => {
      const dateA = (a.status === 'pago' && a.paymentDate) ? a.paymentDate : a.dueDate;
      const dateB = (b.status === 'pago' && b.paymentDate) ? b.paymentDate : b.dueDate;
      return dateB.localeCompare(dateA);
    });
  }, [finance, filter, selectedMonth, searchTerm, patients]);

  // Dynamically correlated chart data based on actual transactions
  const revenueData = useMemo(() => {
    if (selectedMonth === 'todos') {
      const monthsLabel = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return monthsLabel.map((month, idx) => {
        const total = finance
          .filter(f => {
            const dateStr = (f.status === 'pago' && f.paymentDate) ? f.paymentDate : f.dueDate;
            if (!dateStr || f.type !== 'receita') return false;
            const m = parseInt(dateStr.split('-')[1]);
            return m === idx + 1;
          })
          .reduce((sum, f) => sum + f.amount, 0);
        return { name: month, Faturamento: total };
      });
    } else {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      const numDays = new Date(year, month, 0).getDate();
      
      const data = [];
      for (let day = 1; day <= numDays; day++) {
        const dayStr = String(day).padStart(2, '0');
        const datePrefix = `${selectedMonth}-${dayStr}`;
        const total = finance
          .filter(f => {
            const dateStr = (f.status === 'pago' && f.paymentDate) ? f.paymentDate : f.dueDate;
            return dateStr && dateStr.startsWith(datePrefix) && f.type === 'receita';
          })
          .reduce((sum, f) => sum + f.amount, 0);
          
        data.push({
          name: `${dayStr}`,
          Faturamento: total
        });
      }
      return data;
    }
  }, [finance, selectedMonth]);

  const servicesData = useMemo(() => {
    const categories = Array.from(new Set(finance.map(f => f.category || 'Geral')));
    return categories.map(cat => {
      const rev = finance
        .filter(f => {
          const dateStr = (f.status === 'pago' && f.paymentDate) ? f.paymentDate : f.dueDate;
          const matchesMonth = selectedMonth === 'todos' || (dateStr && dateStr.startsWith(selectedMonth));
          return matchesMonth && f.category === cat && f.type === 'receita' && f.status === 'pago';
        })
        .reduce((acc, f) => acc + f.amount, 0);
      return { name: cat, revenue: rev };
    }).filter(item => item.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [finance, selectedMonth]);

  // Export current list to CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Status,Descricao,Vinculo,Vencimento,Categoria,Valor\r\n";
    filteredFinance.forEach(f => {
      const patient = patients.find(p => p.id === f.patientId);
      const pName = patient ? patient.name : 'Geral';
      const row = `"${f.status}","${f.description}","${pName}","${f.dueDate}","${f.category || 'Geral'}",${f.amount}`;
      csvContent += row + "\r\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lancamentos_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Arquivo CSV exportado com sucesso!');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="p-6 space-y-8 max-w-[1600px] mx-auto select-none"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic lowercase">
            {activeTab === 'painel' ? "dashboard financeiro" : "ranking de faturamento por paciente"}
          </h1>
          <p className="text-slate-500 lowercase">
            {activeTab === 'painel' 
              ? "fluxo de caixa, gráficos dinâmicos de faturamento e lançamentos consolidados." 
              : "classificação e ranking de pacientes ordenados pelo valor total de receitas quitadas."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period/Month selector */}
          <div className="relative group shrink-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-indigo-600 uppercase tracking-wider select-none">Mês:</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="h-11 pl-12 pr-6 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:ring-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="todos">Todo o Histórico</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{formatMonthLabel(m)}</option>
              ))}
            </select>
          </div>

          {activeTab === 'painel' && (
            <>
              <Button 
                variant="outline" 
                onClick={handleExportCSV}
                className="h-11 px-6 rounded-xl border-slate-200 shadow-sm italic font-bold cursor-pointer"
              >
                <Download className="w-4 h-4 mr-2" />
                exportar CSV
              </Button>
              <Button 
                onClick={() => {
                  setSelectedTransactionId(null);
                  setIsModalOpen(true);
                }}
                className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl h-11 px-6 shadow-lg shadow-indigo-100 italic lowercase cursor-pointer"
              >
                <Plus className="w-5 h-5 mr-2" />
                lançar pagamento
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs list navigation */}
      <div className="flex border-b border-slate-100 pb-px gap-1">
        <button
          onClick={() => setActiveTab('painel')}
          className={cn(
            "pb-4 px-6 text-xs font-black italic uppercase border-b-2 transition-all tracking-wider cursor-pointer",
            activeTab === 'painel' 
              ? "border-b-indigo-600 text-indigo-600" 
              : "border-b-transparent text-slate-400 hover:text-slate-650"
          )}
        >
          Painel & Caixa
        </button>
        <button
          onClick={() => setActiveTab('ranking')}
          className={cn(
            "pb-4 px-6 text-xs font-black italic uppercase border-b-2 transition-all tracking-wider flex items-center gap-2 cursor-pointer",
            activeTab === 'ranking' 
              ? "border-b-indigo-600 text-indigo-600" 
              : "border-b-transparent text-slate-400 hover:text-slate-650"
          )}
        >
          <Award className="w-4 h-4 text-indigo-600" />
          Ranking de Pacientes
        </button>
      </div>

      {/* Alert on outstanding debts */}
      {(() => {
        const patientsWithDebts = patients.map(p => {
          const pendingTxs = finance.filter(f => f.patientId === p.id && f.type === 'receita' && f.status === 'pendente');
          const totalPending = pendingTxs.reduce((sum, f) => sum + f.amount, 0);
          return { ...p, totalPending };
        }).filter(p => p.totalPending > 0);

        if (patientsWithDebts.length === 0) return null;

        const totalPendingOverall = patientsWithDebts.reduce((sum, p) => sum + p.totalPending, 0);

        return (
          <div className="bg-amber-50/70 border border-amber-100/70 rounded-3xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100/80 flex items-center justify-center text-amber-600 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-black text-amber-900 leading-tight">Existem {patientsWithDebts.length} pacientes com débitos pendentes</p>
                <p className="text-xs text-amber-700 font-medium">O total acumulado em aberto é de <span className="font-bold">R$ {totalPendingOverall.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>.</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-200 text-amber-800 hover:bg-amber-100 bg-white font-bold text-xs shrink-0 cursor-pointer rounded-xl h-9"
              onClick={() => {
                setActiveTab('ranking');
                setRankingSort('paymentScore');
              }}
            >
              Ver no Ranking de Pacientes
            </Button>
          </div>
        );
      })()}

      <AnimatePresence mode="wait">
        {activeTab === 'painel' && (
          <motion.div
            key="painel-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* Monthly dynamic cards row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 bg-white border-slate-200 rounded-[2rem] shadow-sm relative overflow-hidden group select-none">
                <div className="absolute top-0 right-0 p-6 text-green-100 group-hover:text-green-50 transition-colors">
                  <TrendingUp className="w-20 h-20" />
                </div>
                <div className="relative">
                  <p className="text-[10px] font-black tracking-widest text-slate-400 mb-1 italic uppercase">Receitas ({selectedMonth === 'todos' ? 'total' : 'período'})</p>
                  <h3 className="text-3xl font-black text-slate-900 font-mono italic">
                    R$ {stats.income.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <div className="flex items-center gap-1 text-green-600 mt-2 text-[10px] font-bold italic">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    recebimentos confirmados
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white border-slate-200 rounded-[2rem] shadow-sm relative overflow-hidden group select-none">
                <div className="absolute top-0 right-0 p-6 text-red-100 group-hover:text-red-50 transition-colors">
                  <TrendingDown className="w-20 h-20" />
                </div>
                <div className="relative">
                  <p className="text-[10px] font-black tracking-widest text-slate-400 mb-1 italic uppercase">Despesas ({selectedMonth === 'todos' ? 'total' : 'período'})</p>
                  <h3 className="text-3xl font-black text-slate-900 font-mono italic">
                    R$ {stats.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <div className="flex items-center gap-1 text-red-650 mt-2 text-[10px] font-bold italic">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    saídas do caixa
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-indigo-600 rounded-[2rem] shadow-xl relative overflow-hidden group select-none text-white">
                <div className="absolute top-0 right-0 p-6 text-white/5 transition-colors">
                  <DollarSign className="w-20 h-20" />
                </div>
                <div className="relative">
                  <p className="text-[10px] font-black tracking-widest opacity-60 mb-1 italic uppercase">Saldo Líquido</p>
                  <h3 className="text-3xl font-black font-mono italic">
                    R$ {stats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <div className="flex items-center gap-1 mt-2 text-[10px] font-bold opacity-80 italic">
                    receitas menos despesas
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-amber-500 rounded-[2rem] shadow-xl relative overflow-hidden group select-none text-white">
                <div className="absolute top-0 right-0 p-6 text-white/5 transition-colors">
                  <Clock className="w-20 h-20" />
                </div>
                <div className="relative">
                  <p className="text-[10px] font-black tracking-widest opacity-60 mb-1 italic uppercase">A receber (pendentes)</p>
                  <h3 className="text-3xl font-black font-mono italic">
                    R$ {stats.pendingIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <div className="flex items-center gap-1 mt-2 text-[10px] font-bold opacity-85 italic">
                    <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                    débitos em aberto
                  </div>
                </div>
              </Card>
            </div>

            {/* Split layout: Left is cash flow, Right is charts and dynamic stats */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Left Column: Transaction List */}
              <div className="lg:col-span-3 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Category tabs */}
                  <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                    {(['tudo', 'receita', 'despesa'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setFilter(type)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-lg text-[10px] font-black italic transition-all capitalize cursor-pointer",
                          filter === type 
                            ? "bg-white text-slate-900 shadow-sm" 
                            : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  {/* Search box */}
                  <div className="relative flex-1 max-w-xs group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <Input 
                      placeholder="Buscar por paciente, categoria..."
                      className="pl-9 h-9 text-xs bg-white border-slate-200 rounded-xl"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <Card className="bg-white border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden border-b-8 border-b-indigo-650">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="p-4 font-black text-[10px] text-slate-400 tracking-widest lowercase">status</th>
                          <th className="p-4 font-black text-[10px] text-slate-400 tracking-widest lowercase">descrição</th>
                          <th className="p-4 font-black text-[10px] text-slate-400 tracking-widest lowercase">vínculo</th>
                          <th className="p-4 font-black text-[10px] text-slate-400 tracking-widest lowercase">data</th>
                          <th className="p-4 font-black text-[10px] text-slate-400 tracking-widest lowercase">categoria / metodo</th>
                          <th className="p-4 font-black text-[10px] text-slate-400 tracking-widest text-right lowercase">valor</th>
                          <th className="p-4 font-black text-[10px] text-slate-400 tracking-widest text-center lowercase">ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFinance.map((f) => {
                          const patient = patients.find(p => p.id === f.patientId);
                          
                          return (
                            <tr 
                              key={f.id} 
                              onClick={() => {
                                setSelectedTransactionId(f.id);
                                setIsModalOpen(true);
                              }}
                              className="border-b border-slate-50 hover:bg-indigo-50/20 transition-colors group cursor-pointer"
                            >
                              <td className="p-4">
                                <Badge className={cn(
                                  "text-[9px] font-black italic px-2 border-none capitalize",
                                  f.status.toLowerCase() === 'pago' ? "bg-green-105 text-green-700" : "bg-amber-105 text-amber-700 shadow-sm"
                                )}>
                                  {f.status}
                                </Badge>
                              </td>
                              <td className="p-4">
                                <div className="max-w-[200px]">
                                  <p className="text-xs font-black text-slate-800 italic line-clamp-1 lowercase">{f.description || 'Lançamento sem descrição'}</p>
                                  {f.paymentMethod === 'múltiplo' && f.paymentSplits && (
                                    <span className="text-[9px] text-indigo-500 font-extrabold italic lowercase">múltiplas formas: {f.paymentSplits.length} divisões</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="font-extrabold text-slate-800 text-xs capitalize italic">
                                  {patient ? patient.name.split(' ')[0] : 'geral'}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col text-[10px] font-bold text-slate-500 font-mono">
                                  <span>{format(new Date(((f.status === 'pago' && f.paymentDate) ? f.paymentDate : f.dueDate) + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                                  <span className="text-[9px] text-slate-400 italic">{(f.status === 'pago' && f.paymentDate) ? 'pagamento' : 'vencimento'}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[9px] font-extrabold text-slate-500 uppercase">{f.category || 'Geral'}</span>
                                  <span className="text-[8px] font-bold text-slate-450 italic lowercase">{f.paymentMethod || 'não inf.'}</span>
                                </div>
                              </td>
                              <td className="p-4 text-right">
                                <span className={cn(
                                  "font-mono font-black italic text-sm",
                                  f.type.toLowerCase() === 'receita' ? "text-green-600" : "text-red-600"
                                )}>
                                  {f.type.toLowerCase() === 'receita' ? '+' : '-'} R$ {f.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </td>
                              <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-center items-center gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer rounded-xl transition-all"
                                    onClick={() => {
                                      if (confirm('Deseja realmente excluir este lançamento?')) {
                                        removeFinance(f.id);
                                        toast.error('Lançamento excluído.');
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 cursor-pointer">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="font-sans text-xs">
                                      <DropdownMenuItem 
                                        className="flex gap-2 italic font-bold cursor-pointer"
                                        onClick={() => {
                                          updateFinance(f.id, { status: 'pago', paymentDate: format(new Date(), 'yyyy-MM-dd') });
                                          toast.success('Lançamento registrado como pago!');
                                        }}
                                        disabled={f.status === 'pago'}
                                      >
                                        <CheckCircle2 className="w-4 h-4 text-green-600" /> Marcar como pago
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="flex gap-2 italic font-bold cursor-pointer"
                                        onClick={() => {
                                          setSelectedTransactionId(f.id);
                                          setIsModalOpen(true);
                                        }}
                                      >
                                        <Pencil className="w-4 h-4" /> Editar lançamento
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {filteredFinance.length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-12 text-center text-slate-400 font-bold italic text-xs">
                              Nenhum lançamento financeiro registrado para o período ou critérios selecionados.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* Right Column: Graphs & Top Patients widgets */}
              <div className="lg:col-span-2 space-y-8">
                {/* Billing Curve area chart */}
                <Card className="p-6 bg-white border-slate-200 rounded-[2.5rem] shadow-sm">
                  <div className="mb-4">
                    <h3 className="font-black text-slate-900 text-sm italic flex items-center gap-1.5 lowercase">
                      <Activity className="w-4 h-4 text-indigo-550" />
                      curva dinâmica de faturamento
                    </h3>
                    <p className="text-slate-400 text-[10px] font-bold lowercase">receitas confirmadas {selectedMonth === 'todos' ? 'mensal' : 'diário'}.</p>
                  </div>
                  
                  <div className="h-[220px] w-full mt-2">
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
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }}
                          tickFormatter={(value) => `R$ ${value}`} 
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9', fontSize: '10px' }}
                          itemStyle={{ fontWeight: 800, color: '#4f46e5' }}
                          formatter={(value) => [`R$ ${value}`, 'Receitas']}
                        />
                        <Area type="monotone" dataKey="Faturamento" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorValue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Billing per Service category representation */}
                <Card className="p-6 bg-white border-slate-200 rounded-[2.5rem] shadow-sm">
                  <h3 className="font-black text-slate-900 text-sm italic mb-1.5 lowercase">Faturamento por Categoria</h3>
                  <p className="text-slate-400 text-[10px] font-bold lowercase mb-5">proporção de receita líquida quitada.</p>
                  
                  <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
                    {servicesData.map((item, i) => {
                      const maxRevenue = servicesData.length > 0 ? Math.max(...servicesData.map(s => s.revenue)) : 1;
                      const percent = Math.min(100, Math.round((item.revenue / maxRevenue) * 100));
                      
                      return (
                        <div key={i} className="space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="font-black text-slate-700 italic capitalize">{item.name}</span>
                            <span className="font-mono text-slate-950 font-black">R$ {item.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                i === 0 ? "bg-indigo-650" : i === 1 ? "bg-emerald-500" : i === 2 ? "bg-amber-500" : "bg-slate-400"
                              )}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {servicesData.length === 0 && (
                      <p className="text-center text-slate-400 italic text-[10px] font-bold py-6">sem receitas no período selecionado</p>
                    )}
                  </div>
                </Card>

                {/* Top 5 Patients list */}
                <Card className="p-6 bg-white border-slate-200 rounded-[2.5rem] shadow-sm">
                  <h3 className="font-black text-slate-900 text-sm italic mb-1.5 lowercase flex items-center gap-1">
                    <Crown className="w-4 h-4 text-amber-500" />
                    Top Pacientes do Período
                  </h3>
                  <p className="text-slate-400 text-[10px] font-bold lowercase mb-4">maiores geradores de faturamento.</p>

                  <div className="space-y-3">
                    {patientRankings.slice(0, 5).map((p, idx) => (
                      <div key={p.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-all">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-5 h-5 rounded-full font-mono text-[9px] font-black italic flex items-center justify-center border",
                            idx === 0 ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-slate-50 border-slate-200 text-slate-655"
                          )}>
                            {idx + 1}
                          </span>
                          <span className="text-xs font-black text-slate-800 italic capitalize">{p.name.split(' ').slice(0, 2).join(' ')}</span>
                        </div>
                        <span className="font-mono text-xs font-black text-slate-900">R$ {p.totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}

                    {patientRankings.length === 0 && (
                      <p className="text-center text-slate-400 italic text-[10px] font-bold py-4">sem dados do faturamento</p>
                    )}
                  </div>
                </Card>
              </div>
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 p-4 rounded-[2rem] border border-slate-100/50 font-sans text-xs">
              <div className="relative flex-1 max-w-md group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, CPF ou WhatsApp..."
                  value={rankingSearch}
                  onChange={e => setRankingSearch(e.target.value)}
                  className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200/60 rounded-xl font-bold text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-transparent transition-all"
                />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
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

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ordenar por:</span>
                  <select
                    value={rankingSort}
                    onChange={e => setRankingSort(e.target.value as any)}
                    className="h-11 px-4 bg-white border border-slate-200/60 rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="totalPaid">💰 Total Investido</option>
                    <option value="paymentScore">🎯 Score de Pagamento (Devedores)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Ranking listings */}
            <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden border-b-8 border-b-indigo-650">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-20">Rank</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Paciente</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Fidelidade</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Visitas</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Saúde Fin. (Score)</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Pendente</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-8">Total Investido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientRankings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400 font-bold italic text-sm">
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
                                  <span className="w-8 h-8 rounded-full bg-orange-50/50 text-orange-855 font-mono font-black italic flex items-center justify-center text-sm border border-orange-200/50 mt-1">3º</span>
                                </div>
                              ) : (
                                <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 font-mono font-bold text-xs flex items-center justify-center">{idx + 1}º</span>
                              )}
                            </div>
                          </td>
                          <td className="p-5">
                            <div className="flex items-center gap-4">
                              <div className="w-11 h-11 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-650 relative overflow-hidden group shrink-0 border border-slate-100 shadow-inner font-extrabold capitalize">
                                {p.profilePicture ? (
                                  <img 
                                    src={p.profilePicture} 
                                    alt={p.name} 
                                    className="w-full h-full object-cover rounded-2xl" 
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span>{p.name.charAt(0)}</span>
                                )}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-slate-800 text-sm leading-none flex items-center gap-2">
                                  {p.name}
                                </h4>
                                <p className="text-[10px] text-slate-405 mt-1 font-bold">{p.phone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-5 text-center">
                            <Badge className={cn("text-[9px] px-2 py-0.5 rounded-lg capitalize", p.badgeColor)}>
                              {p.tier}
                            </Badge>
                          </td>
                          <td className="p-5 text-center">
                            <span className="font-mono text-slate-700 font-black italic text-sm">{p.appointmentsCount.toString().padStart(2, '0')}</span>
                          </td>
                          <td className="p-5 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={cn(
                                "font-mono font-black text-sm",
                                p.paymentScore >= 80 ? "text-green-600" : p.paymentScore >= 50 ? "text-amber-500" : "text-red-500"
                              )}>
                                {p.paymentScore}
                              </span>
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full rounded-full",
                                    p.paymentScore >= 80 ? "bg-green-500" : p.paymentScore >= 50 ? "bg-amber-500" : "bg-red-500"
                                  )}
                                  style={{ width: `${p.paymentScore}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-5 text-right">
                            <span className={cn(
                              "font-mono font-bold text-xs",
                              p.totalPending > 0 ? "text-amber-600 font-black" : "text-slate-400"
                            )}>
                              {p.totalPending > 0 ? `R$ ${p.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                            </span>
                          </td>
                          <td className="p-5 text-right pr-8">
                            <span className="font-mono font-black italic text-sm text-slate-900">
                              R$ {p.totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FinanceModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTransactionId(null);
        }}
        transactionId={selectedTransactionId || undefined}
      />
    </motion.div>
  );
}
