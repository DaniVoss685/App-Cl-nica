import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Stethoscope, CheckCircle2, Clock, AlertCircle, DollarSign, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { PaymentSplit } from '../../types';

export function GlobalCheckoutModal() {
  const { 
    appointments, 
    patients, 
    services, 
    updateAppointment, 
    postponedCheckouts, 
    setPostponedCheckout, 
    removePostponedCheckout 
  } = useStore();
  
  const [open, setOpen] = useState(false);
  const [dueAppointment, setDueAppointment] = useState<any>(null);
  
  // Form states inside the checkout process
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [notes, setNotes] = useState('');
  const [paymentStatus, setPaymentStatusState] = useState<'pendente' | 'pago' | 'parcial'>('pendente');
  const [upfrontPaidAmountInput, setUpfrontPaidAmountInput] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartão de crédito' | 'cartão de débito' | 'dinheiro' | 'boleto' | 'transferência' | 'múltiplo' | ''>('');
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [cardInstallments, setCardInstallments] = useState<number>(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [displaySplits, setDisplaySplits] = useState<string[]>([]);

  // Custom delay state & confirmation screen state
  const [customDelay, setCustomDelay] = useState('');
  const [postponeConfirmData, setPostponeConfirmData] = useState<{
    minutes: number;
    patientName: string;
    alertTime: string;
  } | null>(null);

  // Periodic checkout check
  useEffect(() => {
    const checkCheckouts = () => {
      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');
      
      const found = appointments.find(app => {
        if (app.date !== todayStr) return false;
        // Target active check-ins that are still in progress
        if (app.status !== 'chegou') return false;

        const [hours, minutes] = app.endTime.split(':').map(Number);
        const appEndTime = new Date(now);
        appEndTime.setHours(hours, minutes, 0, 0);

        // Has the scheduled appointment time ended?
        const isTimeOver = now.getTime() >= appEndTime.getTime();
        if (!isTimeOver) return false;

        // Is it postponed?
        const postponedTime = postponedCheckouts[app.id];
        if (postponedTime && now.getTime() < postponedTime) return false;

        return true;
      });

      if (found && !open && !postponeConfirmData) {
        setDueAppointment(found);
        // Pre-fill amount based on appointment value
        const initialVal = found.value !== undefined ? found.value : 0;
        setPaymentAmount(new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(initialVal));
        setNotes('');
        setPaymentStatusState(found.paymentStatus || 'pendente');
        setUpfrontPaidAmountInput(found.upfrontPaidAmount ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(found.upfrontPaidAmount) : '');
        setPaymentDate(found.paymentDate || found.date || '');
        setPaymentMethod(String(found.paymentMethod || '').toLowerCase() as any);
        setCardInstallments(found.cardInstallments || 1);
        setPaymentSplits(found.paymentSplits || []);
        if (found.paymentSplits) {
          setDisplaySplits(found.paymentSplits.map(s => s.amount ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(s.amount) : ''));
        } else {
          setDisplaySplits([]);
        }
        setShowCheckoutForm(false);
        setValidationError(null);
        setOpen(true);
      }
    };

    const interval = setInterval(checkCheckouts, 15000); // Check every 15s
    checkCheckouts(); // Initial check

    return () => clearInterval(interval);
  }, [appointments, open, postponedCheckouts, postponeConfirmData]);

  // Listener for custom trigger event
  useEffect(() => {
    const handleOpenCheckout = (e: Event) => {
      const customEv = e as CustomEvent;
      const apptId = customEv.detail?.appointmentId;
      const app = appointments.find(a => a.id === apptId);
      if (app) {
        setDueAppointment(app);
        const initialVal = app.value !== undefined ? app.value : 0;
        setPaymentAmount(new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(initialVal));
        setNotes(app.notes || '');
        setPaymentStatusState(app.paymentStatus || 'pendente');
        setUpfrontPaidAmountInput(app.upfrontPaidAmount ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(app.upfrontPaidAmount) : '');
        setPaymentDate(app.paymentDate || app.date || '');
        setPaymentMethod(String(app.paymentMethod || '').toLowerCase() as any);
        setCardInstallments(app.cardInstallments || 1);
        setPaymentSplits(app.paymentSplits || []);
        if (app.paymentSplits) {
          setDisplaySplits(app.paymentSplits.map(s => s.amount ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(s.amount) : ''));
        } else {
          setDisplaySplits([]);
        }
        setShowCheckoutForm(false);
        setValidationError(null);
        setPostponeConfirmData(null);
        setOpen(true);
      }
    };

    window.addEventListener('open-checkout-modal', handleOpenCheckout);
    return () => window.removeEventListener('open-checkout-modal', handleOpenCheckout);
  }, [appointments]);

  const handlePostpone = (minutes: number) => {
    if (dueAppointment) {
      const resumeTime = Date.now() + minutes * 60000;
      setPostponedCheckout(dueAppointment.id, resumeTime);
      
      const pat = patients.find(p => p.id === dueAppointment.patientId);
      const patientName = pat?.name || 'Paciente';
      const alertTime = format(new Date(resumeTime), 'HH:mm');

      setPostponeConfirmData({
        minutes,
        patientName,
        alertTime
      });
    }
  };

  const handleCustomPostpone = () => {
    const minutes = parseInt(customDelay, 10);
    if (isNaN(minutes) || minutes <= 0) {
      toast.error('Por favor, informe um tempo válido em minutos.');
      return;
    }
    handlePostpone(minutes);
    setCustomDelay('');
  };

  const handleConfirmClose = () => {
    setPostponeConfirmData(null);
    setDueAppointment(null);
    setOpen(false);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numericValue = Number(rawValue) / 100;
    
    if (isNaN(numericValue)) return;
    
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
    
    setPaymentAmount(formatted === '0,00' && rawValue === '' ? '' : formatted);
  };

  const handleUpfrontPaidAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numericValue = Number(rawValue) / 100;
    
    if (isNaN(numericValue)) return;
    
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
    
    setUpfrontPaidAmountInput(formatted === '0,00' && rawValue === '' ? '' : formatted);
  };

  const handleSplitValueChange = (index: number, valStr: string) => {
    const rawValue = valStr.replace(/\D/g, '');
    const numericValue = rawValue === '' ? 0 : Number(rawValue) / 100;
    if (isNaN(numericValue)) return;
    
    const splits = [...paymentSplits];
    splits[index] = { ...splits[index], amount: numericValue };
    setPaymentSplits(splits);
    
    const newDisplays = [...displaySplits];
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
    newDisplays[index] = formatted === '0,00' && rawValue === '' ? '' : formatted;
    setDisplaySplits(newDisplays);
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueAppointment) return;

    if (!notes.trim()) {
      setValidationError('Por favor, preencha o diagnóstico / notas clínicas para concluir.');
      return;
    }

    if (paymentStatus !== 'pendente' && !paymentMethod) {
      setValidationError('Por favor, selecione a forma de pagamento.');
      return;
    }

    const numericAmount = Number(paymentAmount.replace(/\./g, '').replace(',', '.')) || 0;
    let numericUpfrontPaid = paymentStatus === 'parcial'
      ? (Number(upfrontPaidAmountInput.replace(/\./g, '').replace(',', '.')) || 0)
      : (paymentStatus === 'pago' ? numericAmount : 0);

    let finalPaymentStatus = paymentStatus;

    if (paymentMethod === 'múltiplo') {
      const totalSplits = paymentSplits.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(totalSplits - numericAmount) > 0.01) {
        setValidationError('A soma das formas de pagamento deve ser igual ao valor cobrado (R$ ' + numericAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ').');
        return;
      }
      if (paymentSplits.length === 0) {
        setValidationError('Por favor, adicione pelo menos uma forma de pagamento para divisão.');
        return;
      }

      const allPaid = paymentSplits.every(s => s.status === 'pago');
      const allPending = paymentSplits.every(s => s.status === 'pendente');
      finalPaymentStatus = allPaid ? 'pago' : (allPending ? 'pendente' : 'parcial');
      numericUpfrontPaid = paymentSplits.filter(s => s.status === 'pago').reduce((sum, s) => sum + s.amount, 0);
    } else {
      if (paymentStatus === 'parcial') {
        if (numericUpfrontPaid <= 0) {
          setValidationError('Por favor, informe um valor pago parcialmente válido.');
          return;
        }
        if (numericUpfrontPaid >= numericAmount) {
          setValidationError('O valor pago parcialmente deve ser menor que o valor total cobrado. Caso tenha sido pago por completo, escolha "Pago Inteiro".');
          return;
        }
      }
    }

    const normalizedPaymentMethod = paymentMethod === 'pix' ? 'Pix' :
                                    paymentMethod === 'cartão de crédito' ? 'Cartão de Crédito' :
                                    paymentMethod === 'cartão de débito' ? 'Cartão de Débito' :
                                    paymentMethod === 'dinheiro' ? 'Dinheiro' :
                                    paymentMethod === 'boleto' ? 'Boleto' : paymentMethod;

    // Update appointment as completed/realizado, saving notes and payment info
    updateAppointment(dueAppointment.id, {
      status: 'realizado',
      notes: notes.trim(),
      paymentStatus: finalPaymentStatus,
      paymentMethod: paymentMethod === 'múltiplo' ? 'múltiplo' : (paymentStatus !== 'pendente' && paymentMethod ? (normalizedPaymentMethod as any) : undefined),
      cardInstallments: paymentMethod !== 'múltiplo' && paymentStatus !== 'pendente' && paymentMethod === 'cartão de crédito' ? cardInstallments : undefined,
      value: numericAmount,
      upfrontPaid: numericUpfrontPaid > 0,
      upfrontPaidAmount: numericUpfrontPaid,
      paymentDate: paymentStatus !== 'pendente' ? (paymentDate || dueAppointment.date) : undefined,
      paymentSplits: paymentMethod === 'múltiplo' ? paymentSplits : undefined
    });

    removePostponedCheckout(dueAppointment.id); // clear countdown timer

    setOpen(false);
    toast.success('Atendimento concluído e registrado com sucesso!');
  };

  if (!dueAppointment && !postponeConfirmData) return null;

  const patient = dueAppointment ? patients.find(p => p.id === dueAppointment.patientId) : null;
  const service = dueAppointment ? services.find(s => s.id === dueAppointment.serviceId) : null;

  const numericAmount = Number(paymentAmount.replace(/\./g, '').replace(',', '.')) || 0;

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) {
        setPostponeConfirmData(null);
        setDueAppointment(null);
      }
      setOpen(val);
    }}>
      <DialogContent className="sm:max-w-lg bg-white border-2 border-indigo-150 z-[100] p-0 overflow-hidden shadow-2xl rounded-[2rem]">
        {postponeConfirmData ? (
          /* Confirmation Screen when postponed */
          <div className="p-8 flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center animate-bounce">
              <Clock className="w-8 h-8 text-indigo-600 animate-pulse" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-xl font-black text-slate-800 uppercase italic tracking-wider">
                Lembrete Adiado
              </DialogTitle>
              <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
                O atendimento de <strong className="text-indigo-950 font-bold capitalize">{postponeConfirmData.patientName}</strong> foi adiado com sucesso por <strong className="text-indigo-950 font-extrabold">{postponeConfirmData.minutes} minutos</strong>.
              </p>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider bg-slate-50 border border-slate-100 py-2 px-4 rounded-xl mt-3">
                Novo lembrete agendado para às {postponeConfirmData.alertTime}
              </p>
            </div>
            <Button
              onClick={handleConfirmClose}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black italic rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              Entendido
            </Button>
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div className="bg-indigo-950 text-white p-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <DialogTitle className="text-base font-black italic uppercase tracking-wider text-white">Concluir Atendimento</DialogTitle>
                <DialogDescription className="text-indigo-200 mt-0.5 font-bold text-[10px] uppercase tracking-wide">
                  O horário programado para o procedimento chegou ao fim
                </DialogDescription>
              </div>
            </div>

            {!showCheckoutForm ? (
              /* Step 1: Ask if completed or still in session */
              <div className="p-8 space-y-6">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest italic">Paciente & Procedimento</p>
                  <h4 className="text-slate-900 font-black text-lg truncate capitalize">{patient?.name || 'Não identificado'}</h4>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Profissional</p>
                      <p className="text-slate-700 font-bold text-xs">Dr(a). {useStore.getState().professionals.find(p => p.id === dueAppointment.professionalId)?.name || 'Clínica'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Procedimento</p>
                      <p className="text-slate-700 font-bold text-xs truncate capitalize">{service?.name || dueAppointment.type}</p>
                    </div>
                  </div>

                  <div className="h-px bg-slate-200/50 my-2" />

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Horário agendado: {dueAppointment.startTime} às {dueAppointment.endTime}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-normal text-center px-4 font-medium">
                  O horário programado terminou. O procedimento foi concluído com sucesso ou o paciente ainda está em atendimento?
                </p>

                <div className="flex flex-col gap-4">
                  <Button 
                    onClick={() => setShowCheckoutForm(true)}
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black italic rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Sim, terminou! Dar baixa
                  </Button>

                  <div className="border-t border-slate-100 my-1" />

                  <div className="space-y-2">
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest text-center">Ainda em atendimento? Lembrar em:</p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant="outline"
                        onClick={() => handlePostpone(10)}
                        className="h-11 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl uppercase italic tracking-wider shadow-sm cursor-pointer"
                      >
                        ⏳ 10 minutos
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handlePostpone(15)}
                        className="h-11 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl uppercase italic tracking-wider shadow-sm cursor-pointer"
                      >
                        ⏳ 15 minutos
                      </Button>
                    </div>

                    <div className="flex gap-2 items-center pt-1.5">
                      <div className="relative flex-1">
                        <Input 
                          type="number" 
                          min="1" 
                          placeholder="Tempo personalizado..." 
                          value={customDelay}
                          onChange={e => setCustomDelay(e.target.value)}
                          className="h-11 pr-16 border-slate-200 rounded-xl text-xs font-bold font-sans"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[9px] uppercase tracking-wider">minutos</span>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleCustomPostpone}
                        className="h-11 px-4 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-xs rounded-xl uppercase italic tracking-wider cursor-pointer shrink-0"
                      >
                        Prorrogar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Step 2: Checkout details form */
              <div className="p-8 space-y-5">
                {validationError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700 font-semibold text-xs leading-normal animate-shake">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{validationError}</span>
                  </div>
                )}

                {/* Notes / Diagnóstico */}
                <div className="space-y-2">
                  <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider flex items-center gap-1">
                    Evolução Clínica / Diagnóstico <span className="text-red-500 font-black">*</span>
                  </Label>
                  <textarea
                    className="w-full min-h-[100px] p-4 bg-slate-55/10 border border-slate-200 rounded-xl font-medium text-slate-700 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-all resize-none"
                    placeholder="Descreva brevemente os procedimentos realizados, observações clínicas ou orientações para a evolução deste caso..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>

                {/* Payment Selector */}
                <div className="space-y-2">
                  <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider">Status do Pagamento</Label>
                  <select
                    value={paymentStatus}
                    onChange={e => setPaymentStatusState(e.target.value as any)}
                    className="h-11 w-full border border-slate-200 bg-white font-bold text-xs rounded-xl px-3 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="pendente">Aguardando Pagamento</option>
                    <option value="pago">Pago Inteiro</option>
                    <option value="parcial">Pago Parcialmente</option>
                  </select>
                </div>

                {/* Payment Fields (Conditional) */}
                {paymentStatus !== 'pendente' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 border border-slate-100 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-indigo-500" /> Valor Cobrado
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                        <Input
                          className="h-11 border-slate-200 bg-white pl-8 text-sm font-black italic rounded-xl"
                          value={paymentAmount}
                          onChange={handleValueChange}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider">Forma de Pagamento</Label>
                      <select
                        value={paymentMethod}
                        onChange={e => {
                          const v = e.target.value;
                          if (v === 'múltiplo' && (!paymentSplits || paymentSplits.length === 0)) {
                            setPaymentMethod('múltiplo');
                            setPaymentSplits([
                              { method: 'pix', amount: numericAmount, status: 'pago', paymentDate: paymentDate || (dueAppointment ? dueAppointment.date : '') }
                            ]);
                          } else {
                            setPaymentMethod(v as any);
                          }
                        }}
                        className="h-11 w-full border border-slate-200 bg-white font-bold text-xs rounded-xl px-3 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="">Selecione...</option>
                        <option value="pix">Pix</option>
                        <option value="cartão de crédito">Cartão de Crédito</option>
                        <option value="cartão de débito">Cartão de Débito</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="boleto">Boleto</option>
                        <option value="múltiplo">Múltiplas Formas (Dividir)</option>
                      </select>
                    </div>

                    {paymentMethod !== 'múltiplo' && paymentStatus === 'parcial' && (
                      <div className="space-y-2 md:col-span-2 animate-in fade-in duration-200">
                        <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-indigo-500" /> Valor Pago Parcialmente (R$)
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                          <Input
                            className="h-11 border-slate-200 bg-white pl-8 text-sm font-black italic rounded-xl"
                            value={upfrontPaidAmountInput}
                            onChange={handleUpfrontPaidAmountChange}
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                    )}

                    {paymentMethod !== 'múltiplo' && paymentMethod === 'cartão de crédito' && (
                      <div className="space-y-2 md:col-span-2 animate-in fade-in duration-200">
                        <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider">Número de Parcelas</Label>
                        <select
                          value={cardInstallments}
                          onChange={e => setCardInstallments(Number(e.target.value))}
                          className="h-11 w-full border border-slate-200 bg-white font-bold text-xs rounded-xl px-3 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                          {[...Array(12)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>{i + 1}x</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {paymentMethod !== 'múltiplo' && (
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-slate-700 font-bold italic text-xs uppercase tracking-wider">Data do Pagamento</Label>
                        <Input
                          type="date"
                          className="h-11 border-slate-200 bg-white font-bold rounded-xl"
                          value={paymentDate || (dueAppointment ? dueAppointment.date : '')}
                          onChange={e => setPaymentDate(e.target.value)}
                        />
                      </div>
                    )}

                    {paymentMethod === 'múltiplo' && (
                      <div className="md:col-span-2 space-y-4 bg-indigo-50/20 p-4 rounded-2xl border border-indigo-100/50 animate-in fade-in duration-200 w-full font-sans text-xs">
                        <div className="flex justify-between items-center">
                          <Label className="text-indigo-900 font-extrabold italic text-xs uppercase tracking-wider">Formas de Pagamento</Label>
                          <Button
                            type="button"
                            size="sm"
                            className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase rounded-xl h-8 cursor-pointer border-none"
                            onClick={() => {
                              const currentTotal = paymentSplits.reduce((sum, s) => sum + s.amount, 0);
                              const remaining = Math.max(0, numericAmount - currentTotal);
                              setPaymentSplits([
                                ...paymentSplits,
                                { method: 'pix', amount: remaining, status: 'pago', paymentDate: paymentDate || (dueAppointment ? dueAppointment.date : '') }
                              ]);
                              setDisplaySplits([
                                ...displaySplits,
                                remaining === 0 ? '' : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(remaining)
                              ]);
                            }}
                          >
                            + Adicionar Forma
                          </Button>
                        </div>

                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                          {paymentSplits.map((split, index) => (
                            <div key={index} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2.5">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] text-slate-400 font-bold uppercase mb-0.5 block">Forma</label>
                                  <select
                                    value={split.method}
                                    onChange={(e) => {
                                      const splits = [...paymentSplits];
                                      splits[index] = { ...split, method: e.target.value as any };
                                      setPaymentSplits(splits);
                                    }}
                                    className="h-9 w-full border border-slate-200 bg-white font-bold text-xs rounded-lg px-2 outline-none"
                                  >
                                    <option value="pix">Pix</option>
                                    <option value="cartão de crédito">Cartão de Crédito</option>
                                    <option value="cartão de débito">Cartão de Débito</option>
                                    <option value="dinheiro">Dinheiro</option>
                                    <option value="boleto">Boleto</option>
                                    <option value="transferência">Transferência</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="text-[9px] text-slate-400 font-bold uppercase mb-0.5 block">Valor (R$)</label>
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 font-mono">R$</span>
                                    <Input
                                      type="text"
                                      placeholder="0,00"
                                      className="pl-7 h-9 border-slate-200 text-xs font-bold w-full rounded-lg bg-white font-mono"
                                      value={displaySplits[index] || ''}
                                      onChange={(e) => handleSplitValueChange(index, e.target.value)}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 items-center">
                                <div>
                                  <label className="text-[9px] text-slate-400 font-bold uppercase mb-0.5 block">Status</label>
                                  <select
                                    value={split.status}
                                    onChange={(e) => {
                                      const splits = [...paymentSplits];
                                      splits[index] = { ...split, status: e.target.value as any };
                                      setPaymentSplits(splits);
                                    }}
                                    className="h-9 w-full border border-slate-200 bg-white font-bold text-xs rounded-lg px-2 outline-none"
                                  >
                                    <option value="pago">Pago</option>
                                    <option value="pendente">Pendente</option>
                                  </select>
                                </div>

                                {split.method === 'cartão de crédito' ? (
                                  <div>
                                    <label className="text-[9px] text-slate-400 font-bold uppercase mb-0.5 block">Parcelas</label>
                                    <select
                                      value={split.installments || 1}
                                      onChange={(e) => {
                                        const splits = [...paymentSplits];
                                        splits[index] = { ...split, installments: Number(e.target.value) };
                                        setPaymentSplits(splits);
                                      }}
                                      className="h-9 w-full border border-slate-200 bg-white font-bold text-xs rounded-lg px-2 outline-none"
                                    >
                                      {[...Array(12)].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>{i + 1}x</option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  split.status === 'pago' && (
                                    <div>
                                      <label className="text-[9px] text-slate-400 font-bold uppercase mb-0.5 block">Data Pagto.</label>
                                      <Input
                                        type="date"
                                        className="h-9 border-slate-200 text-xs font-bold w-full rounded-lg"
                                        value={split.paymentDate || (dueAppointment ? dueAppointment.date : '')}
                                        onChange={(e) => {
                                          const splits = [...paymentSplits];
                                          splits[index] = { ...split, paymentDate: e.target.value };
                                          setPaymentSplits(splits);
                                        }}
                                      />
                                    </div>
                                  )
                                )}
                              </div>

                              {split.method === 'cartão de crédito' && split.status === 'pago' && (
                                <div>
                                  <label className="text-[9px] text-slate-400 font-bold uppercase mb-0.5 block">Data Pagto.</label>
                                  <Input
                                    type="date"
                                    className="h-9 border-slate-200 text-xs font-bold w-full rounded-lg"
                                    value={split.paymentDate || (dueAppointment ? dueAppointment.date : '')}
                                    onChange={(e) => {
                                      const splits = [...paymentSplits];
                                      splits[index] = { ...split, paymentDate: e.target.value };
                                      setPaymentSplits(splits);
                                    }}
                                  />
                                </div>
                              )}

                              <div className="flex justify-end pt-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-7 px-2.5 text-red-500 hover:text-red-750 hover:bg-red-50 text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1"
                                  onClick={() => {
                                    setPaymentSplits(paymentSplits.filter((_, i) => i !== index));
                                    setDisplaySplits(displaySplits.filter((_, i) => i !== index));
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Remover
                                </Button>
                              </div>
                            </div>
                          ))}

                          {paymentSplits.length === 0 && (
                            <p className="text-slate-400 font-bold text-xs italic text-center py-2">Nenhuma forma de pagamento adicionada.</p>
                          )}
                        </div>

                        {/* Summary of split values */}
                        {(() => {
                          const totalSplits = paymentSplits.reduce((sum, s) => sum + s.amount, 0);
                          const totalPaid = paymentSplits.filter(s => s.status === 'pago').reduce((sum, s) => sum + s.amount, 0);
                          const matchesTotal = Math.abs(totalSplits - numericAmount) < 0.01;

                          return (
                            <div className="pt-3 border-t border-indigo-100 flex flex-col gap-2 font-sans text-xs">
                              <div className="flex flex-wrap justify-between gap-2">
                                <span className="text-slate-500 font-bold">Lançado: R$ {totalSplits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                <span className="text-green-600 font-bold">Pago: R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between items-center pt-1 border-t border-slate-100/50">
                                <span className="font-extrabold text-[10px] uppercase text-indigo-700">Total Cobrado: R$ {numericAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase border tracking-wider ${
                                  matchesTotal ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200 animate-pulse"
                                }`}>
                                  {matchesTotal ? 'Valores Fecham' : `Diferença: R$ ${(numericAmount - totalSplits).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowCheckoutForm(false)}
                    className="flex-1 h-12 text-slate-500 hover:text-slate-700 font-bold text-xs uppercase italic tracking-wider rounded-xl cursor-pointer"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCheckoutSubmit}
                    className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-black italic rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer"
                  >
                    Finalizar e Registrar
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
