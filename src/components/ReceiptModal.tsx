import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../store';
import { ReceiptData, Patient, Appointment, FinancialTransaction } from '../types';
import { numberToWordsBRL } from '../lib/numberToWords';
import { ReceiptPrintView } from './ReceiptPrintView';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { 
  Receipt, 
  User, 
  Calendar, 
  DollarSign, 
  Building, 
  Sparkles, 
  Printer, 
  CheckCircle2, 
  FileText, 
  ArrowLeft,
  Search,
  Zap,
  CreditCard,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Copy,
  Plus,
  Stethoscope,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPatientId?: string;
  initialAppointmentId?: string;
  initialTransactionId?: string;
  initialAmount?: number;
  initialDescription?: string;
  initialDate?: string;
  initialPaymentMethod?: string;
  initialStep?: 'form' | 'print';
  initialReceipt?: ReceiptData;
}

const PAYMENT_METHODS = [
  { id: 'pix', label: 'Pix', icon: Zap, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', desc: 'Transferência instantânea Pix' },
  { id: 'dinheiro', label: 'Dinheiro', icon: DollarSign, color: 'text-green-600 bg-green-50 border-green-200', desc: 'Pagamento em espécie' },
  { id: 'cartão de crédito', label: 'Cartão de Crédito', icon: CreditCard, color: 'text-indigo-600 bg-indigo-50 border-indigo-200', desc: 'Crédito à vista ou parcelado' },
  { id: 'cartão de débito', label: 'Cartão de Débito', icon: CreditCard, color: 'text-sky-600 bg-sky-50 border-sky-200', desc: 'Débito em conta' },
  { id: 'transferência', label: 'Transferência Bancária', icon: Building2, color: 'text-purple-600 bg-purple-50 border-purple-200', desc: 'TED / DOC / Depósito' },
  { id: 'boleto', label: 'Boleto Bancário', icon: FileText, color: 'text-amber-600 bg-amber-50 border-amber-200', desc: 'Boleto de cobrança' },
];

function formatNumberBRL(value: number): string {
  if (value === undefined || value === null || isNaN(value)) return '';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseBRLToNumber(formattedStr: string): number {
  if (!formattedStr) return 0;
  const digitsOnly = formattedStr.replace(/\D/g, '');
  if (!digitsOnly) return 0;
  return parseFloat(digitsOnly) / 100;
}

export function ReceiptModal({
  isOpen,
  onClose,
  initialPatientId,
  initialAppointmentId,
  initialTransactionId,
  initialAmount,
  initialDescription,
  initialDate,
  initialPaymentMethod,
  initialStep,
  initialReceipt
}: ReceiptModalProps) {
  const { 
    patients, 
    appointments, 
    finance, 
    services,
    clinicName,
    clinicRazaoSocial,
    clinicCnpj,
    clinicPhone,
    clinicAddress,
    clinicProfessionalName,
    clinicProfessionalCpf,
    clinicProfessionalRegistro,
    clinicProfessionalSignature,
    receiptNextNumber,
    createReceipt
  } = useStore();

  const [step, setStep] = useState<'form' | 'print'>('form');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId || '');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(initialAppointmentId || '');
  const [selectedTransactionId, setSelectedTransactionId] = useState(initialTransactionId || '');

  // Form states
  const [amount, setAmount] = useState<number>(initialAmount || 0);
  const [formattedAmountStr, setFormattedAmountStr] = useState<string>(initialAmount ? formatNumberBRL(initialAmount) : '');
  const [paymentMethod, setPaymentMethod] = useState<string>(initialPaymentMethod || 'pix');
  const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false);
  
  const [date, setDate] = useState<string>(initialDate || new Date().toISOString().split('T')[0]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());
  
  const [description, setDescription] = useState<string>(initialDescription || '');
  const [observations, setObservations] = useState<string>('');

  const [isApptDropdownOpen, setIsApptDropdownOpen] = useState(false);
  const [isTxDropdownOpen, setIsTxDropdownOpen] = useState(false);

  const closeAllDropdowns = () => {
    setIsPatientDropdownOpen(false);
    setIsPaymentDropdownOpen(false);
    setIsCalendarOpen(false);
    setIsApptDropdownOpen(false);
    setIsTxDropdownOpen(false);
  };

  const togglePaymentDropdown = () => {
    setIsPaymentDropdownOpen(prev => {
      if (!prev) {
        setIsCalendarOpen(false);
        setIsApptDropdownOpen(false);
        setIsTxDropdownOpen(false);
        setIsPatientDropdownOpen(false);
      }
      return !prev;
    });
  };

  const toggleCalendar = () => {
    setIsCalendarOpen(prev => {
      if (!prev) {
        setIsPaymentDropdownOpen(false);
        setIsApptDropdownOpen(false);
        setIsTxDropdownOpen(false);
        setIsPatientDropdownOpen(false);
      }
      return !prev;
    });
  };

  const toggleApptDropdown = () => {
    setIsApptDropdownOpen(prev => {
      if (!prev) {
        setIsTxDropdownOpen(false);
        setIsPaymentDropdownOpen(false);
        setIsCalendarOpen(false);
        setIsPatientDropdownOpen(false);
      }
      return !prev;
    });
  };

  const toggleTxDropdown = () => {
    setIsTxDropdownOpen(prev => {
      if (!prev) {
        setIsApptDropdownOpen(false);
        setIsPaymentDropdownOpen(false);
        setIsCalendarOpen(false);
        setIsPatientDropdownOpen(false);
      }
      return !prev;
    });
  };

  const anyDropdownOpen = isPatientDropdownOpen || isPaymentDropdownOpen || isCalendarOpen || isApptDropdownOpen || isTxDropdownOpen;
  
  // Clinic & Professional overrides
  const [localClinicName, setLocalClinicName] = useState(clinicName || '');
  const [localClinicRazaoSocial, setLocalClinicRazaoSocial] = useState(clinicRazaoSocial || '');
  const [localClinicCnpj, setLocalClinicCnpj] = useState(clinicCnpj || '');
  const [localClinicPhone, setLocalClinicPhone] = useState(clinicPhone || '');
  const [localClinicAddress, setLocalClinicAddress] = useState(clinicAddress || '');
  const [localProfName, setLocalProfName] = useState(clinicProfessionalName || '');
  const [localProfCpf, setLocalProfCpf] = useState(clinicProfessionalCpf || '');
  const [localProfRegistro, setLocalProfRegistro] = useState(clinicProfessionalRegistro || '');

  const [generatedReceipt, setGeneratedReceipt] = useState<ReceiptData | null>(null);

  // Sync clinic profile defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalClinicName(clinicName || '');
      setLocalClinicRazaoSocial(clinicRazaoSocial || '');
      setLocalClinicCnpj(clinicCnpj || '');
      setLocalClinicPhone(clinicPhone || '');
      setLocalClinicAddress(clinicAddress || '');
      setLocalProfName(clinicProfessionalName || '');
      setLocalProfCpf(clinicProfessionalCpf || '');
      setLocalProfRegistro(clinicProfessionalRegistro || '');
      setShowSuccessModal(false);

      if (initialStep === 'print' && initialReceipt) {
        setStep('print');
        setGeneratedReceipt(initialReceipt);
      } else {
        setStep('form');
      }
    }
  }, [isOpen, initialStep, initialReceipt, clinicName, clinicRazaoSocial, clinicCnpj, clinicPhone, clinicAddress, clinicProfessionalName, clinicProfessionalCpf, clinicProfessionalRegistro]);

  // Set initial props when passed
  useEffect(() => {
    if (initialPatientId) setSelectedPatientId(initialPatientId);
    if (initialAppointmentId) setSelectedAppointmentId(initialAppointmentId);
    if (initialTransactionId) setSelectedTransactionId(initialTransactionId);
    if (initialAmount !== undefined) {
      setAmount(initialAmount);
      setFormattedAmountStr(formatNumberBRL(initialAmount));
    }
    if (initialDescription) setDescription(initialDescription);
    if (initialDate) setDate(initialDate);
    if (initialPaymentMethod) setPaymentMethod(initialPaymentMethod);
  }, [initialPatientId, initialAppointmentId, initialTransactionId, initialAmount, initialDescription, initialDate, initialPaymentMethod]);

  // Handle Amount Mask Change
  const handleAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const numericVal = parseBRLToNumber(rawVal);
    setAmount(numericVal);
    setFormattedAmountStr(numericVal > 0 ? formatNumberBRL(numericVal) : '');
  };

  // Filtered patients for search dropdown
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients;
    const q = patientSearch.toLowerCase();
    return patients.filter(p => p.name.toLowerCase().includes(q) || (p.cpf && p.cpf.includes(q)));
  }, [patients, patientSearch]);

  const selectedPatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId);
  }, [patients, selectedPatientId]);

  // Recent procedures/appointments for the selected patient
  const patientAppointments = useMemo(() => {
    if (!selectedPatientId) return [];
    return appointments
      .filter(a => a.patientId === selectedPatientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [appointments, selectedPatientId]);

  // Recent financial transactions (revenues) for the selected patient
  const patientTransactions = useMemo(() => {
    if (!selectedPatientId) return [];
    return finance
      .filter(f => f.patientId === selectedPatientId && f.type === 'receita')
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
      .slice(0, 10);
  }, [finance, selectedPatientId]);

  // Auto-fill when selecting a patient
  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setIsPatientDropdownOpen(false);
    const pat = patients.find(p => p.id === patientId);
    if (pat) {
      const latestAppt = appointments.find(a => a.patientId === patientId && (a.status === 'realizado' || a.status === 'finalizado' || a.status === 'confirmado'));
      if (latestAppt && !amount) {
        handleSelectAppointment(latestAppt);
      }
    }
  };

  // Auto-fill when selecting an appointment/procedure
  const handleSelectAppointment = (appt: Appointment) => {
    setSelectedAppointmentId(appt.id);
    setAmount(appt.value || 0);
    setFormattedAmountStr(formatNumberBRL(appt.value || 0));
    if (appt.date) setDate(appt.date);
    if (appt.paymentMethod) setPaymentMethod(appt.paymentMethod);

    const serviceName = services.find(s => s.id === appt.serviceId)?.name || 'Procedimento estético/médico';
    const apptDateStr = appt.date ? new Date(appt.date + 'T12:00:00').toLocaleDateString('pt-BR') : '';
    setDescription(`Referente a ${serviceName} realizado em ${apptDateStr}.`);
  };

  // Auto-fill when selecting a financial transaction
  const handleSelectTransaction = (tx: FinancialTransaction) => {
    setSelectedTransactionId(tx.id);
    setAmount(tx.amount || 0);
    setFormattedAmountStr(formatNumberBRL(tx.amount || 0));
    if (tx.paymentDate || tx.dueDate) setDate(tx.paymentDate || tx.dueDate);
    if (tx.paymentMethod) setPaymentMethod(tx.paymentMethod);
    if (tx.description) setDescription(tx.description);
  };

  const generateReceiptData = (): ReceiptData | null => {
    if (!selectedPatient) {
      toast.error('Selecione um paciente para emitir o recibo.');
      return null;
    }
    if (!amount || amount <= 0) {
      toast.error('Informe um valor válido maior que zero.');
      return null;
    }

    const nextNum = receiptNextNumber || 1226;
    const receiptNum = `${new Date().getFullYear()}/${nextNum}`;

    return {
      number: receiptNum,
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      patientCpf: selectedPatient.cpf,
      patientPhone: selectedPatient.phone,
      patientAddress: selectedPatient.address || (selectedPatient.observations?.includes('Endereço') ? selectedPatient.observations : undefined),
      amount: amount,
      amountInWords: numberToWordsBRL(amount),
      paymentMethod: paymentMethod,
      date: date,
      description: description || 'Serviços de saúde / procedimentos estéticos prestados.',
      observations: observations,
      appointmentId: selectedAppointmentId || undefined,
      financialTransactionId: selectedTransactionId || undefined,
      professionalName: localProfName,
      professionalCpf: localProfCpf,
      professionalRegistro: localProfRegistro,
      professionalSignature: clinicProfessionalSignature,
      clinicName: localClinicName,
      clinicRazaoSocial: localClinicRazaoSocial,
      clinicCnpj: localClinicCnpj,
      clinicPhone: localClinicPhone,
      clinicAddress: localClinicAddress
    };
  };

  const handleEmitAndPrint = () => {
    const data = generateReceiptData();
    if (!data) return;

    createReceipt(data);
    setGeneratedReceipt(data);
    setShowSuccessModal(true);
  };

  const handleSaveOnly = () => {
    const data = generateReceiptData();
    if (!data) return;

    createReceipt(data);
    setGeneratedReceipt(data);
    setShowSuccessModal(true);
  };

  // Calendar Picker Helpers
  const year = calendarViewDate.getFullYear();
  const month = calendarViewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => setCalendarViewDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCalendarViewDate(new Date(year, month + 1, 1));

  const handleSelectDay = (day: number) => {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const selectedDateStr = `${year}-${monthStr}-${dayStr}`;
    setDate(selectedDateStr);
    setIsCalendarOpen(false);
  };

  const formattedSelectedDate = useMemo(() => {
    if (!date) return 'Selecione a data';
    const [y, m, d] = date.split('-').map(Number);
    if (!y || !m || !d) return date;
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }, [date]);

  const selectedPaymentConfig = PAYMENT_METHODS.find(p => p.id === paymentMethod) || PAYMENT_METHODS[0];
  const PaymentIcon = selectedPaymentConfig.icon;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
        <DialogContent showCloseButton={step !== 'print'} className="w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[92vh] overflow-y-auto p-6 md:p-8 bg-white rounded-3xl shadow-2xl border border-slate-100 font-sans space-y-6">
          {anyDropdownOpen && (
            <div className="fixed inset-0 z-40 bg-transparent" onClick={closeAllDropdowns} />
          )}
          {step === 'form' && (
            <DialogHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
                      Emissão de Recibo Oficial para Paciente
                    </DialogTitle>
                    <DialogDescription className="text-xs font-semibold text-slate-500 mt-0.5">
                      Preencha os dados do cliente, valor, pagamento e emissor com total controle.
                    </DialogDescription>
                  </div>
                </div>
              </div>
            </DialogHeader>
          )}

          {step === 'print' && generatedReceipt ? (
            <ReceiptPrintView receipt={generatedReceipt} onClose={onClose} />
          ) : (
            <div className="space-y-6 pt-1">
              {/* BLOCO 1: SELEÇÃO PREMIUM DE PACIENTE */}
              <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                    <User className="w-4 h-4 text-indigo-600" /> 1. Paciente Cadastrado
                  </Label>
                  {selectedPatient && (
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100/80 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                      <Check className="w-3.5 h-3.5" /> Paciente Selecionado
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Busca e Dropdown Customizado de Pacientes */}
                  <div className="relative">
                    <Label className="text-xs font-bold text-slate-600 mb-1.5 block">Buscar Paciente</Label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <Input 
                        placeholder="Buscar por nome ou CPF..." 
                        value={patientSearch} 
                        onChange={e => {
                          setPatientSearch(e.target.value);
                          setIsPatientDropdownOpen(true);
                        }} 
                        onFocus={() => setIsPatientDropdownOpen(true)}
                        className="pl-10 h-10 text-xs font-bold border-slate-300 rounded-xl bg-white shadow-2xs focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {isPatientDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto p-1.5 space-y-1">
                        {filteredPatients.length === 0 ? (
                          <div className="p-3 text-xs text-slate-400 font-bold italic text-center">Nenhum paciente encontrado.</div>
                        ) : (
                          filteredPatients.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSelectPatient(p.id)}
                              className="w-full text-left p-2.5 hover:bg-indigo-50 rounded-xl transition-all flex items-center justify-between group"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 bg-indigo-100 text-indigo-700 font-black text-xs rounded-lg flex items-center justify-center uppercase">
                                  {p.name.slice(0, 2)}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-800 text-xs block group-hover:text-indigo-900">{p.name}</span>
                                  {p.cpf && <span className="text-[10px] text-slate-400 font-mono">CPF: {p.cpf}</span>}
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100">Selecionar →</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Detalhes do Paciente Selecionado */}
                  <div>
                    <Label className="text-xs font-bold text-slate-600 mb-1.5 block">Dados do Cliente</Label>
                    {selectedPatient ? (
                      <div className="bg-white p-3 rounded-xl border border-slate-200/90 text-xs grid grid-cols-2 gap-2 shadow-2xs">
                        <div>
                          <span className="text-slate-400 font-bold text-[10px] uppercase block">Nome Completo</span>
                          <span className="font-bold text-slate-900 truncate block">{selectedPatient.name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold text-[10px] uppercase block">CPF</span>
                          <span className="font-bold text-slate-800 block">{selectedPatient.cpf || 'Não informado'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold text-[10px] uppercase block">Telefone</span>
                          <span className="font-bold text-slate-800 block">{selectedPatient.phone || 'Não informado'}</span>
                        </div>
                        <div className="flex items-end justify-end">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedPatientId('');
                              setPatientSearch('');
                            }}
                            className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 h-7 px-2"
                          >
                            Trocar Paciente
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white/80 p-3 rounded-xl border border-dashed border-slate-300 text-xs text-slate-400 font-semibold italic text-center h-10 flex items-center justify-center">
                        Selecione um paciente na busca ao lado.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* BLOCO 2: VINCULAR PROCEDIMENTO OU LANÇAMENTO RECENTE */}
              {selectedPatientId && (patientAppointments.length > 0 || patientTransactions.length > 0) && (
                <div className="bg-indigo-50/60 border border-indigo-150 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-black text-indigo-950 flex items-center gap-2 uppercase tracking-wide">
                      <Sparkles className="w-4 h-4 text-indigo-600" /> 2. Vincular a Procedimento ou Lançamento Recente (Opcional)
                    </Label>
                    {(selectedAppointmentId || selectedTransactionId) && (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/90 border border-indigo-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Vínculo Ativo
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Seletor Customizado Premium de Atendimentos / Sessões */}
                    {patientAppointments.length > 0 && (
                      <div className="space-y-1 relative">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-indigo-600" /> Atendimentos / Sessões Recentes
                        </span>
                        
                        <button
                          type="button"
                          onClick={toggleApptDropdown}
                          className={`w-full min-h-[42px] px-3.5 py-2 bg-white border rounded-xl flex items-center justify-between text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                            selectedAppointmentId 
                              ? 'border-indigo-400 bg-indigo-50/40 text-indigo-950' 
                              : 'border-slate-300 hover:border-indigo-400 text-slate-700'
                          }`}
                        >
                          {selectedAppointmentId ? (
                            (() => {
                              const activeAppt = patientAppointments.find(a => a.id === selectedAppointmentId);
                              const svcName = activeAppt ? (services.find(s => s.id === activeAppt.serviceId)?.name || activeAppt.type) : '';
                              return (
                                <div className="flex items-center justify-between w-full mr-2">
                                  <div className="flex items-center gap-2 truncate text-left">
                                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-md">
                                      {activeAppt?.date ? new Date(activeAppt.date + 'T12:00:00').toLocaleDateString('pt-BR') : ''}
                                    </span>
                                    <span className="truncate text-slate-900 font-bold">{svcName}</span>
                                  </div>
                                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg ml-2 whitespace-nowrap">
                                    R$ {formatNumberBRL(activeAppt?.value || 0)}
                                  </span>
                                </div>
                              );
                            })()
                          ) : (
                            <span className="text-slate-500 font-semibold truncate">
                              -- Selecionar Consulta/Sessão ({patientAppointments.length}) --
                            </span>
                          )}
                          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-1" />
                        </button>

                        {/* Popover Customizado Premium de Atendimentos */}
                        {isApptDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-2xl z-50 p-2 max-h-64 overflow-y-auto space-y-1 animate-in fade-in-50 zoom-in-95 duration-150">
                            <div className="px-2 py-1 flex justify-between items-center border-b border-slate-100 pb-1.5 mb-1">
                              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Histórico de Atendimentos</span>
                              {selectedAppointmentId && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAppointmentId('');
                                    setIsApptDropdownOpen(false);
                                  }}
                                  className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
                                >
                                  <X className="w-3 h-3" /> Remover vínculo
                                </button>
                              )}
                            </div>

                            {patientAppointments.map(a => {
                              const svc = services.find(s => s.id === a.serviceId)?.name || a.type;
                              const isSelected = selectedAppointmentId === a.id;
                              const apptDateFormatted = a.date ? new Date(a.date + 'T12:00:00').toLocaleDateString('pt-BR') : '';
                              return (
                                <button
                                  key={a.id}
                                  type="button"
                                  onClick={() => {
                                    handleSelectAppointment(a);
                                    setIsApptDropdownOpen(false);
                                  }}
                                  className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all group ${
                                    isSelected 
                                      ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold shadow-2xs' 
                                      : 'border-transparent hover:bg-slate-50 text-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-100/70 border border-indigo-200/60 text-indigo-700 flex items-center justify-center flex-shrink-0 font-bold">
                                      <Stethoscope className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-indigo-700 bg-indigo-100/60 px-1.5 py-0.5 rounded">
                                          {apptDateFormatted}
                                        </span>
                                        <span className="text-[10px] font-semibold text-slate-500 capitalize">{a.status}</span>
                                      </div>
                                      <span className="text-xs font-bold text-slate-900 truncate block group-hover:text-indigo-900 mt-0.5">
                                        {svc}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-lg">
                                      R$ {formatNumberBRL(a.value || 0)}
                                    </span>
                                    {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Seletor Customizado Premium de Lançamentos Financeiros */}
                    {patientTransactions.length > 0 && (
                      <div className="space-y-1 relative">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Lançamentos Financeiros (Receitas)
                        </span>

                        <button
                          type="button"
                          onClick={toggleTxDropdown}
                          className={`w-full min-h-[42px] px-3.5 py-2 bg-white border rounded-xl flex items-center justify-between text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                            selectedTransactionId 
                              ? 'border-emerald-400 bg-emerald-50/40 text-emerald-950' 
                              : 'border-slate-300 hover:border-emerald-400 text-slate-700'
                          }`}
                        >
                          {selectedTransactionId ? (
                            (() => {
                              const activeTx = patientTransactions.find(t => t.id === selectedTransactionId);
                              return (
                                <div className="flex items-center justify-between w-full mr-2">
                                  <div className="flex items-center gap-2 truncate text-left">
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                                      {activeTx?.dueDate ? new Date(activeTx.dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : ''}
                                    </span>
                                    <span className="truncate text-slate-900 font-bold">{activeTx?.description || 'Receita Financeira'}</span>
                                  </div>
                                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg ml-2 whitespace-nowrap">
                                    R$ {formatNumberBRL(activeTx?.amount || 0)}
                                  </span>
                                </div>
                              );
                            })()
                          ) : (
                            <span className="text-slate-500 font-semibold truncate">
                              -- Selecionar Receita Financeira ({patientTransactions.length}) --
                            </span>
                          )}
                          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-1" />
                        </button>

                        {/* Popover Customizado Premium de Lançamentos */}
                        {isTxDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-2xl z-50 p-2 max-h-64 overflow-y-auto space-y-1 animate-in fade-in-50 zoom-in-95 duration-150">
                            <div className="px-2 py-1 flex justify-between items-center border-b border-slate-100 pb-1.5 mb-1">
                              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Histórico Financeiro</span>
                              {selectedTransactionId && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTransactionId('');
                                    setIsTxDropdownOpen(false);
                                  }}
                                  className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
                                >
                                  <X className="w-3 h-3" /> Remover vínculo
                                </button>
                              )}
                            </div>

                            {patientTransactions.map(t => {
                              const isSelected = selectedTransactionId === t.id;
                              const txDateFormatted = t.dueDate ? new Date(t.dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : '';
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => {
                                    handleSelectTransaction(t);
                                    setIsTxDropdownOpen(false);
                                  }}
                                  className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all group ${
                                    isSelected 
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold shadow-2xs' 
                                      : 'border-transparent hover:bg-slate-50 text-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-100/70 border border-emerald-200/60 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold">
                                      <TrendingUp className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-100/60 px-1.5 py-0.5 rounded">
                                          {txDateFormatted}
                                        </span>
                                        {t.category && <span className="text-[10px] font-semibold text-slate-400 truncate">{t.category}</span>}
                                      </div>
                                      <span className="text-xs font-bold text-slate-900 truncate block group-hover:text-emerald-900 mt-0.5">
                                        {t.description || 'Lançamento de Receita'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-lg">
                                      R$ {formatNumberBRL(t.amount || 0)}
                                    </span>
                                    {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* BLOCO 3: VALOR, FORMA DE PAGAMENTO E DATA PREMIUM */}
              <div className="space-y-4 border-t border-slate-150 pt-5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                  <DollarSign className="w-4.5 h-4.5 text-emerald-600" /> 3. Dados e Condições do Recibo
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Campo de Valor com Máscara BRL */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Valor do Recibo (R$)*</Label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 font-black text-slate-400 text-sm">R$</span>
                      <Input 
                        type="text"
                        value={formattedAmountStr} 
                        onChange={handleAmountInputChange} 
                        placeholder="0,00" 
                        className="pl-10 h-10 font-black text-slate-900 text-base border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    {amount > 0 && (
                      <p className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/60 p-2 rounded-xl italic capitalize leading-snug">
                        {numberToWordsBRL(amount)}
                      </p>
                    )}
                  </div>

                  {/* Seletor Premium de Forma de Pagamento */}
                  <div className="space-y-1.5 relative">
                    <Label className="text-xs font-bold text-slate-700">Forma de Pagamento*</Label>
                    <button
                      type="button"
                      onClick={togglePaymentDropdown}
                      className="w-full h-10 px-3.5 bg-white border border-slate-300 rounded-xl flex items-center justify-between text-xs font-bold text-slate-800 shadow-2xs hover:border-indigo-400 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <PaymentIcon className="w-4 h-4 text-indigo-600" />
                        <span>{selectedPaymentConfig.label}</span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>

                    {isPaymentDropdownOpen && (
                      <div className="absolute left-0 right-0 bottom-full mb-2 bg-white border border-slate-200/90 rounded-2xl shadow-2xl z-50 p-2 grid grid-cols-1 gap-1 animate-in fade-in-50 zoom-in-95 duration-150">
                        {PAYMENT_METHODS.map(method => {
                          const IconComp = method.icon;
                          const isSelected = paymentMethod === method.id;
                          return (
                            <button
                              key={method.id}
                              type="button"
                              onClick={() => {
                                setPaymentMethod(method.id);
                                setIsPaymentDropdownOpen(false);
                              }}
                              className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                                isSelected 
                                  ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-bold' 
                                  : 'border-transparent hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`p-1.5 rounded-lg border ${method.color}`}>
                                  <IconComp className="w-4 h-4" />
                                </div>
                                <div>
                                  <span className="text-xs font-bold block">{method.label}</span>
                                  <span className="text-[10px] text-slate-400 font-medium">{method.desc}</span>
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Calendário Premium para Data do Recibo */}
                  <div className="space-y-1.5 relative">
                    <Label className="text-xs font-bold text-slate-700">Data do Recibo*</Label>
                    <button
                      type="button"
                      onClick={toggleCalendar}
                      className="w-full h-10 px-3.5 bg-white border border-slate-300 rounded-xl flex items-center justify-between text-xs font-bold text-slate-800 shadow-2xs hover:border-indigo-400 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        <span>{formattedSelectedDate}</span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>

                    {/* Popover do Calendário Premium - Abre para cima */}
                    {isCalendarOpen && (
                      <div className="absolute right-0 bottom-full mb-2 bg-white border border-slate-200/90 rounded-2xl shadow-2xl z-50 p-4 w-72 space-y-3 animate-in fade-in-50 zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded-lg">
                            <ChevronLeft className="w-4 h-4 text-slate-600" />
                          </button>
                          <span className="text-xs font-black text-slate-800 capitalize">
                            {monthNames[month]} {year}
                          </span>
                          <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded-lg">
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                          </button>
                        </div>

                        {/* Atalhos Rápidos */}
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setDate(new Date().toISOString().split('T')[0]);
                              setIsCalendarOpen(false);
                            }}
                            className="flex-1 py-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
                          >
                            Hoje
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const yest = new Date();
                              yest.setDate(yest.getDate() - 1);
                              setDate(yest.toISOString().split('T')[0]);
                              setIsCalendarOpen(false);
                            }}
                            className="flex-1 py-1 text-[10px] font-bold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                          >
                            Ontem
                          </button>
                        </div>

                        {/* Grid de Dias */}
                        <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 gap-1 pt-1">
                          <span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
                        </div>

                        <div className="grid grid-cols-7 text-center gap-1 text-xs">
                          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                            <div key={`empty-${i}`} />
                          ))}
                          {Array.from({ length: daysInMonth }).map((_, i) => {
                            const d = i + 1;
                            const mStr = String(month + 1).padStart(2, '0');
                            const dStr = String(d).padStart(2, '0');
                            const dayDateStr = `${year}-${mStr}-${dStr}`;
                            const isSelected = date === dayDateStr;
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => handleSelectDay(d)}
                                className={`h-7 w-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                                  isSelected 
                                    ? 'bg-indigo-600 text-white shadow-sm font-black' 
                                    : 'hover:bg-indigo-50 text-slate-800'
                                }`}
                              >
                                {d}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Referente a (Descrição dos Serviços)*</Label>
                  <Textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    placeholder="Ex: Referente a 01 sessão de procedimento estético / consulta dermatológica realizada nesta data." 
                    className="text-xs font-medium min-h-[75px] rounded-xl border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Observações / Declarações Fiscais (Opcional)</Label>
                  <Input 
                    value={observations} 
                    onChange={e => setObservations(e.target.value)} 
                    placeholder="Ex: Recibo emitido para comprovação junto ao imposto de renda / Carnê-Leão." 
                    className="text-xs rounded-xl border-slate-300"
                  />
                </div>
              </div>

              {/* BLOCO 4: DADOS DA CLÍNICA E EMISSOR */}
              <div className="border-t border-slate-150 pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                    <Building className="w-4 h-4 text-indigo-600" /> Dados da Clínica & Emissor (Perfil da Clínica)
                  </Label>
                  <span className="text-[11px] text-slate-400 font-medium">Você pode alterar especificamente para este recibo.</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-bold text-slate-600 block mb-1">Razão Social / Nome da Clínica:</span>
                    <Input 
                      value={localClinicRazaoSocial || localClinicName} 
                      onChange={e => setLocalClinicRazaoSocial(e.target.value)} 
                      className="h-9 text-xs font-semibold rounded-xl border-slate-300"
                    />
                  </div>
                  <div>
                    <span className="font-bold text-slate-600 block mb-1">CNPJ / CPF Emitente:</span>
                    <Input 
                      value={localClinicCnpj} 
                      onChange={e => setLocalClinicCnpj(e.target.value)} 
                      className="h-9 text-xs font-semibold rounded-xl border-slate-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="font-bold text-slate-600 block mb-1">Profissional Responsável:</span>
                    <Input 
                      value={localProfName} 
                      onChange={e => setLocalProfName(e.target.value)} 
                      placeholder="Nome do Profissional" 
                      className="h-9 text-xs font-semibold rounded-xl border-slate-300"
                    />
                  </div>
                  <div>
                    <span className="font-bold text-slate-600 block mb-1">CPF do Profissional:</span>
                    <Input 
                      value={localProfCpf} 
                      onChange={e => setLocalProfCpf(e.target.value)} 
                      placeholder="CPF" 
                      className="h-9 text-xs font-semibold rounded-xl border-slate-300"
                    />
                  </div>
                  <div>
                    <span className="font-bold text-slate-600 block mb-1">Registro Profissional (CRO / CRM):</span>
                    <Input 
                      value={localProfRegistro} 
                      onChange={e => setLocalProfRegistro(e.target.value)} 
                      placeholder="Ex: CRO-SP 123456" 
                      className="h-9 text-xs font-semibold rounded-xl border-slate-300"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'form' && (
            <DialogFooter className="border-t border-slate-150 pt-5 flex flex-row items-center justify-between">
              <Button onClick={onClose} variant="ghost" className="text-slate-500 text-xs font-bold">
                Cancelar
              </Button>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={handleSaveOnly} 
                  variant="outline" 
                  className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-bold rounded-xl h-10 px-4"
                >
                  <FileText className="w-4 h-4 mr-2" /> Salvar Recibo
                </Button>
                <Button 
                  onClick={handleEmitAndPrint} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl h-10 px-6 shadow-md"
                >
                  <Printer className="w-4 h-4 mr-2" /> Emitir & Visualizar Impressão
                </Button>
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL PREMIUM DE CONFIRMAÇÃO DE EMISSÃO COM SUCESSO */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6 text-center space-y-5 border-none shadow-2xl">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner animate-in zoom-in-50 duration-200">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900 italic">Recibo Emitido com Sucesso!</h3>
            <p className="text-xs font-semibold text-slate-500">
              O recibo de pagamento foi registrado no sistema e na ficha do paciente.
            </p>
          </div>

          {generatedReceipt && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                <span className="font-black text-indigo-700 uppercase tracking-wider">RECIBO Nº {generatedReceipt.number}</span>
                <span className="font-black text-emerald-700 text-sm">R$ {formatNumberBRL(generatedReceipt.amount)}</span>
              </div>
              <div className="space-y-1 pt-1">
                <p><strong className="text-slate-700 font-bold">Paciente:</strong> <span className="text-slate-900 font-semibold">{generatedReceipt.patientName}</span></p>
                <p><strong className="text-slate-700 font-bold">Forma de Pagamento:</strong> <span className="text-slate-900 font-semibold capitalize">{generatedReceipt.paymentMethod}</span></p>
                <p><strong className="text-slate-700 font-bold">Data:</strong> <span className="text-slate-900 font-semibold">{generatedReceipt.date}</span></p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2.5 pt-2">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                setStep('print');
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-11 rounded-xl shadow-md flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" /> Visualizar & Imprimir / PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (generatedReceipt) {
                  const summary = `RECIBO Nº ${generatedReceipt.number} - R$ ${formatNumberBRL(generatedReceipt.amount)}
Paciente: ${generatedReceipt.patientName}
Emitente: ${generatedReceipt.clinicRazaoSocial || generatedReceipt.clinicName}`;
                  navigator.clipboard.writeText(summary);
                  toast.success('Resumo do recibo copiado!');
                }
              }}
              className="w-full border-slate-200 text-slate-700 font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4 text-slate-500" /> Copiar Resumo do Recibo
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowSuccessModal(false);
                onClose();
              }}
              className="w-full text-slate-500 font-bold text-xs h-9 rounded-xl"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
