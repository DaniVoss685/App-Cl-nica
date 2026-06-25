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
  Lock
} from 'lucide-react';
import { cn } from '../lib/utils';

import { PackageModal } from '../components/PackageModal';

export function Pacotes() {
  const { packages, professionals } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

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
