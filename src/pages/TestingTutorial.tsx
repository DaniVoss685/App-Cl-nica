import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { CheckCircle2, PlayCircle, Info, Beaker } from 'lucide-react';

export function TestingTutorial() {
  const tests = [
    {
      title: 'Tutorial e Guia do Usuário',
      description: 'Como explorar as principais funcionalidades da plataforma.',
      steps: [
        'Acesse o dashboard principal para ver a visão geral.',
        'Use o menu lateral para navegar entre as seções.',
        'Procure pelo botão de Ajuda (em breve) para o guia interativo.'
      ]
    },
    {
      title: 'Funil Comercial (CRM) e Drag & Drop',
      description: 'Como testar a movimentação e edição de leads.',
      steps: [
        'Vá para a página "Comercial".',
        'Clique em "Nova Oportunidade" para criar um lead de teste.',
        'Clique no NOME do paciente no card para abrir o modal de edição.',
        'Adicione notas e altere o valor, depois salve.',
        'Clique e segure em um card de lead e arraste para outra coluna.',
        'Verifique se os KPIs no topo (Leads no Mês, Conversão) são atualizados em tempo real.'
      ]
    },
    {
      title: 'Ações Inteligentes da IA',
      description: 'Como testar as recomendações geradas por inteligência artificial.',
      steps: [
        'No Dashboard, localize a seção "Ações Recomendadas pela IA".',
        'Clique em "Recalcular" para forçar a IA a analisar os dados atuais.',
        'Verifique se novos insights (como risco de abandono ou oportunidades) aparecem.',
        'Teste os botões de ação fixados em cada insight (ex: "Enviar WhatsApp").'
      ]
    },
    {
      title: 'Prontuários e Evoluções',
      description: 'Como testar o histórico clínico e filtros.',
      steps: [
        'Vá em "Prontuários".',
        'Clique em "Nova Evolução".',
        'Selecione um paciente, profissional e descreva o registro.',
        'Salve e verifique se o novo item aparece no topo da lista.',
        'Use o filtro de "Tipo" (Evoluções, Avaliações) para testar a organização da lista.'
      ]
    },
    {
      title: 'Gestão de Pacotes e Protocolos',
      description: 'Como testar a edição de protocolos e execução.',
      steps: [
        'Vá em "Pacotes".',
        'Clique em qualquer card na coluna "Protocolos Disponíveis" para editar o pacote.',
        'Verifique se o contador "Pacotes Ativos" reflete o número real de pacotes no sistema.',
        'Na seção "Execução", clique nos ícones de Calendário ou Clipe.',
        'Verifique se as notificações de feedback aparecem.'
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
          <Beaker className="w-3.5 h-3.5" /> Laboratório de Testes
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Guia de Validação das Novas Funcionalidades</h1>
        <p className="text-slate-500 max-w-2xl mx-auto italic">
          Siga este roteiro para garantir que todas as implementações estão funcionando perfeitamente em seu ambiente.
        </p>
      </div>

      <div className="grid gap-6">
        {tests.map((test, i) => (
          <Card key={i} className="border-slate-100 shadow-sm overflow-hidden group hover:border-indigo-200 transition-all">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                  <PlayCircle className="w-5 h-5 text-indigo-500" />
                  {test.title}
                </CardTitle>
                <Badge variant="outline" className="bg-white">Passo a Passo</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-600 mb-4 font-medium">{test.description}</p>
              <div className="space-y-3">
                {test.steps.map((step, si) => (
                  <div key={si} className="flex gap-3 items-start text-xs text-slate-500 leading-relaxed">
                    <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-bold">
                      {si + 1}
                    </div>
                    <span className="pt-0.5">{step}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-50 flex items-center gap-2 text-[10px] text-slate-400">
                <Info className="w-3 h-3" />
                <span>Este é um roteiro para validação manual. Caso encontre inconsistências, verifique o console do navegador.</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="p-6 bg-slate-900 rounded-2xl text-white flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-lg font-bold">Tudo Pronto para o Próximo Nível?</h3>
          <p className="text-slate-400 text-sm">Cada clique é uma oportunidade de encantar seus pacientes.</p>
        </div>
        <Button className="bg-white text-slate-900 hover:bg-slate-100 font-bold">
          <CheckCircle2 className="mr-2 w-4 h-4" /> Concluir Revisão
        </Button>
      </div>
    </div>
  );
}
