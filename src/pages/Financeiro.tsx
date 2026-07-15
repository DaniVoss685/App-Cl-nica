import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  startOfMonth,
  startOfWeek
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  HelpCircle,
  Info,
  LineChart as LineChartIcon,
  MinusCircle,
  Pencil,
  PlusCircle,
  Receipt,
  Search,
  Send,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { toast } from 'sonner';

import { useStore } from '../store';
import type { FinancialTransaction } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import { FinanceModal } from '../components/FinanceModal';
import { cn } from '../lib/utils';
import { readFinanceAuditEntries } from '../lib/financeAudit';

type FinanceTab = 'overview' | 'receitas' | 'despesas' | 'carne';
type QuickRange = 'hoje' | 'semana' | 'mes' | '30' | '90' | 'todos';
type CalendarMode = 'dia' | 'semana' | 'mes';
type ScenarioKey = 'conservador' | 'realista' | 'otimista';
type ComputedStatus = 'pago' | 'aberto' | 'atrasado' | 'cancelado';
type StatusFilter = 'todos' | 'pago' | 'aberto' | 'atrasado';
type DocumentFilter = 'todos' | 'nota_fiscal' | 'recibo' | 'nenhum';
type TaxEntityFilter = 'todos' | 'pessoa_fisica' | 'pessoa_juridica';
type ProfessionalFilter = 'todos' | 'none' | string;
type OverviewChartMetric = 'entradas' | 'saidas' | 'ambos';
type SortKey = 'status' | 'description' | 'patientName' | 'dueDate' | 'paymentDate' | 'category' | 'amount';
type SortDirection = 'asc' | 'desc';
type CarneClosingStatus = 'aberto' | 'revisao' | 'fechado' | 'reaberto';
type CarneDetailTab = 'fechamento' | 'simulador' | 'evolucao' | 'bases';
type WhatIfPeriod = 'mes_atual' | 'mes_anterior' | 'ultimos_3_meses';

interface LegalChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  source?: string;
}

interface CarneChecklistTemplateItem {
  id: string;
  label: string;
  basis: string;
  dueBusinessDaysBeforePayment: number;
}

interface CarneClosingHistoryEntry {
  id: string;
  action: CarneClosingStatus;
  at: string;
  reason?: string;
}

interface FinanceRecurringRule {
  id: string;
  description: string;
  type: 'receita' | 'despesa';
  category: string;
  amount: number;
  dueDay: number;
  frequencyMonths: number;
  active: boolean;
}

interface ScenarioSetting {
  receitaPct: number;
  despesaPct: number;
}

interface FinanceScenarioConfig {
  selected: ScenarioKey;
  settings: Record<ScenarioKey, ScenarioSetting>;
}

interface ProjectionEvent {
  id: string;
  date: string;
  description: string;
  type: 'receita' | 'despesa';
  category: string;
  amount: number;
  source: 'real' | 'recorrente';
  transactionId?: string;
  recurringRuleId?: string;
}

const RECURRING_STORAGE_KEY = 'clinic-finance-recurring-rules-v1';
const SCENARIO_STORAGE_KEY = 'clinic-finance-scenarios-v1';
const FINANCE_CATEGORY_STORAGE_KEY = 'clinic-finance-categories-v1';
const CARNE_LEAO_CLOSING_STORAGE_KEY = 'clinic-carne-leao-closing-v1';
const CARNE_LEAO_CHECKLIST_TEMPLATE_STORAGE_KEY = 'clinic-carne-leao-checklist-template-v1';
const IRPF_MONTHLY_TABLE_2025 = [
  { limit: 2428.80, rate: 0, deduction: 0 },
  { limit: 2826.65, rate: 0.075, deduction: 182.16 },
  { limit: 3751.05, rate: 0.15, deduction: 394.16 },
  { limit: 4664.68, rate: 0.225, deduction: 675.49 },
  { limit: Infinity, rate: 0.275, deduction: 908.73 }
] as const;
const IRPF_TABLE_LABEL = 'Tabela progressiva mensal IRPF 2025 (Receita Federal, a partir de maio/2025)';
const IRPF_LEGAL_BASIS = 'Lei 15.191/2025 e orientações da Receita Federal para Carnê-Leão/Livro Caixa.';
const CARNE_LEGAL_BASIS_ITEMS = [
  {
    title: 'Tabela progressiva mensal IRPF',
    updated: 'Receita Federal · atualizado em 27/04/2026',
    source: 'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2025',
    summary: 'Para rendimentos a partir de maio de 2025, a faixa mensal isenta vai até R$ 2.428,80. As faixas seguintes aplicam 7,5%, 15%, 22,5% e 27,5%, com deduções de R$ 182,16, R$ 394,16, R$ 675,49 e R$ 908,73.'
  },
  {
    title: 'Rendimentos sujeitos ao Carnê-Leão',
    updated: 'Receita Federal · atualizado em 18/09/2023',
    source: 'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/carne-leao/rendimentos',
    summary: 'Entram no Carnê-Leão rendimentos tributáveis recebidos de pessoa física ou do exterior, incluindo trabalho sem vínculo empregatício. Para a clínica, o ponto crítico é registrar receitas recebidas de pessoa física com documento fiscal/recibo e data de pagamento correta.'
  },
  {
    title: 'Deduções e Livro Caixa',
    updated: 'Receita Federal · atualizado em 07/07/2023',
    source: 'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/carne-leao/deducoes',
    summary: 'São admitidas deduções como previdência oficial, dependentes, pensão alimentícia judicial/escritura pública e Livro Caixa. No Livro Caixa, despesas de custeio necessárias à receita e à manutenção da fonte produtora devem estar escrituradas e comprovadas.'
  },
  {
    title: 'Pontos de atenção operacional',
    updated: 'Resumo aplicado ao sistema',
    source: 'Conferir com a contabilidade antes da guia oficial',
    summary: 'Despesas do Livro Caixa são limitadas ao rendimento recebido no mês, com transporte de excesso até dezembro no programa oficial. Tíquetes sem identificação, locomoção comum, depreciação e reformas em imóvel próprio têm restrições importantes.'
  }
] as const;

const DEFAULT_CARNE_CHECKLIST_TEMPLATE: CarneChecklistTemplateItem[] = [
  {
    id: 'receitas-documentadas',
    label: 'Receitas pagas com nota fiscal ou recibo conferidos',
    basis: 'Garante que só entram no recorte fiscal as receitas documentadas e recebidas.',
    dueBusinessDaysBeforePayment: 5
  },
  {
    id: 'despesas-dedutiveis',
    label: 'Despesas dedutíveis revisadas por categoria',
    basis: 'Confere Livro Caixa: despesas de custeio necessárias à atividade e marcadas como dedutíveis.',
    dueBusinessDaysBeforePayment: 4
  },
  {
    id: 'comprovantes-baixados',
    label: 'Comprovantes fiscais baixados ou anexados',
    basis: 'Mantém evidência documental para nota, recibo e comprovantes usados na conferência.',
    dueBusinessDaysBeforePayment: 5
  },
  {
    id: 'base-imposto',
    label: 'Base e imposto apurado revisados',
    basis: 'Calcula receitas documentadas menos despesas dedutíveis e aplica a tabela progressiva quando for PF.',
    dueBusinessDaysBeforePayment: 3
  },
  {
    id: 'exportacao-contador',
    label: 'CSV mensal exportado para conferência contábil',
    basis: 'Entrega o recorte revisado para validação final da contabilidade antes da guia oficial.',
    dueBusinessDaysBeforePayment: 2
  }
];

interface LocalFinanceCategory {
  id: string;
  name: string;
  visible: boolean;
  deductible?: boolean;
}

type FinanceCategoryKind = 'receita' | 'despesa';
type FinanceCategoryState = Record<FinanceCategoryKind, LocalFinanceCategory[]>;

const DEFAULT_FINANCE_CATEGORIES: FinanceCategoryState = {
  despesa: [
    'Água & Saneamento',
    'Aluguel / Condomínio',
    'Energia / Luz',
    'Equipamentos / Instrumentos',
    'Fornecedores & Insumos',
    'Impostos & Contabilidade',
    'Internet, Telefone & Link',
    'Limpeza & Copa',
    'Manutenção & Reformas',
    'Marketing & Tráfego Pago',
    'Salários & Pró-labore',
    'Sistemas & Licenças de Software'
  ].map((name, index) => ({ id: `expense-${index}`, name, visible: true })),
  receita: [
    'Consulta / Avaliação',
    'Pacote de Tratamentos',
    'Procedimento Estético',
    'Retorno / Retoque'
  ].map((name, index) => ({ id: `revenue-${index}`, name, visible: true }))
};

const defaultScenarioConfig: FinanceScenarioConfig = {
  selected: 'realista',
  settings: {
    conservador: { receitaPct: -15, despesaPct: 10 },
    realista: { receitaPct: 0, despesaPct: 0 },
    otimista: { receitaPct: 12, despesaPct: -5 }
  }
};

const tabConfig: Array<{ id: FinanceTab; label: string; short: string }> = [
  { id: 'overview', label: 'Resumo', short: 'Resumo' },
  { id: 'receitas', label: 'Receitas', short: 'Receitas' },
  { id: 'despesas', label: 'Despesas', short: 'Despesas' },
  { id: 'carne', label: 'Carnê-Leão', short: 'Carnê' }
];

const carneDetailTabs: Array<{ id: CarneDetailTab; label: string; short: string }> = [
  { id: 'fechamento', label: 'Fechamento', short: 'Fechar' },
  { id: 'simulador', label: 'Simulador', short: 'Simular' },
  { id: 'evolucao', label: 'Evolução mensal', short: 'Evolução' },
  { id: 'bases', label: 'Bases legais', short: 'Bases' }
];

const whatIfPeriodOptions: Array<{ id: WhatIfPeriod; label: string; description: string }> = [
  { id: 'mes_atual', label: 'Mês atual', description: 'Usa as receitas documentadas do mês selecionado.' },
  { id: 'mes_anterior', label: 'Mês anterior', description: 'Usa o mês imediatamente anterior ao selecionado.' },
  { id: 'ultimos_3_meses', label: 'Últimos 3 meses', description: 'Usa a média mensal dos últimos 3 meses.' }
];

const quickRanges: Array<{ id: QuickRange; label: string }> = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'semana', label: 'Esta Semana' },
  { id: 'mes', label: 'Este Mês' },
  { id: '30', label: 'Próximos 30 Dias' },
  { id: '90', label: '90 Dias' },
  { id: 'todos', label: 'Todo Histórico' }
];

const monthOptions = [
  { value: 'todos', label: 'Todos os Meses' },
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' }
];

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'todos', label: 'Todos os Status' },
  { value: 'aberto', label: 'Em aberto' },
  { value: 'pago', label: 'Pago' },
  { value: 'atrasado', label: 'Em atraso' }
];

const documentOptions: Array<{ value: DocumentFilter; label: string }> = [
  { value: 'todos', label: 'Todos os Documentos' },
  { value: 'nota_fiscal', label: 'Nota Fiscal' },
  { value: 'recibo', label: 'Recibo' },
  { value: 'nenhum', label: 'Sem Documento' }
];

const taxEntityOptions: Array<{ value: TaxEntityFilter; label: string }> = [
  { value: 'todos', label: 'PF + PJ' },
  { value: 'pessoa_fisica', label: 'Pessoa Física' },
  { value: 'pessoa_juridica', label: 'Pessoa Jurídica' }
];

const paymentMethodBaseOptions: Array<{ value: string; label: string }> = [
  { value: 'todos', label: 'Todas as Formas' },
  { value: 'pix', label: 'Pix' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartão de crédito', label: 'Cartão de Crédito' },
  { value: 'cartão de débito', label: 'Cartão de Débito' },
  { value: 'boleto', label: 'Boleto Bancário' },
  { value: 'múltiplo', label: 'Múltiplas Formas' },
  { value: 'não especificado', label: 'Não especificado' }
];

const isMissingPaymentMethod = (method?: string) => !method || method === 'não especificado';

const scenarioDescriptions: Record<ScenarioKey, { title: string; description: string }> = {
  conservador: {
    title: 'Conservador',
    description: 'Reduz entradas e aumenta saídas para mostrar um caixa pressionado, útil para antecipar risco.'
  },
  realista: {
    title: 'Realista',
    description: 'Mantém os valores previstos sem ajuste, usando apenas contas abertas e recorrências ativas.'
  },
  otimista: {
    title: 'Otimista',
    description: 'Aumenta entradas ou reduz saídas para testar um cenário de melhor recebimento e menor custo.'
  }
};

function parseDate(dateStr?: string) {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function toISODate(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function startOfDayLocal(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function lastBusinessDayOfMonth(year: number, monthIndex: number) {
  const date = new Date(year, monthIndex + 1, 0);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() - 1);
  }
  return startOfDayLocal(date);
}

function addBusinessDays(date: Date, amount: number) {
  const next = startOfDayLocal(date);
  const step = amount >= 0 ? 1 : -1;
  let remaining = Math.abs(amount);
  while (remaining > 0) {
    next.setDate(next.getDate() + step);
    if (next.getDay() !== 0 && next.getDay() !== 6) remaining -= 1;
  }
  return next;
}

function daysUntil(date: Date, from = new Date()) {
  return Math.ceil((startOfDayLocal(date).getTime() - startOfDayLocal(from).getTime()) / 86400000);
}

function clampDay(year: number, monthIndex: number, day: number) {
  return Math.min(day, new Date(year, monthIndex + 1, 0).getDate());
}

function money(value: number) {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface CarneClosingRecord {
  checked: string[];
  status: CarneClosingStatus;
  closedAt?: string;
  reopenedAt?: string;
  reopenReason?: string;
  history?: CarneClosingHistoryEntry[];
}

function calculateMonthlyIrpf(base: number) {
  const appliedBase = Math.max(0, base);
  const bracket = IRPF_MONTHLY_TABLE_2025.find(row => appliedBase <= row.limit) || IRPF_MONTHLY_TABLE_2025[IRPF_MONTHLY_TABLE_2025.length - 1];
  const tax = Math.max(0, appliedBase * bracket.rate - bracket.deduction);
  return {
    appliedBase,
    rate: bracket.rate,
    deduction: bracket.deduction,
    tax,
    effectiveRate: appliedBase > 0 ? tax / appliedBase : 0
  };
}

function parseMoneyDraft(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function formatMoneyDraft(value: string) {
  if (!value.trim()) return '';
  return money(parseMoneyDraft(value));
}

function normalizeText(value?: string) {
  return String(value || '').trim().toLowerCase();
}

function fiscalDocumentType(tx: FinancialTransaction): Exclude<DocumentFilter, 'todos'> {
  return tx.fiscalDocumentType || 'nenhum';
}

function taxEntity(tx: FinancialTransaction): Exclude<TaxEntityFilter, 'todos'> {
  return tx.taxEntity || 'pessoa_fisica';
}

function taxEntityLabel(value: TaxEntityFilter | FinancialTransaction['taxEntity']) {
  if (value === 'pessoa_juridica') return 'Pessoa Jurídica';
  if (value === 'todos') return 'PF + PJ';
  return 'Pessoa Física';
}

function buildCarneLegalLocalAnswer(question: string) {
  const q = question.toLowerCase();
  const sourceLine = '\n\nFonte: Receita Federal - Carnê-Leão/Livro Caixa.';
  const caution = 'Valide o caso concreto com a contabilidade antes de usar na guia oficial.';

  if (/(combust|gasolina|estacion|ipva|ve[ií]culo|locomo|transporte)/.test(q)) {
    return `Em geral, despesas com transporte, locomoção, combustível, estacionamento, manutenção de veículo, seguro e IPVA não são dedutíveis no Livro Caixa. A exceção citada pela Receita é para representante comercial autônomo, quando essas despesas correrem por conta dele e forem devidamente comprovadas. ${caution}${sourceLine}`;
  }
  if (/(aluguel|energia|luz|[áa]gua|telefone|internet|condom[ií]nio|sala|consult[oó]rio)/.test(q)) {
    return `Em geral, pode entrar como despesa de custeio quando for necessária à atividade profissional, escriturada em Livro Caixa e comprovada. Para imóvel residencial-profissional, a Receita permite deduzir um quinto de despesas como aluguel, energia, água, gás, taxas, impostos, telefone e condomínio quando não for possível separar a parte profissional. ${caution}${sourceLine}`;
  }
  if (/(reforma|conserto|manuten[cç][aã]o|benfeitoria|obra)/.test(q)) {
    return `Depende do imóvel. A Receita informa que consertos, manutenção e reforma em imóvel próprio não são dedutíveis. Benfeitorias em imóvel alugado podem ser dedutíveis se forem compensação contratual do aluguel, escrituradas em Livro Caixa e devidamente comprovadas. ${caution}${sourceLine}`;
  }
  if (/(leasing|arrendamento|deprecia[cç][aã]o|equipamento|mobili[aá]rio|computador)/.test(q)) {
    return `Leasing e depreciação de bens não são dedutíveis no Livro Caixa. Compra de bens duráveis costuma ser aplicação de capital, não despesa de consumo. Só despesas de consumo usadas na atividade/reparos/conservação podem ser dedutíveis quando comprovadas. ${caution}${sourceLine}`;
  }
  if (/(marketing|propaganda|an[úu]ncio|tr[aá]fego|publicidade)/.test(q)) {
    return `Propaganda relacionada à atividade profissional autônoma pode ser dedutível quando for necessária à obtenção da receita, estiver escriturada em Livro Caixa e tiver comprovação adequada. ${caution}${sourceLine}`;
  }
  if (/(congresso|semin[aá]rio|curso|publica[cç][aã]o|livro|roupa|uniforme|jaleco)/.test(q)) {
    return `Publicações, roupas especiais e participação em congressos/seminários podem ser dedutíveis quando forem necessárias à atividade profissional, escrituradas em Livro Caixa e comprovadas. A Receita alerta que despesa com acompanhante em congresso/seminário não é dedutível. ${caution}${sourceLine}`;
  }
  if (/(recibo|ticket|t[ií]quete|comprovante|nota|pdf)/.test(q)) {
    return `A Receita orienta que tíquetes de caixa, recibos não identificados e documentos semelhantes não comprovam despesas de Livro Caixa. Para defender a dedução, mantenha documento identificado, comprovante de pagamento e escrituração coerente com a atividade. ${caution}${sourceLine}`;
  }
  if (/(pessoa jur[ií]dica|pj|empresa|cnpj)/.test(q)) {
    return `Rendimentos recebidos de pessoa jurídica não estão sujeitos ao pagamento do Carnê-Leão. Ainda assim, despesas de Livro Caixa podem ser informadas conforme a regra aplicável, especialmente para autônomo, mas a apuração precisa ser validada na contabilidade. ${caution}${sourceLine}`;
  }
  return `Pela base da Receita, uma despesa só tende a entrar no Livro Caixa quando for necessária à percepção da receita ou à manutenção da fonte produtora, estiver escriturada, comprovada e respeitar o limite mensal do rendimento recebido. Se for locomoção comum, tíquete sem identificação, leasing, depreciação ou reforma em imóvel próprio, a orientação geral é não deduzir. ${caution}${sourceLine}`;
}

function localId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeCategoryName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

function normalizeFinanceCategoryList(rawList: unknown, defaults: LocalFinanceCategory[]) {
  const hasStoredList = Array.isArray(rawList);
  const byId = new Map<string, LocalFinanceCategory>((hasStoredList ? [] : defaults).map(category => [category.id, { ...category }]));
  const incoming = hasStoredList ? rawList : [];

  incoming.forEach((item) => {
    if (typeof item === 'string') {
      const name = normalizeCategoryName(item);
      if (name) {
        const id = localId('cat');
        byId.set(id, { id, name, visible: true });
      }
      return;
    }

    if (!item || typeof item !== 'object') return;
    const candidate = item as Partial<LocalFinanceCategory>;
    const name = normalizeCategoryName(String(candidate.name || ''));
    if (!name) return;
    const id = String(candidate.id || localId('cat'));
    byId.set(id, {
      id,
      name,
      visible: candidate.visible !== false,
      deductible: candidate.deductible === true
    });
  });

  const seenNames = new Set<string>();
  return Array.from(byId.values()).filter((category) => {
    const key = normalizeText(category.name);
    if (!key || seenNames.has(key)) return false;
    seenNames.add(key);
    return true;
  });
}

function normalizeFinanceCategoryState(raw?: Partial<FinanceCategoryState>): FinanceCategoryState {
  return {
    despesa: normalizeFinanceCategoryList(raw?.despesa, DEFAULT_FINANCE_CATEGORIES.despesa),
    receita: normalizeFinanceCategoryList(raw?.receita, DEFAULT_FINANCE_CATEGORIES.receita)
  };
}

function loadFinanceCategoryState(): FinanceCategoryState {
  if (typeof window === 'undefined') return normalizeFinanceCategoryState();
  try {
    const raw = window.localStorage.getItem(FINANCE_CATEGORY_STORAGE_KEY);
    return normalizeFinanceCategoryState(raw ? JSON.parse(raw) : undefined);
  } catch {
    return normalizeFinanceCategoryState();
  }
}

function loadCarneLeaoClosingState(): Record<string, CarneClosingRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(CARNE_LEAO_CLOSING_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(Object.entries(parsed).map(([key, value]) => {
      if (Array.isArray(value)) {
        return [key, { checked: value, status: value.length > 0 ? 'revisao' : 'aberto' }];
      }
      const record = value as Partial<CarneClosingRecord>;
      return [key, {
        checked: Array.isArray(record.checked) ? record.checked : [],
        status: record.status || 'aberto',
        closedAt: record.closedAt,
        reopenedAt: record.reopenedAt,
        reopenReason: record.reopenReason
      }];
    }));
  } catch {
    return {};
  }
}

function saveCarneLeaoClosingState(next: Record<string, CarneClosingRecord>) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CARNE_LEAO_CLOSING_STORAGE_KEY, JSON.stringify(next));
  }
}

