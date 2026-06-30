import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useStore } from './store';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Onboarding } from './pages/Onboarding';
import { Login } from './pages/Login';
import { Agenda } from './pages/Agenda';
import { Confirmacoes } from './pages/Confirmacoes';
import { Pacientes } from './pages/Pacientes';
import { Comercial } from './pages/Comercial';
import { Financeiro } from './pages/Financeiro';
import { Servicos } from './pages/Servicos';
import { WhatsApp } from './pages/WhatsApp';
import { Retornos } from './pages/Retornos';
import { Equipe } from './pages/Equipe';
import { Pacotes } from './pages/Pacotes';
import { Custos } from './pages/Custos';
import { Prontuarios } from './pages/Prontuarios';
import { Documentos } from './pages/Documentos';
import { AgendamentoOnline } from './pages/AgendamentoOnline';
import { JarvisAssistant } from './components/JarvisAssistant';
import { Toaster } from 'sonner';
import { Configuracoes } from './pages/Configuracoes';
import { GuiaImplantacao } from './pages/GuiaImplantacao';
import { TestingTutorial } from './pages/TestingTutorial';

// Placeholder pages for those not yet implemented
const Placeholder = ({ name }: { name: string }) => (
  <div className="p-12 flex flex-col items-center justify-center text-center space-y-6">
    <div className="w-24 h-24 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-300">
      <div className="animate-pulse">STARK</div>
    </div>
    <div>
      <h1 className="text-3xl font-black text-slate-900 italic uppercase italic">{name}</h1>
      <p className="text-slate-500 max-w-md mx-auto mt-2">
        Estamos configurando os protocolos neurais para este módulo. 
        A funcionalidade será liberada automaticamente após a sincronização com os servidores Stark.
      </p>
    </div>
    <div className="pt-8 flex gap-4">
      <div className="h-1 w-20 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-600 animate-[loading_2s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
      </div>
    </div>
  </div>
);

export default function App() {
  const currentClient = useStore(state => state.currentClient);
  const isOnboarded = useStore(state => state.isOnboarded);
  const syncFromSupabase = useStore(state => state.syncFromSupabase);

  useEffect(() => {
    if (currentClient?.id) {
      syncFromSupabase(currentClient.id);
    }
  }, [currentClient?.id, syncFromSupabase]);

  if (!currentClient) {
    return <Login />;
  }

  if (!isOnboarded) {
    return <Onboarding />;
  }

  return (
    <Router>
      <div className="relative">
        <JarvisAssistant />
        <Toaster position="top-right" expand={true} richColors />
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/confirmacoes" element={<Confirmacoes />} />
            <Route path="/pacientes" element={<Pacientes />} />
            <Route path="/comercial" element={<Comercial />} />
            <Route path="/whatsapp" element={<WhatsApp />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/custos" element={<Custos />} />
            <Route path="/ia" element={<Navigate to="/financeiro?tab=inteligencia" replace />} />
            <Route path="/servicos" element={<Servicos />} />
            <Route path="/pacotes" element={<Pacotes />} />
            <Route path="/retornos" element={<Retornos />} />
            <Route path="/prontuarios" element={<Prontuarios />} />
            <Route path="/documentos" element={<Documentos />} />
            <Route path="/relatorios" element={<Navigate to="/financeiro?tab=graficos" replace />} />
            <Route path="/equipe" element={<Equipe />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/guia" element={<GuiaImplantacao />} />
            <Route path="/testes" element={<TestingTutorial />} />
          </Route>
          <Route path="/agendamento-online" element={<AgendamentoOnline />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}
