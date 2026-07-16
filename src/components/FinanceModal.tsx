import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import { fiscalDocumentsBucket, supabase } from '../lib/supabase';
import { format } from 'date-fns';
import {
  DollarSign,
  Calendar as CalendarIcon,
  User,
  Tag,
  FileText,
  Landmark,
  Clock,
  CheckCircle,
  HelpCircle,
  Receipt,
  Sparkles,
  Trash2,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Info,
  Search,
  Plus,
  Pencil,
  Eye,
  EyeOff,
  Save,
  X,
  ExternalLink,
  AlertTriangle,
  Download
} from 'lucide-react';
import { cn } from '../lib/utils';

interface FinanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId?: string | null;
  initialPatientId?: string | null;
  defaultType?: 'receita' | 'despesa';
}

const EXPENSE_CATEGORIES = [
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
];

const REVENUE_CATEGORIES = [
  'Consulta / Avaliação',
  'Pacote de Tratamentos',
  'Procedimento Estético',
  'Retorno / Retoque'
];

const PAYMENT_METHODS = [
  { label: '💎 Pix', value: 'pix' },
  { label: '💳 Cartão de Crédito', value: 'cartão de crédito' },
  { label: '💳 Cartão de Débito', value: 'cartão de débito' },
  { label: '💵 Dinheiro', value: 'dinheiro' },
  { label: '📄 Boleto Bancário', value: 'boleto' },
  { label: '🔀 Múltiplas Formas (Dividido)', value: 'múltiplo' },
  { label: '❓ Não especificado', value: 'não especificado' }
];

const isMissingPaymentMethod = (method?: string) => !method || method === 'não especificado';

const taxEntityForFiscalDocument = (
  documentType?: string,
  fallback: 'pessoa_fisica' | 'pessoa_juridica' = 'pessoa_fisica'
) => {
  if (documentType === 'nota_fiscal') return 'pessoa_juridica' as const;
  if (documentType === 'recibo') return 'pessoa_fisica' as const;
  return fallback;
};

type FinanceCategoryKind = 'receita' | 'despesa';

interface EditableFinanceCategory {
  id: string;
  name: string;
  visible: boolean;
  deductible?: boolean;
}

type FinanceCategoryState = Record<FinanceCategoryKind, EditableFinanceCategory[]>;

const FINANCE_CATEGORY_STORAGE_KEY = 'clinic-finance-categories-v1';
const MAX_FISCAL_PDF_SIZE_BYTES = 10 * 1024 * 1024;

const DEFAULT_FINANCE_CATEGORIES: FinanceCategoryState = {
  despesa: EXPENSE_CATEGORIES.map((name, index) => ({
    id: `expense-${index}`,
    name,
    visible: true
  })),
  receita: REVENUE_CATEGORIES.map((name, index) => ({
    id: `revenue-${index}`,
    name,
    visible: true
  }))
};

const normalizeCategoryName = (name: string) => name.trim().replace(/\s+/g, ' ');

