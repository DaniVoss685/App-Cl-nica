import React, { useState } from 'react';
import { useStore } from '../store';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import { 
  ShieldCheck, 
  KeyRound, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight,
  UserPlus,
  Phone,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Login() {
  const loginClient = useStore(state => state.loginClient);
  const registerClient = useStore(state => state.registerClient);
  const requestPasswordReset = useStore(state => state.requestPasswordReset);
  
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showRecoveryNotice, setShowRecoveryNotice] = useState(false);
  const [recoveryUsername, setRecoveryUsername] = useState('');
  const [recoveryPreference, setRecoveryPreference] = useState('');
  const [requestingRecovery, setRequestingRecovery] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });

  const formatPhoneNumber = (value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const limited = numbers.slice(0, 11);
    
    if (limited.length <= 2) {
      return limited;
    }
    if (limited.length <= 7) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    }
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (isRegister) {
      if (!formData.name) {
        toast.error('Por favor, informe seu nome.');
        return;
      }
      if (!formData.phone || formData.phone.length < 14) {
        toast.error('Por favor, insira um número de telefone/celular válido.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('As senhas não coincidem.');
        return;
      }
    }

    setLoading(true);

    try {
      if (isRegister) {
        const success = await registerClient(
          formData.name, 
          formData.username, 
          formData.password, 
          formData.phone
        );
        if (success) {
          toast.success('Cadastro concluído com sucesso!');
          setShowSuccessModal(true);
        } else {
          toast.error('Falha ao criar o cadastro. Tente outro nome de usuário.');
        }
      } else {
        const success = await loginClient(formData.username, formData.password);
        if (success) {
          toast.success('Acesso concedido! Bem-vindo de volta.');
        } else {
          toast.error('Usuário ou senha incorretos.');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Ocorreu um erro no servidor.');
    } finally {
      setLoading(false);
    }
  };

  const submitRecoveryRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setRequestingRecovery(true);
    try {
      await requestPasswordReset(recoveryUsername, recoveryPreference);
      toast.success('Pedido enviado ao suporte. Você receberá uma nova senha em breve.');
      setShowRecoveryNotice(false); setRecoveryUsername(''); setRecoveryPreference('');
    } catch (error: any) { toast.error(error.message || 'Não foi possível enviar o pedido.'); }
    finally { setRequestingRecovery(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Soft and Modern Gradient Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="relative w-full max-w-md">
        
        {/* Modern Clean Header */}
        <div className="mb-10 flex justify-center flex-col items-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgba(99,102,241,0.15)] mb-4"
          >
            <Sparkles className="w-7 h-7 text-white" />
          </motion.div>
          
          <motion.h1 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-2xl font-extrabold text-white tracking-tight"
          >
            ClinicFlow
          </motion.h1>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-slate-400 font-medium text-xs tracking-wider mt-1 text-center"
          >
            Gestão e Finanças Inteligentes
          </motion.p>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card className="bg-slate-900/30 border-slate-800/60 backdrop-blur-3xl p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            
            <form onSubmit={handleSubmit} className="space-y-6 relative" autoComplete="off">
              
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {isRegister ? 'Criar Conta' : 'Acessar Conta'}
                </h2>
                <p className="text-slate-400 text-sm">
                  {isRegister 
                    ? 'Preencha os dados abaixo para se cadastrar.' 
                    : 'Insira suas credenciais de acesso.'}
                </p>
              </div>

              <div className="space-y-4">
                
                {/* Name Field (Register only) */}
                <AnimatePresence initial={false}>
                  {isRegister && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden space-y-2"
                    >
                      <Label className="text-slate-400 uppercase text-[9px] font-bold tracking-[0.2em]">Seu Nome</Label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <Input 
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Seu nome completo"
                          className="h-14 pl-12 bg-slate-800/25 border-slate-800 text-white rounded-2xl focus:ring-indigo-500/20 focus:border-indigo-500"
                          required={isRegister}
                          autoComplete="off"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Username Field */}
                <div className="space-y-2">
                  <Label className="text-slate-400 uppercase text-[9px] font-bold tracking-[0.2em]">Usuário</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <Input 
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Escolha um nome de usuário"
                      className="h-14 pl-12 bg-slate-800/25 border-slate-800 text-white rounded-2xl focus:ring-indigo-500/20 focus:border-indigo-500"
                      required
                      autoComplete="off"
                    />
                  </div>
                </div>

                {/* Phone Field (Register only) */}
                <AnimatePresence initial={false}>
                  {isRegister && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden space-y-2"
                    >
                      <Label className="text-slate-400 uppercase text-[9px] font-bold tracking-[0.2em]">Celular / Telefone</Label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <Input 
                          type="tel"
                          value={formData.phone}
                          onChange={handlePhoneChange}
                          placeholder="(11) 99999-9999"
                          className="h-14 pl-12 bg-slate-800/25 border-slate-800 text-white rounded-2xl focus:ring-indigo-500/20 focus:border-indigo-500"
                          required={isRegister}
                          autoComplete="off"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label className="text-slate-400 uppercase text-[9px] font-bold tracking-[0.2em]">Senha</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <Input 
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Sua senha de acesso"
                      className="h-14 pl-12 pr-12 bg-slate-800/25 border-slate-800 text-white rounded-2xl focus:ring-indigo-500/20 focus:border-indigo-500"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-450 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field (Register only) */}
                <AnimatePresence initial={false}>
                  {isRegister && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden space-y-2"
                    >
                      <Label className="text-slate-400 uppercase text-[9px] font-bold tracking-[0.2em]">Confirmar Senha</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <Input 
                          type={showPassword ? "text" : "password"}
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          placeholder="Digite a senha novamente"
                          className="h-14 pl-12 bg-slate-800/25 border-slate-800 text-white rounded-2xl focus:ring-indigo-500/20 focus:border-indigo-500"
                          required={isRegister}
                          autoComplete="new-password"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-2xl shadow-[0_8px_25px_rgba(99,102,241,0.25)] transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    {isRegister ? 'Concluir Cadastro' : 'Entrar no Sistema'}
                    {isRegister ? <UserPlus className="w-5 h-5" /> : <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                  </>
                )}
              </button>

              {/* Form Toggle Switcher (High Contrast Colors) */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setFormData({ name: '', username: '', password: '', confirmPassword: '', phone: '' });
                  }}
                  className="text-sm text-indigo-400 hover:text-indigo-300 font-semibold transition-all hover:underline underline-offset-4 cursor-pointer"
                >
                  {isRegister 
                    ? 'Já possui uma conta? Entrar' 
                    : 'Não possui uma conta? Cadastre-se'}
                </button>
              </div>
              {!isRegister && <div className="text-center -mt-3"><button type="button" onClick={() => setShowRecoveryNotice(true)} className="text-xs text-slate-400 hover:text-indigo-300 underline underline-offset-4">Esqueci minha senha</button></div>}

            </form>
          </Card>
        </motion.div>

        {/* Clean Security Footer */}
        <div className="mt-10 flex items-center justify-center gap-2 text-slate-500 font-mono text-[9px] uppercase tracking-widest">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> Conexão Segura — ClinicFlow v2.4.1
        </div>

      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showRecoveryNotice && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"><motion.form onSubmit={submitRecoveryRequest} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 max-w-sm w-full shadow-2xl"><div className="w-14 h-14 bg-indigo-500/10 text-indigo-300 rounded-2xl flex items-center justify-center mx-auto mb-4"><KeyRound className="w-7 h-7" /></div><h3 className="text-xl font-bold text-white text-center">Solicitar nova senha</h3><p className="text-slate-400 text-sm mt-2 leading-relaxed text-center">Envie seu pedido para a Central ClinicFlow. Não informe sua senha atual.</p><div className="mt-5 space-y-4"><div><Label className="text-slate-400 uppercase text-[9px] font-bold tracking-[0.2em]">Seu usuário</Label><Input value={recoveryUsername} onChange={e => setRecoveryUsername(e.target.value)} required placeholder="Ex.: minha-clinica" className="mt-2 h-11 bg-slate-800/60 border-slate-700 text-white" /></div><div><Label className="text-slate-400 uppercase text-[9px] font-bold tracking-[0.2em]">Preferência para a senha (opcional)</Label><Input value={recoveryPreference} onChange={e => setRecoveryPreference(e.target.value)} maxLength={120} placeholder="Ex.: fácil de lembrar, com números" className="mt-2 h-11 bg-slate-800/60 border-slate-700 text-white" /><p className="text-[11px] text-slate-500 mt-1.5">Não escreva uma senha desejada; informe apenas uma preferência.</p></div></div><div className="flex gap-2 mt-6"><button type="button" onClick={() => setShowRecoveryNotice(false)} className="h-11 px-4 text-slate-300 font-semibold">Cancelar</button><button disabled={requestingRecovery} type="submit" className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl disabled:opacity-50">{requestingRecovery ? 'Enviando...' : 'Enviar pedido'}</button></div></motion.form></div>}
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800/80 rounded-[2rem] p-6 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 shadow-[0_8px_30px_rgba(16,185,129,0.1)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">Cadastro Concluído!</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Cadastro concluído com sucesso! Deseja fazer login no sistema agora?
              </p>
              
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      name: '',
                      username: prev.username,
                      password: prev.password,
                      confirmPassword: '',
                      phone: ''
                    }));
                    setIsRegister(false);
                    setShowSuccessModal(false);
                    toast.success('Usuário e senha preenchidos automaticamente. Clique em "Entrar no Sistema".');
                  }}
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-[0_4px_15px_rgba(99,102,241,0.2)] transition-all flex items-center justify-center cursor-pointer active:scale-[0.98]"
                >
                  Sim
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessModal(false);
                  }}
                  className="w-full h-12 bg-slate-800 hover:bg-slate-700/80 text-slate-300 font-semibold rounded-xl border border-slate-700/55 transition-all flex items-center justify-center cursor-pointer active:scale-[0.98]"
                >
                  Não
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
