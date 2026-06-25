import React, { useState } from 'react';
import { useStore } from '../store';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  ArrowUpRight,
  Phone,
  Calendar,
  MoreHorizontal,
  Mail,
  UserCheck
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { cn } from '../lib/utils';
import { PatientModal } from '../components/PatientModal';

export function Pacientes() {
  const { patients } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('Todos');

  React.useEffect(() => {
    const handleOpen = () => {
      setSelectedPatientId(null);
      setIsNewPatientModalOpen(true);
    };
    const handleClose = () => setIsNewPatientModalOpen(false);

    window.addEventListener('open-onboarding-patient-modal', handleOpen);
    window.addEventListener('close-onboarding-modals', handleClose);

    return () => {
      window.removeEventListener('open-onboarding-patient-modal', handleOpen);
      window.removeEventListener('close-onboarding-modals', handleClose);
    };
  }, []);

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState('Todos');
  const [selectedMonth, setSelectedMonth] = useState('Todos');

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'Todos' || p.status.toLowerCase() === statusFilter.toLowerCase();

    let matchesReferral = true;
    if (selectedReferral !== 'Todos') {
      matchesReferral = p.referralMethod === selectedReferral;
    }

    let matchesMonth = true;
    if (selectedMonth !== 'Todos') {
      if (p.dateOfBirth) {
        const birthMonth = p.dateOfBirth.split('-')[1];
        matchesMonth = birthMonth === selectedMonth;
      } else {
        matchesMonth = false;
      }
    }
    
    return matchesSearch && matchesStatus && matchesReferral && matchesMonth;
  });

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic">Pacientes</h1>
          <p className="text-slate-500">Gestão centralizada de prontuários e histórico clínico.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            id="onboarding-btn-adv-filters"
            variant="outline" 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={cn(
              "h-11 rounded-xl font-bold border-slate-200 italic hover:bg-slate-50 transition-all hover:border-indigo-200 hover:text-indigo-600",
              showAdvancedFilters && "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100"
            )}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros Avançados {(selectedReferral !== 'Todos' || selectedMonth !== 'Todos') && "●"}
          </Button>
          <Button 
            id="onboarding-btn-new-patient"
            onClick={() => {
              setSelectedPatientId(null);
              setIsNewPatientModalOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-11 px-6 shadow-lg shadow-indigo-200 italic"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Paciente
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full lg:max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Buscar por nome, e-mail ou telefone..." 
            className="pl-11 h-12 bg-white border-slate-200 rounded-2xl font-medium focus:ring-indigo-500 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex bg-slate-100/50 p-1 rounded-2xl w-full lg:w-auto">
          {['Todos', 'Ativo', 'Inativo', 'Em Tratamento'].map((filter) => (
            <button 
              key={filter} 
              onClick={() => setStatusFilter(filter)}
              className={cn(
                "flex-1 lg:flex-none px-6 py-2.5 rounded-xl font-black italic text-[10px] tracking-wider transition-all uppercase",
                statusFilter === filter 
                  ? "bg-white text-indigo-600 shadow-sm" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {showAdvancedFilters && (
        <div className="bg-slate-50 border border-slate-200/60 rounded-[2rem] p-6 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-300">
          <div className="space-y-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Filtrar por Origem</span>
            <select
              id="onboarding-select-referral"
              value={selectedReferral}
              onChange={(e) => setSelectedReferral(e.target.value)}
              className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 font-bold text-xs text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Todos">🌐 Todas as Origens</option>
              <option value="Google Search">🔍 Pesquisa no Google</option>
              <option value="Instagram">📸 Instagram / Redes Sociais</option>
              <option value="Facebook">👥 Facebook</option>
              <option value="TikTok">📹 TikTok</option>
              <option value="Indicação">🙋‍♂️ Indicação de Amigo ou Familiar</option>
              <option value="Indicação Médica">🩺 Indicação de outro profissional</option>
              <option value="Fachada">🏥 Fachada da Clínica</option>
              <option value="Outros">✨ Outras Origens</option>
            </select>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Filtrar por Mês de Nascimento</span>
            <select
              id="onboarding-select-birthmonth"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 font-bold text-xs text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Todos">🎂 Todos os Meses</option>
              <option value="01">Janeiro (01)</option>
              <option value="02">Fevereiro (02)</option>
              <option value="03">Março (03)</option>
              <option value="04">Abril (04)</option>
              <option value="05">Maio (05)</option>
              <option value="06">Junho (06)</option>
              <option value="07">Julho (07)</option>
              <option value="08">Agosto (08)</option>
              <option value="09">Setembro (09)</option>
              <option value="10">Outubro (10)</option>
              <option value="11">Novembro (11)</option>
              <option value="12">Dezembro (12)</option>
            </select>
          </div>

          <div className="flex items-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedReferral('Todos');
                setSelectedMonth('Todos');
              }}
              className="h-11 rounded-xl font-bold bg-white text-xs text-slate-500 hover:text-slate-800 flex-1 border-slate-200"
            >
              Limpar Filtros
            </Button>
            <Button
              onClick={() => setShowAdvancedFilters(false)}
              className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex-1"
            >
              Fechar Painel ({filteredPatients.length})
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPatients.map((patient) => (
          <Card 
            key={patient.id} 
            className="group bg-white border-slate-100 rounded-[2.5rem] p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
            onClick={() => setSelectedPatientId(patient.id)}
          >
            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-3xl font-black text-slate-300 overflow-hidden group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 border border-slate-100 shadow-inner">
                  {patient.profilePicture ? (
                    <img 
                      src={patient.profilePicture} 
                      alt={patient.name} 
                      className="w-full h-full object-cover rounded-[2rem]" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    patient.name.charAt(0)
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-xl shadow-md flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 italic leading-none italic capitalize">{patient.name}</h3>
                <p className="text-[10px] font-black text-indigo-500 mt-2 tracking-widest italic uppercase">{patient.status}</p>
              </div>

              <div className="w-full space-y-2 pt-4 border-t border-slate-50">
                <div className="flex items-center justify-center gap-2 text-slate-500 text-sm font-medium italic">
                  <Phone className="w-3.5 h-3.5" />
                  {patient.phone || '(00) 00000-0000'}
                </div>
                <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-medium italic">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Última visita: {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : 'Não informado'}
                </div>
              </div>

              <div className="flex gap-2 w-full pt-4">
                <Button 
                  variant="ghost" 
                  className="flex-1 h-10 rounded-xl text-slate-400 hover:text-indigo-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `mailto:${patient.email}`;
                  }}
                >
                  <Mail className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex-1 h-10 rounded-xl text-slate-400 hover:text-green-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `tel:${patient.phone}`;
                  }}
                >
                  <Phone className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex-1 h-10 rounded-xl text-slate-400 hover:text-slate-900"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <PatientModal 
        isOpen={!!selectedPatientId || isNewPatientModalOpen} 
        onClose={() => {
          setSelectedPatientId(null);
          setIsNewPatientModalOpen(false);
        }} 
        patientId={selectedPatientId} 
      />
    </div>
  );
}
