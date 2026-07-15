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
  Sparkles,
  Trash2,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  CalendarDays
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  inventoryConsumptionStockDelta,
  inventoryConsumptionUnitCost,
  inventoryConsumptionUnitLabel,
  inventoryStockValue,
  suggestedServicePrice
} from '../lib/costing';
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

interface InventoryCategorySelectorProps {
  value: string;
  categories: string[];
  onChange: (value: string) => void;
  onCreate: (value: string) => void;
  onDelete: (value: string) => void;
  compact?: boolean;
}

function InventoryCategorySelector({ value, categories, onChange, onCreate, onDelete, compact = false }: InventoryCategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasTyped, setHasTyped] = useState(false);
  const search = hasTyped ? value.trim().toLowerCase() : '';
  const filteredCategories = categories
    .filter(category => category.toLowerCase().includes(search))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const canCreate = value.trim() && !categories.some(category => category.toLowerCase() === value.trim().toLowerCase());

  return (
    <div className="relative">
      <div className="flex gap-2">
        <Input
          value={value}
          onFocus={() => {
            setIsOpen(true);
            setHasTyped(false);
          }}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
            setHasTyped(true);
          }}
          placeholder="Pesquisar categoria..."
          className={cn(
            "rounded-xl bg-slate-50 border-slate-200 font-bold",
            compact ? "h-11 text-xs" : "h-12"
          )}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (!value.trim()) return;
            onCreate(value.trim());
            setIsOpen(false);
          }}
          className={cn("rounded-xl px-3 border-slate-200", compact ? "h-11" : "h-12")}
          title="Criar categoria"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {isOpen && (
        <div className="absolute z-[90] mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
          <div className="max-h-56 overflow-y-auto py-2">
            {filteredCategories.length > 0 ? filteredCategories.map(category => (
              <div key={category} className="flex items-center hover:bg-indigo-50">
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(category);
                    setIsOpen(false);
                    setHasTyped(false);
                  }}
                  className="min-w-0 flex-1 px-4 py-3 text-left text-xs font-black text-slate-700 hover:text-indigo-700 transition-colors"
                >
                  {category}
                </button>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onDelete(category)}
                  className="mr-2 h-8 w-8 rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                  title="Excluir categoria"
                >
                  <Trash2 className="mx-auto h-3.5 w-3.5" />
                </button>
              </div>
            )) : (
              <div className="px-4 py-3 text-xs font-bold text-slate-400">
                Nenhuma categoria encontrada.
              </div>
            )}

            {canCreate && (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onCreate(value.trim());
                  onChange(value.trim());
                  setIsOpen(false);
                  setHasTyped(false);
                }}
                className="w-full border-t border-slate-100 px-4 py-3 text-left text-xs font-black text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                Criar "{value.trim()}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface PremiumDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function PremiumDatePicker({ value, onChange, placeholder = 'Selecionar data' }: PremiumDatePickerProps) {
  const selectedDate = value ? new Date(`${value}T12:00:00`) : null;
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate || new Date());
  const [isOpen, setIsOpen] = useState(false);

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const monthStart = new Date(year, month, 1);
  const startWeekday = monthStart.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1)
  ];
  const formatted = selectedDate
    ? selectedDate.toLocaleDateString('pt-BR')
    : placeholder;

  const setMonth = (direction: number) => {
    setVisibleMonth(new Date(year, month + direction, 1));
  };

  const selectDay = (day: number) => {
    const nextDate = new Date(year, month, day, 12);
    onChange(nextDate.toISOString().slice(0, 10));
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (selectedDate) setVisibleMonth(selectedDate);
          setIsOpen((current) => !current);
        }}
        className={cn(
          "h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-left text-xs font-black text-slate-900 shadow-sm transition-all hover:border-indigo-200 hover:bg-white",
          !selectedDate && "text-slate-400"
        )}
      >
        <span>{formatted}</span>
        <CalendarDays className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/20 p-4"
          onMouseDown={() => setIsOpen(false)}
        >
          <div
            className="w-[320px] max-w-[calc(100vw-2rem)] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button type="button" onClick={() => setMonth(-1)} className="h-9 w-9 rounded-xl bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700">
                <ChevronLeft className="mx-auto h-4 w-4" />
              </button>
              <div className="text-center">
                <p className="text-sm font-black italic text-slate-950">
                  {visibleMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button type="button" onClick={() => setMonth(1)} className="h-9 w-9 rounded-xl bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700">
                <ChevronRight className="mx-auto h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1 text-center">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((weekday, index) => (
                <div key={`${weekday}-${index}`} className="py-1 text-[10px] font-black text-slate-400">
                  {weekday}
                </div>
              ))}
              {calendarDays.map((day, index) => {
                const isSelected = Boolean(day && selectedDate && selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === day);
                return day ? (
                  <button
                    key={day}
                    type="button"
                    onClick={() => selectDay(day)}
                    className={cn(
                      "h-9 rounded-xl text-xs font-black transition-all",
                      isSelected
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                        : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                    )}
                  >
                    {day}
                  </button>
                ) : (
                  <div key={`empty-${index}`} className="h-9" />
                );
              })}
            </div>

            <div className="mt-4 flex justify-between border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className="text-[10px] font-black uppercase text-slate-400 hover:text-rose-500"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  onChange(today.toISOString().slice(0, 10));
                  setVisibleMonth(today);
                  setIsOpen(false);
                }}
                className="text-[10px] font-black uppercase text-indigo-600"
              >
                Hoje
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Custos() {
  const { 
    services, 
    inventory, 
    updateInventoryItem, 
    supplyExpenses,
    appointments,
    patients,
    clinicType,
    addInventoryItem,
    addInventoryPurchase,
    removeInventoryItem,
    updateService,
    finance,
    inventoryPurchases,
    inventoryCategories,
    addInventoryCategory,
    removeInventoryCategory
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
  const [activeCostTab, setActiveCostTab] = useState<'pricing' | 'simulator'>('pricing');
  const [simulatorForm, setSimulatorForm] = useState({
    itemId: '',
    availableQuantity: '10',
    usagePerService: '1',
    weeklyServices: '5',
    supplierIncreasePercent: '10',
    purchaseBudget: '1000'
  });

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
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    itemId: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    supplier: '',
    batchNumber: '',
    invoiceNumber: '',
    expirationDate: '',
    quantity: '1',
    totalCost: ''
  });

  const sortedInventoryCategories = React.useMemo(() => Array.from(new Set([
    'EPI',
    'Fixo',
    'Insumos',
    'Marketing',
    'Materiais',
    'Medicamentos',
    ...(inventoryCategories || []),
    ...inventory.map(item => item.category).filter(Boolean)
  ])).sort((a, b) => a.localeCompare(b, 'pt-BR')), [inventoryCategories, inventory]);

  const selectedPurchaseItem = inventory.find(item => item.id === purchaseForm.itemId);

  const formatCurrencyInput = (rawValue: string) => {
    const cleanValue = rawValue.replace(/\D/g, '');
    const numberValue = parseInt(cleanValue || '0') / 100;
    if (isNaN(numberValue)) return '';
    return numberValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handlePurchaseValueChange = (value: string) => {
    setPurchaseForm({ ...purchaseForm, totalCost: value.replace(/\D/g, '') });
  };

  const handleSubmitPurchase = () => {
    const item = selectedPurchaseItem;
    const quantity = parseFloat(purchaseForm.quantity) || 0;
    const totalCost = (parseInt(purchaseForm.totalCost || '0') || 0) / 100;
    if (!item || quantity <= 0 || totalCost <= 0) {
      toast.error('Selecione o insumo, quantidade e valor da compra.');
      return;
    }

    addInventoryPurchase({
      itemId: item.id,
      itemName: item.name,
      purchaseDate: purchaseForm.purchaseDate,
      supplier: purchaseForm.supplier.trim() || undefined,
      batchNumber: purchaseForm.batchNumber.trim() || undefined,
      invoiceNumber: purchaseForm.invoiceNumber.trim() || undefined,
      expirationDate: purchaseForm.expirationDate || undefined,
      quantity,
      totalCost
    });

    setIsPurchaseModalOpen(false);
    setPurchaseForm({
      itemId: '',
      purchaseDate: new Date().toISOString().slice(0, 10),
      supplier: '',
      batchNumber: '',
      invoiceNumber: '',
      expirationDate: '',
      quantity: '1',
      totalCost: ''
    });
    toast.success(`Compra de "${item.name}" registrada.`);
  };

  // Helper: calculate supplies cost for any service dynamically
  const getServiceSuppliesCost = (service: any) => {
    if (!service.itemCosts || service.itemCosts.length === 0) return 0;
    return service.itemCosts.reduce((total: number, ic: any) => {
      const invItem = inventory.find((item: any) => item.id === ic.itemId);
      const unitCost = inventoryConsumptionUnitCost(invItem);
      return total + (unitCost * ic.quantity);
    }, 0);
  };

  const todayKey = new Date().toISOString().slice(0, 10);
  const currentMonthKey = todayKey.slice(0, 7);
  const isInCurrentMonth = (date?: string) => Boolean(date && date.slice(0, 7) === currentMonthKey);

  const completedAppointmentsThisMonth = appointments.filter(appt => (
    isInCurrentMonth(appt.date) &&
    (appt.status === 'realizado' || appt.status === 'finalizado')
  )).length;

  const currentMonthRevenue = finance
    .filter(tx => tx.type === 'receita' && tx.status === 'pago' && isInCurrentMonth(tx.paymentDate || tx.dueDate))
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const currentMonthExpenses = finance
    .filter(tx => tx.type === 'despesa' && tx.status === 'pago' && isInCurrentMonth(tx.paymentDate || tx.dueDate))
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const fixedCostPerService = currentMonthExpenses > 0
    ? currentMonthExpenses / Math.max(1, completedAppointmentsThisMonth || services.length || 1)
    : 32;

  const getServiceTargetMargin = (service: any) => Number(service.targetMarginPercent || 60);

  const getServiceSuggestedPrice = (service: any) => {
    const suppliesCost = getServiceSuppliesCost(service);
    return suggestedServicePrice(suppliesCost + fixedCostPerService, getServiceTargetMargin(service));
  };

  const getFutureDemandForItem = (item: any) => {
    return (appointments || []).reduce((total, appt) => {
      if (!appt.serviceId || appt.date < todayKey) return total;
      if (!['agendado', 'confirmado', 'chegou'].includes(appt.status)) return total;
      const service = services.find(s => s.id === appt.serviceId);
      const itemsUsed = Array.isArray(appt.customItemCostsUsed) ? appt.customItemCostsUsed : (service?.itemCosts || []);
      const usedItem = itemsUsed.find(ic => ic.itemId === item.id);
      if (!usedItem) return total;
      return total + inventoryConsumptionStockDelta(item, usedItem.quantity);
    }, 0);
  };

  // Inline Stock Quantity modification
  const handleUpdateStock = (itemId: string, newQty: number) => {
    updateInventoryItem(itemId, { quantity: Math.max(0, newQty) });
  };

  // Calculate high-level clinic metrics based on actual state store values
  const totalInsumosCost = inventory.reduce((total, item) => total + inventoryStockValue(item), 0);
  const belowThresholdItems = inventory.filter(item => {
    const minVal = item.minQuantity !== undefined ? item.minQuantity : 5;
    const futureDemand = getFutureDemandForItem(item);
    const projectedQty = (item.quantity || 0) - futureDemand;
    return (item.quantity || 0) < minVal || projectedQty < minVal;
  });
  const criticalItemsCount = belowThresholdItems.length;

  const estimatedMargin = React.useMemo(() => {
    if (!services || services.length === 0) return 0;
    const totalMarginPct = services.reduce((total, s) => {
      const suppliesCost = getServiceSuppliesCost(s);
      const fixedCostProRata = fixedCostPerService;
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

  const monthlyRevenueBase = currentMonthRevenue || services.reduce((sum, service) => sum + Number(service.price || 0), 0);
  const parseSimulatorNumber = (value: string, fallback = 0) => {
    const parsed = parseFloat(String(value || '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const simulatorItem = inventory.find(item => item.id === simulatorForm.itemId) || inventory[0];
  const simulatorUnitCost = simulatorItem ? inventoryConsumptionUnitCost(simulatorItem) : 0;
  const simulatorUnitLabel = simulatorItem ? inventoryConsumptionUnitLabel(simulatorItem) : 'unidade';
  const simulatedAvailableQuantity = parseSimulatorNumber(
    simulatorForm.availableQuantity,
    simulatorItem ? Number(simulatorItem.quantity || 0) : 0
  );
  const simulatedUsagePerService = Math.max(0.0001, parseSimulatorNumber(simulatorForm.usagePerService, 1));
  const simulatedWeeklyServices = Math.max(0, parseSimulatorNumber(simulatorForm.weeklyServices, 0));
  const simulatedSupplierIncrease = Math.max(0, parseSimulatorNumber(simulatorForm.supplierIncreasePercent, 0));
  const simulatedPurchaseBudget = Math.max(0, parseSimulatorNumber(simulatorForm.purchaseBudget, 0));
  const simulatedServicesCovered = Math.floor(simulatedAvailableQuantity / simulatedUsagePerService);
  const simulatedWeeksCovered = simulatedWeeklyServices > 0 ? simulatedServicesCovered / simulatedWeeklyServices : 0;
  const increasedUnitCost = simulatorUnitCost * (1 + simulatedSupplierIncrease / 100);
  const currentCostPerService = simulatorUnitCost * simulatedUsagePerService;
  const increasedCostPerService = increasedUnitCost * simulatedUsagePerService;
  const extraCostPerService = increasedCostPerService - currentCostPerService;
  const unitsBuyableAfterIncrease = increasedUnitCost > 0 ? simulatedPurchaseBudget / increasedUnitCost : 0;
  const budgetServicesCovered = Math.floor(unitsBuyableAfterIncrease / simulatedUsagePerService);

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
            onClick={() => setIsPurchaseModalOpen(true)}
            variant="outline"
            className="h-11 px-6 rounded-xl border-slate-200 shadow-sm font-bold italic"
          >
            <Package className="w-4 h-4 mr-2" />
            Registrar Compra
          </Button>
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
              <p className="text-[10px] text-slate-400 font-semibold mt-2 leading-snug">
                Soma do estoque atual multiplicado pelo custo médio de cada item.
              </p>
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
              <p className="text-[10px] text-slate-400 font-semibold mt-2 leading-snug">
                Média das margens dos serviços: preço menos insumos e custo fixo pró-rata.
              </p>
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
              <p className="text-[10px] text-slate-400 font-semibold mt-2 leading-snug">
                Percentual médio do preço dos serviços consumido por materiais vinculados.
              </p>
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

      <div className="flex w-full flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveCostTab('pricing')}
          className={cn(
            "h-11 flex-1 rounded-xl px-5 text-xs font-black uppercase tracking-wider transition-all md:flex-none",
            activeCostTab === 'pricing'
              ? "bg-slate-950 text-white shadow-lg"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          Precificação
        </button>
        <button
          type="button"
          onClick={() => setActiveCostTab('simulator')}
          className={cn(
            "h-11 flex-1 rounded-xl px-5 text-xs font-black uppercase tracking-wider transition-all md:flex-none",
            activeCostTab === 'simulator'
              ? "bg-slate-950 text-white shadow-lg"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          Simulador de custos
        </button>
      </div>

      {activeCostTab === 'pricing' ? (
        <div className="space-y-6">
          <Card className="bg-white border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-black text-slate-900 italic uppercase tracking-tight">Avisos de estoque e margem</h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">Alertas ficam aqui para liberar largura para a tabela de precificação.</p>
              </div>
              <Badge className={cn(
                "border-none font-black text-[10px] uppercase py-1.5 px-3",
                belowThresholdItems.length > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
              )}>
                {belowThresholdItems.length > 0 ? `${belowThresholdItems.length} alerta(s)` : 'Tudo em dia'}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-5 bg-slate-50/60">
              {belowThresholdItems.length > 0 ? (
                belowThresholdItems.slice(0, 3).map(item => {
                  const minVal = item.minQuantity !== undefined ? item.minQuantity : 5;
                  const futureDemand = getFutureDemandForItem(item);
                  const projectedQty = (item.quantity || 0) - futureDemand;
                  const affectedCount = getAffectedAppointmentsForItem(item.id).length;
                  return (
                    <div key={item.id} className="rounded-2xl border border-rose-100 bg-white p-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-600" />
                        <p className="text-[11px] font-black uppercase text-rose-800 line-clamp-1">{item.name}</p>
                      </div>
                      <p className="mt-2 text-xs font-bold text-slate-600">
                        Estoque atual: <span className="font-black text-slate-950">{item.quantity || 0}</span> / mínimo {minVal}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-500">
                        Saldo projetado: {projectedQty.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}. Impacta {affectedCount} procedimento(s) futuro(s).
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="md:col-span-3 rounded-2xl border border-emerald-100 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <p className="text-xs font-black uppercase text-emerald-800">Estoque saudável</p>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Todos os insumos estão acima dos limites mínimos e sem impacto projetado na agenda.</p>
                </div>
              )}
            </div>
          </Card>
        {/* Dynamic Pricing and Services cost link controller */}
        <Card className="bg-white border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 italic uppercase tracking-tight">Precificação dos Serviços e Protocolos</h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">Selecione ou clique em qualquer linha de procedimento para configurar e vincular insumos gringos, gerando custos reais.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-5 bg-slate-50/70 border-b border-slate-100">
            <div className="flex gap-3 rounded-2xl bg-white border border-slate-100 p-4">
              <HelpCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-slate-900 uppercase">Custo fixo pró-rata</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  É uma estimativa de despesas fixas por atendimento. Usa as despesas pagas do mês divididas pelos atendimentos concluídos; se não houver dados suficientes, usa R$ 32 como base temporária.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl bg-white border border-slate-100 p-4">
              <Target className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-slate-900 uppercase">Meta</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  É percentual de margem desejada, não valor em reais. Exemplo: meta 60% significa tentar deixar 60% do preço como margem após custos.
                </p>
              </div>
            </div>
          </div>
          <div className="overflow-hidden">
            <table className="w-full table-fixed text-left">
              <colgroup>
                <col className="w-[25%]" />
                <col className="w-[12%]" />
                <col className="w-[13%]" />
                <col className="w-[10%]" />
                <col className="w-[20%]" />
                <col className="w-[12%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="py-4 px-4 text-[10px] font-black text-slate-400 italic uppercase">Serviço / Protocolo</th>
                  <th className="text-right py-4 px-4 text-[10px] font-black text-slate-400 italic uppercase">Custo Insumos</th>
                  <th className="text-right py-4 px-4 text-[10px] font-black text-slate-400 italic uppercase">Custo Fixo Pró-rata</th>
                  <th className="text-center py-4 px-4 text-[10px] font-black text-slate-400 italic uppercase">Meta</th>
                  <th className="text-right py-4 px-4 text-[10px] font-black text-slate-400 italic uppercase">Preço Sugerido</th>
                  <th className="text-right py-4 px-4 text-[10px] font-black text-slate-400 italic uppercase">Preço Final</th>
                  <th className="text-center py-4 px-4 text-[10px] font-black text-slate-400 italic uppercase">Margem</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => {
                  const suppliesCost = getServiceSuppliesCost(service);
                  const fixedCostProRata = fixedCostPerService;
                  const marginAmt = service.price - suppliesCost - fixedCostProRata;
                  const marginPct = service.price > 0 ? Math.round((marginAmt / service.price) * 100) : 0;
                  const targetMargin = getServiceTargetMargin(service);
                  const suggestedPrice = getServiceSuggestedPrice(service);
                  const priceGap = suggestedPrice - Number(service.price || 0);
                  
                  return (
                    <tr 
                      key={service.id} 
                      onClick={() => {
                        setSelectedServiceId(service.id);
                        setIsServiceModalOpen(true);
                      }}
                      className="border-b border-slate-50 hover:bg-slate-50/80 transition-all cursor-pointer group"
                    >
                      <td className="py-4 px-4">
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
                      <td className="py-4 px-4 text-right font-mono text-xs font-bold text-slate-600">
                        R$ {suppliesCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-xs text-slate-400">
                        R$ {fixedCostProRata.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="relative mx-auto w-20">
                          <Input
                            type="number"
                            min="1"
                            max="95"
                            value={targetMargin}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => {
                              event.stopPropagation();
                              updateService(service.id, { targetMarginPercent: parseFloat(event.target.value) || 60 });
                            }}
                            className="h-9 w-20 rounded-xl bg-slate-50 border-slate-200 pr-6 text-center font-black text-xs"
                          />
                          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">%</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="font-black text-slate-900 italic whitespace-nowrap">
                          R$ {suggestedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 mt-0.5 leading-tight">
                          ({suppliesCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} insumos + {fixedCostProRata.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} fixo) / {Math.max(1, 100 - targetMargin)}%
                        </div>
                        <div className={cn(
                          "text-[10px] font-bold mt-0.5 whitespace-nowrap",
                          priceGap > 1 ? "text-rose-500" : "text-emerald-600"
                        )}>
                          {priceGap > 1
                            ? `falta R$ ${priceGap.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            : 'preço ok'}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-black text-slate-900 italic whitespace-nowrap">
                        R$&nbsp;{service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-4 text-center">
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

        <div className="hidden">
          <Card className="p-6 bg-white border-slate-200 rounded-[2.5rem] shadow-sm">
            <h3 className="font-black text-slate-900 italic mb-6 uppercase tracking-wider text-[10px] text-zinc-400">Avisos Operacionais de Margem</h3>
            <div className="space-y-4">
              {belowThresholdItems.length > 0 ? (
                belowThresholdItems.map(item => {
                  const minVal = item.minQuantity !== undefined ? item.minQuantity : 5;
                  const affectedCount = getAffectedAppointmentsForItem(item.id).length;
                  const futureDemand = getFutureDemandForItem(item);
                  const projectedQty = (item.quantity || 0) - futureDemand;
                  const unitLabel = inventoryConsumptionUnitLabel(item);
                  return (
                    <div key={item.id} className="p-4 bg-red-50 border-l-4 border-red-500 rounded-2xl">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-xs font-black text-red-900 italic uppercase">Estoque crítico: {item.name}</span>
                      </div>
                      <p className="text-xs text-red-700">
                        O estoque atual está em <span className="font-extrabold">{item.quantity || 0}</span>, abaixo do limite de segurança de <span className="font-bold">{minVal} {item.unit}</span>.
                      </p>
                      {futureDemand > 0 && (
                        <p className="text-xs text-red-700 mt-1">
                          Agenda futura consome <span className="font-extrabold">{futureDemand.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</span> em estoque. Saldo projetado: <span className="font-extrabold">{projectedQty.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</span> {item.unit === 'pacote' ? 'pacotes' : unitLabel}.
                        </p>
                      )}
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
                      + R$ {(monthlyRevenueBase * percentage / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">
                      Base: R$ {monthlyRevenueBase.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
      ) : (
        <Card className="bg-white border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-black text-slate-900 italic uppercase tracking-tight">Simulador de custos e compras</h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">Projete duracao do estoque, impacto de aumento do fornecedor e reajuste de honorarios.</p>
            </div>
            <Badge className="bg-indigo-50 text-indigo-700 border-none font-black text-[10px] uppercase py-1.5 px-3">
              Cenario editavel
            </Badge>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6 p-6">
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50/70 p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Produto / insumo</Label>
                <select
                  value={simulatorItem?.id || ''}
                  onChange={(event) => {
                    const nextItem = inventory.find(item => item.id === event.target.value);
                    setSimulatorForm({
                      ...simulatorForm,
                      itemId: event.target.value,
                      availableQuantity: String(nextItem?.quantity || 0)
                    });
                  }}
                  className="w-full h-11 px-3 rounded-xl bg-white border border-slate-200 font-bold text-xs"
                >
                  {inventory.length === 0 && <option value="">Nenhum insumo cadastrado</option>}
                  {[...inventory].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estoque disponivel</Label>
                  <Input
                    type="number"
                    step="any"
                    value={simulatorForm.availableQuantity}
                    onChange={(event) => setSimulatorForm({ ...simulatorForm, availableQuantity: event.target.value })}
                    className="h-11 rounded-xl bg-white border-slate-200 font-bold text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Uso por atendimento</Label>
                  <Input
                    type="number"
                    step="any"
                    value={simulatorForm.usagePerService}
                    onChange={(event) => setSimulatorForm({ ...simulatorForm, usagePerService: event.target.value })}
                    className="h-11 rounded-xl bg-white border-slate-200 font-bold text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Atendimentos por semana</Label>
                  <Input
                    type="number"
                    step="any"
                    value={simulatorForm.weeklyServices}
                    onChange={(event) => setSimulatorForm({ ...simulatorForm, weeklyServices: event.target.value })}
                    className="h-11 rounded-xl bg-white border-slate-200 font-bold text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aumento fornecedor</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="any"
                      value={simulatorForm.supplierIncreasePercent}
                      onChange={(event) => setSimulatorForm({ ...simulatorForm, supplierIncreasePercent: event.target.value })}
                      className="h-11 rounded-xl bg-white border-slate-200 pr-8 font-bold text-xs"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">%</span>
                  </div>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Orcamento para compra</Label>
                  <Input
                    type="number"
                    step="any"
                    value={simulatorForm.purchaseBudget}
                    onChange={(event) => setSimulatorForm({ ...simulatorForm, purchaseBudget: event.target.value })}
                    className="h-11 rounded-xl bg-white border-slate-200 font-bold text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-[2rem] bg-slate-950 p-5 text-white md:col-span-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Duracao estimada do estoque</p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-2xl font-black italic">{simulatedServicesCovered}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">atendimentos cobertos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black italic">{simulatedWeeksCovered.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">semanas estimadas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black italic">{simulatorUnitLabel}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">unidade de consumo</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Custo atual por atendimento</p>
                <p className="mt-2 text-2xl font-black italic text-slate-950">
                  R$ {currentCostPerService.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Base unitaria: R$ {simulatorUnitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </p>
              </div>

              <div className="rounded-[2rem] border border-rose-100 bg-rose-50 p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Apos aumento do fornecedor</p>
                <p className="mt-2 text-2xl font-black italic text-rose-950">
                  R$ {increasedCostPerService.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </p>
                <p className="mt-1 text-xs font-semibold text-rose-600">
                  Impacto extra: R$ {extraCostPerService.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} por atendimento
                </p>
              </div>

              <div className="rounded-[2rem] border border-indigo-100 bg-indigo-50 p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Compra com orcamento</p>
                <p className="mt-2 text-2xl font-black italic text-indigo-950">
                  {unitsBuyableAfterIncrease.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} {simulatorUnitLabel}
                </p>
                <p className="mt-1 text-xs font-semibold text-indigo-700">
                  Cobre cerca de {budgetServicesCovered} atendimento(s) no cenario simulado.
                </p>
              </div>

              <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
                <div className="flex justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Reajuste de honorarios</p>
                  <span className="text-xs font-black text-emerald-700">+{percentage}%</span>
                </div>
                <Input
                  type="range"
                  min="1"
                  max="30"
                  value={percentage}
                  onChange={(event) => setPercentage(parseInt(event.target.value))}
                  className="mt-3 h-2 cursor-pointer bg-transparent p-0 accent-emerald-500"
                />
                <p className="mt-3 text-xl font-black italic text-emerald-950">
                  + R$ {(monthlyRevenueBase * percentage / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs font-semibold text-emerald-700">Potencial mensal sobre a base atual.</p>
              </div>
            </div>
          </div>
        </Card>
      )}

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
                  const futureDemand = getFutureDemandForItem(item);
                  const projectedQty = (item.quantity || 0) - futureDemand;
                  const isBelowMin = (item.quantity || 0) < minVal || projectedQty < minVal;
                  const consumptionUnitCost = inventoryConsumptionUnitCost(item);
                  const consumptionLabel = inventoryConsumptionUnitLabel(item);
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
                        {futureDemand > 0 && (
                          <div className="text-[10px] text-amber-600 font-bold mt-0.5 uppercase">
                            Agenda futura: -{futureDemand.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} em estoque
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge className="bg-slate-100 text-slate-500 border-none font-bold text-[9px] uppercase">
                          {item.category}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-right font-mono">
                        <div className="text-xs font-bold text-slate-700 whitespace-nowrap">
                          R$ {item.unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[9px] text-slate-400 font-bold whitespace-nowrap mt-0.5">
                          R$ {consumptionUnitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} / {consumptionLabel}
                        </div>
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

      <Card className="bg-white border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center flex-wrap gap-3">
          <div>
            <h3 className="font-black text-slate-900 italic uppercase">Histórico de Compras de Estoque</h3>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Registra quando comprou, de quem comprou, lote, nota e quanto pagou em cada entrada.</p>
          </div>
          <Button
            onClick={() => setIsPurchaseModalOpen(true)}
            className="bg-slate-950 hover:bg-slate-800 text-white rounded-xl h-10 px-5 font-black text-xs uppercase italic"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Compra
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Data</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Insumo</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Fornecedor</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Lote / Nota</th>
                <th className="text-right py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Qtd.</th>
                <th className="text-right py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Valor Pago</th>
                <th className="text-right py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Custo Unit.</th>
              </tr>
            </thead>
            <tbody>
              {inventoryPurchases && inventoryPurchases.length > 0 ? (
                inventoryPurchases.map((purchase) => (
                  <tr key={purchase.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs text-slate-500 font-bold">
                      {purchase.purchaseDate?.split('-').reverse().join('/')}
                    </td>
                    <td className="py-4 px-6 font-extrabold text-slate-800 capitalize text-sm">
                      {purchase.itemName}
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-medium text-sm">
                      {purchase.supplier || '-'}
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500 font-bold">
                      <div>{purchase.batchNumber || '-'}</div>
                      <div className="text-[10px] text-slate-400">Nota: {purchase.invoiceNumber || '-'}</div>
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-xs font-bold text-slate-600">
                      {purchase.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-xs font-black text-slate-900">
                      R$ {purchase.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-xs font-bold text-emerald-600">
                      R$ {purchase.unitCostAtPurchase.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 italic text-sm">
                    Nenhuma compra registrada ainda. A próxima entrada de estoque aparecerá aqui.
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
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">MovimentaÃ§Ã£o</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Procedimento Vinculado</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Paciente atendido</th>
                <th className="text-right py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Custo Total</th>
                <th className="text-center py-4 px-6 text-[10px] font-black text-slate-400 italic uppercase">Data do Consumo</th>
              </tr>
            </thead>
            <tbody>
              {supplyExpenses && supplyExpenses.length > 0 ? (
                supplyExpenses.map((expense) => {
                  const movement = expense.movementType || 'consumo';
                  const movementClass = movement === 'estorno'
                    ? 'bg-amber-100 text-amber-700'
                    : movement === 'manual'
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-emerald-100 text-emerald-700';
                  return (
                  <tr key={expense.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-extrabold text-slate-800 capitalize text-sm">{expense.itemName}</div>
                      <Badge className={cn('border-none text-[9px] font-black uppercase mt-1', movementClass)}>
                        {movement}
                      </Badge>
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
                  );
                })
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

      <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
        <DialogContent className="max-w-2xl bg-white border-none rounded-[2rem] shadow-2xl p-0 overflow-hidden max-h-[92vh] flex flex-col">
          <DialogHeader className="bg-slate-950 p-6 text-white shrink-0">
            <DialogTitle className="text-xl font-black italic uppercase">
              Registrar Entrada de Compra
            </DialogTitle>
            <p className="text-slate-400 text-xs font-bold mt-1">
              Atualiza o estoque e preserva o preço pago nesta compra.
            </p>
          </DialogHeader>

          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Insumo</Label>
                <select
                  value={purchaseForm.itemId}
                  onChange={(event) => setPurchaseForm({ ...purchaseForm, itemId: event.target.value })}
                  className="w-full h-12 px-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-xs"
                >
                  <option value="">Selecione um insumo</option>
                  {[...inventory].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data da compra</Label>
                <PremiumDatePicker
                  value={purchaseForm.purchaseDate}
                  onChange={(purchaseDate) => setPurchaseForm({ ...purchaseForm, purchaseDate })}
                  placeholder="Selecionar data da compra"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fornecedor</Label>
                <Input
                  value={purchaseForm.supplier}
                  onChange={(event) => setPurchaseForm({ ...purchaseForm, supplier: event.target.value })}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quantidade comprada</Label>
                <Input
                  type="number"
                  step="any"
                  value={purchaseForm.quantity}
                  onChange={(event) => setPurchaseForm({ ...purchaseForm, quantity: event.target.value })}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor total pago</Label>
                <Input
                  value={formatCurrencyInput(purchaseForm.totalCost)}
                  onChange={(event) => handlePurchaseValueChange(event.target.value)}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-black text-sm"
                  placeholder="R$ 0,00"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lote</Label>
                <Input
                  value={purchaseForm.batchNumber}
                  onChange={(event) => setPurchaseForm({ ...purchaseForm, batchNumber: event.target.value })}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Número da nota</Label>
                <Input
                  value={purchaseForm.invoiceNumber}
                  onChange={(event) => setPurchaseForm({ ...purchaseForm, invoiceNumber: event.target.value })}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Validade</Label>
                <PremiumDatePicker
                  value={purchaseForm.expirationDate}
                  onChange={(expirationDate) => setPurchaseForm({ ...purchaseForm, expirationDate })}
                  placeholder="Selecionar validade"
                />
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Custo unitário desta compra</p>
                <p className="text-xl font-black italic text-emerald-950">
                  R$ {(((parseInt(purchaseForm.totalCost || '0') || 0) / 100) / Math.max(1, parseFloat(purchaseForm.quantity) || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <Button variant="outline" onClick={() => setIsPurchaseModalOpen(false)} className="rounded-xl font-bold text-xs border-slate-200">
              Cancelar
            </Button>
            <Button onClick={handleSubmitPurchase} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black italic px-6 h-10 shadow-xl shadow-indigo-100 text-xs uppercase">
              Registrar Compra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  <InventoryCategorySelector
                    value={editingInventoryItem.category || ''}
                    categories={sortedInventoryCategories}
                    onChange={(category) => setEditingInventoryItem({ ...editingInventoryItem, category })}
                    onCreate={addInventoryCategory}
                    onDelete={removeInventoryCategory}
                    compact
                  />
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
                    <option value="peso">Medida/Peso</option>
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

              {editingInventoryItem.unit === 'peso' && (
                <div className="p-5 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-4">
                  <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider block">InteligÃªncia de Medida</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Medida Total</Label>
                      <Input
                        type="number"
                        step="any"
                        value={editingInventoryItem.totalMeasure || 1}
                        onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, totalMeasure: parseFloat(e.target.value) || 1 })}
                        className="h-10 rounded-xl bg-white border-indigo-200 font-bold text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Unidade de Consumo</Label>
                      <Input
                        type="text"
                        placeholder="Ex: g, ml, dose"
                        value={editingInventoryItem.consumptionUnit || ''}
                        onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, consumptionUnit: e.target.value })}
                        className="h-10 rounded-xl bg-white border-indigo-200 font-bold text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 p-5 bg-slate-50/70 border border-slate-100 rounded-2xl">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fornecedor</Label>
                  <Input
                    value={editingInventoryItem.supplier || ''}
                    onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, supplier: e.target.value })}
                    className="h-10 rounded-xl bg-white border-slate-200 font-bold text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lote</Label>
                  <Input
                    value={editingInventoryItem.batchNumber || ''}
                    onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, batchNumber: e.target.value })}
                    className="h-10 rounded-xl bg-white border-slate-200 font-bold text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Validade</Label>
                  <Input
                    type="date"
                    value={editingInventoryItem.expirationDate || ''}
                    onChange={(e) => setEditingInventoryItem({ ...editingInventoryItem, expirationDate: e.target.value })}
                    className="h-10 rounded-xl bg-white border-slate-200 font-bold text-xs"
                  />
                </div>
              </div>

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

          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex-shrink-0 flex items-center justify-between gap-3 rounded-b-[2.5rem]">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!editingInventoryItem) return;
                const affected = getAffectedAppointmentsForItem(editingInventoryItem.id).length;
                const ok = window.confirm(`Excluir "${editingInventoryItem.name}"? ${affected > 0 ? `Ele impacta ${affected} agendamento(s) futuro(s).` : 'Nenhum agendamento futuro sera impactado.'}`);
                if (!ok) return;
                removeInventoryItem(editingInventoryItem.id);
                setEditingInventoryItem(null);
                toast.success(`Insumo "${editingInventoryItem.name}" excluido.`);
              }}
              className="rounded-xl font-bold text-xs border-rose-200 text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
            <div className="flex items-center justify-end gap-3">
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
                  addInventoryCategory(editingInventoryItem.category || '');
                  updateInventoryItem(editingInventoryItem.id, { 
                    name: editingInventoryItem.name,
                    category: editingInventoryItem.category,
                    unitCost: editingInventoryItem.unitCost,
                    unit: editingInventoryItem.unit,
                    quantity: editingInventoryItem.quantity,
                    minQuantity: editingInventoryItem.minQuantity,
                    unitsPerPackage: editingInventoryItem.unit === 'pacote' ? editingInventoryItem.unitsPerPackage : undefined,
                    subUnitName: editingInventoryItem.unit === 'pacote' ? editingInventoryItem.subUnitName : undefined,
                    totalMeasure: editingInventoryItem.unit === 'peso' ? editingInventoryItem.totalMeasure : undefined,
                    consumptionUnit: editingInventoryItem.consumptionUnit || undefined,
                    supplier: editingInventoryItem.supplier || undefined,
                    batchNumber: editingInventoryItem.batchNumber || undefined,
                    expirationDate: editingInventoryItem.expirationDate || undefined,
                  });
                  setEditingInventoryItem(null);
                  toast.success(`Insumo "${editingInventoryItem.name}" atualizado com sucesso!`);
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black italic px-6 h-10 shadow-xl shadow-indigo-100 text-xs uppercase"
            >
              Salvar Insumo
            </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
