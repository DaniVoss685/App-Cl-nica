import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { format } from 'date-fns';
import { 
  DollarSign, 
  Calendar, 
  User, 
  Tag, 
  FileText, 
  Landmark, 
  Clock, 
  CheckCircle, 
  HelpCircle,
  Receipt,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';

interface FinanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId?: string | null;
  initialPatientId?: string | null;
}

const EXPENSE_CATEGORIES = [
  'Aluguel / Condomínio',
  'Energia / Luz',
  'Água & Saneamento',
  'Internet, Telefone & Link',
  'Fornecedores & Insumos',
  'Equipamentos / Instrumentos',
  'Salários & Pró-labore',
  'Marketing & Tráfego Pago',
  'Impostos & Contabilidade',
  'Limpeza & Copa',
  'Manutenção & Reformas',
  'Sistemas & Licenças de Software',
  'Outros'
];

const REVENUE_CATEGORIES = [
  'Consulta / Avaliação',
  'Procedimento Estético',
  'Pacote de Tratamentos',
  'Retorno / Retoque',
  'Outros'
];

function CustomDatePicker({
  value,
  onChange,
  label
}: {
  value: string;
  onChange: (val: string) => void;
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    return value ? new Date(value + 'T12:00:00') : new Date();
  });
  const popoverRef = React.useRef<HTMLDivElement>(null);

  // Sync date when value changes externally
  useEffect(() => {
    if (value) {
      setCurrentDate(new Date(value + 'T12:00:00'));
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonthDaysToShow = firstDay;
  const prevMonthIndex = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonthIndex);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const selectedDateStr = `${year}-${formattedMonth}-${formattedDay}`;
    onChange(selectedDateStr);
    setIsOpen(false);
  };

  const formattedDisplay = () => {
    if (!value) return "Selecione uma data";
    const d = new Date(value + 'T12:00:00');
    return `${String(d.getDate()).padStart(2, '0')} de ${monthNames[d.getMonth()]} de ${d.getFullYear()}`;
  };

  // Generate blank spaces/previous month end days
  const calendarCells = [];
  for (let i = prevMonthDaysToShow - 1; i >= 0; i--) {
    calendarCells.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      year: prevYear,
      month: prevMonthIndex
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({
      day: i,
      isCurrentMonth: true,
      year,
      month
    });
  }

  // Next month filler
  const totalCells = Math.ceil(calendarCells.length / 7) * 7;
  const nextMonthIndex = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  let nextMonthDay = 1;
  while (calendarCells.length < totalCells) {
    calendarCells.push({
      day: nextMonthDay++,
      isCurrentMonth: false,
      year: nextYear,
      month: nextMonthIndex
    });
  }

  const selectedDayNum = value ? new Date(value + 'T12:00:00').getDate() : null;
  const selectedMonthNum = value ? new Date(value + 'T12:00:00').getMonth() : null;
  const selectedYearNum = value ? new Date(value + 'T12:00:00').getFullYear() : null;

  return (
    <div className="relative w-full" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between pl-12 pr-5 h-14 bg-slate-50 hover:bg-slate-100/90 rounded-2xl font-bold text-slate-800 transition-all border border-slate-100 text-left focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
      >
        <Calendar className="absolute left-5 w-4 h-4 text-slate-400" />
        <span className="truncate text-xs font-bold text-slate-900">{formattedDisplay()}</span>
        <span className="text-[10px] text-indigo-650 font-extrabold uppercase tracking-wider pl-2 shrink-0">alterar</span>
      </button>

      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 top-full mt-2 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 p-5 z-[500] animate-in fade-in slide-in-from-top-2 duration-150 w-[300px] shrink-0">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer font-bold transition-all text-sm"
            >
              &larr;
            </button>
            <div className="text-center font-black italic text-slate-900 lowercase text-xs tracking-wider">
              {monthNames[month]} <span className="font-mono not-italic text-indigo-600 font-black">{year}</span>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer font-bold transition-all text-sm"
            >
              &rarr;
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase text-slate-400 mb-2">
            {weekdays.map((w, idx) => (
              <div key={idx} className="h-6 flex items-center justify-center font-extrabold">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              const isSelected = 
                cell.isCurrentMonth && 
                cell.day === selectedDayNum && 
                cell.month === selectedMonthNum && 
                cell.year === selectedYearNum;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!cell.isCurrentMonth}
                  onClick={() => handleSelectDay(cell.day)}
                  className={cn(
                    "h-8 w-8 text-xs font-bold rounded-xl flex items-center justify-center cursor-pointer transition-all",
                    !cell.isCurrentMonth && "text-slate-200 pointer-events-none",
                    cell.isCurrentMonth && !isSelected && "text-slate-700 hover:bg-indigo-50 hover:text-indigo-600",
                    isSelected && "bg-indigo-600 text-white font-black shadow-md shadow-indigo-100"
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                const todayStr = format(new Date(), 'yyyy-MM-dd');
                onChange(todayStr);
                setIsOpen(false);
              }}
              className="text-[10px] text-indigo-650 hover:text-indigo-805 font-extrabold uppercase italic tracking-wider cursor-pointer font-sans"
            >
              hoje
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[10px] text-slate-400 hover:text-slate-650 font-extrabold uppercase italic tracking-wider cursor-pointer font-sans"
            >
              fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function FinanceModal({ open, onOpenChange, transactionId, initialPatientId }: FinanceModalProps) {
  const { patients, finance, addFinance, updateFinance, appointments } = useStore();
  
  const getInitialData = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (transactionId) {
      const trans = finance.find(f => f.id === transactionId);
      if (trans) {
        // Detect if category matches predefined ones
        const isPredefined = trans.type === 'despesa' 
          ? EXPENSE_CATEGORIES.includes(trans.category || '')
          : REVENUE_CATEGORIES.includes(trans.category || '');

        return {
          type: trans.type,
          amount: trans.amount,
          patientId: trans.patientId || 'none',
          appointmentId: trans.appointmentId || 'none',
          dueDate: trans.dueDate,
          paymentDate: trans.paymentDate || todayStr,
          status: trans.status,
          paymentMethod: trans.paymentMethod || 'não especificado',
          category: isPredefined ? trans.category || 'Outros' : 'Outros',
          customCategory: isPredefined ? '' : trans.category || '',
          description: trans.description || '',
          paymentSplits: trans.paymentSplits || []
        };
      }
    }
    return {
      type: 'receita' as const,
      amount: 0,
      patientId: initialPatientId || 'none',
      appointmentId: 'none',
      dueDate: todayStr,
      paymentDate: todayStr,
      status: 'pendente' as const,
      paymentMethod: 'não especificado' as any,
      category: 'Consulta / Avaliação',
      customCategory: '',
      description: '',
      paymentSplits: [] as any[]
    };
  };

  const [formData, setFormData] = useState(getInitialData());
  const [displayValue, setDisplayValue] = useState('');
  const [displaySplits, setDisplaySplits] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      const data = getInitialData();
      setFormData(data);
      if (data.amount > 0) {
        setDisplayValue(new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(data.amount));
      } else {
        setDisplayValue('');
      }
      
      if (data.paymentSplits) {
        setDisplaySplits(data.paymentSplits.map(s => s.amount ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(s.amount) : ''));
      } else {
        setDisplaySplits([]);
      }
    }
  }, [open, transactionId]);

  // Adjust default category when type switches
  useEffect(() => {
    if (!transactionId && open) {
      setFormData(prev => ({
        ...prev,
        category: prev.type === 'despesa' ? 'Fornecedores & Insumos' : 'Consulta / Avaliação',
        customCategory: '',
        patientId: prev.type === 'despesa' ? 'none' : (initialPatientId || 'none'),
        appointmentId: 'none'
      }));
    }
  }, [formData.type, open, transactionId]);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numericValue = parseInt(rawValue || '0') / 100;
    setFormData({ ...formData, amount: numericValue });
    
    setDisplayValue(new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue));
  };

  const handleSplitValueChange = (index: number, valStr: string) => {
    const rawValue = valStr.replace(/\D/g, '');
    const numericValue = rawValue === '' ? 0 : Number(rawValue) / 100;
    if (isNaN(numericValue)) return;
    
    const splits = [...(formData.paymentSplits || [])];
    splits[index] = { ...splits[index], amount: numericValue };
    setFormData({ ...formData, paymentSplits: splits });
    
    const newDisplays = [...displaySplits];
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
    newDisplays[index] = formatted === '0,00' && rawValue === '' ? '' : formatted;
    setDisplaySplits(newDisplays);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalCategory = formData.category === 'Outros' 
      ? (formData.customCategory.trim() || 'Outros')
      : formData.category;

    const rawDesc = formData.description.trim();
    const formattedDescription = rawDesc ? rawDesc.charAt(0).toUpperCase() + rawDesc.slice(1) : undefined;

    const dataToSave = {
      type: formData.type,
      amount: formData.amount,
      dueDate: formData.dueDate,
      status: formData.status,
      description: formattedDescription,
      category: finalCategory,
      patientId: (formData.type === 'despesa' || formData.patientId === 'none') ? undefined : formData.patientId,
      appointmentId: (formData.type === 'despesa' || formData.appointmentId === 'none') ? undefined : formData.appointmentId,
      paymentMethod: formData.paymentMethod === 'não especificado' ? undefined : formData.paymentMethod,
      paymentDate: formData.status === 'pago' ? (formData.paymentDate || format(new Date(), 'yyyy-MM-dd')) : undefined,
      paymentSplits: formData.paymentMethod === 'múltiplo' ? formData.paymentSplits : undefined
    };

    if (transactionId) {
      updateFinance(transactionId, dataToSave);
    } else {
      addFinance(dataToSave);
    }
    
    onOpenChange(false);
  };

  const filteredAppointments = formData.patientId !== 'none' 
    ? appointments.filter(a => a.patientId === formData.patientId)
    : appointments;

  const categoriesToUse = formData.type === 'despesa' ? EXPENSE_CATEGORIES : REVENUE_CATEGORIES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] md:max-w-5xl lg:max-w-6xl w-screen h-[90vh] md:h-[85vh] p-0 overflow-hidden bg-white border-none rounded-[2rem] md:rounded-[3rem] focus:outline-none shadow-2xl flex flex-row">
        
        {/* LEFT PANEL - LIVE TICKET PREVIEW */}
        <div className={cn(
          "hidden md:flex md:w-[320px] lg:w-[360px] shrink-0 p-8 flex-col justify-between text-white relative overflow-hidden transition-all duration-300",
          formData.type === 'despesa' ? "bg-slate-900" : "bg-indigo-950"
        )}>
          {/* Subtle grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:15px_15px] opacity-30" />
          <div className="absolute -right-16 -top-16 w-52 h-52 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative space-y-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
                formData.type === 'despesa' ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"
              )}>
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Preview Digital</p>
                <p className="text-sm font-black italic">Fluxo Stark Finance</p>
              </div>
            </div>

            {/* Simulated Live Receipt Ticket */}
            <div className="bg-white/5 rounded-[2rem] p-6 border border-white/10 space-y-5 backdrop-blur-sm mt-8">
              <div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider italic",
                  formData.type === 'despesa' ? "bg-rose-500/25 text-rose-250 border border-rose-500/20" : "bg-emerald-500/25 text-emerald-250 border border-emerald-500/20"
                )}>
                  {formData.type === 'despesa' ? 'Débito / Despesa' : 'Crédito / Receita'}
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] text-slate-405 font-bold uppercase tracking-wide">Valor do Lançamento</p>
                <p className="text-3xl font-mono font-black italic tracking-tight">
                  R$ {formData.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="border-t border-white/5 pt-4 space-y-3 text-xs font-semibold text-slate-300">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">Categoria:</span>
                  <span className="text-white italic font-black truncate max-w-[180px]">
                    {formData.category === 'Outros' ? (formData.customCategory || 'Outros') : formData.category}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">Vencimento:</span>
                  <span className="text-white font-mono">{formData.dueDate ? format(new Date(formData.dueDate + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">Forma Pagto:</span>
                  <span className="text-white capitalize">{formData.paymentMethod === 'não especificado' ? 'Não especificado' : (formData.paymentMethod || 'Não especificado')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">Status:</span>
                  <span className={cn(
                    "font-black uppercase text-[9px] px-2.5 py-0.5 rounded-md border",
                    formData.status === 'pago' 
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/20" 
                      : formData.status === 'pendente' 
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/20"
                      : "bg-rose-500/20 text-rose-300 border-rose-500/20"
                  )}>{formData.status}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative pt-6 border-t border-white/5 space-y-1">
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Gestão Financeira Stark
            </p>
            <p className="text-[11px] text-slate-300 leading-relaxed font-semibold italic">
              {formData.type === 'despesa' 
                ? "Registros de saída atualizam instantaneamente suas projeções de custos fixos e variáveis de estoque."
                : "Os recebimentos alimentam os prontuários dos pacientes e calculam automaticamente o ticket médio LTV."
              }
            </p>
          </div>
        </div>

        {/* RIGHT PANEL - FORM WORKSPACE */}
        <div className="flex-1 flex flex-col min-w-0 h-full bg-white overflow-hidden">
          
          {/* Header */}
          <div className="p-8 border-b border-slate-100/70 bg-white shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-650 text-[9px] font-black uppercase rounded-lg italic">Módulo de Tesouraria</span>
                <h2 className="text-2xl font-black text-slate-900 italic lowercase tracking-tight mt-1">
                  {transactionId ? 'editar lançamento' : 'novo lançamento financeiro'}
                </h2>
                <p className="text-xs font-semibold text-slate-500 lowercase mt-1">
                  Configure e organize as finanças da sua clínica com excelente distribuição de espaço.
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
            
             {/* TIPO DE LANÇAMENTO (TABS BUTTONS) & STATUS */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="space-y-2">
                 <Label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider pl-1 font-sans">Tipo de Fluxo</Label>
                 <div className="grid grid-cols-2 gap-2 bg-slate-100/60 p-1.5 rounded-2xl border border-slate-200/50">
                   <button
                     type="button"
                     onClick={() => setFormData({...formData, type: 'receita'})}
                     className={cn(
                       "h-11 rounded-xl text-xs font-black uppercase italic transition-all flex items-center justify-center gap-2",
                       formData.type === 'receita'
                         ? "bg-emerald-600 text-white shadow-md shadow-emerald-100"
                         : "text-slate-500 hover:text-slate-800"
                     )}
                   >
                     📈 Receita
                   </button>
                   <button
                     type="button"
                     onClick={() => setFormData({...formData, type: 'despesa'})}
                     className={cn(
                       "h-11 rounded-xl text-xs font-black uppercase italic transition-all flex items-center justify-center gap-2",
                       formData.type === 'despesa'
                         ? "bg-rose-600 text-white shadow-md shadow-rose-100"
                         : "text-slate-500 hover:text-slate-800"
                     )}
                   >
                     📉 Despesa
                   </button>
                 </div>
               </div>
               
               <div className="space-y-2">
                 <Label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider pl-1 font-sans">Status do Lançamento</Label>
                 <Select value={formData.status} onValueChange={(v: any) => setFormData({...formData, status: v})}>
                   <SelectTrigger className="h-14 font-black text-slate-800 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-transparent text-sm italic">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="pago" className="font-extrabold text-emerald-600 italic hover:bg-emerald-50 text-sm">✅ Quitado / Pago</SelectItem>
                     <SelectItem value="pendente" className="font-extrabold text-amber-500 italic hover:bg-amber-50 text-sm">⏳ Pendente / Em aberto</SelectItem>
                     <SelectItem value="atrasado" className="font-extrabold text-red-500 italic hover:bg-red-50 text-sm">⚠️ Em atraso</SelectItem>
                     <SelectItem value="cancelado" className="font-extrabold text-slate-400 italic text-sm">🚫 Cancelado</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
             </div>
 
             {/* VALOR DA TRANSAÇÃO & FORMA DE PAGAMENTO */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="space-y-2">
                 <Label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider pl-1 font-sans">Valor do Lançamento (R$)</Label>
                 <div className="relative">
                   <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400 font-mono">R$</span>
                   <Input 
                     value={displayValue}
                     onChange={handleValueChange}
                     placeholder="0,00"
                     className="pl-14 h-14 bg-slate-50 border-none rounded-2xl font-mono font-black text-lg text-slate-900 focus:ring-2 focus:ring-indigo-550 focus:outline-none focus:border-transparent"
                     required
                   />
                 </div>
               </div>
 
               <div className="space-y-2">
                 <Label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider pl-1 font-sans">Forma de Pagamento</Label>
                 <Select value={formData.paymentMethod} onValueChange={(v: any) => setFormData({...formData, paymentMethod: v})}>
                   <SelectTrigger className="h-14 font-black text-slate-800 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-transparent text-sm italic">
                     <SelectValue placeholder="Selecione..." />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="não especificado" className="font-bold text-slate-400 italic text-sm">Não especificado</SelectItem>
                     <SelectItem value="pix" className="font-bold italic text-sm">💎 Pix</SelectItem>
                     <SelectItem value="cartão de crédito" className="font-bold italic text-sm">💳 Cartão de Crédito</SelectItem>
                     <SelectItem value="dinheiro" className="font-bold italic text-sm">💵 Dinheiro físico</SelectItem>
                     <SelectItem value="boleto" className="font-bold italic text-sm">📄 Boleto Bancário</SelectItem>
                     <SelectItem value="transferência" className="font-bold italic text-sm">🏦 TED ou Doc</SelectItem>
                     <SelectItem value="múltiplo" className="font-bold italic text-indigo-650 bg-indigo-50/50 text-sm">🔀 Múltiplas Formas (Dividido)</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
             </div>
 
             {/* CATEGORIA */}
             <div className="grid grid-cols-1 gap-6">
               <div className="space-y-2">
                 <Label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider pl-1 font-sans">Categoria</Label>
                 <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                   <SelectTrigger className="h-14 font-black text-slate-800 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:border-transparent text-base italic py-4">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent className="max-h-[300px] overflow-y-auto">
                     {categoriesToUse.map(cat => (
                       <SelectItem key={cat} value={cat} className="font-bold text-base py-3 cursor-pointer hover:bg-slate-50 hover:text-indigo-650 transition-colors italic text-sm">{cat}</SelectItem>
                     ))}
                     <SelectItem value="Outros" className="font-bold text-indigo-1000 italic text-base py-3 hover:bg-slate-50 text-indigo-650 text-sm">✨ Outra Categoria...</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
             </div>
 
             {/* CUSTOM CATEGORY INPUT */}
             {formData.category === 'Outros' && (
               <div className="space-y-2 p-5 bg-indigo-50/55 rounded-2xl border border-indigo-100/50 animate-in fade-in duration-200">
                 <Label className="text-[10px] font-black text-indigo-950 uppercase pl-1 font-sans">Nome da Outra Categoria</Label>
                 <Input 
                   value={formData.customCategory}
                   onChange={(e) => setFormData({...formData, customCategory: e.target.value})}
                   placeholder="Ex: Café, Limpeza Clínica, etc."
                   className="h-12 bg-white border border-indigo-200/60 rounded-xl font-bold focus:ring-2 focus:ring-indigo-505 focus:outline-none"
                   required
                 />
               </div>
             )}

             {formData.paymentMethod === 'múltiplo' && (
                <div className="space-y-4 bg-indigo-50/20 p-5 rounded-2xl border border-indigo-100/50 animate-in fade-in duration-200 w-full font-sans text-xs">
                  <div className="flex justify-between items-center">
                    <Label className="text-indigo-900 font-extrabold italic text-xs uppercase tracking-wider">Múltiplas Formas de Pagamento (Divisão)</Label>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase rounded-xl h-8 cursor-pointer border-none"
                      onClick={() => {
                        const splits = formData.paymentSplits || [];
                        const currentTotal = splits.reduce((sum, s) => sum + s.amount, 0);
                        const remaining = Math.max(0, formData.amount - currentTotal);
                        setFormData({
                          ...formData,
                          paymentSplits: [
                            ...splits,
                            { method: 'pix', amount: remaining, status: 'pago', paymentDate: formData.paymentDate || formData.dueDate }
                          ]
                        });
                        setDisplaySplits([
                          ...displaySplits,
                          remaining === 0 ? '' : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(remaining)
                        ]);
                      }}
                    >
                      + Adicionar Forma
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {(formData.paymentSplits || []).map((split, index) => (
                      <div key={index} className="bg-white p-3 rounded-xl border border-slate-150 shadow-sm flex flex-col md:flex-row items-center gap-3">
                        <div className="flex-1 w-full">
                          <Label className="text-[9px] text-slate-400 font-bold uppercase mb-1 block">Forma</Label>
                          <Select 
                            value={split.method} 
                            onValueChange={(v) => {
                              const splits = [...(formData.paymentSplits || [])];
                              splits[index] = { ...split, method: v as any };
                              setFormData({ ...formData, paymentSplits: splits });
                            }}
                          >
                            <SelectTrigger className="h-10 border-slate-200 text-xs font-bold w-full rounded-lg bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[6000]">
                              <SelectItem value="pix">Pix</SelectItem>
                              <SelectItem value="cartão de crédito">Cartão de Crédito</SelectItem>
                              <SelectItem value="cartão de débito">Cartão de Débito</SelectItem>
                              <SelectItem value="dinheiro">Dinheiro</SelectItem>
                              <SelectItem value="boleto">Boleto</SelectItem>
                              <SelectItem value="transferência">Transferência</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="w-full md:w-32">
                          <Label className="text-[9px] text-slate-400 font-bold uppercase mb-1 block">Valor (R$)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 font-mono">R$</span>
                            <Input
                              type="text"
                              placeholder="0,00"
                              className="pl-8 h-10 border-slate-200 text-xs font-bold w-full rounded-lg font-mono bg-white"
                              value={displaySplits[index] || ''}
                              onChange={(e) => handleSplitValueChange(index, e.target.value)}
                            />
                          </div>
                        </div>

                        {split.method === 'cartão de crédito' && (
                          <div className="w-full md:w-20">
                            <Label className="text-[9px] text-slate-400 font-bold uppercase mb-1 block">Parcelas</Label>
                            <Select 
                              value={String(split.installments || 1)} 
                              onValueChange={(v) => {
                                const splits = [...(formData.paymentSplits || [])];
                                splits[index] = { ...split, installments: Number(v) };
                                setFormData({ ...formData, paymentSplits: splits });
                              }}
                            >
                              <SelectTrigger className="h-10 border-slate-200 text-xs font-bold w-full rounded-lg bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="z-[6000]">
                                {[...Array(12)].map((_, i) => (
                                  <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}x</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="w-full md:w-28">
                          <Label className="text-[9px] text-slate-400 font-bold uppercase mb-1 block">Status</Label>
                          <Select 
                            value={split.status} 
                            onValueChange={(v) => {
                              const splits = [...(formData.paymentSplits || [])];
                              splits[index] = { ...split, status: v as any };
                              setFormData({ ...formData, paymentSplits: splits });
                            }}
                          >
                            <SelectTrigger className="h-10 border-slate-200 text-xs font-bold w-full rounded-lg bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[6000]">
                              <SelectItem value="pago">Pago</SelectItem>
                              <SelectItem value="pendente">Pendente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {split.status === 'pago' && (
                          <div className="w-full md:w-36">
                            <Label className="text-[9px] text-slate-400 font-bold uppercase mb-1 block">Data Pagto.</Label>
                            <Input
                              type="date"
                              className="h-10 border-slate-200 text-xs font-bold w-full rounded-lg bg-white"
                              value={split.paymentDate || formData.paymentDate || formData.dueDate}
                              onChange={(e) => {
                                const splits = [...(formData.paymentSplits || [])];
                                splits[index] = { ...split, paymentDate: e.target.value };
                                setFormData({ ...formData, paymentSplits: splits });
                              }}
                            />
                          </div>
                        )}

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-red-500 hover:text-red-750 hover:bg-red-50 mt-4 shrink-0 rounded-xl cursor-pointer"
                          onClick={() => {
                            const splits = (formData.paymentSplits || []).filter((_, i) => i !== index);
                            setFormData({ ...formData, paymentSplits: splits });
                            setDisplaySplits(displaySplits.filter((_, i) => i !== index));
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    {(formData.paymentSplits || []).length === 0 && (
                      <p className="text-slate-400 font-bold text-xs italic text-center py-4">Nenhuma forma de pagamento adicionada.</p>
                    )}
                  </div>

                  {/* Resumo do Split */}
                  {(() => {
                    const splits = formData.paymentSplits || [];
                    const totalSplits = splits.reduce((sum, s) => sum + s.amount, 0);
                    const totalPaid = splits.filter(s => s.status === 'pago').reduce((sum, s) => sum + s.amount, 0);
                    const limitValue = formData.amount || 0;
                    const matchesTotal = Math.abs(totalSplits - limitValue) < 0.01;

                    return (
                      <div className="pt-3 border-t border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 font-sans text-xs">
                        <div className="space-y-1">
                          <div className="flex gap-2">
                            <span className="text-slate-500 font-bold">Lançado: R$ {totalSplits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <span className="text-slate-350">•</span>
                            <span className="text-green-600 font-bold">Pago: R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="font-extrabold text-[10px] uppercase text-indigo-700">
                            Total Cobrado: R$ {limitValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className={cn(
                          "px-3 py-1 rounded-full font-black text-[10px] uppercase border tracking-wider",
                          matchesTotal ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200 animate-pulse"
                        )}>
                          {matchesTotal ? 'Valores Fecham' : `Diferença: R$ ${(limitValue - totalSplits).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

             {/* DATAS: VENCIMENTO DA CONTA & DATA DE PAGAMENTO */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100/60">
               <div className="space-y-2">
                 <Label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider pl-1 font-sans">Vencimento da Conta</Label>
                 <CustomDatePicker 
                   value={formData.dueDate}
                   onChange={(val) => setFormData({...formData, dueDate: val})}
                   label="Vencimento"
                 />
               </div>
 
               <div className="space-y-2">
                 <Label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider pl-1 font-sans">Data de Pagamento</Label>
                 <CustomDatePicker 
                   value={formData.paymentDate}
                   onChange={(val) => setFormData({...formData, paymentDate: val})}
                   label="Pagamento"
                 />
               </div>
             </div>
 
             {/* CONDICIONAL: PACIENTE E AGENDA - APENAS RECEITA */}
             {formData.type === 'receita' ? (
               <div className="space-y-4 p-5 bg-emerald-50/30 rounded-[2.25rem] border border-emerald-100/50 animate-in slide-in-from-top-4 duration-300">
                 <h4 className="text-emerald-950 font-black text-[10px] uppercase tracking-wider italic pl-1">Vínculo com Paciente & Agenda (Opcional)</h4>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label className="text-emerald-900 font-bold text-[9px] uppercase pl-1">Paciente correspondente</Label>
                     <Select value={formData.patientId} onValueChange={(v) => setFormData({...formData, patientId: v, appointmentId: 'none'})}>
                       <SelectTrigger className="h-11 border-emerald-100 bg-white font-bold text-xs rounded-xl w-full">
                         <SelectValue placeholder="Nenhum">
                           {formData.patientId === 'none' ? 'Nenhum' : (patients.find(p => p.id === formData.patientId)?.name || 'Nenhum')}
                         </SelectValue>
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="none" className="italic font-bold text-slate-450 text-xs">Nenhum</SelectItem>
                         {patients.map(p => <SelectItem key={p.id} value={p.id} className="capitalize text-xs">{p.name}</SelectItem>)}
                       </SelectContent>
                     </Select>
                   </div>
 
                   <div className="space-y-2">
                     <Label className="text-emerald-900 font-bold text-[9px] uppercase pl-1">Consulta / Agenda associada</Label>
                     <Select value={formData.appointmentId} onValueChange={(v) => setFormData({...formData, appointmentId: v})}>
                       <SelectTrigger className="h-11 border-emerald-100 bg-white font-bold text-xs rounded-xl w-full">
                         <SelectValue placeholder="Nenhuma">
                           {(() => {
                             if (formData.appointmentId === 'none') return 'Nenhuma';
                             const a = filteredAppointments.find(appt => appt.id === formData.appointmentId);
                             if (!a) return 'Nenhuma';
                             return `${format(new Date(a.date + 'T12:00:00'), 'dd/MM')} - ${a.startTime} (${a.type})`;
                           })()}
                         </SelectValue>
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="none" className="italic font-bold text-slate-455 text-xs">Nenhuma</SelectItem>
                         {filteredAppointments.map(a => (
                           <SelectItem key={a.id} value={a.id} className="italic font-bold text-xs">
                             {format(new Date(a.date + 'T12:00:00'), 'dd/MM')} - {a.startTime} ({a.type})
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                 </div>
               </div>
             ) : (
               <div className="p-5 bg-rose-50/40 rounded-[2.25rem] border border-rose-100/50 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300">
                 <div className="w-8 h-8 rounded-lg bg-rose-150 text-rose-650 flex items-center justify-center shrink-0">
                   <Landmark className="w-4 h-4" />
                 </div>
                 <p className="text-xs text-rose-805 font-semibold leading-normal">
                   <strong className="font-extrabold uppercase">Despesa institucional:</strong> Lançamento desvinculado de pacientes, ideal para contas operacionais, compra de material, aluguel, etc.
                 </p>
               </div>
             )}
 
             {/* DESCRIÇÃO DO LANÇAMENTO */}
             <div className="space-y-2">
               <Label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider pl-1 font-sans">Descrição / Notas do Lançamento</Label>
               <div className="relative">
                 <FileText className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                 <textarea 
                   value={formData.description}
                   onChange={(e) => setFormData({...formData, description: e.target.value})}
                   placeholder="Ex: Compra de luvas descartáveis, pagamento de energia Copel ref maio..."
                   className="pl-12 pr-4 py-3 min-h-[90px] w-full border border-slate-200/70 rounded-2xl font-medium text-xs text-slate-705 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 resize-none transition-all"
                 />
               </div>
             </div>
 
             {/* Actions Footer */}
             <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
               <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-12 px-6 font-bold text-slate-500 hover:text-slate-800">
                 Cancelar
               </Button>
               <Button type="submit" className="bg-indigo-650 hover:bg-indigo-700 text-white font-black italic shadow-xl shadow-indigo-100 rounded-xl px-8 h-12 uppercase text-[11px] tracking-wider">
                 {transactionId ? 'Salvar Alterações' : 'Confirmar Lançamento'}
               </Button>
             </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
