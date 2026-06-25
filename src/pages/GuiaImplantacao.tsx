import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CheckCircle2, Circle } from 'lucide-react';

export function GuiaImplantacao() {
  const steps = [
    { title: 'Cadastrar Clínica', desc: 'Preencha os dados básicos da sua clínica.', completed: true },
    { title: 'Configurar Serviços e Valores', desc: 'Adicione seus serviços, durações e preços base.', completed: true },
    { title: 'Adicionar Profissionais', desc: 'Convide sua equipe e configure os horários de atendimento.', completed: true },
    { title: 'Importar Pacientes', desc: 'Adicione seus pacientes atuais ao sistema.', completed: false },
    { title: 'Configurar Mensagens WhatsApp', desc: 'Ajuste os textos automáticos para confirmação e acompanhamento.', completed: false },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Guia de Implantação</h1>
        <p className="text-slate-500">Siga o passo a passo para extrair o máximo do ClinicFlow AI.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Seu Progresso</CardTitle>
            <span className="font-bold text-indigo-600 text-xl">60%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
            <div className="bg-indigo-600 h-full w-[60%]"></div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {steps.map((step, idx) => (
              <div key={idx} className={`flex gap-4 p-4 rounded-lg border ${step.completed ? 'bg-indigo-50/50 border-indigo-100' : 'bg-white border-slate-200'}`}>
                <div className="shrink-0 mt-0.5">
                  {step.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                  ) : (
                    <Circle className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div>
                  <h3 className={`font-semibold ${step.completed ? 'text-indigo-900' : 'text-slate-900'}`}>{step.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{step.desc}</p>
                </div>
                {!step.completed && (
                  <div className="ml-auto flex items-center">
                    <Button variant="outline" size="sm">Fazer Agora</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
