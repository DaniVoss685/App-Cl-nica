import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Appointment } from '../types';
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  CalendarCheck,
  Search,
  RefreshCw,
  AlertCircle,
  User,
  Stethoscope,
  PhoneCall,
  PhoneMissed,
  CalendarDays,
} from 'lucide-react';
import { format, isToday, isTomorrow, parseISO, startOfDay, addDays, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppointmentModal } from '../components/AppointmentModal';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { whatsappService } from '../services/whatsappService';

type PeriodFilter = 'hoje' | 'amanha' | '7dias' | '30dias';
type StatusFilter = 'todos' | 'pendente' | 'mensagem enviada' | 'confirmado' | 'cancelado';

const statusConfig = {
  pendente: {
    label: 'Pendente',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
    icon: AlertCircle,
  },
  'mensagem enviada': {
    label: 'Msg Enviada',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    dot: 'bg-blue-400',
    icon: MessageSquare,
  },
  confirmado: {
    label: 'Confirmado',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  cancelado: {
    label: 'Cancelado',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    dot: 'bg-red-500',
    icon: XCircle,
  },
};

function getDayLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Hoje';
  if (isTomorrow(date)) return 'Amanhã';
  return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
}

function getDayBadgeStyle(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'bg-indigo-600 text-white';
  if (isTomorrow(date)) return 'bg-amber-500 text-white';
  return 'bg-slate-100 text-slate-600';
}

