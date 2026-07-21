import { Bell, Menu, Search, Upload, HelpCircle, LogOut } from 'lucide-react';
import { useStore } from '../../store';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export function Header() {
  const clinicName = useStore(state => state.clinicName);
  const insights = useStore(state => state.insights);
  const profilePicture = useStore(state => state.profilePicture);
  const setProfilePicture = useStore(state => state.setProfilePicture);
  const currentClient = useStore(state => state.currentClient);
  const currentUser = useStore(state => state.currentUser);
  const logoutClient = useStore(state => state.logoutClient);
  const passwordResetRequests = useStore(state => state.passwordResetRequests);
  const loadPasswordResetRequests = useStore(state => state.loadPasswordResetRequests);
  const unresolvedInsights = insights.filter(i => !i.resolved).length;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const masterClient = useStore(state => state.masterClient);
  const isMaster = !!masterClient || currentUser?.role === 'master' || currentClient?.is_master;

  useEffect(() => {
    if (!isMaster) return;
    loadPasswordResetRequests();
    const channel = supabase.channel('master-reset-bell')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'solicitacoes_redefinicao_senha_clinica' }, () => loadPasswordResetRequests())
      .subscribe();
    const timer = window.setInterval(() => loadPasswordResetRequests(), 15000);
    return () => { window.clearInterval(timer); supabase.removeChannel(channel); };
  }, [isMaster, loadPasswordResetRequests]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <button className="sm:hidden text-slate-500 hover:text-slate-700">
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-black text-slate-800 hidden sm:block italic uppercase tracking-tight">
          Seja bem-vindo de volta{currentUser?.name || currentClient?.name ? `, ${currentUser?.name || currentClient?.name}` : ''}
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <input 
            type="text" 
            placeholder="Buscar paciente..." 
            className="bg-slate-100 border-none rounded-full px-4 py-2 text-sm w-64 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
          />
        </div>
        <button className="relative p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors sm:hidden">
          <Search className="h-5 w-5" />
        </button>
        
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('open-doubt-hub'))}
          className="p-2 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-slate-50 transition-colors flex items-center gap-1 font-extrabold italic text-xs uppercase cursor-pointer"
          title="Central de Dúvidas e Ajuda"
        >
          <HelpCircle className="h-5 w-5 text-indigo-500 animate-pulse" />
          <span className="hidden lg:inline text-slate-500 hover:text-indigo-650">Dúvidas?</span>
        </button>

        <button onClick={() => isMaster && navigate('/central-clientes')} className="relative p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors cursor-pointer" title={isMaster ? 'Ver pedidos de senha' : 'Notificações'}>
          <Bell className="h-5 w-5" />
          {(unresolvedInsights > 0 || (isMaster && passwordResetRequests.length > 0)) && (
            <span className="absolute -top-0.5 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 ring-2 ring-white text-[9px] leading-4 text-white font-black text-center animate-pulse">
              {isMaster ? passwordResetRequests.length : ''}
            </span>
          )}
        </button>
        
        <div 
          className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-sm shrink-0 cursor-pointer overflow-hidden border-2 border-transparent hover:border-indigo-500 transition-colors relative group"
          onClick={() => fileInputRef.current?.click()}
          title="Alterar foto de perfil"
        >
          {profilePicture || currentUser?.foto ? (
            <img src={profilePicture || currentUser?.foto} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            (currentUser?.name || currentClient?.name)?.substring(0, 2).toLowerCase() || 'ad'
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Upload className="w-4 h-4 text-white" />
          </div>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*"
          onChange={handleImageUpload}
        />

        {currentClient && (
          <button 
            onClick={() => {
              logoutClient();
              window.location.href = "/";
            }}
            className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
            title="Sair do Sistema"
          >
            <LogOut className="h-5 w-5" />
          </button>
        )}
      </div>
    </header>
  );
}
