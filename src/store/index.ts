import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addDays, format, subDays } from 'date-fns';
import { supabase, toSnakeCase, toCamelCase } from '../lib/supabase';
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
  User,
  FileItem,
  SupplyExpense
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
  supplyExpenses: SupplyExpense[];
  serviceCategories: string[];
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setOnboarded: (data: { name: string; type: string; activateAI: boolean }) => Promise<void>;
  setClinicName: (name: string) => void;
  
  // Auth state & actions
  currentClient: any | null;
  loginClient: (username: string, password: string) => Promise<boolean>;
  registerClient: (name: string, username: string, password: string, phone: string) => Promise<boolean>;
  logoutClient: () => void;
  syncFromSupabase: (clientId: string) => Promise<void>;
  populateInitialMockData: (clientId: string) => Promise<void>;
  syncToSupabase: (table: string, data: any, operation?: 'insert' | 'update' | 'delete') => Promise<void>;

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
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  removeAppointment: (id: string) => void;
  addService: (s: Omit<Service, 'id'>) => void;
  updateService: (id: string, data: Partial<Service>) => void;
  removeService: (id: string) => void;
  addFinance: (f: Omit<FinancialTransaction, 'id'>) => void;
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
  addMedicalRecord: (r: Omit<MedicalRecord, 'id'>) => void;
  updateMedicalRecord: (id: string, data: Partial<MedicalRecord>) => void;
  removeMedicalRecord: (id: string) => void;
  addReminder: (rem: Omit<Reminder, 'id' | 'createdAt'>) => void;
  removeReminder: (id: string) => void;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventoryItem: (id: string, data: Partial<InventoryItem>) => void;
  removeInventoryItem: (id: string) => void;
  addSupplyExpense: (expense: Omit<SupplyExpense, 'id'>) => void;
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
      documents: [],
      reminders: [],
      inventory: [],
      supplyExpenses: [],
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
      setEvolutionConfig: (url, key, instance) => set({ evolutionApiUrl: url.trim(), evolutionApiKey: key.trim(), evolutionInstance: instance.trim() }),
      setWhatsappConnected: (connected) => set({ whatsappConnected: connected }),
      setWhatsappChats: (chats) => set((state) => {
        const newMessages = { ...state.whatsappMessages };
        let messagesChanged = false;

        chats.forEach(chat => {
          if (!chat.lastMessage) return;

          const chatMsgs = newMessages[chat.id] || [];
          
          // Verifica se a última mensagem já existe (por texto e timestamp próximo)
          const textMatch = chatMsgs.some(m => 
            m.text === chat.lastMessage && 
            Math.abs(m.timestamp - chat.lastMessageTimestamp) < 10
          );

          if (!textMatch) {
            const newMsg: WaMessage = {
              id: `api-last-${chat.id}-${chat.lastMessageTimestamp}`,
              fromMe: chat.lastMessageFromMe ?? false,
              text: chat.lastMessage,
              timestamp: chat.lastMessageTimestamp,
              status: 'READ',
            };
            newMessages[chat.id] = [...chatMsgs, newMsg].sort((a, b) => a.timestamp - b.timestamp);
            messagesChanged = true;
          }
        });

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
          const msgs = newMessages[localChat.id] || [];
          const lastMsg = msgs[msgs.length - 1];
          const updatedChat = { ...localChat };
          if (lastMsg) {
            updatedChat.lastMessage = lastMsg.text;
            updatedChat.lastMessageTimestamp = lastMsg.timestamp;
            updatedChat.lastMessageFromMe = lastMsg.fromMe;
          }
          mergedChats.push(updatedChat);
        });

        // Ordena por timestamp da última mensagem decrescente
        mergedChats.sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);

        return messagesChanged 
          ? { whatsappChats: mergedChats, whatsappMessages: newMessages }
          : { whatsappChats: mergedChats };
      }),
      upsertWhatsappMessages: (chatId, messages) => set((state) => {
        const existing = state.whatsappMessages[chatId] || [];
        // Merge by id — avoid duplicates
        const map = new Map<string, WaMessage>();
        existing.forEach(m => map.set(m.id, m));
        messages.forEach(m => map.set(m.id, m));
        const merged = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
        return { whatsappMessages: { ...state.whatsappMessages, [chatId]: merged } };
      }),
      addOutboundMessage: (chatId, message, optimisticId) => set((state) => {
        const existing = state.whatsappMessages[chatId] || [];
        
        let updated;
        if (optimisticId) {
          const idx = existing.findIndex(m => m.id === optimisticId);
          if (idx >= 0) {
            updated = existing.map((m, i) => i === idx ? message : m);
          } else {
            updated = [...existing, message];
          }
        } else {
          const idx = existing.findIndex(m => m.id === message.id);
          updated = idx >= 0
            ? existing.map((m, i) => i === idx ? message : m)
            : [...existing, message];
        }

        // Promove para 'atendimento' ao enviar mensagem se não estiver finalizado
        const currentStatus = state.chatStatuses[chatId];
        const newStatuses = { ...state.chatStatuses };
        if (currentStatus !== 'atendimento') {
          newStatuses[chatId] = 'atendimento';
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
          whatsappMessages: { ...state.whatsappMessages, [chatId]: updated },
          chatStatuses: newStatuses,
          whatsappChats: updatedChats
        };
      }),
      setChatStatus: (chatId, status) => set((state) => ({
        chatStatuses: { ...state.chatStatuses, [chatId]: status }
      })),
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
          
          if (isEmployee && employeeData) {
            const emp = toCamelCase(employeeData);
            const employeeRole = emp.tipoMembro === 'clinico' ? 'profissional' : 'recepção';
            
            set({
              currentClient: client,
              clinicName: client.clinicName || 'clínica stark',
              clinicType: client.clinicType || 'estética',
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
          insights: [],
          repoFolders: [],
          repoFiles: []
        });
      },

      syncToSupabase: async (table, data, operation = 'update') => {
        const { currentClient } = get();
        if (!currentClient) return;

        try {
          if (operation === 'delete') {
            await supabase
              .from(table)
              .delete()
              .eq('id', data.id)
              .eq('cliente_clinica_id', currentClient.id);
          } else {
            const dbData = {
              ...toSnakeCase(data),
              cliente_clinica_id: currentClient.id
            };
            if (operation === 'insert') {
              await supabase.from(table).insert(dbData);
            } else {
              await supabase
                .from(table)
                .update(dbData)
                .eq('id', data.id)
                .eq('cliente_clinica_id', currentClient.id);
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
          const localSupplyExpenses = get().supplyExpenses || [];
          const localOpportunities = get().opportunities || [];
          const localMedicalRecords = get().medicalRecords || [];
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
          localAppointments.forEach(a => checkAndMap(a.id));
          localFinance.forEach(f => checkAndMap(f.id));
          localPackages.forEach(pkg => checkAndMap(pkg.id));
          localOpportunities.forEach(opp => checkAndMap(opp.id));
          localMedicalRecords.forEach(mr => checkAndMap(mr.id));
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
              patientId: localIdMap[r.patientId] || r.patientId
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
              appointments: migratedAppointments,
              finance: migratedFinance,
              medicalRecords: migratedMedicalRecords,
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
              if (migratedOpportunities.length > 0) {
                const dbOpps = migratedOpportunities.map(opp => ({ ...toSnakeCase(opp), cliente_clinica_id: clientId }));
                await supabase.from('oportunidades_clinica').upsert(dbOpps);
              }
              console.log('Migração concluída com sucesso!');
            } catch (errUpsert) {
              console.error('Erro ao realizar upsert de dados migrados no Supabase:', errUpsert);
            }
          }

          const [ps, appts, servs, profs, fin, pkgs, inv, exp, opps] = await Promise.all([
            supabase.from('pacientes_clinica').select('*').eq('cliente_clinica_id', clientId),
            supabase.from('agendamentos_clinica').select('*').eq('cliente_clinica_id', clientId),
            supabase.from('servicos_clinica').select('*').eq('cliente_clinica_id', clientId),
            supabase.from('profissionais_clinica').select('*').eq('cliente_clinica_id', clientId),
            supabase.from('financeiro_clinica').select('*').eq('cliente_clinica_id', clientId),
            supabase.from('pacotes_clinica').select('*').eq('cliente_clinica_id', clientId),
            supabase.from('inventario_clinica').select('*').eq('cliente_clinica_id', clientId),
            supabase.from('despesas_insumos_clinica').select('*').eq('cliente_clinica_id', clientId),
            supabase.from('oportunidades_clinica').select('*').eq('cliente_clinica_id', clientId),
          ]);

          set({
            patients: ps.data ? toCamelCase(ps.data) : [],
            appointments: appts.data ? toCamelCase(appts.data) : [],
            services: servs.data ? toCamelCase(servs.data) : [],
            professionals: profs.data ? toCamelCase(profs.data) : [],
            finance: fin.data ? toCamelCase(fin.data) : [],
            packages: pkgs.data ? toCamelCase(pkgs.data) : [],
            inventory: inv.data ? toCamelCase(inv.data) : [],
            supplyExpenses: exp.data ? toCamelCase(exp.data) : [],
            opportunities: opps.data ? toCamelCase(opps.data) : []
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
          return { appointments: newAppointments };
        });

        get().syncToSupabase('agendamentos_clinica', newAppt, 'insert');
        if (returnAppt) {
          get().syncToSupabase('agendamentos_clinica', returnAppt, 'insert');
        }
      },
      updateAppointment: (id, data) => set((state) => {
        const updated = state.appointments.map(a => a.id === id ? { ...a, ...data } : a);
        const appt = updated.find(a => a.id === id);
        if (appt) get().syncToSupabase('agendamentos_clinica', appt, 'update');
        
        const oldAppt = state.appointments.find(a => a.id === id);
        const isTransitionToCompleted = (data.status === 'realizado' || data.status === 'finalizado') && 
          oldAppt && oldAppt.status !== 'realizado' && oldAppt.status !== 'finalizado';

        let updatedInventory = state.inventory;
        let updatedExpenses = state.supplyExpenses || [];

        if (isTransitionToCompleted && oldAppt) {
          const service = state.services.find(s => s.id === (data.serviceId || oldAppt.serviceId));
          const patient = state.patients.find(p => p.id === (data.patientId || oldAppt.patientId));
          
          const itemsUsed = data.customItemCostsUsed || (service && service.itemCosts ? service.itemCosts : []);
          
          if (itemsUsed && itemsUsed.length > 0) {
            itemsUsed.forEach(ic => {
              updatedInventory = updatedInventory.map(invItem => {
                if (invItem.id === ic.itemId) {
                  const scale = invItem.unitsPerPackage && invItem.unitsPerPackage > 1 ? invItem.unitsPerPackage : 1;
                  const deducted = ic.quantity / scale;
                  const newQty = Math.max(0, parseFloat(((invItem.quantity || 0) - deducted).toFixed(4)));
                  const totalCost = ((invItem.unitCost || 0) / scale) * ic.quantity;
                  
                  const newExpense = {
                    id: Math.random().toString(),
                    itemId: invItem.id,
                    itemName: invItem.name,
                    quantityUsed: ic.quantity,
                    serviceName: service?.name || 'Procedimento',
                    patientName: patient?.name || 'Paciente Geral',
                    totalCost: totalCost,
                    date: format(new Date(), 'yyyy-MM-dd')
                  };

                  updatedExpenses = [newExpense, ...updatedExpenses];
                  
                  get().syncToSupabase('inventario_clinica', { ...invItem, quantity: newQty }, 'update');
                  get().syncToSupabase('despesas_insumos_clinica', newExpense, 'insert');

                  return { ...invItem, quantity: newQty };
                }
                return invItem;
              });
            });
          }
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

        return { 
          appointments: finalAppointments, 
          inventory: updatedInventory,
          supplyExpenses: updatedExpenses 
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
          return { appointments: filtered };
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
        const newFin = { ...f, id: generateUUID() };
        set((state) => ({ finance: [...state.finance, newFin] }));
        get().syncToSupabase('financeiro_clinica', newFin, 'insert');
      },
      updateFinance: (id, data) => set((state) => {
        const updated = state.finance.map(f => f.id === id ? { ...f, ...data } : f);
        const item = updated.find(f => f.id === id);
        if (item) get().syncToSupabase('financeiro_clinica', item, 'update');
        return { finance: updated };
      }),
      removeFinance: (id) => {
        set((state) => ({ finance: state.finance.filter(f => f.id !== id) }));
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
      
      addMedicalRecord: (r) => set((state) => ({ medicalRecords: [{ ...r, id: generateUUID() }, ...state.medicalRecords] })),
      updateMedicalRecord: (id, data) => set((state) => ({ medicalRecords: state.medicalRecords.map(r => r.id === id ? { ...r, ...data } : r) })),
      removeMedicalRecord: (id) => set((state) => ({ medicalRecords: state.medicalRecords.filter(r => r.id !== id) })),
      
      addReminder: (rem) => set((state) => ({ reminders: [{ ...rem, id: generateUUID(), createdAt: new Date().toISOString() }, ...state.reminders] })),
      removeReminder: (id) => set((state) => ({ reminders: state.reminders.filter(r => r.id !== id) })),
      
      addInventoryItem: (item) => {
        const newItem = { ...item, id: generateUUID() };
        set((state) => ({ inventory: [...state.inventory, newItem] }));
        get().syncToSupabase('inventario_clinica', newItem, 'insert');
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
      
      addSupplyExpense: (expense) => {
        const newExpense = { ...expense, id: generateUUID() };
        set((state) => ({ supplyExpenses: [newExpense, ...(state.supplyExpenses || [])] }));
        get().syncToSupabase('despesas_insumos_clinica', newExpense, 'insert');
      },
      
      addServiceCategory: (category) => set((state) => ({ serviceCategories: state.serviceCategories.includes(category) ? state.serviceCategories : [...state.serviceCategories, category] })),
      removeServiceCategory: (category) => set((state) => ({ serviceCategories: state.serviceCategories.filter(cat => cat !== category) })),
      renameServiceCategory: (oldName, newName) => set((state) => ({
        serviceCategories: state.serviceCategories.map(cat => cat === oldName ? newName.trim() : cat)
      })),
      addDocument: (d) => set((state) => ({ documents: [{ ...d, id: generateUUID() }, ...state.documents] })),
      removeDocument: (id) => set((state) => ({ documents: state.documents.filter(d => d.id !== id) })),
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
