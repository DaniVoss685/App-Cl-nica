import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  RefreshCcw, 
  Search, 
  Calendar, 
  MessageSquare, 
  Clock,
  AlertCircle,
  CheckCircle2,
  Stethoscope
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format, isAfter, isBefore, startOfMonth, isWithinInterval } from 'date-fns';
import { AppointmentModal } from '../components/AppointmentModal';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Appointment } from '../types';
import { toast } from 'sonner';
import { whatsappService } from '../services/whatsappService';

export function Retornos() {
  const { patients, appointments, services, professionals } = useStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'agendados' | 'ausentes'>('agendados');
  const [selectedApptId, setSelectedApptId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewOriginAppt, setViewOriginAppt] = useState<Appointment | null>(null);

  const patientsWithAppointments = useMemo(() => {
    return patients.filter(p => appointments.some(a => a.patientId === p.id && a.status === 'realizado'));
  }, [patients, appointments]);

  const returnedPatients = useMemo(() => {
    return patients.filter(p => {
      const patientAppts = appointments.filter(a => a.patientId === p.id && a.status === 'realizado');
      return patientAppts.length > 1;
    });
  }, [patients, appointments]);

  const returnRate = useMemo(() => {
    if (patientsWithAppointments.length === 0) return 0;
    return Math.round((returnedPatients.length / patientsWithAppointments.length) * 100);
  }, [patientsWithAppointments, returnedPatients]);

  const recoveredCount = useMemo(() => {
    const today = new Date();
    const startOfCurrentMonth = startOfMonth(today);
    
    return patients.filter(p => {
      const apptsInMonth = appointments.filter(a => 
        a.patientId === p.id && 
        (a.status === 'confirmado' || a.status === 'realizado') &&
        isWithinInterval(new Date(a.date + 'T12:00:00'), { start: startOfCurrentMonth, end: today })
      );
      if (apptsInMonth.length === 0) return false;
      
      const prevAppts = appointments.filter(a => 
        a.patientId === p.id && 
        a.status === 'realizado' &&
        isBefore(new Date(a.date + 'T12:00:00'), startOfCurrentMonth)
      ).sort((a, b) => b.date.localeCompare(a.date));
      
      const lastPrevAppt = prevAppts[0];
      if (!lastPrevAppt) return false;
      
      const firstThisMonthDate = new Date(apptsInMonth[0].date + 'T12:00:00');
      const lastPrevDate = new Date(lastPrevAppt.date + 'T12:00:00');
      const gap = Math.floor((firstThisMonthDate.getTime() - lastPrevDate.getTime()) / (1000 * 60 * 60 * 24));
      return gap >= 30;
    }).length;
  }, [patients, appointments]);

  // Retornos Agendados (type === 'retorno')
  const scheduledReturns = useMemo(() => {
    return appointments
      .filter(a => a.type === 'retorno')
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [appointments]);

  // Lógica de reativação: pacientes inativos sem consulta há mais de 30 dias
  const pendingReturns = useMemo(() => {
    return patients.map(p => {
      const patientAppts = appointments
        .filter(a => a.patientId === p.id && a.status === 'realizado')
        .sort((a, b) => b.date.localeCompare(a.date));
      
      const lastAppt = patientAppts[0];
      if (!lastAppt) return null;

      const lastDate = new Date(lastAppt.date + 'T12:00:00');
      const today = new Date();
      const daysSinceLast = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const hasFutureAppt = appointments.some(a => a.patientId === p.id && isAfter(new Date(a.date + 'T12:00:00'), today));

      if (daysSinceLast >= 30 && !hasFutureAppt) {
        return {
          ...p,
          daysSinceLast,
          lastService: lastAppt.serviceId ? services.find(s => s.id === lastAppt.serviceId)?.name : 'não informado',
          lastDate
        };
      }
      return null;
    }).filter(Boolean);
  }, [patients, appointments, services]);

  const filteredScheduledReturns = useMemo(() => {
    return scheduledReturns.filter(r => {
      const patient = patients.find(p => p.id === r.patientId);
      return patient?.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [scheduledReturns, patients, searchTerm]);

  const filteredAbsentReturns = useMemo(() => {
    return pendingReturns.filter(r => 
      r?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [pendingReturns, searchTerm]);

  const handleRowClick = (retAppt: Appointment) => {
    const originalAppt = appointments.find(a => a.id === retAppt.linkedToAppointmentId);
    if (originalAppt) {
      setViewOriginAppt(originalAppt);
    }
  };

  const handleSendWhatsAppInternal = (patientId: string, text: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !patient.phone) {
      toast.error('Telefone do paciente não disponível');
      return;
    }
    
    const phoneClean = patient.phone.replace(/\D/g, '');
    
    // Navega para a tela interna do WhatsApp
    navigate(`/whatsapp?phone=${phoneClean}&text=${encodeURIComponent(text)}`);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic">Gestão de retornos</h1>
          <p className="text-slate-500 font-sans">Acompanhe retornos agendados e reative pacientes inativos.</p>
        </div>
        <div className="flex gap-3">
          <Card className="px-4 py-2 bg-indigo-50 border-indigo-100 flex items-center gap-3 rounded-2xl">
            <RefreshCcw className="w-5 h-5 text-indigo-600 animate-spin-slow" />
            <div>
              <p className="text-[10px] font-black text-indigo-400 leading-none lowercase font-sans">Taxa de retorno</p>
              <p className="text-lg font-black text-indigo-700">{returnRate}%</p>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-white border border-slate-200 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black italic text-slate-900 lowercase text-sm">retornos agendados</h3>
              <p className="text-xs text-slate-400 lowercase font-sans">consultas de retorno marcadas</p>
            </div>
          </div>
          <p className="text-4xl font-black text-slate-900 italic mt-2">
            {scheduledReturns.length}
          </p>
        </Card>

        <Card className="p-6 bg-white border border-slate-200 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black italic text-slate-900 lowercase text-sm">ausentes (reativação)</h3>
              <p className="text-xs text-slate-400 lowercase font-sans">mais de 30 dias sem visita</p>
            </div>
          </div>
          <p className="text-4xl font-black text-slate-900 italic mt-2">
            {pendingReturns.length}
          </p>
        </Card>

        <Card className="p-6 bg-indigo-600 rounded-[2rem] shadow-lg text-white">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black italic text-white lowercase text-sm">recuperados</h3>
              <p className="text-xs opacity-70 lowercase font-sans">este mês</p>
            </div>
          </div>
          <p className="text-4xl font-black text-white italic mt-2">{recoveredCount}</p>
        </Card>
      </div>

      {/* Tabs de Seleção */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => { setActiveTab('agendados'); setSearchTerm(''); }}
          className={cn(
            "pb-4 text-sm font-black uppercase tracking-wider italic border-b-2 transition-all cursor-pointer",
            activeTab === 'agendados' 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-450 hover:text-slate-650"
          )}
        >
          Retornos Agendados ({scheduledReturns.length})
        </button>
        <button
          onClick={() => { setActiveTab('ausentes'); setSearchTerm(''); }}
          className={cn(
            "pb-4 text-sm font-black uppercase tracking-wider italic border-b-2 transition-all cursor-pointer",
            activeTab === 'ausentes' 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-450 hover:text-slate-650"
          )}
        >
          Pacientes Ausentes / Reativação ({pendingReturns.length})
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500" />
            <Input 
              placeholder={activeTab === 'agendados' ? "Buscar por paciente agendado..." : "Buscar paciente para reativação..."} 
              className="pl-12 h-11 bg-slate-50 border-none rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {activeTab === 'ausentes' && (
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl font-bold text-xs h-11 lowercase">
                exportar lista
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs h-11 lowercase">
                campanha whatsapp
              </Button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'agendados' ? (
            // TAB 1: Retornos Agendados
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">paciente</th>
                  <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">procedimento de origem</th>
                  <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">profissional</th>
                  <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">data do retorno</th>
                  <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">status</th>
                  <th className="text-center py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredScheduledReturns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-450 font-bold italic text-sm font-sans">
                      Nenhum retorno agendado encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredScheduledReturns.map((ret) => {
                    const patient = patients.find(p => p.id === ret.patientId);
                    const professional = professionals?.find(pr => pr.id === ret.professionalId);
                    const service = services.find(s => s.id === ret.serviceId);
                    const originalAppt = appointments.find(a => a.id === ret.linkedToAppointmentId);
                    const originalService = originalAppt ? services.find(s => s.id === originalAppt.serviceId) : null;

                    return (
                      <tr 
                        key={ret.id} 
                        onClick={() => handleRowClick(ret)}
                        className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                        title="Clique para ver os detalhes da consulta original"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-650 rounded-xl flex items-center justify-center font-black capitalize">
                              {patient?.name.charAt(0) || 'P'}
                            </div>
                            <div>
                              <p className="font-black text-slate-900 italic text-sm">{patient?.name || 'Paciente Geral'}</p>
                              <p className="text-[10px] text-slate-500 font-mono tracking-tighter">{patient?.phone || ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="space-y-0.5">
                            <Badge variant="outline" className="bg-white text-indigo-600 border-indigo-100 text-[10px] font-bold lowercase">
                              retorno de {service?.name || 'Consulta'}
                            </Badge>
                            {originalAppt && (
                              <span className="text-[9px] text-slate-400 font-semibold block font-sans underline decoration-indigo-200">
                                origem: {originalService?.name || 'Consulta'} em {format(new Date(originalAppt.date + 'T12:00:00'), 'dd/MM/yyyy')} (ver mais)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 font-bold text-xs text-slate-700 font-sans">
                          Dr(a). {professional?.name || 'Profissional'}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="font-mono text-xs text-slate-955 font-bold">
                              {format(new Date(ret.date + 'T12:00:00'), 'dd/MM/yyyy')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium font-sans">
                              às {ret.startTime} - {ret.endTime}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <Badge className={cn(
                            "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border font-sans",
                            ret.status === 'realizado' || ret.status === 'finalizado'
                              ? "bg-green-50 text-green-700 border-green-200"
                              : ret.status === 'cancelado'
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                          )}>
                            {ret.status === 'agendado' ? '🗓️ Agendado' : ret.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            {patient?.phone && (
                              <button 
                                onClick={() => {
                                  const [year, month, day] = ret.date.split('-').map(Number);
                                  const formattedDate = format(new Date(year, month - 1, day), 'dd/MM/yyyy');
                                  const returnMsg = `Olá ${patient.name}, tudo bem? Lembramos que você possui um retorno de ${service?.name || 'procedimento'} agendado para o dia ${formattedDate} às ${ret.startTime} com o(a) Dr(a). ${professional?.name || 'Profissional'}. Aguardamos você!`;
                                  handleSendWhatsAppInternal(ret.patientId, returnMsg);
                                }}
                                title="Enviar lembrete de retorno via WhatsApp integrado"
                                className="h-9 w-9 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-xl flex items-center justify-center transition-all cursor-pointer border-none"
                              >
                                <MessageSquare className="w-5 h-5" />
                              </button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => { setSelectedApptId(ret.id); setIsModalOpen(true); }}
                              className="h-9 w-9 bg-indigo-50 text-indigo-600 hover:bg-indigo-650 hover:text-white rounded-xl"
                            >
                              <Calendar className="w-5 h-5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            // TAB 2: Pacientes Ausentes
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">paciente</th>
                  <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">último serviço</th>
                  <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">data último atendimento</th>
                  <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">dias de ausência</th>
                  <th className="text-center py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredAbsentReturns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 font-bold italic text-sm font-sans">
                      Nenhum paciente inativo encontrado para reativação.
                    </td>
                  </tr>
                ) : (
                  filteredAbsentReturns.map((ret) => (
                    <tr key={ret!.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold capitalize">
                            {ret!.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 italic text-sm">{ret!.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono tracking-tighter">{ret!.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant="outline" className="bg-white text-slate-600 border-slate-100 text-[10px] font-bold lowercase">
                          {ret!.lastService}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-slate-500">
                        {format(ret!.lastDate, 'dd/MM/yyyy')}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            ret!.daysSinceLast > 60 ? "bg-red-500 animate-pulse" : "bg-amber-500"
                          )} />
                          <span className="font-black text-slate-700 italic underline decoration-2 decoration-indigo-200">
                            {ret!.daysSinceLast} dias
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          {ret!.phone && (
                            <button 
                              onClick={() => {
                                const reactivateMsg = `Olá ${ret!.name}, notamos que faz algum tempo desde o seu último procedimento de ${ret!.lastService}. Como você está? Gostaríamos de saber se gostaria de agendar uma consulta de retorno ou avaliação preventiva conosco.`;
                                handleSendWhatsAppInternal(ret!.id, reactivateMsg);
                              }}
                              title="Enviar mensagem de reativação via WhatsApp integrado"
                              className="h-9 w-9 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-xl flex items-center justify-center transition-all cursor-pointer border-none"
                            >
                              <MessageSquare className="w-5 h-5" />
                            </button>
                          )}
                          <Button variant="ghost" size="icon" className="h-9 w-9 bg-indigo-50 text-indigo-600 hover:bg-indigo-650 hover:text-white rounded-xl">
                            <Calendar className="w-5 h-5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de Detalhes da Consulta de Origem */}
      {viewOriginAppt && (() => {
        const patient = patients.find(p => p.id === viewOriginAppt.patientId);
        const professional = professionals?.find(pr => pr.id === viewOriginAppt.professionalId);
        const service = services.find(s => s.id === viewOriginAppt.serviceId);
        
        return (
          <Dialog open={!!viewOriginAppt} onOpenChange={(open) => { if (!open) setViewOriginAppt(null); }}>
            <DialogContent className="max-w-lg bg-slate-900 border border-slate-800 text-white rounded-[2rem] p-8 shadow-2xl z-[5000]">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Stethoscope className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-black italic uppercase tracking-wider text-white">
                      Consulta de Origem
                    </DialogTitle>
                    <DialogDescription className="text-indigo-200 mt-1 font-semibold text-xs lowercase">
                      detalhes do procedimento que gerou este retorno
                    </DialogDescription>
                  </div>
                </div>

                {/* Informações Gerais do Paciente */}
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-3">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block italic">Paciente</span>
                    <span className="text-base font-black text-white uppercase">{patient?.name || 'Geral'}</span>
                    {patient?.phone && <span className="text-xs text-slate-400 font-mono block mt-0.5">{patient.phone}</span>}
                  </div>
                </div>

                {/* Detalhes do Procedimento */}
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block italic font-sans">Procedimento Realizado</span>
                      <span className="text-sm font-black text-indigo-350 capitalize">{service?.name || 'Consulta Estética'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block italic font-sans">Profissional Responsável</span>
                      <span className="text-sm font-black text-white">{professional?.name ? `Dr(a). ${professional.name}` : 'Profissional'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block italic font-sans">Data & Horário</span>
                      <span className="text-xs font-bold text-slate-300 block">
                        {format(new Date(viewOriginAppt.date + 'T12:00:00'), 'dd/MM/yyyy')} às {viewOriginAppt.startTime}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block italic font-sans">Valor & Pagamento</span>
                      <span className="text-xs font-bold text-emerald-400 block font-sans">
                        R$ {viewOriginAppt.value ? viewOriginAppt.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'} ({viewOriginAppt.paymentStatus === 'pago' ? 'Pago' : 'Aguardando'})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Diagnóstico / Evolução Clínica */}
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-2">
                  <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest block italic flex items-center gap-1.5 font-sans">
                    📋 Diagnóstico / Evolução Clínica na Origem:
                  </span>
                  {viewOriginAppt.notes ? (
                    <p className="text-xs text-slate-200 font-bold italic leading-relaxed whitespace-pre-wrap">
                      "{viewOriginAppt.notes}"
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 font-bold italic font-sans">
                      Nenhuma anotação de diagnóstico foi registrada na conclusão desta consulta.
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => setViewOriginAppt(null)}
                    className="bg-white text-indigo-950 hover:bg-indigo-50 font-black italic rounded-xl text-xs uppercase tracking-wider px-6 h-11 transition-all cursor-pointer"
                  >
                    Fechar Detalhes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Modal para editar o agendamento de retorno selecionado */}
      {isModalOpen && (
        <AppointmentModal 
          open={isModalOpen} 
          onOpenChange={setIsModalOpen} 
          appointmentId={selectedApptId} 
        />
      )}
    </div>
  );
}
