import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addDays, format, subDays } from 'date-fns';
import { clinicalPhotosBucket, supabase, toSnakeCase, toCamelCase } from '../lib/supabase';
import { appendFinanceAuditEntry, buildFinanceChanges } from '../lib/financeAudit';
import {
  inventoryConsumptionStockDelta,
  inventoryConsumptionUnitCost
} from '../lib/costing';
import {
  Patient,
  Appointment,
  Service,
  FinancialTransaction,
  AIInsight,
  Professional,
  MedicalRecord,
  Document,
  Reminder,
  InventoryItem,
  InventoryPurchase,
  User,
  FileItem,
  SupplyExpense,
  DoctorNote,
  BeforeAfterPhoto,
  DeductibleCategory,
  ProductMode
} from '../types';

// ── WhatsApp types ────────────────────────────────────────────────────────────
export interface WaChat {
  id: string;              // e.g. "5511999999999@s.whatsapp.net"
  name: string;            // display name
  lastMessage: string;
  lastMessageTimestamp: number; // Unix seconds
  unreadCount: number;
  isGroup: boolean;
  profilePicUrl?: string;
  lastMessageFromMe?: boolean;
  remoteJidAlt?: string;
}

export interface WaMessage {
  id: string;
  fromMe: boolean;
  text: string;
  timestamp: number;       // Unix seconds
  status?: string;         // PENDING | SENT | DELIVERED | READ | PLAYED
  pushName?: string;
  mediaType?: 'image' | 'audio' | 'video' | 'document';
  mediaUrl?: string;
  mediaMimeType?: string;
}
// ─────────────────────────────────────────────────────────────────────────────

interface ClinicState {
  clinicName: string;

  clinicType: string;
  productMode: ProductMode;
  profilePicture: string | null;
  pixKey: string;
  bankName: string;
  bankAccount: string;
  activateAI: boolean;
  isOnboarded: boolean;
  currentUser: User | null;
  users: User[];
  patients: Patient[];
  appointments: Appointment[];
  services: Service[];
  packages: any[];
  finance: FinancialTransaction[];
  budgets: any[];
  opportunities: any[];
  insights: AIInsight[];
  professionals: Professional[];
  medicalRecords: MedicalRecord[];
  documents: Document[];
  reminders: Reminder[];
  inventory: InventoryItem[];
  inventoryPurchases: InventoryPurchase[];
  inventoryCategories: string[];
  supplyExpenses: SupplyExpense[];
  deductibleCategories: DeductibleCategory[];
  doctorNotes: DoctorNote[];
  beforeAfterPhotos: BeforeAfterPhoto[];
  serviceCategories: string[];
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setOnboarded: (data: { name: string; type: string; activateAI: boolean }) => Promise<void>;
  setClinicName: (name: string) => void;
  setProductMode: (mode: ProductMode) => Promise<void>;

  // Auth state & actions
  currentClient: any | null;
  loginClient: (username: string, password: string) => Promise<boolean>;
  registerClient: (name: string, username: string, password: string, phone: string) => Promise<boolean>;
  logoutClient: () => void;
  syncFromSupabase: (clientId: string) => Promise<void>;
  populateInitialMockData: (clientId: string) => Promise<void>;
  syncToSupabase: (table: string, data: any, operation?: 'insert' | 'update' | 'delete' | 'upsert') => Promise<void>;
  canAccessRoute: (path: string) => boolean;
  getAllowedNavigation: () => string[];

