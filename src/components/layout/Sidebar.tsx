import { LayoutDashboard, CalendarDays, Users, Stethoscope, Package, Clock, DollarSign, Sparkles, PieChart, UserCog, Settings, HelpCircle, Target, FileText, ClipboardList, ChevronLeft, ChevronRight, MessageSquare, Calculator, Globe, CheckSquare, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { useStore } from '../../store';
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';

const principalNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Agenda', href: '/agenda', icon: CalendarDays },
  { name: 'Confirmações', href: '/confirmacoes', icon: CheckSquare, badgeKey: 'confirmacoes' },
  { name: 'Retornos', href: '/retornos', icon: Clock },
  { name: 'Prontuários', href: '/prontuarios', icon: ClipboardList },
  { name: 'Documentos', href: '/documentos', icon: FileText },
  { name: 'Pacientes', href: '/pacientes', icon: Users },
  { name: 'WhatsApp', href: '/whatsapp', icon: MessageSquare },
];

const operacaoNavigation = [
  { name: 'Serviços', href: '/servicos', icon: Stethoscope },
  { name: 'Pacotes', href: '/pacotes', icon: Package },
  { name: 'Financeiro', href: '/financeiro', icon: DollarSign },
  { name: 'Custos e Preços', href: '/custos', icon: Calculator },
  { name: 'Agendamento Online', href: '/agendamento-online', icon: Globe },
  { name: 'Comercial / CRM', href: '/comercial', icon: Target },
  { name: 'IA Inteligente', href: '/financeiro?tab=inteligencia', icon: Sparkles, color: 'text-indigo-500' },
];

const gestaoNavigation = [
  { name: 'Relatórios', href: '/financeiro?tab=graficos', icon: PieChart },
  { name: 'Equipe', href: '/equipe', icon: UserCog },
  { name: 'Testes e Tutoriais', href: '/testes', icon: ClipboardList, color: 'text-amber-500' },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
  { name: 'Guia de Implantação', href: '/guia', icon: HelpCircle },
];

