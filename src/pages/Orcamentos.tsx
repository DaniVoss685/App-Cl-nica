import { Card, CardContent } from '../components/ui/card';
import { useStore } from '../store';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Search, Plus, Filter, FileText, Download, CheckCircle2, XCircle, Clock, Send } from 'lucide-react';
import { Input } from '../components/ui/input';
import { useState } from 'react';

export function Orcamentos() {
  const { patients, budgets } = useStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBudgets = budgets.filter(b => {
    const patient = patients.find(p => p.id === b.patientId);
    const patientName = patient?.name || 'Cliente Avulso';
    return patientName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Orçamentos</h1>
          <p className="text-sm text-slate-500">Gere propostas de tratamento profissionais e acompanhe a aprovação.</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 font-semibold" size="sm">
          <Plus className="mr-2 h-4 w-4" /> Novo Orçamento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white shadow-sm border-none">
          <CardContent className="p-4">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Aprovação (Geral)</p>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-bold">68%</h3>
              <Badge className="bg-green-50 text-green-700 border-green-200 mb-1">+5%</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar orçamento..." 
              className="pl-9 h-10 border-slate-200" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" /> Exportar</Button>
            <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" /> Filtros</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs">Paciente / Proposta</th>
                <th className="px-6 py-4 text-xs">Data de Emissão</th>
                <th className="px-6 py-4 text-xs">Itens do Orçamento</th>
                <th className="px-6 py-4 text-xs">Status</th>
                <th className="px-6 py-4 text-xs text-right">Valor Total</th>
                <th className="px-6 py-4 text-xs text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredBudgets.map((b) => {
                const patient = patients.find(p => p.id === b.patientId);
                const patientName = patient?.name || 'Cliente Avulso';
                return (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{patientName}</span>
                          <span className="text-[10px] text-slate-400">Ref: {b.id}</span>
                        </div>
                      </div>
                    </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {new Date(b.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                    {b.items}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={`text-[10px] ${
                      b.status === 'Aprovado' ? 'bg-green-50 text-green-700 border-green-200' :
                      b.status === 'Enviado' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      b.status === 'Pendente' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {b.status === 'Aprovado' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {b.status === 'Enviado' && <Send className="w-3 h-3 mr-1" />}
                      {b.status === 'Pendente' && <Clock className="w-3 h-3 mr-1" />}
                      {b.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">
                    R$ {b.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600"><Download className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600"><CheckCircle2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400"><XCircle className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
