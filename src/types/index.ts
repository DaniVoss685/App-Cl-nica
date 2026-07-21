export type ClinicType = 'odontologia' | 'dermatologia' | 'endocrinologia' | 'estética' | 'fisioterapia' | 'psicologia' | 'nutrição' | 'outro';

export interface Patient {
  id: string;
  name: string;
  cpf?: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  sex?: 'm' | 'f' | 'outro';
  reasonForVisit?: string;
  referralMethod?: string;
  referredBy?: string;
  status: 'novo' | 'em tratamento' | 'em acompanhamento' | 'inativo' | 'finalizado' | 'em atraso';
  lastVisit?: string;
  createdAt: string;
  observations?: string;
  address?: string;
  profilePicture?: string;
}

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  email?: string;
  phone?: string;
  active: boolean;
  color?: string;
  workingHours?: {
    start: string; // HH:mm
    end: string;   // HH:mm
  };
  tipoMembro?: 'clinico' | 'gestao';
  username?: string;
  password?: string;
  allowedTabs?: string[];
  foto?: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  durationMinutes: number;
  generatesFollowUp: boolean;
  followUpDays?: number;
  itemCosts?: { itemId: string; quantity: number }[];
  targetMarginPercent?: number;
  professionalIds?: string[];
  requiresUpfrontPayment?: boolean;
  upfrontPaymentType?: 'porcentagem' | 'valor';
  upfrontPaymentValue?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: 'unidade' | 'pacote' | 'peso' | 'ml' | 'g';
  unitCost: number;
  category: string;
  linkedServiceId?: string;
  quantity?: number;
  minQuantity?: number;
  unitsPerPackage?: number;
  subUnitName?: string;
  totalMeasure?: number;
  consumptionUnit?: string;
  supplier?: string;
  batchNumber?: string;
  expirationDate?: string;
}

export interface InventoryPurchase {
  id: string;
  itemId: string;
  itemName: string;
  purchaseDate: string;
  supplier?: string;
  batchNumber?: string;
  invoiceNumber?: string;
  expirationDate?: string;
  quantity: number;
  totalCost: number;
  unitCostAtPurchase: number;
  stockQuantityBefore: number;
  stockQuantityAfter: number;
}

export interface Package {
  id: string;
  name: string;
  description?: string;
  price: number;
  totalSessions: number;
  sessionInterval?: number;
  includedServices: string[];
  active?: boolean;
  maxDiscountPercentage?: number;
  maxInstallments?: number;
  professionalIds?: string[];
  requiresUpfrontPayment?: boolean;
  upfrontPaymentType?: 'porcentagem' | 'valor';
  upfrontPaymentValue?: number;
}

export interface PaymentSplit {
  method: 'pix' | 'cartão de crédito' | 'cartão de débito' | 'dinheiro' | 'boleto' | 'transferência';
  amount: number;
  installments?: number;
  status: 'pago' | 'pendente';
  paymentDate?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  professionalId: string;
  serviceId?: string;
  packageId?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'agendado' | 'confirmado' | 'realizado' | 'finalizado' | 'faltou' | 'cancelado' | 'chegou' | 'atrasado';
  confirmationStatus: 'pendente' | 'mensagem enviada' | 'confirmado' | 'cancelado';
  type: 'avaliação' | 'consulta' | 'retorno' | 'sessão' | 'acompanhamento';
  value: number;
  paymentStatus: 'pendente' | 'pago' | 'parcial';
  paymentMethod?: 'pix' | 'cartão de crédito' | 'cartão de débito' | 'dinheiro' | 'boleto' | 'transferência' | 'múltiplo';
  cardInstallments?: number;
  notes?: string;
  isCaseStudy?: boolean;
  linkedToAppointmentId?: string;
  customItemCostsUsed?: { itemId: string; quantity: number }[];
  upfrontPaid?: boolean;
  upfrontPaidAmount?: number;
  paymentDate?: string;
  paymentSplits?: PaymentSplit[];
}

