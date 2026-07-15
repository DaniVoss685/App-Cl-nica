import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
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
import { Box, CalendarDays, CheckCircle2, DollarSign, Hash, Link2, Package, Plus, Scale, Target, X } from 'lucide-react';
import { inventoryConsumptionUnitCost, inventoryConsumptionUnitLabel, inventoryStockValue } from '../lib/costing';
import type { InventoryItem } from '../types';

interface CostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CostUnit = InventoryItem['unit'];

interface CategoryComboboxProps {
  value: string;
  categories: string[];
  onChange: (value: string) => void;
  onCreate: (value: string) => void;
  onDelete: (value: string) => void;
}

function CategoryCombobox({ value, categories, onChange, onCreate, onDelete }: CategoryComboboxProps) {
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
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHasTyped(true);
          }}
          placeholder="Pesquisar categoria..."
          className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold"
          required
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (!value.trim()) return;
            onCreate(value.trim());
            setIsOpen(false);
          }}
          className="h-12 rounded-xl px-3 border-slate-200"
          title="Criar categoria"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {isOpen && (
        <div className="absolute z-[80] mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
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
                  <X className="mx-auto h-3.5 w-3.5" />
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

const defaultFormData = {
  name: '',
  value: '',
  category: 'Insumos',
  unit: 'unidade' as CostUnit,
  linkedServiceId: 'nenhum',
  unitsPerPackage: '100',
  subUnitName: 'unidade',
  totalMeasure: '1',
  consumptionUnit: '',
  quantity: '10',
  minQuantity: '5',
  consumptionQty: '1',
  supplier: '',
  batchNumber: '',
  expirationDate: ''
};

export function CostModal({ open, onOpenChange }: CostModalProps) {
  const { services, addInventoryItem, addInventoryPurchase, updateService, inventoryCategories, addInventoryCategory, removeInventoryCategory } = useStore();
  const [formData, setFormData] = useState(defaultFormData);

  const purchaseCost = useMemo(() => (parseInt(formData.value || '0') || 0) / 100, [formData.value]);

  const draftItem = useMemo<InventoryItem>(() => ({
    id: 'draft',
    name: formData.name || 'Novo insumo',
    unit: formData.unit,
    unitCost: purchaseCost,
    category: formData.category,
    quantity: parseFloat(formData.quantity) || 0,
    minQuantity: parseFloat(formData.minQuantity) || 0,
    unitsPerPackage: formData.unit === 'pacote' ? (parseFloat(formData.unitsPerPackage) || 1) : undefined,
    subUnitName: formData.unit === 'pacote' ? formData.subUnitName : undefined,
    totalMeasure: formData.unit === 'peso' ? (parseFloat(formData.totalMeasure) || 1) : undefined,
    consumptionUnit: formData.consumptionUnit || undefined
  }), [formData, purchaseCost]);

  const unitCost = inventoryConsumptionUnitCost(draftItem);
  const unitLabel = inventoryConsumptionUnitLabel(draftItem);
  const consumptionQty = parseFloat(formData.consumptionQty) || 1;
  const linkedService = services.find(service => service.id === formData.linkedServiceId);
  const consumptionCost = unitCost * consumptionQty;
  const sortedCategories = useMemo(() => Array.from(new Set([
    'EPI',
    'Fixo',
    'Insumos',
    'Marketing',
    'Materiais',
    'Medicamentos',
    ...(inventoryCategories || [])
  ])).sort((a, b) => a.localeCompare(b, 'pt-BR')), [inventoryCategories]);
  const sortedServices = useMemo(() => [...services].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), [services]);

  const formatCurrency = (val: string) => {
    const cleanValue = val.replace(/\D/g, '');
    const numberValue = parseInt(cleanValue || '0') / 100;
    if (isNaN(numberValue)) return '';
    return numberValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, value });
  };

  const resetAndClose = () => {
    onOpenChange(false);
    setFormData(defaultFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newItemId = addInventoryItem({
      name: formData.name.trim(),
      unitCost: purchaseCost,
      category: formData.category,
      unit: formData.unit,
      linkedServiceId: formData.linkedServiceId === 'nenhum' ? undefined : formData.linkedServiceId,
      quantity: 0,
      minQuantity: parseFloat(formData.minQuantity) || 0,
      unitsPerPackage: formData.unit === 'pacote' ? (parseFloat(formData.unitsPerPackage) || 1) : undefined,
      subUnitName: formData.unit === 'pacote' ? formData.subUnitName.trim() || 'unidade' : undefined,
      totalMeasure: formData.unit === 'peso' ? (parseFloat(formData.totalMeasure) || 1) : undefined,
      consumptionUnit: formData.consumptionUnit.trim() || undefined,
      supplier: formData.supplier.trim() || undefined,
      batchNumber: formData.batchNumber.trim() || undefined,
      expirationDate: formData.expirationDate || undefined
    });

    addInventoryCategory(formData.category);
    addInventoryPurchase({
      itemId: newItemId,
      itemName: formData.name.trim(),
      purchaseDate: new Date().toISOString().slice(0, 10),
      supplier: formData.supplier.trim() || undefined,
      batchNumber: formData.batchNumber.trim() || undefined,
      expirationDate: formData.expirationDate || undefined,
      quantity: parseFloat(formData.quantity) || 0,
      totalCost: purchaseCost,
      invoiceNumber: undefined
    });

    if (linkedService) {
      updateService(linkedService.id, {
        itemCosts: [
          ...(linkedService.itemCosts || []).filter(item => item.itemId !== newItemId),
          { itemId: newItemId, quantity: consumptionQty }
        ]
      });
    }

    resetAndClose();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? onOpenChange(true) : resetAndClose()}>
      <DialogContent showCloseButton={false} className="max-w-none sm:max-w-none md:max-w-none lg:max-w-none xl:max-w-none w-screen h-screen m-0 rounded-none p-0 bg-white border-none flex flex-col top-0 left-0 translate-x-0 translate-y-0 duration-100 overflow-hidden">
        <div className="bg-slate-950 p-6 md:p-8 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-2xl font-black italic uppercase text-white">
                Novo Insumo ou Custo
              </DialogTitle>
              <p className="text-slate-400 text-xs font-bold tracking-widest mt-1 uppercase">
                Cadastre compra, estoque, consumo e vinculo com procedimento
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={resetAndClose}
            className="text-white hover:bg-white/10 font-black italic rounded-xl px-4 h-11 text-xs uppercase tracking-wider shrink-0"
          >
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 md:p-10 bg-slate-50/60">
            <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
              <div className="space-y-6">
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                  <div className="flex items-center gap-3">
                    <Box className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="font-black text-slate-950 italic uppercase text-sm">Compra e estoque</h3>
                      <p className="text-xs text-slate-500 font-medium">Informe como o item entrou no estoque.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Nome do insumo</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Luva nitrilica, acido hialuronico, seringa 3ml"
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Categoria</Label>
                      <CategoryCombobox
                        value={formData.category}
                        categories={sortedCategories}
                        onChange={(category) => setFormData({ ...formData, category })}
                        onCreate={addInventoryCategory}
                        onDelete={removeInventoryCategory}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Tipo de compra</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'unidade' as CostUnit, label: 'Unidade', icon: Hash },
                          { id: 'pacote' as CostUnit, label: 'Pacote', icon: Package },
                          { id: 'peso' as CostUnit, label: 'Medida', icon: Scale }
                        ].map((type) => (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              unit: type.id,
                              minQuantity: type.id === 'pacote' ? '2' : '5',
                              consumptionUnit: type.id === 'peso' ? 'g/ml' : formData.consumptionUnit
                            })}
                            className={`h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                              formData.unit === type.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            <type.icon className="w-4 h-4" />
                            <span className="text-[8px] font-black uppercase tracking-tighter">{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Valor pago na compra</Label>
                      <div className="relative">
                        <Input
                          value={formatCurrency(formData.value)}
                          onChange={handleValueChange}
                          placeholder="R$ 0,00"
                          className="h-12 rounded-xl bg-slate-50 border-slate-200 font-black text-lg italic text-slate-900"
                          required
                        />
                        <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Quantidade fisica em estoque</Label>
                      <Input
                        type="number"
                        step="any"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Estoque minimo</Label>
                      <Input
                        type="number"
                        step="any"
                        value={formData.minQuantity}
                        onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold"
                        required
                      />
                    </div>
                  </div>

                  {formData.unit === 'pacote' && (
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 italic">Divisao do pacote</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-slate-600">Unidades por pacote</Label>
                          <Input
                            type="number"
                            step="any"
                            value={formData.unitsPerPackage}
                            onChange={(e) => setFormData({ ...formData, unitsPerPackage: e.target.value })}
                            className="h-10 rounded-xl bg-white border-indigo-100 font-bold"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-slate-600">Nome da unidade consumida</Label>
                          <Input
                            type="text"
                            placeholder="Ex: luva, par, tubete"
                            value={formData.subUnitName}
                            onChange={(e) => setFormData({ ...formData, subUnitName: e.target.value })}
                            className="h-10 rounded-xl bg-white border-indigo-100 font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.unit === 'peso' && (
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 italic">Divisao por medida</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-slate-600">Medida total da embalagem</Label>
                          <Input
                            type="number"
                            step="any"
                            value={formData.totalMeasure}
                            onChange={(e) => setFormData({ ...formData, totalMeasure: e.target.value })}
                            className="h-10 rounded-xl bg-white border-indigo-100 font-bold"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-slate-600">Unidade de consumo</Label>
                          <Input
                            type="text"
                            placeholder="Ex: g, ml, dose"
                            value={formData.consumptionUnit}
                            onChange={(e) => setFormData({ ...formData, consumptionUnit: e.target.value })}
                            className="h-10 rounded-xl bg-white border-indigo-100 font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                  <div className="flex items-center gap-3">
                    <Link2 className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="font-black text-slate-950 italic uppercase text-sm">Uso no procedimento</h3>
                      <p className="text-xs text-slate-500 font-medium">Defina se este insumo entra automaticamente em um protocolo.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Procedimento vinculado</Label>
                      <Select value={formData.linkedServiceId} onValueChange={(val) => setFormData({ ...formData, linkedServiceId: val })}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold w-full">
                          <SelectValue placeholder="Nenhum procedimento" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 italic font-bold">
                          <SelectItem value="nenhum">Nenhum procedimento</SelectItem>
                          {sortedServices.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Consumo por atendimento</Label>
                      <Input
                        type="number"
                        step="any"
                        value={formData.consumptionQty}
                        onChange={(e) => setFormData({ ...formData, consumptionQty: e.target.value })}
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold"
                      />
                    </div>
                  </div>
                </section>

                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="font-black text-slate-950 italic uppercase text-sm">Rastreio opcional</h3>
                      <p className="text-xs text-slate-500 font-medium">Dados para compra, validade e conferencia futura.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Fornecedor</Label>
                      <Input value={formData.supplier} onChange={(e) => setFormData({ ...formData, supplier: e.target.value })} className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Lote</Label>
                      <Input value={formData.batchNumber} onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })} className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Validade</Label>
                      <Input type="date" value={formData.expirationDate} onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })} className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold" />
                    </div>
                  </div>
                </section>
              </div>

              <aside className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 h-fit xl:sticky xl:top-4 space-y-5">
                <div>
                  <h3 className="font-black text-slate-950 italic uppercase text-sm">Resumo calculado</h3>
                  <p className="text-xs text-slate-500 mt-1">Conferencia antes de salvar.</p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor em estoque</p>
                    <p className="text-xl font-black italic text-slate-950">
                      {inventoryStockValue(draftItem).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Custo por {unitLabel}</p>
                    <p className="text-xl font-black italic text-emerald-950">
                      {unitCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Custo no procedimento</p>
                    <p className="text-xl font-black italic text-indigo-950">
                      {consumptionCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </p>
                    <p className="text-[11px] font-bold text-indigo-700 mt-1">
                      {consumptionQty} {unitLabel} por atendimento
                    </p>
                  </div>
                </div>

                {linkedService && (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                    <Target className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-amber-950 uppercase">Vai entrar em {linkedService.name}</p>
                      <p className="text-[11px] text-amber-700 font-semibold mt-1">
                        O custo sera somado automaticamente na margem do procedimento.
                      </p>
                    </div>
                  </div>
                )}

                {purchaseCost > 0 && (
                  <div className="p-4 bg-white border border-slate-100 rounded-xl flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    <p className="text-xs font-bold text-slate-600">
                      Compra, consumo e estoque estao coerentes para salvar.
                    </p>
                  </div>
                )}
              </aside>
            </div>
          </div>

          <DialogFooter className="p-5 md:p-8 bg-white border-t border-slate-200 shrink-0 flex items-center justify-end rounded-none w-full">
            <div className="max-w-6xl mx-auto w-full flex gap-4 justify-end">
              <Button type="button" variant="ghost" onClick={resetAndClose} className="h-12 px-6 font-bold text-slate-500 hover:text-red-500 transition-colors uppercase italic text-xs tracking-wider">
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 h-12 px-8 font-black text-xs text-white shadow-xl shadow-indigo-100 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] uppercase italic tracking-wider">
                Salvar Insumo
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
