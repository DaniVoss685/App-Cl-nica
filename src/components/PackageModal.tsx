import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
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
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Package, Hash, DollarSign, Clock, List, Tag, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { cn } from '../lib/utils';

interface PackageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageId?: string | null;
}

export function PackageModal({ open, onOpenChange, packageId }: PackageModalProps) {
  const { services, packages, addPackage, updatePackage, professionals } = useStore();
  
  const getInitialData = () => {
    if (packageId) {
      const pkg = packages.find(p => p.id === packageId);
      if (pkg) {
        return {
          name: pkg.name || '',
          description: pkg.description || '',
          price: pkg.price || 0,
          totalSessions: pkg.totalSessions,
          sessionInterval: pkg.sessionInterval,
          includedServices: pkg.includedServices || [],
          active: pkg.active !== undefined ? pkg.active : true,
          maxDiscountPercentage: pkg.maxDiscountPercentage !== undefined ? pkg.maxDiscountPercentage : '' as unknown as number,
          maxInstallments: pkg.maxInstallments !== undefined ? pkg.maxInstallments : '' as unknown as number,
          professionalIds: pkg.professionalIds || [],
          requiresUpfrontPayment: pkg.requiresUpfrontPayment ?? false,
          upfrontPaymentType: (pkg.upfrontPaymentType ?? 'porcentagem') as 'porcentagem' | 'valor',
          upfrontPaymentValue: pkg.upfrontPaymentValue ?? 0
        };
      }
    }
    return {
      name: '',
      description: '',
      price: 0,
      totalSessions: '' as unknown as number,
      sessionInterval: '' as unknown as number,
      includedServices: [] as string[],
      active: true,
      maxDiscountPercentage: '' as unknown as number,
      maxInstallments: '' as unknown as number,
      professionalIds: [] as string[],
      requiresUpfrontPayment: false,
      upfrontPaymentType: 'porcentagem' as 'porcentagem' | 'valor',
      upfrontPaymentValue: 0
    };
  };

  const [formData, setFormData] = useState(getInitialData());
  const [displayPrice, setDisplayPrice] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMode, setSuccessMode] = useState<'create' | 'update'>('create');
  const [savedName, setSavedName] = useState('');

  useEffect(() => {
    if (open) {
      const data = getInitialData();
      setFormData(data);
      if (data.price > 0) {
        setDisplayPrice(new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
         }).format(data.price));
      } else {
        setDisplayPrice('');
      }
    }
  }, [open, packageId]);

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

  const toggleService = (serviceId: string) => {
    const current = [...formData.includedServices];
    const index = current.indexOf(serviceId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(serviceId);
    }
    setFormData({ ...formData, includedServices: current });
  };

  const handleClose = () => {
    setShowSuccess(false);
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    // Capitalize first letter of package title
    const nameWithCapital = formData.name.trim().charAt(0).toUpperCase() + formData.name.trim().slice(1);
    
    // Clamp discount percentage to maximum of 10%
    const discountVal = isNaN(formData.maxDiscountPercentage) || formData.maxDiscountPercentage === ('' as unknown as number) ? 0 : formData.maxDiscountPercentage;
    const clampedDiscount = Math.min(10, Math.max(0, discountVal));

    const finalData = {
      ...formData,
      name: nameWithCapital,
      maxDiscountPercentage: clampedDiscount,
      totalSessions: isNaN(formData.totalSessions) || formData.totalSessions === ('' as unknown as number) ? 1 : formData.totalSessions,
      sessionInterval: isNaN(formData.sessionInterval) || formData.sessionInterval === ('' as unknown as number) ? 0 : formData.sessionInterval,
      maxInstallments: isNaN(formData.maxInstallments) || formData.maxInstallments === ('' as unknown as number) ? 1 : formData.maxInstallments
    };

    if (packageId) {
      updatePackage(packageId, finalData);
      setSuccessMode('update');
    } else {
      addPackage(finalData);
      setSuccessMode('create');
    }
    setFormData(finalData);
    setSavedName(nameWithCapital);
    setShowSuccess(true);
  };

  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
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
                Gestão de Planos & Pacotes
              </Badge>
              <h2 className="text-4xl font-black italic tracking-tight uppercase">
                {successMode === 'create' ? 'Plano Criado!' : 'Plano Atualizado!'}
              </h2>
              <p className="text-slate-400 text-sm font-medium">O novo plano/pacote de procedimentos já está cadastrado e pronto para simulação e vendas no atendimento.</p>
            </div>

            {/* Package Info Cards */}
            <div className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 text-left">
              <div className="border-b border-white/5 pb-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block italic">Nome do Plano ou Pacote</span>
                <span className="text-lg font-bold text-white uppercase">{savedName}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block italic">Valor Total</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    {formData.price > 0 ? `R$ ${formData.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não definido'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block italic font-extrabold text-amber-500">Desconto Limite</span>
                  <span className="text-sm font-bold text-amber-400">{formData.maxDiscountPercentage || 10}% Max (R$ {((formData.price * (formData.maxDiscountPercentage || 10)) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block italic">Nº de Sessões</span>
                  <span className="text-sm font-bold text-slate-200">{formData.totalSessions} sessões</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block italic">Parcelamento Máx.</span>
                  <span className="text-sm font-bold text-slate-200">{formData.maxInstallments}x de R$ {((formData.price - (formData.price * (formData.maxDiscountPercentage || 10)) / 100) / (formData.maxInstallments || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleClose}
              className="w-full max-w-sm h-14 bg-white hover:bg-slate-200 text-slate-950 rounded-2xl text-sm font-black uppercase italic tracking-wider shadow-2xl transition-all duration-150"
            >
              Continuar para Listagem
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-none sm:max-w-none md:max-w-none lg:max-w-none xl:max-w-none w-screen h-screen m-0 rounded-none p-0 gap-0 bg-white border-none flex flex-col top-0 left-0 translate-x-0 translate-y-0 duration-100 overflow-hidden">
        <DialogHeader className="bg-indigo-600 p-8 text-white flex-shrink-0">
          <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black italic uppercase">
                  {packageId ? 'Editar Detalhes do Plano ou Pacote' : 'Novo Plano ou Pacote Multidisciplinar'}
                </DialogTitle>
                <p className="text-indigo-100 text-xs font-bold tracking-widest mt-1">
                  Combine procedimentos, monte pacotes atrativos, limite descontos e configure parcelamentos sem juros.
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/10 font-black italic rounded-xl px-6 h-14 text-sm uppercase tracking-wider shrink-0 transition-transform hover:scale-105 active:scale-95 border border-white/20"
            >
              Fechar X
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden w-full max-w-7xl mx-auto">
          <div className="flex-1 overflow-y-auto p-10 space-y-8">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-400 italic uppercase">Nome do pacote</Label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    value={formData.name}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val.length > 0) {
                        val = val.charAt(0).toUpperCase() + val.slice(1);
                      }
                      setFormData({...formData, name: val});
                    }}
                    placeholder=""
                    className="pl-11 h-12 border-slate-200 bg-slate-50/50 font-bold text-base text-slate-800 rounded-xl"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-400 italic uppercase">Descrição Detalhada</Label>
                <Textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder=""
                  className="min-h-[100px] border-slate-200 bg-slate-50/50 resize-none font-medium text-slate-700 rounded-xl p-4 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-400 italic uppercase">Valor total (R$)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 font-black" />
                  <Input 
                    value={displayPrice}
                    onChange={handlePriceChange}
                    placeholder=""
                    className="pl-11 h-12 border-slate-200 bg-slate-50/50 font-mono font-bold text-base text-slate-800 rounded-xl"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-400 italic uppercase">Nº de sessões inclusas</Label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-505" />
                  <Input 
                    type="number"
                    value={formData.totalSessions === 0 || isNaN(formData.totalSessions) ? '' : formData.totalSessions}
                    onChange={(e) => setFormData({...formData, totalSessions: e.target.value ? parseInt(e.target.value) : '' as unknown as number})}
                    className="pl-11 h-12 border-slate-200 bg-slate-50/50 font-bold rounded-xl"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-400 italic uppercase">Intervalo médio (dias)</Label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    type="number"
                    value={formData.sessionInterval === 0 || isNaN(formData.sessionInterval) ? '' : formData.sessionInterval}
                    onChange={(e) => setFormData({...formData, sessionInterval: e.target.value ? parseInt(e.target.value) : '' as unknown as number})}
                    className="pl-11 h-12 border-slate-200 bg-slate-50/50 font-bold rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-2">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-black text-slate-400 italic uppercase">Desconto Máximo Autorizado (%)</Label>
                  <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">Limite de 10%</span>
                </div>
                <div className="relative">
                  <Input 
                    type="number"
                    min="0"
                    max="10"
                    placeholder=""
                    value={formData.maxDiscountPercentage === 0 || isNaN(formData.maxDiscountPercentage) ? '' : formData.maxDiscountPercentage}
                    onChange={(e) => {
                      if (e.target.value === '') {
                        setFormData({...formData, maxDiscountPercentage: '' as unknown as number});
                        return;
                      }
                      let val = parseInt(e.target.value);
                      if (isNaN(val)) val = 0;
                      if (val > 10) val = 10;
                      setFormData({...formData, maxDiscountPercentage: val});
                    }}
                    className="h-12 border-slate-200 bg-slate-50/50 font-bold rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-400 italic uppercase">Máximo de parcelas permitidas no cartão</Label>
                <select 
                  className="w-full h-12 px-4 border border-slate-205 bg-slate-50/50 rounded-xl font-bold text-sm text-slate-800 shadow-xs cursor-pointer"
                  value={formData.maxInstallments === undefined || isNaN(formData.maxInstallments) ? '' : formData.maxInstallments}
                  onChange={(e) => setFormData({...formData, maxInstallments: e.target.value ? parseInt(e.target.value) : '' as unknown as number})}
                  required
                >
                  <option value="" disabled selected={formData.maxInstallments === undefined || isNaN(formData.maxInstallments)}>Selecione...</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                    <option key={num} value={num}>{num}x sem juros no cartão de crédito</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Pricing Math Simulator */}
            {formData.price > 0 && (() => {
              const discountPct = isNaN(formData.maxDiscountPercentage) || formData.maxDiscountPercentage === ('' as unknown as number) ? 0 : formData.maxDiscountPercentage;
              const installments = isNaN(formData.maxInstallments) || formData.maxInstallments === ('' as unknown as number) || formData.maxInstallments === 0 ? 1 : formData.maxInstallments;
              const discountAmount = (formData.price * discountPct) / 100;
              const minPrice = formData.price - discountAmount;
              const installmentValue = minPrice / installments;
              
              return (
                <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3.5 text-xs shadow-xs transition-all animate-fadeIn">
                  <h4 className="font-black text-indigo-900 italic uppercase text-[10px] tracking-wider mb-2">Simulação Comercial de Venda</h4>
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Preço do Plano à Vista:</span>
                    <span className="font-mono text-sm">R$ {formData.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold text-amber-600 bg-amber-50/40 p-2 rounded-lg border border-amber-100/40">
                    <span>Desconto Limite Configurado ({discountPct}%):</span>
                    <span className="font-mono">- R$ {discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-black text-indigo-950 border-t border-indigo-100 pt-3 text-sm italic">
                    <span>Preço Mínimo Especial Permitido:</span>
                    <span className="font-mono text-base">R$ {minPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600 border-t border-dashed border-indigo-100/70 pt-3 mt-1">
                    <span>Simulação de Parcelas Sem Juros:</span>
                    <span className="font-mono bg-white border border-slate-100 rounded px-2.5 py-1 text-slate-700 font-extrabold text-[11px]">
                      Até {installments}x de R$ {installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* PAGAMENTO ANTECIPADO BLOCK */}
            <div className="bg-slate-50 rounded-[2rem] border border-slate-100 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-black text-slate-900 italic uppercase flex items-center gap-1.5 animate-pulse">
                    <Sparkles className="w-4.5 h-4.5 text-indigo-600" />
                    Pagamento Antecipado (Sinal / Caução) do Pacote
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Exigir um sinal ou percentual depositado antecipadamente ao fechar a compra deste pacote.
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
                          formData.upfrontPaymentType === 'porcentagem' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-650 text-slate-600 hover:bg-slate-55 hover:bg-slate-50"
                        )}
                      >
                        % Porcentagem
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, upfrontPaymentType: 'valor' }))}
                        className={cn(
                          "flex-1 py-1.5 font-bold text-xs uppercase italic rounded-lg transition-all cursor-pointer",
                          formData.upfrontPaymentType === 'valor' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-655 text-slate-600 hover:bg-slate-55 hover:bg-slate-50"
                        )}
                      >
                        R$ Valor Fixo
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-slate-400 italic uppercase">
                      {formData.upfrontPaymentType === 'porcentagem' ? 'Porcentagem do Pacote (%)' : 'Sinal de Adiantamento Fixo (R$)'}
                    </Label>
                    <div className="relative">
                      {formData.upfrontPaymentType === 'porcentagem' ? (
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
                      ) : (
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 font-bold" />
                      )}
                      <Input
                        type="number"
                        placeholder=""
                        className="h-11 bg-white border-slate-200 rounded-xl pl-10 font-bold text-sm text-slate-800"
                        value={formData.upfrontPaymentValue || ''}
                        onChange={e => setFormData({ ...formData, upfrontPaymentValue: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Grid 2-columns for select services and select professionals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-8">
              {/* Included Services list */}
              <div className="space-y-3">
                <Label className="text-xs font-black text-slate-500 italic uppercase flex items-center gap-2">
                  <List className="w-4 h-4 text-indigo-500 font-extrabold" />
                  Serviços incluídos neste pacote
                </Label>
                <p className="text-slate-450 text-[11px] text-slate-400">Selecione quais serviços ou procedimentos da clínica fazem parte deste pacote especial.</p>
                <div className="space-y-2 bg-slate-50 p-5 rounded-2xl border border-slate-100 max-h-[190px] overflow-y-auto">
                  {services.map(s => (
                    <label key={s.id} className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-100 transition-all select-none bg-white/40">
                      <Checkbox 
                        checked={formData.includedServices.includes(s.id)}
                        onCheckedChange={() => toggleService(s.id)}
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors uppercase">
                          {s.name}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize font-medium">{s.category} - {s.durationMinutes} min</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Linked Professionals list */}
              <div className="space-y-3">
                <Label className="text-xs font-black text-slate-500 italic uppercase flex items-center gap-2">
                  🩺 Profissionais de saúde autorizados
                </Label>
                <p className="text-slate-450 text-[11px] text-slate-400">Limite este pacote para profissionais específicos. Deixe desmarcado para ficar habilitado para toda a equipe.</p>
                <div className="space-y-2 bg-slate-50 p-5 rounded-2xl border border-slate-100 max-h-[190px] overflow-y-auto">
                  {professionals.filter(p => p.tipoMembro !== 'gestao').map(p => {
                    const isChecked = (formData.professionalIds || []).includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-100 transition-all select-none bg-white/40">
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
            </div>
          </div>

          <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 shrink-0 flex items-center justify-between rounded-none">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="active" 
                checked={formData.active}
                onCheckedChange={(v: boolean) => setFormData({...formData, active: v})}
              />
              <label htmlFor="active" className="text-xs font-black text-slate-500 cursor-pointer italic uppercase select-none tracking-wider">Pacote ativo para venda</label>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold text-xs text-slate-400 px-6">
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-black italic px-8 h-12 rounded-xl shadow-xl shadow-indigo-100 uppercase text-xs tracking-wider">
                {packageId ? 'Salvar Detalhes' : 'Criar Plano ou Pacote'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
