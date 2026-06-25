import { Card, CardContent } from '../components/ui/card';

export function EmConstrucao({ modulo }: { modulo: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <span className="text-2xl text-slate-400">🚧</span>
      </div>
      <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">Módulo {modulo}</h2>
      <p className="text-slate-500 max-w-md">Esta funcionalidade está em construção. Em breve você poderá gerenciar sua clínica de forma ainda mais completa.</p>
    </div>
  );
}
