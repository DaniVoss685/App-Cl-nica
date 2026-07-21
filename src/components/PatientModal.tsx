import React, { useState, useEffect, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from './ui/dialog';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  User, 
  FileText, 
  History, 
  DollarSign, 
  Camera, 
  MessageSquare,
  Mail,
  Phone,
  Calendar,
  Plus,
  MoreVertical,
  CheckCircle2,
  Clock,
  ExternalLink,
  Download,
  Trash2,
  ShieldAlert,
  Package,
  Sparkles,
  Loader2,
  Receipt
} from 'lucide-react';
import { useStore } from '../store';
import { format } from 'date-fns';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { cn } from '../lib/utils';
import { FinanceModal } from './FinanceModal';
import { ReceiptModal } from './ReceiptModal';
import { ClinicalRecordWorkspace } from './ClinicalRecordWorkspace';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string | null;
  onSelectPatient?: (id: string) => void;
  initialTab?: string;
}

const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

const getFormattedBirthday = (dob: string | undefined) => {
  if (!dob) return 'Não informado';
  try {
    if (dob.includes('-')) {
      const parts = dob.split('-');
      if (parts.length === 3) {
        const day = parseInt(parts[2], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        const months = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        return `${day} de ${months[monthIndex]}`;
      }
    }
    if (dob.includes('/')) {
      const parts = dob.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        const months = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        return `${day} de ${months[monthIndex]}`;
      }
    }
    return dob;
  } catch (e) {
    return dob;
  }
};

const referralOptions = [
  { value: 'Google Search', label: 'Pesquisa no Google', icon: '🔍' },
  { value: 'Instagram', label: 'Instagram / Redes', icon: '📸' },
  { value: 'Facebook', label: 'Facebook', icon: '👥' },
  { value: 'TikTok', label: 'TikTok', icon: '📹' },
  { value: 'Indicação', label: 'Indicação (Amigo/Família)', icon: '🙋‍♂️' },
  { value: 'Indicação Médica', label: 'Indicação Profissional', icon: '🩺' },
  { value: 'Fachada', label: 'Vi a Fachada', icon: '🏥' },
  { value: 'Outros', label: 'Outros meios', icon: '✨' },
];

