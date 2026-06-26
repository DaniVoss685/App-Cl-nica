import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { motion } from 'motion/react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Stethoscope, 
  Sparkles, 
  Clock, 
  DollarSign, 
  Plus, 
  Search,
  Settings,
  Zap,
  MoreVertical
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { cn } from '../lib/utils';
import { ServiceModal } from '../components/ServiceModal';
import { toast } from 'sonner';

export function Servicos() {
  const { services, serviceCategories, professionals, clinicType, addService } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const suggestionsMap = useMemo<Record<string, Array<{ name: string; durationMinutes: number; price: number; category: string }>>>(() => ({
    odontologia: [
      { name: 'Limpeza / Profilaxia', durationMinutes: 45, price: 150, category: 'procedimento' },
      { name: 'Clareamento Dental', durationMinutes: 60, price: 800, category: 'estética' },
      { name: 'Restauração de Resina', durationMinutes: 60, price: 200, category: 'procedimento' },
      { name: 'Extração Simples', durationMinutes: 60, price: 250, category: 'procedimento' },
      { name: 'Implante Dentário', durationMinutes: 120, price: 3500, category: 'procedimento' }
    ],
    estética: [
      { name: 'Aplicação de Botox', durationMinutes: 45, price: 1200, category: 'estética' },
      { name: 'Preenchimento Labial', durationMinutes: 60, price: 1500, category: 'estética' },
      { name: 'Limpeza de Pele Profunda', durationMinutes: 90, price: 200, category: 'procedimento' },
      { name: 'Drenagem Linfática', durationMinutes: 60, price: 150, category: 'procedimento' },
      { name: 'Peeling Químico', durationMinutes: 45, price: 350, category: 'procedimento' }
    ],
    medicina: [
      { name: 'Consulta Médica Especializada', durationMinutes: 45, price: 400, category: 'consulta' },
      { name: 'Check-up Geral', durationMinutes: 60, price: 600, category: 'procedimento' },
      { name: 'Teleconsulta', durationMinutes: 30, price: 250, category: 'consulta' }
    ],
    fisioterapia: [
      { name: 'Avaliação Fisioterapêutica', durationMinutes: 60, price: 180, category: 'consulta' },
      { name: 'Sessão de Fisioterapia', durationMinutes: 60, price: 120, category: 'procedimento' },
      { name: 'Sessão de RPG', durationMinutes: 60, price: 150, category: 'procedimento' }
    ],
    psicologia: [
      { name: 'Psicoterapia Individual', durationMinutes: 50, price: 150, category: 'consulta' },
      { name: 'Avaliação Neuropsicológica', durationMinutes: 90, price: 300, category: 'procedimento' },
      { name: 'Terapia de Casal', durationMinutes: 60, price: 220, category: 'consulta' }
    ]
  }), []);

  const normalizedType = (clinicType || '').toLowerCase();
  
  const suggestions = useMemo(() => {
    const list = suggestionsMap[normalizedType] || [];
    return list.filter(item => !services.some(s => s.name.toLowerCase() === item.name.toLowerCase()));
  }, [normalizedType, services, suggestionsMap]);

  const handleAddSuggestedService = (suggestion: any) => {
    addService({
      name: suggestion.name,
      durationMinutes: suggestion.durationMinutes,
      price: suggestion.price,
      category: suggestion.category,
      generatesFollowUp: false,
      itemCosts: [],
      professionalIds: []
    });
    toast.success(`Serviço "${suggestion.name}" adicionado com sucesso!`);
  };

  React.useEffect(() => {
    const handleOpen = () => {
      setSelectedServiceId(null);
      setIsModalOpen(true);
    };
    const handleClose = () => setIsModalOpen(false);

    window.addEventListener('open-onboarding-service-modal', handleOpen);
    window.addEventListener('close-onboarding-modals', handleClose);

    return () => {
      window.removeEventListener('open-onboarding-service-modal', handleOpen);
      window.removeEventListener('close-onboarding-modals', handleClose);
    };
  }, []);

  const [searchTerm, setSearchTerm] = useState('');

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="p-6 space-y-8 max-w-[1600px] mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic">Serviços</h1>
          <p className="text-slate-500">Definição de protocolos, precificação e durações.</p>
        </div>
        <Button 
          id="onboarding-btn-new-service"
          onClick={() => {
            setSelectedServiceId(null);
            setIsModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-11 px-6 shadow-lg shadow-indigo-200 italic"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Serviço
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Buscar serviço..." 
            className="pl-10 h-10 border-slate-200 rounded-xl"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {serviceCategories.map((cat) => (
            <Badge key={cat} variant="outline" className="px-4 py-1.5 rounded-full border-slate-200 text-slate-600 cursor-pointer hover:bg-slate-50 font-bold text-[10px] capitalize select-none">
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      {/* Suggestions Section */}
      {suggestions.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-indigo-50/30 border border-indigo-100/50 rounded-[2.5rem] shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2 text-indigo-800">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="font-black italic uppercase tracking-tight text-xs">
              Procedimentos sugeridos para {clinicType}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {suggestions.map((suggestion) => (
              <div 
                key={suggestion.name} 
                className="bg-white border border-slate-100 p-4 rounded-2xl flex flex-col justify-between hover:shadow-md transition-all gap-3"
              >
                <div>
                  <h4 className="font-black text-slate-800 text-sm italic capitalize leading-tight">{suggestion.name}</h4>
                  <Badge variant="outline" className="text-[9px] bg-slate-50 border-slate-100 text-slate-500 font-bold uppercase mt-1">
                    {suggestion.category}
                  </Badge>
                  <div className="flex gap-4 mt-3 text-[11px] font-bold text-slate-500">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-indigo-500" /> {suggestion.durationMinutes} min</span>
                    <span className="flex items-center gap-1 text-green-600 font-mono"><DollarSign className="w-3.5 h-3.5 text-green-500" /> R$ {suggestion.price}</span>
                  </div>
                </div>
                <Button 
                  onClick={() => handleAddSuggestedService(suggestion)}
                  className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Adicionar
                </Button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div 
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.05 } }
        }}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredServices.map((service) => (
          <motion.div
            key={service.id}
            variants={{
              hidden: { opacity: 0, y: 15 },
              show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
            }}
            whileHover={{ y: -4 }}
          >
            <Card className="bg-white border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between h-full cursor-pointer select-none">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    {service.category === 'Estética' ? <Sparkles className="w-6 h-6" /> : <Stethoscope className="w-6 h-6" />}
                  </div>
                  <Button variant="ghost" size="icon" className="text-slate-300 hover:text-slate-900">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 italic leading-tight capitalize">{service.name}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-2 items-center">
                      <Badge className="bg-slate-100 text-slate-500 border-none text-[9px] font-black italic capitalize">
                        {service.category}
                      </Badge>
                      
                      {/* Certified Professionals */}
                      {(service.professionalIds || []).length > 0 ? (
                        (service.professionalIds || []).map(pId => {
                          const prof = professionals.find(p => p.id === pId);
                          return prof ? (
                            <Badge key={pId} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none text-[9px] font-extrabold px-1.5 py-0.5 rounded-lg uppercase">
                              {prof.name.split(' ').slice(0, 2).join(' ')}
                            </Badge>
                          ) : null;
                        })
                      ) : (
                        <Badge className="bg-slate-50 text-slate-400 border-none text-[9px] font-extrabold px-1.5 py-0.5 rounded-lg uppercase">
                          Todos profissionais
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-6 py-4 border-t border-slate-50">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400">Duração</p>
                      <div className="flex items-center gap-2 text-slate-900 font-bold font-mono">
                        <Clock className="w-4 h-4 text-indigo-500" />
                        {service.durationMinutes} min
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400">Valor sugerido</p>
                      <div className="flex items-center gap-2 text-slate-900 font-bold font-mono">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        R$ {service.price.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4 pt-4 border-t border-slate-50">
                {service.generatesFollowUp && (
                  <div className="flex items-center gap-2 text-[10px] font-black italic text-amber-600">
                    <Zap className="w-3 h-3" />
                    Gera retorno em {service.followUpDays}d
                  </div>
                )}
                <Button 
                  onClick={() => {
                    setSelectedServiceId(service.id);
                    setIsModalOpen(true);
                  }}
                  variant="ghost" 
                  size="sm" 
                  className="ml-auto text-slate-500 font-bold gap-2 hover:bg-slate-50 italic"
                >
                  <Settings className="w-4 h-4" />
                  Configurar
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {isModalOpen && (
        <ServiceModal 
          isOpen={isModalOpen} 
          onClose={() => {
            setIsModalOpen(false);
            setSelectedServiceId(null);
          }} 
          serviceId={selectedServiceId}
        />
      )}
    </motion.div>
  );
}
