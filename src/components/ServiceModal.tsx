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
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Sparkles, 
  Clock, 
  DollarSign, 
  Zap, 
  ShieldCheck,
  Save,
  Lock,
  Unlock
} from 'lucide-react';
import { useStore } from '../store';
import { cn } from '../lib/utils';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId?: string | null;
}

export function ServiceModal({ isOpen, onClose, serviceId }: ServiceModalProps) {
  const { services, addService, updateService, serviceCategories, inventory, professionals } = useStore();
  const [formData, setFormData] = useState<{
    name: string;
    category: string;
    durationMinutes: number;
    price: number;
    generatesFollowUp: boolean;
    followUpDays: number;
    itemCosts: { itemId: string; quantity: number }[];
    professionalIds?: string[];
    requiresUpfrontPayment: boolean;
    upfrontPaymentType: 'porcentagem' | 'valor';
    upfrontPaymentValue: number;
  }>({
    name: '',
    category: 'Estética',
    durationMinutes: 60,
    price: 0,
    generatesFollowUp: false,
    followUpDays: 15,
    itemCosts: [],
    professionalIds: [],
    requiresUpfrontPayment: false,
    upfrontPaymentType: 'porcentagem',
    upfrontPaymentValue: 0
  });

  const [selectedItemId, setSelectedItemId] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [displayPrice, setDisplayPrice] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMode, setSuccessMode] = useState<'create' | 'update'>('create');
  const [savedName, setSavedName] = useState('');

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setFormData(prev => ({ ...prev, price: 0 }));
      setDisplayPrice('');
      return;
    }
    const numericValue = parseInt(rawValue || '0') / 100;
    setFormData(prev => ({ ...prev, price: numericValue }));
    
    setDisplayPrice(new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue));
  };

  const handleAddItemCost = () => {
    if (!selectedItemId) return;
    const qty = parseFloat(itemQty);
    if (isNaN(qty) || qty <= 0) return;

    setFormData(prev => {
      const existing = prev.itemCosts || [];
      const filtered = existing.filter(ic => ic.itemId !== selectedItemId);
      return {
        ...prev,
        itemCosts: [...filtered, { itemId: selectedItemId, quantity: qty }]
      };
    });
    setSelectedItemId('');
    setItemQty('');
  };

  const handleRemoveItemCost = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      itemCosts: (prev.itemCosts || []).filter(ic => ic.itemId !== itemId)
    }));
  };

  React.useEffect(() => {
    if (isOpen) {
      if (serviceId) {
        const service = services.find(s => s.id === serviceId);
        if (service) {
          setFormData({
            name: service.name,
            category: service.category,
            durationMinutes: service.durationMinutes,
            price: service.price,
            generatesFollowUp: service.generatesFollowUp,
            followUpDays: service.followUpDays || 15,
            itemCosts: service.itemCosts || [],
            professionalIds: service.professionalIds || [],
            requiresUpfrontPayment: service.requiresUpfrontPayment ?? false,
            upfrontPaymentType: service.upfrontPaymentType ?? 'porcentagem',
            upfrontPaymentValue: service.upfrontPaymentValue ?? 0
          });
          if (service.price > 0) {
            setDisplayPrice(new Intl.NumberFormat('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(service.price));
          } else {
            setDisplayPrice('');
          }
        }
      } else {
        setFormData({
          name: '',
          category: 'Estética',
          durationMinutes: 60,
          price: 0,
          generatesFollowUp: false,
          followUpDays: 15,
          itemCosts: [],
          professionalIds: [],
          requiresUpfrontPayment: false,
          upfrontPaymentType: 'porcentagem',
          upfrontPaymentValue: 0
        });
        setDisplayPrice('');
      }
    }
  }, [serviceId, services, isOpen]);

  const handleClose = () => {
    setShowSuccess(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    // Capitalize first letter of service title
    const nameWithCapital = formData.name.trim().charAt(0).toUpperCase() + formData.name.trim().slice(1);
    const submissionData = {
      ...formData,
      name: nameWithCapital
    };

    if (serviceId) {
      updateService(serviceId, submissionData);
      setSuccessMode('update');
    } else {
      addService(submissionData);
      setSuccessMode('create');
    }
    setSavedName(nameWithCapital);
    setShowSuccess(true);
  };

  if (showSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent showCloseButton={false} className="max-w-none sm:max-w-none md:max-w-none lg:max-w-none xl:max-w-none w-screen h-screen m-0 rounded-none p-0 gap-0 bg-slate-950 text-white border-none flex flex-col top-0 left-0 translate-x-0 translate-y-0 duration-150 justify-center items-center overflow-y-auto">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/40 via-slate-950 to-slate-950 pointer-events-none" />
          <div className="relative z-10 max-w-xl w-full px-6 py-12 text-center space-y-8 flex flex-col items-center">
            {/* Animated Glow Success Icon */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl animate-pulse scale-125" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-400 to-indigo-600 flex items-center justify-center shadow-2xl">
                <ShieldCheck className="w-12 h-12 text-white" />
              </div>
            </div>

            <div className="space-y-3">
              <Badge className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 font-black tracking-widest text-[10px] uppercase py-1 px-3">
                Sucesso Garantido
              </Badge>
              <h2 className="text-4xl font-black italic tracking-tight uppercase">
                {successMode === 'create' ? 'Protocolo Cadastrado!' : 'Protocolo Atualizado!'}
              </h2>
              <p className="text-slate-400 text-sm font-medium">O novo protocolo de atendimento já está integrado e sincronizado com os profissionais e a agenda da clínica.</p>
            </div>

            {/* Service Info Deck */}
            <div className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 text-left">
              <div className="border-b border-white/5 pb-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block italic">Nome do Protocolo</span>
                <span className="text-lg font-bold text-white uppercase">{savedName}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block italic">Categoria</span>
                  <span className="text-sm font-bold text-slate-200 capitalize">{formData.category}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block italic">Preço de Venda</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    {formData.price > 0 ? `R$ ${formData.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não definido'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block italic">Duração Estimada</span>
                  <span className="text-sm font-bold text-slate-200">{formData.durationMinutes} minutos</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block italic">Insumos Vinculados</span>
                  <span className="text-sm font-bold text-slate-200">{formData.itemCosts?.length || 0} material(is)</span>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleClose}
              className="w-full max-w-sm h-14 bg-white hover:bg-slate-200 text-slate-950 rounded-2xl text-sm font-black uppercase italic tracking-wider shadow-2xl transition-all duration-150"
            >
              Continuar para Prontuários & Agenda
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="max-w-none sm:max-w-none md:max-w-none lg:max-w-none xl:max-w-none w-screen h-screen m-0 rounded-none p-0 gap-0 bg-white border-none flex flex-col top-0 left-0 translate-x-0 translate-y-0 duration-100 overflow-hidden">
        <DialogHeader className="bg-indigo-600 p-8 text-white flex-shrink-0">
          <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black italic uppercase">
                  {serviceId ? 'Editar Protocolo de Atendimento' : 'Novo Serviço Cadastrado'}
                </DialogTitle>
                <p className="text-indigo-100 text-xs font-bold tracking-widest mt-1">
                  {serviceId ? 'Ajuste os parâmetros deste serviço de saúde' : 'Defina os dados de execução, valores e insumos vinculados'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-white hover:bg-white/10 font-black italic rounded-xl px-6 h-14 text-sm uppercase tracking-wider shrink-0 transition-transform hover:scale-105 active:scale-95 border border-white/20"
            >
              Fechar X
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden w-full max-w-7xl mx-auto">
          <div className="flex-1 overflow-y-auto p-10 space-y-8">
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-400 italic uppercase">Nome do serviço / procedimento</Label>
              <Input 
                required
                placeholder="Ex: Preenchimento Labial"
                className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold italic text-base px-4"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-400 italic uppercase">Categoria</Label>
                <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold px-4">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[600]">
                    {serviceCategories.map(cat => (
                      <SelectItem key={cat} value={cat} className="font-bold">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-400 italic whitespace-nowrap uppercase">Duração estimada (min)</Label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    type="number"
                    className="h-12 bg-slate-50 border-slate-100 rounded-xl pl-11 font-bold"
                    value={formData.durationMinutes}
                    onChange={e => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-400 italic uppercase">Preço de venda (R$)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 font-extrabold" />
                  <Input 
                    type="text"
                    placeholder="Deixe em branco ou preencha o valor..."
                    className="h-12 bg-slate-50 border-slate-100 rounded-xl pl-11 font-mono font-bold text-base text-slate-800"
                    value={displayPrice}
                    onChange={handlePriceChange}
                  />
                </div>
              </div>

              {/* LOCKABLE RETURN FIELD */}
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-400 italic uppercase flex items-center gap-1.5">
                  Dias para retorno
                </Label>
                <div className="flex items-center gap-2.5 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ 
                      ...prev, 
                      generatesFollowUp: !prev.generatesFollowUp,
                      followUpDays: !prev.generatesFollowUp ? 15 : 0 
                    }))}
                    className={cn(
                      "h-10 px-4 rounded-lg font-bold text-[10px] uppercase flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border select-none",
                      formData.generatesFollowUp 
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600" 
                        : "bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
                    )}
                  >
                    {formData.generatesFollowUp ? (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Gerar Retorno On</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Gerar Retorno Off</span>
                      </>
                    )}
                  </button>

                  <div className="relative flex-1">
                    <Input 
                      type="number"
                      disabled={!formData.generatesFollowUp}
                      placeholder="Bloqueado..."
                      className={cn(
                        "h-10 bg-white rounded-lg font-bold text-xs px-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all border-slate-200",
                        !formData.generatesFollowUp && "bg-slate-100/60 border-slate-100 text-slate-400 cursor-not-allowed select-none"
                      )}
                      value={formData.generatesFollowUp ? formData.followUpDays : ''}
                      onChange={e => setFormData({ ...formData, followUpDays: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase italic tracking-wider pl-1">
                  {formData.generatesFollowUp 
                    ? "🔓 Preencha a antecedência em dias para retorno automático pós-procedimento." 
                    : "🔒 Ative clicando no botão ao lado para desbloquear as datas de retorno."}
                </p>
              </div>
            </div>

            {/* PAGAMENTO ANTECIPADO BLOCK */}
            <div className="bg-slate-50 rounded-[2rem] border border-slate-100 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-black text-slate-900 italic uppercase flex items-center gap-1.5">
                    <Sparkles className="w-4.5 h-4.5 text-indigo-550 text-indigo-600 animate-pulse" />
                    Pagamento Antecipado (Sinal / Caução)
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Exigir um sinal ou porcentagem de garantia paga antecipadamente no ato do agendamento deste serviço.
                  </p>
                </div>
                
                <div className="flex bg-white rounded-xl border border-slate-200/80 p-1 shadow-sm shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, requiresUpfrontPayment: true }))}
                    className={cn(
                      "px-4 py-1.5 font-bold text-[10px] uppercase italic rounded-lg transition-all cursor-pointer",
                      formData.requiresUpfrontPayment ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    Ativo
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, requiresUpfrontPayment: false }))}
                    className={cn(
                      "px-4 py-1.5 font-bold text-[10px] uppercase italic rounded-lg transition-all cursor-pointer",
                      !formData.requiresUpfrontPayment ? "bg-slate-200 text-slate-700 font-black" : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    Inativo
                  </button>
                </div>
              </div>

              {formData.requiresUpfrontPayment && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200/50">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 italic uppercase">Formato do Sinal</Label>
                    <div className="flex bg-white rounded-xl border border-slate-200/80 p-1 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, upfrontPaymentType: 'porcentagem' }))}
                        className={cn(
                          "flex-1 py-1.5 font-bold text-xs uppercase italic rounded-lg transition-all cursor-pointer",
                          formData.upfrontPaymentType === 'porcentagem' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-650 text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        % Porcentagem
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, upfrontPaymentType: 'valor' }))}
                        className={cn(
                          "flex-1 py-1.5 font-bold text-xs uppercase italic rounded-lg transition-all cursor-pointer",
                          formData.upfrontPaymentType === 'valor' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-650 text-slate-650 text-slate-600 hover:bg-slate-55 hover:bg-slate-50"
                        )}
                      >
                        R$ Valor Fixo
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-slate-400 italic uppercase">
                      {formData.upfrontPaymentType === 'porcentagem' ? 'Porcentagem mútua (%)' : 'Valor Inteiro Antecipado (R$)'}
                    </Label>
                    <div className="relative">
                      {formData.upfrontPaymentType === 'porcentagem' ? (
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
                      ) : (
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 font-bold" />
                      )}
                      <Input
                        type="number"
                        placeholder={formData.upfrontPaymentType === 'porcentagem' ? "Ex: 50" : "Ex: 150"}
                        className="h-11 bg-white border-slate-200 rounded-xl pl-10 font-bold text-sm text-slate-800"
                        value={formData.upfrontPaymentValue || ''}
                        onChange={e => setFormData({ ...formData, upfrontPaymentValue: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section: Linked Professionals */}
            <div className="space-y-3 border-t border-slate-100 pt-8">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-black text-slate-900 italic uppercase">Profissionais Vinculados</h4>
                <Badge className="bg-indigo-50 text-indigo-600 border-none font-bold text-[10px] uppercase">
                  {(formData.professionalIds || []).length === 0 ? 'Disponível p/ todos' : `${formData.professionalIds.length} vinculados`}
                </Badge>
              </div>
              <p className="text-slate-500 text-xs">Vincule os profissionais de saúde habilitados a realizar este serviço. Se nenhum for selecionado, o serviço estará disponível para toda a equipe.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-slate-50 p-5 rounded-2xl border border-slate-100 max-h-[200px] overflow-y-auto">
                {professionals.map(p => {
                  const isChecked = (formData.professionalIds || []).includes(p.id);
                  return (
                    <label key={p.id} className="flex items-center gap-2.5 cursor-pointer group p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-100 transition-all select-none bg-white/40">
                      <input 
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        checked={isChecked}
                        onChange={() => {
                          const current = formData.professionalIds || [];
                          const updated = current.includes(p.id) 
                            ? current.filter(id => id !== p.id) 
                            : [...current, p.id];
                          setFormData({ ...formData, professionalIds: updated });
                        }}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors uppercase truncate">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase italic truncate">
                          {p.specialty}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Section: Linked Supplies */}
            <div className="space-y-4 border-t border-slate-100 pt-8">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-black text-slate-900 italic uppercase">Insumos e Custos Vinculados</h4>
                <Badge className="bg-slate-100 text-slate-500 border-none font-bold text-[10px] uppercase">
                  {formData.itemCosts?.length || 0} vinculados
                </Badge>
              </div>
              <p className="text-slate-505 text-xs text-slate-500">Vincule materiais e insumos de estoque que são consumidos automaticamente quando este protocolo é realizado.</p>
              
              {/* Spacious, Grid based Insumo Add form using Floating Portal Select to prevent cutting off */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="md:col-span-7 space-y-1.5 min-w-0">
                  <Label className="text-[11px] font-black text-slate-500 italic uppercase">Insumo / Material de Estoque</Label>
                  <Select value={selectedItemId} onValueChange={(val) => setSelectedItemId(val)}>
                    <SelectTrigger className="w-full h-12 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-700 shadow-sm px-4 focus:ring-2 focus:ring-indigo-500 text-left">
                      <SelectValue placeholder="Selecione um insumo da lista..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {inventory.map(item => {
                        const isPack = item.unit === 'pacote' && item.unitsPerPackage && item.unitsPerPackage > 1;
                        const unitLabel = isPack ? `${item.unit} de ${item.unitsPerPackage} ${item.subUnitName || 'un'}` : item.unit;
                        const subCost = isPack ? (item.unitCost / item.unitsPerPackage) : item.unitCost;
                        return (
                          <SelectItem key={item.id} value={item.id} className="font-bold text-xs py-2.5 cursor-pointer hover:bg-indigo-550/15 transition-all text-slate-800">
                            {item.name} ({unitLabel}) - R$ {subCost.toFixed(2)} / {isPack ? (item.subUnitName || 'un') : (item.unit || 'un')}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3 space-y-1.5">
                  <Label className="text-[11px] font-black text-slate-500 italic uppercase">Quantidade Consumida</Label>
                  <Input 
                    type="number" 
                    step="any"
                    className="h-12 bg-white border-slate-200 rounded-xl text-sm font-bold shadow-sm"
                    placeholder="Ex: 2"
                    value={itemQty}
                    onChange={e => setItemQty(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2 flex items-end">
                  <Button 
                    type="button" 
                    onClick={handleAddItemCost}
                    className="w-full h-12 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs italic font-black uppercase whitespace-nowrap shadow-md"
                  >
                    Vincular Insumo
                  </Button>
                </div>
              </div>

              {formData.itemCosts && formData.itemCosts.length > 0 ? (
                <div className="space-y-3 mt-4 max-h-[220px] overflow-y-auto pr-2">
                  {formData.itemCosts.map((ic, idx) => {
                    const invItem = inventory.find(i => i.id === ic.itemId);
                    const isPack = invItem?.unit === 'pacote' && invItem?.unitsPerPackage && invItem.unitsPerPackage > 1;
                    const consumedUnit = isPack ? (invItem?.subUnitName || 'un') : (invItem?.unit || 'un');
                    const subCost = isPack ? ((invItem?.unitCost || 0) / (invItem?.unitsPerPackage || 1)) : (invItem?.unitCost || 0);
                    const totalCost = subCost * ic.quantity;

                    return (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl gap-2 hover:bg-slate-100/50 transition-colors">
                        <div>
                          <div className="font-extrabold text-slate-800 capitalize text-sm">
                            {invItem ? invItem.name : 'Insumo Desconhecido'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase italic">
                            O procedimento consome {ic.quantity} {consumedUnit}(s) do estoque
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-5">
                          <span className="font-mono text-slate-600 font-extrabold text-xs whitespace-nowrap bg-white px-3 py-1.5 rounded-lg shadow-xs">
                            {ic.quantity} {consumedUnit} x R$ {subCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <button 
                            type="button"
                            onClick={() => handleRemoveItemCost(ic.itemId)}
                            className="text-red-500 hover:text-red-700 font-black text-xs uppercase tracking-tight italic"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-150 text-slate-400 text-xs italic">
                  Nenhum insumo ou custo de estoque vinculado a este procedimento ainda.
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 flex-shrink-0 flex items-center justify-end gap-3 rounded-none">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl font-bold text-xs text-slate-400 px-6">
              Cancelar
            </Button>
            <Button type="submit" className="bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-black italic px-8 h-12 shadow-xl shadow-indigo-100 uppercase tracking-wider text-xs flex items-center gap-2">
              <Save className="w-4 h-4" />
              <span>Salvar Serviço</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
