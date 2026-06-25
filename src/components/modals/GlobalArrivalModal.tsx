import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { UserCheck, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export function GlobalArrivalModal() {
  const { appointments, patients, updateAppointment } = useStore();
  const [open, setOpen] = useState(false);
  const [dueAppointment, setDueAppointment] = useState<any>(null);

  useEffect(() => {
    const checkArrivals = () => {
      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');
      
      const found = appointments.find(app => {
        if (app.date !== todayStr) return false;
        if (app.status !== 'agendado' && app.status !== 'confirmado') return false;

        const [hours, minutes] = app.startTime.split(':').map(Number);
        const appStartTime = new Date(now);
        appStartTime.setHours(hours, minutes, 0, 0);

        const diffInMinutes = (now.getTime() - appStartTime.getTime()) / 60000;
        
        // Show modal between 10m before and 30m after
        return diffInMinutes >= -10 && diffInMinutes <= 30;
      });

      if (found && !open) {
        setDueAppointment(found);
        setOpen(true);
      }
    };

    const interval = setInterval(checkArrivals, 60000); // Check every minute
    checkArrivals(); // Initial check

    return () => clearInterval(interval);
  }, [appointments, open]);

  const updateStatus = (status: 'chegou' | 'faltou' | 'atrasado') => {
    if (dueAppointment) {
      updateAppointment(dueAppointment.id, { status });
      setOpen(false);
    }
  };

  if (!dueAppointment) return null;

  const patient = patients.find(p => p.id === dueAppointment.patientId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-white border-2 border-indigo-100 z-[100]">
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <UserCheck className="w-6 h-6 text-indigo-600" />
          </div>
          <DialogTitle className="text-lg font-bold text-slate-800 tracking-tight">O paciente chegou?</DialogTitle>
          <div className="my-4 bg-slate-50 p-4 rounded-xl w-full text-left border border-slate-100">
            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">Paciente</p>
            <p className="text-slate-900 font-bold text-base">{patient?.name || 'Não identificado'}</p>
            <div className="flex items-center gap-4 mt-3">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Horário</p>
                <p className="text-slate-700 font-medium text-sm">{dueAppointment.startTime}</p>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Procedimento</p>
                <p className="text-slate-700 font-medium text-sm">{dueAppointment.type}</p>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-slate-500 mb-6 px-4">Estamos perguntando pois o horário do agendamento está próximo ou já passou.</p>
          
          <div className="grid grid-cols-2 gap-3 w-full">
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white shadow-sm" 
              onClick={() => updateStatus('chegou')}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> Confirmar Chegada
            </Button>
            <Button 
              variant="outline"
              className="border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 shadow-sm" 
              onClick={() => updateStatus('faltou')}
            >
              <XCircle className="w-4 h-4 mr-2" /> Não Compareceu
            </Button>
          </div>
          <Button 
            variant="ghost" 
            className="mt-4 text-xs text-slate-400 hover:text-slate-600"
            onClick={() => setOpen(false)}
          >
            Perguntar depois
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