const NavItem = ({ item, isCollapsed, pathname, search, unresolvedInsights, pendingConfirmations, passwordResetCount = 0 }: { item: any, isCollapsed: boolean, pathname: string, search: string, unresolvedInsights: number, pendingConfirmations: number, passwordResetCount?: number }) => {
  const isActive = useMemo(() => {
    // If the sidebar item URL has tab params
    const tabMatch = item.href.match(/[?&]tab=([^&]+)/);
    const itemQuery = tabMatch ? tabMatch[1] : null;

    const currentTab = new URLSearchParams(search).get('tab');

    if (itemQuery) {
      return pathname === '/financeiro' && currentTab === itemQuery;
    }
    
    if (item.href === '/financeiro') {
      return pathname === '/financeiro' && (!currentTab || currentTab === 'movimentacoes');
    }
    
    return pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
  }, [pathname, search, item.href]);

  return (
    <Link
      to={item.href}
      title={isCollapsed ? item.name : ''}
      className={clsx(
        isActive ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50',
        'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm group relative'
      )}
    >
      <item.icon
        className={clsx(
          item.color ? item.color : (isActive ? 'text-indigo-700' : 'text-slate-400 group-hover:text-slate-600'),
          'w-5 h-5 transition-colors shrink-0'
        )}
        strokeWidth={2}
        aria-hidden="true"
      />
      {!isCollapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate">{item.name}</motion.span>}
      {item.name === 'IA Inteligente' && unresolvedInsights > 0 && (
        <span className={clsx(
          "bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full",
          isCollapsed ? "absolute -top-1 -right-1" : "ml-auto"
        )}>
          {unresolvedInsights}
        </span>
      )}
      {item.badgeKey === 'confirmacoes' && pendingConfirmations > 0 && (
        <span className={clsx(
          "bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold",
          isCollapsed ? "absolute -top-1 -right-1" : "ml-auto"
        )}>
          {pendingConfirmations}
        </span>
      )}
      {item.name === 'Central de Clientes' && passwordResetCount > 0 && (
        <span className={clsx(
          "bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse shadow-sm shadow-red-200",
          isCollapsed ? "absolute -top-1 -right-1" : "ml-auto"
        )}>
          {passwordResetCount}
        </span>
      )}
    </Link>
  );
};

export function Sidebar() {
  const { pathname, search } = useLocation();
  const clinicName = useStore(state => state.clinicName);
  const currentUser = useStore(state => state.currentUser);
  const getAllowedNavigation = useStore(state => state.getAllowedNavigation);
  const insights = useStore(state => state.insights);
  const appointments = useStore(state => state.appointments);
  const passwordResetRequests = useStore(state => state.passwordResetRequests);
  const loadPasswordResetRequests = useStore(state => state.loadPasswordResetRequests);
  const masterClient = useStore(state => state.masterClient);
  const isMaster = !!masterClient || currentUser?.role === 'master';
  const unresolvedInsights = insights.filter(i => !i.resolved).length;

  useEffect(() => {
    if (!isMaster) return;
    loadPasswordResetRequests();
    const channel = supabase.channel('sidebar-reset-requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'solicitacoes_redefinicao_senha_clinica' }, () => {
        loadPasswordResetRequests();
      })
      .subscribe();
    const timer = window.setInterval(() => loadPasswordResetRequests(), 15000);
    return () => { window.clearInterval(timer); supabase.removeChannel(channel); };
  }, [isMaster, loadPasswordResetRequests]);

  // Contagem de confirmações pendentes nos próximos 30 dias
  const pendingConfirmations = useMemo(() => {
    const now = new Date();
    const limit = new Date();
    limit.setDate(limit.getDate() + 30);
    return appointments.filter(appt => {
      const d = new Date(appt.date);
      return d >= now && d <= limit &&
        appt.confirmationStatus === 'pendente' &&
        appt.status !== 'realizado' &&
        appt.status !== 'finalizado' &&
        appt.status !== 'faltou' &&
        appt.status !== 'cancelado';
    }).length;
  }, [appointments]);
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const timeoutRef = useRef<any>(null);

  const checkPermission = (itemName: string) => {
    if (!currentUser) return false;
    const allowedNavigation = getAllowedNavigation();
    if (!allowedNavigation.includes('*') && !allowedNavigation.includes(itemName)) return false;
    if (currentUser.role === 'admin' || currentUser.role === 'master') return true;
    
    const normalizedName = itemName.toLowerCase().trim();
    
    if (currentUser.allowedTabs && currentUser.allowedTabs.length > 0) {
      return currentUser.allowedTabs.some(tab => {
        const normalizedTab = tab.toLowerCase().trim();
        return normalizedTab === normalizedName || 
               normalizedName.includes(normalizedTab) || 
               normalizedTab.includes(normalizedName);
      });
    }
    
    // Fallback padrão se não houver permissões personalizadas
    if (currentUser.role === 'recepção') {
      if (itemName === 'Financeiro' || itemName === 'Relatórios' || itemName === 'Configurações') return false;
    }
    return true;
  };

  const filteredPrincipal = principalNavigation.filter(item => checkPermission(item.name));
  const filteredOperacao = operacaoNavigation.filter(item => checkPermission(item.name));
  const filteredGestao = gestaoNavigation.filter(item => checkPermission(item.name));
  const canOpenImplementationGuide = checkPermission('Guia de Implantação');

  const startTimer = () => {
    if (isManual || isCollapsed) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsCollapsed(true);
    }, 5000);
  };

  const clearTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  useEffect(() => {
    startTimer();
    return () => clearTimer();
  }, [isManual, isCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev);
    setIsManual(true);
    clearTimer();
  };

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isCollapsed ? 80 : 240 }}
      onMouseEnter={clearTimer}
      onMouseLeave={startTimer}
      className="bg-white border-r border-slate-200 hidden flex-col sm:flex shrink-0 relative overflow-hidden h-screen z-40"
    >
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 bg-white border border-slate-200 rounded-full p-1 shadow-sm hover:bg-slate-50 z-50 text-slate-400 hover:text-indigo-600 transition-colors"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <div className={clsx(
        "p-6 border-b border-slate-100 flex items-center transition-all duration-300",
        isCollapsed ? "justify-center" : "gap-2"
      )}>
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
          <LayoutDashboard className="w-5 h-5 text-white" />
        </div>
        {!isCollapsed && (
          <motion.span 
            initial={{ opacity: 0, x: -10 }} 
            animate={{ opacity: 1, x: 0 }} 
            className="font-bold text-lg tracking-tight truncate"
          >
            {clinicName || 'ClinicFlow AI'}
          </motion.span>
        )}
      </div>
      
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto overflow-x-hidden transition-all duration-300">
        {filteredPrincipal.length > 0 && (
          <div className="space-y-1">
            {!isCollapsed && <div className="px-3 py-2 text-xs font-semibold text-slate-400 tracking-wider uppercase">Principal</div>}
            {filteredPrincipal.map((item) => <NavItem key={item.name} item={item} isCollapsed={isCollapsed} pathname={pathname} search={search} unresolvedInsights={unresolvedInsights} pendingConfirmations={pendingConfirmations} />)}
          </div>
        )}
        
        {filteredOperacao.length > 0 && (
          <div className="space-y-1">
            {!isCollapsed && <div className="px-3 py-2 text-xs font-semibold text-slate-400 tracking-wider uppercase">Operação</div>}
            {filteredOperacao.map((item) => <NavItem key={item.name} item={item} isCollapsed={isCollapsed} pathname={pathname} search={search} unresolvedInsights={unresolvedInsights} pendingConfirmations={pendingConfirmations} />)}
          </div>
        )}
        
        {(filteredGestao.length > 0 || isMaster) && (
          <div className="space-y-1">
            {!isCollapsed && <div className="px-3 py-2 text-xs font-semibold text-slate-400 tracking-wider uppercase">Gestão</div>}
            {filteredGestao.map((item) => <NavItem key={item.name} item={item} isCollapsed={isCollapsed} pathname={pathname} search={search} unresolvedInsights={unresolvedInsights} pendingConfirmations={pendingConfirmations} />)}
            {isMaster && <NavItem item={{ name: 'Central de Clientes', href: '/central-clientes', icon: ShieldCheck, color: 'text-indigo-600' }} isCollapsed={isCollapsed} pathname={pathname} search={search} unresolvedInsights={unresolvedInsights} pendingConfirmations={pendingConfirmations} passwordResetCount={passwordResetRequests.length} />}
          </div>
        )}
      </nav>

      <AnimatePresence>
        {!isCollapsed && canOpenImplementationGuide && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="p-4 bg-slate-50 border-t border-slate-200 shrink-0"
          >
            <div className="flex items-center justify-between mb-2 text-xs font-medium text-slate-500">
              <span>Implantação</span>
              <span>65%</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full w-[65%]"></div>
            </div>
            <Link to="/guia" className="mt-3 w-full py-1.5 text-xs bg-white border border-slate-200 rounded text-slate-600 font-medium hover:bg-slate-100 flex items-center justify-center">Guia Completo</Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
