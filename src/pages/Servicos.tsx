import React, { useState } from 'react';
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

export function Servicos() {
  const { services, serviceCategories, professionals } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

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
