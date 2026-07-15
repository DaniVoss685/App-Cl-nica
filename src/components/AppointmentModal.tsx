import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar as CalendarIcon, Clock, UserCheck, AlertTriangle, Users, Stethoscope, DollarSign, Package, Sparkles, RefreshCcw, Trash2 } from 'lucide-react';
import { format, addDays, addMinutes } from 'date-fns';
import { useStore } from '../store';
import { cn } from '../lib/utils';
import { Appointment, PaymentSplit } from '../types';

type UpfrontPaymentConfig = {
  requiresUpfrontPayment?: boolean;
  upfrontPaymentType?: 'porcentagem' | 'valor';
  upfrontPaymentValue?: number;
  name?: string;
};

type AppointmentFormData = {
  patientId: string;
  professionalId: string;
  serviceId: string;
  packageId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: Appointment['type'];
  confirmationStatus: Appointment['confirmationStatus'];
  value?: number;
  paymentStatus: Appointment['paymentStatus'];
  paymentMethod: Appointment['paymentMethod'] | '';
  notes: string;
  isCaseStudy: boolean;
  status: Appointment['status'];
  upfrontPaid: boolean;
  upfrontPaidAmount: number;
  cardInstallments: number;
  paymentDate: string;
  paymentSplits: PaymentSplit[];
};

const formatBRL = (value: number) => new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value);

const getUpfrontRequirement = (item: UpfrontPaymentConfig | undefined, totalValue: number) => {
  if (!item?.requiresUpfrontPayment) return null;

  const rawValue = Number(item.upfrontPaymentValue || 0);
  const amount = item.upfrontPaymentType === 'valor'
    ? rawValue
    : (totalValue * rawValue) / 100;

  return {
    sourceName: item.name || 'item selecionado',
    type: item.upfrontPaymentType || 'porcentagem',
    value: rawValue,
    amount: Math.max(0, amount)
  };
};

interface AppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId?: string | null;
  initialDate?: string;
  initialStartTime?: string;
  onSuccess?: (returnDate: string | null) => void;
}

