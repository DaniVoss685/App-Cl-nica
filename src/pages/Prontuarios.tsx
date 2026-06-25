import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  FileText, 
  Search, 
  Plus, 
  Calendar, 
  User, 
  Clock,
  ChevronRight,
  Filter,
  Activity,
  ClipboardList,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export function Prontuarios() {
  const { patients, appointments, services } = useStore();
  const [searchTerm, setSearchTerm] = useState('');

  const records = useMemo(() => {
    return appointments
      .filter(a => a.status === 'realizado')
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [appointments]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic lowercase">gestão de prontuários</h1>
          <p className="text-slate-500 lowercase">histórico clínico digital e evolução de pacientes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl font-bold text-xs h-11 border-slate-200 lowercase">
            exportar protocolos
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs h-11 shadow-lg shadow-indigo-100 lowercase">
            <Plus className="w-5 h-5 mr-2" />
            nova evolução
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <Input 
            placeholder="Buscar por paciente, procedimento ou data..." 
            className="pl-12 h-12 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-slate-200">
          <Filter className="w-5 h-5 text-slate-400" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">data / hora</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">paciente</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">procedimento</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">status evolução</th>
                    <th className="text-center py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">ações</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => {
                    const patient = patients.find(p => p.id === rec.patientId);
                    const service = services.find(s => s.id === rec.serviceId);
                    return (
                      <tr key={rec.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="font-mono text-xs text-slate-700">{format(new Date(rec.date + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                            <span className="text-[10px] text-slate-400 ml-1">{rec.startTime}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs font-bold capitalize">
                              {patient?.name.charAt(0)}
                            </div>
                            <span className="font-black text-slate-900 italic text-sm">{patient?.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <Badge variant="outline" className="bg-white text-slate-600 border-indigo-100 text-[10px] font-bold truncate max-w-[150px] lowercase italic">
                            {service?.name || 'protocolo livre'}
                          </Badge>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-xs font-bold text-slate-600 lowercase italic">finalizada</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <Button variant="ghost" size="sm" className="bg-slate-50 text-slate-600 hover:bg-indigo-600 hover:text-white rounded-xl lowercase italic">
                            abrir ficha
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="p-6 bg-white border-slate-200 rounded-[2rem] shadow-sm">
            <h3 className="font-black text-slate-900 italic mb-4 flex items-center gap-2 lowercase">
              <Activity className="w-5 h-5 text-indigo-500" />
              overview clínico
            </h3>
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-[10px] font-black text-slate-400 mb-1 lowercase">evoluções hoje</p>
                <p className="text-2xl font-black text-slate-900 italic">14</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-[10px] font-black text-slate-400 mb-1 lowercase">pendentes assinatura</p>
                <p className="text-2xl font-black text-amber-500 italic">03</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-slate-900 text-white rounded-[2rem] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-[5rem]" />
            <div className="relative z-10">
              <ClipboardList className="w-8 h-8 text-indigo-400 mb-4" />
              <h3 className="text-xl font-black italic leading-tight mb-2 lowercase">modelos inteligentes</h3>
              <p className="text-slate-400 text-xs mb-6 lowercase">crie prontuários 10x mais rápido com nossos templates configurados.</p>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 rounded-xl lowercase">
                gerenciar templates
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
