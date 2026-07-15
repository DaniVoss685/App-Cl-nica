import type { FinancialTransaction } from '../types';

export type FinanceAuditAction = 'created' | 'updated' | 'paid' | 'deleted';

export interface FinanceAuditEntry {
  id: string;
  transactionId: string;
  action: FinanceAuditAction;
  at: string;
  summary: string;
  patientName?: string;
  before?: Partial<FinancialTransaction>;
  after?: Partial<FinancialTransaction>;
  changes?: Array<{ field: string; before?: unknown; after?: unknown }>;
}

const FINANCE_AUDIT_STORAGE_KEY = 'clinic-finance-audit-v1';
const AUDIT_LIMIT = 300;

const trackedFields: Array<keyof FinancialTransaction> = [
  'patientId',
  'type',
  'amount',
  'dueDate',
  'paymentDate',
  'status',
  'paymentMethod',
  'category',
  'description',
  'fiscalDocumentType',
  'taxEntity',
  'isDeductible'
];

function readRawAudit(): FinanceAuditEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FINANCE_AUDIT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRawAudit(entries: FinanceAuditEntry[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FINANCE_AUDIT_STORAGE_KEY, JSON.stringify(entries.slice(0, AUDIT_LIMIT)));
}

export function readFinanceAuditEntries(transactionId?: string) {
  const entries = readRawAudit();
  return transactionId ? entries.filter(entry => entry.transactionId === transactionId) : entries;
}

export function buildFinanceChanges(before?: Partial<FinancialTransaction>, after?: Partial<FinancialTransaction>) {
  if (!before || !after) return [];
  return trackedFields
    .filter(field => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
    .map(field => ({ field, before: before[field], after: after[field] }));
}

export function appendFinanceAuditEntry(entry: Omit<FinanceAuditEntry, 'id' | 'at'>) {
  const entries = readRawAudit();
  const next: FinanceAuditEntry = {
    ...entry,
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString()
  };
  writeRawAudit([next, ...entries]);
  return next;
}
