import React, { useState } from 'react';
import { useStore } from '../store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { 
  Building2, 
  Stethoscope, 
  ChevronRight, 
  Sparkles, 
  Target, 
  Zap, 
  CheckCircle2, 
  ShieldCheck,
  BrainCircuit,
  LayoutDashboard
} from 'lucide-react';
import { cn } from '../lib/utils';

const steps = [
  {
    title: "Bem-vindas ao aplicativo das suas finanças",
    subtitle: "Seu negócio operando com inteligência de nível Stark.",
    icon: Sparkles
  },
  {
    title: "Sua Identidade",
    subtitle: "Como devemos chamar sua empresa ou negócio?",
    icon: Building2
  },
  {
    title: "Especialidade",
    subtitle: "Qual o foco principal do seu negócio?",
    icon: Stethoscope
  },
  {
    title: "Configuração do Jarvis",
    subtitle: "Ativar protocolos de análise preditiva e automação?",
    icon: BrainCircuit
  }
];

export function Onboarding() {
  const setOnboarded = useStore(state => state.setOnboarded);
  const startTour = useStore(state => state.startTour);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    activateAI: true
  });
  const [isCustomType, setIsCustomType] = useState(false);
  const [customType, setCustomType] = useState('');

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      const finalData = {
        ...formData,
        type: isCustomType ? customType : formData.type
      };
      setOnboarded(finalData);
      startTour(0);
    }
  };

  const CurrentIcon = steps[step].icon;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.5)_1px,transparent_1px)] bg-[size:30px_30px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      
      <div className="relative w-full max-w-xl">
        <div className="mb-12 flex justify-center flex-col items-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.4)] mb-6">
            <LayoutDashboard className="w-10 h-10 text-white" />
          </div>
          <div className="flex gap-2">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  i === step ? "w-8 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" : "w-2 bg-slate-800"
                )}
              />
            ))}
          </div>
        </div>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl p-8 md:p-12 rounded-[2rem] shadow-2xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            {CurrentIcon && <CurrentIcon className="w-32 h-32 text-indigo-500" />}
          </div>

          <div className="relative space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-black text-white title-font italic tracking-tight">
                {steps[step].title}
              </h1>
              <p className="text-slate-400 text-lg">
                {steps[step].subtitle}
              </p>
            </div>

            <div className="py-4">
              {step === 0 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { icon: Zap, text: "Fluxo de Caixa Otimizado por IA", color: "text-amber-400" },
                      { icon: Target, text: "Gestão Comercial Preditiva", color: "text-emerald-400" },
                      { icon: ShieldCheck, text: "Financeiro Blindado", color: "text-blue-400" }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-4 bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
                        <item.icon className={cn("w-6 h-6", item.color)} />
                        <span className="text-slate-200 font-medium">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <Label className="text-slate-400 uppercase text-[10px] font-bold tracking-[0.2em]">Nome da Empresa / Negócio</Label>
                  <Input 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Stark Enterprises"
                    className="h-16 bg-slate-800/50 border-slate-700 text-white text-xl rounded-2xl focus:ring-indigo-500/50 focus:border-indigo-500"
                    autoFocus
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {['Estética', 'Odontologia', 'Medicina', 'Fisioterapia', 'Psicologia', 'Outro'].map((type) => {
                      const isSelected = type === 'Outro' ? isCustomType : (!isCustomType && formData.type === type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            if (type === 'Outro') {
                              setIsCustomType(true);
                              setFormData({ ...formData, type: customType });
                            } else {
                              setIsCustomType(false);
                              setFormData({ ...formData, type });
                            }
                          }}
                          className={cn(
                            "h-20 rounded-2xl border-2 transition-all flex items-center justify-center font-bold",
                            isSelected 
                              ? "bg-indigo-600/20 border-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]" 
                              : "bg-slate-800/30 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                          )}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>

                  {isCustomType && (
                    <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
                      <Label className="text-slate-400 uppercase text-[10px] font-bold tracking-[0.2em]">Sua Profissão / Especialidade</Label>
                      <Input 
                        value={customType}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomType(val);
                          setFormData(prev => ({ ...prev, type: val }));
                        }}
                        placeholder="Ex: Consultor Financeiro"
                        className="h-16 bg-slate-800/50 border-slate-700 text-white text-xl rounded-2xl focus:ring-indigo-500/50 focus:border-indigo-500"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className={cn(
                    "p-6 rounded-3xl border-2 transition-all cursor-pointer flex items-center gap-6",
                    formData.activateAI 
                      ? "bg-indigo-600/10 border-indigo-500/50" 
                      : "bg-slate-800/20 border-slate-800"
                  )}
                  onClick={() => setFormData({...formData, activateAI: !formData.activateAI})}
                  >
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0",
                      formData.activateAI ? "bg-indigo-500 text-white" : "bg-slate-700 text-slate-500"
                    )}>
                      <BrainCircuit className="w-10 h-10" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">Protocolos JARVIS</h3>
                      <p className="text-slate-400 text-sm">IA atuando em tempo real na sua agenda e financeiro.</p>
                    </div>
                    <div className="ml-auto">
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                        formData.activateAI ? "border-indigo-500 bg-indigo-500" : "border-slate-700"
                      )}>
                        {formData.activateAI && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4">
              <Button 
                onClick={nextStep}
                disabled={
                  (step === 1 && !formData.name) ||
                  (step === 2 && (!formData.type || (isCustomType && !customType.trim())))
                }
                className="w-full h-16 bg-indigo-600 hover:bg-indigo-500 text-white text-lg font-bold rounded-2xl shadow-[0_10px_25px_-5px_rgba(79,70,229,0.4)] group"
              >
                {step === steps.length - 1 ? 'Iniciar Protocolos' : 'Continuar'}
                <ChevronRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Button>
              {step === 0 && (
                <p className="text-center mt-6 text-slate-500 text-sm">
                  Ao continuar, você aceita nossos <span className="text-indigo-400 underline cursor-pointer">Termos de Serviço</span>.
                </p>
              )}
            </div>
          </div>
        </Card>

        <div className="mt-8 flex items-center justify-center gap-2 text-slate-600 font-mono text-[10px] uppercase tracking-widest">
          <ShieldCheck className="w-3 h-3" /> Stark Industries Secure Connection — CLINICFLOW_OS v2.4.1
        </div>
      </div>
    </div>
  );
}