export function AppointmentModal({ open, onOpenChange, appointmentId, initialDate, initialStartTime, onSuccess }: AppointmentModalProps) {
  const { patients, professionals, appointments, services, packages, addAppointment, updateAppointment, inventory, serviceCategories } = useStore();

  const currentAppt = appointmentId ? appointments.find(a => a.id === appointmentId) : null;
  const isReschedulingMissed = !!currentAppt && (currentAppt.status === 'faltou' || currentAppt.status === 'cancelado');
  const originalAppt = currentAppt && currentAppt.linkedToAppointmentId 
    ? appointments.find(a => a.id === currentAppt.linkedToAppointmentId) 
    : null;
  const originalService = originalAppt ? services.find(s => s.id === originalAppt.serviceId) : null;
  const originalProfessional = originalAppt ? professionals.find(p => p.id === originalAppt.professionalId) : null;
  
  const getInitialData = (): AppointmentFormData => {
    if (appointmentId) {
      const appt = appointments.find(a => a.id === appointmentId);
      if (appt) {
        return {
          patientId: appt.patientId || '',
          professionalId: appt.professionalId || '',
          serviceId: appt.serviceId || 'none',
          packageId: appt.packageId || 'none',
          date: appt.date || '',
          startTime: appt.startTime || '',
          endTime: appt.endTime || '',
          type: (appt.type || 'consulta') as Appointment['type'],
          confirmationStatus: (appt.confirmationStatus || 'pendente') as Appointment['confirmationStatus'],
          value: appt.value,
          paymentStatus: (appt.paymentStatus || 'pendente') as Appointment['paymentStatus'],
          paymentMethod: (appt.paymentMethod || '') as AppointmentFormData['paymentMethod'],
          notes: appt.notes || '',
          isCaseStudy: appt.isCaseStudy || false,
          status: (appt.status || 'agendado') as Appointment['status'],
          upfrontPaid: appt.upfrontPaid || false,
          upfrontPaidAmount: appt.upfrontPaidAmount || 0,
          cardInstallments: appt.cardInstallments || 1,
          paymentDate: appt.paymentDate || '',
          paymentSplits: appt.paymentSplits || []
        };
      }
    }
    return {
      patientId: '',
      professionalId: '',
      serviceId: 'none',
      packageId: 'none',
      date: initialDate || format(new Date(), 'yyyy-MM-dd'),
      startTime: initialStartTime || '',
      endTime: '',
      type: 'consulta',
      confirmationStatus: 'pendente' as const,
      value: undefined as number | undefined,
      paymentStatus: 'pendente' as const,
      paymentMethod: '',
      notes: '',
      isCaseStudy: false,
      status: 'agendado' as const,
      upfrontPaid: false,
      upfrontPaidAmount: 0,
      cardInstallments: 1,
      paymentDate: '',
      paymentSplits: [] as PaymentSplit[]
    };
  };

  const [formData, setFormData] = useState<AppointmentFormData>(getInitialData());
  const [bulkSchedule, setBulkSchedule] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const [displayUpfrontPaidValue, setDisplayUpfrontPaidValue] = useState('');
  const [displaySplits, setDisplaySplits] = useState<string[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [showRescheduleExistingDialog, setShowRescheduleExistingDialog] = useState(false);
  const [conflictingAppointment, setConflictingAppointment] = useState<Appointment | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [rescheduleData, setRescheduleData] = useState({ date: '', startTime: '', endTime: '' });
  const [customItemsUsed, setCustomItemsUsed] = useState<{ itemId: string; quantity: number }[]>([]);
  const [showFollowUpConfirm, setShowFollowUpConfirm] = useState(false);
  const [confirmedFollowUpDate, setConfirmedFollowUpDate] = useState('');
  const [isPaymentRecorded, setIsPaymentRecorded] = useState(false);
  const [forceShowAllFields, setForceShowAllFields] = useState(false);

  // Pre-populate customItemsUsed whenever the selected service changes or modal data loads
  useEffect(() => {
    if (formData.serviceId && formData.serviceId !== 'none') {
      const selectedService = services.find(s => s.id === formData.serviceId);
      if (selectedService && selectedService.itemCosts) {
        setCustomItemsUsed(selectedService.itemCosts.map(ic => ({ itemId: ic.itemId, quantity: ic.quantity })));
      } else {
        setCustomItemsUsed([]);
      }
    } else {
      setCustomItemsUsed([]);
    }
  }, [formData.serviceId]);

  // Reset form when opening or when appointmentId changes
  useEffect(() => {
    if (open) {
      const data = getInitialData();
      setFormData(data);
      if (data.value !== undefined) {
        setDisplayValue(new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(data.value));
      } else {
        setDisplayValue('');
      }
      if (data.upfrontPaidAmount !== undefined && data.upfrontPaidAmount > 0) {
        setDisplayUpfrontPaidValue(new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(data.upfrontPaidAmount));
      } else {
        setDisplayUpfrontPaidValue('');
      }
      if (data.paymentSplits) {
        setDisplaySplits(data.paymentSplits.map(s => s.amount ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(s.amount) : ''));
      } else {
        setDisplaySplits([]);
      }
      setShowConflictDialog(false);
      setShowRescheduleExistingDialog(false);
      setConflictingAppointment(null);
      setBulkSchedule(false);
      const alreadyPaid = data.paymentStatus === 'pago' || data.paymentStatus === 'parcial' || !!data.paymentMethod || (data.value !== undefined && data.value > 0);
      setIsPaymentRecorded(alreadyPaid);
      setForceShowAllFields(false);
    }
  }, [open, appointmentId, initialDate, initialStartTime, appointments]);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numericValue = Number(rawValue) / 100;
    
    if (isNaN(numericValue)) return;
    
    setFormData({ ...formData, value: numericValue });
    
    // Format for display: 1.234,56
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
    
    setDisplayValue(formatted === '0,00' && rawValue === '' ? '' : formatted);
  };

  const handleUpfrontPaidAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numericValue = Number(rawValue) / 100;
    
    if (isNaN(numericValue)) return;
    
    setFormData({ ...formData, upfrontPaidAmount: numericValue, upfrontPaid: true });
    
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
    
    setDisplayUpfrontPaidValue(formatted === '0,00' && rawValue === '' ? '' : formatted);
  };

  const markUpfrontPaymentPaid = (amount: number) => {
    const safeAmount = Math.min(Math.max(amount, 0), formData.value || amount);
    const isFullPayment = safeAmount >= (formData.value || 0);

    setFormData({
      ...formData,
      upfrontPaid: safeAmount > 0,
      upfrontPaidAmount: safeAmount,
      paymentStatus: (isFullPayment ? 'pago' : 'parcial') as any,
      paymentDate: formData.paymentDate || formData.date
    });
    setIsPaymentRecorded(true);
    setDisplayUpfrontPaidValue(safeAmount > 0 ? formatBRL(safeAmount) : '');
  };

  const markUpfrontPaymentPending = () => {
    setFormData({
      ...formData,
      upfrontPaid: false,
      upfrontPaidAmount: 0,
      paymentStatus: 'pendente',
      paymentMethod: '',
      paymentDate: ''
    });
    setDisplayUpfrontPaidValue('');
  };
  
  const handleSplitValueChange = (index: number, valStr: string) => {
    const rawValue = valStr.replace(/\D/g, '');
    const numericValue = rawValue === '' ? 0 : Number(rawValue) / 100;
    if (isNaN(numericValue)) return;
    
    const splits = [...(formData.paymentSplits || [])];
    splits[index] = { ...splits[index], amount: numericValue };
    setFormData({ ...formData, paymentSplits: splits });
    
    const newDisplays = [...displaySplits];
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
    newDisplays[index] = formatted === '0,00' && rawValue === '' ? '' : formatted;
    setDisplaySplits(newDisplays);
  };

  const handleServiceChange = (serviceId: string) => {
    const selectedService = services.find(s => s.id === serviceId);
    let newEndTime = formData.endTime;
    let newValue = formData.value;
    
    if (selectedService) {
      newValue = selectedService.price;
      if (formData.startTime) {
        const [hours, minutes] = formData.startTime.split(':').map(Number);
        const startDates = new Date();
        startDates.setHours(hours, minutes, 0, 0);
        const endDate = new Date(startDates.getTime() + selectedService.durationMinutes * 60000);
        newEndTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
      }
    }

    setFormData({
      ...formData,
      serviceId,
      packageId: 'none',
      value: newValue,
      endTime: newEndTime,
      upfrontPaid: false,
      upfrontPaidAmount: 0
    });
    setDisplayUpfrontPaidValue('');

    if (newValue !== undefined) {
      setDisplayValue(new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(newValue));
    }
  };

  const handlePackageChange = (packageId: string) => {
    const selectedPackage = packages.find(p => p.id === packageId);
    if (selectedPackage) {
      setFormData({
        ...formData,
        packageId,
        serviceId: 'none',
        value: selectedPackage.price,
        upfrontPaid: false,
        upfrontPaidAmount: 0,
        type: 'sessão'
      });
      setDisplayUpfrontPaidValue('');
      setDisplayValue(new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(selectedPackage.price));
    }
  };

  const handleStartTimeChange = (startTime: string) => {
    let newEndTime = formData.endTime;
    if (formData.serviceId && formData.serviceId !== 'none') {
      const selectedService = services.find(s => s.id === formData.serviceId);
      if (selectedService) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startDates = new Date();
        startDates.setHours(hours, minutes, 0, 0);
        const endDate = new Date(startDates.getTime() + selectedService.durationMinutes * 60000);
        newEndTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
      }
    }
    setFormData({ ...formData, startTime, endTime: newEndTime });
  };

  const saveAppointment = () => {
    const selectedPkg = packages.find(p => p.id === formData.packageId);
    const selectedService = services.find(s => s.id === formData.serviceId);

    // Interceptação para confirmação de retorno na criação (quando não estiver editando e for serviço com retorno)
    if (!appointmentId && selectedService && selectedService.generatesFollowUp && selectedService.followUpDays && !showFollowUpConfirm) {
      const [year, month, day] = formData.date.split('-').map(Number);
      const baseDate = new Date(year, month - 1, day);
      const futureDate = addDays(baseDate, selectedService.followUpDays);
      setConfirmedFollowUpDate(format(futureDate, 'yyyy-MM-dd'));
      setShowFollowUpConfirm(true);
      return;
    }



    let finalPaymentStatus = isPaymentRecorded ? formData.paymentStatus : 'pendente';
    const finalPaymentMethod = isPaymentRecorded ? (formData.paymentMethod || undefined) as any : undefined;
    const finalCardInstallments = (isPaymentRecorded && finalPaymentMethod === 'cartão de crédito') ? Number(formData.cardInstallments || 1) : undefined;
    const finalPaymentDate = isPaymentRecorded ? (formData.paymentDate || formData.date) : undefined;
    let finalUpfrontPaidAmount = formData.upfrontPaidAmount || 0;

    if (isPaymentRecorded && finalPaymentMethod === 'múltiplo' && formData.paymentSplits && formData.paymentSplits.length > 0) {
      const allPaid = formData.paymentSplits.every(s => s.status === 'pago');
      const allPending = formData.paymentSplits.every(s => s.status === 'pendente');
      finalPaymentStatus = allPaid ? 'pago' : (allPending ? 'pendente' : 'parcial');
      finalUpfrontPaidAmount = formData.paymentSplits.filter(s => s.status === 'pago').reduce((sum, s) => sum + s.amount, 0);
    }

    const isReschedulingMissed = !!appointmentId && (formData.status === 'faltou' || formData.status === 'cancelado');
    const finalStatus = isReschedulingMissed ? 'agendado' : formData.status;
    const finalConfirmationStatus = isReschedulingMissed ? 'pendente' : formData.confirmationStatus;

    if (appointmentId) {
      updateAppointment(appointmentId, {
        patientId: formData.patientId,
        professionalId: formData.professionalId,
        serviceId: formData.serviceId === 'none' ? undefined : formData.serviceId,
        packageId: formData.packageId === 'none' ? undefined : formData.packageId,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        type: formData.type as any,
        confirmationStatus: finalConfirmationStatus as any,
        value: formData.value || 0,
        paymentStatus: finalPaymentStatus,
        paymentMethod: finalPaymentMethod,
        cardInstallments: finalCardInstallments,
        paymentDate: finalPaymentDate,
        notes: formData.notes,
        status: finalStatus as any,
        customItemCostsUsed: customItemsUsed,
        isCaseStudy: formData.isCaseStudy,
        upfrontPaid: finalUpfrontPaidAmount > 0 ? true : formData.upfrontPaid,
        upfrontPaidAmount: finalUpfrontPaidAmount,
        paymentSplits: finalPaymentMethod === 'múltiplo' ? formData.paymentSplits : undefined
      });
    } else if (bulkSchedule && selectedPkg && selectedPkg.totalSessions > 1 && selectedPkg.sessionInterval) {
      const [year, month, day] = formData.date.split('-').map(Number);
      let startDate = new Date(year, month - 1, day);
      
      for (let i = 0; i < selectedPkg.totalSessions; i++) {
        const dateStr = format(startDate, 'yyyy-MM-dd');
        addAppointment({
          patientId: formData.patientId,
          professionalId: formData.professionalId,
          serviceId: formData.serviceId === 'none' ? undefined : formData.serviceId,
          packageId: selectedPkg.id,
          date: dateStr,
          startTime: formData.startTime,
          endTime: formData.endTime,
          type: 'sessão',
          status: formData.status as any || 'agendado',
          customItemCostsUsed: customItemsUsed,
          confirmationStatus: formData.confirmationStatus,
          value: i === 0 ? (formData.value || 0) : 0, 
          paymentStatus: finalPaymentStatus,
          paymentMethod: finalPaymentMethod,
          cardInstallments: i === 0 ? finalCardInstallments : undefined,
          paymentDate: i === 0 ? finalPaymentDate : undefined,
          notes: i === 0 ? formData.notes : `Sessão ${i + 1}/${selectedPkg.totalSessions} do pacote ${selectedPkg.name}${formData.notes ? ` - ${formData.notes}` : ''}`,
          isCaseStudy: formData.isCaseStudy,
          upfrontPaid: i === 0 ? (finalUpfrontPaidAmount > 0 ? true : formData.upfrontPaid) : false,
          upfrontPaidAmount: i === 0 ? finalUpfrontPaidAmount : 0,
          paymentSplits: (i === 0 && finalPaymentMethod === 'múltiplo') ? formData.paymentSplits : undefined
        });
        startDate = addDays(startDate, selectedPkg.sessionInterval);
      }
    } else {
      addAppointment({
        patientId: formData.patientId,
        professionalId: formData.professionalId,
        serviceId: formData.serviceId === 'none' ? undefined : formData.serviceId,
        packageId: formData.packageId === 'none' ? undefined : formData.packageId,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        type: formData.type as any,
        status: formData.status as any || 'agendado',
        customItemCostsUsed: customItemsUsed,
        confirmationStatus: formData.confirmationStatus,
        value: formData.value || 0,
        paymentStatus: finalPaymentStatus,
        paymentMethod: finalPaymentMethod,
        cardInstallments: finalCardInstallments,
        paymentDate: finalPaymentDate,
        notes: formData.notes,
        isCaseStudy: formData.isCaseStudy,
        upfrontPaid: finalUpfrontPaidAmount > 0 ? true : formData.upfrontPaid,
        upfrontPaidAmount: finalUpfrontPaidAmount,
        paymentSplits: finalPaymentMethod === 'múltiplo' ? formData.paymentSplits : undefined
      });
    }

    let returnDateString: string | null = null;
    if (selectedService && selectedService.generatesFollowUp && selectedService.followUpDays) {
      const [year, month, day] = formData.date.split('-').map(Number);
      const baseDate = new Date(year, month - 1, day);
      const futureDate = addDays(baseDate, selectedService.followUpDays);
      returnDateString = format(futureDate, 'dd/MM/yyyy');
    }

    if (onSuccess) onSuccess(returnDateString);
    onOpenChange(false);
  };

  const handleConfirmFollowUp = () => {
    const selectedPkg = packages.find(p => p.id === formData.packageId);
    const finalPaymentStatus = isPaymentRecorded ? formData.paymentStatus : 'pendente';
    const finalPaymentMethod = isPaymentRecorded ? (formData.paymentMethod || undefined) as any : undefined;
    const finalCardInstallments = (isPaymentRecorded && finalPaymentMethod === 'cartão de crédito') ? Number(formData.cardInstallments || 1) : undefined;

    if (bulkSchedule && selectedPkg && selectedPkg.totalSessions > 1 && selectedPkg.sessionInterval) {
      const [year, month, day] = formData.date.split('-').map(Number);
      let startDate = new Date(year, month - 1, day);
      
      for (let i = 0; i < selectedPkg.totalSessions; i++) {
        const dateStr = format(startDate, 'yyyy-MM-dd');
        addAppointment({
          patientId: formData.patientId,
          professionalId: formData.professionalId,
          serviceId: formData.serviceId === 'none' ? undefined : formData.serviceId,
          packageId: selectedPkg.id,
          date: dateStr,
          startTime: formData.startTime,
          endTime: formData.endTime,
          type: 'sessão',
          status: formData.status as any || 'agendado',
          customItemCostsUsed: customItemsUsed,
          confirmationStatus: formData.confirmationStatus,
          value: i === 0 ? (formData.value || 0) : 0, 
          paymentStatus: finalPaymentStatus,
          paymentMethod: finalPaymentMethod,
          cardInstallments: i === 0 ? finalCardInstallments : undefined,
          notes: i === 0 ? formData.notes : `Sessão ${i + 1}/${selectedPkg.totalSessions} do pacote ${selectedPkg.name}${formData.notes ? ` - ${formData.notes}` : ''}`,
          isCaseStudy: formData.isCaseStudy,
          upfrontPaid: i === 0 ? formData.upfrontPaid : false,
          upfrontPaidAmount: i === 0 ? formData.upfrontPaidAmount : 0
        }, i === 0 ? confirmedFollowUpDate : 'none');
        startDate = addDays(startDate, selectedPkg.sessionInterval);
      }
    } else {
      addAppointment({
        patientId: formData.patientId,
        professionalId: formData.professionalId,
        serviceId: formData.serviceId === 'none' ? undefined : formData.serviceId,
        packageId: formData.packageId === 'none' ? undefined : formData.packageId,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        type: formData.type as any,
        status: formData.status as any || 'agendado',
        customItemCostsUsed: customItemsUsed,
        confirmationStatus: formData.confirmationStatus,
        value: formData.value || 0,
        paymentStatus: finalPaymentStatus,
        paymentMethod: finalPaymentMethod,
        cardInstallments: finalCardInstallments,
        notes: formData.notes,
        isCaseStudy: formData.isCaseStudy,
        upfrontPaid: formData.upfrontPaid,
        upfrontPaidAmount: formData.upfrontPaidAmount
      }, confirmedFollowUpDate);
    }

    if (onSuccess) {
      onSuccess(format(new Date(confirmedFollowUpDate + 'T12:00:00'), 'dd/MM/yyyy'));
    }
    setShowFollowUpConfirm(false);
    onOpenChange(false);
  };

  const handleSkipFollowUp = () => {
    const selectedPkg = packages.find(p => p.id === formData.packageId);
    const finalPaymentStatus = isPaymentRecorded ? formData.paymentStatus : 'pendente';
    const finalPaymentMethod = isPaymentRecorded ? (formData.paymentMethod || undefined) as any : undefined;
    const finalCardInstallments = (isPaymentRecorded && finalPaymentMethod === 'cartão de crédito') ? Number(formData.cardInstallments || 1) : undefined;

    if (bulkSchedule && selectedPkg && selectedPkg.totalSessions > 1 && selectedPkg.sessionInterval) {
      const [year, month, day] = formData.date.split('-').map(Number);
      let startDate = new Date(year, month - 1, day);
      
      for (let i = 0; i < selectedPkg.totalSessions; i++) {
        const dateStr = format(startDate, 'yyyy-MM-dd');
        addAppointment({
          patientId: formData.patientId,
          professionalId: formData.professionalId,
          serviceId: formData.serviceId === 'none' ? undefined : formData.serviceId,
          packageId: selectedPkg.id,
          date: dateStr,
          startTime: formData.startTime,
          endTime: formData.endTime,
          type: 'sessão',
          status: formData.status as any || 'agendado',
          customItemCostsUsed: customItemsUsed,
          confirmationStatus: formData.confirmationStatus,
          value: i === 0 ? (formData.value || 0) : 0, 
          paymentStatus: finalPaymentStatus,
          paymentMethod: finalPaymentMethod,
          cardInstallments: i === 0 ? finalCardInstallments : undefined,
          notes: i === 0 ? formData.notes : `Sessão ${i + 1}/${selectedPkg.totalSessions} do pacote ${selectedPkg.name}${formData.notes ? ` - ${formData.notes}` : ''}`,
          isCaseStudy: formData.isCaseStudy,
          upfrontPaid: i === 0 ? formData.upfrontPaid : false,
          upfrontPaidAmount: i === 0 ? formData.upfrontPaidAmount : 0
        }, 'none');
        startDate = addDays(startDate, selectedPkg.sessionInterval);
      }
    } else {
      addAppointment({
        patientId: formData.patientId,
        professionalId: formData.professionalId,
        serviceId: formData.serviceId === 'none' ? undefined : formData.serviceId,
        packageId: formData.packageId === 'none' ? undefined : formData.packageId,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        type: formData.type as any,
        status: formData.status as any || 'agendado',
        customItemCostsUsed: customItemsUsed,
        confirmationStatus: formData.confirmationStatus,
        value: formData.value || 0,
        paymentStatus: finalPaymentStatus,
        paymentMethod: finalPaymentMethod,
        cardInstallments: finalCardInstallments,
        notes: formData.notes,
        isCaseStudy: formData.isCaseStudy,
        upfrontPaid: formData.upfrontPaid,
        upfrontPaidAmount: formData.upfrontPaidAmount
      }, 'none');
    }
    onOpenChange(false);
  };

  const handleRescheduleExisting = () => {
    if (!conflictingAppointment) return;

    updateAppointment(conflictingAppointment.id, {
      date: rescheduleData.date,
      startTime: rescheduleData.startTime,
      endTime: rescheduleData.endTime,
      notes: `${conflictingAppointment.notes || ''}\n[REAGENDADO POR CONFLITO EM ${format(new Date(), 'dd/MM/yyyy')}]`
    });

    saveAppointment();
    setShowRescheduleExistingDialog(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Basic validation
    if (!formData.patientId) {
      setValidationError('Por favor, selecione um paciente.');
      return;
    }
    if (!formData.professionalId) {
      setValidationError('Por favor, selecione um profissional.');
      return;
    }
    if (formData.serviceId === 'none' && formData.packageId === 'none') {
      setValidationError('Por favor, selecione um serviço/procedimento ou um pacote associado.');
      return;
    }
    if (!formData.startTime || !formData.endTime) {
      setValidationError('Por favor, preencha os horários de início e fim.');
      return;
    }

    if (isPaymentRecorded && formData.paymentMethod === 'múltiplo') {
      const splits = formData.paymentSplits || [];
      const totalSplits = splits.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(totalSplits - (formData.value || 0)) > 0.01) {
        setValidationError('A soma das formas de pagamento deve ser igual ao valor cobrado (R$ ' + (formData.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ').');
        return;
      }
      if (splits.length === 0) {
        setValidationError('Por favor, adicione pelo menos uma forma de pagamento para divisão.');
        return;
      }
    }

    if (isPaymentRecorded && formData.paymentStatus === 'parcial') {
      if (!formData.upfrontPaidAmount || formData.upfrontPaidAmount <= 0) {
        setValidationError('Por favor, preencha o valor pago parcialmente no Passo 4.');
        return;
      }
      if (formData.upfrontPaidAmount >= (formData.value || 0)) {
        setValidationError('O valor pago parcialmente deve ser menor que o valor total cobrado. Caso tenha sido pago por completo, escolha "Pago Inteiro".');
        return;
      }
    }

    if ((formData.status === 'realizado' || formData.status === 'finalizado') && !formData.notes.trim()) {
      setValidationError('Por favor, preencha o diagnóstico / notas clínicas no Passo 5 para concluir este agendamento.');
      return;
    }

    // Professional Availability Check
    const professional = professionals.find(p => p.id === formData.professionalId);
    if (professional && professional.workingHours && !showAvailabilityDialog) {
      if (formData.startTime < professional.workingHours.start || formData.endTime > professional.workingHours.end) {
        setShowAvailabilityDialog(true);
        return;
      }
    }

    // Conflict detection
    const isConcluded = formData.status === 'realizado' || formData.status === 'finalizado';
    const conflict = isConcluded ? null : appointments.find(a => 
      a.id !== appointmentId &&
      a.professionalId === formData.professionalId &&
      a.date === formData.date &&
      ['agendado', 'confirmado', 'chegou', 'atrasado'].includes(a.status) &&
      (
        (formData.startTime >= a.startTime && formData.startTime < a.endTime) ||
        (formData.endTime > a.startTime && formData.endTime <= a.endTime) ||
        (formData.startTime <= a.startTime && formData.endTime >= a.endTime)
      )
    );

    if (conflict) {
      setConflictingAppointment(conflict);
      setShowConflictDialog(true);
      return;
    }
    
    saveAppointment();
  };

  const openRescheduleDialog = () => {
    if (conflictingAppointment) {
      setRescheduleData({
        date: conflictingAppointment.date,
        startTime: conflictingAppointment.startTime,
        endTime: conflictingAppointment.endTime
      });
      setShowConflictDialog(false);
      setShowRescheduleExistingDialog(true);
    }
  };

  const isRescheduling = !!currentAppt && (currentAppt.status === 'faltou' || currentAppt.status === 'cancelado') && !forceShowAllFields;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-none sm:max-w-none md:max-w-none lg:max-w-none xl:max-w-none w-screen h-screen m-0 rounded-none p-0 bg-white border-none flex flex-col top-0 left-0 translate-x-0 translate-y-0 duration-100 overflow-hidden">
        <div className="bg-indigo-600 p-8 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-3xl font-black italic">
                {isRescheduling ? 'Reagendar Atendimento' : appointmentId ? 'Detalhes do Agendamento' : 'Novo Agendamento'}
              </DialogTitle>
              <p className="text-indigo-100 text-sm font-medium mt-1 italic">
                {isRescheduling ? 'Defina a nova data e horário para confirmar o reagendamento' : appointmentId ? 'Visualize e edite as informações do agendamento' : 'Preencha os dados abaixo para reservar um horário na agenda'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-white hover:bg-white/10 font-black italic rounded-2xl px-8 h-14 text-sm uppercase tracking-wider shrink-0 border border-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            Fechar Janela X
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-10">
            <div className="w-full max-w-7xl mx-auto space-y-10">
              
              {/* Banner informativo de Retorno Vinculado */}
              {originalAppt && (
                <div className="p-5 bg-indigo-50/50 border-2 border-dashed border-indigo-200 rounded-[2rem] flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-200">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black italic text-sm shrink-0 shadow-md">
                      🔄
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-indigo-950 italic uppercase tracking-wider">Retorno Vinculado</h4>
                      <p className="text-xs text-indigo-750 font-bold leading-normal">
                        Este agendamento é o retorno oficial do procedimento de{" "}
                        <strong className="text-indigo-900 capitalize font-extrabold">
                          {originalService?.name || "Procedimento Geral"}
                        </strong>{" "}
                        realizado em{" "}
                        <strong className="text-indigo-900 font-extrabold">
                          {format(new Date(originalAppt.date + 'T12:00:00'), 'dd/MM/yyyy')}
                        </strong>{" "}
                        às <strong className="text-indigo-900 font-extrabold">{originalAppt.startTime}</strong> com o profissional{" "}
                        <strong className="text-indigo-900 font-extrabold">Dr(a). {originalProfessional?.name || "Clínica"}</strong>.
                      </p>
                    </div>
                  </div>

                  {originalAppt.notes && (
                    <div className="bg-white/80 border border-indigo-150 p-4 rounded-2xl space-y-1.5 shadow-sm">
                      <span className="text-[10px] text-indigo-950 font-black uppercase tracking-wider block italic flex items-center gap-1 font-sans">
                        📋 diagnóstico / evolução clínica anterior:
                      </span>
                      <p className="text-xs text-indigo-900 font-bold italic whitespace-pre-wrap leading-relaxed">
                        "{originalAppt.notes}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              {isRescheduling ? (
                <div className="max-w-xl mx-auto space-y-6 w-full">
                  {/* Read-only Patient & Service Card */}
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-6 space-y-4">
                    <p className="text-[10px] text-indigo-800 uppercase font-black tracking-widest italic">Paciente & Procedimento</p>
                    <h4 className="text-slate-900 font-black text-xl truncate capitalize">
                      {patients.find(p => p.id === formData.patientId)?.name || 'Paciente'}
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-indigo-100/50">
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Profissional</p>
                        <p className="text-slate-700 font-bold text-xs">
                          Dr(a). {professionals.find(p => p.id === formData.professionalId)?.name || 'Clínica'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Procedimento</p>
                        <p className="text-slate-700 font-bold text-xs truncate capitalize font-sans">
                          {services.find(s => s.id === formData.serviceId)?.name || packages.find(p => p.id === formData.packageId)?.name || 'Geral'}
                        </p>
                      </div>
                    </div>

                    {(() => {
                      const selectedService = services.find(s => s.id === formData.serviceId);
                      const selectedPackage = packages.find(p => p.id === formData.packageId);
                      const requirement = getUpfrontRequirement(
                        formData.serviceId !== 'none' ? selectedService : selectedPackage,
                        formData.value || 0
                      );

                      if (!requirement) return null;

                      return (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col gap-3">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-black text-amber-900 uppercase italic tracking-wider">
                                Este {formData.packageId !== 'none' ? 'pacote' : 'procedimento'} exige pagamento antecipado
                              </p>
                              <p className="text-xs text-amber-800 font-semibold leading-snug mt-1">
                                {requirement.sourceName}: caucao/sinal de R$ {formatBRL(requirement.amount)}
                                {requirement.type === 'porcentagem' ? ` (${requirement.value}% do valor)` : ' (valor fixo)'}.
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Button
                              type="button"
                              onClick={() => markUpfrontPaymentPaid(requirement.amount)}
                              className="h-10 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase italic"
                            >
                              Paciente ja pagou
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={markUpfrontPaymentPending}
                              className="h-10 border-amber-200 text-amber-800 hover:bg-amber-100 rounded-xl text-[10px] font-black uppercase italic"
                            >
                              Ainda pendente
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* PASSO 3: Agenda & Horários */}
                  <div className="p-6 bg-slate-50/70 border border-indigo-100 rounded-[2rem] space-y-6 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black italic text-xs">📅</span>
                      <h3 className="text-indigo-950 font-black text-sm uppercase tracking-wider italic flex items-center gap-1.5 font-sans font-bold">
                        Nova Data & Horários
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2 md:col-span-1">
                        <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider font-sans">Data Atendimento <span className="text-red-500">*</span></Label>
                        <Input className="h-12 border-slate-200 bg-white font-bold rounded-xl" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider font-sans">Início <span className="text-red-500">*</span></Label>
                        <Input className="h-12 border-slate-200 bg-white font-mono font-bold rounded-xl" type="time" value={formData.startTime} onChange={e => handleStartTimeChange(e.target.value)} required />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider font-sans">Previsão Fim <span className="text-red-500">*</span></Label>
                        <Input className="h-12 border-slate-200 bg-white font-mono font-bold rounded-xl" type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} required />
                      </div>
                    </div>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setForceShowAllFields(true)}
                      className="text-xs text-indigo-600 hover:text-indigo-850 font-bold uppercase tracking-wider italic hover:underline cursor-pointer font-sans"
                    >
                      Exibir detalhes completos do agendamento
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* SEQUÊNCIA DO AGENDAMENTO (DA ESQUERDA PARA A DIREITA) */}
                
                {/* PASSO 1: Identificação do Paciente */}
                  <div className="p-6 bg-slate-50/70 border border-indigo-100 rounded-[2rem] space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black italic text-xs">1</span>
                      <h3 className="text-indigo-950 font-black text-sm uppercase tracking-wider italic flex items-center gap-1.5 font-sans">
                        <Users className="w-4 h-4 text-indigo-600" />
                        Paciente & Atendimento
                      </h3>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold flex items-center gap-2 italic text-xs uppercase tracking-wider">
                        Paciente Beneficiário <span className="text-red-500">*</span>
                      </Label>
                      <Select value={formData.patientId} onValueChange={(v) => setFormData({...formData, patientId: v})}>
                        <SelectTrigger className="h-12 border-slate-200 bg-white hover:bg-slate-50/50 transition-colors font-bold w-full rounded-xl">
                          <SelectValue placeholder="Selecione o paciente">
                            {patients.find(p => p.id === formData.patientId)?.name || 'Selecione o paciente'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="z-[5000]">
                          {patients.map(p => <SelectItem key={p.id} value={p.id} className="font-bold">{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className={cn(appointmentId ? "col-span-1" : "col-span-2", "space-y-2")}>
                        <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider">Tipo Consulta</Label>
                        <Select value={formData.type} onValueChange={(v: any) => setFormData({...formData, type: v})}>
                          <SelectTrigger className="h-12 border-slate-200 bg-white font-bold w-full rounded-xl">
                            <SelectValue placeholder="Selecione o tipo">
                              {formData.type || 'Selecione o tipo'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="z-[5000]">
                            {(serviceCategories.length > 0 ? [...serviceCategories].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })) : ['consulta', 'avaliação', 'retorno', 'sessão', 'acompanhamento']).map(cat => (
                              <SelectItem key={cat} value={cat} className="italic font-bold capitalize">{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {appointmentId && (
                        <div className="space-y-2">
                          <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider font-sans">Status Confirmação</Label>
                          <Select value={formData.confirmationStatus} onValueChange={(v: any) => setFormData({...formData, confirmationStatus: v})}>
                            <SelectTrigger className="h-12 border-slate-200 bg-white font-bold w-full rounded-xl">
                              <SelectValue placeholder="Status...">
                                {formData.confirmationStatus === 'pendente' ? 'Pendente' :
                                 formData.confirmationStatus === 'mensagem enviada' ? 'Mensagem Enviada' :
                                 formData.confirmationStatus === 'confirmado' ? 'Confirmado' :
                                 formData.confirmationStatus === 'cancelado' ? 'Recusado/Cancelado' : formData.confirmationStatus}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="z-[5000]">
                              <SelectItem value="pendente" className="italic font-bold">Pendente</SelectItem>
                              <SelectItem value="mensagem enviada" className="italic font-bold">Mensagem Enviada</SelectItem>
                              <SelectItem value="confirmado" className="italic font-bold">Confirmado</SelectItem>
                              <SelectItem value="cancelado" className="italic font-bold">Recusado/Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {appointmentId && (
                      <div className="space-y-2 pt-2 border-t border-slate-100/50">
                        <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider font-sans">Status do Atendimento</Label>
                        <Select value={formData.status} onValueChange={(v: any) => setFormData({...formData, status: v})}>
                          <SelectTrigger className="h-12 border-slate-200 bg-white font-bold w-full rounded-xl">
                            <SelectValue placeholder="Selecione o status do atendimento">
                              {formData.status === 'agendado' ? '🗓️ Agendado' :
                               formData.status === 'confirmado' ? '✅ Confirmado' :
                               formData.status === 'chegou' ? '⏳ Chegou / Em sala de espera' :
                               formData.status === 'atrasado' ? '⚠️ Atrasado' :
                               formData.status === 'realizado' ? '🩺 Finalizado / Realizado' :
                               formData.status === 'finalizado' ? '🔒 Concluído' :
                               formData.status === 'faltou' ? '❌ Faltou' :
                               formData.status === 'cancelado' ? '🚫 Cancelado' : formData.status}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="z-[5000]">
                            <SelectItem value="agendado" className="italic font-bold">🗓️ Agendado</SelectItem>
                            <SelectItem value="confirmado" className="italic font-bold">✅ Confirmado</SelectItem>
                            <SelectItem value="chegou" className="italic font-bold">⏳ Chegou / Em Espera</SelectItem>
                            <SelectItem value="atrasado" className="italic font-bold">⚠️ Atrasado</SelectItem>
                            <SelectItem value="realizado" className="italic font-bold text-indigo-650">🩺 Finalizado / Realizado (Deduz Estoque)</SelectItem>
                            <SelectItem value="finalizado" className="italic font-semibold text-green-600">🔒 Concluído</SelectItem>
                            <SelectItem value="faltou" className="italic font-bold">❌ Faltou</SelectItem>
                            <SelectItem value="cancelado" className="italic font-bold">🚫 Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* PASSO 2: Profissional, Serviço & Pacote */}
                  <div className="p-6 bg-slate-50/70 border border-slate-100/80 rounded-[2rem] space-y-6">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black italic text-xs">2</span>
                      <h3 className="text-indigo-950 font-black text-sm uppercase tracking-wider italic flex items-center gap-1.5 font-sans">
                        <Stethoscope className="w-4 h-4 text-indigo-600" />
                        Profissional & Procedimentos
                      </h3>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider font-sans">Profissional Responsável <span className="text-red-500">*</span></Label>
                      <Select value={formData.professionalId} onValueChange={(v) => setFormData({...formData, professionalId: v})}>
                        <SelectTrigger className="h-12 border-slate-200 bg-white hover:bg-slate-50/50 transition-colors font-bold w-full rounded-xl">
                          <SelectValue placeholder="Selecione o profissional">
                            {professionals.find(p => p.id === formData.professionalId)?.name || 'Selecione o profissional'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="z-[5000]">
                          {professionals.filter(p => p.tipoMembro !== 'gestao').map(p => <SelectItem key={p.id} value={p.id} className="font-bold">{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider font-sans">Serviço / Procedimento <span className="text-red-500">*</span></Label>
                        <Select value={formData.serviceId} onValueChange={handleServiceChange}>
                          <SelectTrigger className="h-12 border-slate-200 bg-white hover:bg-slate-50/50 transition-colors font-bold w-full rounded-xl">
                            <SelectValue placeholder="Nenhum serviço">
                              {formData.serviceId !== 'none' ? services.find(s => s.id === formData.serviceId)?.name : 'Nenhum serviço'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="z-[5000]">
                            <SelectItem value="none" className="italic font-bold">Nenhum serviço</SelectItem>
                            {services
                              .filter(s => {
                                if (!formData.professionalId) return true;
                                if (s.professionalIds && s.professionalIds.length > 0) {
                                  return s.professionalIds.includes(formData.professionalId);
                                }
                                return true;
                              })
                              .map(s => <SelectItem key={s.id} value={s.id} className="font-bold">{s.name} ({s.durationMinutes} min)</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider font-sans">Pacote Associado</Label>
                        <Select value={formData.packageId} onValueChange={handlePackageChange}>
                          <SelectTrigger className="h-12 border-slate-200 bg-white font-bold w-full rounded-xl">
                            <SelectValue placeholder="Nenhum pacote">
                              {formData.packageId !== 'none' ? packages.find(p => p.id === formData.packageId)?.name : 'Nenhum pacote'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="z-[5000]">
                            <SelectItem value="none" className="italic font-bold">Nenhum pacote</SelectItem>
                            {packages
                              .filter(p => {
                                if (!formData.professionalId) return true;
                                if (p.professionalIds && p.professionalIds.length > 0) {
                                  return p.professionalIds.includes(formData.professionalId);
                                }
                                return true;
                              })
                              .map(p => <SelectItem key={p.id} value={p.id} className="italic font-bold">{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {(() => {
                      const selectedService = services.find(s => s.id === formData.serviceId);
                      const selectedPackage = packages.find(p => p.id === formData.packageId);
                      const requirement = getUpfrontRequirement(
                        formData.serviceId !== 'none' ? selectedService : selectedPackage,
                        formData.value || 0
                      );

                      if (!requirement) return null;

                      return (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col gap-3">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-black text-amber-900 uppercase italic tracking-wider">
                                Este {formData.packageId !== 'none' ? 'pacote' : 'procedimento'} exige pagamento antecipado
                              </p>
                              <p className="text-xs text-amber-800 font-semibold leading-snug mt-1">
                                {requirement.sourceName}: caucao/sinal de R$ {formatBRL(requirement.amount)}
                                {requirement.type === 'porcentagem' ? ` (${requirement.value}% do valor)` : ' (valor fixo)'}.
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Button
                              type="button"
                              onClick={() => markUpfrontPaymentPaid(requirement.amount)}
                              className="h-10 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase italic"
                            >
                              Paciente ja pagou
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={markUpfrontPaymentPending}
                              className="h-10 border-amber-200 text-amber-800 hover:bg-amber-100 rounded-xl text-[10px] font-black uppercase italic"
                            >
                              Ainda pendente
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* PASSO 3: Agenda & Horários */}
                  <div className="p-6 bg-slate-50/70 border border-slate-100/80 rounded-[2rem] space-y-6">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black italic text-xs">3</span>
                      <h3 className="text-indigo-950 font-black text-sm uppercase tracking-wider italic flex items-center gap-1.5 font-sans">
                        <CalendarIcon className="w-4 h-4 text-indigo-600" />
                        Agenda & Horários
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2 md:col-span-1">
                        <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider font-sans">Data Atendimento <span className="text-red-500">*</span></Label>
                        <Input className="h-12 border-slate-200 bg-white font-bold rounded-xl" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider font-sans">Início <span className="text-red-500">*</span></Label>
                        <Input className="h-12 border-slate-200 bg-white font-mono font-bold rounded-xl" type="time" value={formData.startTime} onChange={e => handleStartTimeChange(e.target.value)} required />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider font-sans">Previsão Fim <span className="text-red-500">*</span></Label>
                        <Input className="h-12 border-slate-200 bg-white font-mono font-bold rounded-xl" type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} required />
                      </div>
                    </div>

                    {formData.packageId !== 'none' && (() => {
                      const pkg = packages.find(p => p.id === formData.packageId);
                      if (pkg && pkg.totalSessions > 1 && pkg.sessionInterval) {
                        return (
                          <div className="mt-4 bg-indigo-50/80 border border-indigo-100 p-4 rounded-xl flex items-start gap-3">
                            <input 
                              type="checkbox" 
                              id="bulkSchedule" 
                              className="w-5 h-5 mt-1 text-indigo-600 border-indigo-300 rounded focus:ring-indigo-500 transition-all cursor-pointer"
                              checked={bulkSchedule}
                              onChange={e => setBulkSchedule(e.target.checked)}
                            />
                            <div className="cursor-pointer" onClick={() => setBulkSchedule(!bulkSchedule)}>
                              <Label htmlFor="bulkSchedule" className="font-black text-indigo-900 cursor-pointer text-sm block lowercase italic font-sans">
                                agendar todo o tratamento
                              </Label>
                              <p className="text-xs text-indigo-600 font-medium mt-1 leading-tight">
                                Serão criadas automaticamente {pkg.totalSessions} sessões com intervalo de {pkg.sessionInterval} dias entre elas.
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* PASSO 4: Valores & Pagamento */}
                  <div className="p-6 bg-slate-50/70 border border-slate-100/80 rounded-[2rem] space-y-6">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black italic text-xs">4</span>
                      <h3 className="text-indigo-950 font-black text-sm uppercase tracking-wider italic flex items-center gap-1.5 font-sans">
                        <DollarSign className="w-4 h-4 text-indigo-600" />
                        Ajuste de Valores & Pagamento (Opcional)
                      </h3>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white border border-slate-200/80 rounded-2xl select-none">
                      <div className="space-y-0.5">
                        <span className="text-slate-900 font-bold text-xs uppercase italic tracking-wide block">Registrar pagamento do paciente agora?</span>
                        <span className="text-[10px] text-slate-500 font-bold leading-normal block">Marque se o pagamento já foi efetuado ou parcial.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isPaymentRecorded}
                        onChange={(e) => setIsPaymentRecorded(e.target.checked)}
                        className="w-5 h-5 text-indigo-650 border-slate-350 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>

                    {isPaymentRecorded && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider">Valor Cobrado (R$)</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                              <Input 
                                className="h-12 border-slate-200 bg-white pl-10 text-lg font-black italic rounded-xl" 
                                placeholder="0,00"
                                value={displayValue} 
                                onChange={handleValueChange} 
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider">Status do Pagamento</Label>
                            <Select value={formData.paymentStatus} onValueChange={(v) => setFormData({...formData, paymentStatus: v as any})}>
                              <SelectTrigger className="h-12 border-slate-200 bg-white font-bold w-full rounded-xl">
                                <SelectValue placeholder="Pagamento...">
                                  {formData.paymentStatus === 'pendente' ? 'Aguardando Pagamento' :
                                   formData.paymentStatus === 'pago' ? 'Pago Inteiro' :
                                   formData.paymentStatus === 'parcial' ? 'Pago Parcialmente' : formData.paymentStatus}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="z-[5000]">
                                <SelectItem value="pendente" className="italic font-bold">Aguardando Pagamento</SelectItem>
                                <SelectItem value="pago" className="italic font-bold">Pago Inteiro</SelectItem>
                                <SelectItem value="parcial" className="italic font-bold">Pago Parcialmente</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {formData.paymentStatus === 'parcial' && (
                            <div className="space-y-2 animate-in fade-in duration-200">
                              <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider">Valor Pago Parcialmente (R$)</Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                                <Input 
                                  className="h-12 border-slate-200 bg-white pl-10 font-bold rounded-xl"
                                  placeholder="0,00"
                                  value={displayUpfrontPaidValue} 
                                  onChange={handleUpfrontPaidAmountChange} 
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider">Forma de Pagamento</Label>
                          <Select 
                            value={formData.paymentMethod} 
                            onValueChange={(v) => {
                              if (v === 'múltiplo' && (!formData.paymentSplits || formData.paymentSplits.length === 0)) {
                                setFormData({
                                  ...formData,
                                  paymentMethod: v as any,
                                  paymentSplits: [
                                    { method: 'pix', amount: formData.value || 0, status: 'pago', paymentDate: formData.paymentDate || formData.date }
                                  ]
                                });
                              } else {
                                setFormData({...formData, paymentMethod: v as any});
                              }
                            }}
                          >
                            <SelectTrigger className="h-12 border-slate-200 bg-white font-bold w-full rounded-xl">
                              <SelectValue placeholder="Selecione...">
                                {formData.paymentMethod === 'múltiplo' ? 'Múltiplas Formas (Dividido)' : (formData.paymentMethod || 'Selecione...')}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="z-[5000]">
                              <SelectItem value="pix" className="italic font-bold">Pix</SelectItem>
                              <SelectItem value="cartão de crédito" className="italic font-bold">Cartão de Crédito</SelectItem>
                              <SelectItem value="cartão de débito" className="italic font-bold">Cartão de Débito</SelectItem>
                              <SelectItem value="dinheiro" className="italic font-bold">Dinheiro</SelectItem>
                              <SelectItem value="boleto" className="italic font-bold">Boleto</SelectItem>
                              <SelectItem value="múltiplo" className="italic font-bold text-indigo-650 bg-indigo-50/50">Múltiplas Formas (Dividir)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {formData.paymentMethod !== 'múltiplo' && formData.paymentMethod === 'cartão de crédito' && (
                          <div className="space-y-2 animate-in fade-in duration-200 mt-4">
                            <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider">Número de Parcelas</Label>
                            <Select 
                              value={String(formData.cardInstallments || 1)} 
                              onValueChange={(v) => setFormData({...formData, cardInstallments: Number(v)})}
                            >
                              <SelectTrigger className="h-12 border-slate-200 bg-white font-bold w-full rounded-xl">
                                <SelectValue placeholder="Parcelas...">
                                  {formData.cardInstallments ? `${formData.cardInstallments}x` : '1x'}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="z-[5000]">
                                {[...Array(12)].map((_, i) => (
                                  <SelectItem key={i + 1} value={String(i + 1)} className="font-bold italic">
                                    {i + 1}x
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {formData.paymentMethod !== 'múltiplo' && (formData.paymentStatus === 'pago' || formData.paymentStatus === 'parcial') && (
                          <div className="space-y-2 animate-in fade-in duration-200 mt-4">
                            <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider">Data do Pagamento</Label>
                            <Input 
                              type="date" 
                              className="h-12 border-slate-200 bg-white font-bold rounded-xl"
                              value={formData.paymentDate || formData.date} 
                              onChange={e => setFormData({...formData, paymentDate: e.target.value})} 
                            />
                          </div>
                        )}

                        {formData.paymentMethod === 'múltiplo' && (
                          <div className="col-span-1 md:col-span-2 space-y-4 bg-indigo-50/20 p-5 rounded-2xl border border-indigo-100/50 mt-4 animate-in fade-in duration-200 w-full">
                            <div className="flex justify-between items-center">
                              <Label className="text-indigo-900 font-extrabold italic text-xs uppercase tracking-wider">Múltiplas Formas de Pagamento (Divisão)</Label>
                              <Button
                                type="button"
                                size="sm"
                                className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase rounded-xl h-8 cursor-pointer border-none"
                                onClick={() => {
                                  const splits = formData.paymentSplits || [];
                                  const currentTotal = splits.reduce((sum, s) => sum + s.amount, 0);
                                  const remaining = Math.max(0, (formData.value || 0) - currentTotal);
                                  setFormData({
                                    ...formData,
                                    paymentSplits: [
                                      ...splits,
                                      { method: 'pix', amount: remaining, status: 'pago', paymentDate: formData.date }
                                    ]
                                  });
                                  setDisplaySplits([
                                    ...displaySplits,
                                    remaining === 0 ? '' : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(remaining)
                                  ]);
                                }}
                              >
                                + Adicionar Forma
                              </Button>
                            </div>

                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                              {(formData.paymentSplits || []).map((split, index) => (
                                <div key={index} className="bg-white p-3 rounded-xl border border-slate-150 shadow-sm flex flex-col md:flex-row items-center gap-3">
                                  <div className="flex-1 w-full">
                                    <Label className="text-[9px] text-slate-400 font-bold uppercase mb-1 block">Forma</Label>
                                    <Select 
                                      value={split.method} 
                                      onValueChange={(v) => {
                                        const splits = [...(formData.paymentSplits || [])];
                                        splits[index] = { ...split, method: v as any };
                                        setFormData({ ...formData, paymentSplits: splits });
                                      }}
                                    >
                                      <SelectTrigger className="h-10 border-slate-200 text-xs font-bold w-full rounded-lg bg-white">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="z-[6000]">
                                        <SelectItem value="pix">Pix</SelectItem>
                                        <SelectItem value="cartão de crédito">Cartão de Crédito</SelectItem>
                                        <SelectItem value="cartão de débito">Cartão de Débito</SelectItem>
                                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                        <SelectItem value="boleto">Boleto</SelectItem>
                                        <SelectItem value="transferência">Transferência</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="w-full md:w-32">
                                    <Label className="text-[9px] text-slate-400 font-bold uppercase mb-1 block">Valor (R$)</Label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 font-mono">R$</span>
                                      <Input
                                        type="text"
                                        placeholder="0,00"
                                        className="pl-8 h-10 border-slate-200 text-xs font-bold w-full rounded-lg font-mono"
                                        value={displaySplits[index] || ''}
                                        onChange={(e) => handleSplitValueChange(index, e.target.value)}
                                      />
                                    </div>
                                  </div>

                                  {split.method === 'cartão de crédito' && (
                                    <div className="w-full md:w-20">
                                      <Label className="text-[9px] text-slate-400 font-bold uppercase mb-1 block">Parcelas</Label>
                                      <Select 
                                        value={String(split.installments || 1)} 
                                        onValueChange={(v) => {
                                          const splits = [...(formData.paymentSplits || [])];
                                          splits[index] = { ...split, installments: Number(v) };
                                          setFormData({ ...formData, paymentSplits: splits });
                                        }}
                                      >
                                        <SelectTrigger className="h-10 border-slate-200 text-xs font-bold w-full rounded-lg bg-white">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="z-[6000]">
                                          {[...Array(12)].map((_, i) => (
                                            <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}x</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}

                                  <div className="w-full md:w-28">
                                    <Label className="text-[9px] text-slate-400 font-bold uppercase mb-1 block">Status</Label>
                                    <Select 
                                      value={split.status} 
                                      onValueChange={(v) => {
                                        const splits = [...(formData.paymentSplits || [])];
                                        splits[index] = { ...split, status: v as any };
                                        setFormData({ ...formData, paymentSplits: splits });
                                      }}
                                    >
                                      <SelectTrigger className="h-10 border-slate-200 text-xs font-bold w-full rounded-lg bg-white">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="z-[6000]">
                                        <SelectItem value="pago">Pago</SelectItem>
                                        <SelectItem value="pendente">Pendente</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {split.status === 'pago' && (
                                    <div className="w-full md:w-36">
                                      <Label className="text-[9px] text-slate-400 font-bold uppercase mb-1 block">Data Pagto.</Label>
                                      <Input
                                        type="date"
                                        className="h-10 border-slate-200 text-xs font-bold w-full rounded-lg"
                                        value={split.paymentDate || formData.date}
                                        onChange={(e) => {
                                          const splits = [...(formData.paymentSplits || [])];
                                          splits[index] = { ...split, paymentDate: e.target.value };
                                          setFormData({ ...formData, paymentSplits: splits });
                                        }}
                                      />
                                    </div>
                                  )}

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-red-500 hover:text-red-750 hover:bg-red-50 mt-4 shrink-0 rounded-xl cursor-pointer"
                                    onClick={() => {
                                      const splits = (formData.paymentSplits || []).filter((_, i) => i !== index);
                                      setFormData({ ...formData, paymentSplits: splits });
                                      setDisplaySplits(displaySplits.filter((_, i) => i !== index));
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}

                              {(formData.paymentSplits || []).length === 0 && (
                                <p className="text-slate-400 font-bold text-xs italic text-center py-4">Nenhuma forma de pagamento adicionada.</p>
                              )}
                            </div>

                            {/* Resumo do Split */}
                            {(() => {
                              const splits = formData.paymentSplits || [];
                              const totalSplits = splits.reduce((sum, s) => sum + s.amount, 0);
                              const totalPaid = splits.filter(s => s.status === 'pago').reduce((sum, s) => sum + s.amount, 0);
                              const apptValue = formData.value || 0;
                              const matchesTotal = Math.abs(totalSplits - apptValue) < 0.01;

                              return (
                                <div className="pt-3 border-t border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 font-sans text-xs">
                                  <div className="space-y-1">
                                    <div className="flex gap-2">
                                      <span className="text-slate-500 font-bold">Lançado: R$ {totalSplits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                      <span className="text-slate-350">•</span>
                                      <span className="text-green-600 font-bold">Pago: R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="font-extrabold text-[10px] uppercase text-indigo-700">
                                      Total Cobrado: R$ {apptValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                  </div>
                                  <div className={cn(
                                    "px-3 py-1 rounded-full font-black text-[10px] uppercase border tracking-wider",
                                    matchesTotal ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200 animate-pulse"
                                  )}>
                                    {matchesTotal ? 'Valores Fecham' : `Diferença: R$ ${(apptValue - totalSplits).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* DYNAMIC UPFRONT PAYMENT CALCULATION & REQUIREMENT ZONE */}
                    {(() => {
                      const selectedService = services.find(s => s.id === formData.serviceId);
                      const selectedPackage = packages.find(p => p.id === formData.packageId);
                      const requirement = getUpfrontRequirement(
                        formData.serviceId !== 'none' ? selectedService : selectedPackage,
                        formData.value || 0
                      );

                      if (!requirement) return null;

                      return (
                        <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200/80 space-y-4 animate-fadeIn">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
                            <h4 className="text-xs font-black text-amber-900 uppercase italic tracking-wider">
                              Sinal Solicitado por Antecipação
                            </h4>
                          </div>
                          
                          <p className="text-xs text-amber-700 leading-snug font-medium">
                            Este item requer garantia {requirement.type === 'porcentagem' ? `${requirement.value}% do total` : `R$ ${formatBRL(requirement.value)} fixo`}.
                          </p>

                          <div className="flex justify-between items-center py-2 border-y border-amber-200/50 font-sans">
                            <span className="text-xs font-bold text-amber-800 uppercase italic">Valor do Sinal Estimado:</span>
                            <span className="text-base font-black text-amber-950 font-mono">
                              R$ {formatBRL(requirement.amount)}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-amber-900 font-extrabold text-[11px] uppercase italic">O Cliente já Pagou o Sinal?</Label>
                            <div className="flex bg-white rounded-xl border border-amber-200 p-1 shadow-sm">
                              <button
                                type="button"
                                onClick={() => markUpfrontPaymentPaid(requirement.amount)}
                                className={cn(
                                  "flex-1 py-1 px-3 font-semibold text-[10px] uppercase italic rounded-lg transition-all cursor-pointer",
                                  formData.upfrontPaid ? "bg-amber-600 text-white shadow-sm font-black" : "text-amber-700 hover:bg-slate-50"
                                )}
                              >
                                Sim, Pago
                              </button>
                              <button
                                type="button"
                                onClick={markUpfrontPaymentPending}
                                className={cn(
                                  "flex-1 py-1 px-3 font-semibold text-[10px] uppercase italic rounded-lg transition-all cursor-pointer",
                                  !formData.upfrontPaid ? "bg-slate-200 text-slate-700 font-black" : "text-amber-700 hover:bg-slate-50"
                                )}
                              >
                                Não, pendente
                              </button>
                            </div>
                          </div>

                          {formData.upfrontPaid && (
                            <div className="space-y-2 pt-1 animate-fadeIn">
                              <Label className="text-amber-900 font-extrabold text-[10px] uppercase italic">Confirmar Valor Recebido do Sinal (R$)</Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs font-mono">R$</span>
                                <Input
                                  placeholder="0,00"
                                  className="h-10 bg-white border-slate-200 rounded-xl pl-9 font-bold text-xs"
                                  value={displayUpfrontPaidValue}
                                  onChange={handleUpfrontPaidAmountChange}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* SUPPORTS SUPPLY ZONE COLLAPSE */}
                  {(formData.status === 'realizado' || formData.status === 'finalizado') && customItemsUsed.length > 0 && (
                    <div className="p-6 bg-slate-900 text-white rounded-[2rem] space-y-4 shadow-xl col-span-1 lg:col-span-2 animate-in fade-in duration-200">
                      <div className="flex items-start gap-3 mb-2">
                        <Package className="w-5 h-5 text-indigo-400 mt-1 shrink-0" />
                        <div>
                          <h3 className="font-extrabold text-sm italic uppercase tracking-wider text-indigo-100">
                            Consumo Real de Insumos
                          </h3>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {customItemsUsed.map((itemUsed, idx) => {
                          const invItem = inventory?.find(i => i.id === itemUsed.itemId);
                          if (!invItem) return null;
                          return (
                            <div key={itemUsed.itemId} className="p-3 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-100 font-sans truncate pr-2">{invItem.name}</span>
                              <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newQty = Math.max(0, itemUsed.quantity - 1);
                                    setCustomItemsUsed(prev => prev.map((item, i) => i === idx ? { ...item, quantity: newQty } : item));
                                  }}
                                  className="w-6 h-6 rounded bg-slate-900 text-xs font-black font-mono text-slate-200 hover:text-white"
                                >
                                  -
                                </button>
                                <span className="font-mono font-black text-xs text-indigo-400 w-4 text-center">{itemUsed.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newQty = itemUsed.quantity + 1;
                                    setCustomItemsUsed(prev => prev.map((item, i) => i === idx ? { ...item, quantity: newQty } : item));
                                  }}
                                  className="w-6 h-6 rounded bg-slate-900 text-xs font-black font-mono text-slate-200 hover:text-white"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* PASSO 5: Notas Clínicas & Opção Caso de Estudo */}
                  <div className="p-6 bg-slate-50/70 border border-slate-100/80 rounded-[2rem] space-y-6 lg:col-span-2">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black italic text-xs">5</span>
                      <h3 className="text-indigo-950 font-black text-sm uppercase tracking-wider italic flex items-center gap-1.5 font-sans">
                        🩺 Prontuário & Notas Clínicas
                      </h3>
                    </div>

                    <div className="space-y-2">
                      <Label className={cn(
                        "font-bold italic text-xs uppercase tracking-wider flex items-center gap-1.5",
                        (formData.status === 'realizado' || formData.status === 'finalizado') ? "text-red-600" : "text-slate-700"
                      )}>
                        Diagnóstico / Evolução Clínica
                        {(formData.status === 'realizado' || formData.status === 'finalizado') && (
                          <span className="text-red-500 font-extrabold">* (Obrigatório para Conclusão)</span>
                        )}
                      </Label>
                      <textarea 
                        className={cn(
                          "w-full min-h-[140px] p-4 bg-white border rounded-xl font-medium text-slate-700 text-sm focus-visible:outline-none focus-visible:ring-2 transition-all resize-none",
                          (formData.status === 'realizado' || formData.status === 'finalizado') && !formData.notes.trim()
                            ? "border-red-300 focus-visible:ring-red-500 bg-red-50/20"
                            : "border-slate-200 focus-visible:ring-indigo-500"
                        )}
                        placeholder={(formData.status === 'realizado' || formData.status === 'finalizado') ? "Descreva a conclusão deste caso, procedimentos realizados, estado do paciente e o que fazer no retorno..." : "Exame físico programado, recomendações, avisos, etc..."}
                        value={formData.notes || ''}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                      />
                    </div>

                    <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200 select-none">
                      <input 
                        type="checkbox"
                        id="caseStudyModalCheck"
                        className="w-4.5 h-4.5 rounded text-indigo-600 border-indigo-300 focus:ring-indigo-500 cursor-pointer"
                        checked={formData.isCaseStudy}
                        onChange={e => setFormData({ ...formData, isCaseStudy: e.target.checked })}
                      />
                      <label htmlFor="caseStudyModalCheck" className="text-slate-700 font-bold text-xs uppercase italic cursor-pointer">
                        Caso para estudo (complexo)
                      </label>
                    </div>
                  </div>
              </div>
              )}
            </div>
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 shrink-0 flex items-center justify-between rounded-none w-full">
            <div className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1">
                {validationError && (
                  <div className="flex items-center gap-2 text-red-500 font-bold italic text-sm animate-in fade-in slide-in-from-right-2">
                    <AlertTriangle className="w-4 h-4" />
                    {validationError}
                  </div>
                )}
              </div>
              <div className="flex gap-4 shrink-0">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-14 px-8 font-bold text-slate-500 hover:text-red-655 transition-colors lowercase italic tracking-wider uppercase text-xs">
                  cancelar
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 h-14 px-12 font-black text-lg shadow-xl shadow-indigo-100 rounded-2xl min-w-[280px] transition-all hover:scale-[1.02] active:scale-[0.98] lowercase italic tracking-wider uppercase text-xs">
                  {isRescheduling ? 'confirmar reagendamento' : appointmentId ? 'salvar alterações' : 'salvar agendamento'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Availability Alert Modal */}
    <Dialog open={showAvailabilityDialog} onOpenChange={setShowAvailabilityDialog}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-indigo-600 p-6 text-white flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-black lowercase italic">Horário Fora do Turno</DialogTitle>
          <DialogDescription className="text-indigo-100 mt-2 font-medium lowercase italic">
            O profissional selecionado não atende neste horário.
          </DialogDescription>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 italic">Turno do Profissional</p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xl font-black text-indigo-900 italic">
                  {professionals.find(p => p.id === formData.professionalId)?.workingHours?.start} - {professionals.find(p => p.id === formData.professionalId)?.workingHours?.end}
                </p>
              </div>
              <Badge className="bg-indigo-600 text-white border-none lowercase italic">Fora do Horário</Badge>
            </div>
          </div>

          <div className="space-y-3">
             <Button 
               className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 font-black text-lg shadow-xl shadow-indigo-100 rounded-2xl lowercase italic"
               onClick={() => {
                 setShowAvailabilityDialog(false);
                 const isConcluded = formData.status === 'realizado' || formData.status === 'finalizado';
                 const conflict = isConcluded ? null : appointments.find(a => 
                   a.id !== appointmentId &&
                   a.professionalId === formData.professionalId &&
                   a.date === formData.date &&
                   ['agendado', 'confirmado', 'chegou', 'atrasado'].includes(a.status) &&
                   (
                     (formData.startTime >= a.startTime && formData.startTime < a.endTime) ||
                     (formData.endTime > a.startTime && formData.endTime <= a.endTime) ||
                     (formData.startTime <= a.startTime && formData.endTime >= a.endTime)
                   )
                 );
             
                 if (conflict) {
                   setConflictingAppointment(conflict);
                   setShowConflictDialog(true);
                   return;
                 }
                 
                 saveAppointment();
               }}
             >
               confirmar mesmo assim
             </Button>
             <Button 
               variant="outline"
               className="w-full h-12 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold lowercase italic"
               onClick={() => setShowAvailabilityDialog(false)}
             >
               ajustar horário
             </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Conflict Alert Modal */}
    <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-amber-500 p-6 text-white flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-black lowercase">conflito de horário</DialogTitle>
          <DialogDescription className="text-amber-50 mt-2 font-medium lowercase">
            já existe um paciente agendado para este profissional neste período.
          </DialogDescription>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-[10px] lowercase text-slate-400 font-bold mb-2">agendamento existente</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 lowercase">{patients.find(p => p.id === conflictingAppointment?.patientId)?.name.toLowerCase()}</p>
                <p className="text-sm text-slate-500 lowercase">{conflictingAppointment?.startTime} - {conflictingAppointment?.endTime}</p>
              </div>
              <Badge className="bg-amber-100 text-amber-700 border-none lowercase italic">{conflictingAppointment?.status.toLowerCase()}</Badge>
            </div>
          </div>

          <div className="space-y-3">
             <Button 
               className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 font-bold lowercase italic"
               onClick={() => setShowConflictDialog(false)}
             >
               reagendar novo paciente (ajustar este horário)
             </Button>
             <Button 
               variant="outline"
               className="w-full h-12 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold lowercase italic"
               onClick={openRescheduleDialog}
             >
               reagendar paciente anterior (mover existente)
             </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Reschedule Existing Form Modal */}
    <Dialog open={showRescheduleExistingDialog} onOpenChange={setShowRescheduleExistingDialog}>
      <DialogContent className="max-w-md bg-white p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-indigo-600 p-6 text-white">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Reagendar Paciente Anterior
          </DialogTitle>
          <DialogDescription className="text-indigo-100 mt-1">
            Escolha um novo horário para {patients.find(p => p.id === conflictingAppointment?.patientId)?.name}
          </DialogDescription>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-700 font-bold">Nova Data</Label>
            <Input 
              type="date" 
              className="h-12 border-slate-200 bg-slate-50"
              value={rescheduleData.date}
              onChange={e => setRescheduleData({...rescheduleData, date: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-700 font-bold">Início</Label>
              <Input 
                type="time" 
                className="h-12 border-slate-200 bg-slate-50"
                value={rescheduleData.startTime}
                onChange={e => setRescheduleData({...rescheduleData, startTime: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-bold">Fim</Label>
              <Input 
                type="time" 
                className="h-12 border-slate-200 bg-slate-50"
                value={rescheduleData.endTime}
                onChange={e => setRescheduleData({...rescheduleData, endTime: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-2">
             <Button 
               className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 font-bold"
               onClick={handleRescheduleExisting}
             >
               Confirmar Reagendamento e Criar Novo
             </Button>
             <Button 
               variant="ghost"
               className="w-full h-10 text-slate-500 hover:text-slate-700"
               onClick={() => setShowRescheduleExistingDialog(false)}
             >
               Voltar
             </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Confirm Automatic Follow-Up Appointment Modal */}
    <Dialog open={showFollowUpConfirm} onOpenChange={setShowFollowUpConfirm}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-[2rem] bg-indigo-950 text-white z-[6000]">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <RefreshCcw className="w-6 h-6 text-indigo-300 animate-spin-slow" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black italic uppercase tracking-wider text-white">Confirmar Retorno</DialogTitle>
              <DialogDescription className="text-indigo-200 mt-1 font-semibold text-xs lowercase">
                este procedimento exige um retorno pós-atendimento.
              </DialogDescription>
            </div>
          </div>

          <div className="space-y-4 bg-white/5 border border-white/10 p-5 rounded-2xl">
            <p className="text-xs font-bold leading-relaxed text-indigo-100">
              O procedimento <strong className="text-white capitalize">{services.find(s => s.id === formData.serviceId)?.name}</strong> está configurado para gerar um retorno automático após <strong className="text-white">{services.find(s => s.id === formData.serviceId)?.followUpDays} dias</strong>.
            </p>
            <div className="space-y-2">
              <Label className="text-[10px] text-indigo-300 font-black uppercase tracking-widest block italic">Confirmar data do retorno:</Label>
              <Input 
                type="date" 
                className="h-12 bg-white/10 border-white/20 text-white font-bold rounded-xl focus:ring-indigo-500" 
                value={confirmedFollowUpDate} 
                onChange={e => setConfirmedFollowUpDate(e.target.value)} 
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              type="button"
              onClick={handleConfirmFollowUp}
              className="w-full h-12 bg-white text-indigo-950 hover:bg-indigo-50 font-black italic rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
            >
              Confirmar e Agendar Retorno
            </Button>
            <Button 
              type="button"
              variant="ghost"
              onClick={handleSkipFollowUp}
              className="w-full h-12 text-indigo-300 hover:text-white hover:bg-white/5 font-bold italic rounded-xl text-xs uppercase tracking-wider"
            >
              Não agendar retorno por enquanto
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
