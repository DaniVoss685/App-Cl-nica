import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../ui/select';
import { useStore } from '../../store';
import { Target, User, Phone, DollarSign, FileText } from 'lucide-react';

interface OpportunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId?: string | null;
  defaultStage?: string;
}

export function OpportunityModal({ open, onOpenChange, opportunityId, defaultStage }: OpportunityModalProps) {
  const { opportunities, addOpportunity, updateOpportunity, removeOpportunity } = useStore();
  
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    stage: 'lead',
    source: 'Instagram',
    phone: '',
    notes: ''
  });

  const formatCurrency = (val: string) => {
    const cleanValue = val.replace(/\D/g, '');
    if (!cleanValue) return '';
    const numberValue = parseInt(cleanValue) / 100;
    return numberValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, value }));
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 11);
    if (limited.length <= 2) return limited;
    if (limited.length <= 7) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  useEffect(() => {
    if (open) {
      if (opportunityId) {
        const opp = opportunities.find(o => o.id === opportunityId);
        if (opp) {
          const rawValue = opp.value ? (opp.value * 100).toFixed(0) : '';
          setFormData({
            name: opp.name || '',
            value: rawValue,
            stage: opp.stage || 'lead',
            source: opp.source || 'Instagram',
            phone: opp.phone || '',
            notes: opp.notes || ''
          });
        }
      } else {
        setFormData({
          name: '',
          value: '',
          stage: defaultStage || 'lead',
          source: 'Instagram',
          phone: '',
          notes: ''
        });
      }
    }
  }, [open, opportunityId, opportunities]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanValue = parseFloat(formData.value) / 100 || 0;
    
    const oppData = {
      name: formData.name,
      value: cleanValue,
      stage: formData.stage,
      source: formData.source,
      phone: formData.phone,
      notes: formData.notes
    };

    if (opportunityId) {
      updateOpportunity(opportunityId, oppData);
    } else {
      addOpportunity(oppData);
    }
    
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (opportunityId) {
      removeOpportunity(opportunityId);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-none sm:max-w-none md:max-w-none lg:max-w-none xl:max-w-none w-screen h-screen m-0 rounded-none p-0 bg-white border-none flex flex-col top-0 left-0 translate-x-0 translate-y-0 duration-100 overflow-hidden">
        
        <div className="bg-indigo-600 p-8 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-3xl font-black italic uppercase text-white">
                {opportunityId ? 'Editar Oportunidade' : 'Nova Oportunidade'}
              </DialogTitle>
              <p className="text-indigo-100 text-sm font-medium mt-1 italic uppercase tracking-wider">
                Gerencie as informações do lead e valores estimados de fechamento
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white hover:bg-white/10 font-black italic rounded-2xl px-8 h-14 text-sm uppercase tracking-wider shrink-0 border border-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            Fechar Janela X
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-10">
            <div className="max-w-6xl mx-auto space-y-6 bg-slate-50/70 p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" /> Nome do Lead / Paciente
              </Label>
              <Input 
                id="name" 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl h-11 bg-slate-50/50 border-slate-200/80 focus:bg-white font-bold transition-all text-sm"
                placeholder="Nome completo do potencial paciente"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="value" className="text-[10px] font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-slate-400" /> Valor Estimado (R$)
                </Label>
                <Input 
                  id="value" 
                  value={formatCurrency(formData.value)} 
                  onChange={handleValueChange}
                  className="rounded-xl h-11 bg-slate-50/50 border-slate-200/80 focus:bg-white font-bold font-mono text-sm"
                  placeholder="R$ 0,00"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" /> Celular / WhatsApp
                </Label>
                <Input 
                  id="phone" 
                  value={formData.phone} 
                  onChange={handlePhoneChange}
                  className="rounded-xl h-11 bg-slate-50/50 border-slate-200/80 focus:bg-white font-bold font-mono text-sm"
                  placeholder="(99) 99999-9999"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Estágio do Funil</Label>
                <Select 
                  value={formData.stage} 
                  onValueChange={(val) => setFormData({ ...formData, stage: val })}
                >
                  <SelectTrigger className="rounded-xl h-11 bg-slate-50/50 border-slate-200/80 text-slate-800 font-bold text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="contatado">Contatado</SelectItem>
                    <SelectItem value="agendamento">Agendamento</SelectItem>
                    <SelectItem value="pós-venda">Pós-Venda</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Origem / Canal</Label>
                <Select 
                  value={formData.source} 
                  onValueChange={(val) => setFormData({ ...formData, source: val })}
                >
                  <SelectTrigger className="rounded-xl h-11 bg-slate-50/50 border-slate-200/80 text-slate-800 font-bold text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    <SelectItem value="Indicação">Indicação</SelectItem>
                    <SelectItem value="Google">Google Search</SelectItem>
                    <SelectItem value="Facebook">Facebook Ads</SelectItem>
                    <SelectItem value="Outro">Outro Canal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-[10px] font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-400" /> Observações / Anotações
              </Label>
              <textarea 
                id="notes" 
                value={formData.notes} 
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full rounded-xl bg-slate-50/50 border border-slate-200 p-4 font-bold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all focus:bg-white"
                placeholder="Detalhes adicionais sobre o tratamento desejado, histórico de conversas, etc."
              />
            </div>
          </div>
        </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 shrink-0 flex items-center justify-end rounded-none w-full">
            <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
              <div>
                {opportunityId && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={handleDelete}
                    className="h-12 px-6 font-bold text-red-500 hover:bg-red-50 hover:text-red-750 transition-colors uppercase italic text-xs tracking-wider rounded-xl"
                  >
                    Excluir
                  </Button>
                )}
              </div>
              <div className="flex gap-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => onOpenChange(false)} 
                  className="h-12 px-6 font-bold text-slate-500 hover:text-red-500 transition-colors uppercase italic text-xs tracking-wider"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-indigo-600 hover:bg-indigo-700 h-12 px-8 font-black text-xs text-white shadow-xl shadow-indigo-100 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] uppercase italic tracking-wider"
                >
                  {opportunityId ? 'Salvar Alterações' : 'Criar Oportunidade'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
