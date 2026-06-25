import React, { useState } from 'react';
import { useStore } from '../store';
import { motion } from 'motion/react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Target, 
  MessageSquare, 
  Phone, 
  ChevronRight, 
  Plus, 
  Timer, 
  TrendingUp,
  BrainCircuit,
  UserPlus
} from 'lucide-react';
import { cn } from '../lib/utils';

export function Comercial() {
  const { opportunities, patients } = useStore();
  const [activeStage, setActiveStage] = useState('todos');

  const stages = [
    { name: 'lead', icon: UserPlus, color: 'bg-blue-500' },
    { name: 'contatado', icon: MessageSquare, color: 'bg-amber-500' },
    { name: 'agendamento', icon: Timer, color: 'bg-indigo-500' },
    { name: 'pós-venda', icon: TrendingUp, color: 'bg-green-500' }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="p-6 space-y-8 max-w-[1600px] mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic">Funil Comercial / CRM</h1>
          <p className="text-slate-500">Gestão de leads e conversão de novos protocolos.</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-11 px-6 shadow-lg shadow-indigo-200">
          <Plus className="w-5 h-5 mr-2" />
          Nova oportunidade
        </Button>
      </div>

      <motion.div 
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.08 } }
        }}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {stages.map((stage) => (
          <motion.div
            key={stage.name}
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
            }}
            whileHover={{ y: -4 }}
          >
            <Card className="p-6 bg-white border-slate-200 rounded-[2rem] shadow-sm relative group overflow-hidden border-b-4 border-b-transparent hover:border-b-indigo-500 transition-all cursor-pointer h-full select-none">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-300">
                <stage.icon className="w-16 h-16 text-indigo-500" />
              </div>
              <div className="relative">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 transition-transform group-hover:rotate-12", stage.color)}>
                  <stage.icon className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-slate-900 italic tracking-tight capitalize">{stage.name}</h3>
                <p className="text-slate-500 text-sm font-bold mt-1">4 oportunidades</p>
                <p className="text-indigo-600 text-lg font-mono font-black mt-2">R$ 12.400,00</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white border-slate-200 rounded-[2rem] shadow-sm overflow-hidden p-6">
            <h3 className="text-lg font-black text-slate-900 italic mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              Próximas ações recomendadas
            </h3>
            
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="group p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center font-black italic text-indigo-600 text-xl border border-slate-100 uppercase">
                      m
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm italic tracking-tight capitalize">Maria Ferreira</h4>
                      <p className="text-xs text-slate-500">Lead vindo do Instagram • Interesse: Botox</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-white text-[9px] font-bold border-amber-200 text-amber-600 italic">
                      Aguardando retorno
                    </Badge>
                    <Button size="icon" variant="ghost" className="rounded-xl text-indigo-600 hover:bg-white hover:shadow-sm">
                      <MessageSquare className="w-5 h-5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="rounded-xl text-indigo-600 hover:bg-white hover:shadow-sm">
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-8 bg-slate-950 border-slate-800 rounded-[2rem] shadow-2xl relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 p-8 opacity-20">
              <BrainCircuit className="w-24 h-24 text-indigo-500 animate-pulse" />
            </div>
            <div className="relative space-y-6">
              <Badge className="bg-indigo-600 text-white font-black italic border-none px-3 py-1 uppercase">IA Copilot</Badge>
              <h3 className="text-2xl font-black italic leading-tight">Sugestão Comercial do Dia</h3>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">
                Detectamos uma alta taxa de abandono no estágio de "interesse" para procedimentos de preenchimento. Recomendamos disparar um protocolo de "resultados reais" via WhatsApp para os 5 leads parados há mãos de 3 dias.
              </p>
              <Button className="w-full bg-white text-slate-900 hover:bg-slate-200 font-bold rounded-xl h-12 shadow-[0_0_20px_rgba(255,255,255,0.2)] italic">
                Executar protocolo
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
