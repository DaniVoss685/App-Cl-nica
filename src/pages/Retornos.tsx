import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  RefreshCcw, 
  Search, 
  Calendar, 
  Phone, 
  MessageSquare, 
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format, addDays, isAfter, isBefore, startOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function Retornos() {
  const { patients, appointments, services } = useStore();
  const [searchTerm, setSearchTerm] = useState('');

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

  // Mock logic for returns: patients who finished a service and haven't returned in 30 days
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
      
      // If last visit was more than 30 days ago and no future appointments
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

  const filteredReturns = pendingReturns.filter(r => 
    r?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic">Gestão de retornos</h1>
          <p className="text-slate-500">Monitoramento de pacientes ausentes e estratégias de reativação.</p>
        </div>
        <div className="flex gap-3">
          <Card className="px-4 py-2 bg-indigo-50 border-indigo-100 flex items-center gap-3">
            <RefreshCcw className="w-5 h-5 text-indigo-600" />
            <div>
              <p className="text-[10px] font-black text-indigo-400 leading-none lowercase">Taxa de retorno</p>
              <p className="text-lg font-black text-indigo-700">{returnRate}%</p>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-white border-slate-200 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black italic text-slate-900 lowercase text-sm">em alerta</h3>
              <p className="text-xs text-slate-400 lowercase">30-60 dias sem contato</p>
            </div>
          </div>
          <p className="text-4xl font-black text-slate-900 italic mt-2">
            {pendingReturns.filter(r => r!.daysSinceLast >= 30 && r!.daysSinceLast < 60).length}
          </p>
        </Card>

        <Card className="p-6 bg-white border-slate-200 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black italic text-slate-900 lowercase text-sm">críticos</h3>
              <p className="text-xs text-slate-400 lowercase">+60 dias sem contato</p>
            </div>
          </div>
          <p className="text-4xl font-black text-slate-900 italic mt-2">
            {pendingReturns.filter(r => r!.daysSinceLast >= 60).length}
          </p>
        </Card>

        <Card className="p-6 bg-indigo-600 rounded-[2rem] shadow-lg text-white">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black italic text-white lowercase text-sm">recuperados</h3>
              <p className="text-xs opacity-70 lowercase">este mês</p>
            </div>
          </div>
          <p className="text-4xl font-black text-white italic mt-2">{recoveredCount}</p>
        </Card>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500" />
            <Input 
              placeholder="Buscar paciente para reativação..." 
              className="pl-12 h-11 bg-slate-50 border-none rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl font-bold text-xs h-11 lowercase">
              exportar lista
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs h-11 lowercase">
              campanha whatsapp
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">paciente</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">último serviço</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">data último atendimento</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">dias de ausência</th>
                <th className="text-center py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredReturns.map((ret) => (
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
                      <Button variant="ghost" size="icon" className="h-9 w-9 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-xl">
                        <MessageSquare className="w-5 h-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl">
                        <Calendar className="w-5 h-5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
