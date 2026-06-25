import React, { useState } from 'react';
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
import { useStore } from '../store';
import { Professional } from '../types';
import { User } from 'lucide-react';

interface ProfessionalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professionalId?: string | null;
}

export function ProfessionalModal({ open, onOpenChange, professionalId }: ProfessionalModalProps) {
  const { professionals, addProfessional, updateProfessional } = useStore();
  
  const [formData, setFormData] = useState<Partial<Professional>>({
    name: '',
    specialty: '',
    email: '',
    phone: '',
    workingHours: {
      start: '08:00',
      end: '18:00',
    }
  });

  // Reset form when professionalId or open state changes
  React.useEffect(() => {
    if (open) {
      if (professionalId) {
        const prof = professionals.find(p => p.id === professionalId);
        if (prof) {
          setFormData({
            ...prof,
            workingHours: prof.workingHours || { start: '08:00', end: '18:00' }
          });
        }
      } else {
        setFormData({
          name: '',
          specialty: '',
          email: '',
          phone: '',
          workingHours: { start: '08:00', end: '18:00' }
        });
      }
    }
  }, [open, professionalId, professionals]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (professionalId) {
      updateProfessional(professionalId, formData);
    } else {
      addProfessional({
        name: formData.name || '',
        specialty: formData.specialty || '',
        email: formData.email,
        phone: formData.phone,
        workingHours: formData.workingHours,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-none sm:max-w-none md:max-w-none lg:max-w-none xl:max-w-none w-screen h-screen m-0 rounded-none p-0 bg-white border-none flex flex-col top-0 left-0 translate-x-0 translate-y-0 duration-100 overflow-hidden">
        <div className="bg-indigo-600 p-8 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black italic uppercase text-white">
                {professionalId ? 'Editar Especialista' : 'Novo Especialista'}
              </DialogTitle>
              <p className="text-indigo-100 text-xs font-bold tracking-widest mt-1 uppercase">
                Defina o perfil de atuação, especialidade e horário de atendimento do profissional
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white hover:bg-white/10 font-black italic rounded-xl px-4 h-11 text-xs uppercase tracking-wider shrink-0"
          >
            Fechar X
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-10">
            <div className="max-w-2xl mx-auto space-y-6 bg-slate-50/70 p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-550">Nome Completo</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="rounded-xl h-12 bg-white font-bold"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialty" className="text-xs font-bold uppercase tracking-wider text-slate-550">Especialidade / Cargo</Label>
                <Input 
                  id="specialty" 
                  value={formData.specialty} 
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  className="rounded-xl h-12 bg-white font-bold"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-550">E-mail</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={formData.email} 
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="rounded-xl h-12 bg-white font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-slate-550">Telefone</Label>
                  <Input 
                    id="phone" 
                    value={formData.phone} 
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="rounded-xl h-12 bg-white font-bold"
                  />
                </div>
              </div>
              
              <div className="pt-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-550 mb-2 block">Horário de Disponibilidade</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="start" className="text-[10px] text-slate-450 font-bold uppercase">Entrada</Label>
                    <Input 
                      id="start" 
                      type="time"
                      value={formData.workingHours?.start} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        workingHours: { ...formData.workingHours!, start: e.target.value } 
                      })}
                      className="rounded-xl h-12 bg-white font-bold font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="end" className="text-[10px] text-slate-450 font-bold uppercase">Saída</Label>
                    <Input 
                      id="end" 
                      type="time"
                      value={formData.workingHours?.end} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        workingHours: { ...formData.workingHours!, end: e.target.value } 
                      })}
                      className="rounded-xl h-12 bg-white font-bold font-mono"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 italic">Define o período que este profissional estará disponível para agendamentos.</p>
              </div>
            </div>
          </div>
          
          <div className="p-8 bg-slate-50 border-t border-slate-100 shrink-0 flex items-center justify-end rounded-none w-full">
            <div className="max-w-2xl mx-auto w-full flex gap-4 justify-end">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-12 px-6 font-bold text-slate-500 hover:text-red-500 transition-colors uppercase italic text-xs tracking-wider">
                cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 h-12 px-8 font-black text-xs text-white shadow-xl shadow-indigo-100 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] uppercase italic tracking-wider">
                {professionalId ? 'Salvar Alterações' : 'Convidar'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
