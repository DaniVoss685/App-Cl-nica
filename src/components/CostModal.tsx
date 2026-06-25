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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { useStore } from '../store';
import { Package, Hash, Scale, Target, CheckCircle2, DollarSign } from 'lucide-react';

interface CostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CostModal({ open, onOpenChange }: CostModalProps) {
  const { services, addInventoryItem } = useStore();
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    category: 'Insumos',
    unit: 'unidade' as 'unidade' | 'pacote' | 'peso' | 'ml' | 'g',
    linkedServiceId: 'none',
    unitsPerPackage: '100',
    subUnitName: 'unidade',
    totalMeasure: '1',
    quantity: '10',
  });

  const formatCurrency = (val: string) => {
    const cleanValue = val.replace(/\D/g, '');
    const numberValue = parseInt(cleanValue) / 100;
    if (isNaN(numberValue)) return '';
    return numberValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, value });
  };

  const calculateUnitCost = () => {
    const totalCost = (parseInt(formData.value) || 0) / 100;
    if (formData.unit === 'pacote') {
      const units = parseFloat(formData.unitsPerPackage) || 1;
      return totalCost / units;
    }
    if (formData.unit === 'peso') {
      const measure = parseFloat(formData.totalMeasure) || 1;
      return totalCost / measure;
    }
    return totalCost;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalCost = (parseInt(formData.value) || 0) / 100;
    
    addInventoryItem({
      name: formData.name,
      unitCost: totalCost,
      category: formData.category,
      unit: formData.unit,
      linkedServiceId: formData.linkedServiceId === 'none' ? undefined : formData.linkedServiceId,
      quantity: parseFloat(formData.quantity) || 0,
      minQuantity: formData.unit === 'pacote' ? 2 : 5,
      unitsPerPackage: formData.unit === 'pacote' ? (parseFloat(formData.unitsPerPackage) || 100) : undefined,
      subUnitName: formData.unit === 'pacote' ? formData.subUnitName : undefined
    });

    onOpenChange(false);
    setFormData({
      name: '',
      value: '',
      category: 'Insumos',
      unit: 'unidade',
      linkedServiceId: 'none',
      unitsPerPackage: '100',
      subUnitName: 'unidade',
      totalMeasure: '1',
      quantity: '10',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-none sm:max-w-none md:max-w-none lg:max-w-none xl:max-w-none w-screen h-screen m-0 rounded-none p-0 bg-white border-none flex flex-col top-0 left-0 translate-x-0 translate-y-0 duration-100 overflow-hidden">
        <div className="bg-indigo-600 p-8 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black italic uppercase text-white">
                Novo Lançamento de Custo
              </DialogTitle>
              <p className="text-indigo-100 text-xs font-bold tracking-widest mt-1 uppercase">
                Cadastre insumos, materiais médicos ou custos fixos da clínica estética
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white hover:bg-white/10 font-black italic rounded-xl px-4 h-11 text-xs uppercase tracking-wider shrink-0"
          >
            Fechar X
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-10">
            <div className="max-w-2xl mx-auto space-y-6 bg-slate-50/70 p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Descrição do Custo</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Ácido Hialurônico, Aluguel, Luvas"
                className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Categoria</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 italic font-bold">
                  <SelectItem value="Insumos">Insumos</SelectItem>
                  <SelectItem value="Fixo">Fixo</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="EPI">EPI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Tipo de Medida</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'unidade', icon: Hash },
                  { id: 'pacote', icon: Package },
                  { id: 'peso', icon: Scale },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, unit: type.id as any })}
                    className={`h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                      formData.unit === type.id 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <type.icon className="w-4 h-4" />
                    <span className="text-[8px] font-black uppercase tracking-tighter">{type.id}</span>
                  </button>
                ))}
              </div>
            </div>

            {formData.unit === 'pacote' && (
              <div className="col-span-2 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 italic">Inteligência de Pacote</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600">Unidades p/ pacote</Label>
                    <Input 
                      type="number"
                      value={formData.unitsPerPackage}
                      onChange={(e) => setFormData({ ...formData, unitsPerPackage: e.target.value })}
                      className="h-10 rounded-xl bg-white border-indigo-100 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600">Sub-unidade (Ex: luva, par)</Label>
                    <Input 
                      type="text"
                      placeholder="Ex: luva, par"
                      value={formData.subUnitName}
                      onChange={(e) => setFormData({ ...formData, subUnitName: e.target.value })}
                      className="h-10 rounded-xl bg-white border-indigo-100 font-bold col-span-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.unit === 'peso' && (
              <div className="col-span-2 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 italic">Inteligência de Medida</p>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-600">Peso/Litro Total do Produto (g ou ml)</Label>
                  <Input 
                    type="number"
                    value={formData.totalMeasure}
                    onChange={(e) => setFormData({ ...formData, totalMeasure: e.target.value })}
                    className="h-10 rounded-xl bg-white border-indigo-100 font-bold"
                  />
                </div>
              </div>
            )}

            <div className="col-span-2 space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Estoque Inicial (Quantidade física)</Label>
              <Input 
                type="number"
                value={formData.quantity} 
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="Ex: 10"
                className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                required
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Vincular ao Procedimento (Opcional)</Label>
              <Select value={formData.linkedServiceId} onValueChange={(val) => setFormData({ ...formData, linkedServiceId: val })}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold w-full">
                  <SelectValue placeholder="Nenhum (Custo Fixo)">
                    {formData.linkedServiceId === 'none' ? 'Nenhum (Custo Fixo)' : (services.find(s => s.id === formData.linkedServiceId)?.name || 'Nenhum (Custo Fixo)')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 italic font-bold">
                  <SelectItem value="none">Nenhum (Custo Fixo)</SelectItem>
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Valor do Custo</Label>
              <div className="relative">
                <Input 
                  value={formatCurrency(formData.value)} 
                  onChange={handleValueChange}
                  placeholder="R$ 0,00"
                  className="h-14 rounded-xl bg-slate-50 border-none font-black text-xl italic text-slate-900"
                  required
                />
                <Target className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
              </div>
            </div>

            {formData.unit !== 'unidade' && formData.value && parseFloat(formData.value) > 0 && (
              <div className="col-span-2 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between animate-in zoom-in-95 duration-300">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 italic">Custo Unitário Calculado</p>
                  <p className="text-xl font-black text-emerald-900 italic">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateUnitCost())}
                    <span className="text-xs font-bold text-emerald-600 ml-2">por unidade/g/ml</span>
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-20" />
              </div>
            )}
          </div>

            </div>
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 shrink-0 flex items-center justify-end rounded-none w-full">
            <div className="max-w-2xl mx-auto w-full flex gap-4 justify-end">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-12 px-6 font-bold text-slate-500 hover:text-red-500 transition-colors uppercase italic text-xs tracking-wider">
                cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 h-12 px-8 font-black text-xs text-white shadow-xl shadow-indigo-100 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] uppercase italic tracking-wider">
                Salvar Lançamento
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
