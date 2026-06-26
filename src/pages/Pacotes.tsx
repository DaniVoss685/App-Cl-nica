import React, { useState } from 'react';
import { useStore } from '../store';
import { motion } from 'motion/react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  Package, 
  Plus, 
  Search, 
  Zap, 
  ArrowRight, 
  Tag, 
  Clock,
  CheckCircle2,
  Lock,
  Sparkles,
  DollarSign
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

import { PackageModal } from '../components/PackageModal';

export function Pacotes() {
  const { packages, professionals, clinicType, addPackage } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  const suggestionsMap = React.useMemo<Record<string, Array<{ name: string; description: string; price: number; totalSessions: number; maxDiscountPercentage: number; maxInstallments: number }>>>(() => ({
    odontologia: [
      { name: 'Clareamento Completo', description: 'Tratamento de clareamento a laser em consultório + kit caseiro de moldeira e gel.', price: 1200, totalSessions: 3, maxDiscountPercentage: 10, maxInstallments: 6 },
      { name: 'Tratamento Ortodôntico (Anual)', description: 'Instalação de aparelho ortodôntico + 12 manutenções mensais inclusas.', price: 1800, totalSessions: 13, maxDiscountPercentage: 10, maxInstallments: 12 },
      { name: 'Combo Reabilitação Protética', description: 'Planejamento + implante de pino de titânio + confecção de coroa de cerâmica.', price: 4500, totalSessions: 4, maxDiscountPercentage: 15, maxInstallments: 12 },
      { name: 'Prevenção Saúde Bucal', description: '4 limpezas/profilaxias no ano + aplicação de flúor e exames clínicos de rotina.', price: 500, totalSessions: 4, maxDiscountPercentage: 5, maxInstallments: 4 },
      { name: 'Tratamento de Canal & Coroa', description: 'Tratamento endodôntico completo + reconstrução do dente com coroa provisória.', price: 1500, totalSessions: 3, maxDiscountPercentage: 10, maxInstallments: 6 }
    ],
    estética: [
      { name: 'Protocolo Rejuvenescimento Facial', description: 'Aplicação de toxina botulínica (Botox) + 3 sessões de peeling químico regenerador.', price: 2200, totalSessions: 4, maxDiscountPercentage: 10, maxInstallments: 6 },
      { name: 'Projeto Redução Medidas (10s)', description: '10 sessões combinadas de drenagem linfática manual e massagem modeladora corporal.', price: 1200, totalSessions: 10, maxDiscountPercentage: 15, maxInstallments: 10 },
      { name: 'Plano Pele de Pêssego', description: '3 limpezas de pele profunda + 3 sessões de hidratação de colágeno.', price: 650, totalSessions: 6, maxDiscountPercentage: 10, maxInstallments: 6 },
      { name: 'Depilação a Laser Completa (10s)', description: 'Protocolo de 10 sessões de depilação a laser na área escolhida para eliminação de pelos.', price: 990, totalSessions: 10, maxDiscountPercentage: 15, maxInstallments: 10 },
      { name: 'Lifting de Colágeno Sem Cortes', description: '1 sessão de Ultraformer III facial + 1 aplicação de bioestimulador de colágeno.', price: 3500, totalSessions: 2, maxDiscountPercentage: 12, maxInstallments: 10 }
    ],
    medicina: [
      { name: 'Plano Acompanhamento Longevidade', description: '3 consultas médicas + exames de rotina inclusos + orientações nutricionais.', price: 1200, totalSessions: 3, maxDiscountPercentage: 10, maxInstallments: 6 },
      { name: 'Check-up Integral Stark', description: 'Consulta clínica inicial + bioimpedância avançada + consulta de retorno.', price: 800, totalSessions: 2, maxDiscountPercentage: 5, maxInstallments: 4 },
      { name: 'Metabólico Peso Saudável (5s)', description: '5 encontros de acompanhamento metabólico e emagrecimento saudável com exames.', price: 1500, totalSessions: 5, maxDiscountPercentage: 10, maxInstallments: 6 }
    ],
    fisioterapia: [
      { name: 'Reabilitação Postural RPG (10s)', description: '10 sessões de Reorganização Postural Global (RPG) + avaliação cinético-funcional.', price: 1250, totalSessions: 11, maxDiscountPercentage: 10, maxInstallments: 10 },
      { name: 'Tratamento Alívio de Dores Crônicas', description: '8 sessões de acupuntura integrada com terapia manual e eletroterapia.', price: 960, totalSessions: 8, maxDiscountPercentage: 10, maxInstallments: 8 },
      { name: 'Mensalidade Pilates Aparelhos', description: 'Frequência de 2x por semana. Total de 8 sessões mensais com fisioterapeuta.', price: 380, totalSessions: 8, maxDiscountPercentage: 5, maxInstallments: 3 }
    ],
    psicologia: [
      { name: 'Mensalidade Psicoterapia (4s)', description: 'Acompanhamento psicoterápico semanal (4 sessões individuais de 50 minutos).', price: 600, totalSessions: 4, maxDiscountPercentage: 10, maxInstallments: 4 },
      { name: 'Avaliação Vocacional e Carreira', description: '6 encontros estruturados para aplicação de testes psicológicos e devolutiva.', price: 900, totalSessions: 6, maxDiscountPercentage: 10, maxInstallments: 6 },
      { name: 'TCC Foco em Ansiedade (8s)', description: 'Protocolo de Terapia Cognitivo-Comportamental de 8 sessões com metas estruturadas.', price: 1200, totalSessions: 8, maxDiscountPercentage: 15, maxInstallments: 8 }
    ]
  }), []);

  const normalizedType = (clinicType || '').toLowerCase();
  
  const suggestions = React.useMemo(() => {
    const list = suggestionsMap[normalizedType] || [];
    return list.filter(item => !packages.some(p => p.name.toLowerCase() === item.name.toLowerCase()));
  }, [normalizedType, packages, suggestionsMap]);

  const handleAddSuggestedPackage = (suggestion: any) => {
    addPackage({
      name: suggestion.name,
      description: suggestion.description,
      price: suggestion.price,
      totalSessions: suggestion.totalSessions,
      maxDiscountPercentage: suggestion.maxDiscountPercentage,
      maxInstallments: suggestion.maxInstallments,
      includedServices: [],
      professionalIds: [],
      active: true
    });
    toast.success(`Plano "${suggestion.name}" adicionado com sucesso!`);
  };

  React.useEffect(() => {
    const handleOpen = () => {
      setSelectedPackageId(null);
      setIsModalOpen(true);
    };
    const handleClose = () => setIsModalOpen(false);

    window.addEventListener('open-onboarding-package-modal', handleOpen);
    window.addEventListener('close-onboarding-modals', handleClose);

    return () => {
      window.removeEventListener('open-onboarding-package-modal', handleOpen);
      window.removeEventListener('close-onboarding-modals', handleClose);
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fade-in"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic">Planos e pacotes</h1>
          <p className="text-slate-500">Engenharia de produtos e combos de alta conversão.</p>
        </div>
        <Button 
          id="onboarding-btn-new-package"
          onClick={() => {
            setSelectedPackageId(null);
            setIsModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-11 px-6 shadow-lg shadow-indigo-200 italic"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo pacote
        </Button>
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
              Planos e Pacotes sugeridos para {clinicType}
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
                  <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{suggestion.description}</p>
                  <div className="flex gap-4 mt-3 text-[11px] font-bold text-slate-500 border-t border-slate-50 pt-2">
                    <span className="flex items-center gap-1 font-sans"><Clock className="w-3.5 h-3.5 text-indigo-500" /> {suggestion.totalSessions} sessões</span>
                    <span className="flex items-center gap-1 text-green-600 font-mono"><DollarSign className="w-3.5 h-3.5 text-green-500" /> R$ {suggestion.price}</span>
                  </div>
                </div>
                <Button 
                  onClick={() => handleAddSuggestedPackage(suggestion)}
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
          show: { opacity: 1, transition: { staggerChildren: 0.08 } }
        }}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        {packages.map((pkg) => (
          <motion.div
            key={pkg.id}
            variants={{
              hidden: { opacity: 0, y: 15 },
              show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
            }}
            whileHover={{ y: -5 }}
          >
            <Card className="relative bg-white border-slate-200 rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all group overflow-hidden border-t-8 border-t-indigo-500 h-full select-none cursor-pointer">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl bg-indigo-600 transition-transform group-hover:scale-110">
                    <Package className="w-8 h-8" />
                  </div>
                  {!pkg.active && (
                    <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[10px] italic px-3 lowercase italic">
                      inativo
                    </Badge>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 italic leading-tight capitalize">{pkg.name}</h3>
                    <p className="text-slate-500 text-sm mt-2 leading-relaxed line-clamp-2">{pkg.description}</p>
                  </div>

                  <div className="flex items-center gap-6 py-4 border-y border-slate-50">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 tracking-widest leading-none mb-1 italic">Valor do Combo</span>
                      <span className="text-2xl font-black text-slate-900 italic">
                        R$ {pkg.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 tracking-widest leading-none mb-1 italic">Sessões</span>
                      <span className="text-2xl font-black text-indigo-600 italic">
                        {pkg.totalSessions}x
                      </span>
                    </div>
                  </div>

                  {/* Pricing Limits Calculator */}
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-100/60 text-xs">
                    <div className="flex justify-between font-bold text-slate-600">
                      <span>Desconto Limite ({pkg.maxDiscountPercentage || 10}%):</span>
                      <span className="text-amber-600">- R$ {((pkg.price * (pkg.maxDiscountPercentage || 10)) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between font-black text-slate-800">
                      <span>Valor Mínimo Venda:</span>
                      <span>R$ {(pkg.price - (pkg.price * (pkg.maxDiscountPercentage || 10)) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 font-mono border-t border-dashed border-slate-200/80 pt-1.5 mt-1">
                      <span>Cartão Sem Juros:</span>
                      <span className="font-bold text-indigo-600">Até {pkg.maxInstallments || 6}x de R$ {((pkg.price - (pkg.price * (pkg.maxDiscountPercentage || 10)) / 100) / (pkg.maxInstallments || 6)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Certified Professionals List */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic block">Profissionais Vinculados</span>
                    <div className="flex flex-wrap gap-1">
                      {(pkg.professionalIds || []).length > 0 ? (
                        (pkg.professionalIds || []).map(pId => {
                          const prof = professionals.find(p => p.id === pId);
                          return prof ? (
                            <Badge key={pId} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-750 border-none text-[9px] font-extrabold px-2 py-0.5 rounded-lg uppercase">
                              {prof.name}
                            </Badge>
                          ) : null;
                        })
                      ) : (
                        <Badge className="bg-slate-50 text-slate-500 border-none text-[9px] font-extrabold px-2 py-0.5 rounded-lg uppercase">
                          Qualquer Profissional
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button 
                    onClick={() => {
                      setSelectedPackageId(pkg.id);
                      setIsModalOpen(true);
                    }}
                    className="w-full h-12 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl font-black italic tracking-wider transition-all mt-4 italic font-black"
                  >
                    Editar Detalhes
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}

        <motion.button 
          variants={{
            hidden: { opacity: 0, y: 15 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
          }}
          whileHover={{ y: -5 }}
          onClick={() => {
            setSelectedPackageId(null);
            setIsModalOpen(true);
          }}
          className="border-4 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center p-12 hover:border-indigo-200 hover:bg-slate-50 transition-all group min-h-[400px] w-full text-left"
        >
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 group-hover:bg-white group-hover:text-indigo-400 transition-all mb-4 group-hover:scale-110">
            <Plus className="w-10 h-10" />
          </div>
          <h3 className="font-black text-slate-400 italic text-lg group-hover:text-indigo-500 text-center">Novo protocolo</h3>
          <p className="text-slate-300 text-sm mt-1 text-center">Configure regras personalizadas.</p>
        </motion.button>
      </motion.div>

      <PackageModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
        packageId={selectedPackageId}
      />
    </motion.div>
  );
}
