import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  Users, 
  Plus, 
  Search, 
  UserPlus, 
  Mail, 
  Phone, 
  Shield, 
  Calendar,
  Clock,
  MoreVertical,
  Star,
  AreaChart,
  Trash2,
  CheckCircle2,
  TrendingUp,
  X
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { cn } from '../lib/utils';
import { ProfessionalModal } from '../components/ProfessionalModal';

export function Equipe() {
  const navigate = useNavigate();
  const { professionals, appointments } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);

  React.useEffect(() => {
    const handleOpen = () => {
      setSelectedProfessionalId(null);
      setIsModalOpen(true);
    };
    const handleClose = () => setIsModalOpen(false);

    window.addEventListener('open-onboarding-member-modal', handleOpen);
    window.addEventListener('close-onboarding-modals', handleClose);

    return () => {
      window.removeEventListener('open-onboarding-member-modal', handleOpen);
      window.removeEventListener('close-onboarding-modals', handleClose);
    };
  }, []);
  const [performanceProfId, setPerformanceProfId] = useState<string | null>(null);

  const filteredProfessionals = professionals.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic">Equipe e especialistas</h1>
          <p className="text-slate-500">Gestão de corpo clínico, permissões e disponibilidades.</p>
        </div>
        <Button 
          id="onboarding-btn-invite-member"
          onClick={() => {
            setSelectedProfessionalId(null);
            setIsModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-11 px-6 shadow-lg shadow-indigo-200"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Convidar membro
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-white border-slate-200 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-indigo-500" />
            <h3 className="font-black italic text-slate-900 text-sm">Total membros</h3>
          </div>
          <p className="text-3xl font-black text-indigo-600 italic">{professionals.length}</p>
        </Card>
        <Card className="p-6 bg-white border-slate-200 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-green-500" />
            <h3 className="font-black italic text-slate-900 text-sm">Em plantão</h3>
          </div>
          <p className="text-3xl font-black text-green-600 italic">4</p>
        </Card>
        <Card className="p-6 bg-white border-slate-200 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Star className="w-5 h-5 text-amber-500" />
            <h3 className="font-black italic text-slate-900 text-sm">Média feedback</h3>
          </div>
          <p className="text-3xl font-black text-amber-500 italic">4.9</p>
        </Card>
        <Card className="p-6 bg-white border-slate-200 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-5 h-5 text-blue-500" />
            <h3 className="font-black italic text-slate-900 text-sm">Admins</h3>
          </div>
          <p className="text-3xl font-black text-blue-600 italic">2</p>
        </Card>
      </div>

      <div className="relative group max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
        <Input 
          placeholder="Buscar por nome, especialidade ou cargo..." 
          className="pl-12 h-12 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-indigo-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProfessionals.map((prof) => (
          <Card key={prof.id} className="bg-white border-slate-200 p-6 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[5rem] -mr-8 -mt-8 -z-0 group-hover:scale-110 transition-transform" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div className="w-20 h-20 bg-white shadow-xl rounded-3xl flex items-center justify-center text-indigo-500 border-2 border-indigo-50">
                  <span className="text-2xl font-black italic">{prof.name.split(' ').map(n => n[0]).join('')}</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem 
                      className="italic font-bold"
                      onClick={() => {
                        setSelectedProfessionalId(prof.id);
                        setIsModalOpen(true);
                      }}
                    >
                      Editar perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="italic font-bold"
                      onClick={() => {
                        setSelectedProfessionalId(prof.id);
                        setIsModalOpen(true);
                      }}
                    >
                      Ajustar horários
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="italic font-bold"
                      onClick={() => setPerformanceProfId(prof.id)}
                    >
                      Ver relatórios
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600 italic font-bold">Desativar acesso</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 italic leading-tight capitalize">{prof.name}</h3>
                  <Badge className="mt-2 bg-indigo-50 text-indigo-600 border-none font-bold text-[10px]">
                    {prof.specialty}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500 text-[10px] italic">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{prof.workingHours?.start || '08:00'} - {prof.workingHours?.end || '18:00'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-[10px] text-right italic justify-end">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>4.9 (24)</span>
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                  <Button 
                    onClick={() => navigate('/agenda', { state: { professionalId: prof.id } })}
                    variant="outline" 
                    className="flex-1 rounded-xl h-10 font-bold text-[10px] border-slate-100 hover:bg-slate-50 transition-colors italic"
                  >
                    <Calendar className="w-3.5 h-3.5 mr-2" />
                    Agenda
                  </Button>
                  <Button 
                    onClick={() => setPerformanceProfId(prof.id)}
                    className="flex-1 rounded-xl h-10 font-bold text-[10px] bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100 italic"
                  >
                    Ver desempenho
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <ProfessionalModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        professionalId={selectedProfessionalId}
      />

      <PerformanceModal 
        isOpen={!!performanceProfId} 
        onClose={() => setPerformanceProfId(null)} 
        professionalId={performanceProfId} 
      />
    </div>
  );
}

function PerformanceModal({ isOpen, onClose, professionalId }: { isOpen: boolean, onClose: () => void, professionalId: string | null }) {
  const { professionals, appointments } = useStore();
  const prof = professionals.find(p => p.id === professionalId);
  const profAppts = appointments.filter(a => a.professionalId === professionalId);
  const finishedAppts = profAppts.filter(a => a.status === 'finalizado');
  const revenue = finishedAppts.reduce((sum, a) => sum + (a.value || 0), 0);

  if (!prof) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-indigo-400 font-black italic text-xs uppercase tracking-[0.2em] mb-2">Relatório de Desempenho</p>
              <h2 className="text-3xl font-black italic capitalize leading-tight">{prof.name}</h2>
              <p className="text-slate-400 font-medium italic mt-1">{prof.specialty}</p>
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-sm">
              <TrendingUp className="w-8 h-8 text-indigo-400" />
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-6 bg-slate-50 border-none rounded-3xl">
              <p className="text-[10px] font-black italic text-slate-400 uppercase tracking-wider mb-1">Atendimentos</p>
              <p className="text-2xl font-black italic text-slate-900">{profAppts.length}</p>
              <div className="flex items-center gap-1 mt-2 text-[10px] text-green-600 font-bold">
                <TrendingUp className="w-3 h-3" />
                <span>+12% mês</span>
              </div>
            </Card>
            <Card className="p-6 bg-slate-50 border-none rounded-3xl">
              <p className="text-[10px] font-black italic text-slate-400 uppercase tracking-wider mb-1">Finalizados</p>
              <p className="text-2xl font-black italic text-slate-910">{finishedAppts.length}</p>
              <div className="flex items-center gap-1 mt-2 text-[10px] text-indigo-600 font-bold">
                <CheckCircle2 className="w-3 h-3" />
                <span>94% taxa</span>
              </div>
            </Card>
            <Card className="p-6 bg-slate-50 border-none rounded-3xl">
              <p className="text-[10px] font-black italic text-slate-400 uppercase tracking-wider mb-1">Avaliação</p>
              <div className="flex items-center gap-1">
                <p className="text-2xl font-black italic text-slate-900">4.9</p>
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              </div>
              <p className="text-[10px] text-slate-400 font-bold mt-2">Base: 24 avaliações</p>
            </Card>
          </div>

          <div className="space-y-4">
            <h4 className="font-black italic text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Produção Mensal
            </h4>
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase italic">Faturamento Gerado</p>
                <p className="text-2xl font-black italic text-indigo-600">R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                <AreaChart className="w-6 h-6" />
              </div>
            </div>
          </div>

          <Button 
            onClick={onClose}
            className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black italic uppercase"
          >
            Fechar Relatório
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