export function PatientModal({ isOpen, onClose, patientId, onSelectPatient, initialTab }: PatientModalProps) {
  const { patients, appointments, services, professionals, addPatient, updatePatient, removePatient, medicalRecords, addMedicalRecord, finance, budgets, doctorNotes, beforeAfterPhotos, documents, removeDocument, productMode } = useStore();
  const isFinanceOnly = productMode === 'financeiro';
  const patient = patients.find(p => p.id === patientId);
  
  const patientNotes = patientId ? (doctorNotes || []).filter(n => n.patientId === patientId) : [];
  const patientPhotos = patientId ? (beforeAfterPhotos || []).filter(p => p.patientId === patientId) : [];
  
  // Cálculos dinâmicos e reais do paciente para evitar dados mocados
  const patientFinance = patient ? finance.filter(f => f.patientId === patient.id && f.type === 'receita') : [];
  const patientDocuments = patient ? (documents || []).filter(doc => doc.patientId === patient.id) : [];
  const patientFiscalDocuments = patientDocuments
    .filter(doc => doc.fiscalDocumentType === 'nota_fiscal' || doc.fiscalDocumentType === 'recibo' || doc.type === 'nota_fiscal' || doc.type === 'recibo')
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const totalPaid = patientFinance.filter(f => f.status === 'pago').reduce((sum, f) => sum + f.amount, 0);
  const totalUnpaid = patientFinance.filter(f => f.status === 'pendente').reduce((sum, f) => sum + f.amount, 0);
  const paidTransactionsCount = patientFinance.filter(f => f.status === 'pago').length;
  const ticketMedio = paidTransactionsCount > 0 ? totalPaid / paidTransactionsCount : 0;
  const activePackagesCount = patient ? budgets.filter(b => b.patientId === patient.id && b.status === 'Aprovado').length : 0;

  const getRetentionTier = (total: number) => {
    if (total >= 2000) return 'Gold';
    if (total >= 500) return 'Silver';
    if (total > 0) return 'Bronze';
    return 'Novo';
  };
  const retentionTier = getRetentionTier(totalPaid);
  
  const [newPatientData, setNewPatientData] = useState({
    name: '',
    phone: '',
    email: '',
    cpf: '',
    dateOfBirth: '',
    referralMethod: '',
    referredBy: '',
    status: 'novo' as const,
    profilePicture: '',
    observations: ''
  });

  const [editPatientData, setEditPatientData] = useState({
    name: '',
    phone: '',
    email: '',
    cpf: '',
    dateOfBirth: '',
    referralMethod: '',
    referredBy: '',
    status: 'novo' as const,
    profilePicture: '',
    observations: ''
  });

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedPatientName, setSavedPatientName] = useState('');
  const [savedPatientId, setSavedPatientId] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [clinicalSubTab, setClinicalSubTab] = useState<'evolucao' | 'rascunhos' | 'fotos'>('evolucao');
  const [fiscalDocumentPeriodMode, setFiscalDocumentPeriodMode] = useState<'todos' | 'dia' | 'mes' | 'ano'>('todos');
  const [fiscalDocumentPeriodValue, setFiscalDocumentPeriodValue] = useState('');

  const filteredPatientFiscalDocuments = useMemo(() => {
    if (fiscalDocumentPeriodMode === 'todos' || !fiscalDocumentPeriodValue) return patientFiscalDocuments;

    return patientFiscalDocuments.filter((doc) => {
      const docDate = String(doc.date || '');
      if (fiscalDocumentPeriodMode === 'dia') return docDate === fiscalDocumentPeriodValue;
      if (fiscalDocumentPeriodMode === 'mes') return docDate.startsWith(fiscalDocumentPeriodValue);
      return docDate.slice(0, 4) === fiscalDocumentPeriodValue;
    });
  }, [patientFiscalDocuments, fiscalDocumentPeriodMode, fiscalDocumentPeriodValue]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(isFinanceOnly && initialTab && !['overview', 'financial', 'docs'].includes(initialTab) ? 'overview' : (initialTab || 'overview'));
    }
  }, [isOpen, initialTab, isFinanceOnly]);

  useEffect(() => {
    if (isOpen && patient) {
      setEditPatientData({
        name: patient.name || '',
        phone: formatPhone(patient.phone || ''),
        email: patient.email || '',
        cpf: formatCPF(patient.cpf || ''),
        dateOfBirth: patient.dateOfBirth || '',
        referralMethod: patient.referralMethod || '',
        referredBy: patient.referredBy || '',
        status: (patient.status?.toLowerCase() || 'novo') as any,
        profilePicture: patient.profilePicture || '',
        observations: patient.observations || ''
      });
      setIsConfirmingDelete(false);
      setSaveSuccess(false);
    }
  }, [isOpen, patient]);

  const handleSaveEdit = () => {
    if (!patientId || !editPatientData.name) return;
    updatePatient(patientId, editPatientData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const [currentStep, setCurrentStep] = useState(1);
  const isNewPatientStep1Invalid = !newPatientData.name || !newPatientData.phone || !newPatientData.cpf || !newPatientData.dateOfBirth;

  // Reset step and data on opening the modal
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setActiveTab(isFinanceOnly && initialTab && !['overview', 'financial', 'docs'].includes(initialTab) ? 'overview' : (initialTab || 'overview'));
      if (!patientId) {
        setNewPatientData({
          name: '',
          phone: '',
          email: '',
          cpf: '',
          dateOfBirth: '',
          referralMethod: '',
          referredBy: '',
          status: 'novo',
          profilePicture: '',
          observations: ''
        });
      }
    }
  }, [isOpen, patientId]);

  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isNewInteractionModalOpen, setIsNewInteractionModalOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  const [newInteraction, setNewInteraction] = useState({
    content: '',
    type: 'evolução' as const,
    professionalId: professionals[0]?.id || ''
  });

  const isNew = !patientId;

  const compressAndSetImage = (file: File, callback: (dataUrl: string) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // Compress to high-quality JPEG
          callback(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && patientId) {
      compressAndSetImage(file, (dataUrl) => {
        updatePatient(patientId, { profilePicture: dataUrl });
      });
    }
  };

  const handleNewProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressAndSetImage(file, (dataUrl) => {
        setNewPatientData({ ...newPatientData, profilePicture: dataUrl });
      });
    }
  };

  const handleSaveNew = () => {
    if (isNewPatientStep1Invalid) return;
    const generatedId = crypto.randomUUID();
    addPatient({ ...newPatientData, id: generatedId });
    setSavedPatientId(generatedId);
    setSavedPatientName(newPatientData.name);
    setShowSuccessModal(true);
    setNewPatientData({
      name: '',
      phone: '',
      email: '',
      cpf: '',
      dateOfBirth: '',
      referralMethod: '',
      referredBy: '',
      status: 'novo',
      profilePicture: '',
      observations: ''
    });
  };

  const handleAddInteraction = () => {
    if (!patientId || !newInteraction.content) return;
    addMedicalRecord({
      patientId,
      professionalId: newInteraction.professionalId,
      content: newInteraction.content,
      type: newInteraction.type,
      date: new Date().toISOString()
    });
    setNewInteraction({ ...newInteraction, content: '' });
    setIsNewInteractionModalOpen(false);
  };

  const generateAIReport = () => {
    setIsGeneratingReport(true);
    setAiReport(null);
    
    // Simulate complex AI analysis
    setTimeout(() => {
      setAiReport(`
        ### Análise Estratégica do Paciente: ${patient?.name}
        
        **Perfil de Consumo:** Paciente de Ticket Médio Alto (Gold), com preferência por procedimentos de harmonização facial de alto valor.
        
        **Risco de Churn:** Médio. O paciente possui uma interrupção de 45 dias no histórico, mas mantém interações positivas via WhatsApp.
        
        **Oportunidade Comercial:** O paciente demonstrou interesse em tratamentos complementares de bioestimuladores durante a última consulta. Recomendamos abordagem focada em manutenção da colágeno.
        
        **Alerta Clínico:** Manter atenção à sensibilidade periorbital relatada.
      `);
      setIsGeneratingReport(false);
    }, 3000);
  };

  const patientAppts = patientId ? appointments
    .filter(a => a.patientId === patientId)
    .sort((a, b) => b.date.localeCompare(a.date)) : [];

  const patientRecords = patientId ? medicalRecords
    .filter(r => r.patientId === patientId)
    .sort((a, b) => b.date.localeCompare(a.date)) : [];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange => !onOpenChange && onClose()}>
      <DialogContent showCloseButton={true} className="max-w-none sm:max-w-none md:max-w-none lg:max-w-none xl:max-w-none w-screen h-screen m-0 rounded-none p-0 overflow-hidden bg-white border-none focus:outline-none shadow-2xl">
        {isNew ? (
          <div className="flex flex-col h-full bg-white p-6 md:p-12 overflow-y-auto no-scrollbar">
            <div className="max-w-md mx-auto w-full space-y-8">
              <div className="text-center flex flex-col items-center">
                <div className="relative w-20 h-20 mx-auto mb-3">
                  <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center overflow-hidden group shrink-0 border border-slate-100 shadow-inner">
                    {newPatientData.profilePicture ? (
                      <img 
                        src={newPatientData.profilePicture} 
                        alt="Novo Paciente" 
                        className="w-full h-full object-cover rounded-[2rem]" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <User className="w-10 h-10 text-indigo-600" />
                    )}
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <Camera className="w-5 h-5 text-white animate-in zoom-in-50 duration-205" />
                      <input 
                        id="new-patient-avatar-input"
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleNewProfilePictureUpload} 
                      />
                    </label>
                  </div>
                  <label 
                    htmlFor="new-patient-avatar-input" 
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center cursor-pointer shadow-lg border-2 border-white transition-colors animate-in zoom-in-50"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </label>
                </div>
                <label 
                  htmlFor="new-patient-avatar-input" 
                  className="inline-block text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer transition-colors mb-4"
                >
                  {newPatientData.profilePicture ? 'Alterar foto de perfil' : 'Adicionar foto de perfil'}
                </label>

                <h1 className="text-3xl font-black italic text-slate-900">Novo Paciente</h1>
                <p className="text-slate-500 font-medium mt-2">Cadastre um novo paciente no sistema para iniciar a gestão.</p>
              </div>

              {/* STEP INDICATORS */}
              <div className="flex items-center justify-center gap-2 py-2 bg-slate-50 rounded-2xl border border-slate-100/50">
                <button 
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black italic uppercase transition-all flex items-center gap-1.5",
                    currentStep === 1 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-mono not-italic">1</span>
                  Dados Básicos
                </button>
                <div className="w-4 h-0.5 bg-slate-200"></div>
                <button 
                  type="button"
                  onClick={() => {
                    if (!isNewPatientStep1Invalid) {
                      setCurrentStep(2);
                    }
                  }}
                  disabled={isNewPatientStep1Invalid}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black italic uppercase transition-all flex items-center gap-1.5 disabled:opacity-40",
                    currentStep === 2 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-650 flex items-center justify-center text-[10px] font-mono not-italic">2</span>
                  Origem & Diagnóstico
                </button>
              </div>

              {currentStep === 1 ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-200">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nome Completo *</label>
                    <input 
                      className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-505 transition-all focus:outline-none"
                      placeholder="Ex: Maria Oliveira Santos"
                      value={newPatientData.name}
                      onChange={e => setNewPatientData({...newPatientData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">WhatsApp / Telefone *</label>
                      <input 
                        className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-505 transition-all focus:outline-none"
                        placeholder="(00) 00000-0000"
                        value={newPatientData.phone}
                        onChange={e => setNewPatientData({...newPatientData, phone: formatPhone(e.target.value)})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">CPF do Paciente *</label>
                      <input 
                        className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-505 transition-all focus:outline-none"
                        placeholder="000.000.000-00"
                        value={newPatientData.cpf}
                        onChange={e => setNewPatientData({...newPatientData, cpf: formatCPF(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">E-mail</label>
                      <input 
                        className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-505 transition-all focus:outline-none"
                        placeholder="paciente@email.com"
                        value={newPatientData.email}
                        onChange={e => setNewPatientData({...newPatientData, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Data de Nascimento *</label>
                      <input 
                        type="date"
                        className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-505 transition-all focus:outline-none"
                        value={newPatientData.dateOfBirth}
                        onChange={e => setNewPatientData({...newPatientData, dateOfBirth: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                  {/* Lembrete de Origem */}
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-2.5 text-left">
                    <span className="text-base">💡</span>
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-indigo-900 italic uppercase">Lembrete Comercial</p>
                      <p className="text-[11px] text-indigo-700 font-bold leading-normal">
                        Pergunte ao paciente como ele conheceu a clínica e quem o indicou. Estes campos <strong>não são obrigatórios</strong>, mas nos ajudam a mensurar nossas campanhas.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Origem (Como nos Conheceu?)</label>
                    <div className="grid grid-cols-2 gap-3">
                      {referralOptions.map((opt) => {
                        const isSelected = newPatientData.referralMethod === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setNewPatientData({ ...newPatientData, referralMethod: opt.value })}
                            className={cn(
                              "flex items-center gap-3 p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer w-full h-14",
                              isSelected 
                                ? "bg-indigo-50/60 border-indigo-500 text-indigo-900 shadow-sm ring-1 ring-indigo-500" 
                                : "bg-slate-50 border-transparent text-slate-700 hover:bg-slate-100 hover:border-slate-200"
                            )}
                          >
                            <span className="text-xl shrink-0">{opt.icon}</span>
                            <span className="text-[11px] font-bold leading-tight">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Quem indicou / Detalhes adicionais</label>
                    <input 
                      className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-505 transition-all focus:outline-none"
                      placeholder="Ex: Dra. Juliana, indicação do João, anúncio de Harmonização..."
                      value={newPatientData.referredBy}
                      onChange={e => setNewPatientData({...newPatientData, referredBy: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Alertas Clínicos / Observações</label>
                    <Textarea 
                      className="w-full min-h-[80px] bg-slate-50 border-none rounded-2xl px-6 py-3 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-505 transition-all focus:outline-none resize-none"
                      placeholder="Ex: Alergias, restrições médicas, sensibilidade ocular..."
                      value={newPatientData.observations || ''}
                      onChange={e => setNewPatientData({...newPatientData, observations: e.target.value})}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-slate-50">
                {currentStep === 1 ? (
                  <Button 
                    variant="ghost" 
                    onClick={onClose}
                    className="flex-1 h-14 rounded-2xl font-bold text-slate-400"
                  >
                    Cancelar
                  </Button>
                ) : (
                  <Button 
                    variant="ghost" 
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 h-14 rounded-2xl font-bold text-slate-500 hover:bg-slate-50"
                  >
                    Voltar
                  </Button>
                )}

                {currentStep === 1 ? (
                  <Button 
                    onClick={() => {
                      if (!isNewPatientStep1Invalid) {
                        setCurrentStep(2);
                      }
                    }}
                    disabled={isNewPatientStep1Invalid}
                    className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black italic shadow-xl shadow-indigo-100/50 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:opacity-100 transition-all cursor-pointer"
                  >
                    Avançar
                  </Button>
                ) : (
                  <Button 
                    onClick={handleSaveNew}
                    disabled={isNewPatientStep1Invalid}
                    className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black italic shadow-xl shadow-emerald-100/50 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:opacity-100 transition-all cursor-pointer"
                  >
                    Concluir & Salvar
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : patient && (
          <div className="flex h-full flex-col lg:flex-row overflow-hidden">
            {/* Sidebar Info */}
            <div className="w-full lg:w-80 bg-white border-r border-slate-100 p-8 flex flex-col shrink-0 overflow-y-auto no-scrollbar">
              
              {/* Back Button for responsive screens inside sidebar */}
              <div className="flex items-center justify-between w-full mb-6 pb-4 border-b border-slate-100 shrink-0">
                <Button
                  id="mobile-patient-modal-back-btn"
                  onClick={onClose}
                  variant="ghost"
                  className="text-slate-500 hover:text-slate-900 font-bold text-xs flex items-center gap-1.5 p-0 hover:bg-transparent cursor-pointer"
                >
                  <span className="text-lg">←</span> Voltar à Lista
                </Button>
                <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-150 border-none font-bold text-[9px] uppercase tracking-wider">
                  Prontuário
                </Badge>
              </div>

              <div className="flex flex-col items-center text-center space-y-4 mb-8">
                <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center text-indigo-600 relative overflow-hidden group shrink-0 border border-slate-100/70 shadow-inner">
                  {patient.profilePicture ? (
                    <img 
                      src={patient.profilePicture} 
                      alt={patient.name} 
                      className="w-full h-full object-cover rounded-[2.5rem]" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-3xl font-black italic">{patient.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</span>
                  )}
                  <label className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <Camera className="w-6 h-6 text-white animate-in zoom-in-50 duration-205" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleProfilePictureUpload} 
                    />
                  </label>
                </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 italic leading-tight capitalize">{patient.name}</h2>
                <Badge variant="outline" className="mt-2 bg-indigo-50 text-indigo-700 border-none font-bold text-[10px] uppercase">
                  id: #{patient.id.slice(0, 5)}
                </Badge>
              </div>
              </div>

              <div className="space-y-6 flex-1">
                <div>
                  <p className="text-[10px] font-black text-slate-400 tracking-widest italic mb-2 uppercase">Contato</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm text-slate-600 group cursor-pointer hover:text-indigo-600 transition-colors">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="font-mono">{patient.phone || 'Não informado'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600 group cursor-pointer hover:text-indigo-600 transition-colors">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{patient.email || 'Não informado'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black text-slate-400 tracking-widest italic mb-2 uppercase">Informações Rápidas</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold uppercase">Status</span>
                      <Badge className="bg-green-100 text-green-700 border-none font-bold text-[10px] px-2 capitalize">{patient.status}</Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold uppercase">Origem</span>
                      <span className="font-bold text-slate-600 italic">
                        {referralOptions.find(o => o.value === patient.referralMethod)?.label || patient.referralMethod || 'Não informado'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold uppercase">Ticket Médio</span>
                      <span className="font-black italic text-slate-900">
                        R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold uppercase">Aniversário</span>
                      <span className="font-bold text-slate-600 italic">{getFormattedBirthday(patient.dateOfBirth)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold uppercase">Retenção</span>
                      <Badge className={cn(
                        "border-none font-bold text-[10px] px-2 uppercase",
                        retentionTier === 'Gold' && "bg-amber-100 text-amber-800",
                        retentionTier === 'Silver' && "bg-slate-100 text-slate-700",
                        retentionTier === 'Bronze' && "bg-orange-100 text-orange-800",
                        retentionTier === 'Novo' && "bg-indigo-50 text-indigo-700"
                      )}>
                        {retentionTier}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black text-slate-400 tracking-widest italic mb-2 uppercase">Tags e Segmentação</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-[9px] border-slate-200 text-slate-400">VIP</Badge>
                    <Badge variant="outline" className="text-[9px] border-slate-200 text-slate-400">Puntual</Badge>
                    <Badge variant="outline" className="text-[9px] border-slate-200 text-slate-400">Harmonização</Badge>
                  </div>
                  
                  <Button 
                    onClick={() => setActiveTab('settings')}
                    variant="outline"
                    className="w-full mt-4 border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 rounded-xl h-9 text-[10px] font-black uppercase tracking-wider italic transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-white"
                  >
                    ✏️ Editar Cadastro
                  </Button>
                </div>

                {patient.observations && patient.observations.trim() && (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      <p className="text-[10px] font-black text-amber-800 italic uppercase">Alertas Clínicos</p>
                    </div>
                    <p className="text-[11px] text-amber-700 font-bold leading-relaxed whitespace-pre-wrap">
                      {patient.observations}
                    </p>
                  </div>
                )}
              </div>

              <Button 
                onClick={generateAIReport}
                disabled={isGeneratingReport}
                className="w-full mt-6 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl font-black italic h-12 shadow-xl shadow-slate-200 uppercase transition-all flex items-center justify-center gap-2"
              >
                {isGeneratingReport ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Gerar Relatório IA
                  </>
                )}
              </Button>

              {aiReport && (
                <div className="mt-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                  <p className="text-[10px] font-black text-indigo-400 italic mb-2 uppercase flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> Relatório Executivo IA
                  </p>
                  <div className="text-[11px] text-indigo-900 font-bold leading-relaxed whitespace-pre-line prose prose-sm">
                    {aiReport}
                  </div>
                </div>
              )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
              <DialogHeader className="p-8 border-b border-white bg-white/50 flex flex-row items-center justify-between space-y-0 shrink-0">
                <div>
                  <DialogTitle className="text-[10px] font-black italic text-slate-400 tracking-[0.2em] mb-1 uppercase">
                    Painel Central do Paciente
                  </DialogTitle>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-black text-slate-900 italic leading-none">Prontuário Digital</h1>
                    <Badge className="bg-indigo-600 text-white border-none font-black italic px-2 uppercase">v4.2</Badge>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button 
                    variant="outline" 
                    className="rounded-xl h-11 px-4 border-slate-200 bg-white hover:bg-green-50/70 transition-all shadow-sm"
                    onClick={() => window.open(`https://wa.me/${patient.phone?.replace(/\D/g, '')}`, '_blank')}
                  >
                    <MessageSquare className="w-5 h-5 text-green-500" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="rounded-xl h-11 px-4 border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-sm"
                    onClick={() => {
                      const shareText = `Prontuário Stark Clinic - Paciente: ${patient.name}`;
                      navigator.clipboard.writeText(shareText);
                    }}
                  >
                    <ExternalLink className="w-5 h-5 text-slate-400" />
                  </Button>
                  <Button 
                    id="patient-modal-close-btn"
                    onClick={onClose}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-6 font-black italic transition-all tracking-wider shadow-lg shadow-indigo-100 flex items-center gap-1.5 uppercase text-xs cursor-pointer"
                  >
                    Voltar à Lista ×
                  </Button>
                </div>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <div className="px-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center shrink-0">
                  <TabsList className="h-16 bg-transparent gap-2 p-1">
                    {[
                      { id: 'overview', label: 'Resumo', icon: History },
                      ...(!isFinanceOnly ? [{ id: 'clinical', label: 'Prontuário', icon: FileText }] : []),
                      { id: 'financial', label: 'Financeiro', icon: DollarSign },
                      { id: 'docs', label: 'Documentos', icon: FileText },
                      ...(!isFinanceOnly ? [
                        { id: 'settings', label: 'Gestão', icon: User },
                      ] : []),
                    ].map(tab => (
                      <TabsTrigger 
                        key={tab.id}
                        value={tab.id}
                        className="h-10 border-none data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm rounded-xl px-5 text-[10px] font-black italic text-slate-400 transition-all gap-2 capitalize whitespace-nowrap"
                      >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {!isFinanceOnly && (
                    <Button
                      onClick={() => setIsNewInteractionModalOpen(true)}
                      className="h-10 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-[10px] shadow-lg shadow-indigo-100 flex-shrink-0 ml-4 italic uppercase px-6"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Interação
                    </Button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-8 no-scrollbar scroll-smooth">
                  <TabsContent value="overview" className="m-0 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="p-6 border-slate-100 rounded-[2rem] bg-white shadow-sm h-fit">
                        <h3 className="font-black text-slate-900 italic mb-4 flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-indigo-500" />
                          Últimos Atendimentos
                        </h3>
                        <div className="space-y-3">
                          {patientAppts.slice(0, 3).map(appt => {
                            const service = services.find(s => s.id === appt.serviceId);
                            return (
                              <div key={appt.id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between group hover:bg-slate-100 transition-colors">
                                <div className="flex items-center gap-4">
                                  <div className="p-3 bg-white rounded-xl shadow-sm">
                                    <Clock className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-sm font-black text-slate-900 italic capitalize">{service?.name}</p>
                                    <p className="text-[10px] text-slate-500 font-mono italic">
                                      {format(new Date(appt.date + 'T12:00:00'), 'dd/MM/yyyy')} às {appt.startTime}
                                    </p>
                                  </div>
                                </div>
                                <Badge className="bg-green-100 text-green-700 border-none font-bold text-[9px] italic">Realizado</Badge>
                              </div>
                            );
                          })}
                        </div>
                      </Card>

                      <Card className="p-6 border-slate-100 rounded-[2rem] bg-white shadow-sm h-fit">
                        <h3 className="font-black text-slate-900 italic mb-4 flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-emerald-500" />
                          Resumo de Conta
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-emerald-50 rounded-2xl">
                            <p className="text-[10px] font-black text-emerald-600 mb-1 uppercase">Total Pago</p>
                            <p className="text-xl font-black text-emerald-700 italic">R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                          <div className="p-4 bg-amber-50 rounded-2xl">
                            <p className="text-[10px] font-black text-amber-600 mb-1 uppercase">Débito Aberto</p>
                            <p className="text-xl font-black text-amber-700 italic">R$ {totalUnpaid.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                        <div className="mt-6 p-4 border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-indigo-600 text-white rounded-full p-1"><Package className="w-3 h-3" /></Badge>
                            <span className="text-xs font-bold text-slate-600 uppercase">Pacotes Ativos</span>
                          </div>
                          <span className="text-sm font-black italic">{activePackagesCount.toString().padStart(2, '0')}</span>
                        </div>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="clinical" className="m-0 space-y-6">
                    <ClinicalRecordWorkspace patientId={patientId} embedded initialTab="evolucoes" />
                    {false && (
                    <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      {/* Clinical Subtabs */}
                      <div className="flex gap-1 p-0.5 bg-slate-150 rounded-xl select-none max-w-sm">
                        <button 
                          onClick={() => setClinicalSubTab('evolucao')}
                          className={cn(
                            "py-1.5 px-3 text-[9px] font-black italic rounded-lg transition-all capitalize whitespace-nowrap cursor-pointer",
                            clinicalSubTab === 'evolucao' ? "bg-white text-indigo-650 shadow-sm" : "text-slate-500 hover:text-slate-800"
                          )}
                        >
                          Evoluções ({patientRecords.length})
                        </button>
                        <button 
                          onClick={() => setClinicalSubTab('rascunhos')}
                          className={cn(
                            "py-1.5 px-3 text-[9px] font-black italic rounded-lg transition-all capitalize whitespace-nowrap cursor-pointer",
                            clinicalSubTab === 'rascunhos' ? "bg-white text-indigo-650 shadow-sm" : "text-slate-500 hover:text-slate-800"
                          )}
                        >
                          Rascunhos ({patientNotes.length})
                        </button>
                        <button 
                          onClick={() => setClinicalSubTab('fotos')}
                          className={cn(
                            "py-1.5 px-3 text-[9px] font-black italic rounded-lg transition-all capitalize whitespace-nowrap cursor-pointer",
                            clinicalSubTab === 'fotos' ? "bg-white text-indigo-650 shadow-sm" : "text-slate-500 hover:text-slate-800"
                          )}
                        >
                          Antes & Depois ({patientPhotos.length})
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          onClick={() => setIsNewInteractionModalOpen(true)}
                          className="h-9 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-[10px] italic shadow-lg shadow-indigo-100"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Nova Evolução Clínica
                        </Button>
                      </div>
                    </div>

                    {clinicalSubTab === 'evolucao' && (
                      <>
                        {patientRecords.length === 0 ? (
                          <div className="py-20 text-center space-y-6">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                              <FileText className="w-10 h-10" />
                            </div>
                            <div>
                              <h3 className="text-xl font-black text-slate-900 italic">Nenhuma evolução registrada</h3>
                              <p className="text-slate-500 text-sm max-w-sm mx-auto mt-2 leading-relaxed">
                                Comece registrando o histórico clínico e evoluções deste paciente agora.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {patientRecords.map(record => {
                              const prof = professionals.find(p => p.id === record.professionalId);
                              return (
                                <Card key={record.id} className="p-6 border-slate-100 rounded-[2rem] bg-white shadow-sm">
                                  <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                        <Badge className="bg-indigo-600 text-white p-0.5 rounded-md"><FileText className="w-4 h-4" /></Badge>
                                      </div>
                                      <div>
                                        <p className="text-sm font-black text-slate-900 italic uppercase">{record.type}</p>
                                        <p className="text-[10px] text-slate-400 font-bold italic">{format(new Date(record.date), 'dd/MM/yyyy HH:mm')} • {prof?.name}</p>
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                    {record.content}
                                  </p>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}

                    {clinicalSubTab === 'rascunhos' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {patientNotes.map(note => (
                          <Card 
                            key={note.id} 
                            className={cn(
                              "p-5 rounded-[2rem] border shadow-sm relative flex flex-col justify-between min-h-[160px]",
                              note.isDraft ? "bg-amber-50/20 border-amber-200/40" : "bg-indigo-50/10 border-indigo-100/40"
                            )}
                          >
                            <div>
                              <div className="flex justify-between items-start gap-2 mb-2">
                                <span className="font-extrabold text-slate-900 italic text-[13px]">{note.title}</span>
                                <Badge className={cn(
                                  "text-[8px] font-black uppercase tracking-wider rounded-lg shrink-0 px-2 py-0.5",
                                  note.isDraft ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800"
                                )}>
                                  {note.isDraft ? 'rascunho' : 'anotação'}
                                </Badge>
                              </div>
                              <p className="text-slate-650 text-xs font-medium leading-relaxed whitespace-pre-line mb-4">
                                {note.content}
                              </p>
                            </div>
                            <div className="pt-2 border-t border-slate-100/50 flex items-center justify-between text-[9px] font-bold text-slate-400">
                              <span className="font-mono">{format(new Date(note.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                              <span className="italic">anotação médica</span>
                            </div>
                          </Card>
                        ))}

                        {patientNotes.length === 0 && (
                          <div className="col-span-full py-16 text-center text-slate-400 font-bold italic text-sm">
                            Nenhum rascunho ou anotação livre associado a este paciente.
                          </div>
                        )}
                      </div>
                    )}

                    {clinicalSubTab === 'fotos' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {patientPhotos.map(item => (
                          <Card key={item.id} className="p-4 rounded-[2rem] border border-slate-200 shadow-sm bg-white overflow-hidden flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start gap-2 mb-3">
                                <div>
                                  <h4 className="font-black text-slate-900 italic text-sm">{item.procedureName}</h4>
                                  <p className="text-[9px] text-slate-400 font-bold font-mono">{item.date}</p>
                                </div>
                              </div>

                              <div className="relative h-44 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center select-none">
                                <div className="absolute inset-0 grid grid-cols-2 divide-x divide-white">
                                  <div className="relative w-full h-full overflow-hidden">
                                    <img src={item.beforePhotoUrl} alt="Antes" className="absolute inset-0 w-full h-full object-cover" />
                                    <span className="absolute bottom-2 left-2 bg-black/60 text-white font-black text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded z-10">Antes</span>
                                  </div>
                                  <div className="relative w-full h-full overflow-hidden">
                                    <img src={item.afterPhotoUrl} alt="Depois" className="absolute inset-0 w-full h-full object-cover" />
                                    <span className="absolute bottom-2 right-2 bg-indigo-600/90 text-white font-black text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded z-10">Depois</span>
                                  </div>
                                </div>
                              </div>

                              {item.notes && (
                                <p className="text-[10px] text-slate-500 font-medium italic mt-2.5 leading-relaxed bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                                  {item.notes}
                                </p>
                              )}
                            </div>
                          </Card>
                        ))}

                        {patientPhotos.length === 0 && (
                          <div className="col-span-full py-16 text-center text-slate-400 font-bold italic text-sm">
                            Nenhuma foto comparativa cadastrada para este paciente.
                          </div>
                        )}
                      </div>
                    )}
                    </>
                    )}
                  </TabsContent>

                  <TabsContent value="financial" className="m-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-slate-900 italic">Histórico de Cobranças</h3>
                        <div className="flex items-center gap-2">
                          <Button 
                            onClick={() => setIsReceiptModalOpen(true)}
                            className="h-9 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-[10px] italic shadow-lg shadow-indigo-100 flex items-center gap-1.5"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            Emitir Recibo
                          </Button>
                          <Button 
                            onClick={() => setIsFinanceModalOpen(true)}
                            className="h-9 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-[10px] italic shadow-lg shadow-emerald-100"
                          >
                            Lançar Pagamento
                          </Button>
                        </div>
                      </div>

                      {patientFinance.length === 0 ? (
                        <div className="py-20 text-center space-y-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
                            <DollarSign className="w-10 h-10 text-slate-300" />
                          </div>
                          <div>
                            <h3 className="text-base font-black text-slate-900 italic">Nenhum registro financeiro</h3>
                            <p className="text-slate-400 text-xs max-w-xs mx-auto mt-1 font-medium leading-relaxed">
                              Não há nenhuma cobrança registrada para este paciente ainda.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {patientFinance.map(trans => (
                            <div key={trans.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-emerald-200 transition-all group shadow-sm">
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                  trans.status === 'pago' ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500"
                                )}>
                                  <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                  <p className="text-sm font-black text-slate-900 italic capitalize">
                                    {trans.description || trans.category || 'Cobrança'}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                                    {trans.paymentMethod ? `Pagamento via ${trans.paymentMethod}` : 'Método não informado'} • ID: {trans.id.slice(0, 8)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-black text-slate-900 italic">
                                  R$ {trans.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <div className="flex items-center gap-2.5 justify-end mt-0.5">
                                  <span className={cn(
                                    "text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider",
                                    trans.status === 'pago' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                  )}>
                                    {trans.status}
                                  </span>
                                  <p className="text-[10px] text-slate-500 font-bold italic uppercase">
                                    {trans.paymentDate 
                                      ? format(new Date(trans.paymentDate + 'T12:00:00'), 'dd/MM/yyyy') 
                                      : format(new Date(trans.dueDate + 'T12:00:00'), 'dd/MM/yyyy')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="docs" className="m-0 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black italic text-slate-950">Documentos fiscais</h3>
                        <p className="text-[11px] font-bold text-slate-500">Notas fiscais e recibos anexados nos lançamentos de receita.</p>
                      </div>
                      <Badge className="w-fit border-none bg-indigo-50 text-indigo-700 font-black">
                        {filteredPatientFiscalDocuments.length} arquivo{filteredPatientFiscalDocuments.length === 1 ? '' : 's'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-150 bg-white p-3 sm:grid-cols-[180px_1fr_auto]">
                      <select
                        value={fiscalDocumentPeriodMode}
                        onChange={event => {
                          setFiscalDocumentPeriodMode(event.target.value as any);
                          setFiscalDocumentPeriodValue('');
                        }}
                        className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="todos">Todo periodo</option>
                        <option value="dia">Filtrar por dia</option>
                        <option value="mes">Filtrar por mes</option>
                        <option value="ano">Filtrar por ano</option>
                      </select>
                      <Input
                        type={fiscalDocumentPeriodMode === 'dia' ? 'date' : fiscalDocumentPeriodMode === 'mes' ? 'month' : fiscalDocumentPeriodMode === 'ano' ? 'number' : 'text'}
                        value={fiscalDocumentPeriodValue}
                        min={fiscalDocumentPeriodMode === 'ano' ? '1900' : undefined}
                        max={fiscalDocumentPeriodMode === 'ano' ? '2100' : undefined}
                        disabled={fiscalDocumentPeriodMode === 'todos'}
                        onChange={event => setFiscalDocumentPeriodValue(event.target.value)}
                        placeholder={fiscalDocumentPeriodMode === 'ano' ? '2026' : 'Selecione o periodo'}
                        className="h-10 rounded-xl text-xs font-bold disabled:bg-slate-100"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-xl text-xs font-bold"
                        onClick={() => {
                          setFiscalDocumentPeriodMode('todos');
                          setFiscalDocumentPeriodValue('');
                        }}
                      >
                        Limpar
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {filteredPatientFiscalDocuments.map(doc => {
                        const typeLabel = doc.fiscalDocumentType === 'nota_fiscal' || doc.type === 'nota_fiscal' ? 'Nota fiscal' : 'Recibo';
                        return (
                          <div key={doc.id} className="rounded-2xl border border-slate-150 bg-white p-4 shadow-sm">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                              <div className="min-w-0 flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                                  <FileText className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-black text-slate-950">{doc.name}</p>
                                  <p className="mt-1 text-[10px] font-bold text-slate-500">
                                    {typeLabel}
                                    {doc.fiscalDocumentNumber ? ` · Nº ${doc.fiscalDocumentNumber}` : ''}
                                    {doc.amount ? ` · R$ ${doc.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                                  </p>
                                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    {doc.date ? format(new Date(doc.date + 'T12:00:00'), 'dd/MM/yyyy') : 'Sem data'} · {doc.category || 'Receita'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {doc.url && (
                                  <>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-9 rounded-xl text-xs font-bold"
                                      onClick={() => window.open(doc.url, '_blank')}
                                    >
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      Abrir
                                    </Button>
                                    <a
                                      href={doc.url}
                                      download={`${doc.name}.pdf`}
                                      className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                    >
                                      <Download className="mr-2 h-4 w-4" />
                                      Baixar
                                    </a>
                                  </>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-9 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50"
                                  onClick={() => removeDocument(doc.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {filteredPatientFiscalDocuments.length === 0 && (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
                          <FileText className="mx-auto h-10 w-10 text-slate-300" />
                          <p className="mt-3 text-sm font-black italic text-slate-800">Nenhum documento fiscal anexado</p>
                          <p className="mx-auto mt-1 max-w-md text-xs font-bold text-slate-400">
                            Ao lançar uma nova receita com nota fiscal ou recibo, anexe o PDF para ele aparecer automaticamente aqui.
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="settings" className="m-0 space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      
                      {/* CARD 1: EDIT FORM */}
                      <Card className="p-6 border-slate-150 bg-white rounded-[2rem] shadow-sm space-y-6">
                        <div>
                          <h4 className="font-black italic text-slate-900 text-lg flex items-center gap-2">
                            <span className="p-2 bg-indigo-50 rounded-xl text-indigo-600">✍️</span>
                            Informações Cadastrais do Paciente
                          </h4>
                          <p className="text-slate-400 text-[11px] font-black uppercase mt-1">Atualize os campos primários de identificação e contato do prontuário</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nome Completo</label>
                            <input 
                              className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-505 focus:outline-none"
                              value={editPatientData.name}
                              onChange={e => setEditPatientData({...editPatientData, name: e.target.value})}
                              required
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">WhatsApp / Telefone</label>
                            <input 
                              className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-505 focus:outline-none"
                              value={editPatientData.phone}
                              onChange={e => setEditPatientData({...editPatientData, phone: formatPhone(e.target.value)})}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">E-mail</label>
                            <input 
                              className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-505 focus:outline-none"
                              value={editPatientData.email}
                              onChange={e => setEditPatientData({...editPatientData, email: e.target.value})}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">CPF do Paciente</label>
                            <input 
                              className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-505 focus:outline-none"
                              value={editPatientData.cpf}
                              onChange={e => setEditPatientData({...editPatientData, cpf: formatCPF(e.target.value)})}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Data de Nascimento</label>
                            <input 
                              type="date"
                              className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-505 focus:outline-none"
                              value={editPatientData.dateOfBirth}
                              onChange={e => setEditPatientData({...editPatientData, dateOfBirth: e.target.value})}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Status de Tratamento</label>
                            <Select 
                              value={editPatientData.status} 
                              onValueChange={(v: any) => setEditPatientData({...editPatientData, status: v})}
                            >
                              <SelectTrigger className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-505 focus:outline-none cursor-pointer capitalize">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="novo" className="font-bold capitalize">Novo</SelectItem>
                                <SelectItem value="em tratamento" className="font-bold capitalize">Em Tratamento</SelectItem>
                                <SelectItem value="em acompanhamento" className="font-bold capitalize">Em Acompanhamento</SelectItem>
                                <SelectItem value="inativo" className="font-bold capitalize">Inativo</SelectItem>
                                <SelectItem value="finalizado" className="font-bold capitalize">Finalizado</SelectItem>
                                <SelectItem value="em atraso" className="font-bold capitalize">Em Atraso</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Origem do Paciente</label>
                            <Select 
                              value={editPatientData.referralMethod || "none"} 
                              onValueChange={(v: any) => setEditPatientData({...editPatientData, referralMethod: v === "none" ? "" : v})}
                            >
                              <SelectTrigger className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-505 focus:outline-none cursor-pointer">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none" className="font-bold">Selecione...</SelectItem>
                                <SelectItem value="Google Search" className="font-bold">🔍 Pesquisa no Google</SelectItem>
                                <SelectItem value="Instagram" className="font-bold">📸 Instagram / Redes Sociais</SelectItem>
                                <SelectItem value="Facebook" className="font-bold">👥 Facebook</SelectItem>
                                <SelectItem value="TikTok" className="font-bold">📹 TikTok</SelectItem>
                                <SelectItem value="Indicação" className="font-bold">🙋‍♂️ Indicação de Amigo ou Familiar</SelectItem>
                                <SelectItem value="Indicação Médica" className="font-bold">🩺 Indicação de outro profissional</SelectItem>
                                <SelectItem value="Fachada" className="font-bold">🏥 Vi a Fachada / Passei em frente</SelectItem>
                                <SelectItem value="Outros" className="font-bold">✨ Outros meios</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Quem Indicou / Detalhes</label>
                            <input 
                              className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-505 focus:outline-none"
                              value={editPatientData.referredBy}
                              onChange={e => setEditPatientData({...editPatientData, referredBy: e.target.value})}
                              placeholder="Juliana, João"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Alertas Clínicos / Observações</label>
                          <Textarea 
                            className="w-full min-h-[80px] bg-slate-50 border-none rounded-xl px-4 py-3 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-505 focus:outline-none resize-none"
                            value={editPatientData.observations || ''}
                            onChange={e => setEditPatientData({...editPatientData, observations: e.target.value})}
                            placeholder="Ex: Alergias, restrições médicas, observações clínicas..."
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-105">
                          {saveSuccess ? (
                            <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Alterações salvas com sucesso!
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px] italic">Campos editáveis atualizarão instantaneamente o prontuário de {patient?.name}.</span>
                          )}
                          <Button 
                            type="button"
                            onClick={handleSaveEdit}
                            className="bg-indigo-650 hover:bg-indigo-700 text-white font-black italic rounded-xl px-6 h-11 transition-all"
                          >
                            Salvar Alterações
                          </Button>
                        </div>
                      </Card>

                      {/* CARD 2: DANGER ZONE (DELETE) */}
                      <Card className="p-6 border border-rose-100 bg-rose-50/10 rounded-[2rem] space-y-4">
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-xl bg-rose-550/10 text-rose-600 flex items-center justify-center shrink-0">
                            <ShieldAlert className="w-5 h-5 text-rose-650" />
                          </div>
                          <div>
                            <h4 className="font-black italic text-rose-950 text-base leading-none">Zona de Risco: Excluir Paciente</h4>
                            <p className="text-[9px] text-rose-700 font-black uppercase tracking-wider mt-1">Exclua permanentemente os prontuários, evoluções e históricos de faturamento</p>
                          </div>
                        </div>
                        
                        <p className="text-xs text-slate-510 leading-normal font-medium">
                          Ao excluir este paciente, todos os registros clínicos relacionados em nosso banco de dados local serão destruídos definitivamente de forma instantânea. Confirme com absoluta certeza desta ação.
                        </p>

                        {!isConfirmingDelete ? (
                          <Button 
                            type="button"
                            onClick={() => setIsConfirmingDelete(true)}
                            className="bg-rose-655 hover:bg-rose-700 text-white font-black italic rounded-xl px-6 h-11"
                          >
                            Excluir Paciente permanentemente
                          </Button>
                        ) : (
                          <div className="p-4 bg-white border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in zoom-in-95 duration-200">
                            <div>
                              <p className="text-xs font-black text-rose-900 italic">Você tem certeza absoluta?</p>
                              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Essa operação removerá permanentemente o paciente {patient?.name}.</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsConfirmingDelete(false)}
                                className="h-10 rounded-xl text-slate-500 font-bold text-xs"
                              >
                                Não, Cancelar
                              </Button>
                              <Button
                                type="button"
                                onClick={() => {
                                  removePatient(patient!.id);
                                  onClose();
                                }}
                                className="bg-rose-605 hover:bg-rose-700 text-white font-black italic rounded-xl px-5 h-10 text-xs"
                              >
                                Sim, Excluir Paciente
                              </Button>
                            </div>
                          </div>
                        )}
                      </Card>

                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
      
      {/* Finance Modal Integration */}
      <FinanceModal 
        open={isFinanceModalOpen}
        onOpenChange={setIsFinanceModalOpen}
        transactionId={null}
        initialPatientId={patientId}
      />

      {/* New Interaction Dialog */}
      <Dialog open={isNewInteractionModalOpen} onOpenChange={setIsNewInteractionModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-[2rem] p-8 border-none shadow-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 italic flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Plus className="w-6 h-6 text-indigo-600" />
              </div>
              Nova Evolução Clínica
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tipo de Registro</label>
              <Select value={newInteraction.type} onValueChange={(v: any) => setNewInteraction({...newInteraction, type: v})}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold italic">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="evolução" className="font-bold italic">Evolução Clínica</SelectItem>
                  <SelectItem value="avaliação" className="font-bold italic">Avaliação Inicial</SelectItem>
                  <SelectItem value="prescrição" className="font-bold italic">Prescrição</SelectItem>
                  <SelectItem value="exame" className="font-bold italic">Resultado de Exame</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Profissional</label>
              <Select value={newInteraction.professionalId || 'none'} onValueChange={(v) => setNewInteraction({...newInteraction, professionalId: v})}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold italic">
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="font-bold italic">Selecione...</SelectItem>
                  {professionals.filter(p => p.tipoMembro !== 'gestao').map(p => <SelectItem key={p.id} value={p.id} className="font-bold italic">{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Conteúdo da Evolução</label>
              <Textarea 
                className="min-h-[150px] rounded-2xl bg-slate-50 border-none font-medium italic p-4 focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                placeholder="Descreva aqui os detalhes clínicos..."
                value={newInteraction.content}
                onChange={e => setNewInteraction({...newInteraction, content: e.target.value})}
              />
            </div>

            <Button 
              onClick={handleAddInteraction}
              disabled={!newInteraction.content || !newInteraction.professionalId || newInteraction.professionalId === 'none'}
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black italic rounded-2xl shadow-xl shadow-indigo-100 mt-4 uppercase"
            >
              Salvar Evolução
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md bg-white rounded-[2.5rem] p-8 border-none shadow-2xl overflow-hidden text-center flex flex-col items-center animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-600 mb-6 shadow-inner animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 italic mb-2 tracking-tight">
            Cadastro Concluído!
          </h3>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            O prontuário digital do paciente <strong className="text-slate-900 capitalize font-extrabold">{savedPatientName}</strong> foi criado com sucesso no sistema.
          </p>
          <div className="flex flex-col gap-3 w-full">
            <Button 
              onClick={() => {
                setShowSuccessModal(false);
                if (onSelectPatient) {
                  onSelectPatient(savedPatientId);
                } else {
                  onClose();
                }
              }}
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black italic rounded-2xl shadow-xl shadow-indigo-100/50 uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Ver Prontuário
            </Button>
            <Button 
              variant="ghost"
              onClick={() => {
                setShowSuccessModal(false);
                onClose();
              }}
              className="w-full h-14 rounded-2xl font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ReceiptModal 
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        initialPatientId={patientId || undefined}
      />
    </>
  );
}
