import { useEffect, useMemo, useState } from 'react';
import { Search, ShieldCheck, LogIn, Building2, Phone, UsersRound, KeyRound, Eye, EyeOff, X, BellRing, Clock3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useStore } from '../store';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export function CentralClientes() {
  const { supportClients, loadSupportClients, enterSupportSession, resetClientPassword, passwordResetRequests, passwordResetHistory, loadPasswordResetRequests, loadPasswordResetHistory, resolvePasswordResetRequest } = useStore();
  const [search, setSearch] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [resetClient, setResetClient] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [completedClient, setCompletedClient] = useState<any | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadSupportClients().catch(() => toast.error('Não foi possível carregar os clientes.'));
    loadPasswordResetRequests().catch(() => toast.error('Não foi possível carregar os pedidos de senha.'));
    loadPasswordResetHistory().catch(() => toast.error('Não foi possível carregar o histórico de senhas.'));
    const channel = supabase.channel('master-password-reset-requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'solicitacoes_redefinicao_senha_clinica' }, () => {
        loadPasswordResetRequests();
        toast.info('Novo pedido de redefinição de senha recebido.');
      }).subscribe();
    const timer = window.setInterval(() => loadPasswordResetRequests(), 20000);
    return () => { window.clearInterval(timer); supabase.removeChannel(channel); };
  }, [loadSupportClients, loadPasswordResetRequests, loadPasswordResetHistory]);

  const clients = useMemo(() => supportClients.filter(c => [c.name, c.clinicName, c.username, c.phone].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())), [supportClients, search]);
  const open = async (client: any) => {
    setOpeningId(client.id);
    try { await enterSupportSession(client); toast.success(`Sessão de suporte iniciada: ${client.clinicName || client.name}`); navigate('/'); }
    catch { toast.error('Não foi possível iniciar a sessão de suporte.'); }
    finally { setOpeningId(null); }
  };
  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resetClient || newPassword.length < 8) return toast.error('Use ao menos 8 caracteres na senha temporária.');
    setResetting(true);
    try {
      await resetClientPassword(resetClient.id, newPassword);
      if (resetClient.requestId) await resolvePasswordResetRequest(resetClient.requestId);
      await loadPasswordResetHistory();
      toast.success(`Senha redefinida para @${resetClient.username}. Envie a nova senha somente por um canal seguro.`);
      setCompletedClient(resetClient); setResetClient(null); setNewPassword('');
    } catch (error: any) { toast.error(error.message || 'Não foi possível redefinir a senha.'); }
    finally { setResetting(false); }
  };
  const requestClient = (request: any) => ({ ...(request.clientes_clinica || {}), requestId: request.id });

  return <div className="max-w-6xl mx-auto space-y-6">
    <section className="rounded-3xl bg-slate-950 text-white p-7 md:p-10 shadow-xl overflow-hidden relative"><div className="absolute -right-12 -top-16 w-64 h-64 rounded-full bg-indigo-500/30 blur-3xl" /><div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="flex items-center gap-2 text-indigo-200 text-sm font-semibold uppercase tracking-wider"><ShieldCheck className="w-4 h-4" /> Ambiente restrito</div><h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">Central de clientes</h1><p className="mt-2 text-slate-300 max-w-xl">Acesse uma clínica, acompanhe pedidos de senha e preste suporte com rastreabilidade.</p></div><div className="flex items-center gap-2 text-sm text-slate-300"><UsersRound className="w-5 h-5 text-indigo-300" /><strong className="text-white">{supportClients.length}</strong> clientes cadastrados</div></div></section>
    {passwordResetRequests.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50/70 overflow-hidden"><div className="p-5 border-b border-amber-200 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 grid place-items-center"><BellRing className="w-5 h-5"/></div><div><h2 className="font-bold text-slate-900">Pedidos de nova senha</h2><p className="text-sm text-slate-600">{passwordResetRequests.length} pedido{passwordResetRequests.length > 1 ? 's' : ''} aguardando atendimento</p></div></div><div>{passwordResetRequests.map(request => { const client = requestClient(request); return <div key={request.id} className="p-5 border-b last:border-0 border-amber-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold text-slate-900">{client.clinic_name || client.name || 'Cliente'} <span className="font-normal text-slate-500">· @{client.username}</span></p><p className="mt-1 text-sm text-slate-600 flex gap-1.5 items-center"><Clock3 className="w-3.5 h-3.5"/> {new Date(request.created_at).toLocaleString('pt-BR')}</p><p className="mt-2 text-sm text-slate-700"><strong>Preferência:</strong> {request.password_preference || 'Nenhuma — deseja apenas redefinir a senha.'}</p></div><Button onClick={() => { setResetClient(client); setNewPassword(''); }} className="bg-amber-700 hover:bg-amber-800 text-white"><KeyRound className="w-4 h-4 mr-2"/>Atender pedido</Button></div>})}</div></section>}
    <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden"><div className="p-5 border-b border-slate-100"><h2 className="font-bold text-slate-900">Histórico de redefinições</h2><p className="text-sm text-slate-500">Registra a conta e o horário atendidos, sem guardar senhas.</p></div>{passwordResetHistory.length ? passwordResetHistory.map(entry => { const client = entry.clientes_clinica || {}; return <div key={entry.id} className="px-5 py-3 border-b last:border-0 border-slate-100 text-sm flex justify-between gap-4"><span className="text-slate-700"><strong>{client.clinic_name || client.name || 'Cliente'}</strong> · @{client.username}</span><span className="text-slate-400 whitespace-nowrap">{new Date(entry.created_at).toLocaleString('pt-BR')}</span></div> }) : <p className="p-5 text-sm text-slate-500">Nenhuma senha redefinida ainda.</p>}</section>
    <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por clínica, nome ou usuário" className="pl-10" /></div>
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">{clients.map(client => <div key={client.id} className="p-5 border-b border-slate-100 last:border-0 flex flex-col gap-4 md:flex-row md:items-center md:justify-between hover:bg-slate-50 transition-colors"><div className="flex gap-4 min-w-0"><div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Building2 className="w-5 h-5"/></div><div className="min-w-0"><h2 className="font-semibold text-slate-900 truncate">{client.clinicName || client.name || 'Clínica sem nome'}</h2><p className="text-sm text-slate-500">Responsável: {client.name || 'Não informado'} · <strong>Login: @{client.username || 'sem usuário'}</strong></p>{client.phone && <p className="text-xs text-slate-400 mt-1 flex gap-1 items-center"><Phone className="w-3 h-3"/>{client.phone}</p>}</div></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { setResetClient(client); setNewPassword(''); }} className="border-slate-300 text-slate-700"><KeyRound className="w-4 h-4 mr-2"/>Redefinir senha</Button><Button onClick={() => open(client)} disabled={openingId === client.id} className="bg-slate-900 hover:bg-indigo-600 text-white"><LogIn className="w-4 h-4 mr-2"/>{openingId === client.id ? 'Abrindo...' : 'Acessar para suporte'}</Button></div></div>)}{!clients.length && <div className="p-12 text-center text-slate-500">Nenhum cliente encontrado.</div>}</div>
    {resetClient && <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm"><form onSubmit={resetPassword} className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-5 relative"><button type="button" onClick={() => setResetClient(null)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-700"><X className="w-5 h-5"/></button><div><div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 grid place-items-center mb-3"><KeyRound className="w-5 h-5"/></div><h2 className="text-xl font-bold text-slate-900">Redefinir senha</h2><p className="text-sm text-slate-500 mt-1">Conta: <strong>@{resetClient.username}</strong>. A senha antiga não é exibida.</p></div><div><label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nova senha temporária</label><div className="relative mt-2"><Input autoFocus type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={8} placeholder="Mínimo de 8 caracteres" className="pr-11"/><button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showNewPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button></div></div><p className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">Envie a senha temporária ao cliente apenas por um canal seguro. A ação será registrada.</p><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setResetClient(null)}>Cancelar</Button><Button type="submit" disabled={resetting} className="bg-slate-900 text-white">{resetting ? 'Salvando...' : 'Salvar nova senha'}</Button></div></form></div>}
    {completedClient && <div className="fixed inset-0 z-[121] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm"><div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-7 text-center"><div className="w-14 h-14 mx-auto grid place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><ShieldCheck className="w-7 h-7"/></div><h2 className="mt-4 text-xl font-bold text-slate-900">Redefinição concluída</h2><p className="mt-2 text-sm text-slate-600">A senha da conta <strong>@{completedClient.username}</strong> foi atualizada e registrada no histórico.</p><Button onClick={() => setCompletedClient(null)} className="mt-6 w-full bg-slate-900 text-white">Concluir</Button></div></div>}
  </div>;
}