export function Confirmacoes() {
  const { appointments, patients, professionals, services, packages, updateAppointment, finance } = useStore();
  const navigate = useNavigate();

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('7dias');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [professionalFilter, setProfessionalFilter] = useState<string>('todos');
  const [search, setSearch] = useState('');
  const [rescheduleApptId, setRescheduleApptId] = useState<string | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'confirmacoes' | 'realizados'>('confirmacoes');
  const [selectedApptId, setSelectedApptId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'todos' | 'retorno' | 'outros'>('todos');

  const today = startOfDay(new Date());

  // Filtro de período
  const periodEnd = useMemo(() => {
    if (periodFilter === 'hoje') return addDays(today, 1);
    if (periodFilter === 'amanha') return addDays(today, 2);
    if (periodFilter === '7dias') return addDays(today, 7);
    return addDays(today, 30);
  }, [periodFilter, today]);

  const periodStart = useMemo(() => {
    if (periodFilter === 'amanha') return addDays(today, 1);
    return today;
  }, [periodFilter, today]);

  // Agendamentos dentro do período
  const filteredAppointments = useMemo(() => {
    return appointments
      .filter(appt => {
        const date = parseISO(appt.date);
        if (isBefore(date, periodStart) || !isBefore(date, periodEnd)) return false;
        
        // Se a consulta foi realizada/finalizada, não aparece no painel de confirmações
        if (appt.status === 'realizado' || appt.status === 'finalizado') return false;

        const isCancelledOrMissed = appt.confirmationStatus === 'cancelado' || appt.status === 'faltou' || appt.status === 'cancelado';

        if (statusFilter === 'cancelado') {
          if (!isCancelledOrMissed) return false;
        } else if (statusFilter !== 'todos') {
          if (isCancelledOrMissed) return false;
          if (appt.confirmationStatus !== statusFilter) return false;
        } else {
          // Se for todos, mostramos
        }

        if (professionalFilter !== 'todos' && appt.professionalId !== professionalFilter) return false;
        
        if (typeFilter === 'retorno') {
          if (appt.type !== 'retorno') return false;
        } else if (typeFilter === 'outros') {
          if (appt.type === 'retorno') return false;
        }

        if (search) {
          const patient = patients.find(p => p.id === appt.patientId);
          if (!patient?.name.toLowerCase().includes(search.toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });
  }, [appointments, patients, periodStart, periodEnd, statusFilter, professionalFilter, typeFilter, search]);

  // Agrupamento por data
  const grouped = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    filteredAppointments.forEach(appt => {
      if (!map.has(appt.date)) map.set(appt.date, []);
      map.get(appt.date)!.push(appt);
    });
    return Array.from(map.entries());
  }, [filteredAppointments]);

  // Métricas (todos os próximos 30 dias, sem filtro de status)
  const allUpcoming = useMemo(() => {
    const end = addDays(today, 30);
    return appointments.filter(appt => {
      const date = parseISO(appt.date);
      return (isAfter(date, addDays(today, -1)) || isToday(date)) &&
        isBefore(date, end) &&
        appt.status !== 'realizado' &&
        appt.status !== 'finalizado';
    });
  }, [appointments, today]);

  const metrics = useMemo(() => {
    const pendentes = allUpcoming.filter(a => a.confirmationStatus === 'pendente' && a.status !== 'faltou' && a.status !== 'cancelado').length;
    const msgEnviada = allUpcoming.filter(a => a.confirmationStatus === 'mensagem enviada' && a.status !== 'faltou' && a.status !== 'cancelado').length;
    const confirmados = allUpcoming.filter(a => a.confirmationStatus === 'confirmado' && a.status !== 'faltou' && a.status !== 'cancelado').length;
    const cancelados = allUpcoming.filter(a => a.confirmationStatus === 'cancelado' || a.status === 'faltou' || a.status === 'cancelado').length;
    
    return { total: allUpcoming.length, pendentes, msgEnviada, confirmados, cancelados };
  }, [allUpcoming]);

  const completedAppointmentsFiltered = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayDate = new Date();
    
    return appointments
      .filter(appt => {
        if (appt.status !== 'realizado' && appt.status !== 'finalizado') return false;

        // Filtro de Período Customizado para passados/concluídos
        if (periodFilter === 'hoje') {
          if (appt.date !== todayStr) return false;
        } else if (periodFilter === 'amanha') {
          const tomStr = format(addDays(todayDate, 1), 'yyyy-MM-dd');
          if (appt.date !== tomStr) return false;
        } else if (periodFilter === '7dias') {
          const startLimit = format(addDays(todayDate, -7), 'yyyy-MM-dd');
          const endLimit = format(addDays(todayDate, 1), 'yyyy-MM-dd'); // inclui hoje
          if (appt.date < startLimit || appt.date > endLimit) return false;
        } else if (periodFilter === '30dias') {
          const startLimit = format(addDays(todayDate, -30), 'yyyy-MM-dd');
          const endLimit = format(addDays(todayDate, 1), 'yyyy-MM-dd'); // inclui hoje
          if (appt.date < startLimit || appt.date > endLimit) return false;
        }

        if (professionalFilter !== 'todos' && appt.professionalId !== professionalFilter) return false;

        if (typeFilter === 'retorno') {
          if (appt.type !== 'retorno') return false;
        } else if (typeFilter === 'outros') {
          if (appt.type === 'retorno') return false;
        }

        if (search) {
          const patient = patients.find(p => p.id === appt.patientId);
          if (!patient?.name.toLowerCase().includes(search.toLowerCase())) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Mais recentes primeiro (ordem decrescente de data/hora)
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.startTime.localeCompare(a.startTime);
      });
  }, [appointments, patients, periodFilter, professionalFilter, typeFilter, search]);

  const handleConfirmationChange = (
    appt: Appointment,
    newStatus: Appointment['confirmationStatus']
  ) => {
    const updates: Partial<Appointment> = { confirmationStatus: newStatus };
    if (newStatus === 'confirmado') updates.status = 'confirmado';
    if (newStatus === 'cancelado') updates.status = 'cancelado';
    updateAppointment(appt.id, updates);

    const patient = patients.find(p => p.id === appt.patientId);
    const msgs: Record<string, string> = {
      'mensagem enviada': `Mensagem marcada como enviada para ${patient?.name || 'paciente'}`,
      confirmado: `${patient?.name || 'Paciente'} confirmado(a) ✅`,
      cancelado: `${patient?.name || 'Paciente'} marcado(a) como cancelado ❌`,
    };
    toast.success(msgs[newStatus] || 'Status atualizado');
  };

  // Enviar Mensagem de Falta (WhatsApp)
  const handleSendMissedWhatsApp = (appt: Appointment) => {
    const patient = patients.find(p => p.id === appt.patientId);
    const service = appt.serviceId && appt.serviceId !== 'none'
      ? services.find(s => s.id === appt.serviceId)
      : null;
    
    if (!patient || !patient.phone) {
      toast.error('Telefone do paciente não disponível');
      return;
    }
    
    const cleanPhone = patient.phone.replace(/\D/g, '');
    const serviceName = service?.name || 'Procedimento';
    
    const text = `Olá ${patient.name}, notamos que você não compareceu ao seu agendamento de ${serviceName} agendado para hoje. Aconteceu alguma coisa? Gostaria de reagendar para outra data?`;
    
    // Navega para o WhatsApp interno passando o telefone e a mensagem como query params
    navigate(`/whatsapp?phone=${cleanPhone}&text=${encodeURIComponent(text)}`);
  };

  // Enviar Confirmação de Agenda (WhatsApp)
  const handleSendConfirmWhatsApp = (appt: Appointment) => {
    const patient = patients.find(p => p.id === appt.patientId);
    const service = appt.serviceId && appt.serviceId !== 'none'
      ? services.find(s => s.id === appt.serviceId)
      : null;
    const professional = professionals.find(p => p.id === appt.professionalId);
    
    if (!patient || !patient.phone) {
      toast.error('Telefone do paciente não disponível');
      return;
    }
    
    const cleanPhone = patient.phone.replace(/\D/g, '');
    const [year, month, day] = appt.date.split('-').map(Number);
    const formattedDate = format(new Date(year, month - 1, day), 'dd/MM/yyyy');
    const serviceName = service?.name || 'Procedimento';
    const profName = professional?.name || 'Profissional';
    
    const text = `Bom dia ${patient.name}, tudo bem? Estamos confirmando seu agendamento de ${serviceName} com o(a) Dr(a). ${profName} no dia ${formattedDate} às ${appt.startTime}. Confirma sua presença?`;
    
    // Atualiza o status para mensagem enviada localmente e supabase
    handleConfirmationChange(appt, 'mensagem enviada');
    
    // Navega para o WhatsApp interno
    navigate(`/whatsapp?phone=${cleanPhone}&text=${encodeURIComponent(text)}`);
  };

  const handleReschedule = (apptId: string) => {
    setRescheduleApptId(apptId);
    setRescheduleOpen(true);
  };

  const clinicalProfessionals = professionals.filter(p => p.tipoMembro === 'clinico' || !p.tipoMembro);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200">
              <CalendarCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black italic uppercase text-slate-900 tracking-tight">Central de Confirmações</h1>
              <p className="text-slate-400 text-xs font-medium font-sans">Gerencie a confirmação de presença dos pacientes agendados e acompanhe as faltas</p>
            </div>
          </div>
        </div>
        <div className="text-right text-xs text-slate-400 font-medium hidden sm:block font-sans">
          <div className="font-bold text-slate-600">{format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</div>
          <div>Próximos 30 dias monitorados</div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 select-none shrink-0 mb-4">
        <button
          onClick={() => {
            setActiveTab('confirmacoes');
            setPeriodFilter('7dias');
          }}
          className={cn(
            "pb-4 px-6 font-black uppercase text-xs tracking-wider border-b-2 transition-all cursor-pointer",
            activeTab === 'confirmacoes' 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          Confirmações de Presença
        </button>
        <button
          onClick={() => {
            setActiveTab('realizados');
            setPeriodFilter('hoje');
          }}
          className={cn(
            "pb-4 px-6 font-black uppercase text-xs tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2",
            activeTab === 'realizados' 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          Consultas Realizadas (Baixas)
          {appointments.filter(a => (a.status === 'realizado' || a.status === 'finalizado') && a.date === format(new Date(), 'yyyy-MM-dd')).length > 0 && (
            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black rounded-full font-sans">
              {appointments.filter(a => (a.status === 'realizado' || a.status === 'finalizado') && a.date === format(new Date(), 'yyyy-MM-dd')).length} hoje
            </span>
          )}
        </button>
      </div>

      {/* Métricas */}
      {activeTab === 'confirmacoes' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button
            onClick={() => setStatusFilter('pendente')}
            className={`rounded-2xl p-4 border-2 text-left transition-all hover:shadow-md cursor-pointer ${statusFilter === 'pendente' ? 'border-amber-400 bg-amber-50 shadow-md shadow-amber-100' : 'border-transparent bg-white shadow-sm hover:border-amber-200'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-450 uppercase tracking-wider font-sans">Pendentes</span>
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-black text-amber-600">{metrics.pendentes}</div>
            <div className="text-xs text-amber-500 font-medium mt-0.5 font-sans">Aguardando contato</div>
          </button>

          <button
            onClick={() => setStatusFilter('mensagem enviada')}
            className={`rounded-2xl p-4 border-2 text-left transition-all hover:shadow-md cursor-pointer ${statusFilter === 'mensagem enviada' ? 'border-blue-400 bg-blue-50 shadow-md shadow-blue-100' : 'border-transparent bg-white shadow-sm hover:border-blue-200'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-450 uppercase tracking-wider font-sans">Msg Enviada</span>
              <MessageSquare className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-3xl font-black text-blue-600">{metrics.msgEnviada}</div>
            <div className="text-xs text-blue-500 font-medium mt-0.5 font-sans">Aguardando retorno</div>
          </button>

          <button
            onClick={() => setStatusFilter('confirmado')}
            className={`rounded-2xl p-4 border-2 text-left transition-all hover:shadow-md cursor-pointer ${statusFilter === 'confirmado' ? 'border-emerald-400 bg-emerald-50 shadow-md shadow-emerald-100' : 'border-transparent bg-white shadow-sm hover:border-emerald-200'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-450 uppercase tracking-wider font-sans">Confirmados</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-black text-emerald-600">{metrics.confirmados}</div>
            <div className="text-xs text-emerald-500 font-medium mt-0.5 font-sans">Presença garantida</div>
          </button>

          <button
            onClick={() => setStatusFilter('cancelado')}
            className={`rounded-2xl p-4 border-2 text-left transition-all hover:shadow-md cursor-pointer ${statusFilter === 'cancelado' ? 'border-red-400 bg-red-50 shadow-md shadow-red-100' : 'border-transparent bg-white shadow-sm hover:border-red-200'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-450 uppercase tracking-wider font-sans">Cancelados & Faltas</span>
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-3xl font-black text-red-600">{metrics.cancelados}</div>
            <div className="text-xs text-red-500 font-medium mt-0.5 font-sans">Ausências e cancelados</div>
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
          {/* Período */}
          <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1">
            {(['hoje', 'amanha', '7dias', '30dias'] as PeriodFilter[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriodFilter(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${periodFilter === p ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {p === 'hoje' ? 'Hoje' : p === 'amanha' ? 'Amanhã' : p === '7dias' ? '7 dias' : '30 dias'}
              </button>
            ))}
          </div>

          {/* Status */}
          {activeTab === 'confirmacoes' && (
            <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1 flex-wrap">
              {(['todos', 'pendente', 'mensagem enviada', 'confirmado', 'cancelado'] as StatusFilter[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize cursor-pointer ${statusFilter === s ? 'bg-white shadow text-slate-800 border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {s === 'todos' ? 'Todos os status' : s === 'mensagem enviada' ? 'Msg Enviada' : s === 'cancelado' ? 'Cancelados & Faltas' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {/* Classificação / Tipo */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="h-9 px-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 transition-colors text-slate-600"
            >
              <option value="todos">Todos os tipos</option>
              <option value="retorno">Apenas Retornos 🔄</option>
              <option value="outros">Consultas / Procedimentos</option>
            </select>

            {/* Profissional */}
            <select
              value={professionalFilter}
              onChange={e => setProfessionalFilter(e.target.value)}
              className="h-9 px-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 transition-colors text-slate-600"
            >
              <option value="todos">Todos os profissionais</option>
              {clinicalProfessionals.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar paciente..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-9 pl-8 pr-4 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 transition-colors w-44"
              />
            </div>

            {/* Reset filtros */}
            {(statusFilter !== 'todos' || professionalFilter !== 'todos' || typeFilter !== 'todos' || search) && (
              <button
                onClick={() => { setStatusFilter('todos'); setProfessionalFilter('todos'); setTypeFilter('todos'); setSearch(''); }}
                className="h-9 px-3 text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

             {/* Lista */}
      {activeTab === 'confirmacoes' && (
        <>
          {grouped.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CalendarCheck className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-black italic text-slate-400 uppercase">Nenhum agendamento encontrado</h3>
              <p className="text-slate-450 text-sm mt-1 font-sans">
                {statusFilter !== 'todos'
                  ? `Não há agendamentos com status "${statusFilter === 'cancelado' ? 'Cancelados & Faltas' : statusFilter}" no período selecionado.`
                  : 'Não há agendamentos no período selecionado.'}
              </p>
              {statusFilter !== 'todos' && (
                <button
                  onClick={() => setStatusFilter('todos')}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer font-sans"
                >
                  Ver todos os status
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(([date, appts]) => {
                const dayLabel = getDayLabel(date);
                const badgeStyle = getDayBadgeStyle(date);
                const pendentesNoDia = appts.filter(a => a.confirmationStatus === 'pendente' && a.status !== 'faltou' && a.status !== 'cancelado').length;

                return (
                  <div key={date} className="space-y-3">
                    {/* Cabeçalho do dia */}
                    <div className="flex items-center gap-3 pt-2">
                      <span className={`px-3 py-1 text-xs font-black uppercase italic tracking-wider rounded-xl ${badgeStyle} font-sans`}>
                        {dayLabel}
                      </span>
                      {(isToday(parseISO(date)) || isTomorrow(parseISO(date))) && (
                        <span className="text-xs text-slate-400 font-medium font-sans">
                          {format(parseISO(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      )}
                      <div className="flex-1 h-px bg-slate-100" />
                      <span className="text-xs font-bold text-slate-400 font-sans">
                        {appts.length} agendamento{appts.length !== 1 ? 's' : ''}
                      </span>
                      {pendentesNoDia > 0 && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full font-sans">
                          {pendentesNoDia} pendente{pendentesNoDia !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Cards do dia */}
                    <div className="space-y-2">
                      {appts.map(appt => {
                        const patient = patients.find(p => p.id === appt.patientId);
                        const professional = professionals.find(p => p.id === appt.professionalId);
                        const service = appt.serviceId && appt.serviceId !== 'none'
                          ? services.find(s => s.id === appt.serviceId)
                          : null;
                        const pkg = appt.packageId && appt.packageId !== 'none'
                          ? packages.find(p => p.id === appt.packageId)
                          : null;
                        
                        const isCancelledOrMissed = appt.status === 'faltou' || appt.status === 'cancelado' || appt.confirmationStatus === 'cancelado';
                        const cfg = isCancelledOrMissed ? statusConfig.cancelado : (statusConfig[appt.confirmationStatus] ?? statusConfig.pendente);
                        const StatusIcon = cfg.icon;
                        const isConfirmed = appt.confirmationStatus === 'confirmado' && !isCancelledOrMissed;
                        const isCompleted = appt.status === 'realizado' || appt.status === 'finalizado';
                        const linkedTx = finance.find(f => f.appointmentId === appt.id);
                        const hasDeletedPayment = isCompleted && !linkedTx;

                        return (
                          <div
                            key={appt.id}
                            onClick={() => {
                              setSelectedApptId(appt.id);
                              setIsEditModalOpen(true);
                            }}
                            className={cn(
                              "bg-white border-2 rounded-2xl p-4 transition-all hover:shadow-md cursor-pointer hover:border-indigo-300",
                              cfg.border,
                              isConfirmed ? "opacity-80" : ""
                            )}
                          >
                            <div className="flex items-center gap-4">
                              {/* Horário */}
                              <div className="shrink-0 text-center w-14">
                                <div className="text-sm font-black text-slate-900">{appt.startTime}</div>
                                <div className="text-[10px] text-slate-400 font-medium font-sans">{appt.endTime}</div>
                              </div>

                              {/* Separador */}
                              <div className={`w-1 h-12 rounded-full shrink-0 ${cfg.dot}`} />

                              {/* Info do paciente */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-black text-slate-900 text-sm">
                                    {patient?.name || 'Paciente não encontrado'}
                                  </span>
                                  {appt.type === 'retorno' && (
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-extrabold rounded-full border border-purple-250 uppercase font-sans animate-pulse tracking-wider">
                                      🔄 Retorno
                                    </span>
                                  )}
                                  <span className={cn(
                                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border font-sans",
                                    cfg.bg, cfg.border, cfg.text
                                  )}>
                                    <StatusIcon className="w-3 h-3" />
                                    {appt.status === 'faltou' ? 'Faltou' : cfg.label}
                                  </span>
                                  {hasDeletedPayment ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold border uppercase font-sans flex items-center gap-1 bg-red-50 text-red-750 border-red-200 animate-shake">
                                      <span>❌</span>
                                      <span>Pagamento Excluído</span>
                                    </span>
                                  ) : appt.paymentStatus && appt.paymentStatus !== 'pendente' && (
                                    <span className={cn(
                                      "px-2 py-0.5 rounded-full text-[10px] font-extrabold border uppercase font-sans flex items-center gap-1",
                                      appt.paymentStatus === 'pago' 
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                        : "bg-purple-50 text-purple-705 border-purple-250 animate-pulse"
                                    )}>
                                      <span>💰</span>
                                      <span>{appt.paymentStatus === 'pago' ? 'Pago' : `Falta R$ ${((appt.value || 0) - (appt.upfrontPaidAmount || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</span>
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                  {(service || pkg) && (
                                    <span className="flex items-center gap-1 text-xs text-slate-500 font-medium font-sans">
                                      <Stethoscope className="w-3 h-3 text-indigo-500" />
                                      {service?.name || pkg?.name}
                                    </span>
                                  )}
                                  {professional && (
                                    <span className="flex items-center gap-1 text-xs text-slate-400 font-medium font-sans">
                                      <User className="w-3 h-3" />
                                      {professional.name}
                                    </span>
                                  )}
                                  {appt.type !== 'retorno' && (
                                    <span className="flex items-center gap-1 text-xs text-slate-400 font-medium capitalize font-sans">
                                      <Clock className="w-3 h-3" />
                                      {appt.type}
                                    </span>
                                  )}
                                </div>
                                {patient?.phone && (
                                  <div className="mt-0.5 text-[10px] text-slate-450 font-medium flex items-center gap-1 font-sans">
                                    <PhoneCall className="w-3 h-3 text-green-500" />
                                    {patient.phone}
                                  </div>
                                )}
                              </div>

                              {/* Ações rápidas */}
                              <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end" onClick={(e) => e.stopPropagation()}>
                                {!isConfirmed && !isCancelledOrMissed && (
                                  <>
                                    <button
                                      onClick={() => handleSendConfirmWhatsApp(appt)}
                                      title="Enviar mensagem de confirmação via WhatsApp"
                                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-all cursor-pointer font-sans"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5 text-green-600" />
                                      <span>Enviar WhatsApp</span>
                                    </button>
                                    {appt.confirmationStatus !== 'mensagem enviada' && (
                                      <button
                                        onClick={() => handleConfirmationChange(appt, 'mensagem enviada')}
                                        title="Marcar como mensagem enviada"
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all cursor-pointer font-sans"
                                      >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Msg Enviada</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleConfirmationChange(appt, 'confirmado')}
                                      title="Confirmar presença"
                                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer font-sans"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Confirmar</span>
                                    </button>
                                    <button
                                      onClick={() => handleConfirmationChange(appt, 'cancelado')}
                                      title="Marcar como cancelado"
                                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-750 border border-red-200 hover:bg-red-100 transition-all cursor-pointer font-sans"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Cancelar</span>
                                    </button>
                                  </>
                                )}

                                {isConfirmed && (
                                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-755 border border-emerald-200 font-sans">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Presença confirmada
                                  </div>
                                )}

                                {isCancelledOrMissed && (
                                  <div className="flex items-center gap-2 flex-wrap justify-end">
                                    <button
                                      onClick={() => handleSendMissedWhatsApp(appt)}
                                      title="Enviar mensagem de falta via WhatsApp"
                                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-all cursor-pointer font-sans animate-bounce"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5 text-green-600 animate-pulse" />
                                      <span>Mandar Msg de Falta</span>
                                    </button>
                                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-755 border border-red-200 font-sans">
                                      <PhoneMissed className="w-3.5 h-3.5" />
                                      {appt.status === 'faltou' ? 'Faltou' : 'Cancelado'}
                                    </div>
                                    <button
                                      onClick={() => handleReschedule(appt.id)}
                                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all cursor-pointer font-sans"
                                    >
                                      <CalendarDays className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Reagendar</span>
                                    </button>
                                  </div>
                                )}

                                {isConfirmed && (
                                  <button
                                    onClick={() => handleConfirmationChange(appt, 'pendente')}
                                    title="Reverter confirmação"
                                    className="p-2 rounded-xl text-xs text-slate-350 hover:text-slate-550 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200 cursor-pointer"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Lista de Realizados */}
      {activeTab === 'realizados' && (
        <div className="space-y-4">
          {/* Métricas do Período para Realizados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-450 uppercase tracking-wider block font-sans">Total Realizados no Período</span>
                <span className="text-3xl font-black text-indigo-605 block mt-1">
                  {completedAppointmentsFiltered.length}
                </span>
                <span className="text-[10px] text-slate-400 font-sans mt-0.5 block">Consultas com baixa no período selecionado</span>
              </div>
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-455 uppercase tracking-wider block font-sans">Valor Total Cobrado</span>
                <span className="text-3xl font-black text-emerald-650 block mt-1">
                  R$ {completedAppointmentsFiltered.reduce((sum, a) => sum + (a.value || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 font-sans mt-0.5 block">Soma dos valores dos atendimentos concluídos</span>
              </div>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner">
                <span className="text-lg font-black font-sans">R$</span>
              </div>
            </div>
          </div>

          {/* Lista de Realizados */}
          {completedAppointmentsFiltered.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <p className="text-slate-400 font-bold text-sm italic">Nenhum atendimento concluído encontrado para este período.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {completedAppointmentsFiltered.map(appt => {
                const patient = patients.find(p => p.id === appt.patientId);
                const professional = professionals.find(p => p.id === appt.professionalId);
                const service = appt.serviceId && appt.serviceId !== 'none'
                  ? services.find(s => s.id === appt.serviceId)
                  : null;
                const pkg = appt.packageId && appt.packageId !== 'none'
                  ? packages.find(p => p.id === appt.packageId)
                  : null;

                const dayLabel = getDayLabel(appt.date);
                const linkedTx = finance.find(f => f.appointmentId === appt.id);
                const hasDeletedPayment = !linkedTx;

                return (
                  <div key={appt.id} className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-4">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      {/* Paciente e Horário */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-900 text-base capitalize">
                            {patient?.name || 'Paciente não encontrado'}
                          </h4>
                          {appt.type === 'retorno' && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-extrabold rounded-full border border-purple-250 uppercase font-sans animate-pulse tracking-wider">
                              🔄 Retorno
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200 uppercase font-sans">
                            Concluído
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-bold font-sans">
                          {dayLabel} — {appt.startTime} às {appt.endTime}
                        </p>
                      </div>

                      {/* Botão de Ver Ficha */}
                      <button
                        onClick={() => {
                          setSelectedApptId(appt.id);
                          setIsEditModalOpen(true);
                        }}
                        className="px-4 py-2 border border-slate-200 bg-slate-50 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 active:scale-95 transition-all cursor-pointer font-sans"
                      >
                        Ver Detalhes / Editar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block font-sans">Profissional</span>
                        <span className="text-slate-750 font-bold text-xs mt-0.5 block truncate">
                          Dr(a). {professional?.name || 'Clínica'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block font-sans">Procedimento / Serviço</span>
                        <span className="text-slate-750 font-bold text-xs mt-0.5 block truncate capitalize">
                          {service?.name || pkg?.name || 'Geral'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block font-sans">Financeiro</span>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-indigo-950 font-black text-xs">
                            R$ {(appt.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          {hasDeletedPayment ? (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black border uppercase font-sans bg-red-50 text-red-700 border-red-250 animate-shake">
                              Pagamento Excluído
                            </span>
                          ) : (
                            <>
                              <span className={cn(
                                "px-1.5 py-0.2 rounded-full text-[9px] font-black border uppercase font-sans",
                                appt.paymentStatus === 'pago' 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-250" 
                                  : appt.paymentStatus === 'parcial'
                                  ? "bg-purple-50 text-purple-700 border-purple-255"
                                  : "bg-amber-50 text-amber-700 border-amber-250"
                              )}>
                                {appt.paymentStatus === 'pago' ? 'Pago' : appt.paymentStatus === 'parcial' ? 'Parcial' : 'Aguardando'}
                              </span>
                              {appt.paymentMethod && (
                                <span className="text-[10px] text-slate-450 font-bold capitalize font-sans">
                                  via {appt.paymentMethod}
                                  {appt.paymentMethod === 'cartão de crédito' && appt.cardInstallments && (
                                    <span className="font-black text-indigo-700 ml-1">({appt.cardInstallments}x)</span>
                                  )}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        {!hasDeletedPayment && appt.paymentStatus === 'parcial' && (
                          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-purple-800 font-extrabold uppercase font-sans bg-purple-50/50 px-2.5 py-1 rounded-xl border border-purple-200 w-fit">
                            <span>✅ pago: R$ {(appt.upfrontPaidAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <span className="mx-1 text-purple-300">|</span>
                            <span className="text-amber-750">⚠️ falta receber: R$ {((appt.value || 0) - (appt.upfrontPaidAmount || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Evolução Clínica / Notas */}
                    {appt.notes && (
                      <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                        <span className="text-[9px] text-slate-450 uppercase font-black tracking-wider block font-sans">📝 evolução clínica / diagnóstico:</span>
                        <p className="text-xs text-slate-650 font-semibold italic leading-relaxed whitespace-pre-wrap font-sans">
                          "{appt.notes}"
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal for Realizados */}
      {isEditModalOpen && (
        <AppointmentModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          appointmentId={selectedApptId}
          onSuccess={() => setIsEditModalOpen(false)}
        />
      )}

      {/* Modal de reagendamento */}
      {rescheduleOpen && (
        <AppointmentModal
          open={rescheduleOpen}
          onOpenChange={setRescheduleOpen}
          appointmentId={rescheduleApptId}
          onSuccess={() => setRescheduleOpen(false)}
        />
      )}
    </div>
  );
}