const createCategoryId = (kind: FinanceCategoryKind) => {
  return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const formatCurrencyInput = (value: number) => {
  return value > 0
    ? new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
    : '';
};

const normalizeFinanceCategoryList = (
  rawList: unknown,
  defaultList: EditableFinanceCategory[],
  kind: FinanceCategoryKind
) => {
  const hasStoredList = Array.isArray(rawList);
  const incoming = hasStoredList ? rawList : [];
  const byId = new Map((hasStoredList ? [] : defaultList).map(category => [category.id, { ...category }]));

  incoming.forEach((item) => {
    if (typeof item === 'string') {
      const name = normalizeCategoryName(item);
      if (name) {
        const id = createCategoryId(kind);
        byId.set(id, { id, name, visible: true });
      }
      return;
    }

    if (!item || typeof item !== 'object') return;
    const candidate = item as Partial<EditableFinanceCategory>;
    const name = normalizeCategoryName(String(candidate.name || ''));
    if (!name) return;

    const fallbackId = createCategoryId(kind);
    const id = typeof candidate.id === 'string' && candidate.id ? candidate.id : fallbackId;
    byId.set(id, {
      id,
      name,
      visible: candidate.visible !== false,
      deductible: kind === 'despesa' ? candidate.deductible === true : undefined
    });
  });

  const seenNames = new Set<string>();
  return Array.from(byId.values()).filter((category) => {
    const key = category.name.toLowerCase();
    if (seenNames.has(key)) return false;
    seenNames.add(key);
    return true;
  });
};

const normalizeFinanceCategoryState = (raw?: Partial<FinanceCategoryState>): FinanceCategoryState => ({
  despesa: normalizeFinanceCategoryList(raw?.despesa, DEFAULT_FINANCE_CATEGORIES.despesa, 'despesa'),
  receita: normalizeFinanceCategoryList(raw?.receita, DEFAULT_FINANCE_CATEGORIES.receita, 'receita')
});

const loadFinanceCategoryState = (): FinanceCategoryState => {
  if (typeof window === 'undefined') return normalizeFinanceCategoryState();

  try {
    const stored = window.localStorage.getItem(FINANCE_CATEGORY_STORAGE_KEY);
    return normalizeFinanceCategoryState(stored ? JSON.parse(stored) : undefined);
  } catch {
    return normalizeFinanceCategoryState();
  }
};

const getCategoryNames = (categories: EditableFinanceCategory[], visibleOnly = false) => {
  return categories
    .filter(category => !visibleOnly || category.visible)
    .map(category => category.name);
};

function CustomDatePicker({
  value,
  onChange
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [currentDate, setCurrentDate] = useState(() => {
    return value ? new Date(value + 'T12:00:00') : new Date();
  });
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setCurrentDate(new Date(value + 'T12:00:00'));
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updatePopoverPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = 280;
    const estimatedHeight = 292;
    const padding = 12;
    const gap = 8;
    const topCandidate = rect.top - estimatedHeight - gap;

    setPopoverPosition({
      top: Math.max(padding, topCandidate),
      left: Math.min(
        Math.max(padding, rect.right - width),
        window.innerWidth - width - padding
      )
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePopoverPosition();
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);

    return () => {
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [isOpen]);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonthDaysToShow = firstDay;
  const prevMonthIndex = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonthIndex);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const selectedDateStr = `${year}-${formattedMonth}-${formattedDay}`;
    onChange(selectedDateStr);
    setIsOpen(false);
  };

  const formattedDisplay = () => {
    if (!value) return "Selecione uma data";
    const d = new Date(value + 'T12:00:00');
    return format(d, 'dd/MM/yyyy');
  };

  const applyQuickDate = (offsetDays: number) => {
    const next = new Date();
    next.setDate(next.getDate() + offsetDays);
    onChange(format(next, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const calendarCells = [];
  for (let i = prevMonthDaysToShow - 1; i >= 0; i--) {
    calendarCells.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      year: prevYear,
      month: prevMonthIndex
    });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({
      day: i,
      isCurrentMonth: true,
      year,
      month
    });
  }

  const totalCells = Math.ceil(calendarCells.length / 7) * 7;
  const nextMonthIndex = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  let nextMonthDay = 1;
  while (calendarCells.length < totalCells) {
    calendarCells.push({
      day: nextMonthDay++,
      isCurrentMonth: false,
      year: nextYear,
      month: nextMonthIndex
    });
  }

  const selectedDayNum = value ? new Date(value + 'T12:00:00').getDate() : null;
  const selectedMonthNum = value ? new Date(value + 'T12:00:00').getMonth() : null;
  const selectedYearNum = value ? new Date(value + 'T12:00:00').getFullYear() : null;

  return (
    <div className="relative w-full">
      <div ref={triggerRef} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2">
        <button
          type="button"
          onClick={() => {
            if (!isOpen) updatePopoverPosition();
            setIsOpen(!isOpen);
          }}
          className="w-full min-w-0 flex items-center gap-2 px-3 h-12 bg-slate-50 hover:bg-slate-100/90 rounded-xl font-bold text-slate-800 transition-all border border-slate-150 text-left focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer overflow-hidden"
        >
          <CalendarIcon className="w-4 h-4 text-slate-450 shrink-0" />
          <span className="whitespace-nowrap text-xs font-bold text-slate-900">{formattedDisplay()}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (!isOpen) updatePopoverPosition();
            setIsOpen(!isOpen);
          }}
          className="h-12 rounded-xl border border-indigo-100 bg-white px-3 text-[10px] text-indigo-600 font-extrabold uppercase tracking-wider shadow-sm hover:bg-indigo-50 transition-colors"
        >
          Alterar
        </button>
      </div>

      {isOpen && createPortal(
        <div
          ref={popoverRef}
          style={{ top: popoverPosition.top, left: popoverPosition.left }}
          className="fixed bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-200 p-4 z-[9900] animate-in fade-in slide-in-from-bottom-2 duration-150 w-[280px]"
        >
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-550 cursor-pointer font-bold transition-all text-xs"
            >
              &larr;
            </button>
            <div className="text-center font-black italic text-slate-900 text-[11px] tracking-wider">
              {monthNames[month]} <span className="font-mono not-italic text-indigo-650 font-black">{year}</span>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-550 cursor-pointer font-bold transition-all text-xs"
            >
              &rarr;
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-black uppercase text-slate-450 mb-1">
            {weekdays.map((w, idx) => (
              <div key={idx} className="h-5 flex items-center justify-center font-extrabold">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              const isSelected =
                cell.isCurrentMonth &&
                cell.day === selectedDayNum &&
                cell.month === selectedMonthNum &&
                cell.year === selectedYearNum;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!cell.isCurrentMonth}
                  onClick={() => handleSelectDay(cell.day)}
                  className={cn(
                    "h-7 w-7 text-xs font-bold rounded-lg flex items-center justify-center cursor-pointer transition-all",
                    !cell.isCurrentMonth && "text-slate-200 pointer-events-none",
                    cell.isCurrentMonth && !isSelected && "text-slate-700 hover:bg-indigo-50 hover:text-indigo-600",
                    isSelected && "bg-indigo-600 text-white font-black shadow-md shadow-indigo-100"
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => applyQuickDate(-1)}
              className="text-[9px] text-indigo-600 hover:text-indigo-850 font-extrabold uppercase italic tracking-wider cursor-pointer font-sans"
            >
              Ontem
            </button>
            <button
              type="button"
              onClick={() => applyQuickDate(0)}
              className="text-[9px] text-indigo-600 hover:text-indigo-850 font-extrabold uppercase italic tracking-wider cursor-pointer font-sans"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[9px] text-slate-400 hover:text-slate-650 font-extrabold uppercase italic tracking-wider cursor-pointer font-sans"
            >
              Fechar
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function SearchablePaymentMethod({
  value,
  onChange
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    return PAYMENT_METHODS.filter(m =>
      m.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  // Reset focus index when search changes or dropdown opens
  useEffect(() => {
    setActiveIndex(0);
  }, [search, isOpen]);

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0) {
        const targetOption = filtered[activeIndex];
        if (targetOption) {
          onChange(targetOption.value);
          setIsOpen(false);
          setSearch('');
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const activeLabel = PAYMENT_METHODS.find(m => m.value === value)?.label || (value === 'transferência' ? 'Transferência' : 'Selecione a forma...');

  return (
    <div className="relative w-full" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 h-12 bg-slate-55 hover:bg-slate-100/90 rounded-xl font-bold text-slate-800 transition-all border border-slate-150 text-left focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer text-xs"
      >
        <span>{activeLabel}</span>
        <ChevronDown className={cn("w-4 h-4 text-slate-450 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-200 p-3.5 z-[9900] animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col gap-2.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              ref={searchInputRef}
              placeholder="Pesquisar forma de pagamento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-9 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1">
            {filtered.map((m, idx) => {
              const isSelected = m.value === value;
              const isHighlighted = idx === activeIndex;

              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => {
                    onChange(m.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-xs font-black transition-colors cursor-pointer flex items-center justify-between border-none",
                    isSelected
                      ? "bg-indigo-50 text-indigo-700"
                      : (isHighlighted ? "bg-slate-100 text-slate-900 font-extrabold" : "hover:bg-slate-50 text-slate-750")
                  )}
                >
                  <span>{m.label}</span>
                  {isSelected && <CheckCircle className="w-3.5 h-3.5 text-indigo-650" />}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center py-4 text-slate-400 italic text-[11px] font-bold">Nenhuma forma encontrada</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EditableCategorySelect({
  type,
  categories,
  value,
  onSelect,
  onCategoriesChange,
  onSaveCategories
}: {
  type: FinanceCategoryKind;
  categories: EditableFinanceCategory[];
  value: string;
  onSelect: (value: string) => void;
  onCategoriesChange: (categories: EditableFinanceCategory[]) => void;
  onSaveCategories: (categories: EditableFinanceCategory[]) => void;
}) {
  const [isManaging, setIsManaging] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSavedNotice, setShowSavedNotice] = useState(false);
  const categoryLabel = type === 'receita' ? 'procedimento' : 'categoria';
  const newCategoryPlaceholder = type === 'receita' ? 'Novo procedimento...' : 'Nova categoria...';
  const duplicateCategoryMessage = type === 'receita' ? 'Esse procedimento já existe.' : 'Essa categoria já existe.';
  const syncedCategoryMessage = type === 'receita' ? 'Procedimentos sincronizados' : 'Categorias sincronizadas';

  useEffect(() => {
    if (!showSavedNotice) return;

    const timeout = window.setTimeout(() => {
      setShowSavedNotice(false);
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [showSavedNotice]);

  const visibleNames = useMemo(() => getCategoryNames(categories, true), [categories]);
  const selectOptions = useMemo(() => {
    if (value && !visibleNames.some(name => name.toLowerCase() === value.toLowerCase())) {
      return [...visibleNames, value];
    }
    return visibleNames;
  }, [value, visibleNames]);
  const filteredSelectOptions = useMemo(() => {
    const term = categorySearch.trim().toLowerCase();
    if (!term) return selectOptions;
    return selectOptions.filter(category => category.toLowerCase().includes(term));
  }, [categorySearch, selectOptions]);

  const hasDuplicateName = (name: string, ignoredId?: string) => {
    const normalized = normalizeCategoryName(name).toLowerCase();
    return categories.some(category => category.id !== ignoredId && category.name.toLowerCase() === normalized);
  };

  const applyCategoryChange = (next: EditableFinanceCategory[]) => {
    onCategoriesChange(next);
    setHasUnsavedChanges(true);
    setShowSavedNotice(false);
  };

  const handleAddCategory = () => {
    const name = normalizeCategoryName(newCategoryName);
    if (!name) return;
    if (hasDuplicateName(name)) {
      alert(duplicateCategoryMessage);
      return;
    }

    const next = [...categories, { id: createCategoryId(type), name, visible: true, deductible: type === 'despesa' ? false : undefined }];
    applyCategoryChange(next);
    onSelect(name);
    setNewCategoryName('');
  };

  const handleRenameCategory = (category: EditableFinanceCategory) => {
    const name = normalizeCategoryName(editingName);
    if (!name) return;
    if (hasDuplicateName(name, category.id)) {
      alert(duplicateCategoryMessage);
      return;
    }

    applyCategoryChange(categories.map(item => (
      item.id === category.id ? { ...item, name } : item
    )));

    if (value === category.name) onSelect(name);
    setEditingId(null);
    setEditingName('');
  };

  const handleDeleteCategory = (category: EditableFinanceCategory) => {
    if (!window.confirm(`Excluir ${type === 'receita' ? 'o procedimento' : 'a categoria'} "${category.name}"?`)) return;

    const next = categories.filter(item => item.id !== category.id);
    applyCategoryChange(next);

    if (value === category.name) {
      const fallback = next.find(item => item.visible)?.name || next[0]?.name || '';
      if (fallback) onSelect(fallback);
    }
  };

  const handleToggleVisibility = (category: EditableFinanceCategory) => {
    applyCategoryChange(categories.map(item => (
      item.id === category.id ? { ...item, visible: !item.visible } : item
    )));
  };

  const handleToggleDeductible = (category: EditableFinanceCategory) => {
    applyCategoryChange(categories.map(item => (
      item.id === category.id ? { ...item, deductible: !item.deductible } : item
    )));
  };

  const handleSaveCategories = () => {
    onSaveCategories(categories);
    setHasUnsavedChanges(false);
    setShowSavedNotice(true);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Select value={value} onValueChange={onSelect}>
          <SelectTrigger className="h-12 w-full font-extrabold text-slate-800 bg-slate-55 border border-slate-150 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs italic">
            <SelectValue placeholder={`Selecione ${type === 'receita' ? 'um procedimento' : 'uma categoria'}`} />
          </SelectTrigger>
          <SelectContent className="max-h-[260px] overflow-y-auto bg-white rounded-xl shadow-xl z-[9990] p-2">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
                placeholder={`Pesquisar ${categoryLabel}...`}
                className="h-9 rounded-lg border-slate-200 pl-8 text-xs font-bold"
              />
            </div>
            {filteredSelectOptions.map(cat => (
              <SelectItem key={cat} value={cat} className="font-extrabold cursor-pointer hover:bg-slate-50 transition-colors italic text-xs py-3 px-4">{cat}</SelectItem>
            ))}
            {filteredSelectOptions.length === 0 && (
              <div className="px-3 py-5 text-center text-[11px] font-bold italic text-slate-400">Nenhum {categoryLabel} encontrado.</div>
            )}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsManaging(!isManaging)}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          title="Gerenciar categorias"
        >
          <Pencil className="w-4 h-4" />
        </Button>
      </div>

      {isManaging && (
        <div className="rounded-xl border border-slate-150 bg-slate-50 p-3 space-y-3 animate-in fade-in duration-150">
          {showSavedNotice && createPortal(
            <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none">
              <div className="pointer-events-auto bg-white border border-emerald-100 rounded-2xl shadow-[0_24px_80px_rgba(15,23,42,0.18)] px-5 py-4 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-150">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-650 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">Alterações salvas com sucesso</p>
                  <p className="text-[11px] font-bold text-slate-400">{type === 'receita' ? 'Procedimentos atualizados para receitas.' : 'Categorias atualizadas para despesas.'}</p>
                </div>
              </div>
            </div>,
            document.body
          )}

          <div className="flex items-center gap-2">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
              placeholder={newCategoryPlaceholder}
              className="h-9 bg-white border-slate-200 rounded-lg text-xs font-bold"
            />
            <Button
              type="button"
              size="icon"
              onClick={handleAddCategory}
              className="h-9 w-9 rounded-lg bg-indigo-650 hover:bg-indigo-700 text-white shrink-0 cursor-pointer"
              title={`Adicionar ${categoryLabel}`}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="max-h-[190px] overflow-y-auto space-y-1 pr-1">
            {categories.map((category) => {
              const isEditing = editingId === category.id;

              return (
                <div key={category.id} className="flex items-center gap-1.5 rounded-lg bg-white border border-slate-150 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(category)}
                    className={cn(
                      "h-7 w-7 rounded-md flex items-center justify-center transition-colors cursor-pointer shrink-0",
                      category.visible ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-300 hover:bg-slate-50"
                    )}
                    title={category.visible ? "Ocultar categoria" : "Mostrar categoria"}
                  >
                    {category.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>

                  {isEditing ? (
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleRenameCategory(category);
                        }
                        if (e.key === 'Escape') {
                          setEditingId(null);
                          setEditingName('');
                        }
                      }}
                      className="h-7 min-w-0 bg-slate-50 border-slate-200 text-[11px] font-bold"
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelect(category.name)}
                      className={cn(
                        "min-w-0 flex-1 text-left text-[11px] font-extrabold truncate rounded-md px-1.5 py-1 cursor-pointer",
                        value === category.name ? "text-indigo-700 bg-indigo-50" : "text-slate-750 hover:bg-slate-50"
                      )}
                    >
                      {category.name}
                    </button>
                  )}

                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRenameCategory(category)}
                        className="h-7 w-7 rounded-md flex items-center justify-center text-indigo-650 hover:bg-indigo-50 cursor-pointer shrink-0"
                        title="Salvar nome"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setEditingName('');
                        }}
                        className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-50 cursor-pointer shrink-0"
                        title="Cancelar edição"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      {type === 'despesa' && (
                        <button
                          type="button"
                          onClick={() => handleToggleDeductible(category)}
                          className={cn(
                            "h-7 rounded-md px-2 text-[9px] font-black uppercase transition-colors cursor-pointer shrink-0",
                            category.deductible ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-400 hover:text-slate-600"
                          )}
                          title={category.deductible ? "Categoria dedutível no Carnê-Leão" : "Marcar como dedutível"}
                        >
                          Ded.
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(category.id);
                          setEditingName(category.name);
                        }}
                        className="h-7 w-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-50 cursor-pointer shrink-0"
                        title="Editar categoria"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category)}
                        className="h-7 w-7 rounded-md flex items-center justify-center text-rose-500 hover:bg-rose-50 cursor-pointer shrink-0"
                        title="Excluir categoria"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
            <span className={cn(
              "text-[10px] font-extrabold",
              hasUnsavedChanges ? "text-amber-600" : "text-slate-400"
            )}>
              {hasUnsavedChanges ? 'Alterações pendentes' : syncedCategoryMessage}
            </span>
            <Button
              type="button"
              onClick={handleSaveCategories}
              className="h-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider px-3 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Salvar {type === 'receita' ? 'Procedimentos' : 'Categorias'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function FinanceModal({ open, onOpenChange, transactionId, initialPatientId, defaultType }: FinanceModalProps) {
  const {
    patients,
    finance,
    addFinance,
    addDocument,
    documents,
    appointments,
    services,
    professionals,
    currentClient
  } = useStore();

  const [showSuccessConfirm, setShowSuccessConfirm] = useState(false);
  const [showMissingPaymentNotice, setShowMissingPaymentNotice] = useState(false);
  const [successSummary, setSuccessSummary] = useState<any>(null);
  const [financeCategories, setFinanceCategories] = useState<FinanceCategoryState>(() => loadFinanceCategoryState());

  const getDefaultCategoryForType = (type: FinanceCategoryKind) => {
    const list = financeCategories[type] || [];
    return list.find(category => category.visible)?.name || list[0]?.name || '';
  };

  const getInitialData = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (transactionId) {
      const trans = finance.find(f => f.id === transactionId);
      if (trans) {
        const linkedFiscalDocument = (documents || []).find(doc => doc.financialTransactionId === trans.id && doc.url)
          || (documents || []).find(doc => {
            if (!doc.url || !trans.patientId || doc.patientId !== trans.patientId) return false;
            const docType = doc.fiscalDocumentType || doc.type;
            const expectedType = trans.fiscalDocumentType || 'nenhum';
            const sameType = expectedType !== 'nenhum' && docType === expectedType;
            const sameAmount = typeof doc.amount !== 'number' || Math.abs(Number(doc.amount) - Number(trans.amount)) < 0.01;
            const sameDate = !doc.date || [trans.fiscalDocumentDate, trans.paymentDate, trans.dueDate].filter(Boolean).includes(doc.date);
            return sameType && sameAmount && sameDate;
          });
        return {
          type: trans.type,
          amount: Number(trans.amount),
          patientId: trans.patientId || 'none',
          professionalId: trans.professionalId || 'none',
          appointmentId: trans.appointmentId || 'none',
          serviceId: services.find(service => service.name === trans.category)?.id || 'none',
          dueDate: trans.dueDate,
          paymentDate: trans.paymentDate || todayStr,
          status: trans.status,
          paymentMethod: trans.paymentMethod || 'não especificado',
          cardInstallments: trans.cardInstallments || 1,
          category: trans.category || getDefaultCategoryForType(trans.type),
          customCategory: '',
          description: trans.description || '',
          paymentSplits: trans.paymentSplits || [],
          fiscalDocumentType: trans.fiscalDocumentType || linkedFiscalDocument?.fiscalDocumentType || (linkedFiscalDocument?.type === 'nota_fiscal' || linkedFiscalDocument?.type === 'recibo' ? linkedFiscalDocument.type : 'nenhum'),
          fiscalDocumentNumber: trans.fiscalDocumentNumber || linkedFiscalDocument?.fiscalDocumentNumber || '',
          fiscalDocumentDate: trans.fiscalDocumentDate || linkedFiscalDocument?.date || trans.paymentDate || todayStr,
          isDeductible: Boolean(trans.isDeductible),
          deductibleCategoryId: trans.deductibleCategoryId || '',
          supplierName: trans.supplierName || '',
          supplierDocument: trans.supplierDocument || '',
          taxEntity: trans.taxEntity || taxEntityForFiscalDocument(trans.fiscalDocumentType || linkedFiscalDocument?.fiscalDocumentType || linkedFiscalDocument?.type),
          fiscalAttachmentName: trans.fiscalAttachmentName || linkedFiscalDocument?.name || '',
          fiscalAttachmentUrl: trans.fiscalAttachmentUrl || linkedFiscalDocument?.url || ''
        };
      }
    }
    return {
      type: defaultType || 'receita' as const,
      amount: 0,
      patientId: initialPatientId || 'none',
      professionalId: 'none',
      appointmentId: 'none',
      serviceId: 'none',
      dueDate: todayStr,
      paymentDate: todayStr,
      status: 'pendente' as const,
      paymentMethod: 'não especificado' as any,
      cardInstallments: 1,
      category: defaultType === 'despesa' ? getDefaultCategoryForType('despesa') : '',
      customCategory: '',
      description: '',
      paymentSplits: [] as any[],
      fiscalDocumentType: 'nenhum' as const,
      fiscalDocumentNumber: '',
      fiscalDocumentDate: todayStr,
      isDeductible: false,
      deductibleCategoryId: '',
      supplierName: '',
      supplierDocument: '',
      taxEntity: 'pessoa_fisica' as const,
      fiscalAttachmentName: '',
      fiscalAttachmentUrl: ''
    };
  };

  const [formData, setFormData] = useState(getInitialData());
  const [displayValue, setDisplayValue] = useState('');
  const [displaySplits, setDisplaySplits] = useState<string[]>([]);
  const [isPaid, setIsPaid] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [fiscalPdfFile, setFiscalPdfFile] = useState<File | null>(null);
  const previousTypeRef = useRef(formData.type);

  useEffect(() => {
    if (open) {
      setShowSuccessConfirm(false);
      setShowMissingPaymentNotice(false);
      setSuccessSummary(null);
      setFiscalPdfFile(null);
      setFinanceCategories(loadFinanceCategoryState());
      const data = getInitialData();
      setFormData(data);
      if (data.type === 'despesa' && data.isDeductible && data.category) {
        setFinanceCategories(prev => ({
          ...prev,
          despesa: (prev.despesa || []).map(category => (
            category.name === data.category ? { ...category, deductible: true } : category
          ))
        }));
      }
      setIsPaid(data.status === 'pago');
      setDisplayValue(formatCurrencyInput(data.amount));

      if (data.paymentSplits) {
        setDisplaySplits(data.paymentSplits.map(s => s.amount ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(s.amount) : ''));
      } else {
        setDisplaySplits([]);
      }
    }
  }, [open, transactionId, defaultType, services]);

  // Adjust default category when type switches
  useEffect(() => {
    if (previousTypeRef.current !== formData.type) {
      previousTypeRef.current = formData.type;
      if (!transactionId) {
        setFormData(prev => ({
          ...prev,
          category: prev.type === 'receita' ? '' : getDefaultCategoryForType('despesa'),
          serviceId: prev.type === 'receita' ? 'none' : prev.serviceId,
          amount: prev.type === 'receita' ? 0 : prev.amount,
          customCategory: ''
        }));
        if (formData.type === 'receita') setDisplayValue('');
      }
    }
  }, [formData.type, transactionId, financeCategories]);

  // Categories based on active type
  const categoriesToUse = useMemo(() => {
    return financeCategories[formData.type] || [];
  }, [financeCategories, formData.type]);

  const selectedExpenseCategory = useMemo(() => {
    if (formData.type !== 'despesa') return null;
    return (financeCategories.despesa || []).find(category => category.name === formData.category) || null;
  }, [financeCategories.despesa, formData.category, formData.type]);

  const procedureOptions = useMemo(() => {
    const term = serviceSearch.trim().toLowerCase();
    return services
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      .filter(service => {
        if (!term) return true;
        return [
          service.name,
          service.category,
          String(service.price || '')
        ].some(value => String(value || '').toLowerCase().includes(term));
      });
  }, [services, serviceSearch]);

  const selectedService = useMemo(() => {
    return services.find(service => service.id === formData.serviceId)
      || services.find(service => service.name === formData.category)
      || null;
  }, [formData.category, formData.serviceId, services]);

  const handleSelectService = (service: typeof services[number]) => {
    const price = Number(service.price || 0);
    setFormData(prev => ({
      ...prev,
      serviceId: service.id,
      category: service.name,
      amount: price
    }));
    setDisplayValue(formatCurrencyInput(price));
  };

  const updateCategoriesForActiveType = (categories: EditableFinanceCategory[]) => {
    setFinanceCategories(prev => ({
      ...prev,
      [formData.type]: categories
    }));
  };

  const saveCategoriesForActiveType = (categories: EditableFinanceCategory[]) => {
    const nextCategories = {
      ...financeCategories,
      [formData.type]: categories
    };

    setFinanceCategories(nextCategories);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(FINANCE_CATEGORY_STORAGE_KEY, JSON.stringify(nextCategories));
    }
  };

  const filteredPatientsForSelect = useMemo(() => {
    const term = patientSearch.trim().toLowerCase();
    return patients
      .filter(patient => !term || patient.name.toLowerCase().includes(term) || String(patient.phone || '').toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [patients, patientSearch]);

  const patientShortcutList = useMemo(() => {
    if (formData.type !== 'receita') return [];
    const recentPatientIds = Array.from(new Set(
      appointments
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(appt => appt.patientId)
        .filter(Boolean)
    ));
    const recentPatients = recentPatientIds
      .map(id => patients.find(patient => patient.id === id))
      .filter(Boolean) as typeof patients;
    const remainingPatients = patients
      .filter(patient => !recentPatientIds.includes(patient.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [...recentPatients, ...remainingPatients].slice(0, 6);
  }, [appointments, formData.type, patients]);

  const professionalOptions = useMemo(() => {
    return professionals
      .filter(professional => professional.active !== false)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [professionals]);

  const selectedProfessional = useMemo(() => {
    return professionalOptions.find(professional => professional.id === formData.professionalId) || null;
  }, [formData.professionalId, professionalOptions]);

  // Value formatting helpers
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const numValue = Number(raw) / 100;
    setFormData({ ...formData, amount: numValue });

    if (numValue > 0) {
      setDisplayValue(new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numValue));
    } else {
      setDisplayValue('');
    }
  };

  const handleSplitValueChange = (index: number, val: string) => {
    const raw = val.replace(/\D/g, '');
    const numValue = Number(raw) / 100;

    const splits = [...(formData.paymentSplits || [])];
    splits[index] = { ...splits[index], amount: numValue };
    setFormData({ ...formData, paymentSplits: splits });

    const displays = [...displaySplits];
    displays[index] = numValue > 0 ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numValue) : '';
    setDisplaySplits(displays);
  };

  const getDaysOverdue = (dueDateStr: string) => {
    if (!dueDateStr) return 0;
    const [year, month, day] = dueDateStr.split('-');
    const due = new Date(Number(year), Number(month) - 1, Number(day));
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - due.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const sanitizeFileName = (name: string) => {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'documento-fiscal.pdf';
  };

  const saveFiscalPdf = async (file: File, patientId: string) => {
    if (currentClient?.id) {
      try {
        const path = `${currentClient.id}/${patientId}/${Date.now()}-${sanitizeFileName(file.name)}`;
        const { error } = await supabase.storage.from(fiscalDocumentsBucket).upload(path, file, {
          contentType: 'application/pdf',
          upsert: false
        });
        if (!error) {
          const publicUrl = supabase.storage.from(fiscalDocumentsBucket).getPublicUrl(path).data.publicUrl;
          if (publicUrl) return publicUrl;
        }
        console.warn('Upload do PDF fiscal indisponível; usando fallback local.', error);
      } catch (err) {
        console.warn('Upload do PDF fiscal indisponível; usando fallback local.', err);
      }
    }
    return readFileAsDataUrl(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.amount <= 0) {
      alert('Por favor, informe um valor maior do que zero.');
      return;
    }

    if (!formData.category) {
      alert(formData.type === 'receita' ? 'Por favor, selecione um procedimento cadastrado em Serviços.' : 'Por favor, selecione ou crie uma categoria.');
      return;
    }

    if (fiscalPdfFile) {
      const isPdf = fiscalPdfFile.type === 'application/pdf' || fiscalPdfFile.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        alert('Anexe apenas arquivos PDF para nota fiscal ou recibo.');
        return;
      }
      if (fiscalPdfFile.size > MAX_FISCAL_PDF_SIZE_BYTES) {
        alert('O PDF fiscal deve ter no máximo 10 MB nesta versão.');
        return;
      }
      if (formData.type !== 'receita' || formData.fiscalDocumentType === 'nenhum') {
        alert('Para anexar PDF, selecione Nota fiscal ou Recibo no documento fiscal da receita.');
        return;
      }
      if (formData.patientId === 'none') {
        alert('Selecione um paciente para anexar a nota fiscal ou recibo no cadastro dele.');
        return;
      }
    }

    if (formData.paymentMethod === 'múltiplo') {
      const splits = formData.paymentSplits || [];
      const totalSplits = splits.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(totalSplits - formData.amount) > 0.01) {
        alert(`O valor total das divisões (R$ ${totalSplits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) deve ser exatamente igual ao valor do lançamento (R$ ${formData.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`);
        return;
      }
    }

    // Automatic Status Determination
    let finalStatus: 'pago' | 'pendente' | 'atrasado' = 'pendente';
    if (isPaid) {
      finalStatus = 'pago';
    } else {
      const delayDays = getDaysOverdue(formData.dueDate);
      finalStatus = delayDays > 0 ? 'atrasado' : 'pendente';
    }

    if (finalStatus === 'pago' && isMissingPaymentMethod(formData.paymentMethod)) {
      setShowMissingPaymentNotice(true);
      return;
    }

    if (formData.type === 'receita' && !formData.patientId) {
      alert('Receitas precisam estar vinculadas a um cliente/paciente ou marcadas como Diversos.');
      return;
    }

    if (formData.type === 'receita' && finalStatus === 'pago' && formData.fiscalDocumentType !== 'nenhum') {
      const hasFiscalPdf = Boolean(fiscalPdfFile || formData.fiscalAttachmentUrl);
      if (formData.fiscalDocumentType === 'nota_fiscal' && !formData.fiscalDocumentNumber.trim()) {
        alert('Para dar baixa em receita com nota fiscal, informe o número da nota.');
        return;
      }
      if (!hasFiscalPdf) {
        alert('Para dar baixa em receita com nota fiscal ou recibo, anexe o PDF do documento.');
        return;
      }
    }

    const duplicateDate = finalStatus === 'pago' ? formData.paymentDate : formData.dueDate;
    const duplicate = finance.find(tx => {
      if (transactionId && tx.id === transactionId) return false;
      const txDate = tx.status === 'pago' && tx.paymentDate ? tx.paymentDate : tx.dueDate;
      return tx.type === formData.type
        && Number(tx.amount || 0) === Number(formData.amount || 0)
        && txDate === duplicateDate
        && (tx.patientId || 'none') === formData.patientId;
    });

    if (duplicate) {
      const duplicatePatient = formData.patientId === 'none'
        ? (formData.type === 'receita' ? 'Diversos' : 'sem paciente')
        : patients.find(patient => patient.id === formData.patientId)?.name || 'cliente selecionado';
      const proceed = window.confirm(
        `Possível lançamento duplicado encontrado para ${duplicatePatient}: mesmo valor, data e cliente. Deseja salvar mesmo assim?`
      );
      if (!proceed) return;
    }

    const categoryIsDeductible = formData.type === 'despesa' && selectedExpenseCategory?.deductible === true;
    let fiscalAttachmentUrl = '';

    if (fiscalPdfFile) {
      try {
        fiscalAttachmentUrl = await saveFiscalPdf(fiscalPdfFile, formData.patientId);
      } catch {
        alert('Não foi possível ler o PDF anexado. Tente selecionar o arquivo novamente.');
        return;
      }
    }

    const payload: any = {
      type: formData.type,
      amount: formData.amount,
      patientId: formData.patientId === 'none' ? undefined : formData.patientId,
      professionalId: formData.type === 'receita' && formData.professionalId !== 'none' ? formData.professionalId : undefined,
      appointmentId: formData.appointmentId === 'none' ? undefined : formData.appointmentId,
      dueDate: formData.dueDate,
      paymentDate: finalStatus === 'pago' ? formData.paymentDate : undefined,
      status: finalStatus,
      paymentMethod: formData.paymentMethod,
      cardInstallments: formData.paymentMethod === 'cartão de crédito' ? Number(formData.cardInstallments || 1) : null,
      category: formData.category,
      description: formData.description,
      paymentSplits: formData.paymentMethod === 'múltiplo' ? formData.paymentSplits : [],
      fiscalDocumentType: formData.type === 'receita' ? formData.fiscalDocumentType : 'nenhum',
      fiscalDocumentNumber: formData.type === 'receita' && formData.fiscalDocumentType === 'nota_fiscal' ? formData.fiscalDocumentNumber : undefined,
      fiscalDocumentDate: formData.type === 'receita' && formData.fiscalDocumentType !== 'nenhum' ? formData.fiscalDocumentDate : undefined,
      isDeductible: categoryIsDeductible,
      deductibleCategoryId: undefined,
      supplierName: formData.type === 'despesa' ? formData.supplierName : undefined,
      supplierDocument: formData.type === 'despesa' ? formData.supplierDocument : undefined,
      taxEntity: formData.type === 'receita'
        ? taxEntityForFiscalDocument(formData.fiscalDocumentType, formData.taxEntity)
        : formData.taxEntity
    };

    if (fiscalPdfFile && fiscalAttachmentUrl) {
      payload.fiscalAttachmentName = fiscalPdfFile.name;
      payload.fiscalAttachmentUrl = fiscalAttachmentUrl;
    } else if (formData.type === 'receita' && formData.fiscalDocumentType !== 'nenhum' && formData.fiscalAttachmentUrl) {
      payload.fiscalAttachmentName = formData.fiscalAttachmentName;
      payload.fiscalAttachmentUrl = formData.fiscalAttachmentUrl;
    } else if (formData.type !== 'receita' || formData.fiscalDocumentType === 'nenhum') {
      payload.fiscalAttachmentName = undefined;
      payload.fiscalAttachmentUrl = undefined;
    }

    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined)
    ) as any;

    let savedTransactionId = transactionId || '';
    if (transactionId) {
      useStore.getState().updateFinance(transactionId, cleanPayload);
    } else {
      savedTransactionId = addFinance(cleanPayload as any);
    }

    if (fiscalPdfFile && fiscalAttachmentUrl && formData.type === 'receita' && formData.patientId !== 'none' && formData.fiscalDocumentType !== 'nenhum') {
      const docLabel = formData.fiscalDocumentType === 'nota_fiscal' ? 'Nota fiscal' : 'Recibo';
      addDocument({
        patientId: formData.patientId,
        name: `${docLabel} - ${formData.description || formData.category || 'Receita'} - ${fiscalPdfFile.name}`,
        type: formData.fiscalDocumentType,
        date: formData.fiscalDocumentDate || formData.paymentDate || formData.dueDate,
        url: fiscalAttachmentUrl,
        status: 'gerado',
        financialTransactionId: savedTransactionId,
        fiscalDocumentType: formData.fiscalDocumentType,
        fiscalDocumentNumber: formData.fiscalDocumentNumber || undefined,
        amount: formData.amount,
        category: formData.category
      });
    }

    // Bidirectional sync with appointments
    if (cleanPayload.appointmentId && cleanPayload.appointmentId !== 'none') {
      useStore.getState().updateAppointment(cleanPayload.appointmentId, {
        paymentStatus: finalStatus as any,
        paymentMethod: cleanPayload.paymentMethod as any,
        cardInstallments: cleanPayload.cardInstallments,
        upfrontPaid: finalStatus === 'pago',
        upfrontPaidAmount: cleanPayload.amount,
        paymentDate: cleanPayload.paymentDate,
        paymentSplits: cleanPayload.paymentSplits || []
      }, true);
    }

    setSuccessSummary({
      description: formData.description || (formData.type === 'receita' ? 'Recebimento de Consulta/Procedimento' : 'Pagamento Operacional'),
      amount: formData.amount,
      type: formData.type,
      category: formData.category,
      date: finalStatus === 'pago' ? formData.paymentDate : formData.dueDate,
      status: finalStatus
    });
    setFiscalPdfFile(null);
    setShowSuccessConfirm(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Dialog content inherits the default z-50 overlay which matches other components and lets portal select mount on top correctly */}
      <DialogContent showCloseButton={false} className="max-w-md sm:max-w-3xl lg:max-w-4xl w-full bg-white border-none rounded-[2rem] p-6 shadow-2xl overflow-visible font-sans">

        {showSuccessConfirm && successSummary ? (
          /* SUCCESS CONFIRMATION PANEL */
          <div className="bg-slate-50 flex items-center justify-center p-6 rounded-2xl">
            <div className="bg-white max-w-md w-full rounded-[2rem] p-8 border border-slate-100 shadow-xl space-y-6 flex flex-col items-center justify-center animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2 text-center">
                <h2 className="text-xl font-black text-slate-900 italic">Lançamento Confirmado!</h2>
                <p className="text-xs text-slate-500">A transação foi registrada nas finanças com sucesso.</p>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 w-full text-left space-y-3.5 text-xs font-semibold text-slate-600">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400">Tipo:</span>
                  <span className={cn("font-bold uppercase text-[10px]", successSummary.type === 'receita' ? "text-emerald-600" : "text-rose-600")}>
                    {successSummary.type === 'receita' ? '📈 Receita' : '📉 Despesa'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400">Descrição:</span>
                  <span className="text-slate-800 font-extrabold italic truncate max-w-[240px]">{successSummary.description}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400">{successSummary.type === 'receita' ? 'Procedimento:' : 'Categoria:'}</span>
                  <span className="text-slate-800 font-bold">{successSummary.category}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400">Data:</span>
                  <span className="text-slate-800 font-mono">{format(new Date(successSummary.date + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-400">Valor Final:</span>
                  <span className="text-lg font-mono font-black italic text-slate-900">
                    R$ {successSummary.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <Button
                onClick={() => {
                  setShowSuccessConfirm(false);
                  onOpenChange(false);
                }}
                className="w-full bg-slate-900 hover:bg-slate-850 text-white font-extrabold rounded-xl h-12 uppercase text-xs tracking-wider cursor-pointer"
              >
                Concluído
              </Button>
            </div>
          </div>
        ) : showMissingPaymentNotice ? (
          <div className="bg-amber-50/70 flex items-center justify-center p-6 rounded-2xl">
            <div className="bg-white max-w-md w-full rounded-[2rem] p-8 border border-amber-100 shadow-xl space-y-6 flex flex-col items-center justify-center animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shadow-inner">
                <AlertTriangle className="w-9 h-9" />
              </div>

              <div className="space-y-2 text-center">
                <h2 className="text-xl font-black text-slate-900 italic">Forma de pagamento obrigatoria</h2>
                <p className="text-xs font-bold leading-relaxed text-slate-500">
                  Para salvar uma receita ou despesa como paga, selecione primeiro a forma de pagamento usada na liquidacao.
                </p>
              </div>

              <div className="w-full rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-left">
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Lancamento marcado como pago</p>
                <p className="mt-1 text-xs font-bold text-amber-950">
                  Volte ao formulario e escolha Pix, dinheiro, cartao, boleto ou multiplas formas antes de confirmar.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => setShowMissingPaymentNotice(false)}
                className="w-full bg-slate-900 hover:bg-slate-850 text-white font-extrabold rounded-xl h-12 uppercase text-xs tracking-wider cursor-pointer"
              >
                Escolher forma de pagamento
              </Button>
            </div>
          </div>
        ) : (
          /* EXPANDED GRID FORM WORKSPACE */
          <>
            {/* Header */}
            <div className="pb-4 border-b border-slate-100 flex items-center justify-between mb-4">
              <div>
                <DialogTitle className="text-2xl font-black italic text-slate-900">
                  {transactionId
                    ? (formData.type === 'despesa' ? 'Editar Despesa' : 'Editar Receita')
                    : (formData.type === 'despesa' ? 'Nova Despesa' : 'Nova Receita')
                  }
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Insira ou edite as informações de fluxo de caixa da clínica.
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-slate-450 hover:bg-slate-100 font-black italic rounded-xl px-4 h-10 text-xs uppercase tracking-wider shrink-0 border border-slate-200 transition-all cursor-pointer"
              >
                Fechar X
              </Button>
            </div>

            {/* Scrollable Form */}
            <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto pr-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

                {/* COLUMN 1 - CORE TRANSACTION DETAILS */}
                <div className="space-y-5 bg-white p-5 rounded-2xl border border-slate-150 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <span className="w-5 h-5 rounded-full bg-slate-105 text-slate-700 flex items-center justify-center font-black text-[10px]">1</span>
                    <h3 className="text-slate-900 font-extrabold text-[10px] uppercase tracking-wider">Lançamento</h3>
                  </div>

                  {formData.type === 'receita' ? (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-slate-450 font-black text-[9px] uppercase tracking-wider font-sans">Procedimento</Label>
                          <span className="text-[9px] font-bold text-slate-400">{services.length} cadastrados</span>
                        </div>
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3 space-y-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500" />
                            <Input
                              value={serviceSearch}
                              onChange={(event) => setServiceSearch(event.target.value)}
                              placeholder="Buscar procedimento cadastrado..."
                              className="h-10 rounded-xl border-emerald-100 bg-white pl-8 text-xs font-bold"
                            />
                          </div>

                          <div className="grid grid-cols-1 gap-2 max-h-[230px] overflow-y-auto pr-1">
                            {procedureOptions.map(service => {
                              const selected = selectedService?.id === service.id;
                              return (
                                <button
                                  key={service.id}
                                  type="button"
                                  onClick={() => handleSelectService(service)}
                                  className={cn(
                                    'rounded-xl border px-3 py-3 text-left transition-all flex items-center justify-between gap-3',
                                    selected
                                      ? 'border-emerald-300 bg-white shadow-sm ring-2 ring-emerald-100'
                                      : 'border-white bg-white/80 hover:border-emerald-200 hover:bg-white'
                                  )}
                                >
                                  <span className="min-w-0">
                                    <span className="block truncate text-xs font-black text-slate-900">{service.name}</span>
                                    <span className="mt-1 block truncate text-[10px] font-bold uppercase text-slate-400">{service.category || 'Serviço'} · {service.durationMinutes || 0} min</span>
                                  </span>
                                  <span className="flex shrink-0 items-center gap-2">
                                    <span className="font-mono text-xs font-black text-emerald-700">
                                      {Number(service.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                    {selected && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                                  </span>
                                </button>
                              );
                            })}
                            {procedureOptions.length === 0 && (
                              <div className="rounded-xl border border-dashed border-emerald-200 bg-white px-3 py-5 text-center text-[11px] font-bold italic text-slate-400">
                                Nenhum procedimento cadastrado encontrado em Serviços.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-slate-450 font-black text-[9px] uppercase tracking-wider font-sans">Descrição / Notas <span className="text-slate-300">opcional</span></Label>
                        <div className="relative">
                          <FileText className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                          <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            placeholder="Observação interna, se precisar..."
                            autoComplete="off"
                            className="pl-11 pr-4 py-3 min-h-[70px] w-full border border-slate-150 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 resize-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-slate-450 font-black text-[9px] uppercase tracking-wider font-sans">Valor Cobrado (automático pelo serviço)</Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400 font-mono">R$</span>
                          <Input
                            value={displayValue}
                            onChange={handleValueChange}
                            placeholder=""
                            autoComplete="off"
                            className="pl-11 h-12 bg-slate-50 border-none rounded-xl font-mono font-black text-base text-slate-950 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            required
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <Label className="text-slate-450 font-black text-[9px] uppercase tracking-wider font-sans">Descrição / Notas</Label>
                        <div className="relative">
                          <FileText className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                          <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            placeholder=""
                            autoComplete="off"
                            className="pl-11 pr-4 py-3 min-h-[70px] w-full border border-slate-150 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 resize-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-slate-450 font-black text-[9px] uppercase tracking-wider font-sans">Valor Cobrado (R$)</Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400 font-mono">R$</span>
                          <Input
                            value={displayValue}
                            onChange={handleValueChange}
                            placeholder=""
                            autoComplete="off"
                            className="pl-11 h-12 bg-slate-50 border-none rounded-xl font-mono font-black text-base text-slate-950 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-slate-450 font-black text-[9px] uppercase tracking-wider font-sans">Categoria</Label>
                          <span className="text-[9px] font-bold text-slate-400">{categoriesToUse.filter(category => category.visible).length} Visíveis</span>
                        </div>
                        <EditableCategorySelect
                          type={formData.type}
                          categories={categoriesToUse}
                          value={formData.category}
                          onSelect={(v) => setFormData({...formData, category: v})}
                          onCategoriesChange={updateCategoriesForActiveType}
                          onSaveCategories={saveCategoriesForActiveType}
                        />
                      </div>
                    </>
                  )}

                  {formData.type === 'receita' ? (
                    <div className="space-y-5 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                          <Receipt className="h-4 w-4" />
                        </div>
                        <div>
                          <Label className="text-emerald-900 font-black text-[10px] uppercase tracking-wider font-sans">Documento fiscal da receita</Label>
                          <p className="mt-1 text-[11px] font-bold leading-relaxed text-emerald-800/70">Informe nota fiscal, recibo ou deixe sem documento para conferência do Carnê-Leão.</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2 min-w-0">
                          <Label className="text-[9px] font-black uppercase text-emerald-700">Tipo</Label>
                          <div className="grid grid-cols-1 gap-2">
                            {[
                              { value: 'nenhum', label: 'Sem documento' },
                              { value: 'nota_fiscal', label: 'Nota fiscal' },
                              { value: 'recibo', label: 'Recibo' }
                            ].map(option => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    fiscalDocumentType: option.value as any,
                                    fiscalDocumentNumber: option.value === 'nota_fiscal' ? formData.fiscalDocumentNumber : '',
                                    fiscalDocumentDate: option.value === 'nenhum' ? '' : (formData.fiscalDocumentDate || formData.paymentDate || formData.dueDate),
                                    fiscalAttachmentName: option.value === 'nenhum' ? '' : formData.fiscalAttachmentName,
                                    fiscalAttachmentUrl: option.value === 'nenhum' ? '' : formData.fiscalAttachmentUrl,
                                    taxEntity: taxEntityForFiscalDocument(option.value, formData.taxEntity)
                                  });
                                  if (option.value === 'nenhum') setFiscalPdfFile(null);
                                }}
                                className={cn(
                                  'min-h-12 rounded-xl border px-3 py-2 text-left text-xs font-black transition-colors',
                                  formData.fiscalDocumentType === option.value
                                    ? 'border-emerald-500 bg-white text-emerald-800 shadow-sm ring-2 ring-emerald-100'
                                    : 'border-emerald-100 bg-white/70 text-slate-500 hover:bg-white hover:text-slate-800'
                                )}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {formData.fiscalDocumentType === 'nota_fiscal' && (
                          <div className="space-y-1.5 min-w-0">
                            <Label className="text-[9px] font-black uppercase text-emerald-700">Número da nota fiscal</Label>
                            <Input
                              value={formData.fiscalDocumentNumber}
                              onChange={(event) => setFormData({ ...formData, fiscalDocumentNumber: event.target.value })}
                              className="h-12 rounded-xl bg-white border-emerald-100 text-sm font-bold"
                              placeholder="Número da NF"
                            />
                          </div>
                        )}

                        {formData.fiscalDocumentType !== 'nenhum' && (
                          <div className="space-y-1.5 min-w-0">
                            <Label className="text-[9px] font-black uppercase text-emerald-700">Data do documento</Label>
                            <CustomDatePicker
                              value={formData.fiscalDocumentDate}
                              onChange={(date) => setFormData({ ...formData, fiscalDocumentDate: date })}
                            />
                          </div>
                        )}

                        {formData.fiscalDocumentType !== 'nenhum' && (
                          <div className="space-y-2 rounded-xl border border-emerald-100 bg-white p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <Label className="text-[9px] font-black uppercase text-emerald-700">PDF do documento</Label>
                                <p className="mt-1 text-[10px] font-bold text-emerald-800/60">Anexe a nota fiscal ou recibo para ficar salvo no cadastro do paciente.</p>
                              </div>
                              {fiscalPdfFile && (
                                <button
                                  type="button"
                                  onClick={() => setFiscalPdfFile(null)}
                                  className="rounded-lg bg-rose-50 px-2 py-1 text-[9px] font-black uppercase text-rose-600"
                                >
                                  Remover
                                </button>
                              )}
                            </div>
                            {formData.fiscalAttachmentUrl && !fiscalPdfFile && (
                              <div className="flex flex-col gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <p className="text-[9px] font-black uppercase text-emerald-700">PDF anexado</p>
                                  <p className="truncate text-xs font-black text-emerald-950">{formData.fiscalAttachmentName || 'Documento fiscal'}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-8 rounded-lg border-emerald-200 bg-white text-[10px] font-black text-emerald-800"
                                    onClick={() => window.open(formData.fiscalAttachmentUrl, '_blank')}
                                  >
                                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                    Abrir
                                  </Button>
                                  <a
                                    href={formData.fiscalAttachmentUrl}
                                    download={formData.fiscalAttachmentName || 'documento-fiscal.pdf'}
                                    className="inline-flex h-8 items-center rounded-lg border border-emerald-200 bg-white px-2.5 text-[10px] font-black text-emerald-800 hover:bg-emerald-50"
                                  >
                                    <Download className="mr-1.5 h-3.5 w-3.5" />
                                    Baixar
                                  </a>
                                </div>
                              </div>
                            )}
                            <label className={cn(
                              'flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3 py-2 transition-colors',
                              fiscalPdfFile ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-emerald-300 hover:bg-emerald-50'
                            )}>
                              <FileText className="h-4 w-4 shrink-0" />
                              <span className="min-w-0 flex-1 truncate text-xs font-black">
                                {fiscalPdfFile ? fiscalPdfFile.name : 'Selecionar PDF'}
                              </span>
                              <input
                                type="file"
                                accept="application/pdf,.pdf"
                                className="hidden"
                                onChange={(event) => {
                                  const file = event.target.files?.[0] || null;
                                  if (file && file.size > MAX_FISCAL_PDF_SIZE_BYTES) {
                                    alert('O PDF fiscal deve ter no máximo 10 MB nesta versão.');
                                    event.target.value = '';
                                    return;
                                  }
                                  setFiscalPdfFile(file);
                                  event.target.value = '';
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-rose-700" />
                        <Label className="text-rose-800 font-black text-[9px] uppercase tracking-wider font-sans">Dados da despesa</Label>
                      </div>
                      <div className={cn(
                        "rounded-xl border px-3 py-2 text-[11px] font-bold",
                        selectedExpenseCategory?.deductible
                          ? "border-rose-200 bg-white text-rose-700"
                          : "border-slate-200 bg-white text-slate-500"
                      )}>
                        {selectedExpenseCategory?.deductible
                          ? 'Esta categoria entra automaticamente como despesa dedutível no Carnê-Leão.'
                          : 'Esta categoria não está marcada como dedutível. Ajuste isso no Carnê-Leão, pelo botão Categorias dedutíveis.'}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 rounded-2xl border border-slate-150 bg-slate-50 p-4">
                    <div className="flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-slate-700" />
                      <Label className="text-slate-800 font-black text-[9px] uppercase tracking-wider font-sans">Conta fiscal</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'pessoa_fisica', label: 'Pessoa física', hint: 'Carnê-Leão' },
                        { value: 'pessoa_juridica', label: 'Pessoa jurídica', hint: 'PJ / empresa' }
                      ].map(option => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, taxEntity: option.value as any })}
                          className={cn(
                            'min-h-12 rounded-xl border px-3 py-2 text-left transition-colors',
                            formData.taxEntity === option.value
                              ? 'border-indigo-500 bg-white text-indigo-800 shadow-sm ring-2 ring-indigo-100'
                              : 'border-slate-200 bg-white/80 text-slate-500 hover:bg-white hover:text-slate-800'
                          )}
                        >
                          <span className="block text-xs font-black">{option.label}</span>
                          <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-wider opacity-70">{option.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Automatic Status Toggle */}
                  <div className="space-y-1.5">
                    <Label className="text-slate-450 font-black text-[9px] uppercase tracking-wider font-sans">Pago / Quitado?</Label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-100/60 p-1 rounded-xl border border-slate-150">
                      <button
                        type="button"
                        onClick={() => setIsPaid(true)}
                        className={cn(
                          "h-10 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none",
                          isPaid
                            ? "bg-emerald-600 text-white shadow-sm font-black"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                        )}
                      >
                        <span>Sim, já pago</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMissingPaymentNotice(false);
                          setIsPaid(false);
                        }}
                        className={cn(
                          "h-10 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none",
                          !isPaid
                            ? "bg-amber-500 text-white shadow-sm font-black"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                        )}
                      >
                        <span>Não (Pendente)</span>
                      </button>
                    </div>
                  </div>

                  {/* Dates Selection (Format dd/MM/yyyy) */}
                      <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <Label className="text-slate-450 font-black text-[9px] uppercase tracking-wider font-sans">Data de Vencimento</Label>
                      <CustomDatePicker
                        value={formData.dueDate}
                        onChange={(val) => setFormData(prev => ({ ...prev, dueDate: val }))}
                      />
                    </div>

                    {isPaid && (
                      <div className="space-y-1 animate-in fade-in duration-200">
                        <Label className="text-slate-450 font-black text-[9px] uppercase tracking-wider font-sans">Data do Pagamento</Label>
                        <CustomDatePicker
                          value={formData.paymentDate}
                          onChange={(val) => setFormData(prev => ({ ...prev, paymentDate: val }))}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUMN 2 - PAYMENT METHOD & BINDINGS */}
                <div className="space-y-6">

                  {/* Forma de Pagamento */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <span className="w-5 h-5 rounded-full bg-slate-105 text-slate-700 flex items-center justify-center font-black text-[10px]">2</span>
                      <h3 className="text-slate-900 font-extrabold text-[10px] uppercase tracking-wider">Forma de Pagamento</h3>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-slate-450 font-black text-[9px] uppercase tracking-wider font-sans">Método de Liquidação</Label>
                      <SearchablePaymentMethod
                        value={formData.paymentMethod}
                        onChange={(v) => {
                          setShowMissingPaymentNotice(false);
                          setFormData({
                          ...formData,
                          paymentMethod: v as any,
                          cardInstallments: v === 'cartão de crédito' ? (formData.cardInstallments || 1) : 1
                          });
                        }}
                      />
                    </div>

                    {formData.paymentMethod === 'cartão de crédito' && (
                      <div className="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between gap-3">
                          <Label className="text-[9px] font-black uppercase tracking-wider text-indigo-700">Parcelamento</Label>
                          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-indigo-700 border border-indigo-100">
                            {formData.cardInstallments || 1}x
                          </span>
                        </div>
                        <div className="grid grid-cols-6 gap-1.5">
                          {Array.from({ length: 12 }, (_, index) => index + 1).map(installment => (
                            <button
                              key={installment}
                              type="button"
                              onClick={() => setFormData({ ...formData, cardInstallments: installment })}
                              className={cn(
                                'h-8 rounded-lg border text-[10px] font-black transition-colors',
                                Number(formData.cardInstallments || 1) === installment
                                  ? 'border-indigo-500 bg-indigo-600 text-white'
                                  : 'border-indigo-100 bg-white text-slate-600 hover:bg-indigo-50'
                              )}
                            >
                              {installment}x
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Splits form layout */}
                    {formData.paymentMethod === 'múltiplo' && (
                      <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-150 shadow-sm animate-in fade-in duration-200 w-full">
                        <div className="flex justify-between items-center border-b border-slate-200/50 pb-2">
                          <span className="text-[10px] font-black text-slate-500 uppercase">Divisão de formas</span>
                          <Button
                            type="button"
                            size="sm"
                            className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-[9px] uppercase rounded-lg h-7 px-2.5 cursor-pointer border-none"
                            onClick={() => {
                              const splits = formData.paymentSplits || [];
                              const currentTotal = splits.reduce((sum, s) => sum + s.amount, 0);
                              const remaining = Math.max(0, formData.amount - currentTotal);
                              setFormData({
                                ...formData,
                                paymentSplits: [
                                  ...splits,
                                  { method: 'pix', amount: remaining, status: 'pago', paymentDate: formData.paymentDate || formData.dueDate }
                                ]
                              });
                              setDisplaySplits([
                                ...displaySplits,
                                remaining === 0 ? '' : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(remaining)
                              ]);
                            }}
                          >
                            + Adicionar
                          </Button>
                        </div>

                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {(formData.paymentSplits || []).map((split, index) => (
                            <div key={index} className="bg-white p-3 rounded-xl border border-slate-150 shadow-sm flex flex-wrap items-center gap-2">
                              <Select
                                value={split.method}
                                onValueChange={(v) => {
                                  const splits = [...(formData.paymentSplits || [])];
                                  splits[index] = { ...split, method: v as any };
                                  setFormData({ ...formData, paymentSplits: splits });
                                }}
                              >
                                <SelectTrigger className="h-10 border-slate-200 text-[11px] font-bold w-full sm:w-[132px] rounded-lg bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-[9990] bg-white">
                                  <SelectItem value="pix">Pix</SelectItem>
                                  <SelectItem value="cartão de crédito">C. Crédito</SelectItem>
                                  <SelectItem value="cartão de débito">C. Débito</SelectItem>
                                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                  <SelectItem value="boleto">Boleto</SelectItem>
                                </SelectContent>
                              </Select>

                              <div className="relative w-full sm:min-w-[160px] sm:flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 font-mono">R$</span>
                                <Input
                                  type="text"
                                  placeholder=""
                                  autoComplete="off"
                                  className="pl-9 h-10 border-slate-200 text-xs font-black w-full rounded-lg font-mono bg-white"
                                  value={displaySplits[index] || ''}
                                  onChange={(e) => handleSplitValueChange(index, e.target.value)}
                                />
                              </div>

                              {split.method === 'cartão de crédito' && (
                                <Select
                                  value={String(split.installments || 1)}
                                  onValueChange={(v) => {
                                    const splits = [...(formData.paymentSplits || [])];
                                    splits[index] = { ...split, installments: Number(v) };
                                    setFormData({ ...formData, paymentSplits: splits });
                                  }}
                                >
                                  <SelectTrigger className="h-10 border-slate-200 text-[11px] font-bold w-20 rounded-lg bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="z-[9990] bg-white">
                                    {[...Array(12)].map((_, i) => (
                                      <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}x</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}

                              <Select
                                value={split.status}
                                onValueChange={(v) => {
                                  const splits = [...(formData.paymentSplits || [])];
                                  splits[index] = { ...split, status: v as any };
                                  setFormData({ ...formData, paymentSplits: splits });
                                }}
                              >
                                <SelectTrigger className="h-10 border-slate-200 text-[11px] font-bold w-full sm:w-[112px] rounded-lg bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-[9990] bg-white">
                                  <SelectItem value="pago">Pago</SelectItem>
                                  <SelectItem value="pendente">Pendente</SelectItem>
                                </SelectContent>
                              </Select>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-55 cursor-pointer rounded-lg shrink-0"
                                onClick={() => {
                                  const splits = (formData.paymentSplits || []).filter((_, i) => i !== index);
                                  setFormData({ ...formData, paymentSplits: splits });
                                  setDisplaySplits(displaySplits.filter((_, i) => i !== index));
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        {(() => {
                          const splits = formData.paymentSplits || [];
                          const totalSplits = splits.reduce((sum, s) => sum + s.amount, 0);
                          const matchesTotal = Math.abs(totalSplits - formData.amount) < 0.01;

                          return (
                            <div className="pt-2 border-t border-slate-200/50 flex justify-between items-center text-[10px] font-bold">
                              <span className="text-slate-500">Distribuído: R$ {totalSplits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              <span className={cn(
                                "px-2 py-0.5 rounded-full uppercase text-[8px]",
                                matchesTotal ? "bg-green-50 text-green-700 font-extrabold" : "bg-red-50 text-red-750 font-black animate-pulse"
                              )}>
                                {matchesTotal ? 'Valores conferem' : `Falta R$ ${(formData.amount - totalSplits).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Vínculo Clínico (Only for Revenue) */}
                  {formData.type === 'receita' ? (
                    <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <span className="w-5 h-5 rounded-full bg-slate-105 text-slate-700 flex items-center justify-center font-black text-[10px]">3</span>
                        <h3 className="text-slate-900 font-extrabold text-[10px] uppercase tracking-wider">Vínculo Clínico</h3>
                      </div>

                      <div className="space-y-3 rounded-xl border border-slate-150 bg-slate-50 p-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <Label className="text-[8px] text-indigo-650 font-black uppercase tracking-wider block">Profissional responsável</Label>
                            <span className="max-w-[150px] truncate rounded-full bg-white px-2 py-1 text-[9px] font-black text-slate-500 border border-slate-150">
                              {selectedProfessional?.name || 'Sem profissional'}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, professionalId: 'none' })}
                              className={cn(
                                'min-h-[58px] rounded-xl border px-3 py-2 text-left transition-all flex items-center gap-3',
                                formData.professionalId === 'none' || !formData.professionalId
                                  ? 'border-indigo-300 bg-white text-indigo-800 shadow-sm ring-2 ring-indigo-100'
                                  : 'border-slate-150 bg-white/70 text-slate-600 hover:border-indigo-200 hover:bg-white'
                              )}
                            >
                              <span className={cn(
                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                formData.professionalId === 'none' || !formData.professionalId ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'
                              )}>
                                <User className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-black">Sem profissional</span>
                                <span className="mt-0.5 block truncate text-[10px] font-bold text-slate-400">Vincular depois</span>
                              </span>
                              {(formData.professionalId === 'none' || !formData.professionalId) && <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-600" />}
                            </button>

                            {professionalOptions.map(professional => {
                              const selected = formData.professionalId === professional.id;
                              return (
                                <button
                                  key={professional.id}
                                  type="button"
                                  onClick={() => setFormData({ ...formData, professionalId: professional.id })}
                                  className={cn(
                                    'min-h-[58px] rounded-xl border px-3 py-2 text-left transition-all flex items-center gap-3',
                                    selected
                                      ? 'border-emerald-300 bg-white text-emerald-900 shadow-sm ring-2 ring-emerald-100'
                                      : 'border-slate-150 bg-white/70 text-slate-700 hover:border-emerald-200 hover:bg-white'
                                  )}
                                >
                                  <span
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
                                    style={{ backgroundColor: professional.color || '#059669' }}
                                  >
                                    <User className="h-4 w-4" />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-xs font-black">{professional.name}</span>
                                    <span className="mt-0.5 block truncate text-[10px] font-bold text-slate-400">{professional.specialty || 'Profissional'}</span>
                                  </span>
                                  {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
                                </button>
                              );
                            })}
                          </div>
                          {professionalOptions.length === 0 && (
                            <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-400">
                              Nenhum profissional cadastrado. Cadastre em Equipe para vincular receitas.
                            </p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[8px] text-indigo-650 font-black uppercase tracking-wider block">Pesquisar cliente / paciente</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <Input
                              value={patientSearch}
                              onChange={(event) => setPatientSearch(event.target.value)}
                              placeholder="Digite o nome ou telefone..."
                              className="h-10 rounded-lg border-slate-200 bg-white pl-8 text-xs font-bold"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="mb-1.5 block text-[8px] text-indigo-650 font-black uppercase tracking-wider">
                            {patientSearch.trim() ? 'Resultado da busca' : 'Atalhos: clientes recentes'}
                          </Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[170px] overflow-y-auto pr-1">
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, patientId: 'none', appointmentId: 'none' })}
                              className={cn(
                                'flex items-center justify-between gap-2 rounded-lg border p-2 text-left text-[10px] font-black transition-all',
                                formData.patientId === 'none'
                                  ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                                  : 'border-slate-150 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/50'
                              )}
                            >
                              <span className="min-w-0 truncate">Diversos</span>
                              <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
                            </button>

                            {(patientSearch.trim() ? filteredPatientsForSelect.slice(0, 10) : patientShortcutList).map((patient) => (
                              <button
                                key={patient.id}
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    patientId: patient.id,
                                    appointmentId: 'none'
                                  });
                                }}
                                className={cn(
                                  'flex items-center justify-between gap-2 rounded-lg border p-2 text-left text-[10px] font-black transition-all',
                                  formData.patientId === patient.id
                                    ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                                    : 'border-slate-150 bg-white text-slate-800 hover:border-indigo-200 hover:bg-indigo-50/50'
                                )}
                              >
                                <span className="min-w-0 truncate capitalize">{patient.name}</span>
                                <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
                              </button>
                            ))}
                            {patientSearch.trim() && filteredPatientsForSelect.length === 0 && (
                              <div className="col-span-full rounded-lg border border-dashed border-slate-200 bg-white px-3 py-5 text-center text-[11px] font-bold italic text-slate-400">
                                Nenhum paciente encontrado.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-11 px-5 font-bold text-slate-500 hover:text-slate-850 hover:bg-slate-50 transition-all cursor-pointer">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-black shadow-lg rounded-xl px-7 h-11 uppercase text-[10px] tracking-wider cursor-pointer transition-all">
                  {transactionId ? 'Salvar Alterações' : 'Confirmar Lançamento'}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
