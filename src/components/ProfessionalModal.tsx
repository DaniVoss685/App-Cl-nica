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
import { User, Camera } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface ProfessionalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professionalId?: string | null;
}

interface TabCheckboxProps {
  tab: string;
  allowedTabs: string[];
  onChange: (tab: string, checked: boolean) => void;
}

function TabCheckbox({ tab, allowedTabs, onChange }: TabCheckboxProps) {
  const isChecked = allowedTabs?.includes(tab);
  return (
    <label 
      className={cn(
        "flex items-center gap-2.5 p-3 border rounded-xl cursor-pointer hover:shadow-sm transition-all text-xs font-bold select-none",
        isChecked 
          ? "bg-indigo-50/20 border-indigo-200 text-indigo-700" 
          : "bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50/50"
      )}
    >
      <input 
        type="checkbox" 
        checked={isChecked}
        onChange={(e) => onChange(tab, e.target.checked)}
        className="w-4 h-4 text-indigo-600 rounded border-slate-350 focus:ring-indigo-500 cursor-pointer"
      />
      <span>{tab}</span>
    </label>
  );
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
    },
    tipoMembro: 'clinico',
    username: '',
    password: '',
    allowedTabs: [],
    foto: ''
  });

  const compressAndSetImage = (file: File, callback: (dataUrl: string) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          callback(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressAndSetImage(file, (dataUrl) => {
        setFormData(prev => ({ ...prev, foto: dataUrl }));
      });
    }
  };

  // Reset form when professionalId or open state changes
  React.useEffect(() => {
    if (open) {
      if (professionalId) {
        const prof = professionals.find(p => p.id === professionalId);
        if (prof) {
          setFormData({
            ...prof,
            workingHours: prof.workingHours || { start: '08:00', end: '18:00' },
            tipoMembro: prof.tipoMembro || 'clinico',
            username: prof.username || '',
            password: prof.password || '',
            allowedTabs: prof.allowedTabs || [],
            foto: prof.foto || ''
          });
        }
      } else {
        setFormData({
          name: '',
          specialty: '',
          email: '',
          phone: '',
          workingHours: { start: '08:00', end: '18:00' },
          tipoMembro: 'clinico',
          username: '',
          password: '',
          allowedTabs: [],
          foto: ''
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
        tipoMembro: formData.tipoMembro || 'clinico',
        username: formData.username || '',
        password: formData.password || '',
        allowedTabs: formData.allowedTabs || [],
        foto: formData.foto || ''
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
              <DialogTitle className="text-3xl font-black italic uppercase text-white">
                {professionalId ? 'Editar Membro da Equipe' : 'Convidar Novo Membro'}
              </DialogTitle>
              <p className="text-indigo-100 text-sm font-medium mt-1 italic uppercase tracking-wider">
                Defina a função, acesso ao sistema e horários de trabalho
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white hover:bg-white/10 font-black italic rounded-2xl px-8 h-14 text-sm uppercase tracking-wider shrink-0 border border-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            Fechar Janela X
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-10">
            <div className="max-w-6xl mx-auto space-y-6 bg-slate-50/70 p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            
            {/* Seção 1: Foto, Dados Pessoais e Função */}
             <div className="flex flex-col md:flex-row gap-8 items-start">
               {/* Foto de Perfil */}
               <div className="flex flex-col items-center group relative self-center md:self-start shrink-0">
                 <div className="relative">
                   <div className="w-28 h-28 rounded-[2rem] bg-indigo-50/40 border-2 border-indigo-150/30 flex items-center justify-center overflow-hidden shadow-sm transition-all group-hover:border-indigo-200">
                     {formData.foto ? (
                       <img 
                         src={formData.foto} 
                         alt="Foto de perfil" 
                         className="w-full h-full object-cover" 
                       />
                     ) : (
                       <User className="w-12 h-12 text-indigo-500" />
                     )}
                     <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                       <Camera className="w-6 h-6 text-white" />
                       <input 
                         id="professional-avatar-input"
                         type="file" 
                         accept="image/*" 
                         className="hidden" 
                         onChange={handleProfilePictureUpload} 
                       />
                     </label>
                   </div>
                   <label 
                     htmlFor="professional-avatar-input" 
                     className="absolute -bottom-1 -right-1 w-8 h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center cursor-pointer shadow-md border-2 border-white transition-colors"
                   >
                     <Camera className="w-4 h-4" />
                   </label>
                 </div>
                 <label 
                   htmlFor="professional-avatar-input" 
                   className="inline-block text-[10px] font-bold text-indigo-650 hover:text-indigo-800 hover:underline cursor-pointer transition-colors mt-2"
                 >
                   {formData.foto ? 'Alterar Foto' : 'Adicionar Foto'}
                 </label>
               </div>

               {/* Campos de Texto */}
               <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                   <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Nome Completo</Label>
                   <Input 
                     id="name" 
                     value={formData.name} 
                     onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                     className="rounded-xl h-11 bg-slate-50/50 border-slate-200/80 focus:bg-white font-bold transition-all text-sm"
                     placeholder="Nome do colaborador"
                     required
                   />
                 </div>

                 <div className="space-y-1.5">
                   <Label htmlFor="specialty" className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Cargo / Especialidade</Label>
                   <Input 
                     id="specialty" 
                     value={formData.specialty} 
                     onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                     className="rounded-xl h-11 bg-slate-50/50 border-slate-200/80 focus:bg-white font-bold transition-all text-sm"
                     placeholder="Ex: Dentista Clínico, Recepcionista"
                     required
                   />
                 </div>
               </div>
             </div>

            {/* Seção 2: Tipo de Equipe */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Tipo de Equipe</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none",
                  formData.tipoMembro === 'clinico' 
                    ? "bg-indigo-50/40 border-indigo-200 shadow-sm" 
                    : "bg-white border-slate-200 hover:bg-slate-50/50"
                )}>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-slate-800">Equipe Clínica</span>
                    <span className="text-[10px] text-slate-500 font-medium">Realiza consultas e procedimentos</span>
                  </div>
                  <input 
                    type="radio" 
                    name="tipoMembro" 
                    value="clinico"
                    checked={formData.tipoMembro === 'clinico'}
                    onChange={() => setFormData({ ...formData, tipoMembro: 'clinico' })}
                    className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                </label>
                <label className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none",
                  formData.tipoMembro === 'gestao' 
                    ? "bg-indigo-50/40 border-indigo-200 shadow-sm" 
                    : "bg-white border-slate-200 hover:bg-slate-50/50"
                )}>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-slate-800">Equipe de Gestão</span>
                    <span className="text-[10px] text-slate-500 font-medium">Recepção, administrativo e financeiro</span>
                  </div>
                  <input 
                    type="radio" 
                    name="tipoMembro" 
                    value="gestao"
                    checked={formData.tipoMembro === 'gestao'}
                    onChange={() => setFormData({ ...formData, tipoMembro: 'gestao' })}
                    className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Seção 3: Contato */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-slate-450">E-mail</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={formData.email} 
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="rounded-xl h-11 bg-slate-50/50 border-slate-200/80 focus:bg-white font-bold transition-all text-sm"
                  placeholder="email@clinica.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Telefone</Label>
                <Input 
                  id="phone" 
                  value={formData.phone} 
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="rounded-xl h-11 bg-slate-50/50 border-slate-200/80 focus:bg-white font-bold transition-all text-sm"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            
            {/* Seção 4: Horários */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Horário de Trabalho</Label>
              <div className="grid grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                <div className="space-y-1">
                  <Label htmlFor="start" className="text-[9px] text-slate-450 font-bold uppercase">Entrada</Label>
                  <Input 
                    id="start" 
                    type="time"
                    value={formData.workingHours?.start} 
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      workingHours: { ...formData.workingHours!, start: e.target.value } 
                    })}
                    className="rounded-xl h-10 bg-white border-slate-200/85 font-bold font-mono text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="end" className="text-[9px] text-slate-450 font-bold uppercase">Saída</Label>
                  <Input 
                    id="end" 
                    type="time"
                    value={formData.workingHours?.end} 
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      workingHours: { ...formData.workingHours!, end: e.target.value } 
                    })}
                    className="rounded-xl h-10 bg-white border-slate-200/85 font-bold font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Seção 5: Permissões de Login */}
            <div className="pt-2 space-y-4">
              <div className="flex items-center justify-between bg-slate-50/40 p-4 rounded-2xl border border-slate-100/80">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">Acesso ao Sistema</Label>
                  <p className="text-[10px] text-slate-500 font-medium">Permite que o colaborador realize login e acesse recursos</p>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="enableLogin"
                    checked={formData.username !== '' && formData.username !== undefined}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ 
                          ...formData, 
                          username: formData.username || formData.name?.toLowerCase().replace(/\s+/g, '.') || 'usuario', 
                          password: formData.password || '123456' 
                        });
                      } else {
                        setFormData({ ...formData, username: '', password: '', allowedTabs: [] });
                      }
                    }}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-350 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="enableLogin" className="text-xs font-black text-slate-700 cursor-pointer uppercase italic tracking-wide">Habilitar Login</label>
                </div>
              </div>

              {formData.username !== '' && formData.username !== undefined && (
                <div className="space-y-6 bg-slate-50/40 p-6 rounded-[2rem] border border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="username" className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Usuário de Login</Label>
                      <Input 
                        id="username" 
                        value={formData.username} 
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="rounded-xl h-11 bg-white font-bold text-sm"
                        placeholder="Ex: joao.odontologia"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Senha de Acesso</Label>
                      <Input 
                        id="password" 
                        value={formData.password} 
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="rounded-xl h-11 bg-white font-bold text-sm"
                        placeholder="Defina uma senha provisória"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Telas e Abas Autorizadas</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              allowedTabs: [
                                'Dashboard',
                                'Agenda',
                                'Pacientes',
                                'Agendamento Online',
                                'Comercial / CRM',
                                'WhatsApp',
                                'Financeiro',
                                'Custos e Preços',
                                'IA Inteligente',
                                'Serviços',
                                'Pacotes',
                                'Retornos',
                                'Prontuários',
                                'Documentos',
                                'Relatórios',
                                'Equipe',
                                'Configurações'
                              ]
                            });
                          }}
                          className="h-7 text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-750 hover:bg-indigo-50/50 rounded-lg px-2 cursor-pointer"
                        >
                          Habilitar Todas
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              allowedTabs: []
                            });
                          }}
                          className="h-7 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-red-500 hover:bg-slate-100 rounded-lg px-2 cursor-pointer"
                        >
                          Limpar Todas
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {/* Categoria Principal */}
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-1">Principal</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                          {['Dashboard', 'Agenda', 'Pacientes', 'Agendamento Online', 'Comercial / CRM', 'WhatsApp', 'Financeiro', 'Custos e Preços', 'IA Inteligente'].map(tab => (
                            <TabCheckbox 
                              key={tab} 
                              tab={tab} 
                              allowedTabs={formData.allowedTabs || []} 
                              onChange={(t, checked) => {
                                const currentTabs = formData.allowedTabs || [];
                                const nextTabs = checked 
                                  ? [...currentTabs, t]
                                  : currentTabs.filter(x => x !== t);
                                setFormData({ ...formData, allowedTabs: nextTabs });
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Categoria Operação */}
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-1">Operação</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                          {['Serviços', 'Pacotes', 'Retornos', 'Prontuários', 'Documentos'].map(tab => (
                            <TabCheckbox 
                              key={tab} 
                              tab={tab} 
                              allowedTabs={formData.allowedTabs || []} 
                              onChange={(t, checked) => {
                                const currentTabs = formData.allowedTabs || [];
                                const nextTabs = checked 
                                  ? [...currentTabs, t]
                                  : currentTabs.filter(x => x !== t);
                                setFormData({ ...formData, allowedTabs: nextTabs });
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Categoria Gestão */}
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-1">Gestão</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                          {['Relatórios', 'Equipe', 'Configurações'].map(tab => (
                            <TabCheckbox 
                              key={tab} 
                              tab={tab} 
                              allowedTabs={formData.allowedTabs || []} 
                              onChange={(t, checked) => {
                                const currentTabs = formData.allowedTabs || [];
                                const nextTabs = checked 
                                  ? [...currentTabs, t]
                                  : currentTabs.filter(x => x !== t);
                                setFormData({ ...formData, allowedTabs: nextTabs });
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
          
          <div className="p-8 bg-slate-50 border-t border-slate-100 shrink-0 flex items-center justify-end rounded-none w-full">
            <div className="max-w-6xl mx-auto w-full flex gap-4 justify-end">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-12 px-6 font-bold text-slate-500 hover:text-red-500 transition-colors uppercase italic text-xs tracking-wider">
                Cancelar
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
