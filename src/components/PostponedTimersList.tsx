import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Clock, Play, X } from 'lucide-react';

export function PostponedTimersList() {
  const { postponedCheckouts, appointments, patients, services, removePostponedCheckout } = useStore();
  const [now, setNow] = useState(Date.now());

  // Tick every second to update countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter postponed checkouts that have not expired yet
  const activePostponedList = Object.entries(postponedCheckouts)
    .map(([apptId, resumeTimestamp]) => {
      const appt = appointments.find(a => a.id === apptId);
      if (!appt || appt.status !== 'chegou') return null;

      const patient = patients.find(p => p.id === appt.patientId);
      const service = services.find(s => s.id === appt.serviceId);
      const diffMs = resumeTimestamp - now;

      return {
        apptId,
        appt,
        patient,
        service,
        resumeTimestamp,
        diffMs
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null && item.diffMs > 0);

  if (activePostponedList.length === 0) return null;

  const handleOpenCheckout = (apptId: string) => {
    // Dispatch custom event to trigger GlobalCheckoutModal
    window.dispatchEvent(new CustomEvent('open-checkout-modal', { detail: { appointmentId: apptId } }));
  };

  const formatRemainingTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${String(minutes).padStart(2, '0')}m`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-slate-50/50 p-4 border border-indigo-100/50 rounded-3xl space-y-3 mb-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 px-1">
        <Clock className="w-4 h-4 text-indigo-500 animate-pulse" />
        <h4 className="text-xs font-black text-indigo-950 uppercase italic tracking-wider">
          Acompanhamento de Atendimentos Prorrogados ({activePostponedList.length})
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {activePostponedList.map(({ apptId, appt, patient, service, diffMs }) => (
          <Card 
            key={apptId} 
            className="p-3 bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all rounded-2xl flex items-center justify-between gap-4"
          >
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider truncate">
                {service?.name || appt.type}
              </p>
              <h5 className="font-bold text-slate-800 text-xs truncate capitalize">
                {patient?.name || 'Paciente'}
              </h5>
              <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-650 font-mono bg-indigo-50/60 px-2 py-0.5 rounded-lg w-max">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span>Faltam {formatRemainingTime(diffMs)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="sm"
                onClick={() => handleOpenCheckout(apptId)}
                className="h-9 px-3.5 bg-indigo-600 hover:bg-indigo-750 text-white font-black italic rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1"
                title="Concluir Atendimento Agora"
              >
                <Play className="w-3 h-3 fill-current" /> Concluir
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => removePostponedCheckout(apptId)}
                className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
                title="Ignorar Lembrete"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
