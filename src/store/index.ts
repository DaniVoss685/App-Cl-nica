import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addDays, format, subDays } from 'date-fns';
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
  setOnboarded: (data: { name: string; type: string; activateAI: boolean }) => void;
  setClinicName: (name: string) => void;
  
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
  addAppointment: (a: Omit<Appointment, 'id'>) => void;
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
}

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
  { id: 'p1', name: 'Dra. Beatriz Stark', specialty: 'Dermatologista', active: true, email: 'beatriz@stark.ai' },
  { id: 'p2', name: 'Dr. Carlos Mendes', specialty: 'Cirurgião Plástico', active: true, email: 'carlos@stark.ai' },
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
    (set) => ({
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
      patients: mockPatients,
      appointments: mockAppointments,
      services: mockServices,
      packages: [
        {
          id: 'pkg1',
          name: 'Protocolo Rejuvenescimento Facial',
          description: 'Combo completo de rejuvenescimento incluindo preenchimento labial e bioestimulador.',
          price: 2000,
          totalSessions: 10,
          sessionInterval: 7,
          includedServices: ['s2'],
          active: true,
          maxDiscountPercentage: 10,
          maxInstallments: 12,
          professionalIds: ['p1']
        }
      ],
      finance: mockFinance,
      budgets: [],
      opportunities: [],
      insights: mockInsights,
      professionals: mockProfessionals,
      medicalRecords: [],
      documents: [],
      reminders: [],
      inventory: [
        { id: 'i1', name: 'Luvas de Procedimento', category: 'materiais', unitCost: 150.00, unit: 'pacote', quantity: 5, minQuantity: 2, unitsPerPackage: 100, subUnitName: 'unidade' },
        { id: 'i2', name: 'Seringas Descartáveis 5ml', category: 'materiais', unitCost: 2.00, unit: 'unidade', quantity: 25, minQuantity: 15 },
        { id: 'i3', name: 'Ácido Hialurônico Ultra 1ml', category: 'insumos', unitCost: 180.00, unit: 'ml', quantity: 5, minQuantity: 4 },
        { id: 'i4', name: 'Anestésico Tópico Pomada', category: 'insumos', unitCost: 45.00, unit: 'g', quantity: 3, minQuantity: 2 }
      ],
      supplyExpenses: [
        { id: 'se1', itemId: 'i1', itemName: 'Luvas de Procedimento (Par)', quantityUsed: 2, serviceName: 'consulta inicial', patientName: 'maria silva', totalCost: 3.00, date: todayStr },
        { id: 'se2', itemId: 'i3', itemName: 'Ácido Hialurônico Ultra 1ml', quantityUsed: 1, serviceName: 'preenchimento labial', patientName: 'joão santos', totalCost: 180.00, date: todayStr }
      ],
      serviceCategories: ['consulta', 'procedimento', 'estética'],
      repoFolders: ['Modelos', 'Financeiro', 'Jurídico', 'Pacientes', 'Branding'],
      repoFiles: [],
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      
      // Onboarding Tour state implementation
      isTourActive: false,
      currentTourStep: 0,
      startTour: (stepIndex = 0) => set({ isTourActive: true, currentTourStep: stepIndex }),
      nextTourStep: () => set((state) => ({ currentTourStep: state.currentTourStep + 1 })),
      prevTourStep: () => set((state) => ({ currentTourStep: Math.max(0, state.currentTourStep - 1) })),
      endTour: () => set({ isTourActive: false, currentTourStep: 0 }),

      setOnboarded: (data) => set({ 
        isOnboarded: true, 
        clinicName: data.name, 
        clinicType: data.type,
        activateAI: data.activateAI
      }),
      setClinicName: (name) => set({ clinicName: name }),
      setProfilePicture: (pic) => set({ profilePicture: pic }),
      setFinanceConfig: (pix, bank, account) => set({ pixKey: pix, bankName: bank, bankAccount: account }),
      addPatient: (p) => set((state) => ({ patients: [...state.patients, { ...p, id: p.id || Math.random().toString(), createdAt: new Date().toISOString() }] })),
      updatePatient: (id, data) => set((state) => ({ patients: state.patients.map(p => p.id === id ? { ...p, ...data } : p) })),
      removePatient: (id) => set((state) => ({ patients: state.patients.filter(p => p.id !== id) })),
      addAppointment: (a) => set((state) => ({ appointments: [...state.appointments, { ...a, id: Math.random().toString(), confirmationStatus: a.confirmationStatus || 'pendente' }] })),
      updateAppointment: (id, data) => set((state) => {
        const updated = state.appointments.map(a => a.id === id ? { ...a, ...data } : a);
        const oldAppt = state.appointments.find(a => a.id === id);
        const isTransitionToCompleted = (data.status === 'realizado' || data.status === 'finalizado') && 
          oldAppt && oldAppt.status !== 'realizado' && oldAppt.status !== 'finalizado';

        let updatedInventory = state.inventory;
        let updatedExpenses = state.supplyExpenses || [];

        if (isTransitionToCompleted && oldAppt) {
          const service = state.services.find(s => s.id === (data.serviceId || oldAppt.serviceId));
          const patient = state.patients.find(p => p.id === (data.patientId || oldAppt.patientId));
          
          // Use custom items used if provided, otherwise default to service configuration
          const itemsUsed = data.customItemCostsUsed || (service && service.itemCosts ? service.itemCosts : []);
          
          if (itemsUsed && itemsUsed.length > 0) {
            itemsUsed.forEach(ic => {
              updatedInventory = updatedInventory.map(invItem => {
                if (invItem.id === ic.itemId) {
                  const scale = invItem.unitsPerPackage && invItem.unitsPerPackage > 1 ? invItem.unitsPerPackage : 1;
                  const deducted = ic.quantity / scale;
                  const newQty = Math.max(0, parseFloat(((invItem.quantity || 0) - deducted).toFixed(4)));
                  const totalCost = ((invItem.unitCost || 0) / scale) * ic.quantity;
                  
                  updatedExpenses = [
                    {
                      id: Math.random().toString(),
                      itemId: invItem.id,
                      itemName: invItem.name,
                      quantityUsed: ic.quantity,
                      serviceName: service?.name || 'Procedimento',
                      patientName: patient?.name || 'Paciente Geral',
                      totalCost: totalCost,
                      date: format(new Date(), 'yyyy-MM-dd')
                    },
                    ...updatedExpenses
                  ];
                  
                  return { ...invItem, quantity: newQty };
                }
                return invItem;
              });
            });
          }
        }

        return { 
          appointments: updated, 
          inventory: updatedInventory,
          supplyExpenses: updatedExpenses 
        };
      }),
      removeAppointment: (id) => set((state) => ({ appointments: state.appointments.filter(a => a.id !== id) })),
      addService: (s) => set((state) => ({ services: [...state.services, { ...s, id: Math.random().toString() }] })),
      updateService: (id, data) => set((state) => ({ services: state.services.map(s => s.id === id ? { ...s, ...data } : s) })),
      removeService: (id) => set((state) => ({ services: state.services.filter(s => s.id !== id) })),
      addFinance: (f) => set((state) => ({ finance: [...state.finance, { ...f, id: Math.random().toString() }] })),
      updateFinance: (id, data) => set((state) => ({ finance: state.finance.map(f => f.id === id ? { ...f, ...data } : f) })),
      removeFinance: (id) => set((state) => ({ finance: state.finance.filter(f => f.id !== id) })),
      addBudget: (b) => set((state) => ({ budgets: [...state.budgets, { ...b, id: Math.random().toString() }] })),
      addOpportunity: (opp) => set((state) => ({ opportunities: [...state.opportunities, { ...opp, id: Math.random().toString() }] })),
      updateOpportunity: (id, opp) => set((state) => ({ opportunities: state.opportunities.map(o => o.id === id ? { ...o, ...opp } : o) })),
      addPackage: (p) => set((state) => ({ packages: [...state.packages, { ...p, id: Math.random().toString() }] })),
      updatePackage: (id, pkg) => set((state) => ({ packages: state.packages.map(p => p.id === id ? { ...p, ...pkg } : p) })),
      addProfessional: (prof) => set((state) => ({ professionals: [...state.professionals, { ...prof, active: true, id: Math.random().toString() }] })),
      updateProfessional: (id, data) => set((state) => ({ professionals: state.professionals.map(p => p.id === id ? { ...p, ...data } : p) })),
      removeProfessional: (id) => set((state) => ({ professionals: state.professionals.filter(p => p.id !== id) })),
      addMedicalRecord: (r) => set((state) => ({ medicalRecords: [{ ...r, id: Math.random().toString() }, ...state.medicalRecords] })),
      updateMedicalRecord: (id, data) => set((state) => ({ medicalRecords: state.medicalRecords.map(r => r.id === id ? { ...r, ...data } : r) })),
      removeMedicalRecord: (id) => set((state) => ({ medicalRecords: state.medicalRecords.filter(r => r.id !== id) })),
      addReminder: (rem) => set((state) => ({ reminders: [{ ...rem, id: Math.random().toString(), createdAt: new Date().toISOString() }, ...state.reminders] })),
      removeReminder: (id) => set((state) => ({ reminders: state.reminders.filter(r => r.id !== id) })),
      addInventoryItem: (item) => set((state) => ({ inventory: [...state.inventory, { ...item, id: Math.random().toString() }] })),
      updateInventoryItem: (id, data) => set((state) => ({ inventory: state.inventory.map(i => i.id === id ? { ...i, ...data } : i) })),
      removeInventoryItem: (id) => set((state) => ({ inventory: state.inventory.filter(i => i.id !== id) })),
      addSupplyExpense: (expense) => set((state) => ({ supplyExpenses: [{ ...expense, id: Math.random().toString() }, ...(state.supplyExpenses || [])] })),
      addServiceCategory: (category) => set((state) => ({ serviceCategories: state.serviceCategories.includes(category) ? state.serviceCategories : [...state.serviceCategories, category] })),
      addDocument: (d) => set((state) => ({ documents: [{ ...d, id: Math.random().toString() }, ...state.documents] })),
      removeDocument: (id) => set((state) => ({ documents: state.documents.filter(d => d.id !== id) })),
      bulkAddPatients: (ps) => set((state) => ({ patients: [...state.patients, ...ps.map(p => ({ ...p, id: Math.random().toString(), createdAt: new Date().toISOString() }))] })),
      addUser: (u) => set((state) => ({ users: [...state.users, { ...u, active: true, id: Math.random().toString() }] })),
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
            id: Math.random().toString(),
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
              id: Math.random().toString(),
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
            id: Math.random().toString(),
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
    }
  )
);
