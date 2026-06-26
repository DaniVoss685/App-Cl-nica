import { useStore } from '../store';
import { Sparkles, Calendar as CalendarIcon, UserPlus, TrendingUp, AlertCircle, ArrowRight, MessageSquare, FileText, CheckCircle2, RefreshCw, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Button, buttonVariants } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AppointmentModal } from '../components/AppointmentModal';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { cn } from '../lib/utils';
import { addDays, format, parse, isValid, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const mockRevenueData = [
  { name: 'Jan', value: 45000 },
  { name: 'Fev', value: 52000 },
  { name: 'Mar', value: 48000 },
  { name: 'Abr', value: 61000 },
  { name: 'Mai', value: 59000 },
  { name: 'Jun', value: 72000 },
];

const mockFunnelData = [
  { name: 'Leads', value: 120 },
  { name: 'Avaliados', value: 80 },
  { name: 'Orçamentos', value: 65 },
  { name: 'Fechados', value: 40 },
];

export function Dashboard() {
  const { patients, appointments, finance, insights, addPatient, generateInsights, updatePatient, toggleInsightTask, resolveInsight, inventory } = useStore();
  
  const lowStockItems = useMemo(() => {
    return (inventory || []).filter(item => (item.quantity || 0) <= (item.minQuantity || 0));
  }, [inventory]);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [selectedDay, setSelectedDay] = useState('todos');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);

  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [apptModalOpen, setApptModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [scheduledReturnDate, setScheduledReturnDate] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [patientData, setPatientData] = useState<{name: string; phone: string; sex: "m"|"f"|"outro"}>({ name: '', phone: '', sex: 'outro' });
  
  const { professionals, services, packages } = useStore();

  const filteredAppointments = useMemo(() => {
    return appointments.filter(appt => {
      const [year, month, day] = appt.date.split('-');
      const matchYear = year === selectedYear;
      const matchMonth = selectedMonth === 'todos' || month === selectedMonth;
      const matchDay = selectedDay === 'todos' || day === selectedDay.padStart(2, '0');
      return matchYear && matchMonth && matchDay;
    });
  }, [appointments, selectedYear, selectedMonth, selectedDay]);

  const stats = useMemo(() => {
    const totalAppointments = filteredAppointments.length;
    const uniquePatients = new Set(filteredAppointments.map(a => a.patientId)).size;
    
    // Simple revenue sum from appointments in period
    const revenue = filteredAppointments.reduce((acc, current) => acc + (current.value || 0), 0);
    
    // Dynamic Ocupação Médica
    const daysCount = selectedDay !== 'todos' ? 1 : (selectedMonth !== 'todos' ? 22 : 22 * 12);
    const activeProfs = (professionals || []).filter(p => p.active !== false).length;
    const capacity = activeProfs * 8 * daysCount;
    const medicalOccupation = capacity > 0 ? Math.min(100, Math.round((totalAppointments / capacity) * 100)) : 0;
    
    return {
      totalAppointments,
      uniquePatients,
      revenue,
      medicalOccupation
    };
  }, [filteredAppointments, professionals, selectedMonth, selectedDay]);

  const monthlyRevenueData = useMemo(() => {
    const result = [];
    const today = new Date();
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const yearStr = date.getFullYear().toString();
      const monthStr = (date.getMonth() + 1).toString().padStart(2, '0');
      const monthLabel = months[date.getMonth()];
      
      const totalRevenue = (finance || [])
        .filter(f => {
          if (f.type !== 'receita' || f.status !== 'pago') return false;
          const [year, month] = f.dueDate.split('-');
          return year === yearStr && month === monthStr;
        })
        .reduce((sum, f) => sum + f.amount, 0);
        
      result.push({
        name: monthLabel,
        value: totalRevenue
      });
    }
    return result;
  }, [finance]);

  const activeInsights = useMemo(() => insights.filter(i => !i.resolved).slice(0, 2), [insights]);
  const selectedInsight = useMemo(() => insights.find(i => i.id === selectedInsightId), [insights, selectedInsightId]);

  useEffect(() => {
    if (insights.length === 0) {
      generateInsights();
    }
  }, []);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      generateInsights();
      setIsGenerating(false);
    }, 1500);
  };

  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    addPatient({ ...patientData, status: 'novo' });
    setPatientModalOpen(false);
    setPatientData({ name: '', phone: '', sex: 'outro' });
  };

  const handleApptSuccess = (returnDate: string | null) => {
    setScheduledReturnDate(returnDate);
    setSuccessModalOpen(true);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Visão Geral</h1>
          <p className="text-sm text-slate-500">Acompanhe os principais indicadores da clínica.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-1.5 px-2">
            <Label className="text-[10px] uppercase text-slate-400 font-bold">Ano</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-8 w-20 text-xs border-none bg-slate-50 hover:bg-slate-100 transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5 border-l border-slate-100 px-3">
            <Label className="text-[10px] uppercase text-slate-400 font-bold">Mês</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-8 w-28 text-xs border-none bg-slate-50 hover:bg-slate-100 transition-colors">
                <SelectValue>
                  {selectedMonth === 'todos' ? 'Todos' : 
                   selectedMonth === '01' ? 'Janeiro' :
                   selectedMonth === '02' ? 'Fevereiro' :
                   selectedMonth === '03' ? 'Março' :
                   selectedMonth === '04' ? 'Abril' :
                   selectedMonth === '05' ? 'Maio' :
                   selectedMonth === '06' ? 'Junho' :
                   selectedMonth === '07' ? 'Julho' :
                   selectedMonth === '08' ? 'Agosto' :
                   selectedMonth === '09' ? 'Setembro' :
                   selectedMonth === '10' ? 'Outubro' :
                   selectedMonth === '11' ? 'Novembro' :
                   selectedMonth === '12' ? 'Dezembro' : 'Mês'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[400px]">
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="01">Janeiro</SelectItem>
                <SelectItem value="02">Fevereiro</SelectItem>
                <SelectItem value="03">Março</SelectItem>
                <SelectItem value="04">Abril</SelectItem>
                <SelectItem value="05">Maio</SelectItem>
                <SelectItem value="06">Junho</SelectItem>
                <SelectItem value="07">Julho</SelectItem>
                <SelectItem value="08">Agosto</SelectItem>
                <SelectItem value="09">Setembro</SelectItem>
                <SelectItem value="10">Outubro</SelectItem>
                <SelectItem value="11">Novembro</SelectItem>
                <SelectItem value="12">Dezembro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5 border-l border-slate-100 px-3 relative">
            <Label className="text-[10px] uppercase text-slate-400 font-bold">Dia</Label>
            <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className={cn(
                  "h-8 text-xs bg-slate-50 hover:bg-slate-100 font-medium px-3 flex items-center gap-2 rounded-md",
                  selectedDay !== 'todos' && "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                )}>
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {selectedDay === 'todos' ? 'Todos' : selectedDay.padStart(2, '0')}
                </Button>
              </DialogTrigger>
              <DialogContent className="p-4 border-none shadow-2xl bg-white w-full max-w-[340px]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">Selecione o Dia</h3>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedDay('todos'); setIsCalendarOpen(false); }} className="text-xs text-indigo-600">
                      Limpar
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                      <div key={i} className="text-[10px] font-bold text-slate-400 text-center py-1">
                        {d}
                      </div>
                    ))}
                    
                    {(() => {
                      const monthToUse = selectedMonth === 'todos' ? format(new Date(), 'MM') : selectedMonth;
                      const baseDate = parse(`${selectedYear}-${monthToUse}-01`, 'yyyy-MM-dd', new Date());
                      const start = startOfMonth(baseDate);
                      const end = endOfMonth(baseDate);
                      const days = eachDayOfInterval({ start, end });
                      
                      // Padding for first week
                      const firstDayIndex = start.getDay();
                      const padding = Array.from({ length: firstDayIndex });
                      
                      return (
                        <>
                          {padding.map((_, i) => <div key={`p-${i}`} />)}
                          {days.map(date => {
                            const dayStr = format(date, 'd');
                            const isSelected = selectedDay === dayStr;
                            return (
                              <button
                                key={dayStr}
                                onClick={() => {
                                  setSelectedDay(dayStr);
                                  setIsCalendarOpen(false);
                                }}
                                className={cn(
                                  "h-8 w-8 text-xs rounded-lg transition-colors flex items-center justify-center",
                                  isSelected 
                                    ? "bg-indigo-600 text-white font-bold" 
                                    : "hover:bg-slate-100 text-slate-700"
                                )}
                              >
                                {dayStr}
                              </button>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex gap-2">
           <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setApptModalOpen(true)}>
             <CalendarIcon className="mr-2 h-4 w-4" /> Novo Agendamento
           </Button>

           <AppointmentModal 
             open={apptModalOpen} 
             onOpenChange={setApptModalOpen}
             onSuccess={handleApptSuccess}
           />

          <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
            <DialogContent className="sm:max-w-md bg-white border border-slate-100 shadow-xl rounded-xl">
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <DialogTitle className="text-xl font-bold text-slate-800 tracking-tight mb-2">Agendamento Confirmado!</DialogTitle>
                <p className="text-slate-500 mb-6 text-sm">A consulta foi agendada com sucesso no sistema.</p>
                
                {scheduledReturnDate && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 w-full mb-6 text-left">
                    <div className="flex items-start gap-2">
                       <Clock className="w-4 h-4 text-indigo-600 mt-0.5" />
                       <div>
                          <p className="text-indigo-800 text-sm font-bold">
                            Acompanhamento Agendado
                          </p>
                          <p className="text-xs text-indigo-600">
                             Lembretes automáticos criados hoje ({format(new Date(), 'dd/MM/yyyy')})
                          </p>
                          <p className="text-indigo-800 text-sm font-medium mt-2">
                             Data do acompanhamento: <br/>
                             <span className="font-bold text-lg">{scheduledReturnDate}</span>
                          </p>
                       </div>
                    </div>
                  </div>
                )}
                
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => setSuccessModalOpen(false)}>
                  Entendi
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={patientModalOpen} onOpenChange={setPatientModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="mr-2 h-4 w-4" /> Novo Paciente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Paciente Rápido</DialogTitle></DialogHeader>
              <form onSubmit={handleCreatePatient} className="space-y-4 pt-4">
                 <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={patientData.name} onChange={e => setPatientData({...patientData, name: e.target.value})} required />
                 </div>
                 <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">Salvar Paciente</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* LOW STOCK ALERTS PANEL */}
      {lowStockItems.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-red-50/80 border border-red-100 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-red-900 italic uppercase tracking-wider flex items-center gap-2">
                  ⚠️ Insumos Críticos Detectados
                </h3>
                <p className="text-xs text-red-700 font-medium mt-0.5 max-w-2xl leading-relaxed">
                  Os seguintes materiais ou insumos estão abaixo de seus limites mínimos. Por favor, reabasteça-os para não comprometer os agendamentos cadastrados:
                </p>

                <div className="flex flex-wrap gap-2 mt-3">
                  {lowStockItems.map(item => (
                    <div key={item.id} className="px-3 py-1.5 bg-white rounded-lg border border-red-100/50 text-xs font-bold text-slate-800 flex items-center gap-2">
                      <span className="capitalize">{item.name}</span>
                      <span className="text-[10px] text-red-650 font-mono bg-red-50 px-1.5 py-0.5 rounded-md">
                        {item.quantity} un / min: {item.minQuantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <Link 
              to="/custos" 
              className={cn(
                buttonVariants({ variant: "ghost" }), 
                "text-xs font-black text-red-750 hover:text-red-900 border border-red-200 bg-white hover:bg-red-50 shrink-0 self-end md:self-center uppercase flex items-center gap-1 shadow-sm px-4 h-10 rounded-xl"
              )}
            >
              Comprar / Repor <ChevronRight className="w-4 h-4 ml-0.5" />
            </Link>
          </div>
        </motion.div>
      )}

      {/* KPI Cards */}
      <motion.div 
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 15, scale: 0.98 },
            show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 120, damping: 14 } }
          }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <Card className="hover:shadow-md transition-all h-full">
            <CardContent className="p-4 flex flex-col justify-between h-full select-none">
              <span className="text-xs font-semibold text-slate-500 uppercase">Faturamento Período</span>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.revenue)}
              </div>
              <span className="text-xs text-green-600 font-medium mt-1">▲ Baseado no período selecionado</span>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 15, scale: 0.98 },
            show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 120, damping: 14 } }
          }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <Card className="hover:shadow-md transition-all h-full border-indigo-100 bg-indigo-50/10">
            <CardContent className="p-4 flex flex-col justify-between h-full select-none">
              <span className="text-xs font-semibold text-indigo-600 uppercase">Total Atendimentos</span>
              <div className="mt-2 text-2xl font-bold text-slate-900">{stats.totalAppointments}</div>
              <span className="text-xs text-indigo-500 font-medium mt-1">Sessões e consultas</span>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 15, scale: 0.98 },
            show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 120, damping: 14 } }
          }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <Card className="hover:shadow-md transition-all h-full">
            <CardContent className="p-4 flex flex-col justify-between h-full select-none">
              <span className="text-xs font-semibold text-slate-500 uppercase">Pacientes Atendidos</span>
              <div className="mt-2 text-2xl font-bold text-slate-900">{stats.uniquePatients}</div>
              <span className="text-xs text-slate-500 font-medium mt-1">Pacientes únicos no período</span>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 15, scale: 0.98 },
            show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 120, damping: 14 } }
          }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <Card className="hover:shadow-md transition-all h-full">
            <CardContent className="p-4 flex flex-col justify-between h-full select-none">
              <span className="text-xs font-semibold text-slate-500 uppercase">Ocupação Médica</span>
              <div className="mt-2 text-2xl font-bold text-slate-900">{stats.medicalOccupation}%</div>
              <span className="text-xs text-slate-500 font-medium mt-1">Agendado vs Disponível</span>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Confirmation Alert - Explicit User Request */}
      {(() => {
        const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
        const tomorrowPending = appointments.filter(a => a.date === tomorrow && a.confirmationStatus === 'pendente');
        if (tomorrowPending.length > 0) {
          return (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200/50">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-amber-900 uppercase italic leading-tight">Pendências de Confirmação</h3>
                  <p className="text-amber-700/80 text-sm font-medium">Existem {tomorrowPending.length} pacientes para amanhã que ainda não confirmaram a presença.</p>
                </div>
              </div>
              <div className="flex gap-3 shrink-0">
                <Button 
                  onClick={() => handleGenerate()}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-12 px-6 rounded-xl"
                >
                  Confirmar em Massa
                </Button>
                <Link to="/agenda">
                  <Button variant="ghost" className="h-12 px-6 font-bold text-amber-700 hover:bg-amber-100/50">
                    Ver na Agenda
                  </Button>
                </Link>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* AI Insights Section */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
        <div className="flex items-center justify-between gap-2 text-indigo-800 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold">Ações Recomendadas pela IA</h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="text-indigo-600 hover:bg-indigo-100"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
            Recalcular
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeInsights.map((insight) => (
            <div key={insight.id} className="bg-white rounded-lg p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    insight.type === 'retenção' || insight.type === 'risco' ? 'bg-amber-100 text-amber-800' : 
                    insight.type === 'oportunidade' ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {insight.type}
                  </span>
                </div>
                <p className="text-sm text-slate-700 mb-4 leading-relaxed">{insight.message}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  className="bg-indigo-600 text-xs text-white hover:bg-indigo-700"
                  onClick={() => {
                    setSelectedInsightId(insight.id);
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Visualizar Guia AI
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs border-slate-200"
                  onClick={() => setSelectedInsightId(insight.id)}
                >
                  Ver Detalhes
                </Button>
              </div>
            </div>
          ))}
          {activeInsights.length === 0 && (
            <div className="col-span-2 py-8 text-center text-slate-400">
               <p className="text-sm italic">Clique em Recalcular para gerar novos insights baseados em seus dados atuais.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!selectedInsightId} onOpenChange={(open) => !open && setSelectedInsightId(null)}>
        <DialogContent className="bg-white max-w-lg border-none shadow-2xl p-0 overflow-hidden">
          {selectedInsight && (
            <div className="flex flex-col h-full max-h-[90vh]">
              <div className="p-6 bg-indigo-600 text-white">
                <div className="flex justify-between items-start mb-4">
                  <Badge className="bg-white/20 text-white border-none text-[10px] uppercase font-bold px-2 py-0.5">
                    Guia de Execução IA
                  </Badge>
                  <span className="text-[10px] text-indigo-200 font-medium">{format(new Date(selectedInsight.createdAt), "HH:mm 'de' dd/MM")}</span>
                </div>
                <h2 className="text-xl font-bold mb-2 tracking-tight">{selectedInsight.type}: {selectedInsight.actionRequested}</h2>
                <p className="text-indigo-100 text-sm leading-relaxed">{selectedInsight.message}</p>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                <div className="bg-green-50 rounded-xl p-4 border border-green-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-green-800 uppercase tracking-tighter">Impacto Estimado</h4>
                    <p className="text-sm text-green-700 font-medium">+15% em faturamento mensal projetado</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Checklist de Ações</h3>
                  <div className="space-y-3">
                    {selectedInsight.tasks?.map((task) => (
                      <div 
                        key={task.id} 
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                          task.isCompleted ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm"
                        )}
                        onClick={() => toggleInsightTask(selectedInsight.id, task.id)}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                          task.isCompleted ? "bg-green-500 border-green-500" : "border-slate-300"
                        )}>
                          {task.isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className={cn(
                            "text-sm font-medium capitalize",
                            task.isCompleted && task.type === 'User' ? "text-slate-400 line-through" : "text-slate-700"
                          )}>
                            {task.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                              "text-[9px] uppercase font-bold",
                              task.type === 'AI' ? "text-indigo-500" : "text-amber-500"
                            )}>
                              {task.type === 'AI' ? 'Automação IA' : 'Ação Manual'}
                            </span>
                            {task.type === 'AI' && task.isCompleted && (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                CONCLUÍDO
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedInsight.patientId && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Paciente Relacionado</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-indigo-600 font-bold border border-slate-100 shadow-sm">
                          {patients.find(p => p.id === selectedInsight.patientId)?.name.charAt(0)}
                        </div>
                        <span className="text-sm font-bold text-slate-700">
                          {patients.find(p => p.id === selectedInsight.patientId)?.name}
                        </span>
                      </div>
                      <Link 
                        to={`/pacientes`} 
                        className="text-xs font-bold text-indigo-600 hover:underline"
                        onClick={() => setSelectedInsightId(null)}
                      >
                        Ver Ficha Completa
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 bg-white" 
                  onClick={() => setSelectedInsightId(null)}
                >
                  Fechar
                </Button>
                <Button 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 shadow-lg"
                  onClick={() => {
                    resolveInsight(selectedInsight.id);
                    setSelectedInsightId(null);
                    toast.success("Ação concluída e arquivada!");
                  }}
                >
                  Concluir e Arquivar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
             <CardTitle className="text-sm font-semibold text-slate-700">Fluxo de Receita Mensal</CardTitle>
             <TrendingUp className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(v) => `R$${v/1000}k`} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  formatter={(val: number) => [`R$ ${val.toLocaleString('pt-BR')}`, 'Receita']} 
                />
                <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800">Agendamentos de Hoje</CardTitle>
              <Badge variant="outline" className="bg-white text-indigo-700 border-indigo-100">{appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-[320px] overflow-y-auto">
            <div className="divide-y divide-slate-50">
              {appointments
                .filter(a => a.date === new Date().toISOString().split('T')[0])
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((appt) => {
                  const patient = patients.find(p => p.id === appt.patientId);
                  return (
                    <div key={appt.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                          {patient?.name.charAt(0) || 'P'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 truncate max-w-[120px]">{patient?.name}</p>
                            {appt.isCaseStudy && <Badge className="bg-purple-100 text-purple-700 text-[8px] h-3 px-1 border-none">Estudo</Badge>}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                            <Clock className="w-3 h-3" />
                            {appt.startTime} - {appt.type}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={clsx(
                          "text-[9px] tracking-wider px-1.5 py-0.5 border-none capitalize",
                          appt.status === 'confirmado' || appt.status === 'chegou' ? "bg-green-100 text-green-700" :
                          appt.status === 'realizado' || appt.status === 'finalizado' ? "bg-blue-100 text-blue-700" :
                          "bg-slate-100 text-slate-600"
                        )}>
                          {appt.status}
                        </Badge>
                        <Badge variant="outline" className={clsx(
                          "text-[8px] px-1 py-0 border-none font-bold capitalize",
                          appt.confirmationStatus === 'confirmado' ? "text-green-600 bg-green-50" :
                          appt.confirmationStatus === 'mensagem enviada' ? "text-amber-600 bg-amber-50" :
                          appt.confirmationStatus === 'pendente' ? "text-slate-400 bg-slate-50" :
                          "text-red-600 bg-red-50"
                        )}>
                          {appt.confirmationStatus === 'mensagem enviada' ? 'Lembrete Enviado' : appt.confirmationStatus}
                        </Badge>
                        {appt.confirmationStatus === 'pendente' && (
                          <button 
                            className="text-[9px] text-green-600 font-bold hover:underline flex items-center gap-0.5 mt-0.5"
                            onClick={(e) => {
                              e.preventDefault();
                              toast.success("Link do WhatsApp gerado para " + (patient?.name || 'paciente'));
                            }}
                          >
                            <MessageSquare className="w-2.5 h-2.5" />
                            Confirmar agora
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              {appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-sm text-slate-400 italic">Nenhum agendamento para hoje.</p>
                </div>
              )}
            </div>
          </CardContent>
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
            <Link to="/agenda" className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1">
              Ver agenda completa <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Clinical Studies Section */}
      {appointments.some(a => a.isCaseStudy) && (
        <Card className="border-purple-100 bg-purple-50/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-base font-bold text-slate-800">Casos Clínicos para Estudo</CardTitle>
            </div>
            <p className="text-xs text-slate-500 italic">Estude os casos complexos antes do retorno do paciente.</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {appointments
                .filter(a => a.isCaseStudy)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 6)
                .map(caseAppt => {
                  const patient = patients.find(p => p.id === caseAppt.patientId);
                  const service = services.find(s => s.id === caseAppt.serviceId);
                  return (
                    <div key={caseAppt.id} className="bg-white p-3 rounded-lg border border-purple-100 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-slate-900 truncate">{patient?.name}</span>
                          <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200">
                            {service?.name || caseAppt.type}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-2">{format(new Date(caseAppt.date + 'T12:00:00'), 'dd/MM/yyyy')}</p>
                        <p className="text-xs text-slate-600 line-clamp-2 italic mb-3">
                          {caseAppt.notes ? `"${caseAppt.notes}"` : 'Sem observações registradas.'}
                        </p>
                      </div>
                      <Link 
                        to="/agenda" 
                        className={cn(
                          buttonVariants({ variant: 'ghost', size: 'sm' }), 
                          "h-7 text-[10px] text-purple-700 hover:bg-purple-50 px-0 justify-start w-fit"
                        )}
                      >
                        Ver na Agenda <ChevronRight className="w-3 h-3 ml-1" />
                      </Link>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
      
    </motion.div>
  );
}