function saveFinanceCategoryState(next: FinanceCategoryState) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(FINANCE_CATEGORY_STORAGE_KEY, JSON.stringify(next));
  }
}

function normalizeCarneChecklistTemplate(raw?: unknown): CarneChecklistTemplateItem[] {
  const source = Array.isArray(raw) ? raw : DEFAULT_CARNE_CHECKLIST_TEMPLATE;
  const seen = new Set<string>();
  const normalized = source.map((item, index) => {
    const candidate = item as Partial<CarneChecklistTemplateItem>;
    const id = String(candidate?.id || `checklist-${index}`).trim() || `checklist-${index}`;
    const label = String(candidate?.label || '').trim();
    const due = Number(candidate?.dueBusinessDaysBeforePayment);
    return {
      id,
      label,
      basis: String(candidate?.basis || '').trim(),
      dueBusinessDaysBeforePayment: Number.isFinite(due) ? Math.max(0, Math.min(15, Math.round(due))) : 3
    };
  }).filter(item => {
    if (!item.label || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  return normalized.length > 0 ? normalized : DEFAULT_CARNE_CHECKLIST_TEMPLATE;
}

function loadCarneChecklistTemplate(): CarneChecklistTemplateItem[] {
  if (typeof window === 'undefined') return DEFAULT_CARNE_CHECKLIST_TEMPLATE;
  try {
    const raw = window.localStorage.getItem(CARNE_LEAO_CHECKLIST_TEMPLATE_STORAGE_KEY);
    return normalizeCarneChecklistTemplate(raw ? JSON.parse(raw) : undefined);
  } catch {
    return DEFAULT_CARNE_CHECKLIST_TEMPLATE;
  }
}

function saveCarneChecklistTemplate(next: CarneChecklistTemplateItem[]) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CARNE_LEAO_CHECKLIST_TEMPLATE_STORAGE_KEY, JSON.stringify(normalizeCarneChecklistTemplate(next)));
  }
}

function loadDeductibleFinanceCategories(): LocalFinanceCategory[] {
  return loadFinanceCategoryState().despesa.filter(category => category.deductible === true && category.name.trim());
}

function loadRecurringRules(): FinanceRecurringRule[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECURRING_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadScenarioConfig(): FinanceScenarioConfig {
  if (typeof window === 'undefined') return defaultScenarioConfig;
  try {
    const raw = window.localStorage.getItem(SCENARIO_STORAGE_KEY);
    if (!raw) return defaultScenarioConfig;
    const parsed = JSON.parse(raw);
    const selected: ScenarioKey = ['conservador', 'realista', 'otimista'].includes(parsed.selected)
      ? parsed.selected as ScenarioKey
      : defaultScenarioConfig.selected;
    return {
      selected,
      settings: {
        ...defaultScenarioConfig.settings,
        ...(parsed.settings || {})
      }
    };
  } catch {
    return defaultScenarioConfig;
  }
}

function isPaid(tx: FinancialTransaction) {
  return tx.status === 'pago';
}

function isOpenStatus(status: FinancialTransaction['status']) {
  return status !== 'pago' && status !== 'cancelado';
}

function effectiveDate(tx: FinancialTransaction) {
  return isPaid(tx) && tx.paymentDate ? tx.paymentDate : tx.dueDate;
}

function computedStatus(tx: FinancialTransaction): ComputedStatus {
  if (tx.status === 'pago' || tx.status === 'cancelado') return tx.status;
  const today = startOfDayLocal(new Date());
  const due = startOfDayLocal(parseDate(tx.dueDate));
  return due < today ? 'atrasado' : 'aberto';
}

function statusLabel(status: string) {
  if (status === 'aberto') return 'Em aberto';
  if (status === 'atrasado') return 'Em atraso';
  if (status === 'pago') return 'Pago';
  if (status === 'cancelado') return 'Cancelado';
  return status;
}

function paymentMethodLabel(method?: string) {
  const value = method || 'não especificado';
  if (value === 'transferência') return 'Transferência';
  return paymentMethodBaseOptions.find(option => option.value === value)?.label || value;
}

function tablePaymentMethodLabel(method?: string) {
  if (isMissingPaymentMethod(method)) return '';
  return paymentMethodLabel(method);
}

function tableTransactionPaymentLabel(tx: FinancialTransaction) {
  const label = tablePaymentMethodLabel(tx.paymentMethod);
  if (!label) return '';
  if (tx.paymentMethod === 'cartão de crédito' && tx.cardInstallments && tx.cardInstallments > 1) {
    return `${label} ${tx.cardInstallments}x`;
  }
  return label;
}

function compactPersonName(name?: string) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return parts.join(' ');
  return parts.slice(0, 2).join(' ');
}

function compactProcedureName(name?: string) {
  const normalized = String(name || '').trim().replace(/\s+/g, ' ') || 'Geral';
  if (normalized.length <= 28) return normalized;
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length <= 3) return normalized;
  return `${parts.slice(0, 3).join(' ')}...`;
}

function getRange(range: QuickRange, selectedYear: string, selectedMonth: string) {
  const today = startOfDayLocal(new Date());
  if (range === 'todos') return null;
  if (range === 'hoje') return { start: today, end: today };
  if (range === 'semana') return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
  if (range === '30') return { start: today, end: addDays(today, 30) };
  if (range === '90') return { start: today, end: addDays(today, 90) };

  const year = Number(selectedYear) || today.getFullYear();
  if (selectedMonth === 'todos') {
    return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
  }

  const month = Number(selectedMonth) || today.getMonth() + 1;
  const base = new Date(year, month - 1, 1);
  return { start: startOfMonth(base), end: endOfMonth(base) };
}

function inRange(dateStr: string, range: ReturnType<typeof getRange>) {
  if (!range) return true;
  return isWithinInterval(parseDate(dateStr), { start: range.start, end: range.end });
}

function groupByCategory(transactions: FinancialTransaction[], type: 'receita' | 'despesa', range: ReturnType<typeof getRange>, paidOnly = false) {
  const totals = new Map<string, number>();
  transactions.forEach((tx) => {
    if (tx.type !== type) return;
    if (paidOnly && !isPaid(tx)) return;
    if (!inRange(effectiveDate(tx), range)) return;
    const category = tx.category || 'Geral';
    totals.set(category, (totals.get(category) || 0) + Number(tx.amount || 0));
  });

  return Array.from(totals.entries())
    .map(([name, value]) => ({ name, value }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

function groupByPaymentMethod(transactions: FinancialTransaction[], type: 'receita' | 'despesa') {
  const totals = new Map<string, number>();
  transactions.forEach((tx) => {
    if (tx.type !== type) return;
    const method = tx.paymentMethod || 'não especificado';
    totals.set(method, (totals.get(method) || 0) + Number(tx.amount || 0));
  });

  return Array.from(totals.entries())
    .map(([method, value]) => ({ name: paymentMethodLabel(method), value }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

function sortableValue(tx: FinancialTransaction & { computedStatus?: string; effectiveDate?: string; patientName?: string }, key: SortKey) {
  if (key === 'status') return statusLabel(tx.computedStatus || computedStatus(tx));
  if (key === 'description') return tx.description || '';
  if (key === 'patientName') return tx.patientName || '';
  if (key === 'dueDate') return tx.dueDate || '';
  if (key === 'paymentDate') return tx.paymentDate || '';
  if (key === 'category') return tx.category || 'Geral';
  return Number(tx.amount || 0);
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  align = 'left',
  onSort
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  align?: 'left' | 'right';
  onSort: (key: SortKey) => void;
}) {
  const active = activeKey === sortKey;
  return (
    <th className={cn('p-3 text-[10px] font-black uppercase tracking-widest text-slate-400', align === 'right' && 'text-right')}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn('inline-flex items-center gap-1 rounded-lg px-1.5 py-1 transition-colors hover:bg-slate-100 hover:text-slate-700', align === 'right' && 'justify-end')}
        title={`Ordenar por ${label}`}
      >
        {label}
        {active && <span className="text-[10px] text-indigo-600" aria-hidden="true">{direction === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  );
}

function generateRecurringEvents(rules: FinanceRecurringRule[], start: Date, end: Date): ProjectionEvent[] {
  const events: ProjectionEvent[] = [];
  rules.filter(rule => rule.active).forEach((rule) => {
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const occurrence = new Date(cursor.getFullYear(), cursor.getMonth(), clampDay(cursor.getFullYear(), cursor.getMonth(), rule.dueDay));
      if (occurrence >= start && occurrence <= end) {
        events.push({
          id: `${rule.id}-${toISODate(occurrence)}`,
          date: toISODate(occurrence),
          description: rule.description,
          type: rule.type,
          category: rule.category || 'Recorrente',
          amount: Number(rule.amount || 0),
          source: 'recorrente',
          recurringRuleId: rule.id
        });
      }
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + Math.max(1, rule.frequencyMonths || 1), 1);
    }
  });
  return events;
}

function nextRecurringDate(rule: FinanceRecurringRule) {
  const today = startOfDayLocal(new Date());
  let date = new Date(today.getFullYear(), today.getMonth(), clampDay(today.getFullYear(), today.getMonth(), rule.dueDay));
  if (date < today) {
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + Math.max(1, rule.frequencyMonths || 1), 1);
    date = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), clampDay(nextMonth.getFullYear(), nextMonth.getMonth(), rule.dueDay));
  }
  return toISODate(date);
}

function MetricTile({
  label,
  value,
  hint,
  tone,
  icon: Icon
}: {
  label: string;
  value: string;
  hint: string;
  tone: 'emerald' | 'rose' | 'indigo' | 'amber' | 'slate';
  icon: React.ElementType;
}) {
  const toneClass = {
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    rose: 'text-rose-600 bg-rose-50 border-rose-100',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100',
    slate: 'text-slate-600 bg-slate-50 border-slate-100'
  }[tone];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm min-h-[104px]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-1.5 text-xl font-black italic font-mono text-slate-950">{value}</p>
        </div>
        <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center shrink-0', toneClass)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="mt-2 text-[10px] font-bold text-slate-500">{hint}</p>
    </div>
  );
}

