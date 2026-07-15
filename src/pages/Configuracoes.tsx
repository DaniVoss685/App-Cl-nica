import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Settings, Building, Bell, Shield, Wallet, CheckCircle2, LockKeyhole } from 'lucide-react';
import { useStore } from '../store';
import { useState } from 'react';
import type { ProductMode } from '../types';

export function Configuracoes() {
  const { clinicName, setClinicName, pixKey, bankName, bankAccount, setFinanceConfig, productMode, setProductMode, currentUser } = useStore();
  const [localName, setLocalName] = useState(clinicName);
  const [localPix, setLocalPix] = useState(pixKey);
  const [localBank, setLocalBank] = useState(bankName);
  const [localAccount, setLocalAccount] = useState(bankAccount);
  const [activeTab, setActiveTab] = useState('perfil');
  const [savingProductMode, setSavingProductMode] = useState(false);

  const [savedProfile, setSavedProfile] = useState(false);
  const [savedFinance, setSavedFinance] = useState(false);
  const [savedProductMode, setSavedProductMode] = useState(false);
  const canManageProductMode = currentUser?.role === 'admin';

  const handleSaveProfile = () => {
    setClinicName(localName);
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 2000);
  };

  const handleSaveFinance = () => {
    setFinanceConfig(localPix, localBank, localAccount);
    setSavedFinance(true);
    setTimeout(() => setSavedFinance(false), 2000);
  };

  const handleProductModeChange = async (mode: ProductMode) => {
    if (mode === productMode || savingProductMode) return;
    setSavingProductMode(true);
    await setProductMode(mode);
    setSavingProductMode(false);
    setSavedProductMode(true);
    setTimeout(() => setSavedProductMode(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Configurações</h1>
        <p className="text-sm text-slate-500">Ajuste as preferências do sistema e dados da clínica.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 space-y-1">
          <Button
            variant="ghost"
            className={`w-full justify-start ${activeTab === 'perfil' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'}`}
            onClick={() => setActiveTab('perfil')}
          >
            <Building className="mr-2 h-4 w-4" /> Perfil da Clínica
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start ${activeTab === 'pagamento' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'}`}
            onClick={() => setActiveTab('pagamento')}
          >
            <Wallet className="mr-2 h-4 w-4" /> Dados de Pagamento
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start ${activeTab === 'notificacoes' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'}`}
            onClick={() => setActiveTab('notificacoes')}
          >
            <Bell className="mr-2 h-4 w-4" /> Notificações
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start ${activeTab === 'seguranca' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'}`}
            onClick={() => setActiveTab('seguranca')}
          >
            <Shield className="mr-2 h-4 w-4" /> Segurança e Acesso
          </Button>
        </div>

        <Card className="flex-1">
          {activeTab === 'perfil' && (
            <>
              <CardHeader>
                <CardTitle>Perfil da Clínica</CardTitle>
                <CardDescription>Informações públicas que aparecem para seus pacientes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Nome da Clínica</Label>
                  <Input value={localName} onChange={e => setLocalName(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CNPJ</Label>
                    <Input placeholder="00.000.000/0000-00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone Principal</Label>
                    <Input placeholder="(00) 00000-0000" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Endereço Completo</Label>
                  <Input placeholder="Av. Principal, 1000 - Sala 402" />
                </div>

                <div className="pt-4 flex justify-end">
                  <Button onClick={handleSaveProfile} className="bg-indigo-600 hover:bg-indigo-700 w-40">
                    {savedProfile ? 'Salvo!' : 'Salvar Alterações'}
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {activeTab === 'pagamento' && (
            <>
              <CardHeader>
                <CardTitle>Dados de Pagamento</CardTitle>
                <CardDescription>Gerencie faturamento e contas bancárias.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Pix (Chave)</Label>
                    <Input placeholder="CNPJ, Email ou Celular" value={localPix} onChange={e => setLocalPix(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Banco</Label>
                      <Input placeholder="Ex: Itaú, Nubank" value={localBank} onChange={e => setLocalBank(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Agência / Conta</Label>
                      <Input placeholder="0000 / 00000-0" value={localAccount} onChange={e => setLocalAccount(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <Button onClick={handleSaveFinance} className="bg-indigo-600 hover:bg-indigo-700 w-48">
                     {savedFinance ? 'Salvo!' : 'Salvar Dados Financeiros'}
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {activeTab === 'notificacoes' && (
            <>
              <CardHeader>
                <CardTitle>Notificações</CardTitle>
                <CardDescription>Ajuste os alertas padrão da plataforma.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div>
                      <h4 className="font-medium text-slate-800">Lembretes de Consulta</h4>
                      <p className="text-sm text-slate-500">Enviar aviso 24h antes do agendamento</p>
                    </div>
                    <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div>
                      <h4 className="font-medium text-slate-800">Mensagens de Aniversário</h4>
                      <p className="text-sm text-slate-500">Parabenizar pacientes automaticamente</p>
                    </div>
                    <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div>
                      <h4 className="font-medium text-slate-800">Alerta de Inadimplência</h4>
                      <p className="text-sm text-slate-500">Aviso quando um pagamento vencer</p>
                    </div>
                    <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" defaultChecked />
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <Button className="bg-indigo-600 hover:bg-indigo-700">Salvar Notificações</Button>
                </div>
              </CardContent>
            </>
          )}

          {activeTab === 'seguranca' && (
            <>
              <CardHeader>
                <CardTitle>Segurança e Acesso</CardTitle>
                <CardDescription>Controle de senhas e políticas de privacidade.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {canManageProductMode && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
                          <Settings className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900">Modo do produto</h4>
                          <p className="text-xs font-semibold text-slate-500">Define quais módulos aparecem e quais rotas ficam acessíveis para este cliente.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200">
                        <LockKeyhole className="h-3.5 w-3.5 text-indigo-600" />
                        Admin
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {[
                        {
                          mode: 'full' as ProductMode,
                          title: 'Sistema completo',
                          description: 'Agenda, prontuários, serviços, precificação, custos, equipe, acessos, financeiro, CRM e gestão completa.'
                        },
                        {
                          mode: 'financeiro' as ProductMode,
                          title: 'Financeiro Carnê-Leão',
                          description: 'Libera Financeiro, Pacientes, Profissionais, Serviços, Custos e Configurações de acesso para admin.'
                        }
                      ].map(option => {
                        const selected = productMode === option.mode;
                        return (
                          <button
                            key={option.mode}
                            type="button"
                            disabled={savingProductMode}
                            onClick={() => handleProductModeChange(option.mode)}
                            className={`text-left rounded-2xl border p-4 transition-all ${selected ? 'border-indigo-500 bg-white shadow-sm ring-2 ring-indigo-100' : 'border-slate-200 bg-white/70 hover:border-indigo-200 hover:bg-white'}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-black text-slate-900">{option.title}</p>
                                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">{option.description}</p>
                              </div>
                              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
                                <CheckCircle2 className="h-4 w-4" />
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-[11px] font-bold text-slate-500">
                      {savedProductMode ? 'Modo atualizado e salvo no cliente.' : 'Ao mudar para Financeiro, o sistema redireciona módulos bloqueados para o Financeiro.'}
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Senha Atual</Label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nova Senha</Label>
                      <Input type="password" placeholder="••••••••" />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirmar Nova Senha</Label>
                      <Input type="password" placeholder="••••••••" />
                    </div>
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <Button className="bg-indigo-600 hover:bg-indigo-700">Atualizar Senha</Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