  // Onboarding Tour state & actions
  isTourActive: boolean;
  currentTourStep: number;
  startTour: (stepIndex?: number) => void;
  nextTourStep: () => void;
  prevTourStep: () => void;
  endTour: () => void;
  setProfilePicture: (pic: string | null) => void;
  setFinanceConfig: (pix: string, bank: string, account: string) => void;
  addPatient: (p: Omit<Patient, 'id' | 'createdAt'> & { id?: string }) => void;
  updatePatient: (id: string, data: Partial<Patient>) => void;
  removePatient: (id: string) => void;
  addAppointment: (a: Omit<Appointment, 'id'>, customReturnDate?: string) => void;
  updateAppointment: (id: string, data: Partial<Appointment>, skipFinanceSync?: boolean) => void;
  removeAppointment: (id: string) => void;
  addService: (s: Omit<Service, 'id'>) => void;
  updateService: (id: string, data: Partial<Service>) => void;
  removeService: (id: string) => void;
  addFinance: (f: Omit<FinancialTransaction, 'id'>) => string;
  updateFinance: (id: string, data: Partial<FinancialTransaction>) => void;
  removeFinance: (id: string) => void;
  addBudget: (b: any) => void;
  addOpportunity: (opp: any) => void;
  updateOpportunity: (id: string, opp: any) => void;
  removeOpportunity: (id: string) => void;
  addPackage: (p: any) => void;
  updatePackage: (id: string, pkg: any) => void;
  addProfessional: (prof: Omit<Professional, 'id' | 'active'>) => void;
  updateProfessional: (id: string, data: Partial<Professional>) => void;
  removeProfessional: (id: string) => void;
  addMedicalRecord: (r: Omit<MedicalRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<MedicalRecord>;
  updateMedicalRecord: (id: string, data: Partial<MedicalRecord>) => Promise<void>;
  removeMedicalRecord: (id: string) => Promise<void>;
  addDoctorNote: (n: Omit<DoctorNote, 'id' | 'createdAt' | 'updatedAt'>) => Promise<DoctorNote>;
  updateDoctorNote: (id: string, data: Partial<DoctorNote>) => Promise<void>;
  removeDoctorNote: (id: string) => Promise<void>;
  addBeforeAfterPhoto: (p: Omit<BeforeAfterPhoto, 'id' | 'createdAt' | 'updatedAt'>) => Promise<BeforeAfterPhoto>;
  removeBeforeAfterPhoto: (id: string) => Promise<void>;
  addReminder: (rem: Omit<Reminder, 'id' | 'createdAt'>) => void;
  removeReminder: (id: string) => void;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => string;
  updateInventoryItem: (id: string, data: Partial<InventoryItem>) => void;
  removeInventoryItem: (id: string) => void;
  addInventoryPurchase: (purchase: Omit<InventoryPurchase, 'id' | 'stockQuantityBefore' | 'stockQuantityAfter' | 'unitCostAtPurchase'>) => string;
  addInventoryCategory: (category: string) => void;
  removeInventoryCategory: (category: string) => void;
  addSupplyExpense: (expense: Omit<SupplyExpense, 'id'>) => void;
  addDeductibleCategory: (category: Omit<DeductibleCategory, 'id'>) => void;
  updateDeductibleCategory: (id: string, data: Partial<DeductibleCategory>) => void;
  removeDeductibleCategory: (id: string) => void;
  addServiceCategory: (category: string) => void;
  removeServiceCategory: (category: string) => void;
  renameServiceCategory: (oldName: string, newName: string) => void;
  addDocument: (d: Omit<Document, 'id'>) => void;
  removeDocument: (id: string) => void;
  bulkAddPatients: (ps: Omit<Patient, 'id' | 'createdAt'>[]) => void;
  addUser: (u: Omit<User, 'id' | 'active'>) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  removeUser: (id: string) => void;
  setCurrentUser: (user: User | null) => void;
  toggleInsightTask: (insightId: string, taskId: string) => void;
  resolveInsight: (id: string) => void;
  generateInsights: () => void;
  repoFolders: string[];
  repoFiles: FileItem[];
  addRepoFolder: (folderName: string) => void;
  renameRepoFolder: (oldName: string, newName: string) => void;
  deleteRepoFolder: (folderName: string) => void;
  addRepoFile: (file: FileItem) => void;
  deleteRepoFile: (id: string) => void;
  renameRepoFile: (id: string, newName: string) => void;
  // Evolution API / WhatsApp
  evolutionApiUrl: string;
  evolutionApiKey: string;
  evolutionInstance: string;
  whatsappConnected: boolean;
  setEvolutionConfig: (url: string, key: string, instance: string) => void;
  setWhatsappConnected: (connected: boolean) => void;
  // WhatsApp real conversations
  whatsappChats: WaChat[];
  whatsappMessages: Record<string, WaMessage[]>;
  chatStatuses: Record<string, 'fila' | 'atendimento' | 'finalizado'>;
  setWhatsappChats: (chats: WaChat[]) => void;
  upsertWhatsappMessages: (chatId: string, messages: WaMessage[]) => void;
  addOutboundMessage: (chatId: string, message: WaMessage, optimisticId?: string) => void;
  setChatStatus: (chatId: string, status: 'fila' | 'atendimento' | 'finalizado') => void;
  setMultipleChatStatuses: (chatIds: string[], status: 'fila' | 'atendimento' | 'finalizado') => void;
  syncWhatsappStateWithPatients: (patients: Patient[]) => void;
  postponedCheckouts: Record<string, number>;
  setPostponedCheckout: (appointmentId: string, resumeTimestamp: number) => void;
  removePostponedCheckout: (appointmentId: string) => void;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const CLINICAL_TABLES = {
  medicalRecords: 'prontuarios_clinica',
  doctorNotes: 'rascunhos_medicos_clinica',
  beforeAfterPhotos: 'fotos_antes_depois_clinica'
} as const;

const uuidMap: Record<string, string> = {
  '1': '11111111-1111-4111-a111-111111111111',
  '2': '22222222-2222-4222-a222-222222222222',
  '3': '33333333-3333-4333-a333-333333333333',
  'p1': 'e1111111-1111-4111-b111-111111111111',
  'p2': 'e2222222-2222-4222-b222-222222222222',
  's1': 'c1111111-1111-4111-c111-111111111111',
  's2': 'c2222222-2222-4222-c222-222222222222',
  'i1': 'd1111111-1111-4111-d111-111111111111',
  'i2': 'd2222222-2222-4222-d222-222222222222',
  'i3': 'd3333333-3333-4333-d333-333333333333',
  'a1': 'b1111111-1111-4111-e111-111111111111',
  'a2': 'b2222222-2222-4222-e222-222222222222',
  'a3': 'b3333333-3333-4333-e333-333333333333',
  'a4': 'b4444444-4444-4444-e444-444444444444',
  'f1': 'f1111111-1111-4111-f111-111111111111',
  'f2': 'f2222222-2222-4222-f222-222222222222',
};

const today = new Date();
const todayStr = format(today, 'yyyy-MM-dd');
const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');

const mockPatients: Patient[] = [
  { id: '1', name: 'Maria Silva', email: 'maria@email.com', phone: '(11) 98888-7777', lastVisit: yesterdayStr, status: 'em tratamento', createdAt: subDays(today, 60).toISOString() },
  { id: '2', name: 'João Santos', email: 'joao@email.com', phone: '(11) 97777-6666', lastVisit: subDays(today, 45).toISOString(), status: 'em acompanhamento', createdAt: subDays(today, 90).toISOString() },
  { id: '3', name: 'Ana Oliveira', email: 'ana@email.com', phone: '(11) 96666-5555', status: 'novo', createdAt: today.toISOString() },
];

const mockAppointments: Appointment[] = [
  { id: 'a1', patientId: '1', professionalId: 'p1', serviceId: 's1', date: todayStr, startTime: '09:00', endTime: '10:00', type: 'consulta', status: 'confirmado', confirmationStatus: 'confirmado', value: 250, paymentStatus: 'pago' },
  { id: 'a2', patientId: '2', professionalId: 'p1', serviceId: 's2', date: todayStr, startTime: '11:00', endTime: '12:00', type: 'sessão', status: 'agendado', confirmationStatus: 'mensagem enviada', value: 1200, paymentStatus: 'pendente' },
  { id: 'a3', patientId: '3', professionalId: 'p1', serviceId: 's1', date: format(addDays(today, 1), 'yyyy-MM-dd'), startTime: '08:00', endTime: '09:00', type: 'consulta', status: 'agendado', confirmationStatus: 'pendente', value: 250, paymentStatus: 'pendente' },
  { id: 'a4', patientId: '1', professionalId: 'p1', serviceId: 's2', date: format(addDays(today, 1), 'yyyy-MM-dd'), startTime: '10:00', endTime: '11:30', type: 'sessão', status: 'agendado', confirmationStatus: 'pendente', value: 1200, paymentStatus: 'pendente' },
];

const mockServices: Service[] = [
  { id: 's1', name: 'Consulta Inicial', durationMinutes: 60, price: 250, category: 'consulta', generatesFollowUp: false, itemCosts: [{ itemId: 'i1', quantity: 2 }] },
  { id: 's2', name: 'Preenchimento Labial', durationMinutes: 90, price: 1200, category: 'estética', generatesFollowUp: true, followUpDays: 15, itemCosts: [{ itemId: 'i3', quantity: 1 }, { itemId: 'i1', quantity: 2 }] },
];

const mockProfessionals: Professional[] = [
  { id: 'p1', name: 'Beatriz Stark', specialty: 'Dermatologista', active: true, email: 'beatriz@stark.ai' },
  { id: 'p2', name: 'Carlos Mendes', specialty: 'Cirurgião Plástico', active: true, email: 'carlos@stark.ai' },
];

const mockFinance: FinancialTransaction[] = [
  { id: 'f1', patientId: '1', amount: 250, dueDate: todayStr, paymentDate: todayStr, status: 'pago', type: 'receita', category: 'consulta' },
  { id: 'f2', patientId: '2', amount: 1200, dueDate: todayStr, status: 'pendente', type: 'receita', category: 'estética' },
];

const defaultDeductibleCategories: DeductibleCategory[] = [
  { id: 'ded-material', name: 'Materiais e insumos odontológicos', active: true, description: 'Itens consumidos na prestação do serviço.' },
  { id: 'ded-aluguel', name: 'Aluguel e condomínio do consultório', active: true, description: 'Estrutura usada para atendimento profissional.' },
  { id: 'ded-contabilidade', name: 'Contabilidade e taxas profissionais', active: true, description: 'Serviços ligados à atividade autônoma.' },
  { id: 'ded-energia', name: 'Energia, água, internet e telefone', active: true, description: 'Custos operacionais do consultório.' },
  { id: 'ded-equipamentos', name: 'Manutenção de equipamentos', active: true, description: 'Manutenção e reparos da operação.' }
];

const normalizeProductMode = (value?: string): ProductMode => {
  return value === 'financeiro' ? 'financeiro' : 'full';
};

const mockInsights: AIInsight[] = [
  {
    id: '1',
    type: 'risco',
    message: 'João Santos não comparece há 45 dias e não possui retorno agendado. Protocolo de reativação recomendado.',
    actionRequested: 'Agendar Retorno',
    resolved: false,
    createdAt: yesterdayStr,
    patientId: '2',
    tasks: [
      { id: 't1', description: 'IA: Filtrar últimos procedimentos do paciente', isCompleted: true, type: 'AI' },
      { id: 't2', description: 'IA: Gerar script de abordagem personalizada', isCompleted: false, type: 'AI' },
      { id: 't3', description: 'Usuário: Entrar em contato via WhatsApp', isCompleted: false, type: 'User' }
    ]
  },
  {
    id: '2',
    type: 'oportunidade',
    message: 'A tarde de amanhã possui 3 janelas livres. Sugestão: disparar oferta de última hora para pacientes da lista de espera.',
    actionRequested: 'Otimizar Agenda',
    resolved: false,
    createdAt: todayStr,
    tasks: [
      { id: 't1', description: 'IA: Identificar pacientes com procedimentos pendentes', isCompleted: true, type: 'AI' },
      { id: 't2', description: 'Usuário: Aprovar envio de template promocional', isCompleted: false, type: 'User' }
    ]
  }
];

export const useStore = create<ClinicState>()(
  persist(
    (set, get) => ({
      clinicName: 'clínica stark',
      clinicType: 'estética',
      productMode: 'full',
      profilePicture: null,
      pixKey: '',
      bankName: '',
      bankAccount: '',
      activateAI: true,
      isOnboarded: false,
      currentUser: { id: 'u1', name: 'administrador', email: 'admin@clinicflow.ai', role: 'admin', active: true },
      users: [
        { id: 'u1', name: 'administrador', email: 'admin@clinicflow.ai', role: 'admin', active: true },
        { id: 'u2', name: 'recepcionista maria', email: 'recepcao@clinicflow.ai', role: 'recepção', active: true },
      ],
      patients: [],
      appointments: [],
      services: [],
      packages: [],
      finance: [],
      budgets: [],
      opportunities: [],
      insights: [],
      professionals: [],
      medicalRecords: [],
      doctorNotes: [],
      beforeAfterPhotos: [],
      documents: [],
      reminders: [],
      inventory: [],
      inventoryPurchases: [],
      inventoryCategories: ['EPI', 'Fixo', 'Insumos', 'Marketing', 'Materiais', 'Medicamentos'],
      supplyExpenses: [],
      deductibleCategories: defaultDeductibleCategories,
      serviceCategories: ['consulta', 'procedimento', 'estética'],
      repoFolders: [],
      repoFiles: [],
      sidebarCollapsed: false,
      // Evolution API / WhatsApp config
      evolutionApiUrl: '',
      evolutionApiKey: '',
      evolutionInstance: '',
      whatsappConnected: false,
      // WhatsApp real conversations (persisted)
      whatsappChats: [],
      whatsappMessages: {},
      chatStatuses: {},
      postponedCheckouts: {},
      setPostponedCheckout: (appointmentId, resumeTimestamp) => set((state) => ({
        postponedCheckouts: {
          ...state.postponedCheckouts,
          [appointmentId]: resumeTimestamp
        }
      })),
      removePostponedCheckout: (appointmentId) => set((state) => {
        const copy = { ...state.postponedCheckouts };
        delete copy[appointmentId];
        return { postponedCheckouts: copy };
      }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      canAccessRoute: (path) => {
        const { productMode, currentUser } = get();
        if (productMode !== 'financeiro') return true;
        return path === '/' ||
          path.startsWith('/financeiro') ||
          path.startsWith('/pacientes') ||
          path.startsWith('/equipe') ||
          path.startsWith('/servicos') ||
          path.startsWith('/custos') ||
          (currentUser?.role === 'admin' && path.startsWith('/configuracoes'));
      },
      getAllowedNavigation: () => {
        const { productMode, currentUser } = get();
        if (productMode !== 'financeiro') return ['*'];
        return currentUser?.role === 'admin'
          ? ['Financeiro', 'Pacientes', 'Equipe', 'Serviços', 'Custos e Preços', 'Configurações']
          : ['Financeiro', 'Pacientes', 'Equipe'];
      },
      setEvolutionConfig: (url, key, instance) => set({ evolutionApiUrl: url.trim(), evolutionApiKey: key.trim(), evolutionInstance: instance.trim() }),
      setWhatsappConnected: (connected) => set({ whatsappConnected: connected }),
      setWhatsappChats: (chats) => set((state) => {
        // Helpers para identificar LIDs alfanuméricos
        const isLidJid = (jid: string) => {
          if (!jid) return false;
          const user = jid.split('@')[0];
          return /[a-zA-Z]/.test(user);
        };

        const arePhonesEquivalent = (phone1: string, phone2: string) => {
          const d1 = phone1.replace(/\D/g, '');
          const d2 = phone2.replace(/\D/g, '');
          if (d1 === d2) return true;
          // Trata o dígito 9 extra para celulares brasileiros
          const cleanBR = (num: string) => {
            if (num.startsWith('55') && (num.length === 12 || num.length === 13)) {
              const ddd = num.substring(2, 4);
              const rest = num.substring(4);
              if (rest.length === 9 && rest.startsWith('9')) {
                return '55' + ddd + rest.substring(1);
              }
            }
            return num;
          };
          return cleanBR(d1) === cleanBR(d2);
        };

        const areChatsEquivalent = (a: WaChat, b: WaChat) => {
          if (a.id === b.id) return true;
          if (a.remoteJidAlt && (a.remoteJidAlt === b.id || a.remoteJidAlt === b.remoteJidAlt)) return true;
          if (b.remoteJidAlt && b.remoteJidAlt === a.id) return true;

          // Equivalência por telefone
          const numA = a.id.split('@')[0];
          const numB = b.id.split('@')[0];
          const isNumA = /^\d+$/.test(numA);
          const isNumB = /^\d+$/.test(numB);
          if (isNumA && isNumB && arePhonesEquivalent(numA, numB)) {
            return true;
          }

          // Equivalência por nome idêntico (ignorando se for LID ou número de telefone)
          const nameA = (a.name || '').trim().toLowerCase();
          const nameB = (b.name || '').trim().toLowerCase();
          if (nameA && nameB && nameA === nameB) {
            const isLidA = isLidJid(a.name);
            const isLidB = isLidJid(b.name);
            const isDigitsA = /^\d+$/.test(nameA);
            const isDigitsB = /^\d+$/.test(nameB);
            if (!isLidA && !isLidB && !isDigitsA && !isDigitsB) {
              return true;
            }
          }

          // Equivalência por profilePicUrl
          if (a.profilePicUrl && b.profilePicUrl && a.profilePicUrl === b.profilePicUrl) {
            return true;
          }

          return false;
        };

        // Preserva chats locais que estão em atendimento/fila ou possuem histórico de mensagens
        // mesmo que a Evolution API não os retorne na listagem de chats recentes.
        const apiChatIds = new Set(chats.map(c => c.id));
        const keptLocalChats = state.whatsappChats.filter(localChat => {
          if (apiChatIds.has(localChat.id)) return false;
          const status = state.chatStatuses[localChat.id];
          const hasMessages = (state.whatsappMessages[localChat.id] || []).length > 0;
          return status === 'fila' || status === 'atendimento' || hasMessages;
        });

        const mergedChats = [...chats];
        keptLocalChats.forEach(localChat => {
          const msgs = state.whatsappMessages[localChat.id] || [];
          const lastMsg = msgs[msgs.length - 1];
          const updatedChat = { ...localChat };
          if (lastMsg) {
            updatedChat.lastMessage = lastMsg.text;
            updatedChat.lastMessageTimestamp = lastMsg.timestamp;
            updatedChat.lastMessageFromMe = lastMsg.fromMe;
          }
          mergedChats.push(updatedChat);
        });

        // Agrupamento e fusão baseada em equivalência avançada
        const consolidatedList: WaChat[] = [];

        mergedChats.forEach(c => {
          const idx = consolidatedList.findIndex(existing => areChatsEquivalent(existing, c));
          if (idx !== -1) {
            const existing = consolidatedList[idx];

            const keepExistingId = !isLidJid(existing.id) || isLidJid(c.id);
            const finalId = keepExistingId ? existing.id : c.id;
            const finalAlt = keepExistingId ? (c.id || existing.remoteJidAlt) : (existing.id || c.remoteJidAlt);

            const isNameLidEx = isLidJid(existing.name);
            const isNameLidC = isLidJid(c.name);
            let finalName = existing.name;
            if (isNameLidEx && !isNameLidC) {
              finalName = c.name;
            } else if (!isNameLidEx && isNameLidC) {
              finalName = existing.name;
            } else {
              const isDigitsEx = /^\d+$/.test(existing.name.split('@')[0]);
              const isDigitsC = /^\d+$/.test(c.name.split('@')[0]);
              if (isDigitsEx && !isDigitsC) {
                finalName = c.name;
              } else {
                finalName = existing.name || c.name;
              }
            }

            consolidatedList[idx] = {
              id: finalId,
              name: finalName,
              unreadCount: Math.max(existing.unreadCount, c.unreadCount),
              lastMessage: c.lastMessageTimestamp > existing.lastMessageTimestamp ? c.lastMessage : existing.lastMessage,
              lastMessageTimestamp: Math.max(existing.lastMessageTimestamp, c.lastMessageTimestamp),
              lastMessageFromMe: c.lastMessageTimestamp > existing.lastMessageTimestamp ? c.lastMessageFromMe : existing.lastMessageFromMe,
              profilePicUrl: existing.profilePicUrl || c.profilePicUrl,
              isGroup: existing.isGroup || c.isGroup,
              remoteJidAlt: finalAlt,
            };
          } else {
            consolidatedList.push({
              ...c,
              name: isLidJid(c.name) ? c.id.split('@')[0] : c.name
            });
          }
        });

        // Qualquer chat recebido que tenha mensagens não lidas ou cuja última mensagem
        // tenha vindo do contato (!lastMessageFromMe), e que não esteja sob atendimento ou finalizado,
        // é movido automaticamente para a fila ('fila').
        const newStatuses = { ...state.chatStatuses };
        let statusChanged = false;
        consolidatedList.forEach(c => {
          const currentStatus = state.chatStatuses[c.id];
          const isRecent = (Math.floor(Date.now() / 1000) - c.lastMessageTimestamp) < 300;
          const hasIncoming = c.unreadCount > 0 || (c.lastMessage && !c.lastMessageFromMe && isRecent);
          if (hasIncoming && currentStatus !== 'atendimento' && currentStatus !== 'finalizado' && currentStatus !== 'fila') {
            newStatuses[c.id] = 'fila';
            statusChanged = true;
          }
        });

        // Ordena por timestamp da última mensagem decrescente
        consolidatedList.sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);

        if (statusChanged) {
          return { whatsappChats: consolidatedList, chatStatuses: newStatuses };
        }
        return { whatsappChats: consolidatedList };
      }),
      upsertWhatsappMessages: (chatId, messages) => set((state) => {
        const existing = state.whatsappMessages[chatId] || [];

        // 1. Unifica mensagens existentes e novas por ID usando Map
        const map = new Map<string, WaMessage>();
        existing.forEach(m => map.set(m.id, m));

        messages.forEach(newMsg => {
          const old = map.get(newMsg.id);
          if (old) {
            map.set(newMsg.id, {
              ...old,
              ...newMsg,
              mediaUrl: newMsg.mediaUrl || old.mediaUrl,
              mediaMimeType: newMsg.mediaMimeType || old.mediaMimeType,
              mediaType: newMsg.mediaType || old.mediaType,
            });
          } else {
            map.set(newMsg.id, newMsg);
          }
        });

        // 2. Desduplicação estrita secundária por conteúdo + tipo + proximidade temporal (180 segundos)
        const list = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
        const uniqueList: WaMessage[] = [];

        for (const msg of list) {
          // Verifica se já existe uma mensagem equivalente na nossa lista única
          const existingIdx = uniqueList.findIndex(em => {
            if (em.fromMe !== msg.fromMe) return false;

            // Caso 1: Se a mensagem existente for otimista, unifica pelo tipo/conteúdo independente do timestamp (imune a clock drift)
            const isOptimistic = em.id.startsWith('opt-');

            // Caso 2: Se já for real, unifica se estiver na janela de 180s (ambas usam o relógio do servidor)
            const timeDiff = Math.abs(em.timestamp - msg.timestamp);
            const timeMatch = isOptimistic || (timeDiff < 180);
            if (!timeMatch) return false;

            // Se for áudio
            const isAudio1 = em.mediaType === 'audio' || em.text === '[Áudio]' || em.text === '[audio]' || em.text === 'Mensagem de áudio';
            const isAudio2 = msg.mediaType === 'audio' || msg.text === '[Áudio]' || msg.text === '[audio]' || msg.text === 'Mensagem de áudio';
            if (isAudio1 && isAudio2) return true;

            // Se for imagem
            const isImg1 = em.mediaType === 'image' || em.text === '[Imagem]' || em.text === '[imagem]' || (em.text && (em.text.endsWith('.png') || em.text.endsWith('.jpg') || em.text.endsWith('.jpeg')));
            const isImg2 = msg.mediaType === 'image' || msg.text === '[Imagem]' || msg.text === '[imagem]' || (msg.text && (msg.text.endsWith('.png') || msg.text.endsWith('.jpg') || msg.text.endsWith('.jpeg')));
            if (isImg1 && isImg2) return true;

            // Se for documento
            const isDoc1 = em.mediaType === 'document' || em.text === '[Documento]' || em.text === '[documento]' || (em.text && em.text.endsWith('.pdf')) || em.text === 'Documento';
            const isDoc2 = msg.mediaType === 'document' || msg.text === '[Documento]' || msg.text === '[documento]' || (msg.text && msg.text.endsWith('.pdf')) || msg.text === 'Documento';
            if (isDoc1 && isDoc2) return true;

            // Se for texto normal
            return isOptimistic || ((em.text || '').trim() === (msg.text || '').trim());
          });

          if (existingIdx >= 0) {
            // Unifica as mídias e IDs
            uniqueList[existingIdx] = {
              ...uniqueList[existingIdx],
              ...msg,
              id: (!msg.id.startsWith('opt-') && !msg.id.startsWith('api-last-') ? msg.id : uniqueList[existingIdx].id),
              mediaUrl: uniqueList[existingIdx].mediaUrl || msg.mediaUrl,
              mediaMimeType: uniqueList[existingIdx].mediaMimeType || msg.mediaMimeType,
              mediaType: uniqueList[existingIdx].mediaType || msg.mediaType,
              text: (msg.text && !msg.text.startsWith('[') ? msg.text : uniqueList[existingIdx].text),
            };
          } else {
            uniqueList.push(msg);
          }
        }

        // Se alguma mensagem recebida for nova (fromMe === false) e o status do chat não for atendimento/finalizado, move para fila
        const currentStatus = state.chatStatuses[chatId];
        const newStatuses = { ...state.chatStatuses };
        let statusChanged = false;

        const hasIncomingNewMessage = messages.some(m => {
          if (m.fromMe) return false;
          const chatObj = state.whatsappChats.find(c => c.id === chatId || c.remoteJidAlt === chatId);
          if (chatObj && chatObj.unreadCount > 0) return true;
          const isRecent = (Math.floor(Date.now() / 1000) - m.timestamp) < 300;
          return isRecent;
        });

        if (hasIncomingNewMessage && currentStatus !== 'atendimento' && currentStatus !== 'finalizado' && currentStatus !== 'fila') {
          newStatuses[chatId] = 'fila';
          statusChanged = true;
        }

        // Evita re-renderizações e piscadas se a lista de mensagens for idêntica
        let hasChanges = false;
        if (uniqueList.length !== existing.length) {
          hasChanges = true;
        } else {
          for (let i = 0; i < uniqueList.length; i++) {
            if (uniqueList[i].id !== existing[i].id ||
                uniqueList[i].text !== existing[i].text ||
                uniqueList[i].mediaUrl !== existing[i].mediaUrl ||
                uniqueList[i].timestamp !== existing[i].timestamp) {
              hasChanges = true;
              break;
            }
          }
        }

        if (hasChanges) {
          if (statusChanged) {
            return {
              whatsappMessages: { ...state.whatsappMessages, [chatId]: uniqueList },
              chatStatuses: newStatuses
            };
          }
          return { whatsappMessages: { ...state.whatsappMessages, [chatId]: uniqueList } };
        }

        if (statusChanged) {
          return { chatStatuses: newStatuses };
        }
        return {};
      }),
      addOutboundMessage: (chatId, message, optimisticId) => set((state) => {
        const existing = state.whatsappMessages[chatId] || [];

        let list = [...existing];
        if (optimisticId) {
          list = list.filter(m => m.id !== optimisticId);
        }

        // Insere a nova mensagem na lista
        list.push(message);

        // Desduplicação estrita secundária por conteúdo + tipo + proximidade temporal (180 segundos)
        const sortedList = list.sort((a, b) => a.timestamp - b.timestamp);
        const uniqueList: WaMessage[] = [];

        for (const msg of sortedList) {
          const existingIdx = uniqueList.findIndex(em => {
            if (em.fromMe !== msg.fromMe) return false;

            // Caso 1: Se a mensagem existente for otimista, unifica pelo tipo/conteúdo independente do timestamp (imune a clock drift)
            const isOptimistic = em.id.startsWith('opt-');

            // Caso 2: Se já for real, unifica se estiver na janela de 180s (ambas usam o relógio do servidor)
            const timeDiff = Math.abs(em.timestamp - msg.timestamp);
            const timeMatch = isOptimistic || (timeDiff < 180);
            if (!timeMatch) return false;

            const isAudio1 = em.mediaType === 'audio' || em.text === '[Áudio]' || em.text === '[audio]' || em.text === 'Mensagem de áudio';
            const isAudio2 = msg.mediaType === 'audio' || msg.text === '[Áudio]' || msg.text === '[audio]' || msg.text === 'Mensagem de áudio';
            if (isAudio1 && isAudio2) return true;

            const isImg1 = em.mediaType === 'image' || em.text === '[Imagem]' || em.text === '[imagem]' || (em.text && (em.text.endsWith('.png') || em.text.endsWith('.jpg') || em.text.endsWith('.jpeg')));
            const isImg2 = msg.mediaType === 'image' || msg.text === '[Imagem]' || msg.text === '[imagem]' || (msg.text && (msg.text.endsWith('.png') || em.text.endsWith('.jpg') || msg.text.endsWith('.jpeg')));
            if (isImg1 && isImg2) return true;

            const isDoc1 = em.mediaType === 'document' || em.text === '[Documento]' || em.text === '[documento]' || (em.text && em.text.endsWith('.pdf')) || em.text === 'Documento';
            const isDoc2 = msg.mediaType === 'document' || msg.text === '[Documento]' || msg.text === '[documento]' || (msg.text && msg.text.endsWith('.pdf')) || msg.text === 'Documento';
            if (isDoc1 && isDoc2) return true;

            return isOptimistic || ((em.text || '').trim() === (msg.text || '').trim());
          });

          if (existingIdx >= 0) {
            uniqueList[existingIdx] = {
              ...uniqueList[existingIdx],
              ...msg,
              id: (!msg.id.startsWith('opt-') && !msg.id.startsWith('api-last-') ? msg.id : uniqueList[existingIdx].id),
              mediaUrl: uniqueList[existingIdx].mediaUrl || msg.mediaUrl,
              mediaMimeType: uniqueList[existingIdx].mediaMimeType || msg.mediaMimeType,
              mediaType: uniqueList[existingIdx].mediaType || msg.mediaType,
              text: (msg.text && !msg.text.startsWith('[') ? msg.text : uniqueList[existingIdx].text),
            };
          } else {
            uniqueList.push(msg);
          }
        }

        // Promove o chat para 'atendimento'
        const currentStatus = state.chatStatuses[chatId];
        const newStatuses = { ...state.chatStatuses };
        if (currentStatus !== 'atendimento' && currentStatus !== 'finalizado') {
          newStatuses[chatId] = 'atendimento';
          get().syncToSupabase('status_chats_clinica', {
            id: chatId,
            status: 'atendimento',
            updated_at: new Date().toISOString(),
          }, 'upsert');
        }

        // Atualiza a última mensagem do chat correspondente na lista
        const updatedChats = state.whatsappChats.map(c => {
          if (c.id === chatId) {
            return {
              ...c,
              lastMessage: message.text,
              lastMessageTimestamp: message.timestamp,
              lastMessageFromMe: true
            };
          }
          return c;
        });

        return {
          whatsappMessages: { ...state.whatsappMessages, [chatId]: uniqueList },
          chatStatuses: newStatuses,
          whatsappChats: updatedChats
        };
      }),
      setChatStatus: (chatId, status) => set((state) => ({
        chatStatuses: { ...state.chatStatuses, [chatId]: status }
      })),
      setMultipleChatStatuses: (chatIds, status) => set((state) => {
        const newStatuses = { ...state.chatStatuses };
        chatIds.forEach(id => {
          newStatuses[id] = status;
        });
        return { chatStatuses: newStatuses };
      }),
      syncWhatsappStateWithPatients: (patients) => set((state) => {
        let changed = false;
        const newStatuses = { ...state.chatStatuses };
        const newMessages = { ...state.whatsappMessages };

        (patients || []).forEach(p => {
          if (!p.phone) return;

          // Formata telefone do paciente para JID numérico padrão brasileiro
          const phoneClean = p.phone.replace(/\D/g, '');
          let digits = phoneClean;
          if (digits.length === 10 || digits.length === 11) {
            digits = `55${digits}`;
          }
          const jidNum = digits ? `${digits}@s.whatsapp.net` : '';
          if (!jidNum) return;

          // Busca se existe um chat real correspondente na Evolution API com nome idêntico ou JID correspondente (incluindo LID)
          const realChat = state.whatsappChats.find(c =>
            c.id !== jidNum &&
            (c.id === jidNum ||
             c.remoteJidAlt === jidNum ||
             c.name.toLowerCase().trim() === p.name.toLowerCase().trim())
          );

          if (realChat) {
            const realJid = realChat.id;

            // 1. Migra status
            if (state.chatStatuses[jidNum] && state.chatStatuses[realJid] !== state.chatStatuses[jidNum]) {
              newStatuses[realJid] = state.chatStatuses[jidNum];
              delete newStatuses[jidNum];
              changed = true;
            }

            // 2. Migra mensagens locais
            if (state.whatsappMessages[jidNum] && state.whatsappMessages[jidNum].length > 0) {
              const existingRealMsgs = state.whatsappMessages[realJid] || [];
              const merged = [...existingRealMsgs, ...state.whatsappMessages[jidNum]];

              const map = new Map<string, WaMessage>();
              merged.forEach(m => map.set(m.id, m));
              newMessages[realJid] = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);

              delete newMessages[jidNum];
              changed = true;
            }
          }
        });

        if (changed) {
          return { chatStatuses: newStatuses, whatsappMessages: newMessages };
        }
        return {};
      }),

      // Auth implementation
      currentClient: null,

      loginClient: async (username, password) => {
        try {
          let dataClient = null;
          let isEmployee = false;
          let employeeData = null;

          const { data: clientRes } = await supabase
            .from('clientes_clinica')
            .select('*')
            .eq('username', username.toLowerCase().trim())
            .eq('password', password)
            .maybeSingle();

          if (clientRes) {
            dataClient = clientRes;
          } else {
            // Tenta buscar nos profissionais da equipe
            const { data: profRes } = await supabase
              .from('profissionais_clinica')
              .select('*')
              .eq('username', username.toLowerCase().trim())
              .eq('password', password)
              .eq('active', true)
              .maybeSingle();

            if (profRes) {
              isEmployee = true;
              employeeData = profRes;

              // Busca os dados do cliente associado para carregar a clínica
              const { data: clinicRes } = await supabase
                .from('clientes_clinica')
                .select('*')
                .eq('id', profRes.cliente_clinica_id)
                .single();

              if (clinicRes) {
                dataClient = clinicRes;
              }
            }
          }

          if (!dataClient) {
            return false;
          }

          const client = toCamelCase(dataClient);
          const productMode = normalizeProductMode(client.productMode);

          if (isEmployee && employeeData) {
            const emp = toCamelCase(employeeData);
            const employeeRole = emp.tipoMembro === 'clinico' ? 'profissional' : 'recepção';

            set({
              currentClient: client,
              clinicName: client.clinicName || 'clínica stark',
              clinicType: client.clinicType || 'estética',
              productMode,
              activateAI: client.activateAi ?? true,
              isOnboarded: client.isOnboarded ?? false,
              currentUser: {
                id: emp.id,
                name: emp.name,
                email: emp.email || '',
                role: employeeRole,
                active: true,
                allowedTabs: emp.allowedTabs || [],
                professionalId: emp.id,
                foto: emp.foto
              }
            });
          } else {
            // Login como Dono (admin)
            set({
              currentClient: client,
              clinicName: client.clinicName || 'clínica stark',
              clinicType: client.clinicType || 'estética',
              productMode,
              activateAI: client.activateAi ?? true,
              isOnboarded: client.isOnboarded ?? false,
              currentUser: {
                id: 'u1',
                name: client.name || 'administrador',
                email: client.username || 'admin@clinicflow.ai',
                role: 'admin',
                active: true,
                allowedTabs: []
              }
            });
          }

          // Carrega dados dele em background
          await get().syncFromSupabase(client.id);

          return true;
        } catch (e) {
          console.error('Erro no login:', e);
          return false;
        }
      },

      registerClient: async (name, username, password, phone) => {
        try {
          const formattedUsername = username.toLowerCase().trim();

          const { data: existing } = await supabase
            .from('clientes_clinica')
            .select('id')
            .eq('username', formattedUsername)
            .maybeSingle();

          if (existing) {
            throw new Error('Usuário já cadastrado');
          }

          const { data, error } = await supabase
            .from('clientes_clinica')
            .insert({
              name,
              username: formattedUsername,
              password,
              phone,
              clinic_name: '',
              clinic_type: '',
              product_mode: 'full',
              activate_ai: true,
              is_onboarded: false
            })
            .select()
            .single();

          if (error || !data) {
            return false;
          }

          return true;
        } catch (e) {
          console.error('Erro no cadastro:', e);
          throw e;
        }
      },

      logoutClient: () => {
        set({
          currentClient: null,
          clinicName: 'clínica stark',
          clinicType: 'estética',
          productMode: 'full',
          activateAI: true,
          isOnboarded: false,
          patients: [],
          appointments: [],
          services: [],
          professionals: [],
          finance: [],
          packages: [],
          inventory: [],
          supplyExpenses: [],
          deductibleCategories: defaultDeductibleCategories,
          insights: [],
          repoFolders: [],
          repoFiles: []
        });
      },

      syncToSupabase: async (table, data, operation = 'update') => {
        const { currentClient } = get();
        if (!currentClient) return;

        // Define valid database columns for each table to avoid PostgREST column-does-not-exist errors (42703)
        const TABLE_COLUMNS: Record<string, string[]> = {
          financeiro_clinica: [
            'id', 'cliente_clinica_id', 'patient_id', 'appointment_id', 'package_id',
            'amount', 'created_at', 'installments', 'card_installments', 'payment_splits',
            'payment_method', 'category', 'type', 'description', 'due_date', 'payment_date', 'status'
          ],
          agendamentos_clinica: [
            'id', 'cliente_clinica_id', 'patient_id', 'professional_id', 'service_id', 'package_id',
            'value', 'is_case_study', 'linked_to_appointment_id', 'custom_item_costs_used',
            'upfront_paid', 'upfront_paid_amount', 'created_at', 'installments',
            'card_installments', 'payment_splits', 'date', 'start_time', 'end_time',
            'status', 'confirmation_status', 'type', 'payment_date', 'payment_status',
            'payment_method', 'notes'
          ],
          documentos_clinica: [
            'id', 'cliente_clinica_id', 'patient_id', 'name', 'type', 'date', 'url', 'status',
            'financial_transaction_id', 'fiscal_document_type', 'fiscal_document_number', 'amount',
            'category', 'created_at'
          ]
        };

        try {
          if (operation === 'delete') {
            await supabase
              .from(table)
              .delete()
              .eq('id', data.id)
              .eq('cliente_clinica_id', currentClient.id);
          } else {
            let dbData = {
              ...toSnakeCase(Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))),
              cliente_clinica_id: currentClient.id
            };

            // Filter columns if we have a defined schema for this table
            if (TABLE_COLUMNS[table]) {
              const validCols = TABLE_COLUMNS[table];
              dbData = Object.fromEntries(
                Object.entries(dbData).filter(([key]) => validCols.includes(key))
              ) as any;
            }

            if (operation === 'insert') {
              const { error } = await supabase.from(table).insert(dbData);
              if (error) throw error;
            } else if (operation === 'upsert') {
              const { error } = await supabase.from(table).upsert(dbData);
              if (error) throw error;
            } else {
              const { error } = await supabase
                .from(table)
                .update(dbData)
                .eq('id', data.id)
                .eq('cliente_clinica_id', currentClient.id);
              if (error) throw error;
            }
          }
        } catch (e) {
          console.error(`Erro ao sincronizar tabela ${table} (${operation}):`, e);
        }
      },

      syncFromSupabase: async (clientId) => {
        try {
          const localPatients = get().patients || [];
          const localAppointments = get().appointments || [];
          const localServices = get().services || [];
          const localProfessionals = get().professionals || [];
          const localFinance = get().finance || [];
          const localPackages = get().packages || [];
          const localInventory = get().inventory || [];
          const localInventoryPurchases = get().inventoryPurchases || [];
          const localSupplyExpenses = get().supplyExpenses || [];
          const localOpportunities = get().opportunities || [];
          const localMedicalRecords = get().medicalRecords || [];
          const localDoctorNotes = get().doctorNotes || [];
          const localBeforeAfterPhotos = get().beforeAfterPhotos || [];
          const localDocuments = get().documents || [];

          const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
          const localIdMap: Record<string, string> = {};

          const checkAndMap = (id: string) => {
            if (id && !isUUID(id) && !localIdMap[id]) {
              localIdMap[id] = uuidMap[id] || generateUUID();
            }
          };

          localPatients.forEach(p => checkAndMap(p.id));
          localServices.forEach(s => checkAndMap(s.id));
          localProfessionals.forEach(pr => checkAndMap(pr.id));
          localInventory.forEach(i => checkAndMap(i.id));
          localInventoryPurchases.forEach(p => checkAndMap(p.id));
          localAppointments.forEach(a => checkAndMap(a.id));
          localFinance.forEach(f => checkAndMap(f.id));
          localPackages.forEach(pkg => checkAndMap(pkg.id));
          localOpportunities.forEach(opp => checkAndMap(opp.id));
          localMedicalRecords.forEach(mr => checkAndMap(mr.id));
          localDoctorNotes.forEach(note => checkAndMap(note.id));
          localBeforeAfterPhotos.forEach(photo => checkAndMap(photo.id));
          localDocuments.forEach(d => checkAndMap(d.id));

          const hasInvalidIds = Object.keys(localIdMap).length > 0;

          if (hasInvalidIds) {
            console.log('Detectados IDs locais legados que não são UUIDs. Iniciando migração...', localIdMap);

            const migratedPatients = localPatients.map(p => ({
              ...p,
              id: localIdMap[p.id] || p.id
            }));

            const migratedServices = localServices.map(s => ({
              ...s,
              id: localIdMap[s.id] || s.id,
              professionalIds: s.professionalIds?.map(id => localIdMap[id] || id) || [],
              itemCosts: s.itemCosts?.map(ic => ({ ...ic, itemId: localIdMap[ic.itemId] || ic.itemId })) || []
            }));

            const migratedProfessionals = migratedPatients.length > 0 ? localProfessionals.map(pr => ({
              ...pr,
              id: localIdMap[pr.id] || pr.id
            })) : localProfessionals;

            const migratedInventory = localInventory.map(i => ({
              ...i,
              id: localIdMap[i.id] || i.id
            }));

            const migratedInventoryPurchases = localInventoryPurchases.map(p => ({
              ...p,
              id: localIdMap[p.id] || p.id,
              itemId: localIdMap[p.itemId] || p.itemId
            }));

            const migratedAppointments = localAppointments.map(a => ({
              ...a,
              id: localIdMap[a.id] || a.id,
              patientId: localIdMap[a.patientId] || a.patientId,
              professionalId: localIdMap[a.professionalId] || a.professionalId,
              serviceId: localIdMap[a.serviceId] || a.serviceId
            }));

            const migratedFinance = localFinance.map(f => ({
              ...f,
              id: localIdMap[f.id] || f.id,
              patientId: f.patientId ? (localIdMap[f.patientId] || f.patientId) : undefined
            }));

            const migratedMedicalRecords = localMedicalRecords.map(r => ({
              ...r,
              id: localIdMap[r.id] || r.id,
              patientId: localIdMap[r.patientId] || r.patientId,
              professionalId: r.professionalId ? (localIdMap[r.professionalId] || r.professionalId) : undefined,
              appointmentId: r.appointmentId ? (localIdMap[r.appointmentId] || r.appointmentId) : undefined,
              convertedFromNoteId: r.convertedFromNoteId ? (localIdMap[r.convertedFromNoteId] || r.convertedFromNoteId) : undefined
            }));

            const migratedDoctorNotes = localDoctorNotes.map(n => ({
              ...n,
              id: localIdMap[n.id] || n.id,
              patientId: n.patientId ? (localIdMap[n.patientId] || n.patientId) : undefined,
              professionalId: n.professionalId ? (localIdMap[n.professionalId] || n.professionalId) : undefined,
              convertedToRecordId: n.convertedToRecordId ? (localIdMap[n.convertedToRecordId] || n.convertedToRecordId) : undefined
            }));

            const migratedBeforeAfterPhotos = localBeforeAfterPhotos.map(p => ({
              ...p,
              id: localIdMap[p.id] || p.id,
              patientId: localIdMap[p.patientId] || p.patientId,
              professionalId: p.professionalId ? (localIdMap[p.professionalId] || p.professionalId) : undefined
            }));

            const migratedDocuments = localDocuments.map(d => ({
              ...d,
              id: localIdMap[d.id] || d.id,
              patientId: d.patientId ? (localIdMap[d.patientId] || d.patientId) : undefined
            }));

            const migratedPackages = localPackages.map(pkg => ({
              ...pkg,
              id: localIdMap[pkg.id] || pkg.id
            }));

            const migratedOpportunities = localOpportunities.map(opp => ({
              ...opp,
              id: localIdMap[opp.id] || opp.id
            }));

            set({
              patients: migratedPatients,
              services: migratedServices,
              professionals: migratedProfessionals,
              inventory: migratedInventory,
              inventoryPurchases: migratedInventoryPurchases,
              appointments: migratedAppointments,
              finance: migratedFinance,
              medicalRecords: migratedMedicalRecords,
              doctorNotes: migratedDoctorNotes,
              beforeAfterPhotos: migratedBeforeAfterPhotos,
              documents: migratedDocuments,
              packages: migratedPackages,
              opportunities: migratedOpportunities
            });

            try {
              if (migratedProfessionals.length > 0) {
                const dbProfs = migratedProfessionals.map(pr => ({ ...toSnakeCase(pr), cliente_clinica_id: clientId }));
                await supabase.from('profissionais_clinica').upsert(dbProfs);
              }
              if (migratedServices.length > 0) {
                const dbServices = migratedServices.map(s => ({ ...toSnakeCase(s), cliente_clinica_id: clientId }));
                await supabase.from('servicos_clinica').upsert(dbServices);
              }
              if (migratedInventory.length > 0) {
                const dbInventory = migratedInventory.map(i => ({ ...toSnakeCase(i), cliente_clinica_id: clientId }));
                await supabase.from('inventario_clinica').upsert(dbInventory);
              }
              if (migratedInventoryPurchases.length > 0) {
                const dbPurchases = migratedInventoryPurchases.map(p => ({ ...toSnakeCase(p), cliente_clinica_id: clientId }));
                await supabase.from('compras_inventario_clinica').upsert(dbPurchases);
              }
              if (migratedPatients.length > 0) {
                const dbPatients = migratedPatients.map(p => ({ ...toSnakeCase(p), cliente_clinica_id: clientId }));
                await supabase.from('pacientes_clinica').upsert(dbPatients);
              }
              if (migratedPackages.length > 0) {
                const dbPkgs = migratedPackages.map(pkg => ({ ...toSnakeCase(pkg), cliente_clinica_id: clientId }));
                await supabase.from('pacotes_clinica').upsert(dbPkgs);
              }
              if (migratedAppointments.length > 0) {
                const dbAppts = migratedAppointments.map(a => ({ ...toSnakeCase(a), cliente_clinica_id: clientId }));
                await supabase.from('agendamentos_clinica').upsert(dbAppts);
              }
              if (migratedFinance.length > 0) {
                const dbFinance = migratedFinance.map(f => ({ ...toSnakeCase(f), cliente_clinica_id: clientId }));
                await supabase.from('financeiro_clinica').upsert(dbFinance);
              }
              if (migratedMedicalRecords.length > 0) {
                const dbRecords = migratedMedicalRecords.map(r => ({ ...toSnakeCase(r), cliente_clinica_id: clientId }));
                await supabase.from(CLINICAL_TABLES.medicalRecords).upsert(dbRecords);
              }
              if (migratedDoctorNotes.length > 0) {
                const dbNotes = migratedDoctorNotes.map(n => ({ ...toSnakeCase(n), cliente_clinica_id: clientId }));
                await supabase.from(CLINICAL_TABLES.doctorNotes).upsert(dbNotes);
              }
              if (migratedBeforeAfterPhotos.length > 0) {
                const dbPhotos = migratedBeforeAfterPhotos.map(p => ({ ...toSnakeCase(p), cliente_clinica_id: clientId }));
                await supabase.from(CLINICAL_TABLES.beforeAfterPhotos).upsert(dbPhotos);
              }
              if (migratedOpportunities.length > 0) {
                const dbOpps = migratedOpportunities.map(opp => ({ ...toSnakeCase(opp), cliente_clinica_id: clientId }));
                await supabase.from('oportunidades_clinica').upsert(dbOpps);
              }
              console.log('Migração concluída com sucesso!');
            } catch (errUpsert) {
              console.error('Erro ao realizar upsert de dados migrados no Supabase:', errUpsert);
            }
          }

          try {
            const currentRecords = get().medicalRecords || [];
            const currentNotes = get().doctorNotes || [];
            const currentPhotos = get().beforeAfterPhotos || [];
            if (currentRecords.length > 0) {
              await supabase.from(CLINICAL_TABLES.medicalRecords).upsert(
                currentRecords.map(r => ({ ...toSnakeCase(r), cliente_clinica_id: clientId }))
              );
            }
            if (currentNotes.length > 0) {
              await supabase.from(CLINICAL_TABLES.doctorNotes).upsert(
                currentNotes.map(n => ({ ...toSnakeCase(n), cliente_clinica_id: clientId }))
              );
            }
            if (currentPhotos.length > 0) {
              await supabase.from(CLINICAL_TABLES.beforeAfterPhotos).upsert(
                currentPhotos.map(p => ({ ...toSnakeCase(p), cliente_clinica_id: clientId }))
              );
            }
          } catch (clinicalSyncErr) {
            console.warn('Sincronização clínica remota indisponível; mantendo cache local.', clinicalSyncErr);
          }

          const [ps, appts, servs, profs, fin, pkgs, inv, exp, deductibleRes, opps, recordsRes, notesRes, photosRes] = await Promise.all([
            supabase.from('pacientes_clinica').select('*').eq('cliente_clinica_id', clientId),
            supabase.from('agendamentos_clinica').select('*').eq('cliente_clinica_id', clientId),
            supabase.from('servicos_clinica').select('*').eq('cliente_clinica_id', clientId),
            supabase.from('profissionais_clinica').select('*').eq('cliente_clinica_id', clientId),
            supabase.from('financeiro_clinica').select('*').eq('cliente_clinica_id', clientId),
            supabase.from('pacotes_clinica').select('*').eq('cliente_clinica_id', clientId),
            supabase.from('inventario_clinica').select('*').eq('cliente_clinica_id', clientId),
            supabase.from('despesas_insumos_clinica').select('*').eq('cliente_clinica_id', clientId),
            supabase.from('categorias_dedutiveis_clinica').select('*').eq('cliente_clinica_id', clientId),
            supabase.from('oportunidades_clinica').select('*').eq('cliente_clinica_id', clientId),
            supabase.from(CLINICAL_TABLES.medicalRecords).select('*').eq('cliente_clinica_id', clientId),
            supabase.from(CLINICAL_TABLES.doctorNotes).select('*').eq('cliente_clinica_id', clientId),
            supabase.from(CLINICAL_TABLES.beforeAfterPhotos).select('*').eq('cliente_clinica_id', clientId),
          ]);

          let remoteDocuments = get().documents;
          try {
            const docsRes = await supabase.from('documentos_clinica').select('*').eq('cliente_clinica_id', clientId);
            if (docsRes.error) {
              console.warn('Tabela documentos_clinica indisponível; mantendo documentos locais.', docsRes.error);
            } else if (docsRes.data) {
              remoteDocuments = toCamelCase(docsRes.data);
            }
          } catch (docsErr) {
            console.warn('Tabela documentos_clinica indisponível; mantendo documentos locais.', docsErr);
          }

          let remoteInventoryPurchases = get().inventoryPurchases || [];
          try {
            const purchaseRes = await supabase.from('compras_inventario_clinica').select('*').eq('cliente_clinica_id', clientId);
            if (purchaseRes.error) {
              console.warn('Tabela compras_inventario_clinica indisponivel; mantendo compras locais.', purchaseRes.error);
            } else if (purchaseRes.data) {
              remoteInventoryPurchases = toCamelCase(purchaseRes.data);
            }
          } catch (purchaseErr) {
            console.warn('Tabela compras_inventario_clinica indisponivel; mantendo compras locais.', purchaseErr);
          }

          const remoteInventory = inv.data ? toCamelCase(inv.data) as InventoryItem[] : [];

          set({
            patients: ps.data ? toCamelCase(ps.data) : [],
            appointments: appts.data ? toCamelCase(appts.data).map((a: any) => ({
              ...a,
              value: a.value ? Number(a.value) : 0,
              upfrontPaidAmount: a.upfrontPaidAmount ? Number(a.upfrontPaidAmount) : 0
            })) : [],
            services: servs.data ? toCamelCase(servs.data).map((s: any) => ({
              ...s,
              value: s.value ? Number(s.value) : 0
            })) : [],
            professionals: profs.data ? toCamelCase(profs.data) : [],
            finance: fin.data ? toCamelCase(fin.data).map((f: any) => ({
              ...f,
              amount: Number(f.amount),
              taxEntity: f.taxEntity || 'pessoa_fisica',
              paymentSplits: Array.isArray(f.paymentSplits) ? f.paymentSplits.map((s: any) => ({
                ...s,
                amount: Number(s.amount)
              })) : []
            })) : [],
            packages: pkgs.data ? toCamelCase(pkgs.data) : [],
            inventory: remoteInventory,
            inventoryPurchases: remoteInventoryPurchases,
            inventoryCategories: Array.from(new Set([
              'EPI',
              'Fixo',
              'Insumos',
              'Marketing',
              'Materiais',
              'Medicamentos',
              ...remoteInventory.map((item) => item.category).filter(Boolean),
              ...(get().inventoryCategories || [])
            ])).sort((a, b) => a.localeCompare(b, 'pt-BR')),
            supplyExpenses: exp.data ? toCamelCase(exp.data) : [],
            deductibleCategories: deductibleRes.data && deductibleRes.data.length > 0 ? toCamelCase(deductibleRes.data) : get().deductibleCategories,
            documents: remoteDocuments,
            opportunities: opps.data ? toCamelCase(opps.data) : [],
            medicalRecords: recordsRes.data ? toCamelCase(recordsRes.data) : get().medicalRecords,
            doctorNotes: notesRes.data ? toCamelCase(notesRes.data) : get().doctorNotes,
            beforeAfterPhotos: photosRes.data ? toCamelCase(photosRes.data) : get().beforeAfterPhotos
          });
        } catch (e) {
          console.error('Erro ao buscar dados do Supabase:', e);
        }
      },

      populateInitialMockData: async (clientId) => {
        try {
          const { count } = await supabase
            .from('pacientes_clinica')
            .select('*', { count: 'exact', head: true })
            .eq('cliente_clinica_id', clientId);

          if (count && count > 0) return;

          console.log('Populando dados iniciais no Supabase para isolamento...');

          // Inserir Pacientes
          const dbPatients = mockPatients.map(p => {
            const mapped = { ...p, id: uuidMap[p.id] || p.id };
            return { ...toSnakeCase(mapped), cliente_clinica_id: clientId };
          });
          await supabase.from('pacientes_clinica').insert(dbPatients);

          // Inserir Profissionais
          const dbProfs = mockProfessionals.map(pr => {
            const mapped = { ...pr, id: uuidMap[pr.id] || pr.id };
            return { ...toSnakeCase(mapped), cliente_clinica_id: clientId };
          });
          await supabase.from('profissionais_clinica').insert(dbProfs);

          // Inserir Serviços
          const dbServices = mockServices.map(s => {
            const mapped = {
              ...s,
              id: uuidMap[s.id] || s.id,
              professionalIds: s.professionalIds?.map(pid => uuidMap[pid] || pid) || [],
              itemCosts: s.itemCosts?.map(ic => ({ ...ic, itemId: uuidMap[ic.itemId] || ic.itemId })) || []
            };
            return { ...toSnakeCase(mapped), cliente_clinica_id: clientId };
          });
          await supabase.from('servicos_clinica').insert(dbServices);

          // Inserir Financeiro
          const dbFinance = mockFinance.map(f => {
            const mapped = {
              ...f,
              id: uuidMap[f.id] || f.id,
              patientId: uuidMap[f.patientId] || f.patientId
            };
            return { ...toSnakeCase(mapped), cliente_clinica_id: clientId };
          });
          await supabase.from('financeiro_clinica').insert(dbFinance);

          // Inserir Inventário
          const basicInventory = [
            { id: 'i1', name: 'Luvas de Procedimento (Par)', unit: 'unidade', unitCost: 1.50, category: 'descartável', quantity: 150, minQuantity: 20 },
            { id: 'i2', name: 'Seringa Descartável 3ml', unit: 'unidade', unitCost: 2.20, category: 'descartável', quantity: 80, minQuantity: 15 },
            { id: 'i3', name: 'Ácido Hialurônico Ultra 1ml', unit: 'ml', unitCost: 180.00, category: 'estética', quantity: 12, minQuantity: 3 }
          ];
          const dbInv = basicInventory.map(i => {
            const mapped = { ...i, id: uuidMap[i.id] || i.id };
            return { ...toSnakeCase(mapped), cliente_clinica_id: clientId };
          });
          await supabase.from('inventario_clinica').insert(dbInv);

          // Inserir Agendamentos
          const dbAppts = mockAppointments.map(a => {
            const mapped = {
              ...a,
              id: uuidMap[a.id] || a.id,
              patientId: uuidMap[a.patientId] || a.patientId,
              professionalId: uuidMap[a.professionalId] || a.professionalId,
              serviceId: uuidMap[a.serviceId] || a.serviceId
            };
            return { ...toSnakeCase(mapped), cliente_clinica_id: clientId };
          });
          await supabase.from('agendamentos_clinica').insert(dbAppts);
        } catch (e) {
          console.error('Erro ao popular dados de demonstração:', e);
        }
      },

      // Onboarding Tour state implementation
      isTourActive: false,
      currentTourStep: 0,
      startTour: (stepIndex = 0) => set({ isTourActive: true, currentTourStep: stepIndex }),
      nextTourStep: () => set((state) => ({ currentTourStep: state.currentTourStep + 1 })),
      prevTourStep: () => set((state) => ({ currentTourStep: Math.max(0, state.currentTourStep - 1) })),
      endTour: () => set({ isTourActive: false, currentTourStep: 0 }),

      setOnboarded: async (data) => {
        const { currentClient } = get();
        if (currentClient) {
          try {
            await supabase
              .from('clientes_clinica')
              .update({
                clinic_name: data.name,
                clinic_type: data.type,
                activate_ai: data.activateAI,
                is_onboarded: true
              })
              .eq('id', currentClient.id);

            set({
              currentClient: {
                ...currentClient,
                clinicName: data.name,
                clinicType: data.type,
                activateAi: data.activateAI,
                isOnboarded: true
              },
              isOnboarded: true,
              clinicName: data.name,
              clinicType: data.type,
              activateAI: data.activateAI
            });
          } catch (e) {
            console.error('Erro ao salvar onboarding no Supabase:', e);
          }
        } else {
          set({
            isOnboarded: true,
            clinicName: data.name,
            clinicType: data.type,
            activateAI: data.activateAI
          });
        }
      },

      setClinicName: (name) => set({ clinicName: name }),
      setProductMode: async (mode) => {
        const { currentClient } = get();
        set({
          productMode: mode,
          currentClient: currentClient ? { ...currentClient, productMode: mode } : currentClient
        });

        if (!currentClient?.id) return;

        try {
          await supabase
            .from('clientes_clinica')
            .update({ product_mode: mode })
            .eq('id', currentClient.id);
        } catch (e) {
          console.error('Erro ao atualizar modo do produto:', e);
        }
      },
      setProfilePicture: (pic) => set({ profilePicture: pic }),
      setFinanceConfig: (pix, bank, account) => set({ pixKey: pix, bankName: bank, bankAccount: account }),

      addPatient: (p) => {
        const newPatient = { ...p, id: p.id || generateUUID(), createdAt: new Date().toISOString() };
        set((state) => ({ patients: [...state.patients, newPatient] }));
        get().syncToSupabase('pacientes_clinica', newPatient, 'insert');
      },
      updatePatient: (id, data) => set((state) => {
        const updated = state.patients.map(p => p.id === id ? { ...p, ...data } : p);
        const patient = updated.find(p => p.id === id);
        if (patient) get().syncToSupabase('pacientes_clinica', patient, 'update');
        return { patients: updated };
      }),
      removePatient: (id) => {
        set((state) => ({ patients: state.patients.filter(p => p.id !== id) }));
        get().syncToSupabase('pacientes_clinica', { id }, 'delete');
      },

      addAppointment: (a, customReturnDate) => {
        const newAppt = { ...a, id: generateUUID(), confirmationStatus: a.confirmationStatus || 'pendente' };

        const services = get().services;
        const service = services.find(s => s.id === a.serviceId);

        let returnAppt: any = null;
        if (customReturnDate !== 'none' && service && service.generatesFollowUp && service.followUpDays) {
          let returnDateStr = '';
          if (customReturnDate) {
            returnDateStr = customReturnDate;
          } else {
            const [year, month, day] = a.date.split('-').map(Number);
            const baseDate = new Date(year, month - 1, day);
            const returnDate = addDays(baseDate, service.followUpDays);
            returnDateStr = format(returnDate, 'yyyy-MM-dd');
          }

          returnAppt = {
            id: generateUUID(),
            patientId: a.patientId,
            professionalId: a.professionalId,
            serviceId: a.serviceId,
            packageId: a.packageId,
            date: returnDateStr,
            startTime: a.startTime,
            endTime: a.endTime,
            status: 'agendado',
            confirmationStatus: 'pendente',
            type: 'retorno',
            value: 0,
            paymentStatus: 'pago',
            linkedToAppointmentId: newAppt.id,
            notes: `Retorno automático de ${service.name} (${service.followUpDays}d) vinculado ao atendimento #${newAppt.id.slice(0, 5)}`
          };
        }

        set((state) => {
          const newAppointments = [...state.appointments, newAppt];
          if (returnAppt) {
            newAppointments.push(returnAppt);
          }

          let finalFinance = state.finance;
          let finalInventory = state.inventory;
          let finalSupplyExpenses = state.supplyExpenses || [];

          if (newAppt.status === 'realizado' || newAppt.status === 'finalizado') {
            const patient = state.patients.find(p => p.id === newAppt.patientId);
            const serviceForConsumption = services.find(s => s.id === newAppt.serviceId);
            const itemsUsed = Array.isArray(newAppt.customItemCostsUsed)
              ? newAppt.customItemCostsUsed
              : (serviceForConsumption?.itemCosts || []);

            itemsUsed.filter(ic => Number(ic.quantity || 0) > 0).forEach(ic => {
              finalInventory = finalInventory.map(invItem => {
                if (invItem.id !== ic.itemId) return invItem;

                const stockQuantityDelta = inventoryConsumptionStockDelta(invItem, ic.quantity);
                const newQty = Math.max(0, parseFloat(((invItem.quantity || 0) - stockQuantityDelta).toFixed(4)));
                const totalCost = inventoryConsumptionUnitCost(invItem) * ic.quantity;
                const newExpense: SupplyExpense = {
                  id: generateUUID(),
                  appointmentId: newAppt.id,
                  serviceId: serviceForConsumption?.id,
                  patientId: newAppt.patientId,
                  itemId: invItem.id,
                  itemName: invItem.name,
                  quantityUsed: ic.quantity,
                  stockQuantityDelta,
                  movementType: 'consumo',
                  serviceName: serviceForConsumption?.name || 'Procedimento',
                  patientName: patient?.name || 'Paciente Geral',
                  totalCost,
                  date: format(new Date(), 'yyyy-MM-dd')
                };

                finalSupplyExpenses = [newExpense, ...finalSupplyExpenses];
                get().syncToSupabase('inventario_clinica', { ...invItem, quantity: newQty }, 'update');
                get().syncToSupabase('despesas_insumos_clinica', newExpense, 'insert');

                return { ...invItem, quantity: newQty };
              });
            });
          }

          if (newAppt.status === 'realizado' || newAppt.status === 'finalizado') {
            const patient = state.patients.find(p => p.id === newAppt.patientId);
            const service = services.find(s => s.id === newAppt.serviceId);
            const pkg = state.packages.find(p => p.id === newAppt.packageId);
            const description = `Consulta - ${patient?.name || 'Paciente'} (${service?.name || pkg?.name || 'Atendimento'})`;

            if (newAppt.paymentMethod === 'múltiplo' && newAppt.paymentSplits && newAppt.paymentSplits.length > 0) {
              const txStatus = newAppt.paymentSplits.every(s => s.status === 'pago') ? 'pago' : 'pendente';
              const totalSplitsAmount = newAppt.paymentSplits.reduce((sum, s) => sum + s.amount, 0);

              const newTx = {
                id: generateUUID(),
                patientId: newAppt.patientId,
                appointmentId: newAppt.id,
                packageId: newAppt.packageId || undefined,
                type: 'receita' as const,
                amount: totalSplitsAmount || newAppt.value || 0,
                dueDate: newAppt.date,
                paymentDate: txStatus === 'pago' ? (newAppt.paymentDate || newAppt.date) : undefined,
                status: txStatus as 'pago' | 'pendente',
                paymentMethod: 'múltiplo' as const,
                category: 'Atendimentos',
                description: description,
                paymentSplits: newAppt.paymentSplits
              };
              finalFinance = [...state.finance, newTx];
              get().syncToSupabase('financeiro_clinica', newTx, 'insert');
            } else {
              const txAmount = newAppt.paymentStatus === 'parcial'
                ? (newAppt.upfrontPaidAmount || 0)
                : (newAppt.value || 0);

              const txData = {
                id: generateUUID(),
                patientId: newAppt.patientId,
                appointmentId: newAppt.id,
                packageId: newAppt.packageId || undefined,
                type: 'receita' as const,
                amount: txAmount,
                dueDate: newAppt.date,
                paymentDate: newAppt.paymentStatus === 'pago' || newAppt.paymentStatus === 'parcial' ? (newAppt.paymentDate || newAppt.date) : undefined,
                status: (newAppt.paymentStatus === 'pago' ? 'pago' : 'pendente') as 'pago' | 'pendente',
                paymentMethod: newAppt.paymentMethod || undefined,
                cardInstallments: newAppt.cardInstallments || undefined,
                category: 'Atendimentos',
                description
              };
              finalFinance = [...state.finance, txData];
              get().syncToSupabase('financeiro_clinica', txData, 'insert');
            }
          }

          return {
            appointments: newAppointments,
            finance: finalFinance,
            inventory: finalInventory,
            supplyExpenses: finalSupplyExpenses
          };
        });

        get().syncToSupabase('agendamentos_clinica', newAppt, 'insert');
        if (returnAppt) {
          get().syncToSupabase('agendamentos_clinica', returnAppt, 'insert');
        }
      },
      updateAppointment: (id, data, skipFinanceSync = false) => set((state) => {
        const updated = state.appointments.map(a => a.id === id ? { ...a, ...data } : a);
        const appt = updated.find(a => a.id === id);
        if (appt) get().syncToSupabase('agendamentos_clinica', appt, 'update');

        const oldAppt = state.appointments.find(a => a.id === id);
        const wasCompleted = oldAppt?.status === 'realizado' || oldAppt?.status === 'finalizado';
        const isCompleted = appt?.status === 'realizado' || appt?.status === 'finalizado';
        const isTransitionToCompleted = Boolean(isCompleted && oldAppt && !wasCompleted);

        let updatedInventory = state.inventory;
        let updatedExpenses = state.supplyExpenses || [];

        const existingConsumptionExpenses = updatedExpenses.filter(exp => exp.appointmentId === id && exp.movementType !== 'estorno');

        if (existingConsumptionExpenses.length > 0) {
          const reversalExpenses: SupplyExpense[] = [];
          existingConsumptionExpenses.forEach(exp => {
            updatedInventory = updatedInventory.map(invItem => {
              if (invItem.id !== exp.itemId) return invItem;
              const restoredQty = parseFloat(((invItem.quantity || 0) + (exp.stockQuantityDelta || inventoryConsumptionStockDelta(invItem, exp.quantityUsed))).toFixed(4));
              get().syncToSupabase('inventario_clinica', { ...invItem, quantity: restoredQty }, 'update');
              return { ...invItem, quantity: restoredQty };
            });
            const reversalExpense: SupplyExpense = {
              ...exp,
              id: generateUUID(),
              quantityUsed: -Math.abs(exp.quantityUsed),
              stockQuantityDelta: -(exp.stockQuantityDelta || 0),
              movementType: 'estorno',
              totalCost: -Math.abs(exp.totalCost),
              date: format(new Date(), 'yyyy-MM-dd')
            };
            reversalExpenses.push(reversalExpense);
            get().syncToSupabase('despesas_insumos_clinica', { id: exp.id }, 'delete');
            get().syncToSupabase('despesas_insumos_clinica', reversalExpense, 'insert');
          });
          updatedExpenses = [
            ...reversalExpenses,
            ...updatedExpenses.filter(exp => exp.appointmentId !== id || exp.movementType === 'estorno')
          ];
        }

        if (appt && isCompleted && (isTransitionToCompleted || existingConsumptionExpenses.length > 0)) {
          const service = state.services.find(s => s.id === appt.serviceId);
          const patient = state.patients.find(p => p.id === appt.patientId);
          const itemsUsed = Array.isArray(appt.customItemCostsUsed)
            ? appt.customItemCostsUsed
            : (service?.itemCosts || []);

          itemsUsed.filter(ic => Number(ic.quantity || 0) > 0).forEach(ic => {
            updatedInventory = updatedInventory.map(invItem => {
              if (invItem.id !== ic.itemId) return invItem;

              const stockQuantityDelta = inventoryConsumptionStockDelta(invItem, ic.quantity);
              const newQty = Math.max(0, parseFloat(((invItem.quantity || 0) - stockQuantityDelta).toFixed(4)));
              const totalCost = inventoryConsumptionUnitCost(invItem) * ic.quantity;
              const newExpense: SupplyExpense = {
                id: generateUUID(),
                appointmentId: appt.id,
                serviceId: service?.id,
                patientId: appt.patientId,
                itemId: invItem.id,
                itemName: invItem.name,
                quantityUsed: ic.quantity,
                stockQuantityDelta,
                movementType: 'consumo',
                serviceName: service?.name || 'Procedimento',
                patientName: patient?.name || 'Paciente Geral',
                totalCost,
                date: format(new Date(), 'yyyy-MM-dd')
              };

              updatedExpenses = [newExpense, ...updatedExpenses];
              get().syncToSupabase('inventario_clinica', { ...invItem, quantity: newQty }, 'update');
              get().syncToSupabase('despesas_insumos_clinica', newExpense, 'insert');

              return { ...invItem, quantity: newQty };
            });
          });
        }

        // Lógica de atualização/sincronização do retorno automático
        let finalAppointments = updated;
        if (appt) {
          const service = state.services.find(s => s.id === appt.serviceId);
          const existingReturn = state.appointments.find(a => a.linkedToAppointmentId === id);

          if (service && service.generatesFollowUp && service.followUpDays) {
            const [year, month, day] = appt.date.split('-').map(Number);
            const baseDate = new Date(year, month - 1, day);
            const returnDate = addDays(baseDate, service.followUpDays);
            const returnDateStr = format(returnDate, 'yyyy-MM-dd');

            if (existingReturn) {
              const updatedReturn = {
                ...existingReturn,
                date: returnDateStr,
                startTime: appt.startTime,
                endTime: appt.endTime,
                professionalId: appt.professionalId,
                patientId: appt.patientId
              };
              finalAppointments = finalAppointments.map(a => a.id === existingReturn.id ? updatedReturn : a);
              get().syncToSupabase('agendamentos_clinica', updatedReturn, 'update');
            } else {
              const returnApptToInsert: Appointment = {
                id: generateUUID(),
                patientId: appt.patientId,
                professionalId: appt.professionalId,
                serviceId: appt.serviceId,
                packageId: appt.packageId,
                date: returnDateStr,
                startTime: appt.startTime,
                endTime: appt.endTime,
                status: 'agendado',
                confirmationStatus: 'pendente',
                type: 'retorno',
                value: 0,
                paymentStatus: 'pago',
                linkedToAppointmentId: appt.id,
                notes: `Retorno automático de ${service.name} (${service.followUpDays}d) vinculado ao atendimento #${appt.id.slice(0, 5)}`
              };
              finalAppointments = [...finalAppointments, returnApptToInsert];
              get().syncToSupabase('agendamentos_clinica', returnApptToInsert, 'insert');
            }
          } else {
            if (existingReturn) {
              finalAppointments = finalAppointments.filter(a => a.id !== existingReturn.id);
              get().syncToSupabase('agendamentos_clinica', { id: existingReturn.id }, 'delete');
            }
          }
        }

        // Finance integration
        let finalFinance = state.finance;
        if (!skipFinanceSync && appt && (appt.status === 'realizado' || appt.status === 'finalizado')) {
          const patient = state.patients.find(p => p.id === appt.patientId);
          const service = state.services.find(s => s.id === appt.serviceId);
          const pkg = state.packages.find(p => p.id === appt.packageId);
          const description = `Consulta - ${patient?.name || 'Paciente'} (${service?.name || pkg?.name || 'Atendimento'})`;

          const existingTxs = state.finance.filter(f => f.appointmentId === appt.id);

          if (existingTxs.length > 0) {
            // Update existing transaction in place
            const updatedFinance = state.finance.map(f => {
              if (f.appointmentId === appt.id) {
                const isMultiple = appt.paymentMethod === 'múltiplo';
                const txStatus = isMultiple
                  ? (appt.paymentSplits?.every(s => s.status === 'pago') ? 'pago' : 'pendente')
                  : (appt.paymentStatus === 'pago' ? 'pago' : 'pendente');

                const txAmount = isMultiple
                  ? (appt.paymentSplits?.reduce((sum, s) => sum + s.amount, 0) || appt.value || 0)
                  : (appt.paymentStatus === 'parcial' ? (appt.upfrontPaidAmount || 0) : (appt.value || 0));

                return {
                  ...f,
                  patientId: appt.patientId,
                  packageId: appt.packageId || undefined,
                  amount: txAmount,
                  // Only update dueDate if appointment date actually changed
                  dueDate: data.date && oldAppt && data.date !== oldAppt.date ? data.date : f.dueDate,
                  paymentDate: appt.paymentStatus === 'pago' || appt.paymentStatus === 'parcial' ? (f.paymentDate || appt.paymentDate || appt.date) : undefined,
                  status: txStatus as 'pago' | 'pendente',
                  paymentMethod: appt.paymentMethod || undefined,
                  cardInstallments: appt.paymentMethod === 'cartão de crédito' ? appt.cardInstallments : undefined,
                  paymentSplits: isMultiple ? appt.paymentSplits : [],
                  // Keep custom description and category if they exist, otherwise fallback
                  description: f.description || description,
                  category: f.category || 'Atendimentos'
                };
              }
              return f;
            });

            // Sync updated transactions to Supabase
            const updatedTxs = updatedFinance.filter(f => f.appointmentId === appt.id);
            updatedTxs.forEach(tx => get().syncToSupabase('financeiro_clinica', tx, 'update'));
            finalFinance = updatedFinance;
          } else {
            // Create a brand new transaction
            if (appt.paymentMethod === 'múltiplo' && appt.paymentSplits && appt.paymentSplits.length > 0) {
              const txStatus = appt.paymentSplits.every(s => s.status === 'pago') ? 'pago' : 'pendente';
              const totalSplitsAmount = appt.paymentSplits.reduce((sum, s) => sum + s.amount, 0);

              const newTx = {
                id: generateUUID(),
                patientId: appt.patientId,
                appointmentId: appt.id,
                packageId: appt.packageId || undefined,
                type: 'receita' as const,
                amount: totalSplitsAmount || appt.value || 0,
                dueDate: appt.date,
                paymentDate: txStatus === 'pago' ? (appt.paymentDate || appt.date) : undefined,
                status: txStatus as 'pago' | 'pendente',
                paymentMethod: 'múltiplo' as const,
                category: 'Atendimentos',
                description: description,
                paymentSplits: appt.paymentSplits
              };
              finalFinance = [...state.finance, newTx];
              get().syncToSupabase('financeiro_clinica', newTx, 'insert');
            } else {
              const txAmount = appt.paymentStatus === 'parcial'
                ? (appt.upfrontPaidAmount || 0)
                : (appt.value || 0);

              const txData = {
                id: generateUUID(),
                patientId: appt.patientId,
                appointmentId: appt.id,
                packageId: appt.packageId || undefined,
                type: 'receita' as const,
                amount: txAmount,
                dueDate: appt.date,
                paymentDate: appt.paymentStatus === 'pago' || appt.paymentStatus === 'parcial' ? (appt.paymentDate || appt.date) : undefined,
                status: (appt.paymentStatus === 'pago' ? 'pago' : 'pendente') as 'pago' | 'pendente',
                paymentMethod: appt.paymentMethod || undefined,
                cardInstallments: appt.cardInstallments || undefined,
                category: 'Atendimentos',
                description
              };
              finalFinance = [...state.finance, txData];
              get().syncToSupabase('financeiro_clinica', txData, 'insert');
            }
          }
        } else if (!skipFinanceSync && appt) {
          const existingTxs = state.finance.filter(f => f.appointmentId === appt.id);
          existingTxs.forEach(tx => get().syncToSupabase('financeiro_clinica', { id: tx.id }, 'delete'));
          finalFinance = state.finance.filter(f => f.appointmentId !== appt.id);
        }

        return {
          appointments: finalAppointments,
          inventory: updatedInventory,
          supplyExpenses: updatedExpenses,
          finance: finalFinance
        };
      }),
      removeAppointment: (id) => {
        let returnIdToDelete: string | null = null;
        set((state) => {
          const returnAppt = state.appointments.find(a => a.linkedToAppointmentId === id);
          if (returnAppt) {
            returnIdToDelete = returnAppt.id;
          }
          const filtered = state.appointments.filter(a => a.id !== id && a.id !== returnIdToDelete);
          const filteredFinance = state.finance.filter(f => f.appointmentId !== id);
          const consumptionToReverse = (state.supplyExpenses || []).filter(exp => exp.appointmentId === id && exp.movementType !== 'estorno');
          let restoredInventory = state.inventory;
          const reversalExpenses: SupplyExpense[] = [];

          const existingTx = state.finance.find(f => f.appointmentId === id);
          if (existingTx) {
            get().syncToSupabase('financeiro_clinica', { id: existingTx.id }, 'delete');
          }

          consumptionToReverse.forEach(exp => {
            restoredInventory = restoredInventory.map(invItem => {
              if (invItem.id !== exp.itemId) return invItem;
              const restoredQty = parseFloat(((invItem.quantity || 0) + (exp.stockQuantityDelta || inventoryConsumptionStockDelta(invItem, exp.quantityUsed))).toFixed(4));
              get().syncToSupabase('inventario_clinica', { ...invItem, quantity: restoredQty }, 'update');
              return { ...invItem, quantity: restoredQty };
            });
            const reversalExpense: SupplyExpense = {
              ...exp,
              id: generateUUID(),
              quantityUsed: -Math.abs(exp.quantityUsed),
              stockQuantityDelta: -(exp.stockQuantityDelta || 0),
              movementType: 'estorno',
              totalCost: -Math.abs(exp.totalCost),
              date: format(new Date(), 'yyyy-MM-dd')
            };
            reversalExpenses.push(reversalExpense);
            get().syncToSupabase('despesas_insumos_clinica', { id: exp.id }, 'delete');
            get().syncToSupabase('despesas_insumos_clinica', reversalExpense, 'insert');
          });

          return {
            appointments: filtered,
            finance: filteredFinance,
            inventory: restoredInventory,
            supplyExpenses: [...reversalExpenses, ...(state.supplyExpenses || []).filter(exp => exp.appointmentId !== id)]
          };
        });

        get().syncToSupabase('agendamentos_clinica', { id }, 'delete');
        if (returnIdToDelete) {
          get().syncToSupabase('agendamentos_clinica', { id: returnIdToDelete }, 'delete');
        }
      },

      addService: (s) => {
        const newServ = { ...s, id: generateUUID() };
        set((state) => ({ services: [...state.services, newServ] }));
        get().syncToSupabase('servicos_clinica', newServ, 'insert');
      },
      updateService: (id, data) => set((state) => {
        const updated = state.services.map(s => s.id === id ? { ...s, ...data } : s);
        const service = updated.find(s => s.id === id);
        if (service) get().syncToSupabase('servicos_clinica', service, 'update');
        return { services: updated };
      }),
      removeService: (id) => {
        set((state) => ({ services: state.services.filter(s => s.id !== id) }));
        get().syncToSupabase('servicos_clinica', { id }, 'delete');
      },

      addFinance: (f) => {
        const newFin = { taxEntity: 'pessoa_fisica' as const, ...f, id: generateUUID() };
        set((state) => {
          appendFinanceAuditEntry({
            transactionId: newFin.id,
            action: 'created',
            summary: newFin.description || newFin.category || 'Lançamento financeiro',
            patientName: newFin.patientId ? state.patients.find(patient => patient.id === newFin.patientId)?.name : (newFin.type === 'receita' ? 'Diversos' : undefined),
            after: newFin
          });
          return { finance: [...state.finance, newFin] };
        });
        get().syncToSupabase('financeiro_clinica', newFin, 'insert');
        return newFin.id;
      },
      updateFinance: (id, data) => set((state) => {
        const before = state.finance.find(f => f.id === id);
        const updated = state.finance.map(f => f.id === id ? { ...f, ...data } : f);
        const item = updated.find(f => f.id === id);
        if (item) {
          appendFinanceAuditEntry({
            transactionId: id,
            action: data.status === 'pago' && before?.status !== 'pago' ? 'paid' : 'updated',
            summary: item.description || item.category || 'Lançamento financeiro',
            patientName: item.patientId ? state.patients.find(patient => patient.id === item.patientId)?.name : (item.type === 'receita' ? 'Diversos' : undefined),
            before,
            after: item,
            changes: buildFinanceChanges(before, item)
          });
          get().syncToSupabase('financeiro_clinica', item, 'update');
        }
        return { finance: updated };
      }),
      removeFinance: (id) => {
        set((state) => {
          const tx = state.finance.find(f => f.id === id);
          let updatedAppointments = state.appointments;

          if (tx) {
            appendFinanceAuditEntry({
              transactionId: id,
              action: 'deleted',
              summary: tx.description || tx.category || 'Lançamento financeiro',
              patientName: tx.patientId ? state.patients.find(patient => patient.id === tx.patientId)?.name : (tx.type === 'receita' ? 'Diversos' : undefined),
              before: tx
            });
          }

          if (tx && tx.appointmentId) {
            updatedAppointments = state.appointments.map(a =>
              a.id === tx.appointmentId
                ? {
                    ...a,
                    paymentStatus: 'pendente' as const,
                    paymentMethod: undefined,
                    cardInstallments: undefined,
                    upfrontPaid: false,
                    upfrontPaidAmount: 0,
                    paymentDate: undefined
                  }
                : a
            );

            const updatedAppt = updatedAppointments.find(a => a.id === tx.appointmentId);
            if (updatedAppt) {
              get().syncToSupabase('agendamentos_clinica', updatedAppt, 'update');
            }
          }

          return {
            finance: state.finance.filter(f => f.id !== id),
            appointments: updatedAppointments
          };
        });

        get().syncToSupabase('financeiro_clinica', { id }, 'delete');
      },

      addBudget: (b) => set((state) => ({ budgets: [...state.budgets, { ...b, id: generateUUID() }] })),
      addOpportunity: (opp) => {
        const newOpp = { ...opp, id: opp.id || generateUUID(), createdAt: new Date().toISOString() };
        set((state) => ({ opportunities: [...state.opportunities, newOpp] }));
        get().syncToSupabase('oportunidades_clinica', newOpp, 'insert');
      },
      updateOpportunity: (id, opp) => set((state) => {
        const updated = state.opportunities.map(o => o.id === id ? { ...o, ...opp } : o);
        const opportunity = updated.find(o => o.id === id);
        if (opportunity) get().syncToSupabase('oportunidades_clinica', opportunity, 'update');
        return { opportunities: updated };
      }),
      removeOpportunity: (id) => {
        set((state) => ({ opportunities: state.opportunities.filter(o => o.id !== id) }));
        get().syncToSupabase('oportunidades_clinica', { id }, 'delete');
      },

      addPackage: (p) => {
        const newPkg = { ...p, id: generateUUID() };
        set((state) => ({ packages: [...state.packages, newPkg] }));
        get().syncToSupabase('pacotes_clinica', newPkg, 'insert');
      },
      updatePackage: (id, pkg) => set((state) => {
        const updated = state.packages.map(p => p.id === id ? { ...p, ...pkg } : p);
        const item = updated.find(p => p.id === id);
        if (item) get().syncToSupabase('pacotes_clinica', item, 'update');
        return { packages: updated };
      }),

      addProfessional: (prof) => {
        const newProf = { ...prof, active: true, id: generateUUID() };
        set((state) => ({ professionals: [...state.professionals, newProf] }));
        get().syncToSupabase('profissionais_clinica', newProf, 'insert');
      },
      updateProfessional: (id, data) => set((state) => {
        const updated = state.professionals.map(p => p.id === id ? { ...p, ...data } : p);
        const prof = updated.find(p => p.id === id);
        if (prof) get().syncToSupabase('profissionais_clinica', prof, 'update');
        return { professionals: updated };
      }),
      removeProfessional: (id) => {
        set((state) => ({ professionals: state.professionals.filter(p => p.id !== id) }));
        get().syncToSupabase('profissionais_clinica', { id }, 'delete');
      },

      addMedicalRecord: async (r) => {
        const now = new Date().toISOString();
        const newRecord: MedicalRecord = { ...r, id: generateUUID(), createdAt: now, updatedAt: now };
        set((state) => ({ medicalRecords: [newRecord, ...state.medicalRecords] }));
        await get().syncToSupabase(CLINICAL_TABLES.medicalRecords, newRecord, 'insert');
        return newRecord;
      },
      updateMedicalRecord: async (id, data) => {
        const updatedAt = new Date().toISOString();
        let updatedRecord: MedicalRecord | undefined;
        set((state) => {
          const medicalRecords = state.medicalRecords.map(r => {
            if (r.id !== id) return r;
            updatedRecord = { ...r, ...data, updatedAt };
            return updatedRecord;
          });
          return { medicalRecords };
        });
        if (updatedRecord) await get().syncToSupabase(CLINICAL_TABLES.medicalRecords, updatedRecord, 'update');
      },
      removeMedicalRecord: async (id) => {
        set((state) => ({ medicalRecords: state.medicalRecords.filter(r => r.id !== id) }));
        await get().syncToSupabase(CLINICAL_TABLES.medicalRecords, { id }, 'delete');
      },

      addDoctorNote: async (n) => {
        const now = new Date().toISOString();
        const newNote: DoctorNote = { ...n, id: generateUUID(), createdAt: now, updatedAt: now };
        set((state) => ({ doctorNotes: [newNote, ...state.doctorNotes] }));
        await get().syncToSupabase(CLINICAL_TABLES.doctorNotes, newNote, 'insert');
        return newNote;
      },
      updateDoctorNote: async (id, data) => {
        const updatedAt = new Date().toISOString();
        let updatedNote: DoctorNote | undefined;
        set((state) => {
          const doctorNotes = state.doctorNotes.map(n => {
            if (n.id !== id) return n;
            updatedNote = { ...n, ...data, updatedAt };
            return updatedNote;
          });
          return { doctorNotes };
        });
        if (updatedNote) await get().syncToSupabase(CLINICAL_TABLES.doctorNotes, updatedNote, 'update');
      },
      removeDoctorNote: async (id) => {
        set((state) => ({ doctorNotes: state.doctorNotes.filter(n => n.id !== id) }));
        await get().syncToSupabase(CLINICAL_TABLES.doctorNotes, { id }, 'delete');
      },

      addBeforeAfterPhoto: async (p) => {
        const now = new Date().toISOString();
        const newPhoto: BeforeAfterPhoto = { ...p, id: generateUUID(), createdAt: now, updatedAt: now };
        set((state) => ({ beforeAfterPhotos: [newPhoto, ...state.beforeAfterPhotos] }));
        await get().syncToSupabase(CLINICAL_TABLES.beforeAfterPhotos, newPhoto, 'insert');
        return newPhoto;
      },
      removeBeforeAfterPhoto: async (id) => {
        const photo = get().beforeAfterPhotos.find(p => p.id === id);
        set((state) => ({ beforeAfterPhotos: state.beforeAfterPhotos.filter(p => p.id !== id) }));
        await get().syncToSupabase(CLINICAL_TABLES.beforeAfterPhotos, { id }, 'delete');
        const paths = [photo?.beforePhotoPath, photo?.afterPhotoPath].filter(Boolean) as string[];
        if (paths.length > 0) {
          try {
            await supabase.storage.from(clinicalPhotosBucket).remove(paths);
          } catch (storageErr) {
            console.warn('Não foi possível remover fotos clínicas do Storage.', storageErr);
          }
        }
      },

      addReminder: (rem) => set((state) => ({ reminders: [{ ...rem, id: generateUUID(), createdAt: new Date().toISOString() }, ...state.reminders] })),
      removeReminder: (id) => set((state) => ({ reminders: state.reminders.filter(r => r.id !== id) })),

      addInventoryItem: (item) => {
        const newItem = { ...item, id: generateUUID() };
        set((state) => ({
          inventory: [...state.inventory, newItem],
          inventoryCategories: Array.from(new Set([...(state.inventoryCategories || []), newItem.category].filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'))
        }));
        get().syncToSupabase('inventario_clinica', newItem, 'insert');
        return newItem.id;
      },
      updateInventoryItem: (id, data) => set((state) => {
        const updated = state.inventory.map(i => i.id === id ? { ...i, ...data } : i);
        const item = updated.find(i => i.id === id);
        if (item) get().syncToSupabase('inventario_clinica', item, 'update');
        return { inventory: updated };
      }),
      removeInventoryItem: (id) => {
        set((state) => ({ inventory: state.inventory.filter(i => i.id !== id) }));
        get().syncToSupabase('inventario_clinica', { id }, 'delete');
      },

      addInventoryPurchase: (purchase) => {
        let newPurchaseId = generateUUID();
        let purchaseToSync: InventoryPurchase | null = null;
        let itemToSync: InventoryItem | null = null;

        set((state) => {
          const currentItem = state.inventory.find(item => item.id === purchase.itemId);
          if (!currentItem) return state;

          const quantity = Math.max(0, Number(purchase.quantity || 0));
          const totalCost = Math.max(0, Number(purchase.totalCost || 0));
          const stockQuantityBefore = Number(currentItem.quantity || 0);
          const stockQuantityAfter = stockQuantityBefore + quantity;
          const previousStockValue = stockQuantityBefore * Number(currentItem.unitCost || 0);
          const weightedUnitCost = stockQuantityAfter > 0
            ? (previousStockValue + totalCost) / stockQuantityAfter
            : Number(currentItem.unitCost || 0);

          purchaseToSync = {
            ...purchase,
            id: newPurchaseId,
            itemName: purchase.itemName || currentItem.name,
            quantity,
            totalCost,
            unitCostAtPurchase: quantity > 0 ? totalCost / quantity : 0,
            stockQuantityBefore,
            stockQuantityAfter
          };

          itemToSync = {
            ...currentItem,
            quantity: stockQuantityAfter,
            unitCost: weightedUnitCost,
            supplier: purchase.supplier || currentItem.supplier,
            batchNumber: purchase.batchNumber || currentItem.batchNumber,
            expirationDate: purchase.expirationDate || currentItem.expirationDate
          };

          return {
            inventory: state.inventory.map(item => item.id === currentItem.id ? itemToSync as InventoryItem : item),
            inventoryPurchases: [purchaseToSync as InventoryPurchase, ...(state.inventoryPurchases || [])]
          };
        });

        if (itemToSync) get().syncToSupabase('inventario_clinica', itemToSync, 'update');
        if (purchaseToSync) get().syncToSupabase('compras_inventario_clinica', purchaseToSync, 'insert');
        return newPurchaseId;
      },

      addInventoryCategory: (category) => {
        const normalized = category.trim();
        if (!normalized) return;
        set((state) => ({
          inventoryCategories: Array.from(new Set([...(state.inventoryCategories || []), normalized])).sort((a, b) => a.localeCompare(b, 'pt-BR'))
        }));
      },
      removeInventoryCategory: (category) => {
        set((state) => ({
          inventoryCategories: (state.inventoryCategories || []).filter(item => item.toLowerCase() !== category.trim().toLowerCase())
        }));
      },

      addSupplyExpense: (expense) => {
        const newExpense = { movementType: 'manual' as const, ...expense, id: generateUUID() };
        set((state) => ({ supplyExpenses: [newExpense, ...(state.supplyExpenses || [])] }));
        get().syncToSupabase('despesas_insumos_clinica', newExpense, 'insert');
      },

      addDeductibleCategory: (category) => {
        const newCategory: DeductibleCategory = { ...category, id: generateUUID() };
        set((state) => ({ deductibleCategories: [newCategory, ...(state.deductibleCategories || [])] }));
        get().syncToSupabase('categorias_dedutiveis_clinica', newCategory, 'insert');
      },
      updateDeductibleCategory: (id, data) => set((state) => {
        const updated = (state.deductibleCategories || []).map(category => category.id === id ? { ...category, ...data } : category);
        const item = updated.find(category => category.id === id);
        if (item) get().syncToSupabase('categorias_dedutiveis_clinica', item, 'upsert');
        return { deductibleCategories: updated };
      }),
      removeDeductibleCategory: (id) => {
        set((state) => ({ deductibleCategories: (state.deductibleCategories || []).filter(category => category.id !== id) }));
        get().syncToSupabase('categorias_dedutiveis_clinica', { id }, 'delete');
      },

      addServiceCategory: (category) => set((state) => ({ serviceCategories: state.serviceCategories.includes(category) ? state.serviceCategories : [...state.serviceCategories, category] })),
      removeServiceCategory: (category) => set((state) => ({ serviceCategories: state.serviceCategories.filter(cat => cat !== category) })),
      renameServiceCategory: (oldName, newName) => set((state) => ({
        serviceCategories: state.serviceCategories.map(cat => cat === oldName ? newName.trim() : cat)
      })),
      addDocument: (d) => {
        const newDocument = { ...d, id: generateUUID() };
        set((state) => ({ documents: [newDocument, ...state.documents] }));
        get().syncToSupabase('documentos_clinica', newDocument, 'insert');
      },
      removeDocument: (id) => {
        set((state) => ({ documents: state.documents.filter(d => d.id !== id) }));
        get().syncToSupabase('documentos_clinica', { id }, 'delete');
      },
      bulkAddPatients: (ps) => set((state) => ({ patients: [...state.patients, ...ps.map(p => ({ ...p, id: generateUUID(), createdAt: new Date().toISOString() }))] })),
      addUser: (u) => set((state) => ({ users: [...state.users, { ...u, active: true, id: generateUUID() }] })),
      updateUser: (id, data) => set((state) => ({ users: state.users.map(u => u.id === id ? { ...u, ...data } : u) })),
      removeUser: (id) => set((state) => ({ users: state.users.filter(u => u.id !== id) })),
      setCurrentUser: (user) => set({ currentUser: user }),
      addRepoFolder: (folderName) => set((state) => {
        const capitalized = folderName.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        return {
          repoFolders: state.repoFolders.includes(capitalized) ? state.repoFolders : [...state.repoFolders, capitalized]
        };
      }),
      renameRepoFolder: (oldName, newName) => set((state) => {
        const capitalized = newName.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        return {
          repoFolders: state.repoFolders.map(f => f === oldName ? capitalized : f),
          repoFiles: state.repoFiles.map(file => file.folder === oldName ? { ...file, folder: capitalized } : file)
        };
      }),
      deleteRepoFolder: (folderName) => set((state) => ({
        repoFolders: state.repoFolders.filter(f => f !== folderName),
        repoFiles: state.repoFiles.filter(file => file.folder !== folderName)
      })),
      addRepoFile: (file) => set((state) => ({
        repoFiles: [...state.repoFiles, file]
      })),
      deleteRepoFile: (id) => set((state) => ({
        repoFiles: state.repoFiles.filter(f => f.id !== id)
      })),
      renameRepoFile: (id, newName) => set((state) => ({
        repoFiles: state.repoFiles.map(f => f.id === id ? { ...f, name: newName } : f)
      })),

      toggleInsightTask: (insightId, taskId) => set((state) => {
        const updatedInsights = state.insights.map(i =>
          i.id === insightId ? {
            ...i,
            tasks: i.tasks?.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t)
          } : i
        );

        let updatedAppointments = state.appointments;
        if (taskId.startsWith('conf-')) {
          const apptId = taskId.replace('conf-', '');
          const task = state.insights.find(ins => ins.id === insightId)?.tasks?.find(t => t.id === taskId);
          const isNowCompleted = !task?.isCompleted;

          updatedAppointments = state.appointments.map(a =>
            a.id === apptId ? { ...a, confirmationStatus: isNowCompleted ? 'mensagem enviada' : 'pendente' } : a
          );
        }

        return { insights: updatedInsights, appointments: updatedAppointments };
      }),
      resolveInsight: (id) => set((state) => ({ insights: state.insights.map(i => i.id === id ? { ...i, resolved: true } : i) })),
      generateInsights: () => set((state) => {
        const newInsights: AIInsight[] = [];
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');

        const patientsWithoutReturn = state.patients.filter(p => {
          const hasFutureAppt = state.appointments.some(a => a.patientId === p.id && new Date(a.date) > today);
          const isOldPatient = p.lastVisit && new Date(p.lastVisit) < subDays(today, 30);
          return !hasFutureAppt && isOldPatient;
        }).slice(0, 2);

        if (patientsWithoutReturn.length > 0) {
          const patientNames = patientsWithoutReturn.map(p => p.name).join(', ');
          newInsights.push({
            id: generateUUID(),
            type: 'risco',
            message: `Identificamos que ${patientsWithoutReturn.length} pacientes de alto valor não retornam há mais de 30 dias: ${patientNames}.`,
            actionRequested: 'Reter Pacientes',
            resolved: false,
            createdAt: new Date().toISOString(),
            tasks: [
              { id: 't1', description: `IA: Analisar histórico de ${patientNames}`, isCompleted: true, type: 'AI' },
              { id: 't2', description: 'IA: Verificar disponibilidades na agenda da Dra. Beatriz', isCompleted: true, type: 'AI' },
              { id: 't3', description: 'IA: Gerar mensagens personalizadas de "Saudade"', isCompleted: false, type: 'AI' },
              { id: 't4', description: 'Usuário: Aprovar e enviar via WhatsApp', isCompleted: false, type: 'User' }
            ]
          });
        }

        const freeAfternoonSlot = true;
        if (freeAfternoonSlot) {
          const afternoonPrefferedPatients = state.patients.filter(p => {
            const patientAppts = state.appointments.filter(a => a.patientId === p.id);
            const afternoonAppts = patientAppts.filter(a => {
              const hour = parseInt(a.startTime.split(':')[0]);
              return hour >= 13 && hour <= 18;
            });
            return afternoonAppts.length > patientAppts.length / 2 && patientAppts.length > 0;
          }).slice(0, 3);

          if (afternoonPrefferedPatients.length > 0) {
            const names = afternoonPrefferedPatients.map(p => p.name).join(', ');
            newInsights.push({
              id: generateUUID(),
              type: 'oportunidade',
              message: `Agenda vaga amanhã das 13h às 18h. Filtramos pacientes que preferem este horário e estão com tratamentos em pausa: ${names}.`,
              actionRequested: 'Preencher Agenda',
              resolved: false,
              createdAt: new Date().toISOString(),
              tasks: [
                { id: 't1', description: `IA: Identificar pacientes com preferência vespertina: ${names}`, isCompleted: true, type: 'AI' },
                { id: 't2', description: 'IA: Selecionar tratamentos pendentes mais lucrativos', isCompleted: true, type: 'AI' },
                { id: 't3', description: 'Usuário: Confirmar convocação da lista selecionada', isCompleted: false, type: 'User' }
              ]
            });
          }
        }

        const tomorrow = addDays(today, 1);
        const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
        const tomorrowApptsPending = state.appointments.filter(a => a.date === tomorrowStr && a.confirmationStatus === 'pendente');

        if (tomorrowApptsPending.length > 0) {
          newInsights.push({
            id: generateUUID(),
            type: 'operacional',
            message: `Existem ${tomorrowApptsPending.length} agendamentos para amanhã que ainda não foram confirmados.`,
            actionRequested: 'Confirmar Agenda',
            resolved: false,
            createdAt: new Date().toISOString(),
            tasks: [
              ...tomorrowApptsPending.map(a => {
                const patient = state.patients.find(p => p.id === a.patientId);
                return {
                  id: `conf-${a.id}`,
                  description: `Usuário: Enviar mensagem de confirmação para ${patient?.name || 'Paciente'} (${a.startTime})`,
                  isCompleted: false,
                  type: 'User' as const
                };
              })
            ]
          });
        }

        return { insights: [...newInsights, ...state.insights].slice(0, 5) };
      }),
    }),
    {
      name: 'clinic-stark-storage',
      partialize: (state) => {
        const cleanMessages: Record<string, WaMessage[]> = {};
        Object.keys(state.whatsappMessages || {}).forEach(chatId => {
          const msgs = state.whatsappMessages[chatId] || [];
          cleanMessages[chatId] = msgs.slice(-40).map(msg => {
            if (msg.mediaUrl && msg.mediaUrl.startsWith('data:')) {
              return { ...msg, mediaUrl: undefined };
            }
            return msg;
          });
        });
        return {
          ...state,
          whatsappMessages: cleanMessages
        };
      }
    }
  )
);
