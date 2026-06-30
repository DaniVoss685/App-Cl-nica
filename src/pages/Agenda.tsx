import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  Globe,
  RefreshCcw,
  CalendarDays,
  FileText,
  DollarSign,
  Briefcase,
  Layers,
  Sparkles,
  Link2,
  Stethoscope,
  Maximize2
} from 'lucide-react';
import { 
  format, 
  addDays, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  startOfMonth, 
  endOfMonth, 
  addWeeks, 
  subWeeks,
  addMonths,
  subMonths
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppointmentModal } from '../components/AppointmentModal';
import { PostponedTimersList } from '../components/PostponedTimersList';
import { cn } from '../lib/utils';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';

type ViewMode = 'dia' | 'semana' | 'mes';

export function Agenda() {
  const location = useLocation();
  const { appointments, patients, services, professionals } = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('dia');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApptId, setSelectedApptId] = useState<string | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [profFilter, setProfFilter] = useState<string>(location.state?.professionalId || 'all');
  const [copiedLink, setCopiedLink] = useState(false);

  // Return interaction states
  const [retornoModalData, setRetornoModalData] = useState<{
    hasReturn: boolean;
    originalAppt: any;
    returnAppt?: any;
    patient?: any;
    originalService?: any;
    returnProfessional?: any;
    followUpDays?: number;
  } | null>(null);

  // Onboarding listeners
  useEffect(() => {
    const handleOpen = () => {
      setSelectedApptId(null);
      setIsModalOpen(true);
    };
    const handleClose = () => setIsModalOpen(false);

    window.addEventListener('open-onboarding-appointment-modal', handleOpen);
    window.addEventListener('close-onboarding-modals', handleClose);

    return () => {
      window.removeEventListener('open-onboarding-appointment-modal', handleOpen);
      window.removeEventListener('close-onboarding-modals', handleClose);
    };
  }, []);

  const handleCopyPortalLink = () => {
    const link = `${window.location.origin}/agendamento-online`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredAppointments = useMemo(() => {
    if (profFilter === 'all') return appointments;
    return appointments.filter(a => a.professionalId === profFilter);
  }, [appointments, profFilter]);

  const dayAppointments = useMemo(() => filteredAppointments
    .filter(a => isSameDay(new Date(a.date + 'T12:00:00'), selectedDate))
    .sort((a, b) => a.startTime.localeCompare(b.startTime)), [filteredAppointments, selectedDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  const handlePrev = () => {
    if (viewMode === 'dia') setSelectedDate(subDays(selectedDate, 1));
    else if (viewMode === 'semana') setSelectedDate(subWeeks(selectedDate, 1));
    else setSelectedDate(subMonths(selectedDate, 1));
  };

  const handleNext = () => {
    if (viewMode === 'dia') setSelectedDate(addDays(selectedDate, 1));
    else if (viewMode === 'semana') setSelectedDate(addWeeks(selectedDate, 1));
    else setSelectedDate(addMonths(selectedDate, 1));
  };

  const timeSlots = Array.from({ length: 24 }).map((_, i) => {
    const hour = i.toString().padStart(2, '0');
    return [`${hour}:00`, `${hour}:30`];
  }).flat().filter(t => {
    const h = parseInt(t.split(':')[0]);
    return h >= 8 && h <= 20;
  });

  // Calculate current hour slot to auto-scroll
  const currentSlotStr = useMemo(() => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const matchedHour = String(h).padStart(2, '0');
    const matchedMinutes = m >= 30 ? '30' : '00';
    return `${matchedHour}:${matchedMinutes}`;
  }, []);

  const isSelectedDateToday = isSameDay(selectedDate, new Date());

  // Automatic scrolling when Dia view starts up or selected date changes
  useEffect(() => {
    if (viewMode === 'dia') {
      const now = new Date();
      const currentHour = now.getHours();
      // Backtrack 1 hour for high-value buffer ("de las 4:30 para atrás")
      const targetHour = Math.max(8, Math.min(20, currentHour - 1));
      const targetTimeStr = `${String(targetHour).padStart(2, '0')}:00`;
      
      const timer = setTimeout(() => {
        const container = document.getElementById('day-view-scroll-container');
        const targetEl = document.getElementById(`slot-row-${targetTimeStr}`);
        if (container && targetEl) {
          container.scrollTop = targetEl.offsetTop;
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [viewMode, selectedDate]);

  // Helper to trace return schedules
  const getReturnStatus = (appt: any) => {
    const patientObj = patients.find(p => p.id === appt.patientId);
    const serviceObj = services.find(s => s.id === appt.serviceId);
    
    // Check if there is an active return scheduled
    const returnAppt = appointments.find(a => 
      a.patientId === appt.patientId &&
      a.id !== appt.id &&
      (a.linkedToAppointmentId === appt.id || 
       (a.type === 'retorno' && new Date(a.date + 'T12:00:00') > new Date(appt.date + 'T12:00:00')))
    );

    return {
      hasReturn: !!returnAppt,
      returnAppt,
      generatesFollowUp: serviceObj?.generatesFollowUp,
      followUpDays: serviceObj?.followUpDays || 15,
      patient: patientObj,
      service: serviceObj
    };
  };

  const handleRetornoClick = (appt: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const statusInfo = getReturnStatus(appt);
    
    if (statusInfo.hasReturn) {
      const returnProfessional = professionals.find(p => p.id === statusInfo.returnAppt?.professionalId);
      setRetornoModalData({
        hasReturn: true,
        originalAppt: appt,
        returnAppt: statusInfo.returnAppt,
        patient: statusInfo.patient,
        originalService: statusInfo.service,
        returnProfessional
      });
    } else {
      setRetornoModalData({
        hasReturn: false,
        originalAppt: appt,
        patient: statusInfo.patient,
        originalService: statusInfo.service,
        followUpDays: statusInfo.followUpDays
      });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="p-6 space-y-6 max-w-[1600px] mx-auto"
    >
      {/* Header and Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">Agenda Operacional</h1>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-0.5">Gestão médica, fluxos de retorno e procedimentos</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Mode Selector */}
          <div className="flex bg-white rounded-2xl border border-slate-200/80 p-1 shadow-sm">
            {(['dia', 'semana', 'mes'] as ViewMode[]).map((mode) => (
              <Button 
                key={mode}
                variant="ghost" 
                className={cn(
                  "px-5 h-10 font-bold text-xs uppercase italic rounded-xl transition-all duration-150", 
                  viewMode === mode ? "bg-indigo-600 text-white shadow-sm" : "hover:bg-slate-100 text-slate-600"
                )}
                onClick={() => setViewMode(mode)}
              >
                {mode === 'dia' ? 'Dia' : mode === 'semana' ? 'Semana' : 'Mês'}
              </Button>
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex bg-white items-center rounded-2xl border border-slate-200/80 p-1 shadow-sm h-12">
            <Button variant="ghost" size="icon" onClick={handlePrev} className="h-10 w-10 text-slate-600 hover:bg-slate-100 rounded-xl">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="ghost" className="px-5 font-black text-slate-800 text-xs min-w-[200px] uppercase italic tracking-wide select-none">
              {viewMode === 'dia' && format(selectedDate, "eeee, d 'de' MMMM", { locale: ptBR })}
              {viewMode === 'semana' && `${format(weekDays[0], "d")} - ${format(weekDays[6], "d 'de' MMMM", { locale: ptBR })}`}
              {viewMode === 'mes' && format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNext} className="h-10 w-10 text-slate-600 hover:bg-slate-100 rounded-xl">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <Button 
            onClick={() => setSelectedDate(new Date())}
            className="h-12 px-5 rounded-2xl font-bold border border-slate-200 bg-white text-indigo-600 hover:bg-indigo-50 shadow-sm text-xs italic uppercase tracking-wider cursor-pointer"
          >
            Hoje
          </Button>

          {/* Professional filter */}
          <div className="flex items-center">
            <Select value={profFilter} onValueChange={setProfFilter}>
              <SelectTrigger className="w-[230px] h-12 rounded-2xl bg-white border-slate-200 shadow-sm font-bold text-xs uppercase italic pl-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-indigo-500" />
                  <SelectValue placeholder="Profissional">
                    {profFilter === 'all' ? 'Todos Profissionais' : (professionals.find(p => p.id === profFilter)?.name || 'Todos Profissionais')}
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent className="z-[50]">
                <SelectItem value="all" className="font-bold text-xs uppercase">Todos Profissionais</SelectItem>
                {professionals.filter(p => p.tipoMembro !== 'gestao').map(p => (
                  <SelectItem key={p.id} value={p.id} className="font-bold text-xs uppercase">Dr(a). {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleCopyPortalLink}
            variant="outline"
            className={cn(
              "h-12 px-5 rounded-2xl font-bold shadow-sm text-xs italic uppercase tracking-wider flex items-center gap-2 transition-all duration-300 shrink-0 border",
              copiedLink 
                ? "bg-green-50 border-green-200 text-green-700 font-extrabold"
                : "border-indigo-200 hover:bg-indigo-50 text-indigo-700 bg-white"
            )}
          >
            {copiedLink ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600 animate-pulse" />
                <span>Link Copiado!</span>
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 text-indigo-550" />
                <span>Link de Agendamento</span>
              </>
            )}
          </Button>

          <Button 
            id="onboarding-btn-new-appointment"
            onClick={() => {
              setSelectedStartTime('');
              setSelectedApptId(null);
              setIsModalOpen(true);
            }} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs tracking-wider rounded-2xl h-12 px-6 shadow-lg shadow-indigo-100 transition-all active:scale-95 duration-100 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Agendamento</span>
          </Button>
        </div>
      </div>

      <div className="w-full">
        <PostponedTimersList />
        {/* Main Calendar Space */}
        <Card className="w-full bg-white border-slate-200 rounded-[2rem] shadow-sm overflow-hidden min-h-[850px] flex flex-col">
          
          {/* DAILY VIEW (DIA) */}
          {viewMode === 'dia' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-0 border-b border-slate-100 bg-slate-50 flex sticky top-0 z-10 shrink-0">
                <div className="w-24 p-5 font-black text-[10px] text-slate-400 tracking-widest text-center uppercase italic">Horário</div>
                <div className="flex-1 p-5 font-black text-[10px] text-slate-400 tracking-widest pl-10 uppercase italic">Dados do Paciente, Procedimento & Equipe</div>
                <div className="w-40 p-5 font-black text-[10px] text-slate-400 tracking-widest text-center uppercase italic">Status</div>
                <div className="w-44 p-5 font-black text-[10px] text-slate-400 tracking-widest text-center uppercase italic">Confirmação</div>
              </div>

              <div 
                className="flex-1 overflow-y-auto max-h-[750px] relative divide-y divide-slate-100/60 scroll-smooth pr-1"
                id="day-view-scroll-container"
              >
                {timeSlots.map((time) => {
                  const apptsInSlot = dayAppointments.filter(a => a.startTime === time);
                  const isCurrentTimeSlot = time === currentSlotStr && isSelectedDateToday;
                  
                  return (
                    <div 
                      key={time} 
                      id={`slot-row-${time}`}
                      className={cn(
                        "flex border-b border-slate-50 hover:bg-slate-50/20 transition-all min-h-[140px] group relative",
                        isCurrentTimeSlot && "bg-indigo-50/15 border-l-[6px] border-l-indigo-650"
                      )}
                    >
                      {/* Left time marker */}
                      <div className="w-24 flex flex-col items-center justify-center border-r border-slate-100/50 bg-slate-50/20 select-none">
                        <span className="font-mono font-black text-slate-700 text-base">{time}</span>
                        {isCurrentTimeSlot && (
                          <span className="text-[8px] font-black italic tracking-wider text-indigo-600 animate-pulse bg-indigo-50 px-2 py-0.5 rounded-full mt-1.5 uppercase">
                            ● AGORA
                          </span>
                        )}
                      </div>
                      
                      {/* Content panel */}
                      <div className="flex-1 p-4 flex flex-col sm:flex-row gap-4 relative">
                        {apptsInSlot.length === 0 ? (
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedStartTime(time);
                              setSelectedApptId(null);
                              setIsModalOpen(true);
                            }}
                            className="w-full flex-1 rounded-2xl border-2 border-dashed border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/10 flex items-center justify-center transition-all min-h-[100px] cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-indigo-600 transition-colors">
                              <Plus className="w-5 h-5" />
                              <span className="text-[10px] font-black uppercase italic tracking-wider">Livre • Reservar às {time}</span>
                            </div>
                          </button>
                        ) : (
                          <div className="flex flex-col w-full gap-3">
                            {apptsInSlot.map(appt => {
                              const patient = patients.find(p => p.id === appt.patientId);
                              const service = services.find(s => s.id === appt.serviceId);
                              const prof = professionals.find(p => p.id === appt.professionalId);
                              const statusDetails = getReturnStatus(appt);

                              return (
                                <div 
                                  key={appt.id} 
                                  onClick={() => {
                                    setSelectedApptId(appt.id);
                                    setIsModalOpen(true);
                                  }}
                                  className={cn(
                                    "flex-1 rounded-2xl p-5 border-l-[6px] shadow-sm cursor-pointer hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center bg-white border border-slate-100 relative group/card",
                                    appt.status === 'confirmado' ? "border-l-emerald-500 shadow-emerald-100/20" :
                                    appt.status === 'chegou' ? "border-l-cyan-500 shadow-cyan-100/20" :
                                    appt.status === 'cancelado' ? "border-l-rose-400 opacity-60" :
                                    "border-l-indigo-400 shadow-indigo-100/20 text-slate-800"
                                  )}
                                >
                                  {/* Left segment: patient & doc info */}
                                  <div className="space-y-3 max-w-xl">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="font-black text-slate-900 text-lg italic uppercase tracking-tight block">
                                        {patient?.name}
                                      </h4>
                                      <Badge className="bg-slate-100 text-slate-700 border-none font-bold text-[9px] uppercase tracking-wider py-0.5 px-2">
                                        {appt.type || 'Consulta'}
                                      </Badge>
                                      {appt.notes && (
                                        <Badge variant="outline" className="text-slate-400 text-[9px] font-semibold">
                                          Com Notas
                                        </Badge>
                                      )}
                                    </div>

                                    {/* Procedimento & Equipe details */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                                      <div className="flex items-center gap-1.5 text-slate-500">
                                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="font-bold text-slate-700 capitalize">{service?.name || 'Procedimento não listado'}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 text-slate-500">
                                        <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                                        <span className="font-semibold">Dr(a). <span className="font-bold text-indigo-950 capitalize">{prof?.name}</span></span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">({prof?.specialty})</span>
                                      </div>
                                    </div>

                                    {/* Action return linker inside card */}
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                      {statusDetails.hasReturn ? (
                                        <button
                                          type="button"
                                          onClick={(e) => handleRetornoClick(appt, e)}
                                          className="bg-emerald-50 hover:bg-emerald-100/70 text-emerald-700 border border-emerald-200/50 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase italic tracking-widest flex items-center gap-1.5 shadow-xs transition-transform hover:scale-105"
                                        >
                                          <RefreshCcw className="w-3 h-3 text-emerald-600 animate-spin" style={{ animationDuration: '5s' }} />
                                          <span>🔄 Retorno: {format(new Date(statusDetails.returnAppt!.date + 'T12:00:00'), 'dd/MM')} às {statusDetails.returnAppt!.startTime}</span>
                                        </button>
                                      ) : statusDetails.generatesFollowUp ? (
                                        <button
                                          type="button"
                                          onClick={(e) => handleRetornoClick(appt, e)}
                                          className="bg-amber-50 hover:bg-amber-105/90 text-amber-700 border border-amber-200/60 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase italic tracking-widest flex items-center gap-1.5 shadow-xs transition-transform hover:scale-105"
                                        >
                                          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                          <span>⚠️ Agendar Retorno ({statusDetails.followUpDays}d)</span>
                                        </button>
                                      ) : null}

                                      {appt.notes && (
                                        <div className="text-[10px] bg-slate-50 text-slate-500 font-semibold px-2.5 py-1 rounded-lg border border-slate-100 max-w-xs truncate italic">
                                          "{appt.notes}"
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right segment: Time or pricing indicators */}
                                  <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end justify-between self-stretch shrink-0">
                                    <div className="text-right">
                                      <p className="text-xs font-bold text-slate-400 capitalize">Duração total</p>
                                      <span className="text-sm font-black text-slate-800 font-mono italic">{appt.startTime} - {appt.endTime}</span>
                                    </div>
                                    <div className="pt-2">
                                      <Badge className="bg-emerald-500/10 text-emerald-700 font-mono font-black italic border-none px-3 py-1 text-xs">
                                        R$ {(appt.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Status indicator block */}
                      <div className="w-30 sm:w-32 flex items-center justify-center border-l border-slate-100/50">
                        {apptsInSlot.length > 0 && (
                          <div className="flex flex-col gap-1.5">
                            {apptsInSlot.map(appt => (
                              <Badge key={appt.id} className={cn(
                                "text-[9px] font-black italic border-none px-3 py-1 uppercase rounded-full tracking-wider text-center block",
                                appt.status === 'confirmado' ? "bg-green-100 text-green-700" :
                                appt.status === 'chegou' ? "bg-cyan-100 text-cyan-700" :
                                appt.status === 'cancelado' ? "bg-red-100 text-rose-700" :
                                "bg-indigo-55/35 bg-indigo-50 text-indigo-700"
                              )}>
                                {appt.status}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Confirmation tracking column */}
                      <div className="w-38 sm:w-44 flex flex-col items-center justify-center border-l border-slate-100/50 gap-2 p-3 text-center">
                        {apptsInSlot.length > 0 && (
                          <div className="space-y-1.5 w-full">
                            {apptsInSlot.map(appt => (
                              <div key={appt.id} className="block text-center">
                                <Badge variant="outline" className={cn(
                                  "text-[9px] font-extrabold border-none tracking-widest uppercase py-1 px-2 text-center",
                                  appt.confirmationStatus === 'mensagem enviada' ? "text-amber-600 bg-amber-50" :
                                  appt.confirmationStatus === 'confirmado' ? "text-green-600 bg-emerald-50" :
                                  "text-slate-400 bg-slate-50"
                                )}>
                                  {appt.confirmationStatus === 'mensagem enviada' ? 'Lembrete enviado' : appt.confirmationStatus}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WEEKLY VIEW (SEMANA) */}
          {viewMode === 'semana' && (
            <div className="grid grid-cols-7 h-full flex-1 divide-x divide-slate-100">
              {weekDays.map((day) => {
                const dayAppts = filteredAppointments.filter(a => isSameDay(new Date(a.date + 'T12:00:00'), day));
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div key={day.toString()} className="flex flex-col min-h-[700px] bg-slate-50/15">
                    {/* Header of Column */}
                    <div className={cn(
                      "p-5 border-b border-slate-100 text-center flex flex-col justify-center items-center shrink-0", 
                      isToday ? "bg-indigo-50/40 text-indigo-900 border-b-2 border-b-indigo-500" : "bg-slate-50/40 text-slate-800"
                    )}>
                      <p className="text-[10px] font-black text-slate-400 italic uppercase leading-none tracking-wider">{format(day, 'EEE', { locale: ptBR })}</p>
                      <p className={cn(
                        "text-2xl font-black mt-1.5 p-1 w-10 h-10 flex items-center justify-center rounded-full",
                        isToday ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-800"
                      )}>
                        {format(day, 'd')}
                      </p>
                    </div>

                    {/* Weekly Content Cards */}
                    <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[800px]">
                      {dayAppts.map(appt => {
                        const patient = patients.find(p => p.id === appt.patientId);
                        const service = services.find(s => s.id === appt.serviceId);
                        const prof = professionals.find(p => p.id === appt.professionalId);
                        const statusDetails = getReturnStatus(appt);

                        return (
                          <div 
                            key={appt.id} 
                            onClick={() => {
                              setSelectedApptId(appt.id);
                              setIsModalOpen(true);
                            }}
                            className={cn(
                              "p-4 border-l-[5px] rounded-xl cursor-pointer bg-white border border-slate-200/60 shadow-xs hover:shadow-md transition-all space-y-2 group.card",
                              appt.status === 'confirmado' ? "border-l-green-500 bg-green-50/10" :
                              appt.status === 'chegou' ? "border-l-cyan-500 bg-cyan-50/10" :
                              appt.status === 'cancelado' ? "border-l-rose-300 opacity-60" :
                              "border-l-indigo-500 bg-indigo-50/10"
                            )}
                          >
                            <div>
                              <p className="text-xs font-black text-slate-950 uppercase italic truncate tracking-tight">{patient?.name}</p>
                              <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono mt-0.5 font-bold">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{appt.startTime} - {appt.endTime}</span>
                              </div>
                            </div>

                            {/* Service and Professional micro indicators */}
                            <div className="space-y-1 pt-1 border-t border-slate-100 select-none">
                              <p className="text-[10px] text-slate-800 font-bold uppercase truncate">{service?.name}</p>
                              
                              <div className="flex items-center justify-between text-[8px] uppercase tracking-wider text-slate-400 font-extrabold mt-1">
                                <span className="truncate">Dr(a). {prof?.name?.split(' ')[0]}</span>
                                <Badge className="bg-emerald-500/10 text-emerald-700 text-[8px] py-0 border-none font-bold">
                                  R${appt.value}
                                </Badge>
                              </div>
                            </div>

                            {/* Return icons */}
                            {statusDetails.hasReturn && (
                              <div 
                                onClick={(e) => handleRetornoClick(appt, e)}
                                className="flex items-center gap-1 text-[8px] font-black text-green-700 bg-green-50 rounded-lg px-2 py-1 uppercase italic tracking-wider transition-all hover:bg-green-100/75"
                              >
                                <RefreshCcw className="w-2.5 h-2.5 text-green-600 animate-spin" style={{ animationDuration: '5s' }} />
                                <span>🔄 Retorno Marcado</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      <button 
                        onClick={() => {
                          setSelectedDate(day);
                          setViewMode('dia');
                          setIsModalOpen(true);
                        }}
                        className="w-full py-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-400 flex flex-col items-center justify-center transition-all cursor-pointer gap-1 group"
                      >
                        <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 group-hover:text-indigo-600">Novo</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PREMIUM MONTHLY VIEW (MÊS) */}
          {viewMode === 'mes' && (
            <div className="grid grid-cols-7 h-full border-collapse divide-x divide-y divide-slate-100 flex-1">
              {monthDays.map((day) => {
                const dayAppts = filteredAppointments.filter(a => isSameDay(new Date(a.date + 'T12:00:00'), day));
                const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div 
                    key={day.toString()} 
                    className={cn(
                      "p-3 min-h-[220px] max-h-[260px] flex flex-col bg-white hover:bg-slate-50/40 transition-colors group relative",
                      !isCurrentMonth && "bg-slate-50/20 opacity-35"
                    )}
                    onClick={() => {
                      setSelectedDate(day);
                      // Toggle easily to daily view when clicking day area
                    }}
                    onDoubleClick={() => {
                      setSelectedDate(day);
                      setViewMode('dia');
                    }}
                  >
                    {/* Date Badge and summary total */}
                    <div className="flex justify-between items-center select-none shrink-0 mb-2">
                      <span className={cn(
                        "text-xs font-black p-1 w-7 h-7 flex items-center justify-center rounded-xl",
                        isToday ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-400 hover:text-slate-700"
                      )}>
                        {format(day, 'd')}
                      </span>
                      
                      {dayAppts.length > 0 && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(day);
                              setViewMode('dia');
                            }}
                            className="text-[9px] hover:underline font-black text-indigo-500 uppercase italic tracking-tight"
                          >
                            Ver Dia ({dayAppts.length})
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Scrollable, visual premium appointment listing within cell */}
                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5 pr-0.5">
                      {dayAppts.map(appt => {
                        const patient = patients.find(p => p.id === appt.patientId);
                        const prof = professionals.find(p => p.id === appt.professionalId);
                        const service = services.find(s => s.id === appt.serviceId);
                        const profInitials = prof ? prof.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'DR';
                        const statusDetails = getReturnStatus(appt);

                        return (
                          <div 
                            key={appt.id} 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedApptId(appt.id);
                              setIsModalOpen(true);
                            }}
                            className={cn(
                              "text-[10px] bg-white border border-slate-200/80 rounded-xl p-2 shadow-xs cursor-pointer hover:shadow-xs transition-transform hover:-translate-y-0.5 hover:border-slate-300 flex flex-col gap-1 border-l-4 font-bold text-slate-800 italic capitalize select-none",
                              appt.status === 'confirmado' ? "border-l-green-500 hover:bg-green-50/20" :
                              appt.status === 'chegou' ? "border-l-cyan-500 hover:bg-cyan-50/20" :
                              appt.status === 'cancelado' ? "border-l-rose-400 opacity-60" :
                              "border-l-indigo-500 hover:bg-indigo-50/20"
                            )}
                          >
                            <div className="flex items-center justify-between gap-1 w-full">
                              <span className="font-mono text-[9px] text-slate-600">{appt.startTime}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                {statusDetails.hasReturn && (
                                  <span 
                                    onClick={(e) => handleRetornoClick(appt, e)}
                                    title="Possui Retorno Agendado" 
                                    className="text-green-600 bg-green-50 rounded p-0.5 font-bold inline-block hover:scale-110 active:scale-95 transition-transform"
                                  >
                                    🔄
                                  </span>
                                )}
                                <span 
                                  title={`Medico: ${prof?.name}`} 
                                  className="w-4 h-4 rounded bg-slate-100 flex items-center justify-center font-black text-[7px] text-slate-600 uppercase border border-slate-200 shrink-0"
                                >
                                  {profInitials}
                                </span>
                              </div>
                            </div>
                            <div className="text-[10px] font-black text-slate-900 truncate uppercase tracking-tight">
                              {patient?.name}
                            </div>
                            <div className="text-[8px] text-slate-400 truncate uppercase mt-0.5 font-black tracking-wider">
                              {service?.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Double Click Guide or Quick Plus button */}
                    {dayAppts.length === 0 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(day);
                          setViewMode('dia');
                          setIsModalOpen(true);
                        }}
                        className="flex-1 w-full rounded-xl border border-dashed border-slate-100/70 hover:border-indigo-150 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-indigo-50/5 text-[9px] font-black uppercase text-slate-400 py-3 transition-all cursor-pointer"
                      >
                        + Reservar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Appointment Edit/Insert Modal */}
      {isModalOpen && (
        <AppointmentModal 
          open={isModalOpen} 
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) {
              setSelectedApptId(null);
              setSelectedStartTime('');
            }
          }} 
          appointmentId={selectedApptId}
          initialDate={format(selectedDate, 'yyyy-MM-dd')}
          initialStartTime={selectedStartTime}
        />
      )}

      {/* DETAILED INTERACTIVE RETURN VINTAGE LINK DRAWER */}
      {retornoModalData && (
        <Dialog open={!!retornoModalData} onOpenChange={(open) => { if (!open) setRetornoModalData(null); }}>
          <DialogContent className="max-w-md bg-slate-900 border border-slate-800 text-white rounded-[2rem] p-8">
            <DialogHeader className="p-0 border-none">
              <DialogTitle className="text-xl font-black italic uppercase tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <RefreshCcw className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
                </div>
                <div>
                  <span className="block text-white">Vínculo de Retorno</span>
                  <span className="block text-[9px] text-slate-400 font-black tracking-wider uppercase mt-0.5">Operações de Retornos automáticos</span>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-6">
              {retornoModalData.hasReturn ? (
                <div className="space-y-4">
                  <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-3">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block italic">Paciente do Procedimento</span>
                      <span className="text-base font-black text-white uppercase">{retornoModalData.patient?.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block italic">Sessão Inicial</span>
                        <span className="text-xs font-bold text-slate-300 block">{format(new Date(retornoModalData.originalAppt.date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })} às {retornoModalData.originalAppt.startTime}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block italic">Serviço Original</span>
                        <span className="text-xs font-bold text-indigo-300 block capitalize truncate">{retornoModalData.originalService?.name || 'Consulta Estética'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="w-0.5 h-6 border-l border-dashed border-indigo-500/30" />
                  </div>

                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl space-y-3">
                    <div>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block italic">📅 Retorno Vinculado</span>
                      <span className="text-base font-black text-emerald-300 block uppercase">
                        {format(new Date(retornoModalData.returnAppt.date + 'T12:00:00'), 'eeee, dd/MM', { locale: ptBR })} às {retornoModalData.returnAppt.startTime}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 border-t border-emerald-500/10 pt-3">
                      <div>
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block italic">Atribuído para</span>
                        <span className="text-xs font-extrabold text-white block capitalize truncate">Dr(a). {retornoModalData.returnProfessional?.name || 'Clínica'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block italic">Especialidade</span>
                        <span className="text-xs font-bold text-emerald-200 block capitalize truncate">{retornoModalData.returnProfessional?.specialty || 'Não listada'}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 text-center font-bold uppercase italic tracking-wider">
                    👉 O sistema estimulou este vínculo automaticamente com base no histórico do paciente.
                  </p>

                  <Button
                    onClick={() => {
                      setSelectedDate(new Date(retornoModalData.returnAppt.date + 'T12:00:00'));
                      setViewMode('dia');
                      setRetornoModalData(null);
                    }}
                    className="w-full h-13 bg-white hover:bg-slate-200 text-slate-950 font-black italic uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 shadow-xl shrink-0 transition-transform hover:scale-101 active:scale-98"
                  >
                    <CalendarHeart className="w-4 h-4 text-slate-900" />
                    <span>Ir para o dia deste Retorno</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl text-center space-y-2">
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest block italic">Retorno Não Cadastrado</span>
                    <p className="text-xs text-amber-100">O procedimento de <strong>"{retornoModalData.originalService?.name}"</strong> requer um monitoramento de retorno em {retornoModalData.followUpDays} dias, mas não encontramos nenhum retorno no sistema.</p>
                  </div>

                  <p className="text-[10px] text-slate-400 text-center font-bold uppercase italic tracking-wider">
                    Deseja abrir o agendamento sugerido pelo sistema?
                  </p>

                  <Button
                    onClick={() => {
                      const returnTargetDate = addDays(new Date(retornoModalData.originalAppt.date + 'T12:00:00'), retornoModalData.followUpDays || 15);
                      setSelectedDate(returnTargetDate);
                      setViewMode('dia');
                      setIsModalOpen(true);
                      setRetornoModalData(null);
                    }}
                    className="w-full h-13 bg-indigo-600 hover:bg-indigo-700 text-white font-black italic uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shrink-0 transition-transform hover:scale-101 active:scale-98"
                  >
                    <Plus className="w-4 h-4 text-white" />
                    <span>Agendar para o dia {format(addDays(new Date(retornoModalData.originalAppt.date + 'T12:00:00'), retornoModalData.followUpDays || 15), 'dd/MM')}</span>
                  </Button>
                </div>
              )}

              <Button
                variant="ghost"
                onClick={() => setRetornoModalData(null)}
                className="w-full h-10 text-slate-400 hover:text-white hover:bg-white/5 text-xs font-black uppercase rounded-xl tracking-wider select-none"
              >
                Voltar à Agenda
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </motion.div>
  );
}

// Simple fallback component wrapper for the calendar heart icon inside dialog
function CalendarHeart(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}
