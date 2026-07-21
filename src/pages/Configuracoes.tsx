import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Settings, Building, Bell, Shield, Wallet, CheckCircle2, LockKeyhole } from 'lucide-react';
import { useStore } from '../store';
import { useState, useEffect } from 'react';
import type { ProductMode } from '../types';

import { toast } from 'sonner';

export function Configuracoes() {
  const { 
    clinicName, 
    clinicRazaoSocial, 
    clinicCnpj, 
    clinicPhone, 
    clinicAddress, 
    clinicProfessionalName, 
    clinicProfessionalCpf, 
    clinicProfessionalRegistro,
    clinicProfessionalSignature,
    receiptNextNumber, 
    setClinicProfile, 
    pixKey, 
    bankName, 
    bankAccount, 
    setFinanceConfig, 
    productMode, 
    setProductMode, 
    currentUser,
    masterClient,
    currentClient
  } = useStore();

  const [localName, setLocalName] = useState(clinicName || '');
  const [localRazaoSocial, setLocalRazaoSocial] = useState(clinicRazaoSocial || '');
  const [localCnpj, setLocalCnpj] = useState(clinicCnpj || '');
  const [localPhone, setLocalPhone] = useState(clinicPhone || '');
  const [localAddress, setLocalAddress] = useState(clinicAddress || '');
  const [localProfName, setLocalProfName] = useState(clinicProfessionalName || '');
  const [localProfCpf, setLocalProfCpf] = useState(clinicProfessionalCpf || '');
  const [localProfRegistro, setLocalProfRegistro] = useState(clinicProfessionalRegistro || '');
  const [localProfSignature, setLocalProfSignature] = useState(clinicProfessionalSignature || '');
  const [localReceiptStartNumber, setLocalReceiptStartNumber] = useState<number>(receiptNextNumber || 1226);

  const [localPix, setLocalPix] = useState(pixKey || '');
  const [localBank, setLocalBank] = useState(bankName || '');
  const [localAccount, setLocalAccount] = useState(bankAccount || '');
  const [activeTab, setActiveTab] = useState('perfil');
  const [savingProductMode, setSavingProductMode] = useState(false);

  const [savedProfile, setSavedProfile] = useState(false);
  const [savedFinance, setSavedFinance] = useState(false);
  const [savedProductMode, setSavedProductMode] = useState(false);
  const canManageProductMode = !currentUser || currentUser.role === 'admin' || currentUser.role === 'master' || currentUser.role !== 'recepção';

    const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes('image')) {
        toast.error('Por favor, selecione uma imagem no formato PNG ou JPG.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalProfSignature(reader.result as string);
        toast.success('Imagem da assinatura carregada com sucesso!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    setClinicProfile({
      clinicName: localName,
      clinicRazaoSocial: localRazaoSocial,
      clinicCnpj: localCnpj,
      clinicPhone: localPhone,
      clinicAddress: localAddress,
      clinicProfessionalName: localProfName,
      clinicProfessionalCpf: localProfCpf,
      clinicProfessionalRegistro: localProfRegistro,
      clinicProfessionalSignature: localProfSignature,
      receiptNextNumber: localReceiptStartNumber
    });
    setSavedProfile(true);
    toast.success('Perfil da clínica e emissor de recibos atualizado com sucesso!');
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
    try {
      await setProductMode(mode);
      setSavedProductMode(true);
      setTimeout(() => setSavedProductMode(false), 2000);
    } catch (error: any) {
      toast.error(error?.message || 'Não foi possível salvar o modo de acesso.');
    } finally {
      setSavingProductMode(false);
    }
  };

  const isMasterOnly = !!masterClient || currentUser?.role === 'master' || currentClient?.is_master;

  useEffect(() => {
    if (!isMasterOnly && activeTab === 'seguranca') {
      setActiveTab('perfil');
    }
  }, [isMasterOnly, activeTab]);

  const availableTabs = [
    { id: 'perfil', label: 'Perfil da Clínica', icon: Building }
  ];

  if (isMasterOnly) {
    availableTabs.push({ id: 'seguranca', label: 'Segurança & Modo', icon: Shield });
  }

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Configurações do Sistema</h1>
        <p className="text-slate-500">Gerencie informações da clínica e perfil do estabelecimento.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1 p-2 h-fit space-y-1 bg-white">
          {availableTabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  active ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </Card>

        <Card className="md:col-span-3 bg-white">
          {activeTab === 'perfil' && (
            <>
              <CardHeader>
                <CardTitle>Perfil da Clínica & Emissor de Recibos</CardTitle>
                <CardDescription>Estes dados serão exibidos nos recibos oficiais emitidos para os pacientes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 border-b border-indigo-50 pb-2">Dados do Estabelecimento</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome Fantasia</Label>
                      <Input placeholder="Ex: Clínica Odontológica Voss" value={localName} onChange={e => setLocalName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Razão Social</Label>
                      <Input placeholder="Ex: Voss Serviços Odontológicos LTDA" value={localRazaoSocial} onChange={e => setLocalRazaoSocial(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CNPJ / CPF da Clínica</Label>
                      <Input placeholder="00.000.000/0001-00" value={localCnpj} onChange={e => setLocalCnpj(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone / WhatsApp</Label>
                      <Input placeholder="(11) 99999-9999" value={localPhone} onChange={e => setLocalPhone(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Endereço Completo</Label>
                    <Input placeholder="Rua / Av., Número, Bairro, Cidade - UF, CEP" value={localAddress} onChange={e => setLocalAddress(e.target.value)} />
                  </div>

                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 border-b border-indigo-50 pb-2 pt-4">Profissional Emissor Responsável & Assinatura</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Nome do Profissional</Label>
                      <Input placeholder="Dra. Daniela Voss" value={localProfName} onChange={e => setLocalProfName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>CPF do Profissional</Label>
                      <Input placeholder="000.000.000-00" value={localProfCpf} onChange={e => setLocalProfCpf(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Registro Profissional (CRO / CRM)</Label>
                      <Input placeholder="Ex: CRO-SP 123456" value={localProfRegistro} onChange={e => setLocalProfRegistro(e.target.value)} />
                    </div>
                  </div>

                  {/* Upload de Assinatura em PNG */}
                  <div className="space-y-2 pt-2">
                    <Label className="text-xs font-bold text-slate-700 block">Assinatura Digital do Profissional (PNG com Fundo Transparente)</Label>
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      {localProfSignature ? (
                        <div className="relative border border-slate-300 rounded-xl bg-white p-2 flex items-center justify-center">
                          <img src={localProfSignature} alt="Assinatura Preview" className="h-16 max-w-[200px] object-contain" />
                          <button
                            type="button"
                            onClick={() => setLocalProfSignature('')}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-[10px] shadow-md hover:bg-red-600"
                            title="Remover assinatura"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 font-medium italic">Nenhuma imagem de assinatura carregada.</div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all inline-block">
                          {localProfSignature ? 'Substituir PNG de Assinatura' : 'Carregar PNG de Assinatura'}
                          <input type="file" accept="image/png, image/jpeg" onChange={handleSignatureUpload} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 border-b border-indigo-50 pb-2 pt-4">Contagem e Numeração dos Recibos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Início da Numeração dos Recibos (Próximo Nº)</Label>
                      <Input 
                        type="number" 
                        placeholder="1226" 
                        value={localReceiptStartNumber} 
                        onChange={e => setLocalReceiptStartNumber(parseInt(e.target.value) || 1001)} 
                      />
                      <p className="text-[11px] text-slate-400">Define o próximo número sequencial gerado para os recibos (ex: 2026/1226).</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button onClick={handleSaveProfile} className="bg-indigo-600 hover:bg-indigo-700 w-48">
                    {savedProfile ? 'Salvo!' : 'Salvar Alterações'}
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {activeTab === 'financeiro' && (
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
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                          <Settings className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900">Perfil de Acesso ao Sistema</h4>
                          <p className="text-xs font-semibold text-slate-500">Selecione se deseja acessar a plataforma completa ou a versão focada no Carnê-Leão e Gestão Financeira.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 border border-indigo-100 shadow-sm">
                        <LockKeyhole className="h-3.5 w-3.5 text-indigo-600" />
                        Perfil & Segurança
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
                      {[
                        {
                          mode: 'full' as ProductMode,
                          title: 'Sistema Completo',
                          description: 'Agenda, prontuários, serviços, precificação, custos, equipe, acessos, financeiro, CRM e gestão completa.'
                        },
                        {
                          mode: 'financeiro' as ProductMode,
                          title: 'Financeiro Carnê-Leão',
                          description: 'Visualiza apenas os módulos vinculados ao Carnê-Leão (Financeiro, Pacientes, Equipe, Serviços, Custos e Configurações).'
                        }
                      ].map(option => {
                        const selected = productMode === option.mode;
                        return (
                          <button
                            key={option.mode}
                            type="button"
                            disabled={savingProductMode}
                            onClick={() => handleProductModeChange(option.mode)}
                            className={`text-left rounded-2xl border p-4 transition-all ${selected ? 'border-indigo-500 bg-white shadow-md ring-2 ring-indigo-100' : 'border-slate-200 bg-white/70 hover:border-indigo-200 hover:bg-white'}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                                  {option.title}
                                  {selected && <span className="text-[10px] bg-indigo-100 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full">Ativo</span>}
                                </p>
                                <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-500">{option.description}</p>
                              </div>
                              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
                                <CheckCircle2 className="h-4 w-4" />
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-[11px] font-bold text-slate-500 pt-1">
                      {savedProductMode ? '✓ Perfil de acesso atualizado e salvo com sucesso!' : 'Ao alternar para o modo Financeiro Carnê-Leão, os menus e rotas secundários são simplificados.'}
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