function SectionPanel({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black italic text-slate-950">{title}</h2>
          {subtitle && <p className="text-[11px] font-bold text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function CategoryBars({ data, tone, emptyText }: { data: Array<{ name: string; value: number }>; tone: 'emerald' | 'rose' | 'indigo'; emptyText: string }) {
  const max = Math.max(...data.map(item => item.value), 0);
  const fillClass = tone === 'emerald' ? 'bg-emerald-500' : tone === 'rose' ? 'bg-rose-500' : 'bg-indigo-600';

  if (data.length === 0) {
    return <div className="h-[210px] flex items-center justify-center text-xs font-bold italic text-slate-400">{emptyText}</div>;
  }

  return (
    <div className="space-y-3">
      {data.slice(0, 8).map(item => (
        <div key={item.name} className="space-y-1.5">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="font-black text-slate-800 truncate">{item.name}</span>
            <span className="font-mono font-black text-slate-900 shrink-0">{money(item.value)}</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full', fillClass)} style={{ width: `${max > 0 ? Math.max(5, (item.value / max) * 100) : 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterDropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  minWidth = 'min-w-[150px]',
  searchable = false,
  searchPlaceholder = 'Buscar...'
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  minWidth?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}) {
  const [query, setQuery] = useState('');
  const selected = options.find(option => option.value === value)?.label || 'Todos';
  const filteredOptions = options.filter(option => {
    if (!query.trim()) return true;
    const term = query.trim().toLowerCase();
    return option.label.toLowerCase().includes(term) || option.value.toLowerCase().includes(term);
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className={cn('h-10 rounded-xl text-xs font-bold bg-white border-slate-200 justify-between gap-3', minWidth)}>
          <span className="flex flex-col items-start leading-none min-w-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</span>
            <span className="mt-1 max-w-[150px] truncate text-xs font-black text-slate-900">{selected}</span>
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 bg-white rounded-xl p-1.5 border border-slate-100 shadow-xl z-[200] max-h-[280px] overflow-y-auto">
        {searchable && (
          <div className="relative p-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={event => event.stopPropagation()}
              placeholder={searchPlaceholder}
              className="h-9 rounded-lg border-slate-200 pl-8 text-xs font-bold"
            />
          </div>
        )}
        {filteredOptions.map(option => (
          <DropdownMenuItem
            key={option.value}
            className={cn('rounded-lg p-2 text-xs font-bold cursor-pointer', value === option.value && 'bg-indigo-50 text-indigo-700')}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
        {filteredOptions.length === 0 && (
          <div className="px-3 py-5 text-center text-[11px] font-bold italic text-slate-400">Nenhuma opção encontrada.</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Financeiro() {
  const { finance, patients, professionals, documents, deductibleCategories, addFinance, updateFinance, removeFinance } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as FinanceTab) || 'overview';
  const activeTab: FinanceTab = tabConfig.some(tab => tab.id === initialTab) ? initialTab : 'overview';

  const currentYearStr = format(new Date(), 'yyyy');
  const currentMonthValue = format(new Date(), 'MM');
  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue);
  const [quickRange, setQuickRange] = useState<QuickRange>('mes');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('todos');
  const [categoryFilter, setCategoryFilter] = useState('todos');
  const [patientFilter, setPatientFilter] = useState('todos');
  const [professionalFilter, setProfessionalFilter] = useState<ProfessionalFilter>('todos');
  const [documentFilter, setDocumentFilter] = useState<DocumentFilter>('todos');
  const [taxEntityFilter, setTaxEntityFilter] = useState<TaxEntityFilter>(activeTab === 'carne' ? 'pessoa_fisica' : 'todos');
  const [overviewChartMetric, setOverviewChartMetric] = useState<OverviewChartMetric>('entradas');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'dueDate', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [modalDefaultType, setModalDefaultType] = useState<'receita' | 'despesa'>('receita');
  const [showDeductibleHelp, setShowDeductibleHelp] = useState(false);
  const [financeCategoryState, setFinanceCategoryState] = useState<FinanceCategoryState>(() => loadFinanceCategoryState());
  const [deductibleCategoryDraft, setDeductibleCategoryDraft] = useState('');
  const [deductibleCategoryFilter, setDeductibleCategoryFilter] = useState<'todos' | 'dedutiveis' | 'nao_dedutiveis'>('todos');
  const [editingDeductibleCategoryId, setEditingDeductibleCategoryId] = useState<string | null>(null);
  const [editingDeductibleCategoryName, setEditingDeductibleCategoryName] = useState('');
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('semana');
  const [calendarDate, setCalendarDate] = useState(startOfDayLocal(new Date()));
  const [recurringRules, setRecurringRules] = useState<FinanceRecurringRule[]>(() => loadRecurringRules());
  const [scenarioConfig, setScenarioConfig] = useState<FinanceScenarioConfig>(() => loadScenarioConfig());
  const [financeAuditEntries, setFinanceAuditEntries] = useState(() => readFinanceAuditEntries());
  const [showAuditHistoryModal, setShowAuditHistoryModal] = useState(false);
  const [carneClosingState, setCarneClosingState] = useState<Record<string, CarneClosingRecord>>(() => loadCarneLeaoClosingState());
  const [carneChecklistTemplate, setCarneChecklistTemplate] = useState<CarneChecklistTemplateItem[]>(() => loadCarneChecklistTemplate());
  const [carneChecklistTemplateDraft, setCarneChecklistTemplateDraft] = useState<CarneChecklistTemplateItem[]>(() => loadCarneChecklistTemplate());
  const [carneDetailTab, setCarneDetailTab] = useState<CarneDetailTab>('fechamento');
  const [showCarneChecklistConfigModal, setShowCarneChecklistConfigModal] = useState(false);
  const [showCarneCloseConfirmModal, setShowCarneCloseConfirmModal] = useState(false);
  const [showCarneCloseSuccessModal, setShowCarneCloseSuccessModal] = useState(false);
  const [showCarneReopenModal, setShowCarneReopenModal] = useState(false);
  const [carneReopenReasonDraft, setCarneReopenReasonDraft] = useState('');
  const [simulationRevenueDraft, setSimulationRevenueDraft] = useState('');
  const [simulationExpenseDraft, setSimulationExpenseDraft] = useState('');
  const [simulationRevenuePercent, setSimulationRevenuePercent] = useState(0);
  const [simulationExpensePercent, setSimulationExpensePercent] = useState(0);
  const [simulationRevenuePercentDraft, setSimulationRevenuePercentDraft] = useState('0');
  const [simulationExpensePercentDraft, setSimulationExpensePercentDraft] = useState('0');
  const [simulationWhatIfPeriod, setSimulationWhatIfPeriod] = useState<WhatIfPeriod>('mes_atual');
  const [legalChatInput, setLegalChatInput] = useState('');
  const [legalChatLoading, setLegalChatLoading] = useState(false);
  const [legalChatMessages, setLegalChatMessages] = useState<LegalChatMessage[]>([
    {
      id: 'assistant-initial',
      role: 'assistant',
      text: 'Pode me perguntar se uma despesa tende a entrar no Livro Caixa, como comprovar um gasto ou como a regra do Carnê-Leão se aplica. Vou responder com base nas orientações da Receita Federal e indicar quando precisar validar com a contabilidade.',
      source: 'Receita Federal'
    }
  ]);
  const [recurringDraft, setRecurringDraft] = useState({
    description: '',
    type: 'despesa' as 'receita' | 'despesa',
    category: '',
    amount: '',
    dueDay: '5',
    frequencyMonths: '1'
  });

  const selectedRange = useMemo(() => getRange(quickRange, selectedYear, selectedMonth), [quickRange, selectedYear, selectedMonth]);
  const today = startOfDayLocal(new Date());
  const horizonEnd = addDays(today, 90);

  const availableYears = useMemo(() => {
    const years = new Set<string>([currentYearStr]);
    finance.forEach(tx => {
      const dateStr = effectiveDate(tx);
      if (dateStr?.length >= 4) years.add(dateStr.slice(0, 4));
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [finance, currentYearStr]);

  const decoratedTransactions = useMemo(() => {
    return finance.map(tx => ({
      ...tx,
      computedStatus: computedStatus(tx),
      effectiveDate: effectiveDate(tx),
      patientName: patients.find(patient => patient.id === tx.patientId)?.name || (tx.type === 'receita' ? 'Diversos' : 'Geral'),
      professionalName: professionals.find(professional => professional.id === tx.professionalId)?.name || (tx.professionalId ? 'Profissional removido' : 'Sem profissional')
    }));
  }, [finance, patients, professionals]);

  const fiscalDocumentByTransaction = useMemo(() => {
    const byTransaction = new Map<string, { url?: string; name?: string }>();
    (documents || []).forEach(doc => {
      if (doc.financialTransactionId && doc.url) {
        byTransaction.set(doc.financialTransactionId, { url: doc.url, name: doc.name });
      }
    });
    return byTransaction;
  }, [documents]);

  const paymentMethodOptions = useMemo(() => {
    const options = [...paymentMethodBaseOptions];
    decoratedTransactions.forEach(tx => {
      const method = tx.paymentMethod || 'não especificado';
      if (!options.some(option => option.value === method)) {
        options.push({ value: method, label: method });
      }
    });
    return options;
  }, [decoratedTransactions]);

  const categoryOptions = useMemo(() => {
    const categories = Array.from(new Set(decoratedTransactions.map(tx => tx.category || 'Geral'))).sort();
    return [
      { value: 'todos', label: 'Todas as Categorias' },
      ...categories.map(category => ({ value: category, label: category }))
    ];
  }, [decoratedTransactions]);

  const patientOptions = useMemo(() => {
    return [
      { value: 'todos', label: 'Todos os Pacientes' },
      { value: 'none', label: 'Sem cliente / Diversos' },
      ...patients
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(patient => ({ value: patient.id, label: patient.name }))
    ];
  }, [patients]);

  const professionalOptions = useMemo(() => {
    return [
      { value: 'todos', label: 'Todos os Profissionais' },
      { value: 'none', label: 'Sem profissional' },
      ...professionals
        .filter(professional => professional.active !== false)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        .map(professional => ({ value: professional.id, label: professional.name }))
    ];
  }, [professionals]);

  const deductibleFinanceCategories = useMemo(() => {
    return financeCategoryState.despesa.filter(category => category.deductible === true && category.name.trim());
  }, [financeCategoryState]);

  const deductibleCategoryNames = useMemo(() => {
    return new Set(deductibleFinanceCategories.map(category => normalizeText(category.name)));
  }, [deductibleFinanceCategories]);

  const registeredDeductibleCategories = useMemo(() => {
    const byName = new Map<string, { id: string; name: string; active: boolean; description?: string; source: string }>();
    deductibleFinanceCategories.forEach(category => {
      const key = normalizeText(category.name);
      if (!key) return;
      byName.set(key, {
        id: category.id,
        name: category.name,
        active: category.visible !== false,
        description: 'Categoria financeira marcada como dedutível.',
        source: 'Financeiro'
      });
    });
    deductibleCategories.forEach(category => {
      const key = normalizeText(category.name);
      if (!key || byName.has(key)) return;
      byName.set(key, {
        id: category.id,
        name: category.name,
        active: category.active !== false,
        description: category.description,
        source: 'Carnê-Leão'
      });
    });
    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [deductibleCategories, deductibleFinanceCategories]);

  const isDeductibleExpense = (tx: FinancialTransaction) => {
    if (tx.type !== 'despesa') return false;
    return Boolean(tx.isDeductible || tx.deductibleCategoryId || deductibleCategoryNames.has(normalizeText(tx.category)));
  };

  const filteredTransactions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return decoratedTransactions
      .filter(tx => inRange(tx.effectiveDate, selectedRange))
      .filter(tx => statusFilter === 'todos' || tx.computedStatus === statusFilter)
      .filter(tx => paymentMethodFilter === 'todos' || (tx.paymentMethod || 'não especificado') === paymentMethodFilter)
      .filter(tx => categoryFilter === 'todos' || (tx.category || 'Geral') === categoryFilter)
      .filter(tx => patientFilter === 'todos' || (patientFilter === 'none' ? !tx.patientId : tx.patientId === patientFilter))
      .filter(tx => professionalFilter === 'todos' || (professionalFilter === 'none' ? !tx.professionalId : tx.professionalId === professionalFilter))
      .filter(tx => documentFilter === 'todos' || tx.type !== 'receita' || fiscalDocumentType(tx) === documentFilter)
      .filter(tx => taxEntityFilter === 'todos' || taxEntity(tx) === taxEntityFilter)
      .filter(tx => {
        if (!term) return true;
        return [
          tx.description,
          tx.category,
          tx.paymentMethod,
          tx.patientName,
          tx.professionalName,
          tx.status,
          tx.type,
          fiscalDocumentType(tx),
          taxEntityLabel(taxEntity(tx))
        ].some(value => String(value || '').toLowerCase().includes(term));
      })
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  }, [decoratedTransactions, selectedRange, searchTerm, statusFilter, paymentMethodFilter, categoryFilter, patientFilter, professionalFilter, documentFilter, taxEntityFilter]);

  const rangeTransactions = useMemo(() => decoratedTransactions.filter(tx => inRange(tx.effectiveDate, selectedRange)), [decoratedTransactions, selectedRange]);
  const overdueTransactions = useMemo(() => decoratedTransactions.filter(tx => tx.computedStatus === 'atrasado'), [decoratedTransactions]);

  const periodStats = useMemo(() => {
    const realizedRevenue = filteredTransactions.filter(tx => tx.type === 'receita' && isPaid(tx)).reduce((sum, tx) => sum + tx.amount, 0);
    const realizedExpense = filteredTransactions.filter(tx => tx.type === 'despesa' && isPaid(tx)).reduce((sum, tx) => sum + tx.amount, 0);
    const plannedRevenue = filteredTransactions.filter(tx => tx.type === 'receita' && isOpenStatus(tx.status)).reduce((sum, tx) => sum + tx.amount, 0);
    const plannedExpense = filteredTransactions.filter(tx => tx.type === 'despesa' && isOpenStatus(tx.status)).reduce((sum, tx) => sum + tx.amount, 0);
    return {
      realizedRevenue,
      realizedExpense,
      plannedRevenue,
      plannedExpense,
      realizedBalance: realizedRevenue - realizedExpense,
      projectedBalance: realizedRevenue + plannedRevenue - realizedExpense - plannedExpense
    };
  }, [filteredTransactions]);

  const carneLeaoReport = useMemo(() => {
    const reportEntity = taxEntityFilter === 'todos' ? 'pessoa_fisica' : taxEntityFilter;
    const reportTransactions = filteredTransactions.filter(tx => taxEntity(tx) === reportEntity);
    const paidRevenue = reportTransactions.filter(tx => tx.type === 'receita' && isPaid(tx) && fiscalDocumentType(tx) !== 'nenhum');
    const revenueWithoutDocument = reportTransactions.filter(tx => tx.type === 'receita' && isPaid(tx) && fiscalDocumentType(tx) === 'nenhum');
    const revenueMissingRequiredProof = paidRevenue.filter(tx => {
      const linkedFiscalDocument = fiscalDocumentByTransaction.get(tx.id);
      const hasProof = Boolean(tx.fiscalAttachmentUrl || linkedFiscalDocument?.url);
      const missingNumber = fiscalDocumentType(tx) === 'nota_fiscal' && !tx.fiscalDocumentNumber;
      return !hasProof || missingNumber;
    });
    const deductibleExpenses = reportTransactions.filter(tx => isDeductibleExpense(tx));
    const revenueByDocument = {
      nota_fiscal: paidRevenue.filter(tx => fiscalDocumentType(tx) === 'nota_fiscal').reduce((sum, tx) => sum + tx.amount, 0),
      recibo: paidRevenue.filter(tx => fiscalDocumentType(tx) === 'recibo').reduce((sum, tx) => sum + tx.amount, 0),
      nenhum: 0
    };
    const deductibleByCategory = deductibleExpenses.reduce<Array<{ id: string; name: string; value: number; count: number }>>((acc, tx) => {
      const category = deductibleCategories.find(item => item.id === tx.deductibleCategoryId);
      const id = tx.deductibleCategoryId || tx.category || 'sem-categoria';
      const name = category?.name || tx.category || 'Sem categoria dedutível';
      const current = acc.find(item => item.id === id);
      if (current) {
        current.value += tx.amount;
        current.count += 1;
      } else {
        acc.push({ id, name, value: tx.amount, count: 1 });
      }
      return acc;
    }, []).sort((a, b) => b.value - a.value);
    const deductibleByStatus = {
      pago: deductibleExpenses.filter(tx => isPaid(tx)).reduce((sum, tx) => sum + tx.amount, 0),
      aberto: deductibleExpenses.filter(tx => computedStatus(tx) === 'aberto').reduce((sum, tx) => sum + tx.amount, 0),
      atrasado: deductibleExpenses.filter(tx => computedStatus(tx) === 'atrasado').reduce((sum, tx) => sum + tx.amount, 0)
    };
    const totalRevenue = paidRevenue.reduce((sum, tx) => sum + tx.amount, 0);
    const totalRevenueWithoutDocument = revenueWithoutDocument.reduce((sum, tx) => sum + tx.amount, 0);
    const totalDeductible = deductibleExpenses.reduce((sum, tx) => sum + tx.amount, 0);
    const taxableBase = totalRevenue - totalDeductible;
    const irpfEstimate = reportEntity === 'pessoa_fisica' ? calculateMonthlyIrpf(taxableBase) : null;
    const estimatedTax = irpfEstimate?.tax || 0;
    return {
      reportEntity,
      reportTransactions,
      paidRevenue,
      revenueWithoutDocument,
      revenueMissingRequiredProof,
      deductibleExpenses,
      revenueByDocument,
      deductibleByCategory,
      deductibleByStatus,
      totalRevenue,
      totalRevenueWithoutDocument,
      totalDeductible,
      taxableBase,
      appliedTaxBase: irpfEstimate?.appliedBase || Math.max(0, taxableBase),
      estimatedTaxRate: irpfEstimate?.rate || 0,
      estimatedTaxDeduction: irpfEstimate?.deduction || 0,
      estimatedEffectiveRate: irpfEstimate?.effectiveRate || 0,
      estimatedTax,
      estimatedNetAfterTax: taxableBase - estimatedTax,
      taxBasisLabel: reportEntity === 'pessoa_fisica' ? IRPF_TABLE_LABEL : 'PJ não usa Carnê-Leão; depende do regime tributário da empresa',
      taxLegalBasis: reportEntity === 'pessoa_fisica' ? IRPF_LEGAL_BASIS : 'Não calculado automaticamente: Simples Nacional, Lucro Presumido ou Lucro Real dependem da contabilidade.'
    };
  }, [filteredTransactions, deductibleCategories, deductibleCategoryNames, fiscalDocumentByTransaction, taxEntityFilter]);

  const carneClosingMonth = selectedMonth === 'todos' ? currentMonthValue : selectedMonth;
  const carneClosingKey = `${carneLeaoReport.reportEntity}-${selectedYear}-${carneClosingMonth}`;
  const carneClosingRecord = carneClosingState[carneClosingKey] || { checked: [], status: 'aberto' as CarneClosingStatus };
  const rawCarneClosingChecked = carneClosingRecord.checked || [];
  const selectedClosingYear = Number(selectedYear);
  const selectedClosingMonthIndex = Math.max(0, Number(carneClosingMonth) - 1);
  const carnePaymentDueDate = lastBusinessDayOfMonth(
    selectedClosingMonthIndex === 11 ? selectedClosingYear + 1 : selectedClosingYear,
    (selectedClosingMonthIndex + 1) % 12
  );
  const carneClosingItems = useMemo(() => {
    const detailById: Record<string, string> = {
      'receitas-documentadas': carneLeaoReport.revenueWithoutDocument.length > 0
        ? `${carneLeaoReport.revenueWithoutDocument.length} receita(s) ainda sem documento`
        : 'Sem receitas pagas pendentes de documento',
      'despesas-dedutiveis': `${carneLeaoReport.deductibleExpenses.length} despesa(s) consideradas no recorte`,
      'comprovantes-baixados': carneLeaoReport.revenueMissingRequiredProof.length > 0
        ? `${carneLeaoReport.revenueMissingRequiredProof.length} receita(s) com nota/recibo sem PDF ou número obrigatório`
        : 'PDFs e números obrigatórios conferidos',
      'base-imposto': `Base aplicada ${money(carneLeaoReport.appliedTaxBase)} · imposto ${money(carneLeaoReport.estimatedTax)}`,
      'exportacao-contador': 'Use Exportar CSV após revisar pendências e categorias'
    };
    return carneChecklistTemplate.map(item => {
      const dueDate = addBusinessDays(carnePaymentDueDate, -item.dueBusinessDaysBeforePayment);
      return {
        ...item,
        dueDate,
        detail: detailById[item.id] || `Prazo interno: ${format(dueDate, 'dd/MM')}`
      };
    });
  }, [carneChecklistTemplate, carneLeaoReport.appliedTaxBase, carneLeaoReport.deductibleExpenses.length, carneLeaoReport.estimatedTax, carneLeaoReport.revenueMissingRequiredProof.length, carneLeaoReport.revenueWithoutDocument.length, carnePaymentDueDate]);
  const carneClosingChecked = rawCarneClosingChecked.filter(id => carneClosingItems.some(item => item.id === id));
  const carneClosingComplete = carneClosingItems.length > 0 && carneClosingChecked.length === carneClosingItems.length;
  const carneDocumentsDueDate = carneClosingItems.length > 0
    ? carneClosingItems.reduce((earliest, item) => item.dueDate < earliest ? item.dueDate : earliest, carneClosingItems[0].dueDate)
    : addBusinessDays(carnePaymentDueDate, -5);
  const carneReviewDueDate = carneClosingItems.length > 0
    ? carneClosingItems.reduce((latest, item) => item.dueDate > latest ? item.dueDate : latest, carneClosingItems[0].dueDate)
    : addBusinessDays(carnePaymentDueDate, -3);
  const daysToPaymentDue = daysUntil(carnePaymentDueDate, today);
  const daysToReviewDue = daysUntil(carneReviewDueDate, today);
  const carneDeadlineState = carneClosingRecord.status === 'fechado'
    ? 'closed'
    : daysToPaymentDue < 0
      ? 'overdue'
      : daysToReviewDue < 0
        ? 'review-late'
        : daysToReviewDue <= 2
        ? 'urgent'
        : 'on-track';
  const carneClosingProgress = carneClosingItems.length > 0 ? Math.round((carneClosingChecked.length / carneClosingItems.length) * 100) : 0;
  const carneDeadlineCopy = {
    closed: {
      label: 'Mês fechado',
      title: 'Fechamento concluído',
      description: 'O mês foi fechado para controle interno. Reabra apenas se precisar corrigir documentos ou valores.',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      badgeClassName: 'bg-emerald-600 text-white'
    },
    overdue: {
      label: 'Prazo vencido',
      title: 'O vencimento oficial já passou',
      description: 'Priorize a conferência dos recibos, PDFs e apuração antes de gerar qualquer guia oficial.',
      className: 'border-rose-200 bg-rose-50 text-rose-950',
      badgeClassName: 'bg-rose-600 text-white'
    },
    'review-late': {
      label: 'Revisão atrasada',
      title: 'O prazo interno de conferência já passou',
      description: 'Finalize comprovantes e categorias dedutíveis para chegar ao vencimento oficial com segurança.',
      className: 'border-amber-200 bg-amber-50 text-amber-950',
      badgeClassName: 'bg-amber-600 text-white'
    },
    urgent: {
      label: 'Atenção',
      title: 'Prazo interno chegando',
      description: 'Faltam poucos dias para finalizar a revisão documental antes do vencimento oficial.',
      className: 'border-amber-200 bg-amber-50 text-amber-950',
      badgeClassName: 'bg-amber-500 text-white'
    },
    'on-track': {
      label: carneClosingRecord.status === 'revisao' ? 'Em revisão' : carneClosingRecord.status === 'reaberto' ? 'Reaberto' : 'Aberto',
      title: carneClosingRecord.status === 'revisao' ? 'Fechamento em revisão' : carneClosingRecord.status === 'reaberto' ? 'Mês reaberto para ajustes' : 'Fechamento aberto',
      description: 'Acompanhe o checklist e os prazos internos até fechar o mês.',
      className: 'border-indigo-200 bg-indigo-50 text-indigo-950',
      badgeClassName: 'bg-indigo-600 text-white'
    }
  }[carneDeadlineState];
  const whatIfReference = useMemo(() => {
    const baseMonthDate = new Date(Number(selectedYear), Number(carneClosingMonth) - 1, 1);
    const offsets = simulationWhatIfPeriod === 'ultimos_3_meses' ? [0, -1, -2] : simulationWhatIfPeriod === 'mes_anterior' ? [-1] : [0];
    const monthKeys = offsets.map(offset => format(new Date(baseMonthDate.getFullYear(), baseMonthDate.getMonth() + offset, 1), 'yyyy-MM'));
    const reportEntity = taxEntityFilter === 'todos' ? 'pessoa_fisica' : taxEntityFilter;
    const revenueTotal = decoratedTransactions
      .filter(tx =>
        tx.type === 'receita'
        && isPaid(tx)
        && fiscalDocumentType(tx) !== 'nenhum'
        && tx.effectiveDate
        && monthKeys.some(key => tx.effectiveDate?.startsWith(key))
        && taxEntity(tx) === reportEntity
      )
      .reduce((sum, tx) => sum + tx.amount, 0);
    const expenseTotal = decoratedTransactions
      .filter(tx =>
        isDeductibleExpense(tx)
        && tx.effectiveDate
        && monthKeys.some(key => tx.effectiveDate?.startsWith(key))
        && taxEntity(tx) === reportEntity
      )
      .reduce((sum, tx) => sum + tx.amount, 0);
    const divisor = simulationWhatIfPeriod === 'ultimos_3_meses' ? 3 : 1;
    return {
      label: whatIfPeriodOptions.find(option => option.id === simulationWhatIfPeriod)?.label || 'Mês atual',
      revenueTotal,
      expenseTotal,
      monthlyRevenue: revenueTotal / divisor,
      monthlyExpense: expenseTotal / divisor,
      months: monthKeys
    };
  }, [carneClosingMonth, decoratedTransactions, selectedYear, simulationWhatIfPeriod, taxEntityFilter]);
  const simulationNewRevenue = parseMoneyDraft(simulationRevenueDraft);
  const simulationNewDeduction = parseMoneyDraft(simulationExpenseDraft);
  const simulationPercentRevenue = whatIfReference.monthlyRevenue * (simulationRevenuePercent / 100);
  const simulationPercentExpense = whatIfReference.monthlyExpense * (simulationExpensePercent / 100);
  const simulationRevenue = simulationNewRevenue + simulationPercentRevenue;
  const simulationExpense = simulationNewDeduction + simulationPercentExpense;
  const simulationBaseDelta = simulationRevenue - simulationExpense;
  const simulatedTax = calculateMonthlyIrpf(carneLeaoReport.taxableBase + simulationBaseDelta);
  const simulationTaxDelta = simulatedTax.tax - carneLeaoReport.estimatedTax;
  const simulationNetImpact = simulationRevenue - simulationExpense - simulationTaxDelta;

  const fiscalPendingByPatient = useMemo(() => {
    const byPatient = new Map<string, { id: string; name: string; count: number; total: number; missingDocument: number; missingProof: number }>();
    filteredTransactions.forEach(tx => {
      if (tx.type !== 'receita' || !isPaid(tx)) return;
      const linkedFiscalDocument = fiscalDocumentByTransaction.get(tx.id);
      const hasProof = Boolean(tx.fiscalAttachmentUrl || linkedFiscalDocument?.url);
      const missingDocument = fiscalDocumentType(tx) === 'nenhum';
      const missingProof = fiscalDocumentType(tx) !== 'nenhum' && !hasProof;
      if (!missingDocument && !missingProof) return;

      const id = tx.patientId || 'diversos';
      const name = tx.patientId ? patients.find(patient => patient.id === tx.patientId)?.name || 'Cliente não localizado' : 'Diversos';
      const current = byPatient.get(id) || { id, name, count: 0, total: 0, missingDocument: 0, missingProof: 0 };
      current.count += 1;
      current.total += tx.amount;
      if (missingDocument) current.missingDocument += 1;
      if (missingProof) current.missingProof += 1;
      byPatient.set(id, current);
    });
    return Array.from(byPatient.values()).sort((a, b) => b.total - a.total);
  }, [filteredTransactions, fiscalDocumentByTransaction, patients]);

  const carneMonthlyEvolution = useMemo(() => {
    return monthOptions
      .filter(month => month.value !== 'todos')
      .map(month => {
        const monthTransactions = decoratedTransactions.filter(tx =>
          tx.effectiveDate?.startsWith(`${selectedYear}-${month.value}`)
          && taxEntity(tx) === (taxEntityFilter === 'todos' ? 'pessoa_fisica' : taxEntityFilter)
        );
        const paidRevenue = monthTransactions.filter(tx => tx.type === 'receita' && isPaid(tx) && fiscalDocumentType(tx) !== 'nenhum');
        const missingDocument = monthTransactions.filter(tx => tx.type === 'receita' && isPaid(tx) && fiscalDocumentType(tx) === 'nenhum').length;
        const missingProof = paidRevenue.filter(tx => {
          const linkedFiscalDocument = fiscalDocumentByTransaction.get(tx.id);
          const hasProof = Boolean(tx.fiscalAttachmentUrl || linkedFiscalDocument?.url);
          const missingNumber = fiscalDocumentType(tx) === 'nota_fiscal' && !tx.fiscalDocumentNumber;
          return !hasProof || missingNumber;
        }).length;
        const deductibleExpenses = monthTransactions.filter(tx => isDeductibleExpense(tx));
        const revenueTotal = paidRevenue.reduce((sum, tx) => sum + tx.amount, 0);
        const deductibleTotal = deductibleExpenses.reduce((sum, tx) => sum + tx.amount, 0);
        const base = revenueTotal - deductibleTotal;
        const tax = calculateMonthlyIrpf(base).tax;
        return {
          name: month.label.slice(0, 3),
          month: month.value,
          Receitas: revenueTotal,
          Deduções: deductibleTotal,
          Pendências: missingDocument + missingProof,
          Base: base,
          Imposto: tax,
          Líquido: base - tax
        };
      });
  }, [decoratedTransactions, fiscalDocumentByTransaction, selectedYear, taxEntityFilter]);

  const carneEvolutionSummary = useMemo(() => {
    const totals = carneMonthlyEvolution.reduce((acc, item) => {
      acc.receitas += item.Receitas;
      acc.deducoes += item.Deduções;
      acc.base += item.Base;
      acc.imposto += item.Imposto;
      acc.liquido += item.Líquido;
      acc.pendencias += item.Pendências;
      return acc;
    }, { receitas: 0, deducoes: 0, base: 0, imposto: 0, liquido: 0, pendencias: 0 });
    const byBase = [...carneMonthlyEvolution].sort((a, b) => b.Base - a.Base);
    const byTax = [...carneMonthlyEvolution].sort((a, b) => b.Imposto - a.Imposto);
    const pendingMonths = carneMonthlyEvolution.filter(item => item.Pendências > 0).length;
    return {
      ...totals,
      averageTax: carneMonthlyEvolution.length > 0 ? totals.imposto / carneMonthlyEvolution.length : 0,
      highestBaseMonth: byBase[0],
      highestTaxMonth: byTax[0],
      pendingMonths,
      cleanMonths: carneMonthlyEvolution.length - pendingMonths
    };
  }, [carneMonthlyEvolution]);

  const revenueCategories = useMemo(() => groupByCategory(filteredTransactions, 'receita', null, true), [filteredTransactions]);
  const expenseCategories = useMemo(() => groupByCategory(filteredTransactions, 'despesa', null, false), [filteredTransactions]);
  const revenuePaymentMethods = useMemo(() => groupByPaymentMethod(filteredTransactions, 'receita'), [filteredTransactions]);
  const expensePaymentMethods = useMemo(() => groupByPaymentMethod(filteredTransactions, 'despesa'), [filteredTransactions]);

  const annualFinanceSeries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const annualTransactions = decoratedTransactions
      .filter(tx => tx.effectiveDate?.startsWith(selectedYear))
      .filter(tx => statusFilter === 'todos' || tx.computedStatus === statusFilter)
      .filter(tx => paymentMethodFilter === 'todos' || (tx.paymentMethod || 'não especificado') === paymentMethodFilter)
      .filter(tx => categoryFilter === 'todos' || (tx.category || 'Geral') === categoryFilter)
      .filter(tx => patientFilter === 'todos' || (patientFilter === 'none' ? !tx.patientId : tx.patientId === patientFilter))
      .filter(tx => professionalFilter === 'todos' || (professionalFilter === 'none' ? !tx.professionalId : tx.professionalId === professionalFilter))
      .filter(tx => documentFilter === 'todos' || tx.type !== 'receita' || fiscalDocumentType(tx) === documentFilter)
      .filter(tx => taxEntityFilter === 'todos' || taxEntity(tx) === taxEntityFilter)
      .filter(tx => {
        if (!term) return true;
        return [
          tx.description,
          tx.category,
          tx.paymentMethod,
          tx.patientName,
          tx.professionalName,
          tx.status,
          tx.type,
          fiscalDocumentType(tx),
          taxEntityLabel(taxEntity(tx))
        ].some(value => String(value || '').toLowerCase().includes(term));
      });

    return monthOptions
      .filter(month => month.value !== 'todos')
      .map(month => {
        const monthTransactions = annualTransactions.filter(tx => tx.effectiveDate?.startsWith(`${selectedYear}-${month.value}`));
        const entradas = monthTransactions.filter(tx => tx.type === 'receita').reduce((sum, tx) => sum + tx.amount, 0);
        const saidas = monthTransactions.filter(tx => tx.type === 'despesa').reduce((sum, tx) => sum + tx.amount, 0);
        return {
          name: month.label.slice(0, 3),
          Entradas: entradas,
          Saídas: saidas,
          Saldo: entradas - saidas
        };
      });
  }, [decoratedTransactions, selectedYear, searchTerm, statusFilter, paymentMethodFilter, categoryFilter, patientFilter, professionalFilter, documentFilter, taxEntityFilter]);

  const projectionEvents = useMemo(() => {
    const realEvents: ProjectionEvent[] = finance
      .filter(tx => isOpenStatus(tx.status))
      .filter(tx => {
        const due = parseDate(tx.dueDate);
        return due >= today && due <= horizonEnd;
      })
      .map(tx => ({
        id: tx.id,
        date: tx.dueDate,
        description: tx.description || (tx.type === 'receita' ? 'Conta a Receber' : 'Conta a Pagar'),
        type: tx.type,
        category: tx.category || 'Geral',
        amount: tx.amount,
        source: 'real' as const,
        transactionId: tx.id
      }));
    return [...realEvents, ...generateRecurringEvents(recurringRules, today, horizonEnd)].sort((a, b) => a.date.localeCompare(b.date));
  }, [finance, recurringRules, today, horizonEnd]);

  const initialCashBalance = useMemo(() => {
    return finance
      .filter(tx => isPaid(tx) && parseDate(tx.paymentDate || tx.dueDate) <= today)
      .reduce((sum, tx) => sum + (tx.type === 'receita' ? tx.amount : -tx.amount), 0);
  }, [finance, today]);

  const selectedScenario = scenarioConfig.settings[scenarioConfig.selected];
  const baseProjectionSeries = useMemo(() => {
    let balance = initialCashBalance;
    return eachDayOfInterval({ start: today, end: horizonEnd }).map(day => {
      const date = toISODate(day);
      const events = projectionEvents.filter(event => event.date === date);
      const entradas = events.filter(event => event.type === 'receita').reduce((sum, event) => sum + event.amount, 0);
      const saidas = events.filter(event => event.type === 'despesa').reduce((sum, event) => sum + event.amount, 0);
      balance += entradas - saidas;
      return {
        date,
        name: format(day, 'dd/MM'),
        Entradas: entradas,
        Saídas: saidas,
        Saldo: balance
      };
    });
  }, [initialCashBalance, projectionEvents, today, horizonEnd]);

  const projectionSeries = useMemo(() => {
    let balance = initialCashBalance;
    return eachDayOfInterval({ start: today, end: horizonEnd }).map(day => {
      const date = toISODate(day);
      const events = projectionEvents.filter(event => event.date === date);
      const rawEntradas = events.filter(event => event.type === 'receita').reduce((sum, event) => sum + event.amount, 0);
      const rawSaidas = events.filter(event => event.type === 'despesa').reduce((sum, event) => sum + event.amount, 0);
      const entradas = rawEntradas * (1 + selectedScenario.receitaPct / 100);
      const saidas = rawSaidas * (1 + selectedScenario.despesaPct / 100);
      balance += entradas - saidas;
      return {
        date,
        name: format(day, 'dd/MM'),
        Entradas: entradas,
        Saídas: saidas,
        Saldo: balance,
        SaldoBase: baseProjectionSeries.find(item => item.date === date)?.Saldo || balance
      };
    });
  }, [initialCashBalance, projectionEvents, selectedScenario, today, horizonEnd, baseProjectionSeries]);

  const baseProjectionTotals = useMemo(() => {
    const entradas = baseProjectionSeries.reduce((sum, item) => sum + item.Entradas, 0);
    const saidas = baseProjectionSeries.reduce((sum, item) => sum + item.Saídas, 0);
    const finalBalance = baseProjectionSeries.at(-1)?.Saldo || initialCashBalance;
    return { entradas, saidas, finalBalance };
  }, [baseProjectionSeries, initialCashBalance]);

  const projectionTotals = useMemo(() => {
    const entradas = projectionSeries.reduce((sum, item) => sum + item.Entradas, 0);
    const saidas = projectionSeries.reduce((sum, item) => sum + item.Saídas, 0);
    const finalBalance = projectionSeries.at(-1)?.Saldo || initialCashBalance;
    return { entradas, saidas, finalBalance };
  }, [projectionSeries, initialCashBalance]);

  const simulationImpact = useMemo(() => {
    const receitaDelta = projectionTotals.entradas - baseProjectionTotals.entradas;
    const despesaDelta = projectionTotals.saidas - baseProjectionTotals.saidas;
    const saldoDelta = projectionTotals.finalBalance - baseProjectionTotals.finalBalance;
    return {
      receitaDelta,
      despesaDelta,
      saldoDelta,
      isSimulationMode: selectedScenario.receitaPct !== 0 || selectedScenario.despesaPct !== 0
    };
  }, [projectionTotals, baseProjectionTotals, selectedScenario]);

  const patientsWithDebts = useMemo(() => {
    return patients.map(patient => {
      const pendingTxs = decoratedTransactions.filter(tx => tx.patientId === patient.id && tx.type === 'receita' && isOpenStatus(tx.status));
      const totalPending = pendingTxs.reduce((sum, tx) => sum + tx.amount, 0);
      return { ...patient, pendingTxs, totalPending };
    }).filter(patient => patient.totalPending > 0);
  }, [patients, decoratedTransactions]);

  const calendarEvents = useMemo(() => {
    const realEvents: ProjectionEvent[] = decoratedTransactions
      .filter(tx => isOpenStatus(tx.status))
      .map(tx => ({
        id: tx.id,
        date: tx.dueDate,
        description: tx.description || (tx.type === 'receita' ? 'Conta a Receber' : 'Conta a Pagar'),
        type: tx.type,
        category: tx.category || 'Geral',
        amount: tx.amount,
        source: 'real' as const,
        transactionId: tx.id
      }));
    return [...realEvents, ...generateRecurringEvents(recurringRules, startOfMonth(calendarDate), endOfMonth(calendarDate))];
  }, [decoratedTransactions, recurringRules, calendarDate]);

  const calendarDays = useMemo(() => {
    if (calendarMode === 'dia') return [calendarDate];
    if (calendarMode === 'semana') {
      return eachDayOfInterval({
        start: startOfWeek(calendarDate, { weekStartsOn: 1 }),
        end: endOfWeek(calendarDate, { weekStartsOn: 1 })
      });
    }
    return eachDayOfInterval({ start: startOfMonth(calendarDate), end: endOfMonth(calendarDate) });
  }, [calendarDate, calendarMode]);

  const handleSetTab = (tab: FinanceTab) => {
    if (tab === 'carne' && taxEntityFilter === 'todos') {
      setTaxEntityFilter('pessoa_fisica');
    }
    setSearchParams({ tab });
  };

  const openCreateModal = (type: 'receita' | 'despesa') => {
    setModalDefaultType(type);
    setSelectedTransactionId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tx: FinancialTransaction) => {
    setModalDefaultType(tx.type);
    setSelectedTransactionId(tx.id);
    setIsModalOpen(true);
  };

  const handleFinanceModalOpenChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setFinanceCategoryState(loadFinanceCategoryState());
      setFinanceAuditEntries(readFinanceAuditEntries());
    }
  };

  const persistCarneChecklistTemplate = (next: CarneChecklistTemplateItem[]) => {
    const normalized = normalizeCarneChecklistTemplate(next);
    setCarneChecklistTemplate(normalized);
    setCarneChecklistTemplateDraft(normalized);
    saveCarneChecklistTemplate(normalized);
  };

  const updateCarneChecklistTemplateItem = (id: string, patch: Partial<CarneChecklistTemplateItem>) => {
    setCarneChecklistTemplateDraft(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));
  };

  const addCarneChecklistTemplateItem = () => {
    setCarneChecklistTemplateDraft(prev => [
      ...prev,
      {
        id: localId('carne-check'),
        label: 'Novo item de conferência',
        basis: '',
        dueBusinessDaysBeforePayment: 3
      }
    ]);
  };

  const removeCarneChecklistTemplateItem = (id: string) => {
    if (carneChecklistTemplateDraft.length <= 1) {
      toast.error('Mantenha pelo menos um item no checklist.');
      return;
    }
    setCarneChecklistTemplateDraft(prev => prev.filter(item => item.id !== id));
  };

  const resetCarneChecklistTemplate = () => {
    setCarneChecklistTemplateDraft(DEFAULT_CARNE_CHECKLIST_TEMPLATE);
    toast.message('Checklist padrão carregado. Clique em Salvar para aplicar.');
  };

  const openCarneChecklistConfig = () => {
    setCarneChecklistTemplateDraft(carneChecklistTemplate);
    setShowCarneChecklistConfigModal(true);
  };

  const saveCarneChecklistTemplateDraft = () => {
    const normalized = normalizeCarneChecklistTemplate(carneChecklistTemplateDraft);
    if (normalized.length === 0) {
      toast.error('Informe pelo menos um item com nome.');
      return;
    }
    persistCarneChecklistTemplate(normalized);
    setShowCarneChecklistConfigModal(false);
    toast.success('Checklist e prazos salvos.');
  };

  const updateSimulationPercent = (kind: 'receita' | 'despesa', draft: string) => {
    const sanitized = draft.replace(/[^\d-]/g, '').replace(/(?!^)-/g, '');
    const limitedText = sanitized === '-' ? sanitized : sanitized.slice(0, sanitized.startsWith('-') ? 4 : 3);
    const parsed = Number(limitedText);
    const clamped = Number.isFinite(parsed) ? Math.max(-100, Math.min(100, parsed)) : 0;
    if (kind === 'receita') {
      setSimulationRevenuePercentDraft(limitedText);
      setSimulationRevenuePercent(clamped);
    } else {
      setSimulationExpensePercentDraft(limitedText);
      setSimulationExpensePercent(clamped);
    }
  };

  const commitSimulationPercent = (kind: 'receita' | 'despesa') => {
    if (kind === 'receita') {
      const parsed = Number(simulationRevenuePercentDraft);
      const clamped = Number.isFinite(parsed) ? Math.max(-100, Math.min(100, parsed)) : 0;
      setSimulationRevenuePercent(clamped);
      setSimulationRevenuePercentDraft(String(clamped));
    } else {
      const parsed = Number(simulationExpensePercentDraft);
      const clamped = Number.isFinite(parsed) ? Math.max(-100, Math.min(100, parsed)) : 0;
      setSimulationExpensePercent(clamped);
      setSimulationExpensePercentDraft(String(clamped));
    }
  };

  const setSimulationPercentFromSlider = (kind: 'receita' | 'despesa', value: number) => {
    const clamped = Math.max(-100, Math.min(100, value));
    if (kind === 'receita') {
      setSimulationRevenuePercent(clamped);
      setSimulationRevenuePercentDraft(String(clamped));
    } else {
      setSimulationExpensePercent(clamped);
      setSimulationExpensePercentDraft(String(clamped));
    }
  };

  const markAsPaid = (tx: FinancialTransaction) => {
    if (isMissingPaymentMethod(tx.paymentMethod)) {
      toast.error('Falta selecionar a forma de pagamento antes de dar baixa.');
      openEditModal(tx);
      return;
    }

    if (tx.type === 'receita' && fiscalDocumentType(tx) !== 'nenhum') {
      const linkedFiscalDocument = fiscalDocumentByTransaction.get(tx.id);
      const hasProof = Boolean(tx.fiscalAttachmentUrl || linkedFiscalDocument?.url);
      if (fiscalDocumentType(tx) === 'nota_fiscal' && !tx.fiscalDocumentNumber) {
        toast.error('Informe o número da nota fiscal antes de dar baixa.');
        openEditModal(tx);
        return;
      }
      if (!hasProof) {
        toast.error('Anexe o PDF da nota fiscal ou recibo antes de dar baixa.');
        openEditModal(tx);
        return;
      }
    }
    updateFinance(tx.id, { status: 'pago', paymentDate: toISODate(new Date()) });
    setFinanceAuditEntries(readFinanceAuditEntries());
    toast.success('Lançamento marcado como pago.');
  };

  const deleteTransaction = (tx: FinancialTransaction) => {
    if (!window.confirm('Deseja realmente excluir este lançamento?')) return;
    removeFinance(tx.id);
    setFinanceAuditEntries(readFinanceAuditEntries());
    toast.error('Lançamento excluído.');
  };

  const toggleCarneClosingItem = (itemId: string) => {
    setCarneClosingState(prev => {
      const current = prev[carneClosingKey] || { checked: [], status: 'aberto' as CarneClosingStatus };
      const nextItems = current.checked.includes(itemId)
        ? current.checked.filter(id => id !== itemId)
        : [...current.checked, itemId];
      const nextRecord = { ...current, checked: nextItems, status: current.status === 'aberto' ? 'revisao' as CarneClosingStatus : current.status };
      const next = { ...prev, [carneClosingKey]: nextRecord };
      saveCarneLeaoClosingState(next);
      return next;
    });
  };

  const setCarneClosingStatus = (status: CarneClosingStatus, reason?: string) => {
    setCarneClosingState(prev => {
      const current = prev[carneClosingKey] || { checked: [], status: 'aberto' as CarneClosingStatus };
      const history: CarneClosingHistoryEntry[] = [
        ...(current.history || []),
        {
          id: localId('closing-history'),
          action: status,
          at: new Date().toISOString(),
          reason
        }
      ];
      const nextRecord: CarneClosingRecord = {
        ...current,
        status,
        closedAt: status === 'fechado' ? new Date().toISOString() : current.closedAt,
        reopenedAt: status === 'reaberto' ? new Date().toISOString() : current.reopenedAt,
        reopenReason: status === 'reaberto' ? reason : current.reopenReason,
        history
      };
      const next = { ...prev, [carneClosingKey]: nextRecord };
      saveCarneLeaoClosingState(next);
      return next;
    });
  };

  const closeCarneMonth = () => {
    if (!carneClosingComplete) {
      setShowCarneCloseConfirmModal(true);
      return;
    }
    confirmCarneMonthClose();
  };

  const confirmCarneMonthClose = () => {
    setCarneClosingStatus('fechado');
    setShowCarneCloseConfirmModal(false);
    setShowCarneCloseSuccessModal(true);
    toast.success('Mês fechado para conferência interna.');
  };

  const reopenCarneMonth = () => {
    setCarneReopenReasonDraft(carneClosingRecord.reopenReason || '');
    setShowCarneReopenModal(true);
  };

  const confirmCarneMonthReopen = () => {
    const reason = carneReopenReasonDraft.trim();
    if (!reason) {
      toast.error('Informe o motivo da reabertura do mês.');
      return;
    }
    setCarneClosingStatus('reaberto', reason);
    setShowCarneReopenModal(false);
    setCarneReopenReasonDraft('');
    toast.message('Mês reaberto para ajustes.');
  };

  const sendLegalChatQuestion = async () => {
    const question = legalChatInput.trim();
    if (!question || legalChatLoading) return;

    const userMessage: LegalChatMessage = {
      id: localId('legal-user'),
      role: 'user',
      text: question
    };
    setLegalChatMessages(prev => [...prev, userMessage]);
    setLegalChatInput('');
    setLegalChatLoading(true);

    try {
      const response = await fetch('/api/carne-legal-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      const data = await response.json().catch(() => ({}));
      const text = response.ok && data.text ? String(data.text) : buildCarneLegalLocalAnswer(question);
      setLegalChatMessages(prev => [...prev, {
        id: localId('legal-assistant'),
        role: 'assistant',
        text,
        source: response.ok ? 'IA com contexto Receita Federal' : 'Modo local com base Receita Federal'
      }]);
      if (!response.ok) {
        toast.message('IA fiscal offline; respondi pelo modo local baseado na Receita.');
      }
    } catch {
      setLegalChatMessages(prev => [...prev, {
        id: localId('legal-assistant'),
        role: 'assistant',
        text: buildCarneLegalLocalAnswer(question),
        source: 'Modo local com base Receita Federal'
      }]);
      toast.message('IA fiscal offline; respondi pelo modo local baseado na Receita.');
    } finally {
      setLegalChatLoading(false);
    }
  };

  const persistFinanceCategories = (next: FinanceCategoryState) => {
    setFinanceCategoryState(next);
    saveFinanceCategoryState(next);
  };

  const expenseCategoryCatalog = financeCategoryState.despesa || [];
  const deductibleCategoryCounts = useMemo(() => {
    const deductible = expenseCategoryCatalog.filter(category => category.deductible === true).length;
    return {
      total: expenseCategoryCatalog.length,
      deductible,
      notDeductible: expenseCategoryCatalog.length - deductible
    };
  }, [expenseCategoryCatalog]);
  const filteredExpenseCategoryCatalog = useMemo(() => {
    if (deductibleCategoryFilter === 'dedutiveis') {
      return expenseCategoryCatalog.filter(category => category.deductible === true);
    }
    if (deductibleCategoryFilter === 'nao_dedutiveis') {
      return expenseCategoryCatalog.filter(category => category.deductible !== true);
    }
    return expenseCategoryCatalog;
  }, [deductibleCategoryFilter, expenseCategoryCatalog]);

  const addDeductibleExpenseCategory = () => {
    const name = normalizeCategoryName(deductibleCategoryDraft);
    if (!name) return;
    if (expenseCategoryCatalog.some(category => normalizeText(category.name) === normalizeText(name))) {
      toast.error('Essa categoria ja existe.');
      return;
    }

    persistFinanceCategories({
      ...financeCategoryState,
      despesa: [{ id: localId('expense'), name, visible: true, deductible: true }, ...expenseCategoryCatalog]
    });
    setDeductibleCategoryDraft('');
    toast.success('Categoria dedutivel criada.');
  };

  const toggleExpenseCategoryDeductible = (categoryId: string) => {
    persistFinanceCategories({
      ...financeCategoryState,
      despesa: expenseCategoryCatalog.map(category => (
        category.id === categoryId ? { ...category, deductible: category.deductible !== true } : category
      ))
    });
  };

  const renameExpenseCategory = (category: LocalFinanceCategory) => {
    const name = normalizeCategoryName(editingDeductibleCategoryName);
    if (!name) return;
    if (expenseCategoryCatalog.some(item => item.id !== category.id && normalizeText(item.name) === normalizeText(name))) {
      toast.error('Essa categoria ja existe.');
      return;
    }

    persistFinanceCategories({
      ...financeCategoryState,
      despesa: expenseCategoryCatalog.map(item => item.id === category.id ? { ...item, name } : item)
    });
    setEditingDeductibleCategoryId(null);
    setEditingDeductibleCategoryName('');
    toast.success('Categoria atualizada.');
  };

  const removeExpenseCategory = (category: LocalFinanceCategory) => {
    if (!window.confirm(`Excluir a categoria "${category.name}"?`)) return;
    persistFinanceCategories({
      ...financeCategoryState,
      despesa: expenseCategoryCatalog.filter(item => item.id !== category.id)
    });
    toast.error('Categoria excluida.');
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Status,Tipo,Descricao,Vinculo,Vencimento,Pagamento,Categoria,Metodo,Documento fiscal,Conta fiscal,Valor\r\n';
    filteredTransactions.forEach(tx => {
      const row = [
        tx.computedStatus,
        tx.type,
        tx.description || '',
        tx.patientName,
        tx.dueDate,
        tx.paymentDate || '',
        tx.category || 'Geral',
        tx.paymentMethod || '',
        tx.type === 'receita' ? fiscalDocumentType(tx) : '',
        taxEntityLabel(taxEntity(tx)),
        tx.amount
      ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(',');
      csvContent += `${row}\r\n`;
    });
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `financeiro_${quickRange}_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Arquivo CSV exportado com sucesso.');
  };

  const handleExportCarneLeaoCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Secao,Descricao,Valor,Conta fiscal\r\n';
    [
      ['Resumo', 'Conta fiscal', taxEntityLabel(carneLeaoReport.reportEntity)],
      ['Receitas', 'Nota fiscal', carneLeaoReport.revenueByDocument.nota_fiscal],
      ['Receitas', 'Recibo', carneLeaoReport.revenueByDocument.recibo],
      ['Despesas dedutíveis', 'Pagas', carneLeaoReport.deductibleByStatus.pago],
      ['Despesas dedutíveis', 'Em aberto', carneLeaoReport.deductibleByStatus.aberto],
      ['Despesas dedutíveis', 'Atrasadas', carneLeaoReport.deductibleByStatus.atrasado],
      ['Resumo', 'Total receitas recebidas', carneLeaoReport.totalRevenue],
      ['Resumo', 'Total despesas dedutíveis', carneLeaoReport.totalDeductible],
      ['Resumo', 'Base para conferência', carneLeaoReport.taxableBase]
    ].forEach(row => {
      csvContent += [...row, taxEntityLabel(carneLeaoReport.reportEntity)].map(value => `"${String(value).replace(/"/g, '""')}"`).join(',') + '\r\n';
    });
    carneLeaoReport.deductibleByCategory.forEach(item => {
      csvContent += ['Despesas dedutíveis por categoria', `${item.name} (${item.count})`, item.value, taxEntityLabel(carneLeaoReport.reportEntity)].map(value => `"${String(value).replace(/"/g, '""')}"`).join(',') + '\r\n';
    });
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `carne_leao_${selectedYear}_${selectedMonth}_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Relatório Carnê-Leão exportado.');
  };

  const saveRecurringRules = (rules: FinanceRecurringRule[]) => {
    setRecurringRules(rules);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(RECURRING_STORAGE_KEY, JSON.stringify(rules));
    }
  };

  const saveScenarioConfig = (next: FinanceScenarioConfig) => {
    setScenarioConfig(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(next));
    }
  };

  const addRecurringRule = () => {
    const amount = Number(String(recurringDraft.amount).replace(',', '.'));
    const dueDay = Math.max(1, Math.min(31, Number(recurringDraft.dueDay) || 1));
    const frequencyMonths = Math.max(1, Number(recurringDraft.frequencyMonths) || 1);
    if (!recurringDraft.description.trim() || amount <= 0) {
      toast.error('Informe descrição e valor para a recorrência.');
      return;
    }

    const nextRule: FinanceRecurringRule = {
      id: localId('rec'),
      description: recurringDraft.description.trim(),
      type: recurringDraft.type,
      category: recurringDraft.category.trim() || 'Recorrente',
      amount,
      dueDay,
      frequencyMonths,
      active: true
    };
    saveRecurringRules([nextRule, ...recurringRules]);
    setRecurringDraft({ description: '', type: 'despesa', category: '', amount: '', dueDay: '5', frequencyMonths: '1' });
    toast.success('Recorrência adicionada à projeção.');
  };

  const convertRecurringToLaunch = (rule: FinanceRecurringRule) => {
    addFinance({
      type: rule.type,
      amount: rule.amount,
      dueDate: nextRecurringDate(rule),
      status: 'pendente',
      category: rule.category,
      description: `${rule.description} (recorrente)`,
      paymentSplits: []
    });
    toast.success('Recorrência convertida em lançamento real.');
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const renderTransactionTable = (
    transactions: Array<FinancialTransaction & { computedStatus?: string; effectiveDate?: string; patientName?: string; professionalName?: string }>,
    emptyText: string,
    options: { showLinkColumn?: boolean; categoryLabel?: string; tableType?: 'receita' | 'despesa' } = {}
  ) => {
    const showLinkColumn = options.showLinkColumn !== false;
    const showTypeColumn = options.tableType === 'receita' || options.tableType === 'despesa';
    const typeColumnHeader = options.tableType === 'receita' ? 'Receita' : 'Despesa';
    const categoryHeader = options.categoryLabel || 'Procedimento/Categoria';
    const effectiveSortKey = !showLinkColumn && sortConfig.key === 'patientName' ? 'dueDate' : sortConfig.key;
    const sortedTransactions = [...transactions].sort((a, b) => {
      const aValue = sortableValue(a, effectiveSortKey);
      const bValue = sortableValue(b, effectiveSortKey);
      let result = 0;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        result = aValue - bValue;
      } else {
        result = String(aValue).localeCompare(String(bValue), 'pt-BR', { numeric: true, sensitivity: 'base' });
      }

      return sortConfig.direction === 'asc' ? result : -result;
    });

    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] table-fixed text-left border-collapse">
          <colgroup>
            <col className="w-[86px]" />
            {showTypeColumn && <col className="w-[118px]" />}
            {showLinkColumn && <col className="w-[96px]" />}
            <col className={showLinkColumn ? 'w-[220px]' : 'w-[260px]'} />
            <col className={showLinkColumn ? 'w-[170px]' : 'w-[210px]'} />
            <col className="w-[86px]" />
            <col className="w-[86px]" />
            {!showTypeColumn && <col className="w-[92px]" />}
            <col className="w-[70px]" />
            <col className="w-[104px]" />
            <col className="w-[112px]" />
            <col className="w-[82px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-150 bg-slate-50">
              <SortableHeader label="Status" sortKey="status" activeKey={sortConfig.key} direction={sortConfig.direction} onSort={handleSort} />
              {showTypeColumn && <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{typeColumnHeader}</th>}
              {showLinkColumn && <SortableHeader label="Cliente" sortKey="patientName" activeKey={sortConfig.key} direction={sortConfig.direction} onSort={handleSort} />}
              <SortableHeader label={categoryHeader} sortKey="category" activeKey={sortConfig.key} direction={sortConfig.direction} onSort={handleSort} />
              <SortableHeader label="Descrição" sortKey="description" activeKey={sortConfig.key} direction={sortConfig.direction} onSort={handleSort} />
              <SortableHeader label="Vencimento" sortKey="dueDate" activeKey={sortConfig.key} direction={sortConfig.direction} onSort={handleSort} />
              <SortableHeader label="Pagamento" sortKey="paymentDate" activeKey={sortConfig.key} direction={sortConfig.direction} onSort={handleSort} />
              {!showTypeColumn && <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Fiscal</th>}
              <th className="p-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Comp.</th>
              <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Forma pgto.</th>
              <SortableHeader label="Valor" sortKey="amount" activeKey={sortConfig.key} direction={sortConfig.direction} align="right" onSort={handleSort} />
              <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.map((tx) => {
              const status = tx.computedStatus || computedStatus(tx);
              const linkedFiscalDocument = fiscalDocumentByTransaction.get(tx.id);
              const proofUrl = tx.fiscalAttachmentUrl || linkedFiscalDocument?.url;
              const proofName = tx.fiscalAttachmentName || linkedFiscalDocument?.name || `${tx.description || tx.category || 'comprovante'}.pdf`;
              const fiscalLabel = tx.type === 'receita'
                ? (documentOptions.find(option => option.value === fiscalDocumentType(tx))?.label || 'Sem Documento')
                : (isDeductibleExpense(tx) ? 'Dedutível' : 'Não dedutível');
              return (
                <tr
                  key={tx.id}
                  onClick={() => openEditModal(tx)}
                  className={cn(
                    'border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer',
                    status === 'atrasado' && 'bg-rose-50/30'
                  )}
                >
                  <td className="p-3">
                    <span className={cn(
                      'inline-flex whitespace-nowrap px-2 py-1 rounded-lg text-[9px] font-black border',
                      status === 'pago' && 'bg-emerald-50 text-emerald-700 border-emerald-100',
                      status === 'atrasado' && 'bg-rose-50 text-rose-700 border-rose-100',
                      status !== 'pago' && status !== 'atrasado' && 'bg-amber-50 text-amber-700 border-amber-100'
                    )}>
                      {statusLabel(status)}
                    </span>
                  </td>
                  {showTypeColumn && (
                    <td className="p-3">
                      <span className={cn(
                        'inline-flex rounded-lg border px-2 py-1 text-[9px] font-black uppercase',
                        tx.type === 'receita' && fiscalDocumentType(tx) !== 'nenhum' && 'border-emerald-100 bg-emerald-50 text-emerald-700',
                        tx.type === 'receita' && fiscalDocumentType(tx) === 'nenhum' && 'border-amber-100 bg-amber-50 text-amber-700',
                        tx.type === 'despesa' && isDeductibleExpense(tx) && 'border-rose-100 bg-rose-50 text-rose-700',
                        tx.type === 'despesa' && !isDeductibleExpense(tx) && 'border-slate-150 bg-slate-50 text-slate-500'
                      )}>
                        {fiscalLabel}
                      </span>
                      <p className="mt-1 text-[9px] font-bold uppercase text-slate-400">{taxEntityLabel(taxEntity(tx))}</p>
                    </td>
                  )}
                  {showLinkColumn && (
                    <td className="min-w-0 p-3 text-xs font-bold text-slate-600">
                      <span className="block max-w-full truncate" title={tx.patientName || patients.find(patient => patient.id === tx.patientId)?.name || 'Diversos'}>
                        {compactPersonName(tx.patientName || patients.find(patient => patient.id === tx.patientId)?.name || 'Diversos')}
                      </span>
                    </td>
                  )}
                  <td className="p-3 text-[11px] font-black leading-snug text-slate-700">
                    <span className="block whitespace-normal break-words" title={tx.category || 'Geral'}>{compactProcedureName(tx.category || 'Geral')}</span>
                  </td>
                  <td className="min-w-0 p-3">
                    {tx.description ? (
                      <p
                        className="block max-w-full truncate text-xs font-black text-slate-900"
                        title={tx.description}
                      >
                        {tx.description}
                      </p>
                    ) : (
                      <span className="text-xs font-black text-slate-300">-</span>
                    )}
                    {tx.professionalId && (
                      <p className="mt-1 block max-w-full truncate text-[10px] font-bold text-slate-400" title={tx.professionalName}>
                        {tx.professionalName}
                      </p>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="font-mono text-[11px] font-black text-slate-700">{format(parseDate(tx.dueDate), 'dd/MM/yyyy')}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-mono text-[11px] font-black text-slate-700">{tx.paymentDate ? format(parseDate(tx.paymentDate), 'dd/MM/yyyy') : '-'}</div>
                  </td>
                  {!showTypeColumn && (
                  <td className="p-3">
                    <span className={cn(
                      'inline-flex rounded-lg border px-2 py-1 text-[9px] font-black uppercase',
                      tx.type === 'receita' && fiscalDocumentType(tx) !== 'nenhum' && 'border-emerald-100 bg-emerald-50 text-emerald-700',
                      tx.type === 'receita' && fiscalDocumentType(tx) === 'nenhum' && 'border-amber-100 bg-amber-50 text-amber-700',
                      tx.type === 'despesa' && isDeductibleExpense(tx) && 'border-rose-100 bg-rose-50 text-rose-700',
                      tx.type === 'despesa' && !isDeductibleExpense(tx) && 'border-slate-150 bg-slate-50 text-slate-500'
                    )}>
                      {fiscalLabel}
                    </span>
                    <p className="mt-1 text-[9px] font-bold uppercase text-slate-400">{taxEntityLabel(taxEntity(tx))}</p>
                  </td>
                  )}
                  <td className="p-3 text-center" onClick={event => event.stopPropagation()}>
                    {proofUrl ? (
                      <a
                        href={proofUrl}
                        download={proofName}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-150 text-slate-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                        title="Baixar comprovante"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="text-[11px] font-black text-slate-300">-</span>
                    )}
                  </td>
                  <td className="p-3 text-[11px] font-black leading-snug text-slate-600">{tableTransactionPaymentLabel(tx)}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <span className={cn('inline-flex items-center justify-end whitespace-nowrap font-mono text-sm font-black italic', tx.type === 'receita' ? 'text-emerald-600' : 'text-rose-600')}>
                      {tx.type === 'receita' ? '+' : '-'} {money(tx.amount)}
                    </span>
                  </td>
                  <td className="p-3" onClick={event => event.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-50" disabled={tx.status === 'pago'} onClick={() => markAsPaid(tx)}>
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => openEditModal(tx)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50" onClick={() => deleteTransaction(tx)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={showLinkColumn ? 11 : 10} className="p-10 text-center text-xs font-bold italic text-slate-400">{emptyText}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCalendar = () => {
    const visibleEvents = calendarEvents.filter(event => {
      if (calendarMode === 'dia') return isSameDay(parseDate(event.date), calendarDate);
      if (calendarMode === 'semana') {
        return isWithinInterval(parseDate(event.date), {
          start: startOfWeek(calendarDate, { weekStartsOn: 1 }),
          end: endOfWeek(calendarDate, { weekStartsOn: 1 })
        });
      }
      return event.date.startsWith(format(calendarDate, 'yyyy-MM'));
    });

    const dayCell = (day: Date) => {
      const date = toISODate(day);
      const events = calendarEvents.filter(event => event.date === date);
      const entradas = events.filter(event => event.type === 'receita').reduce((sum, event) => sum + event.amount, 0);
      const saidas = events.filter(event => event.type === 'despesa').reduce((sum, event) => sum + event.amount, 0);
      return (
        <button
          key={date}
          type="button"
          onClick={() => {
            setCalendarDate(day);
            if (calendarMode === 'mes') setCalendarMode('dia');
          }}
          className={cn(
            'min-h-[116px] rounded-xl border border-slate-150 bg-white p-3 text-left hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors',
            isSameDay(day, calendarDate) && 'border-indigo-300 bg-indigo-50/50'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900">{format(day, 'dd')}</span>
            <span className="text-[9px] font-bold text-slate-400">{events.length} itens</span>
          </div>
          <div className="mt-3 space-y-1">
            {entradas > 0 && <div className="text-[10px] font-black text-emerald-600 truncate">+ {money(entradas)}</div>}
            {saidas > 0 && <div className="text-[10px] font-black text-rose-600 truncate">- {money(saidas)}</div>}
            {events.slice(0, 2).map(event => (
              <div key={event.id} className="text-[9px] font-bold text-slate-500 truncate">{event.description}</div>
            ))}
          </div>
        </button>
      );
    };

    return (
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        <SectionPanel
          title="Calendário Financeiro"
          subtitle="Vencimentos a pagar e a receber em visão diária, semanal ou mensal."
          action={
            <div className="flex items-center gap-2">
              {(['dia', 'semana', 'mes'] as CalendarMode[]).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCalendarMode(mode)}
                  className={cn(
                    'h-8 px-3 rounded-lg text-[10px] font-black uppercase border transition-colors',
                    calendarMode === mode ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {mode === 'mes' ? 'Mês' : mode}
                </button>
              ))}
            </div>
          }
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <Button type="button" variant="outline" className="h-9 rounded-lg text-xs font-bold" onClick={() => setCalendarDate(addDays(calendarDate, calendarMode === 'mes' ? -30 : calendarMode === 'semana' ? -7 : -1))}>
              Anterior
            </Button>
            <div className="text-center">
              <p className="text-sm font-black italic text-slate-900 capitalize">{calendarMode === 'mes' ? format(calendarDate, 'MMMM yyyy', { locale: ptBR }) : format(calendarDate, "dd 'de' MMMM yyyy", { locale: ptBR })}</p>
              <p className="text-[10px] font-bold text-slate-400">{visibleEvents.length} lançamentos no recorte</p>
            </div>
            <Button type="button" variant="outline" className="h-9 rounded-lg text-xs font-bold" onClick={() => setCalendarDate(addDays(calendarDate, calendarMode === 'mes' ? 30 : calendarMode === 'semana' ? 7 : 1))}>
              Próximo
            </Button>
          </div>

          <div className={cn('grid gap-2', calendarMode === 'dia' ? 'grid-cols-1' : calendarMode === 'semana' ? 'grid-cols-1 md:grid-cols-7' : 'grid-cols-2 md:grid-cols-4 xl:grid-cols-7')}>
            {calendarDays.map(dayCell)}
          </div>
        </SectionPanel>

        <SectionPanel title="Agenda do Recorte" subtitle="Lista operacional dos vencimentos visóveis.">
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {visibleEvents.map(event => (
              <div key={event.id} className="rounded-xl border border-slate-150 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate">{event.description}</p>
                    <p className="text-[10px] font-bold text-slate-400">{format(parseDate(event.date), 'dd/MM/yyyy')} · {event.category}</p>
                  </div>
                  <span className={cn('font-mono text-xs font-black shrink-0', event.type === 'receita' ? 'text-emerald-600' : 'text-rose-600')}>{event.type === 'receita' ? '+' : '-'} {money(event.amount)}</span>
                </div>
                {event.source === 'recorrente' && <p className="mt-2 text-[9px] font-black uppercase text-indigo-600">Projeção recorrente</p>}
              </div>
            ))}
            {visibleEvents.length === 0 && <p className="py-12 text-center text-xs font-bold italic text-slate-400">Nenhum vencimento neste recorte.</p>}
          </div>
        </SectionPanel>
      </div>
    );
  };

  const renderRecurringControls = () => (
    <SectionPanel title="Recorrências de Projeção" subtitle="Entram no fluxo previsto, mas não viram lançamentos reais automaticamente.">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-5">
        <div className="rounded-xl border border-slate-150 bg-slate-50 p-4 space-y-3">
          <Input className="h-10 rounded-lg bg-white text-xs font-bold" placeholder="Descrição da recorrência" value={recurringDraft.description} onChange={event => setRecurringDraft(prev => ({ ...prev, description: event.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold" value={recurringDraft.type} onChange={event => setRecurringDraft(prev => ({ ...prev, type: event.target.value as 'receita' | 'despesa' }))}>
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </select>
            <Input className="h-10 rounded-lg bg-white text-xs font-bold" placeholder="Categoria" value={recurringDraft.category} onChange={event => setRecurringDraft(prev => ({ ...prev, category: event.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input className="h-10 rounded-lg bg-white text-xs font-bold" placeholder="Valor" type="number" min="0" step="0.01" value={recurringDraft.amount} onChange={event => setRecurringDraft(prev => ({ ...prev, amount: event.target.value }))} />
            <Input className="h-10 rounded-lg bg-white text-xs font-bold" placeholder="Dia" type="number" min="1" max="31" value={recurringDraft.dueDay} onChange={event => setRecurringDraft(prev => ({ ...prev, dueDay: event.target.value }))} />
            <Input className="h-10 rounded-lg bg-white text-xs font-bold" placeholder="Freq." type="number" min="1" value={recurringDraft.frequencyMonths} onChange={event => setRecurringDraft(prev => ({ ...prev, frequencyMonths: event.target.value }))} />
          </div>
          <Button type="button" className="w-full h-10 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase" onClick={addRecurringRule}>
            Adicionar à Projeção
          </Button>
        </div>

        <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
          {recurringRules.map(rule => (
            <div key={rule.id} className="rounded-xl border border-slate-150 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate">{rule.description}</p>
                  <p className="text-[10px] font-bold text-slate-400">Dia {rule.dueDay} · a cada {rule.frequencyMonths} mês(es) · {rule.category}</p>
                </div>
                <span className={cn('font-mono text-xs font-black shrink-0', rule.type === 'receita' ? 'text-emerald-600' : 'text-rose-600')}>{rule.type === 'receita' ? '+' : '-'} {money(rule.amount)}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" className="h-8 rounded-lg text-[10px] font-bold" onClick={() => saveRecurringRules(recurringRules.map(item => item.id === rule.id ? { ...item, active: !item.active } : item))}>
                  {rule.active ? 'Pausar' : 'Ativar'}
                </Button>
                <Button type="button" variant="outline" className="h-8 rounded-lg text-[10px] font-bold" onClick={() => convertRecurringToLaunch(rule)}>
                  Converter em Lançamento
                </Button>
                <Button type="button" variant="ghost" className="h-8 rounded-lg text-[10px] font-bold text-rose-600 hover:bg-rose-50" onClick={() => saveRecurringRules(recurringRules.filter(item => item.id !== rule.id))}>
                  Excluir
                </Button>
              </div>
            </div>
          ))}
          {recurringRules.length === 0 && <p className="py-12 text-center text-xs font-bold italic text-slate-400">Nenhuma recorrência de projeção cadastrada.</p>}
        </div>
      </div>
    </SectionPanel>
  );

  const renderFluxo = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricTile label="Saldo Realizado" value={money(initialCashBalance)} hint="Entrou e saiu de verdade até hoje" tone="slate" icon={WalletCards} />
        <MetricTile label="Entradas Previstas" value={money(baseProjectionTotals.entradas)} hint="Receitas abertas + recorrências ativas" tone="emerald" icon={ArrowUpRight} />
        <MetricTile label="Saídas Previstas" value={money(baseProjectionTotals.saidas)} hint="Despesas abertas + recorrências ativas" tone="rose" icon={ArrowDownRight} />
        <MetricTile label="Saldo Base em 90 Dias" value={money(baseProjectionTotals.finalBalance)} hint="Sem ajuste de cenário" tone={baseProjectionTotals.finalBalance >= 0 ? 'indigo' : 'amber'} icon={LineChartIcon} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">
        <SectionPanel title="Curva de Fluxo Projetado" subtitle="Saldo acumulado diário com lançamentos pendentes e recorrências.">
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projectionSeries}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} interval={9} />
                <YAxis tick={{ fontSize: 10, fontWeight: 700 }} tickFormatter={value => `R$ ${Number(value) / 1000}k`} />
                <Tooltip formatter={(value: number) => money(value)} />
                <Line type="monotone" dataKey="SaldoBase" name="Saldo base" stroke="#0f172a" strokeWidth={3} dot={false} />
                {simulationImpact.isSimulationMode && <Line type="monotone" dataKey="Saldo" name="Saldo simulado" stroke="#f59e0b" strokeWidth={3} strokeDasharray="7 5" dot={false} />}
                <Line type="monotone" dataKey="Entradas" stroke="#059669" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Saídas" stroke="#e11d48" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>

        <SectionPanel title="Cenários" subtitle="Ajustes percentuais simples sobre o previsto.">
          <div className="space-y-4">
            {simulationImpact.isSimulationMode && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-amber-800">Modo simulação ativo</p>
                    <p className="mt-1 text-[11px] font-bold leading-relaxed text-amber-800">
                      Os valores deste bloco são apenas uma simulação. Eles não alteram lançamentos reais, extrato, contas a pagar ou contas a receber.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {(['conservador', 'realista', 'otimista'] as ScenarioKey[]).map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => saveScenarioConfig({ ...scenarioConfig, selected: key })}
                  className={cn(
                    'h-9 rounded-lg text-[10px] font-black uppercase border',
                    scenarioConfig.selected === key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {key}
                </button>
              ))}
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-150 p-4 text-[11px] font-bold text-slate-600 leading-relaxed">
              <p className="text-xs font-black text-slate-900">{scenarioDescriptions[scenarioConfig.selected].title}</p>
              <p className="mt-1">{scenarioDescriptions[scenarioConfig.selected].description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400">Receitas %</span>
                <Input
                  className="h-10 rounded-lg text-xs font-bold"
                  type="number"
                  value={selectedScenario.receitaPct}
                  onChange={event => saveScenarioConfig({
                    ...scenarioConfig,
                    settings: {
                      ...scenarioConfig.settings,
                      [scenarioConfig.selected]: { ...selectedScenario, receitaPct: Number(event.target.value) }
                    }
                  })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400">Despesas %</span>
                <Input
                  className="h-10 rounded-lg text-xs font-bold"
                  type="number"
                  value={selectedScenario.despesaPct}
                  onChange={event => saveScenarioConfig({
                    ...scenarioConfig,
                    settings: {
                      ...scenarioConfig.settings,
                      [scenarioConfig.selected]: { ...selectedScenario, despesaPct: Number(event.target.value) }
                    }
                  })}
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                <p className="text-[10px] font-black uppercase text-emerald-700">Impacto em receitas</p>
                <p className="font-mono text-sm font-black text-emerald-700">{selectedScenario.receitaPct}% · {simulationImpact.receitaDelta >= 0 ? '+' : ''}{money(simulationImpact.receitaDelta)}</p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2">
                <p className="text-[10px] font-black uppercase text-rose-700">Impacto em despesas</p>
                <p className="font-mono text-sm font-black text-rose-700">{selectedScenario.despesaPct}% · {simulationImpact.despesaDelta >= 0 ? '+' : ''}{money(simulationImpact.despesaDelta)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[10px] font-black uppercase text-slate-500">Impacto no saldo em 90 dias</p>
                <p className={cn('font-mono text-sm font-black', simulationImpact.saldoDelta >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                  {simulationImpact.saldoDelta >= 0 ? '+' : ''}{money(simulationImpact.saldoDelta)}
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-150 p-4 text-[11px] font-bold text-slate-500 leading-relaxed">
              O cenário selecionado altera apenas a projeção. Ele não muda lançamentos reais nem cria contas automaticamente.
            </div>
          </div>
        </SectionPanel>
      </div>

    </div>
  );

  const renderInadimplentes = () => {
    const totalPending = patientsWithDebts.reduce((sum, patient) => sum + patient.totalPending, 0);
    const avgDebt = patientsWithDebts.length > 0 ? totalPending / patientsWithDebts.length : 0;

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricTile label="Total Inadimplente" value={money(totalPending)} hint="Receitas abertas por paciente" tone="rose" icon={AlertTriangle} />
          <MetricTile label="Pacientes Devedores" value={`${patientsWithDebts.length}`} hint="Com cobranças pendentes" tone="amber" icon={AlertCircle} />
          <MetricTile label="Média por Cliente" value={money(avgDebt)} hint="Ticket médio em aberto" tone="slate" icon={Target} />
        </div>

        <SectionPanel title="Pacientes Inadimplentes" subtitle="Cobranças em aberto agrupadas por paciente.">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-150 bg-slate-50">
                  <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Paciente</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Cobranças</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Total</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {patientsWithDebts.map(patient => (
                  <tr key={patient.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3">
                      <p className="text-xs font-black text-slate-900">{patient.name}</p>
                      <p className="text-[10px] font-bold text-slate-400">{patient.phone}</p>
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        {patient.pendingTxs.slice(0, 3).map(tx => (
                          <div key={tx.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-[10px] font-bold">
                            <span className="truncate">{tx.description || 'Conta a Receber'}</span>
                            <span className="font-mono text-slate-900 shrink-0">{format(parseDate(tx.dueDate), 'dd/MM')} · {money(tx.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono text-sm font-black text-rose-600">{money(patient.totalPending)}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 rounded-lg text-[10px] font-bold"
                          onClick={() => {
                            const msg = `Olá ${patient.name}, vimos que consta em aberto o valor de ${money(patient.totalPending)} referente aos seus procedimentos. Pode nos confirmar a melhor data para acerto?`;
                            window.open(`https://api.whatsapp.com/send?phone=${patient.phone.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`, '_blank');
                          }}
                        >
                          Cobrar
                        </Button>
                        <Button
                          type="button"
                          className="h-8 rounded-lg bg-slate-900 text-white text-[10px] font-bold"
                          onClick={() => {
                            const tx = patient.pendingTxs[0];
                            if (tx) openEditModal(tx);
                          }}
                        >
                          Dar Baixa
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {patientsWithDebts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-xs font-bold italic text-slate-400">Nenhum paciente inadimplente encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionPanel>
      </div>
    );
  };

  const auditActionLabel = (action: string) => {
    if (action === 'created') return 'Criado';
    if (action === 'updated') return 'Editado';
    if (action === 'paid') return 'Pago';
    if (action === 'deleted') return 'Excluído';
    return action;
  };

  const auditFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      patientId: 'Cliente',
      type: 'Tipo',
      amount: 'Valor',
      dueDate: 'Vencimento',
      paymentDate: 'Data de pagamento',
      status: 'Status',
      paymentMethod: 'Forma de pagamento',
      category: 'Categoria',
      description: 'Descrição',
      fiscalDocumentType: 'Documento fiscal',
      taxEntity: 'Conta fiscal',
      isDeductible: 'Dedutível'
    };
    return labels[field] || field;
  };

  const auditValueLabel = (field: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return 'vazio';
    if (field === 'patientId') return patients.find(patient => patient.id === value)?.name || (value === 'none' ? 'Diversos' : String(value));
    if (field === 'amount') return money(Number(value || 0));
    if (field === 'status') return statusLabel(String(value));
    if (field === 'paymentMethod') return paymentMethodLabel(String(value));
    if (field === 'fiscalDocumentType') return documentOptions.find(option => option.value === value)?.label || String(value);
    if (field === 'taxEntity') return taxEntityLabel(value as TaxEntityFilter);
    if (field === 'isDeductible') return value ? 'Sim' : 'Não';
    if ((field === 'dueDate' || field === 'paymentDate') && typeof value === 'string' && value.includes('-')) {
      return format(parseDate(value), 'dd/MM/yyyy');
    }
    if (field === 'type') return value === 'receita' ? 'Receita' : 'Despesa';
    return String(value);
  };

  const renderAuditEntry = (entry: ReturnType<typeof readFinanceAuditEntries>[number]) => (
    <div key={entry.id} className="rounded-xl border border-slate-150 bg-white px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-slate-900">{entry.summary}</p>
          <p className="mt-0.5 text-[10px] font-bold text-slate-400">
            {entry.patientName || 'Sem cliente'} · {format(new Date(entry.at), 'dd/MM/yyyy HH:mm')}
          </p>
        </div>
        <span className={cn(
          'shrink-0 rounded-lg border px-2 py-1 text-[9px] font-black uppercase',
          entry.action === 'deleted' && 'border-rose-100 bg-rose-50 text-rose-700',
          entry.action === 'paid' && 'border-emerald-100 bg-emerald-50 text-emerald-700',
          entry.action === 'created' && 'border-indigo-100 bg-indigo-50 text-indigo-700',
          entry.action === 'updated' && 'border-amber-100 bg-amber-50 text-amber-700'
        )}>
          {auditActionLabel(entry.action)}
        </span>
      </div>
      {entry.changes && entry.changes.length > 0 && (
        <div className="mt-2 space-y-1">
          {entry.changes.slice(0, 3).map(change => (
            <p key={change.field} className="text-[10px] font-bold text-slate-500">
              <span className="font-black text-slate-700">{auditFieldLabel(change.field)}:</span>{' '}
              {auditValueLabel(change.field, change.before)} · {auditValueLabel(change.field, change.after)}
            </p>
          ))}
          {entry.changes.length > 3 && (
            <p className="text-[10px] font-black text-slate-400">+ {entry.changes.length - 3} alteração{entry.changes.length - 3 === 1 ? '' : 'ões'}</p>
          )}
        </div>
      )}
      {(!entry.changes || entry.changes.length === 0) && entry.action !== 'created' && (
        <p className="mt-2 text-[10px] font-bold text-slate-400">Sem diferença de campos registrada.</p>
      )}
    </div>
  );

  const renderAuditTrail = (limit = 5) => (
    <SectionPanel
      title="Histórico de Alterações"
      subtitle="Últimas mudanças em lançamentos financeiros."
      action={financeAuditEntries.length > limit ? (
        <Button type="button" variant="outline" className="h-8 rounded-lg text-[10px] font-black" onClick={() => setShowAuditHistoryModal(true)}>
          Ver mais
        </Button>
      ) : null}
    >
      <div className="space-y-2">
        {financeAuditEntries.slice(0, limit).map(entry => renderAuditEntry(entry))}
        {financeAuditEntries.length === 0 && (
          <p className="py-10 text-center text-xs font-bold italic text-slate-400">Nenhuma alteração financeira registrada ainda.</p>
        )}
      </div>
    </SectionPanel>
  );

  const renderOverview = () => (
    <div className="space-y-5">
      {false && overdueTransactions.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black text-amber-950">{overdueTransactions.length} lançamentos em atraso exigem atenção</p>
              <p className="text-xs font-bold text-amber-700">Revise contas a pagar, contas a receber e pacientes inadimplentes.</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl border-amber-200 bg-white text-amber-800 text-xs font-bold"
            onClick={() => {
              setStatusFilter('atrasado');
            }}
          >
            Filtrar em atraso
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricTile label="Saldo Atual" value={money(initialCashBalance)} hint="Receitas pagas menos despesas pagas até hoje" tone={initialCashBalance >= 0 ? 'indigo' : 'amber'} icon={WalletCards} />
        <MetricTile label="Receitas a Receber" value={money(periodStats.plannedRevenue)} hint="Entradas em aberto ou em atraso no recorte" tone="emerald" icon={TrendingUp} />
        <MetricTile label="Despesas a Pagar" value={money(periodStats.plannedExpense)} hint="Saídas em aberto ou em atraso no recorte" tone="rose" icon={TrendingDown} />
        <MetricTile label="Saldo Projetado" value={money(initialCashBalance + periodStats.plannedRevenue - periodStats.plannedExpense)} hint="Saldo atual + pendências do recorte" tone={initialCashBalance + periodStats.plannedRevenue - periodStats.plannedExpense >= 0 ? 'indigo' : 'amber'} icon={LineChartIcon} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-5">
        <SectionPanel
          title="Visão Anual"
          subtitle={`Resumo mês a mês de ${selectedYear}; filtros de paciente, profissional, categoria e Carnê-Leão continuam aplicados.`}
          action={
            <div className="flex rounded-xl border border-slate-200 bg-white p-1">
              {[
                { id: 'entradas', label: 'Entradas' },
                { id: 'saidas', label: 'Saídas' },
                { id: 'ambos', label: 'Ambos' }
              ].map(option => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setOverviewChartMetric(option.id as OverviewChartMetric)}
                  className={cn(
                    'h-8 rounded-lg px-3 text-[10px] font-black uppercase transition-colors',
                    overviewChartMetric === option.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="h-[330px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={annualFinanceSeries}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 10, fontWeight: 700 }} tickFormatter={value => `R$ ${Number(value) / 1000}k`} />
                <Tooltip formatter={(value: number) => money(value)} />
                {(overviewChartMetric === 'entradas' || overviewChartMetric === 'ambos') && (
                  <Area type="monotone" dataKey="Entradas" stroke="#059669" fill="#d1fae5" strokeWidth={2} />
                )}
                {(overviewChartMetric === 'saidas' || overviewChartMetric === 'ambos') && (
                  <Area type="monotone" dataKey="Saídas" stroke="#e11d48" fill="#ffe4e6" strokeWidth={2} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>

        <div className="space-y-5">
          <SectionPanel title="Faturamento por Categoria" subtitle="Receitas pagas agrupadas.">
            <CategoryBars data={revenueCategories} tone="indigo" emptyText="Sem receitas pagas no recorte." />
          </SectionPanel>
          <SectionPanel title="Despesas por Categoria" subtitle="Saídas agrupadas por centro de custo.">
            <CategoryBars data={expenseCategories} tone="rose" emptyText="Sem despesas no recorte." />
          </SectionPanel>
        </div>
      </div>
    </div>
  );

  const renderAccountView = (type: 'receita' | 'despesa') => {
    const transactions = filteredTransactions.filter(tx => tx.type === type);
    const open = transactions.filter(tx => tx.computedStatus === 'aberto');
    const paid = transactions.filter(tx => isPaid(tx));
    const late = transactions.filter(tx => tx.computedStatus === 'atrasado');
    const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const title = type === 'receita' ? 'Contas a Receber' : 'Contas a Pagar';

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricTile label="Total do Recorte" value={money(total)} hint={`Todos os lançamentos de ${type === 'receita' ? 'receita' : 'despesa'}`} tone={type === 'receita' ? 'emerald' : 'rose'} icon={type === 'receita' ? ArrowUpRight : ArrowDownRight} />
          <MetricTile label="Em Aberto" value={money(open.reduce((sum, tx) => sum + tx.amount, 0))} hint={`${open.length} contas abertas`} tone="amber" icon={Clock} />
          <MetricTile label="Pagas" value={money(paid.reduce((sum, tx) => sum + tx.amount, 0))} hint={`${paid.length} liquidações`} tone="indigo" icon={CheckCircle2} />
          <MetricTile label="Atrasadas" value={money(late.reduce((sum, tx) => sum + tx.amount, 0))} hint={`${late.length} itens vencidos`} tone="rose" icon={AlertTriangle} />
        </div>

        <SectionPanel title={title} subtitle="Tabela operacional filtrada pelo período e busca atual.">
          {renderTransactionTable(transactions, `Nenhuma ${type === 'receita' ? 'receita' : 'despesa'} encontrada neste recorte.`, { showLinkColumn: type === 'receita', categoryLabel: type === 'receita' ? 'Procedimento' : 'Categoria', tableType: type })}
        </SectionPanel>

        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-5">
          <SectionPanel title={type === 'receita' ? 'Receitas por Categoria' : 'Despesas por Categoria'} subtitle="Distribuição por categoria.">
            <CategoryBars data={type === 'receita' ? revenueCategories : expenseCategories} tone={type === 'receita' ? 'emerald' : 'rose'} emptyText="Sem dados para o recorte." />
          </SectionPanel>
          <SectionPanel title={type === 'receita' ? 'Receitas por Forma de Pagamento' : 'Despesas por Forma de Pagamento'} subtitle="Distribuição por método de liquidação.">
            <CategoryBars data={type === 'receita' ? revenuePaymentMethods : expensePaymentMethods} tone="indigo" emptyText="Sem formas de pagamento no recorte." />
          </SectionPanel>
          <div className="lg:col-span-2 2xl:col-span-1">
            {renderAuditTrail(5)}
          </div>
        </div>
      </div>
    );
  };

  const renderCarneLeao = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricTile label="Receitas Recebidas" value={money(carneLeaoReport.totalRevenue)} hint="Pagas no recorte atual" tone="emerald" icon={TrendingUp} />
        <MetricTile label="Despesas Dedutíveis" value={money(carneLeaoReport.totalDeductible)} hint={`${carneLeaoReport.deductibleExpenses.length} despesas pagas ou abertas`} tone="rose" icon={TrendingDown} />
        <MetricTile label="Base Para Apuração" value={money(carneLeaoReport.taxableBase)} hint="Receitas documentadas menos dedutíveis" tone={carneLeaoReport.taxableBase >= 0 ? 'indigo' : 'amber'} icon={Receipt} />
        <MetricTile label="IRPF Apurado" value={money(carneLeaoReport.estimatedTax)} hint="Pela tabela progressiva mensal" tone="slate" icon={WalletCards} />
      </div>

      {carneLeaoReport.revenueWithoutDocument.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Receitas sem nota/recibo no período</p>
              <p className="mt-1 text-xs font-bold text-amber-950">
                {carneLeaoReport.revenueWithoutDocument.length} receita{carneLeaoReport.revenueWithoutDocument.length === 1 ? '' : 's'} paga{carneLeaoReport.revenueWithoutDocument.length === 1 ? '' : 's'} somando {money(carneLeaoReport.totalRevenueWithoutDocument)} ainda não entra{carneLeaoReport.revenueWithoutDocument.length === 1 ? '' : 'm'} no Carnê-Leão por falta de nota fiscal ou recibo.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {carneDetailTabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCarneDetailTab(tab.id)}
              className={cn(
                'h-11 rounded-xl border px-3 text-[11px] font-black transition-colors',
                carneDetailTab === tab.id ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm' : 'border-slate-150 bg-slate-50 text-slate-500 hover:bg-slate-100'
              )}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.short}</span>
            </button>
          ))}
        </div>
      </div>

      {carneDetailTab === 'fechamento' && (
        <div className="space-y-5">
          <div className={cn('rounded-3xl border p-5 shadow-sm', carneDeadlineCopy.className)}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
                  {carneDeadlineState === 'closed' ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : carneDeadlineState === 'overdue' || carneDeadlineState === 'review-late' ? <AlertTriangle className="h-6 w-6 text-rose-600" /> : <Clock className="h-6 w-6 text-indigo-600" />}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-widest', carneDeadlineCopy.badgeClassName)}>
                      {carneDeadlineCopy.label}
                    </span>
                    <span className="rounded-xl bg-white/70 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                      {monthOptions.find(month => month.value === carneClosingMonth)?.label || carneClosingMonth}/{selectedYear}
                    </span>
                  </div>
                  <h3 className="mt-2 text-xl font-black italic">{carneDeadlineCopy.title}</h3>
                  <p className="mt-1 max-w-2xl text-xs font-bold leading-relaxed">{carneDeadlineCopy.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[520px]">
                <div className="rounded-2xl bg-white/75 px-3 py-2">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Valor a pagar</p>
                  <p className="mt-1 font-mono text-lg font-black">{money(carneLeaoReport.estimatedTax)}</p>
                </div>
                <div className="rounded-2xl bg-white/75 px-3 py-2">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Recibos/PDFs</p>
                  <p className="mt-1 font-mono text-sm font-black">{format(carneDocumentsDueDate, 'dd/MM')}</p>
                </div>
                <div className="rounded-2xl bg-white/75 px-3 py-2">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Apuração</p>
                  <p className="mt-1 font-mono text-sm font-black">{format(carneReviewDueDate, 'dd/MM')}</p>
                </div>
                <div className="rounded-2xl bg-white/75 px-3 py-2">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-70">DARF</p>
                  <p className="mt-1 font-mono text-sm font-black">{format(carnePaymentDueDate, 'dd/MM')}</p>
                </div>
              </div>
            </div>
            {carneDeadlineState !== 'closed' && (
              <p className="mt-4 rounded-2xl bg-white/65 px-4 py-3 text-[11px] font-bold">
                Regra oficial: o Carnê-Leão deve ser pago até o último dia útil do mês seguinte ao recebimento. Use os prazos internos para baixar PDFs, conferir recibos e revisar categorias antes do vencimento.
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Checklist concluído: {carneClosingChecked.length}/{carneClosingItems.length} itens · {carneClosingProgress}%</p>
              <Button type="button" variant="outline" className="h-9 rounded-xl bg-white/70 text-[10px] font-black" onClick={openCarneChecklistConfig}>
                Configurar checklist e prazos
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[0.8fr_1.2fr] gap-5">
            <SectionPanel title="Apuração Oficial do Período" subtitle="Fórmula pela tabela progressiva mensal IRPF; depende dos dados lançados no sistema.">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-150 bg-slate-50 p-3">
                <p className="text-[9px] font-black uppercase text-slate-400">Receitas documentadas</p>
                <p className="mt-1 font-mono text-sm font-black text-emerald-700">{money(carneLeaoReport.totalRevenue)}</p>
              </div>
              <div className="rounded-xl border border-slate-150 bg-slate-50 p-3">
                <p className="text-[9px] font-black uppercase text-slate-400">Despesas dedutíveis</p>
                <p className="mt-1 font-mono text-sm font-black text-rose-600">{money(carneLeaoReport.totalDeductible)}</p>
              </div>
              <div className="rounded-xl border border-slate-150 bg-slate-50 p-3">
                <p className="text-[9px] font-black uppercase text-slate-400">Base oficial aplicada</p>
                <p className="mt-1 font-mono text-sm font-black text-slate-950">{money(carneLeaoReport.appliedTaxBase)}</p>
                <p className="mt-1 text-[9px] font-bold text-slate-400">Faixa: {(carneLeaoReport.estimatedTaxRate * 100).toFixed(1)}% · dedução {money(carneLeaoReport.estimatedTaxDeduction)}</p>
              </div>
              <div className="rounded-xl border border-slate-150 bg-slate-50 p-3">
                <p className="text-[9px] font-black uppercase text-slate-400">IRPF apurado</p>
                <p className="mt-1 font-mono text-sm font-black text-rose-600">{money(carneLeaoReport.estimatedTax)}</p>
                <p className="mt-1 text-[9px] font-bold text-slate-400">Efetiva: {(carneLeaoReport.estimatedEffectiveRate * 100).toFixed(2)}%</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2">
              <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-indigo-700">Base legal e dúvidas</p>
              <p className="flex items-start gap-2 text-[10px] font-bold text-indigo-900">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Base: receitas pagas com nota/recibo menos despesas dedutíveis marcadas no sistema. {carneLeaoReport.taxBasisLabel}. {carneLeaoReport.taxLegalBasis}
                </span>
              </p>
            </div>
            <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
              <p className="text-[10px] font-bold text-amber-900">
                Esta é a apuração completa com os dados disponíveis no app. Ainda não calcula dependentes, INSS, pensão alimentícia, compensações, multa/juros nem regras de PJ.
              </p>
            </div>
          </SectionPanel>

          <SectionPanel
            title="Assistente de Fechamento Mensal"
            subtitle={`${monthOptions.find(month => month.value === carneClosingMonth)?.label || carneClosingMonth}/${selectedYear} · status: ${carneClosingRecord.status.toUpperCase()}`}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {(['aberto', 'revisao', 'fechado', 'reaberto'] as CarneClosingStatus[]).map(status => (
                <span
                  key={status}
                  className={cn(
                    'rounded-lg border px-2 py-1 text-[9px] font-black uppercase',
                    carneClosingRecord.status === status ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-150 bg-slate-50 text-slate-400'
                  )}
                >
                  {status === 'revisao' ? 'em revisão' : status}
                </span>
              ))}
            </div>
            {carneClosingComplete && (
              <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-xs font-black text-emerald-800">Fechamento concluído</p>
                <p className="mt-0.5 text-[10px] font-bold text-emerald-700">Todos os itens foram marcados. Este mês está fechado para conferência interna; valide a apuração oficial com a contabilidade.</p>
              </div>
            )}
            {carneClosingRecord.status === 'reaberto' && carneClosingRecord.reopenReason && (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-[10px] font-black uppercase text-amber-700">Motivo da reabertura</p>
                <p className="mt-0.5 text-xs font-bold text-amber-900">{carneClosingRecord.reopenReason}</p>
              </div>
            )}
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${carneClosingItems.length > 0 ? (carneClosingChecked.length / carneClosingItems.length) * 100 : 0}%` }}
              />
            </div>
            <div className="space-y-2">
              {carneClosingItems.map(item => {
                const checked = carneClosingChecked.includes(item.id);
                const itemDueDays = daysUntil(item.dueDate, today);
                const itemLate = !checked && itemDueDays < 0;
                return (
                  <label key={item.id} className={cn('flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 hover:bg-slate-50', itemLate ? 'border-rose-200 bg-rose-50' : 'border-slate-150 bg-white')}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCarneClosingItem(item.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 accent-emerald-600"
                    />
                    <span className="min-w-0">
                    <span className={cn('block text-xs font-black', checked ? 'text-slate-500 line-through' : itemLate ? 'text-rose-900' : 'text-slate-900')}>{item.label}</span>
                    <span className="mt-0.5 block text-[10px] font-bold text-slate-500">{item.detail}</span>
                    <span className={cn('mt-1 block text-[10px] font-black', itemLate ? 'text-rose-700' : 'text-slate-400')}>
                      Prazo: {format(item.dueDate, 'dd/MM')} · {itemLate ? `atrasado há ${Math.abs(itemDueDays)} dia(s)` : itemDueDays === 0 ? 'vence hoje' : `${itemDueDays} dia(s) restantes`}
                    </span>
                    <span className="mt-1 block text-[10px] font-bold text-slate-400">Base do item: {item.basis}</span>
                  </span>
                </label>
              );
            })}
          </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="h-9 rounded-xl text-xs font-black" onClick={() => setCarneClosingStatus('revisao')}>
                Iniciar revisão
              </Button>
              <Button type="button" className="h-9 rounded-xl bg-emerald-600 text-xs font-black text-white" onClick={closeCarneMonth}>
                Fechar mês
              </Button>
              <Button type="button" variant="outline" className="h-9 rounded-xl text-xs font-black" onClick={reopenCarneMonth}>
              Reabrir mês
            </Button>
          </div>
          <div className="mt-4 rounded-2xl border border-slate-150 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Histórico do fechamento</p>
                <p className="mt-0.5 text-[10px] font-bold text-slate-500">Aberturas, revisões, fechamentos e reaberturas deste mês.</p>
              </div>
              <Clock className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-3 space-y-2">
              {(carneClosingRecord.history || []).slice().reverse().map(entry => (
                <div key={entry.id} className="rounded-xl bg-white px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-900">
                      {entry.action === 'fechado' ? 'Mês fechado' : entry.action === 'reaberto' ? 'Mês reaberto' : entry.action === 'revisao' ? 'Revisão iniciada' : 'Status aberto'}
                    </span>
                    <span className="font-mono text-[10px] font-black text-slate-400">{format(new Date(entry.at), 'dd/MM/yyyy HH:mm')}</span>
                  </div>
                  {entry.reason && <p className="mt-1 text-[10px] font-bold text-amber-700">{entry.reason}</p>}
                </div>
              ))}
              {(!carneClosingRecord.history || carneClosingRecord.history.length === 0) && (
                <p className="py-4 text-center text-xs font-bold italic text-slate-400">Nenhum evento de fechamento registrado ainda.</p>
              )}
            </div>
          </div>
        </SectionPanel>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Recorte fiscal</p>
                <p className="mt-1 text-xs font-bold text-indigo-900">
                  Carne-Leao exibindo {taxEntityLabel(carneLeaoReport.reportEntity)}. Use o filtro Conta Fiscal para alternar entre PF e PJ.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-right">
                <div className="rounded-xl bg-white px-3 py-2">
                  <p className="text-[9px] font-black uppercase text-slate-400">Pagas</p>
                  <p className="font-mono text-xs font-black text-emerald-600">{money(carneLeaoReport.deductibleByStatus.pago)}</p>
                </div>
                <div className="rounded-xl bg-white px-3 py-2">
                  <p className="text-[9px] font-black uppercase text-slate-400">Em aberto</p>
                  <p className="font-mono text-xs font-black text-amber-600">{money(carneLeaoReport.deductibleByStatus.aberto)}</p>
                </div>
                <div className="rounded-xl bg-white px-3 py-2">
                  <p className="text-[9px] font-black uppercase text-slate-400">Atrasadas</p>
                  <p className="font-mono text-xs font-black text-rose-600">{money(carneLeaoReport.deductibleByStatus.atrasado)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-5">
            <SectionPanel
              title="Receitas por Documento"
              subtitle="Separação mensal para conferência do Carnê-Leão."
              action={
                <Button type="button" variant="outline" className="h-9 rounded-xl text-xs font-bold" onClick={handleExportCarneLeaoCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
              }
            >
              <div className="space-y-3">
                {[
                  { label: 'Nota fiscal', value: carneLeaoReport.revenueByDocument.nota_fiscal, tone: 'bg-emerald-500' },
                  { label: 'Recibo', value: carneLeaoReport.revenueByDocument.recibo, tone: 'bg-indigo-500' }
                ].map(item => {
                  const pct = carneLeaoReport.totalRevenue > 0 ? (item.value / carneLeaoReport.totalRevenue) * 100 : 0;
                  return (
                    <div key={item.label} className="rounded-xl border border-slate-150 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-black text-slate-800">{item.label}</span>
                        <span className="font-mono font-black text-slate-950">{money(item.value)}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-white overflow-hidden">
                        <div className={cn('h-full rounded-full', item.tone)} style={{ width: `${Math.max(2, pct)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionPanel>

            <SectionPanel
              title="Despesas Dedutíveis por Categoria"
              subtitle="Categorias editáveis cadastradas no sistema."
              action={
                <Button type="button" variant="outline" className="h-9 rounded-xl text-xs font-bold" onClick={() => setShowDeductibleHelp(true)}>
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Categorias dedutíveis
                </Button>
              }
            >
              <div className="space-y-2">
                {carneLeaoReport.deductibleByCategory.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-150 bg-white px-4 py-3">
                    <div>
                      <p className="text-xs font-black text-slate-900">{item.name}</p>
                      <p className="text-[10px] font-bold text-slate-400">{item.count} lançamento{item.count === 1 ? '' : 's'} dedutível{item.count === 1 ? '' : 'is'}</p>
                    </div>
                    <span className="font-mono text-sm font-black text-rose-600">{money(item.value)}</span>
                  </div>
                ))}
                {carneLeaoReport.deductibleByCategory.length === 0 && (
                  <p className="py-12 text-center text-xs font-bold italic text-slate-400">Nenhuma despesa dedutível no recorte atual.</p>
                )}
              </div>
            </SectionPanel>
          </div>

          <SectionPanel title="Pendências Fiscais por Cliente" subtitle="Receitas pagas que ainda precisam de documento fiscal ou PDF anexado.">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {fiscalPendingByPatient.map(item => (
                <div key={item.id} className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-slate-900">{item.name}</p>
                      <p className="mt-1 text-[10px] font-bold text-amber-700">
                        {item.count} pendência{item.count === 1 ? '' : 's'} · {money(item.total)}
                      </p>
                    </div>
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-black uppercase">
                    <div className="rounded-lg bg-white px-2 py-1 text-amber-700">Sem doc: {item.missingDocument}</div>
                    <div className="rounded-lg bg-white px-2 py-1 text-slate-600">Sem PDF: {item.missingProof}</div>
                  </div>
                </div>
              ))}
              {fiscalPendingByPatient.length === 0 && (
                <p className="md:col-span-2 xl:col-span-3 py-10 text-center text-xs font-bold italic text-slate-400">Nenhuma pendência fiscal por cliente no recorte atual.</p>
              )}
            </div>
          </SectionPanel>

          <SectionPanel title="Lançamentos Fiscais do Recorte" subtitle="Receitas recebidas e despesas dedutíveis consideradas no relatório.">
            {renderTransactionTable(
              carneLeaoReport.reportTransactions.filter(tx => (tx.type === 'receita' && isPaid(tx) && fiscalDocumentType(tx) !== 'nenhum') || isDeductibleExpense(tx)),
              'Nenhum lançamento fiscal encontrado para os filtros atuais.'
            )}
          </SectionPanel>
        </div>
      )}

      {carneDetailTab === 'simulador' && (
        <div className="space-y-5">
          <SectionPanel title="Simulador de Regularização" subtitle="Simule variações de receita e despesa por valor manual ou percentual.">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[
                {
                  label: 'Variação manual de receita',
                  value: simulationRevenueDraft,
                  setValue: setSimulationRevenueDraft,
                  placeholder: '',
                  tone: 'text-emerald-700'
                },
                {
                  label: 'Variação manual de despesa',
                  value: simulationExpenseDraft,
                  setValue: setSimulationExpenseDraft,
                  placeholder: '',
                  tone: 'text-rose-700'
                }
              ].map(field => (
                <div key={field.label} className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400">{field.label}</label>
                  <div className="relative">
                    <span className={cn('pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black', field.tone)}>R$</span>
                    <Input
                      value={field.value}
                      onChange={event => field.setValue(event.target.value)}
                      onBlur={() => field.setValue(prev => formatMoneyDraft(prev))}
                      placeholder={field.placeholder}
                      className="h-11 rounded-xl pl-10 font-mono text-sm font-black"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-150 bg-slate-50 p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cenário percentual</p>
                  <p className="mt-1 text-xs font-bold text-slate-600">
                    Escolha um período e simule aumento ou redução percentual de receita e despesa.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {whatIfPeriodOptions.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSimulationWhatIfPeriod(option.id)}
                      className={cn(
                        'rounded-xl border px-3 py-2 text-left transition-colors',
                        simulationWhatIfPeriod === option.id ? 'border-indigo-200 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100'
                      )}
                    >
                      <span className="block text-[10px] font-black uppercase">{option.label}</span>
                      <span className="mt-0.5 block text-[9px] font-bold leading-snug">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                {[
                  {
                    kind: 'receita' as const,
                    label: 'Receita por percentual',
                    description: 'Aumenta ou reduz a receita documentada do período.',
                    value: simulationRevenuePercent,
                    draft: simulationRevenuePercentDraft,
                    base: whatIfReference.monthlyRevenue,
                    amount: simulationPercentRevenue,
                    tone: 'emerald'
                  },
                  {
                    kind: 'despesa' as const,
                    label: 'Despesa por percentual',
                    description: 'Aumenta ou reduz as despesas dedutíveis do período.',
                    value: simulationExpensePercent,
                    draft: simulationExpensePercentDraft,
                    base: whatIfReference.monthlyExpense,
                    amount: simulationPercentExpense,
                    tone: 'rose'
                  }
                ].map(control => (
                  <div key={control.label} className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{control.label}</p>
                        <p className="mt-1 text-[10px] font-bold text-slate-400">{control.description}</p>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
                        <input
                          type="number"
                          min={-100}
                          max={100}
                          step={1}
                          value={control.draft}
                          onChange={event => updateSimulationPercent(control.kind, event.target.value)}
                          onBlur={() => commitSimulationPercent(control.kind)}
                          className="h-8 w-16 bg-transparent text-right font-mono text-sm font-black text-slate-900 outline-none"
                        />
                        <span className="text-xs font-black text-slate-400">%</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="relative h-8">
                        <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-slate-100" />
                        <div className="absolute left-1/2 top-1/2 h-5 w-px -translate-y-1/2 bg-slate-300" />
                        <input
                          type="range"
                          min={-100}
                          max={100}
                          step={1}
                          value={control.value}
                          onChange={event => setSimulationPercentFromSlider(control.kind, Number(event.target.value))}
                          className={cn('relative z-10 h-8 w-full cursor-pointer bg-transparent', control.tone === 'emerald' ? 'accent-emerald-600' : 'accent-rose-600')}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>-100%</span>
                        <span>0%</span>
                        <span>+100%</span>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[9px] font-black uppercase text-slate-400">Base {whatIfReference.label}</p>
                        <p className="mt-1 font-mono text-xs font-black text-slate-900">{money(control.base)}</p>
                      </div>
                      <div className={cn('rounded-xl px-3 py-2', control.amount >= 0 ? 'bg-emerald-50' : 'bg-rose-50')}>
                        <p className="text-[9px] font-black uppercase text-slate-400">Variação</p>
                        <p className={cn('mt-1 font-mono text-xs font-black', control.amount >= 0 ? 'text-emerald-700' : 'text-rose-700')}>{money(control.amount)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-slate-150 bg-slate-50 p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Base atual</p>
                <p className="mt-1 font-mono text-lg font-black text-slate-950">{money(carneLeaoReport.taxableBase)}</p>
              </div>
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-700">Variação de base</p>
                <p className={cn('mt-1 font-mono text-lg font-black', simulationBaseDelta >= 0 ? 'text-indigo-950' : 'text-emerald-700')}>{money(simulationBaseDelta)}</p>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-rose-700">Impacto no IRPF</p>
                <p className={cn('mt-1 font-mono text-lg font-black', simulationTaxDelta >= 0 ? 'text-rose-700' : 'text-emerald-700')}>{money(simulationTaxDelta)}</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700">Saldo líquido simulado</p>
                <p className={cn('mt-1 font-mono text-lg font-black', simulationNetImpact >= 0 ? 'text-emerald-700' : 'text-rose-700')}>{money(simulationNetImpact)}</p>
              </div>
            </div>
          </SectionPanel>

          <SectionPanel title="Resultado da Simulação" subtitle="Comparativo entre a apuração atual e o cenário informado acima.">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1.1fr] gap-4">
              <div className="rounded-2xl border border-slate-150 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cenário atual</p>
                <div className="mt-3 space-y-2 text-xs font-bold">
                  <div className="flex justify-between gap-3"><span>Receitas documentadas</span><span className="font-mono">{money(carneLeaoReport.totalRevenue)}</span></div>
                  <div className="flex justify-between gap-3"><span>Deduções atuais</span><span className="font-mono">{money(carneLeaoReport.totalDeductible)}</span></div>
                  <div className="flex justify-between gap-3"><span>Base</span><span className="font-mono">{money(carneLeaoReport.taxableBase)}</span></div>
                  <div className="flex justify-between gap-3 text-rose-600"><span>IRPF</span><span className="font-mono">{money(carneLeaoReport.estimatedTax)}</span></div>
                </div>
              </div>
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Cenário simulado</p>
                <div className="mt-3 space-y-2 text-xs font-bold">
                  <div className="flex justify-between gap-3"><span>Receitas consideradas</span><span className="font-mono">{money(carneLeaoReport.totalRevenue + simulationRevenue)}</span></div>
                  <div className="flex justify-between gap-3"><span>Receita por percentual</span><span className="font-mono">{money(simulationPercentRevenue)}</span></div>
                  <div className="flex justify-between gap-3"><span>Deduções consideradas</span><span className="font-mono">{money(carneLeaoReport.totalDeductible + simulationExpense)}</span></div>
                  <div className="flex justify-between gap-3"><span>Despesa por percentual</span><span className="font-mono">{money(simulationPercentExpense)}</span></div>
                  <div className="flex justify-between gap-3"><span>Nova base</span><span className="font-mono">{money(simulatedTax.appliedBase)}</span></div>
                  <div className="flex justify-between gap-3 text-rose-600"><span>Novo IRPF</span><span className="font-mono">{money(simulatedTax.tax)}</span></div>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Leitura prática</p>
                <p className="mt-3 text-sm font-black text-slate-950">
                  {simulationBaseDelta >= 0 ? 'O cenário aumenta a base tributável.' : 'O cenário reduz a base tributável.'}
                </p>
                <p className="mt-2 text-xs font-bold leading-relaxed text-amber-900">
                  Variação de receita soma {money(simulationRevenue)}. Variação de deduções soma {money(simulationExpense)}. O imposto muda {money(simulationTaxDelta)} e o efeito líquido fica em {money(simulationNetImpact)}.
                </p>
              </div>
            </div>
          </SectionPanel>
        </div>
      )}

      {carneDetailTab === 'evolucao' && (
        <div className="space-y-5">
          <SectionPanel title="Evolução Mensal" subtitle="Receitas, deduções e imposto a pagar mês a mês no ano selecionado.">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <p className="text-[9px] font-black uppercase text-emerald-700">Receitas no ano</p>
                <p className="mt-1 font-mono text-sm font-black text-emerald-700">{money(carneEvolutionSummary.receitas)}</p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                <p className="text-[9px] font-black uppercase text-rose-700">Deduções no ano</p>
                <p className="mt-1 font-mono text-sm font-black text-rose-700">{money(carneEvolutionSummary.deducoes)}</p>
              </div>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                <p className="text-[9px] font-black uppercase text-indigo-700">Base no ano</p>
                <p className="mt-1 font-mono text-sm font-black text-indigo-950">{money(carneEvolutionSummary.base)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[9px] font-black uppercase text-slate-500">IRPF no ano</p>
                <p className="mt-1 font-mono text-sm font-black text-slate-950">{money(carneEvolutionSummary.imposto)}</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                <p className="text-[9px] font-black uppercase text-amber-700">Meses com pendência</p>
                <p className="mt-1 font-mono text-sm font-black text-amber-700">{carneEvolutionSummary.pendingMonths}</p>
              </div>
            </div>
            <div className="mt-4 h-[360px] rounded-2xl border border-slate-150 bg-gradient-to-b from-slate-50 to-white p-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={carneMonthlyEvolution} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="carneBaseGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="carneTaxGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#e11d48" stopOpacity={0.20} />
                      <stop offset="95%" stopColor="#e11d48" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="carneRevenueGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 800, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="money" tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={value => money(Number(value)).replace(',00', '')} width={72} />
                  <Tooltip
                    formatter={(value: number) => money(value)}
                    contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.12)' }}
                    labelStyle={{ fontWeight: 900, color: '#0f172a' }}
                  />
                  <Area yAxisId="money" type="monotone" dataKey="Receitas" stroke="#059669" fill="url(#carneRevenueGradient)" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                  <Area yAxisId="money" type="monotone" dataKey="Deduções" stroke="#4f46e5" fill="url(#carneBaseGradient)" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                  <Area yAxisId="money" type="monotone" dataKey="Imposto" stroke="#e11d48" fill="url(#carneTaxGradient)" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionPanel>

          <div className="grid grid-cols-1 xl:grid-cols-[0.75fr_1.25fr] gap-5">
            <SectionPanel title="Leitura da Evolução" subtitle="Pontos de atenção do ano selecionado.">
              <div className="space-y-3">
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Maior base</p>
                  <p className="mt-1 text-sm font-black text-slate-950">{carneEvolutionSummary.highestBaseMonth?.name || '-'} · {money(carneEvolutionSummary.highestBaseMonth?.Base || 0)}</p>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">Maior IRPF</p>
                  <p className="mt-1 text-sm font-black text-slate-950">{carneEvolutionSummary.highestTaxMonth?.name || '-'} · {money(carneEvolutionSummary.highestTaxMonth?.Imposto || 0)}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Meses sem pendência</p>
                  <p className="mt-1 text-sm font-black text-slate-950">{carneEvolutionSummary.cleanMonths} de {carneMonthlyEvolution.length}</p>
                </div>
              </div>
            </SectionPanel>

            <SectionPanel title="Detalhamento Mensal" subtitle="Resumo de cada mês para comparação rápida.">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Mês', 'Receitas', 'Deduções', 'Base', 'IRPF', 'Líquido', 'Pendências'].map(label => (
                        <th key={label} className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {carneMonthlyEvolution.map(item => (
                      <tr key={item.month} className="border-b border-slate-50">
                        <td className="px-3 py-2 text-xs font-black text-slate-900">{item.name}</td>
                        <td className="px-3 py-2 font-mono text-xs font-black text-emerald-700">{money(item.Receitas)}</td>
                        <td className="px-3 py-2 font-mono text-xs font-black text-rose-600">{money(item.Deduções)}</td>
                        <td className="px-3 py-2 font-mono text-xs font-black text-slate-900">{money(item.Base)}</td>
                        <td className="px-3 py-2 font-mono text-xs font-black text-rose-700">{money(item.Imposto)}</td>
                        <td className="px-3 py-2 font-mono text-xs font-black text-indigo-700">{money(item.Líquido)}</td>
                        <td className={cn('px-3 py-2 font-mono text-xs font-black', item.Pendências > 0 ? 'text-amber-700' : 'text-emerald-700')}>{item.Pendências}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionPanel>
          </div>
        </div>
      )}

      {carneDetailTab === 'bases' && (
        <SectionPanel title="Bases Legais" subtitle="Resumo operacional das fontes oficiais consultadas para tirar dúvidas rápidas.">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 gap-3">
              {CARNE_LEGAL_BASIS_ITEMS.map(item => (
                <div key={item.title} className="rounded-2xl border border-slate-150 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600">
                      <HelpCircle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-950">{item.title}</p>
                      <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-slate-400">{item.updated}</p>
                      <p className="mt-2 text-xs font-bold leading-relaxed text-slate-600">{item.summary}</p>
                      {item.source.startsWith('http') ? (
                        <a className="mt-3 inline-flex text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800" href={item.source} target="_blank" rel="noreferrer">
                          Ver fonte oficial
                        </a>
                      ) : (
                        <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-amber-700">{item.source}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50/60">
              <div className="border-b border-indigo-100 bg-white px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Chat de dúvidas</p>
                <h3 className="mt-1 text-lg font-black italic text-slate-950">Assistente Receita</h3>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Pergunte se uma despesa entra no Livro Caixa, como comprovar ou quando validar com contador.
                </p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {legalChatMessages.map(message => (
                  <div key={message.id} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[88%] rounded-2xl px-4 py-3 text-xs font-bold leading-relaxed shadow-sm',
                        message.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'border border-slate-150 bg-white text-slate-700'
                      )}
                    >
                      <p className="whitespace-pre-line">{message.text}</p>
                      {message.source && (
                        <p className={cn('mt-2 text-[9px] font-black uppercase tracking-widest', message.role === 'user' ? 'text-indigo-100' : 'text-indigo-600')}>
                          {message.source}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {legalChatLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl border border-slate-150 bg-white px-4 py-3 text-xs font-black text-slate-500 shadow-sm">
                      Consultando base da Receita...
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-indigo-100 bg-white p-3">
                <textarea
                  value={legalChatInput}
                  onChange={event => setLegalChatInput(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      sendLegalChatQuestion();
                    }
                  }}
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                  placeholder="Ex: combustível entra como despesa dedutível?"
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold text-slate-400">Base: Receita Federal. Não substitui validação contábil.</p>
                  <Button type="button" className="h-10 rounded-xl bg-indigo-600 text-xs font-black text-white" onClick={sendLegalChatQuestion} disabled={legalChatLoading || !legalChatInput.trim()}>
                    <Send className="mr-2 h-4 w-4" />
                    Perguntar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </SectionPanel>
      )}

      {showDeductibleHelp && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/40 p-4" onClick={() => setShowDeductibleHelp(false)}>
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Categorias dedutíveis</p>
                <h3 className="mt-1 text-lg font-black italic text-slate-950">Editar categorias do Carnê-Leão</h3>
                <p className="mt-1 text-xs font-bold text-slate-500">Crie, renomeie, exclua e marque quais despesas entram como dedutíveis.</p>
              </div>
              <Button type="button" variant="ghost" className="h-9 rounded-xl text-xs font-bold" onClick={() => setShowDeductibleHelp(false)}>
                Fechar
              </Button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {[
                  { id: 'todos', label: 'Todas', count: deductibleCategoryCounts.total },
                  { id: 'dedutiveis', label: 'Dedutíveis', count: deductibleCategoryCounts.deductible },
                  { id: 'nao_dedutiveis', label: 'Não dedutíveis', count: deductibleCategoryCounts.notDeductible }
                ].map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDeductibleCategoryFilter(option.id as typeof deductibleCategoryFilter)}
                    className={cn(
                      'h-9 rounded-xl border px-3 text-[10px] font-black uppercase tracking-wider transition-colors',
                      deductibleCategoryFilter === option.id
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    )}
                  >
                    {option.label} <span className="font-mono">{option.count}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={deductibleCategoryDraft}
                  onChange={event => setDeductibleCategoryDraft(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addDeductibleExpenseCategory();
                    }
                  }}
                  placeholder="Nova categoria dedutível"
                  className="h-10 rounded-xl text-xs font-bold"
                />
                <Button type="button" className="h-10 rounded-xl bg-slate-900 text-xs font-black text-white hover:bg-slate-800" onClick={addDeductibleExpenseCategory}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Criar categoria
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-2">
                {filteredExpenseCategoryCatalog.map(category => {
                  const isEditing = editingDeductibleCategoryId === category.id;
                  return (
                    <div key={category.id} className="flex items-center gap-2 rounded-xl border border-slate-150 bg-slate-50 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => toggleExpenseCategoryDeductible(category.id)}
                        className={cn(
                          'h-8 rounded-lg px-2 text-[9px] font-black uppercase transition-colors',
                          category.deductible ? 'bg-rose-100 text-rose-700' : 'bg-white text-slate-400 hover:text-slate-700'
                        )}
                      >
                        Ded.
                      </button>
                      {isEditing ? (
                        <Input
                          value={editingDeductibleCategoryName}
                          onChange={event => setEditingDeductibleCategoryName(event.target.value)}
                          onKeyDown={event => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              renameExpenseCategory(category);
                            }
                            if (event.key === 'Escape') {
                              setEditingDeductibleCategoryId(null);
                              setEditingDeductibleCategoryName('');
                            }
                          }}
                          className="h-8 min-w-0 flex-1 rounded-lg bg-white text-xs font-bold"
                          autoFocus
                        />
                      ) : (
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-black text-slate-900">{category.name}</p>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                            {category.deductible ? 'Entra no Carnê-Leão' : 'Fora do Carnê-Leão'}
                          </p>
                        </div>
                      )}
                      {isEditing ? (
                        <Button type="button" variant="outline" className="h-8 rounded-lg px-2 text-[10px] font-bold" onClick={() => renameExpenseCategory(category)}>
                          Salvar
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg text-slate-500 hover:bg-white"
                          onClick={() => {
                            setEditingDeductibleCategoryId(category.id);
                            setEditingDeductibleCategoryName(category.name);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50" onClick={() => removeExpenseCategory(category)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                {filteredExpenseCategoryCatalog.length === 0 && (
                  <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs font-bold italic text-slate-400">
                    Nenhuma categoria encontrada para este filtro.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  const renderActiveTab = () => {
    if (activeTab === 'receitas') return renderAccountView('receita');
    if (activeTab === 'despesas') return renderAccountView('despesa');
    if (activeTab === 'carne') return renderCarneLeao();
    return renderOverview();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="p-4 pb-20 lg:p-4 lg:pb-24 space-y-4 max-w-none mx-auto font-sans"
    >
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-indigo-600 mb-1">Mesa Financeira</p>
          <h1 className="text-2xl font-black italic text-slate-950">Financeiro Operacional</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Receitas, despesas, atrasos e Carnê-Leão em uma mesa financeira enxuta.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={handleExportCSV} className="h-10 rounded-xl text-xs font-bold border-slate-200">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <Button type="button" onClick={() => openCreateModal('receita')} className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black">
            <PlusCircle className="w-4 h-4 mr-2" />
            Nova Receita
          </Button>
          <Button type="button" onClick={() => openCreateModal('despesa')} className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black">
            <MinusCircle className="w-4 h-4 mr-2" />
            Nova Despesa
          </Button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm space-y-3">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)] xl:items-start">
          <div className="flex flex-wrap items-start gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="h-10 rounded-xl text-xs font-bold bg-white border-slate-200 min-w-[104px] justify-between gap-3">
                  <span className="flex flex-col items-start leading-none">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ano</span>
                    <span className="mt-1 text-xs font-black text-slate-900">{selectedYear}</span>
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-36 bg-white rounded-xl p-1.5 border border-slate-100 shadow-xl z-[200]">
                {availableYears.map(year => (
                  <DropdownMenuItem
                    key={year}
                    className={cn('rounded-lg p-2 text-xs font-bold cursor-pointer', selectedYear === year && 'bg-indigo-50 text-indigo-700')}
                    onClick={() => {
                      setSelectedYear(year);
                      setQuickRange('mes');
                    }}
                  >
                    {year}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="h-10 rounded-xl text-xs font-bold bg-white border-slate-200 min-w-[146px] justify-between gap-3">
                  <span className="flex flex-col items-start leading-none">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Mes</span>
                    <span className="mt-1 text-xs font-black text-slate-900">{monthOptions.find(month => month.value === selectedMonth)?.label}</span>
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-white rounded-xl p-1.5 border border-slate-100 shadow-xl z-[200] max-h-[280px] overflow-y-auto">
                {monthOptions.map(month => (
                  <DropdownMenuItem
                    key={month.value}
                    className={cn('rounded-lg p-2 text-xs font-bold cursor-pointer', selectedMonth === month.value && 'bg-indigo-50 text-indigo-700')}
                    onClick={() => {
                      setSelectedMonth(month.value);
                      setQuickRange('mes');
                    }}
                  >
                    {month.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="h-10 rounded-xl text-xs font-bold bg-white border-slate-200 min-w-[166px] justify-between gap-3">
                  <span className="flex flex-col items-start leading-none">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status</span>
                    <span className="mt-1 text-xs font-black text-slate-900">{statusOptions.find(status => status.value === statusFilter)?.label}</span>
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52 bg-white rounded-xl p-1.5 border border-slate-100 shadow-xl z-[200]">
                {statusOptions.map(status => (
                  <DropdownMenuItem
                    key={status.value}
                    className={cn('rounded-lg p-2 text-xs font-bold cursor-pointer', statusFilter === status.value && 'bg-indigo-50 text-indigo-700')}
                    onClick={() => setStatusFilter(status.value)}
                  >
                    {status.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <FilterDropdown
              label="Pagamento"
              value={paymentMethodFilter}
              options={paymentMethodOptions}
              onChange={setPaymentMethodFilter}
              minWidth="min-w-[168px]"
              searchable
              searchPlaceholder="Buscar forma..."
            />

            <FilterDropdown
              label="Categoria"
              value={categoryFilter}
              options={categoryOptions}
              onChange={setCategoryFilter}
              minWidth="min-w-[178px]"
              searchable
              searchPlaceholder="Buscar categoria..."
            />

            <FilterDropdown
              label="Paciente"
              value={patientFilter}
              options={patientOptions}
              onChange={setPatientFilter}
              minWidth="min-w-[178px]"
              searchable
              searchPlaceholder="Buscar paciente..."
            />

            <FilterDropdown
              label="Profissional"
              value={professionalFilter}
              options={professionalOptions}
              onChange={setProfessionalFilter}
              minWidth="min-w-[178px]"
              searchable
              searchPlaceholder="Buscar profissional..."
            />

            <FilterDropdown<DocumentFilter>
              label="Documento"
              value={documentFilter}
              options={documentOptions}
              onChange={setDocumentFilter}
              minWidth="min-w-[178px]"
            />

            <FilterDropdown<TaxEntityFilter>
              label="Carnê-Leão"
              value={taxEntityFilter}
              options={taxEntityOptions}
              onChange={setTaxEntityFilter}
              minWidth="min-w-[150px]"
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="h-10 rounded-xl text-xs font-bold bg-white border-slate-200">
                  <Calendar className="w-4 h-4 mr-2 text-indigo-600" />
                  {quickRanges.find(range => range.id === quickRange)?.label || 'Período'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-white rounded-xl p-1.5 border border-slate-100 shadow-xl z-[200]">
                {quickRanges.map(range => (
                  <DropdownMenuItem
                    key={range.id}
                    className="rounded-lg p-2 text-xs font-bold cursor-pointer"
                    onClick={() => setQuickRange(range.id)}
                  >
                    {range.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="relative w-full xl:w-[360px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Buscar por descrição, paciente, categoria..."
              className="h-9 rounded-xl pl-9 text-xs font-bold border-slate-200"
            />
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1">
          {tabConfig.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSetTab(tab.id)}
              className={cn(
                'h-10 px-4 rounded-xl text-[11px] font-black whitespace-nowrap border transition-colors',
                activeTab === tab.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-150 hover:bg-slate-100'
              )}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.short}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {renderActiveTab()}
        </motion.div>
      </AnimatePresence>

      {showAuditHistoryModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/40 p-4" onClick={() => setShowAuditHistoryModal(false)}>
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-4">
              <div>
                <h2 className="text-lg font-black italic text-slate-950">Histórico completo</h2>
                <p className="mt-0.5 text-xs font-bold text-slate-400">Todas as alterações em ordem de data, da mais recente para a mais antiga.</p>
              </div>
              <Button type="button" variant="ghost" className="h-9 rounded-xl text-xs font-black" onClick={() => setShowAuditHistoryModal(false)}>
                Fechar
              </Button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4">
              <div className="space-y-2">
                {financeAuditEntries.map(entry => renderAuditEntry(entry))}
                {financeAuditEntries.length === 0 && (
                  <p className="py-12 text-center text-xs font-bold italic text-slate-400">Nenhuma alteração financeira registrada ainda.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCarneChecklistConfigModal && (
        <div className="fixed inset-0 z-[360] flex items-center justify-center bg-slate-950/45 p-4" onClick={() => setShowCarneChecklistConfigModal(false)}>
          <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Configuração do fechamento</p>
                <h2 className="mt-1 text-xl font-black italic text-slate-950">Checklist e prazos internos</h2>
                <p className="mt-1 max-w-2xl text-xs font-bold text-slate-500">
                  Defina os itens que médicos, dentistas ou a equipe fiscal precisam concluir antes do vencimento do Carnê-Leão.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="h-9 rounded-xl text-xs font-black" onClick={resetCarneChecklistTemplate}>
                  Restaurar padrão
                </Button>
                <Button type="button" className="h-9 rounded-xl bg-slate-900 text-xs font-black text-white" onClick={addCarneChecklistTemplateItem}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Novo item
                </Button>
                <Button type="button" className="h-9 rounded-xl bg-indigo-600 text-xs font-black text-white" onClick={saveCarneChecklistTemplateDraft}>
                  Salvar
                </Button>
                <Button type="button" variant="ghost" className="h-9 rounded-xl text-xs font-black" onClick={() => setShowCarneChecklistConfigModal(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
            <div className="max-h-[74vh] overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-3">
                {carneChecklistTemplateDraft.map(item => (
                  <div key={item.id} className="rounded-2xl border border-slate-150 bg-white p-4 shadow-sm">
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_1.4fr_180px_40px] lg:items-start">
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Nome do item</label>
                        <Input
                          value={item.label}
                          onChange={event => updateCarneChecklistTemplateItem(item.id, { label: event.target.value })}
                          className="mt-1 h-10 rounded-xl text-xs font-black"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Base/descrição interna</label>
                        <textarea
                          value={item.basis}
                          onChange={event => updateCarneChecklistTemplateItem(item.id, { basis: event.target.value })}
                          rows={2}
                          className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                          placeholder="Opcional"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Prazo interno</label>
                        <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 px-3">
                          <input
                            type="number"
                            min={0}
                            max={15}
                            value={item.dueBusinessDaysBeforePayment}
                            onChange={event => updateCarneChecklistTemplateItem(item.id, { dueBusinessDaysBeforePayment: Math.max(0, Math.min(15, Number(event.target.value || 0))) })}
                            className="h-10 w-14 bg-transparent font-mono text-sm font-black outline-none"
                          />
                          <span className="text-[10px] font-black uppercase text-slate-400">dias úteis antes do DARF</span>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="mt-5 h-9 w-9 rounded-xl text-rose-600 hover:bg-rose-50" onClick={() => removeCarneChecklistTemplateItem(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                <p className="text-[10px] font-bold text-indigo-900">
                  O vencimento oficial continua sendo o último dia útil do mês seguinte. Estes prazos são internos para organizar recibos, PDFs, revisão da base, exportação e validação contábil.
                </p>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" className="h-10 rounded-xl text-xs font-black" onClick={() => setShowCarneChecklistConfigModal(false)}>
                  Cancelar
                </Button>
                <Button type="button" className="h-10 rounded-xl bg-indigo-600 text-xs font-black text-white" onClick={saveCarneChecklistTemplateDraft}>
                  Salvar checklist
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCarneCloseConfirmModal && (
        <div className="fixed inset-0 z-[420] flex items-center justify-center bg-slate-950/45 p-4" onClick={() => setShowCarneCloseConfirmModal(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-amber-100 bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="bg-amber-50 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black italic text-slate-950">Checklist incompleto</h2>
                  <p className="mt-1 text-xs font-bold text-amber-900">
                    Ainda há itens de revisão sem marcar. O ideal é conferir documentos, despesas dedutíveis e imposto apurado antes de fechar o mês.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="rounded-2xl border border-slate-150 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progresso do fechamento</p>
                <p className="mt-1 font-mono text-lg font-black text-slate-950">{carneClosingChecked.length}/{carneClosingItems.length}</p>
              </div>
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" className="h-10 rounded-xl text-xs font-black" onClick={() => setShowCarneCloseConfirmModal(false)}>
                  Voltar para revisão
                </Button>
                <Button type="button" className="h-10 rounded-xl bg-emerald-600 text-xs font-black text-white" onClick={confirmCarneMonthClose}>
                  Fechar mesmo assim
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCarneCloseSuccessModal && (
        <div className="fixed inset-0 z-[430] flex items-center justify-center bg-slate-950/45 p-4" onClick={() => setShowCarneCloseSuccessModal(false)}>
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-emerald-100 bg-white text-center shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="bg-emerald-50 px-6 py-7">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-2xl font-black italic text-slate-950">Mês fechado com sucesso</h2>
              <p className="mt-2 text-sm font-bold text-emerald-900">
                Você já conferiu os impostos deste período. O mês ficou marcado como fechado para controle interno.
              </p>
            </div>
            <div className="px-6 py-5">
              <Button type="button" className="h-11 w-full rounded-xl bg-emerald-600 text-xs font-black text-white" onClick={() => setShowCarneCloseSuccessModal(false)}>
                Entendi
              </Button>
            </div>
          </div>
        </div>
      )}

      {showCarneReopenModal && (
        <div className="fixed inset-0 z-[420] flex items-center justify-center bg-slate-950/45 p-4" onClick={() => setShowCarneReopenModal(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="bg-indigo-50 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black italic text-slate-950">Reabrir mês</h2>
                  <p className="mt-1 text-xs font-bold text-indigo-900">
                    Registre o motivo da reabertura para manter histórico de auditoria do fechamento mensal.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Motivo da reabertura</label>
              <textarea
                value={carneReopenReasonDraft}
                onChange={event => setCarneReopenReasonDraft(event.target.value)}
                rows={4}
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                placeholder="Ex: nota fiscal lançada depois do fechamento, despesa dedutível corrigida..."
              />
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" className="h-10 rounded-xl text-xs font-black" onClick={() => setShowCarneReopenModal(false)}>
                  Cancelar
                </Button>
                <Button type="button" className="h-10 rounded-xl bg-indigo-600 text-xs font-black text-white" onClick={confirmCarneMonthReopen}>
                  Confirmar reabertura
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <FinanceModal
        open={isModalOpen}
        onOpenChange={handleFinanceModalOpenChange}
        transactionId={selectedTransactionId}
        defaultType={modalDefaultType}
      />
    </motion.div>
  );
}
