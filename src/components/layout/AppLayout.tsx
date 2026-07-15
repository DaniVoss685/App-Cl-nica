import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Outlet } from 'react-router-dom';
import { GlobalArrivalModal } from '../modals/GlobalArrivalModal';
import { GlobalCheckoutModal } from '../modals/GlobalCheckoutModal';
import { OnboardingTour } from '../OnboardingTour';

export function AppLayout() {
  return (
    <div className="flex h-dvh w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <GlobalArrivalModal />
      <GlobalCheckoutModal />
      <OnboardingTour />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <Header />
        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 pb-16 space-y-6">
          <Outlet />
        </main>
        <footer className="h-10 bg-white border-t border-slate-200 px-6 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <div className="flex gap-4">
            <span>Última sincronização: Agora</span>
            <span className="flex items-center gap-1 text-green-600 font-medium"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Servidor Conectado</span>
          </div>
          <div className="flex gap-4 lowercase font-bold tracking-widest hidden sm:flex">
            <a href="#" className="hover:text-slate-600">suporte</a>
            <a href="#" className="hover:text-slate-600">docs</a>
            <a href="#" className="hover:text-slate-600">versão 2.4.1-ai</a>
          </div>
        </footer>
      </div>
    </div>
  );
}