export interface FinancialTransaction {
  id: string;
  patientId?: string;
  professionalId?: string;
  appointmentId?: string;
  packageId?: string;
  type: 'receita' | 'despesa';
  amount: number;
  dueDate: string;
  paymentDate?: string;
  status: 'aberto' | 'pago' | 'pendente' | 'atrasado' | 'cancelado';
  paymentMethod?: 'pix' | 'cartão de crédito' | 'cartão de débito' | 'dinheiro' | 'boleto' | 'transferência' | 'múltiplo';
  cardInstallments?: number;
  category?: string;
  description?: string;
  paymentSplits?: PaymentSplit[];
  fiscalDocumentType?: 'nota_fiscal' | 'recibo' | 'nenhum';
  fiscalDocumentNumber?: string;
  fiscalDocumentDate?: string;
  isDeductible?: boolean;
  deductibleCategoryId?: string;
  supplierName?: string;
  supplierDocument?: string;
  taxEntity?: 'pessoa_fisica' | 'pessoa_juridica';
  fiscalAttachmentName?: string;
  fiscalAttachmentUrl?: string;
}

export type ProductMode = 'full' | 'financeiro';

export interface DeductibleCategory {
  id: string;
  name: string;
  active: boolean;
  description?: string;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  professionalId?: string;
  appointmentId?: string;
  date: string;
  content: string;
  type: 'evolução' | 'avaliação' | 'prescrição' | 'exame';
  convertedFromNoteId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReceiptData {
  id?: string;
  number: string;
  patientId: string;
  patientName: string;
  patientCpf?: string;
  patientPhone?: string;
  patientAddress?: string;
  amount: number;
  amountInWords?: string;
  paymentMethod: string;
  date: string;
  description: string;
  observations?: string;
  appointmentId?: string;
  financialTransactionId?: string;
  professionalName?: string;
  professionalCpf?: string;
  professionalRegistro?: string;
  professionalSignature?: string;
  clinicName?: string;
  clinicRazaoSocial?: string;
  clinicCnpj?: string;
  clinicPhone?: string;
  clinicAddress?: string;
}

export interface Document {
  id: string;
  patientId: string;
  name: string;
  type: 'termo de consentimento' | 'contrato' | 'receituário' | 'atestado' | 'nota_fiscal' | 'recibo' | 'outro';
  date: string;
  url?: string;
  status: 'assinado' | 'pendente' | 'gerado';
  financialTransactionId?: string;
  fiscalDocumentType?: 'nota_fiscal' | 'recibo' | 'nenhum';
  fiscalDocumentNumber?: string;
  amount?: number;
  category?: string;
  receiptData?: ReceiptData;
}

export interface AIInsightTask {
  id: string;
  description: string;
  isCompleted: boolean;
  type: 'AI' | 'User';
}

export interface AIInsight {
  id: string;
  type: 'alerta' | 'oportunidade' | 'risco' | 'retenção' | 'operacional' | 'estratégico' | 'comercial';
  message: string;
  patientId?: string;
  actionRequested: string;
  resolved: boolean;
  createdAt: string;
  tasks?: AIInsightTask[];
}

export interface Budget {
  id: string;
  patientId: string;
  date: string;
  items: string;
  total: number;
  status: 'pendente' | 'enviado' | 'aprovado' | 'recusado';
}

export type UserRole = 'admin' | 'master' | 'recepção' | 'profissional';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  allowedTabs?: string[];
  professionalId?: string;
  foto?: string;
}

export interface CRMOpportunity {
  id: string;
  name: string;
  value: number;
  stage: 'lead' | 'contatado' | 'agendamento' | 'pós-venda' | string;
  leadSource?: string;
  source?: string;
  date: string;
  phone?: string;
  notes?: string;
}

export interface Reminder {
  id: string;
  patientId: string;
  title: string;
  message: string;
  date: string;
  type: 'acompanhamento' | 'retorno' | 'geral';
  status: 'pendente' | 'enviado' | 'concluido';
  createdAt: string;
}

export interface FileItem {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'image' | 'sheet';
  size: string;
  date: string;
  folder: string;
}

export interface SupplyExpense {
  id: string;
  appointmentId?: string;
  serviceId?: string;
  patientId?: string;
  itemId: string;
  itemName: string;
  quantityUsed: number;
  stockQuantityDelta?: number;
  movementType?: 'consumo' | 'estorno' | 'manual';
  serviceName: string;
  patientName: string;
  totalCost: number;
  date: string;
}

export interface DoctorNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  patientId?: string;
  professionalId?: string;
  isDraft: boolean;
  convertedToRecordId?: string;
}

export interface BeforeAfterPhoto {
  id: string;
  patientId: string;
  professionalId?: string;
  procedureName: string;
  date: string;
  beforePhotoUrl: string;
  afterPhotoUrl: string;
  beforePhotoPath?: string;
  afterPhotoPath?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}
