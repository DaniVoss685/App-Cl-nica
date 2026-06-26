import React, { useState } from 'react';
import { useStore } from '../store';
import { motion } from 'motion/react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { 
  TrendingDown, 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  Target, 
  ArrowRight,
  Plus,
  AlertCircle,
  Zap,
  Package,
  History,
  Clock,
  Settings,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { CostModal } from '../components/CostModal';
import { ServiceModal } from '../components/ServiceModal';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '../components/ui/dialog';

export function Custos() {
  const { 
    services, 
    inventory, 
    updateInventoryItem, 
    supplyExpenses,
    appointments,
    patients,
    clinicType,
    addInventoryItem
  } = useStore();

  const suggestionsMap = React.useMemo<Record<string, Array<{ name: string; unit: 'unidade' | 'pacote' | 'peso' | 'ml' | 'g'; unitCost: number; category: string; minQuantity: number; unitsPerPackage?: number; subUnitName?: string }>>>(() => ({
    odontologia: [
      { name: 'Resina Composta Fotopolimerizável', unit: 'unidade', unitCost: 85, category: 'material', minQuantity: 5 },
      { name: 'Anestésico Odontológico (Mepivacaína)', unit: 'pacote', unitCost: 120, category: 'medicamento', minQuantity: 3, unitsPerPackage: 50, subUnitName: 'tubete' },
      { name: 'Sugador de Saliva Descartável', unit: 'pacote', unitCost: 18, category: 'consumível', minQuantity: 4, unitsPerPackage: 100, subUnitName: 'un' },
      { name: 'Luvas de Procedimento Látex', unit: 'pacote', unitCost: 45, category: 'consumível', minQuantity: 10, unitsPerPackage: 100, subUnitName: 'un' },
      { name: 'Gesso Especial Odontológico 1kg', unit: 'peso', unitCost: 35, category: 'material', minQuantity: 2 },
      { name: 'Máscara Descartável Tripla', unit: 'pacote', unitCost: 20, category: 'consumível', minQuantity: 5, unitsPerPackage: 50, subUnitName: 'un' },
      { name: 'Agulha Gengival Descartável', unit: 'pacote', unitCost: 42, category: 'consumível', minQuantity: 3, unitsPerPackage: 100, subUnitName: 'un' },
      { name: 'Babador Descartável Impermeável', unit: 'pacote', unitCost: 28, category: 'consumível', minQuantity: 4, unitsPerPackage: 100, subUnitName: 'un' }
    ],
    estética: [
      { name: 'Toxina Botulínica (Botox) 100 UI', unit: 'unidade', unitCost: 650, category: 'medicamento', minQuantity: 2 },
      { name: 'Ácido Hialurônico Preenchedor 1ml', unit: 'unidade', unitCost: 450, category: 'material', minQuantity: 3 },
      { name: 'Microagulhas para Dermaroller', unit: 'unidade', unitCost: 35, category: 'material', minQuantity: 5 },
      { name: 'Álcool 70% Antisséptico 1L', unit: 'ml', unitCost: 12, category: 'consumível', minQuantity: 2 },
      { name: 'Seringa Descartável 3ml', unit: 'pacote', unitCost: 30, category: 'consumível', minQuantity: 4, unitsPerPackage: 100, subUnitName: 'un' },
      { name: 'Touca Descartável Sanfonada', unit: 'pacote', unitCost: 15, category: 'consumível', minQuantity: 5, unitsPerPackage: 100, subUnitName: 'un' }
    ],
    medicina: [
      { name: 'Seringa com Agulha Descartável', unit: 'unidade', unitCost: 1.5, category: 'consumível', minQuantity: 50 },
      { name: 'Algodão Hidrófilo Rolo 500g', unit: 'peso', unitCost: 18, category: 'consumível', minQuantity: 3 },
      { name: 'Fita Micropore 25mm x 10m', unit: 'unidade', unitCost: 8, category: 'consumível', minQuantity: 5 },
      { name: 'Avental Descartável Gramatura 30', unit: 'pacote', unitCost: 45, category: 'consumível', minQuantity: 4, unitsPerPackage: 10, subUnitName: 'un' },
      { name: 'Sorologia Fisiológica 0,9% 500ml', unit: 'ml', unitCost: 10, category: 'medicamento', minQuantity: 10 }
    ],
    fisioterapia: [
      { name: 'Óleo para Massagem Neutro 1L', unit: 'ml', unitCost: 55, category: 'material', minQuantity: 2 },
      { name: 'Agulhas para Acupuntura 0,25x30', unit: 'pacote', unitCost: 28, category: 'material', minQuantity: 3, unitsPerPackage: 100, subUnitName: 'un' },
      { name: 'Fita Kinesio Bandagem Elastica', unit: 'unidade', unitCost: 25, category: 'material', minQuantity: 5 },
      { name: 'Lençol de Papel para Maca Rolo', unit: 'unidade', unitCost: 15, category: 'consumível', minQuantity: 10 },
      { name: 'Gel Condutor para Ultrassom 5kg', unit: 'peso', unitCost: 45, category: 'material', minQuantity: 2 }
    ],
    psicologia: [
      { name: 'Folhas de Teste Psicológico (HTP)', unit: 'pacote', unitCost: 120, category: 'material', minQuantity: 2, unitsPerPackage: 25, subUnitName: 'folha' },
      { name: 'Bloco de Anotações Clínicas', unit: 'unidade', unitCost: 12, category: 'consumível', minQuantity: 5 },
      { name: 'Caixa de Lenços de Papel Duplo', unit: 'unidade', unitCost: 6, category: 'consumível', minQuantity: 4 },
      { name: 'Jogo / Cartão de Recursos Lúdicos', unit: 'unidade', unitCost: 80, category: 'material', minQuantity: 1 },
      { name: 'Brinquedos Terapêuticos (Kit Mini)', unit: 'unidade', unitCost: 150, category: 'material', minQuantity: 1 }
    ]
  }), []);

  const normalizedType = (clinicType || '').toLowerCase();
  
  const suggestions = React.useMemo(() => {
    const list = suggestionsMap[normalizedType] || [];
    return list.filter(item => !inventory.some(i => i.name.toLowerCase() === item.name.toLowerCase()));
  }, [normalizedType, inventory, suggestionsMap]);

  const handleAddSuggestedItem = (suggestion: any) => {
    addInventoryItem({
      name: suggestion.name,
      unit: suggestion.unit,
      unitCost: suggestion.unitCost,
      category: suggestion.category,
      quantity: 10,
      minQuantity: suggestion.minQuantity,
      unitsPerPackage: suggestion.unitsPerPackage,
      subUnitName: suggestion.subUnitName
    });
    toast.success(`Insumo "${suggestion.name}" adicionado ao estoque!`);
  };
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [percentage, setPercentage] = useState(5);

  React.useEffect(() => {
    const handleOpen = () => {
      setIsModalOpen(true);
    };
    const handleClose = () => {
      setIsModalOpen(false);
      setIsServiceModalOpen(false);
    };

    window.addEventListener('open-onboarding-cost-modal', handleOpen);
    window.addEventListener('close-onboarding-modals', handleClose);

    return () => {
      window.removeEventListener('open-onboarding-cost-modal', handleOpen);
      window.removeEventListener('close-onboarding-modals', handleClose);
    };
  }, []);

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingInventoryItem, setEditingInventoryItem] = useState<any | null>(null);

  // Helper: calculate supplies cost for any service dynamically
  const getServiceSuppliesCost = (service: any) => {
    if (!service.itemCosts || service.itemCosts.length === 0) return 0;
    return service.itemCosts.reduce((total: number, ic: any) => {
      const invItem = inventory.find((item: any) => item.id === ic.itemId);
      const unitCost = invItem ? invItem.unitCost : 0;
      return total + (unitCost * ic.quantity);
    }, 0);
  };

  // Inline Stock Quantity modification
  const handleUpdateStock = (itemId: string, newQty: number) => {
    updateInventoryItem(itemId, { quantity: Math.max(0, newQty) });
  };

  // Calculate high-level clinic metrics based on actual state store values
  const totalInsumosCost = inventory.reduce((total, item) => total + ((item.quantity || 0) * (item.unitCost || 0)), 0);
  const criticalItemsCount = inventory.filter(item => {
    const minVal = item.minQuantity !== undefined ? item.minQuantity : 5;
    return (item.quantity || 0) < minVal;
  }).length;

  const estimatedMargin = React.useMemo(() => {
    if (!services || services.length === 0) return 0;
    const totalMarginPct = services.reduce((total, s) => {
      const suppliesCost = getServiceSuppliesCost(s);
      const fixedCostProRata = 32;
      const marginAmt = s.price - suppliesCost - fixedCostProRata;
      return total + (s.price > 0 ? (marginAmt / s.price) * 100 : 0);
    }, 0);
    return Math.max(0, Math.round(totalMarginPct / services.length));
  }, [services, inventory]);

  const avgInsumosCostPct = React.useMemo(() => {
    if (!services || services.length === 0) return 0;
    const totalInsumosPct = services.reduce((total, s) => {
      const suppliesCost = getServiceSuppliesCost(s);
      return total + (s.price > 0 ? (suppliesCost / s.price) * 100 : 0);
    }, 0);
    return Math.max(0, Math.round(totalInsumosPct / services.length));
  }, [services, inventory]);

  // Helper to find future appointments using a specific item
  const getAffectedAppointmentsForItem = (itemId: string) => {
    const servicesUsingItem = services.filter(s => 
      s.itemCosts && s.itemCosts.some(ic => ic.itemId === itemId)
    );
    const serviceIds = servicesUsingItem.map(s => s.id);
    return (appointments || []).filter(appt => 
      serviceIds.includes(appt.serviceId) && 
      (appt.status === 'agendado' || appt.status === 'confirmado')
    );
  };

  const belowThresholdItems = inventory.filter(item => {
    const minVal = item.minQuantity !== undefined ? item.minQuantity : 5;
    return (item.quantity || 0) < minVal;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="p-6 space-y-6 max-w-[1600px] mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic">Custo e Precificação</h1>
          <p className="text-slate-500">Engenharia financeira, controle físico de estoque e margens de lucro por procedimento.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setIsModalOpen(true)}
            variant="outline" 
            className="h-11 px-6 rounded-xl border-slate-200 shadow-sm font-bold italic"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Custo / Insumo
          </Button>
          <Button 
            onClick={() => {
              if (services.length > 0) {
                setSelectedServiceId(services[0].id);
                setIsServiceModalOpen(true);
              }
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-11 px-6 shadow-lg shadow-indigo-200 italic"
          >
            <Zap className="w-5 h-5 mr-2" />
            Configurar Protocolos
          </Button>
        </div>
      </div>

      <motion.div 
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.08 } }
        }}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
          }}
          whileHover={{ y: -4 }}
        >
          <Card className="p-6 bg-white border-slate-200 rounded-[2rem] shadow-sm relative overflow-hidden group h-full cursor-pointer select-none">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-50 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-300" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-indigo-500" />
                <h3 className="text-[10px] font-black text-slate-400 tracking-widest italic uppercase">Valor Total em Estoque</h3>
              </div>
              <p className="text-2xl font-black text-slate-900 italic">
                R$ {totalInsumosCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-1 mt-2 text-indigo-600 text-xs font-bold italic">
                <Package className="w-3 h-3" />
                {inventory.length} itens registrados
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
          }}
          whileHover={{ y: -4 }}
        >
          <Card className="p-6 bg-white border-slate-200 rounded-[2rem] shadow-sm relative overflow-hidden group h-full cursor-pointer select-none">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-300" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-emerald-500" />
                <h3 className="text-[10px] font-black text-slate-400 tracking-widest italic uppercase">Margem Operacional Estimada</h3>
              </div>
              <p className="text-2xl font-black text-slate-900 italic">{estimatedMargin}%</p>
              <div className="flex items-center gap-1 mt-2 text-indigo-600 text-xs font-bold italic">
                <TrendingUp className="w-3 h-3" />
                Meta: 60%
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
          }}
          whileHover={{ y: -4 }}
        >
          <Card className="p-6 bg-white border-slate-200 rounded-[2rem] shadow-sm relative overflow-hidden group h-full cursor-pointer select-none">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-50 rounded-full opacity-50 group-hover:scale-125 transition-transform duration-300" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="w-4 h-4 text-amber-500" />
                <h3 className="text-[10px] font-black text-slate-400 tracking-widest italic uppercase">Custo Médio de Insumos</h3>
              </div>
              <p className="text-2xl font-black text-slate-900 italic">{avgInsumosCostPct}%</p>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
                <div className="bg-amber-500 h-full transition-all" style={{ width: `${avgInsumosCostPct}%` }} />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
          }}
          whileHover={{ y: -4 }}
        >
          <Card className={`p-6 rounded-[2rem] shadow-xl text-white relative overflow-hidden group h-full cursor-pointer select-none ${criticalItemsCount > 0 ? 'bg-rose-600 shadow-rose-200' : 'bg-indigo-600 shadow-indigo-200'}`}>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full group-hover:scale-125 transition-transform duration-300" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4" />
                <h3 className="text-[10px] font-black opacity-70 tracking-widest italic uppercase">Itens com Estoque Crítico</h3>
              </div>
              <p className="text-2xl font-black italic">{criticalItemsCount} itens</p>
              <p className="text-[10px] mt-2 opacity-70 font-black italic">
                {criticalItemsCount > 0 ? 'Exige reabastecimento imediato' : 'Todos os níveis normais'}
              </p>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Dynamic Pricing and Services cost link controller */}
        <Card className="lg:col-span-2 bg-white border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 italic uppercase tracking-tight">Precificação dos Serviços e Protocolos</h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">Selecione ou clique em qualquer linha de procedimento para configurar e vincular insumos gringos, gerando custos reais.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Serviço / Protocolo</th>
                  <th className="text-right py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Custo Insumos</th>
                  <th className="text-right py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Custo Fixo Pró-rata</th>
                  <th className="text-right py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Preço Final</th>
                  <th className="text-center py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Margem Bruta</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => {
                  const suppliesCost = getServiceSuppliesCost(service);
                  const fixedCostProRata = 32; // Standard estimation
                  const marginAmt = service.price - suppliesCost - fixedCostProRata;
                  const marginPct = service.price > 0 ? Math.round((marginAmt / service.price) * 100) : 0;
                  
                  return (
                    <tr 
                      key={service.id} 
                      onClick={() => {
                        setSelectedServiceId(service.id);
                        setIsServiceModalOpen(true);
                      }}
                      className="border-b border-slate-50 hover:bg-slate-50/80 transition-all cursor-pointer group"
                    >
                      <td className="py-4 px-6">
                        <div className="font-black text-slate-900 italic text-sm group-hover:text-indigo-600 transition-colors uppercase">
                          {service.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge className="bg-slate-100 text-slate-500 border-none text-[8px] font-bold uppercase py-0 px-2">
                            {service.category}
                          </Badge>
                          <span className="text-[10px] text-slate-400 font-bold font-mono">
                            {service.itemCosts?.length || 0} insumos vinculados
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-xs font-bold text-slate-600">
                        R$ {suppliesCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-xs text-slate-400">
                        R$ {fixedCostProRata.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-right font-black text-slate-900 italic">
                        R$ {service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <Badge className={cn(
                          "border-none font-black text-[10px] py-1 px-2.5",
                          marginPct > 55 ? "bg-emerald-100 text-emerald-800" :
                          marginPct > 30 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                        )}>
                          {marginPct}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6 bg-white border-slate-200 rounded-[2.5rem] shadow-sm">
            <h3 className="font-black text-slate-900 italic mb-6 uppercase tracking-wider text-[10px] text-zinc-400">Avisos Operacionais de Margem</h3>
            <div className="space-y-4">
              {belowThresholdItems.length > 0 ? (
                belowThresholdItems.map(item => {
                  const minVal = item.minQuantity !== undefined ? item.minQuantity : 5;
                  const affectedCount = getAffectedAppointmentsForItem(item.id).length;
                  return (
                    <div key={item.id} className="p-4 bg-red-50 border-l-4 border-red-500 rounded-2xl">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-xs font-black text-red-900 italic uppercase">Estoque crítico: {item.name}</span>
                      </div>
                      <p className="text-xs text-red-700">
                        O estoque atual está em <span className="font-extrabold">{item.quantity || 0}</span>, abaixo do limite de segurança de <span className="font-bold">{minVal} {item.unit}</span>.
                      </p>
                      <p className="text-[11px] text-rose-600 font-extrabold mt-1 uppercase italic">
                        {affectedCount > 0 
                          ? `⚠️ Impacta ${affectedCount} procedimento(s) cadastrado(s) futuramente!` 
                          : 'Nenhum procedimento futuro afetado até o momento.'
                        }
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-2xl">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black text-emerald-950 italic uppercase">Estoque Saudável</span>
                  </div>
                  <p className="text-xs text-emerald-700">Todos os insumos estão acima dos limites mínimos recomendados. Excelente controle de estoque!</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-8 bg-slate-900 rounded-[2.5rem] shadow-lg relative overflow-hidden border border-slate-800">
            <div className="relative z-10">
              <h3 className="text-xl font-black text-white italic leading-tight mb-4 uppercase">Simulador de Impacto de Margem</h3>
              
              {!isSimulating ? (
                <>
                  <p className="text-slate-400 text-sm mb-6">Estime o faturamento adicional ajustando as margens e reajustes gerais de preços.</p>
                  <Button 
                    onClick={() => setIsSimulating(true)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black italic rounded-2xl h-12 shadow-md shadow-indigo-500/10 uppercase"
                  >
                    Estimar Lucros
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-white italic">
                      <span className="uppercase">Ajuste nos Honorários</span>
                      <span className="text-indigo-400">+{percentage}%</span>
                    </div>
                    <Input 
                      type="range" 
                      min="1" 
                      max="30" 
                      value={percentage}
                      onChange={(e) => setPercentage(parseInt(e.target.value))}
                      className="accent-indigo-500 cursor-pointer h-2 p-0 bg-transparent"
                    />
                  </div>
                  <div className="pt-4 border-t border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-black italic tracking-widest mb-1">Lucro Mensal Adicional Esperado</p>
                    <p className="text-2xl font-black text-green-400 italic">
                      + R$ {(54000 * percentage / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => setIsSimulating(false)}
                    className="w-full border-slate-700 text-slate-400 hover:text-white font-black italic rounded-2xl h-10 mt-2 uppercase"
                  >
                    Voltar
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Suggestions Section */}
      {suggestions.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-indigo-50/30 border border-indigo-100/50 rounded-[2.5rem] shadow-sm space-y-4 mt-8"
        >
          <div className="flex items-center gap-2 text-indigo-800">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="font-black italic uppercase tracking-tight text-xs">
              Insumos sugeridos para {clinicType}
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
                  <div className="flex gap-4 mt-3 text-[11px] font-bold text-slate-500 border-t border-slate-50 pt-2">
                    <span className="flex items-center gap-1 font-sans">Unidade: {suggestion.unit}</span>
                    <span className="flex items-center gap-1 text-green-600 font-mono"><DollarSign className="w-3.5 h-3.5 text-green-500" /> R$ {suggestion.unitCost}</span>
                  </div>
                </div>
                <Button 
                  onClick={() => handleAddSuggestedItem(suggestion)}
                  className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Adicionar ao estoque
                </Button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Stocks and Inventories sections: direct incremental modifier */}
      <Card className="bg-white border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h3 className="font-black text-slate-900 italic uppercase">Estoque Físico de Insumos</h3>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Controle total sobre o seu estoque disponível. Clique em + ou - para reabastecer ou registrar contagens físicas.</p>
          </div>
          <Badge className="bg-indigo-50 text-indigo-600 border-none font-black text-[10px] uppercase py-1 px-3">
            Realtime estoque ativo
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Insumo / Material</th>
                <th className="text-center py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Categoria</th>
                <th className="text-right py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Custo Unitário</th>
                <th className="text-center py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Unidade de Medida</th>
                <th className="text-right py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase pr-12">Disponível em Estoque (Controle)</th>
              </tr>
            </thead>
            <tbody>
              {inventory.length > 0 ? (
                inventory.map((item) => {
                  const minVal = item.minQuantity !== undefined ? item.minQuantity : 5;
                  const isBelowMin = (item.quantity || 0) < minVal;
                  return (
                    <tr 
                      key={item.id} 
                      onClick={() => setEditingInventoryItem(item)}
                      className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      title="Clique para configurar alerta e ver procedimentos afetados"
                    >
                      <td className="py-4 px-6">
                        <div className="font-extrabold text-slate-900 capitalize text-sm group-hover:text-indigo-600 transition-colors">{item.name}</div>
                        {isBelowMin ? (
                          <div className="text-[10px] text-red-500 font-bold mt-0.5 animate-pulse uppercase">
                            ⚠️ Alerta: Estoque abaixo do mínimo recomendável de {minVal} {item.unit === 'pacote' ? 'pacotes' : item.unit}! Clique para configurar.
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                            Limite de segurança mínimo: {minVal} {item.unit === 'pacote' ? 'pacotes' : item.unit}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <Badge className="bg-slate-100 text-slate-500 border-none font-bold text-[9px] uppercase">
                          {item.category}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-right font-mono">
                        <div className="text-xs font-bold text-slate-700 whitespace-nowrap">
                          R$ {item.unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        {item.unit === 'pacote' && item.unitsPerPackage && item.unitsPerPackage > 1 && (
                          <div className="text-[9px] text-slate-400 font-bold whitespace-nowrap mt-0.5">
                            R$ {((item.unitCost || 0) / item.unitsPerPackage).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {item.subUnitName || 'un'}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center text-xs font-bold text-slate-500 italic">
                        {item.unit === 'pacote' && item.unitsPerPackage && item.unitsPerPackage > 1 ? (
                          <span className="capitalize">{item.unit} c/ {item.unitsPerPackage} {item.subUnitName || 'un'}</span>
                        ) : (
                          <span className="capitalize">{item.unit || 'unidade'}</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3 justify-end pr-6">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStock(item.id, (item.quantity || 0) - 1);
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 font-black rounded-xl text-md transition-all active:scale-95"
                            title="Remover 1 unidade"
                          >
                            -
                          </button>
                          <span className={cn(
                            "font-mono text-sm font-black min-w-[50px] text-center px-2 py-1 rounded-lg border transition-colors",
                            isBelowMin ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "bg-indigo-50/50 text-indigo-700 border-indigo-100"
                          )}>
                            {item.quantity || 0}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStock(item.id, (item.quantity || 0) + 1);
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black rounded-xl text-md transition-all active:scale-95"
                            title="Adicionar 1 unidade"
                          >
                            +
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 italic text-sm">
                    Nenhum insumo cadastrado. Clique em Adicionar Custo para começar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Supplies Expenses History */}
      <Card className="bg-white border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="font-black text-slate-900 italic uppercase">Histórico de Gastos com Insumos</h3>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Acompanhe detalhadamente todos os gastos e consumos de suprimentos efetuados durante as consultas e sessões finalizadas na clínica.</p>
          </div>
          <History className="w-5 h-5 text-slate-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Insumo Utilizado</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Quantidade Consumida</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Procedimento Vinculado</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Paciente atendido</th>
                <th className="text-right py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Custo Total</th>
                <th className="text-center py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Data do Consumo</th>
              </tr>
            </thead>
            <tbody>
              {supplyExpenses && supplyExpenses.length > 0 ? (
                supplyExpenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                    <td className="py-4 px-6 font-extrabold text-slate-800 capitalize text-sm">
                      {expense.itemName}
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-slate-600 font-bold">
                      {expense.quantityUsed} unidades
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-600 capitalize text-sm">
                      {expense.serviceName}
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-medium capitalize text-sm">
                      {expense.patientName}
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-xs font-black text-rose-600">
                      R$ {expense.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-center font-mono text-xs text-slate-400 font-bold">
                      {expense.date.split('-').reverse().join('/')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 italic text-sm">
                    Nenhum gasto ou consumo registrado no histórico de insumos até o momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <CostModal open={isModalOpen} onOpenChange={setIsModalOpen} />

      {isServiceModalOpen && (
        <ServiceModal 
          isOpen={isServiceModalOpen} 
          onClose={() => {
            setIsServiceModalOpen(false);
            setSelectedServiceId(null);
          }} 
          serviceId={selectedServiceId}
        />
      )}

      {/* Modal para configurar/editar Insumo e ver Impactos */}
      <Dialog open={editingInventoryItem !== null} onOpenChange={(open) => { if (!open) setEditingInventoryItem(null); }}>
        <DialogContent className="max-w-xl bg-white border-none rounded-[2.5rem] shadow-2xl p-0 overflow-hidden max-h-[95vh] flex flex-col select-none">
          <DialogHeader className="bg-slate-900 p-8 text-white flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-400 shrink-0">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black italic uppercase tracking-tight line-clamp-1">
                  Editar Insumo
                </DialogTitle>
                <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest text-[#a1a1aa] mt-1">
                  {editingInventoryItem?.name}
                </p>
              </div>
            </div>
          </DialogHeader>

          {editingInventoryItem && (
            <div className="flex-1 overflow-y-auto p-8 space-y-5">
              
              {/* Nome e Categoria */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1 space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Nome do Insumo</Label>
                  <Input 
                    type="text"
                    value={editingInventoryItem.name || ''}
                    onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, name: e.target.value })}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold text-xs"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1 space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Categoria</Label>
                  <select 
                    value={editingInventoryItem.category || 'materiais'}
                    onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, category: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-xs"
                  >
                    <option value="materiais">Materiais / Descartáveis</option>
                    <option value="insumos">Insumos Clínicos</option>
                    <option value="Fixo">Fixo</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>
              </div>

              {/* Valores de un / pacote e estoques */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Custo do Item (R$)</Label>
                  <Input 
                    type="number"
                    step="any"
                    value={editingInventoryItem.unitCost || 0}
                    onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, unitCost: parseFloat(e.target.value) || 0 })}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Unidade de Medida</Label>
                  <select 
                    value={editingInventoryItem.unit || 'unidade'}
                    onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, unit: e.target.value as any })}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-xs"
                  >
                    <option value="unidade">Unidade(s)</option>
                    <option value="pacote">Pacote(s)</option>
                    <option value="ml">Mililitro (ml)</option>
                    <option value="g">Grama (g)</option>
                  </select>
                </div>
              </div>

              {/* Estoque atual e Minimo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Estoque Físico Atual</Label>
                  <Input 
                    type="number"
                    step="any"
                    value={editingInventoryItem.quantity || 0}
                    onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, quantity: parseFloat(e.target.value) || 0 })}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Estoque Mínimo de Segurança</Label>
                  <Input 
                    type="number"
                    step="any"
                    value={editingInventoryItem.minQuantity !== undefined ? editingInventoryItem.minQuantity : 5}
                    onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, minQuantity: parseFloat(e.target.value) || 0 })}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold text-xs"
                  />
                </div>
              </div>

              {/* Se for Pacote, mostrar Inteligência de Sub-unidades */}
              {editingInventoryItem.unit === 'pacote' && (
                <div className="p-5 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-4">
                  <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider block">Inteligência de Sub-unidades</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Unidades p/ Pacote</Label>
                      <Input 
                        type="number"
                        value={editingInventoryItem.unitsPerPackage || 100}
                        onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, unitsPerPackage: parseFloat(e.target.value) || 1 })}
                        className="h-10 rounded-xl bg-white border-indigo-200 font-bold text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Nome da Sub-unidade</Label>
                      <Input 
                        type="text"
                        placeholder="Ex: luva, par"
                        value={editingInventoryItem.subUnitName || 'unidade'}
                        onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, subUnitName: e.target.value })}
                        className="h-10 rounded-xl bg-white border-indigo-200 font-bold text-xs"
                      />
                    </div>
                  </div>
                  {editingInventoryItem.unitCost > 0 && (
                    <div className="text-[11px] font-bold text-indigo-700 flex items-baseline gap-1 bg-white p-3.5 rounded-xl border border-indigo-100/50">
                      <span>💡 Custo estimado de cada sub-unidade:</span>
                      <span className="font-extrabold text-xs text-indigo-900 whitespace-nowrap">
                        R$ {((editingInventoryItem.unitCost || 0) / (editingInventoryItem.unitsPerPackage || 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Procedimentos Futuros Afetados */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider pl-1">
                    Procedimentos Cadastrados Impactados
                  </h4>
                  <Badge className="bg-rose-50 border-none font-bold text-[9px] text-rose-600 uppercase py-0.5 px-2">
                    {getAffectedAppointmentsForItem(editingInventoryItem.id).length} Impactados
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Essas consultas e sessões cadastradas utilizam este insumo e demandarão materiais:
                </p>

                <div className="space-y-3.5 max-h-[200px] overflow-y-auto pr-2 mt-2">
                  {getAffectedAppointmentsForItem(editingInventoryItem.id).length > 0 ? (
                    getAffectedAppointmentsForItem(editingInventoryItem.id).map((appt) => {
                      const patient = patients.find(p => p.id === appt.patientId);
                      const service = services.find(s => s.id === appt.serviceId);
                      const neededQty = service?.itemCosts?.find(ic => ic.itemId === editingInventoryItem.id)?.quantity || 1;
                      
                      return (
                        <div key={appt.id} className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl space-y-2 border-l-4 border-l-rose-500">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-extrabold text-slate-800 text-xs uppercase italic">{service?.name || appt.type}</p>
                              <p className="text-[11px] text-slate-600 font-medium capitalize">Paciente: <span className="font-bold">{patient?.name || 'Não identificado'}</span></p>
                            </div>
                            <span className="font-mono text-[10px] font-black text-rose-700 bg-rose-100/50 px-2 py-0.5 rounded uppercase">
                              Consome: {neededQty} {(editingInventoryItem.unit === 'pacote' && editingInventoryItem.subUnitName) ? editingInventoryItem.subUnitName : (editingInventoryItem.unit || 'unidade')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono font-bold">
                            <span>📅 {appt.date.split('-').reverse().join('/')}</span>
                            <span>•</span>
                            <span>⏰ {appt.startTime} - {appt.endTime}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs italic">
                      Nenhum agendamento futuro necessita desse material. Estoque sem riscos de ruptura no curto prazo!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex-shrink-0 flex items-center justify-end gap-3 rounded-b-[2.5rem]">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setEditingInventoryItem(null)} 
              className="rounded-xl font-bold text-xs border-slate-200"
            >
              Cancelar
            </Button>
            <Button 
              type="button"
              onClick={() => {
                if (editingInventoryItem) {
                  updateInventoryItem(editingInventoryItem.id, { 
                    name: editingInventoryItem.name,
                    category: editingInventoryItem.category,
                    unitCost: editingInventoryItem.unitCost,
                    unit: editingInventoryItem.unit,
                    quantity: editingInventoryItem.quantity,
                    minQuantity: editingInventoryItem.minQuantity,
                    unitsPerPackage: editingInventoryItem.unit === 'pacote' ? editingInventoryItem.unitsPerPackage : undefined,
                    subUnitName: editingInventoryItem.unit === 'pacote' ? editingInventoryItem.subUnitName : undefined,
                  });
                  setEditingInventoryItem(null);
                  toast.success(`Insumo "${editingInventoryItem.name}" atualizado com sucesso!`);
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black italic px-6 h-10 shadow-xl shadow-indigo-100 text-xs uppercase"
            >
              Salvar Insumo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
