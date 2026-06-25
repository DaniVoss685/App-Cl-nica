import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Check, Calendar, Clock, Sparkles, User, Stethoscope, Mail, Phone, ArrowRight, MessageSquare, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays, getDay, isAfter, startOfDay, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AgendamentoOnline() {
  const navigate = useNavigate();
  const store = useStore();
  const { patients, professionals, services, packages, addPatient, addAppointment, appointments } = store;

  // Form States
  const [selectedType, setSelectedType] = useState<'service' | 'package'>('service');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1)); // Default to tomorrow
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');

  // Patient Info
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');

  // Application States
  const [bookingStep, setBookingStep] = useState(1); // 1: Service/Package & Prof, 2: Date & Slot, 3: Patient Info, 4: Confirmed Receipt
  const [simulatedNotifications, setSimulatedNotifications] = useState({ email: '', whatsapp: '' });

  // Reset helper
  const resetForm = () => {
    setSelectedServiceId('');
    setSelectedPackageId('');
    setSelectedProfessionalId('');
    setSelectedDate(addDays(new Date(), 1));
    setSelectedTimeSlot('');
    setPatientName('');
    setPatientEmail('');
    setPatientPhone('');
    setBookingStep(1);
  };

  // Generate a list of next 14 booking days (skipping Sundays)
  const availableDates = useMemo(() => {
    const dates: Date[] = [];
    let current = new Date();
    // Start from tomorrow or today if early
    current = addDays(current, 1);
    
    while (dates.length < 14) {
      // 0 = Sunday
      if (getDay(current) !== 0) {
        dates.push(new Date(current));
      }
      current = addDays(current, 1);
    }
    return dates;
  }, []);

  // Selected object helpers
  const selectedService = useMemo(() => {
    return services.find(s => s.id === selectedServiceId);
  }, [services, selectedServiceId]);

  const selectedPackage = useMemo(() => {
    return packages.find(p => p.id === selectedPackageId);
  }, [packages, selectedPackageId]);

  const selectedProfessional = useMemo(() => {
    return professionals.find(p => p.id === selectedProfessionalId);
  }, [professionals, selectedProfessionalId]);

  // Compute available hours for chosen professional and date
  const availableSlots = useMemo(() => {
    if (!selectedProfessional) return [];
    
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');

    // Default professional hours or mock data workingHours (morning-only or full day)
    let startHour = 8;
    let endHour = 18;

    if (selectedProfessional.workingHours) {
      const [startH] = selectedProfessional.workingHours.start.split(':').map(Number);
      const [endH] = selectedProfessional.workingHours.end.split(':').map(Number);
      startHour = startH || 8;
      endHour = endH || 18;
    } else {
      // If no hours specified, default morning 08:00 - 12:00 for Dr. Carlos Mendes as user requested
      if (selectedProfessional.name.toLowerCase().includes('carlos')) {
        startHour = 8;
        endHour = 12;
      }
    }

    // Generate times slots (every 30 mins)
    const slots: string[] = [];
    for (let h = startHour; h < endHour; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
      slots.push(`${String(h).padStart(2, '0')}:30`);
    }

    // Filter slots with duration overlap
    return slots.filter(time => {
      // Create proposed start and end times
      const startTime = time;
      const duration = selectedService?.durationMinutes || 60; // default 60 min
      
      const [sh, sm] = startTime.split(':').map(Number);
      const endMins = sh * 60 + sm + duration;
      const eh = Math.floor(endMins / 60);
      const em = endMins % 60;
      const endTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;

      // Check against existing appointments for this professional on this date
      const hasConflict = appointments.some(appt => {
        if (appt.status === 'cancelado') return false;
        if (appt.professionalId !== selectedProfessional.id) return false;
        if (appt.date !== formattedDate) return false;

        // Check list overlap
        // Proposed [startTime, endTime] overlaps with [appt.startTime, apppt.endTime]
        return (startTime >= appt.startTime && startTime < appt.endTime) ||
               (endTime > appt.startTime && endTime <= appt.endTime) ||
               (startTime <= appt.startTime && endTime >= appt.endTime);
      });

      return !hasConflict;
    });
  }, [selectedProfessional, selectedDate, selectedService, appointments]);

  // Validations for next steps
  const canGoToStep2 = selectedProfessionalId && (selectedServiceId || selectedPackageId);
  const canGoToStep3 = selectedTimeSlot;
  const canConfirm = patientName.trim() !== '' && patientPhone.trim() !== '' && patientEmail.trim() !== '';

  const handleConfirmBooking = () => {
    if (!canConfirm) return;

    // 1. Resolve Patient ID
    let currentPatient = patients.find(p => p.email?.toLowerCase() === patientEmail.toLowerCase() || p.phone === patientPhone);
    let patientId = '';

    if (currentPatient) {
      patientId = currentPatient.id;
    } else {
      // Create new patient
      const newId = Math.random().toString();
      addPatient({
        id: newId,
        name: patientName,
        email: patientEmail,
        phone: patientPhone,
        status: 'novo',
      });
      patientId = newId;
    }

    // 2. Set appointment values
    const apptDateStr = format(selectedDate, 'yyyy-MM-dd');
    const startTime = selectedTimeSlot;
    const duration = selectedService?.durationMinutes || selectedPackage?.totalSessions ? 60 : 60;

    const [sh, sm] = startTime.split(':').map(Number);
    const endMins = sh * 60 + sm + duration;
    const eh = Math.floor(endMins / 60);
    const em = endMins % 60;
    const endTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;

    const price = selectedService ? selectedService.price : (selectedPackage ? selectedPackage.price / selectedPackage.totalSessions : 250);

    // Save appointment
    addAppointment({
      patientId,
      professionalId: selectedProfessionalId,
      serviceId: selectedType === 'service' ? selectedServiceId : undefined,
      packageId: selectedType === 'package' ? selectedPackageId : undefined,
      date: apptDateStr,
      startTime,
      endTime,
      status: 'confirmado',
      confirmationStatus: 'confirmado',
      type: selectedType === 'package' ? 'sessão' : 'consulta',
      value: price,
      paymentStatus: 'pendente',
    });

    // 3. Generate Simulated Notifications
    const formattedDateBR = format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const professionalName = selectedProfessional?.name || '';
    const nameOfProcedure = selectedService ? selectedService.name : (selectedPackage ? selectedPackage.name : 'Consulta');

    const whatsappMsg = `*Stark Clinic • Confirmação de Agendamento* \n\nOlá, *${patientName}*! Seu agendamento foi realizado com sucesso. \n\n📅 *Data:* ${formattedDateBR}\n⏰ *Horário:* ${startTime} às ${endTime}\n👨‍⚕️ *Profissional:* ${professionalName}\n🏥 *Unidade:* Sede Stark Prime\n📍 *Procedimento:* ${nameOfProcedure}\n\nLembrete enviado de forma automática. Se precisar alterar, responda esta mensagem!`;

    const emailMsg = `STARK CLINIC\n\nConfirmação de Agendamento Online\n\nPreszado(a) ${patientName},\n\nSeu agendamento para ${formattedDateBR} às ${startTime} está confirmado com ${professionalName}.\n\nDetalhes do procedimento:\n- Serviço: ${nameOfProcedure}\n- Duração: ${duration} minutos\n- Endereço: Stark Prime Corporate, Av. Paulista, 1000 - SP\n\nUm lembrete adicional será enviado 24 horas antes do atendimento.\n\nAtenciosamente,\nEquipe Stark Clinic`;

    setSimulatedNotifications({
      whatsapp: whatsappMsg,
      email: emailMsg,
    });

    setBookingStep(4);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/50 via-slate-900 to-indigo-950/20 pointer-events-none z-0" />

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto w-full flex-1 flex flex-col justify-center py-6">
        
        {/* Back Button to main dashboard */}
        <div className="flex justify-start mb-6 select-none">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/')}
            className="border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white font-extrabold text-xs italic uppercase rounded-xl h-11 px-5 shadow-lg select-none transition-all cursor-pointer inline-flex items-center gap-2"
          >
            ← Voltar para o Sistema Principal
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black uppercase tracking-widest italic mb-3">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" /> portal de agendamento online
          </div>
          <h1 className="text-4xl sm:text-5xl font-black italic tracking-tight text-white uppercase select-none">
            Stark Clinic
          </h1>
          <p className="text-slate-400 mt-2 text-sm sm:text-base italic max-w-lg mx-auto">
            Escolha seu procedimento, profissional e horário preferido. Agende sua sessão de forma 100% digital.
          </p>
        </div>

        {/* Steps Progress Indicator */}
        {bookingStep <= 3 && (
          <div className="flex items-center justify-center gap-4 mb-8 max-w-md mx-auto">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black italic text-sm transition-all shadow-md ${
                  bookingStep === step 
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/30 font-black' 
                    : bookingStep > step 
                      ? 'bg-indigo-950 border border-indigo-500/40 text-indigo-400' 
                      : 'bg-slate-800 border border-slate-700 text-slate-500'
                }`}>
                  {bookingStep > step ? <Check className="w-4 h-4" /> : step}
                </div>
                {step < 3 && (
                  <div className={`h-[2px] w-12 rounded-full ${
                    bookingStep > step ? 'bg-indigo-600' : 'bg-slate-800'
                  }`} />
                )}
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* STEP 1: CHOOSE SERVICE/PACKAGE & PROFESSIONAL */}
          {bookingStep === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              <div className="lg:col-span-8 space-y-6">
                
                {/* Switch between Services and Packages */}
                <div className="p-1 bg-slate-950/75 border border-slate-800/80 rounded-2xl flex gap-1">
                  <button
                    onClick={() => { setSelectedType('service'); setSelectedPackageId(''); }}
                    className={`flex-1 py-3 text-center text-sm font-black uppercase tracking-wider rounded-xl transition-all italic ${
                      selectedType === 'service' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Serviços Individuais
                  </button>
                  <button
                    onClick={() => { setSelectedType('package'); setSelectedServiceId(''); }}
                    className={`flex-1 py-3 text-center text-sm font-black uppercase tracking-wider rounded-xl transition-all italic ${
                      selectedType === 'package' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pacotes de Tratamento
                  </button>
                </div>

                {/* Listing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedType === 'service' ? (
                    services.map(s => (
                      <Card
                        key={s.id}
                        id={`online-service-${s.id}`}
                        onClick={() => setSelectedServiceId(s.id)}
                        className={`p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between cursor-pointer select-none group text-left ${
                          selectedServiceId === s.id 
                            ? 'bg-indigo-600/10 border-indigo-500 shadow-xl shadow-indigo-950/20' 
                            : 'bg-slate-950/40 border-slate-800/60 hover:bg-slate-950/80 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                              {s.category}
                            </span>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                              selectedServiceId === s.id ? 'border-indigo-400 bg-indigo-600' : 'border-slate-700'
                            }`}>
                              {selectedServiceId === s.id && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                          <h4 className="text-lg font-black text-white italic capitalize tracking-tight mt-3 group-hover:text-indigo-300 transition-colors">
                            {s.name}
                          </h4>
                        </div>
                        
                        <div className="mt-6 pt-3 border-t border-slate-900 flex justify-between items-end">
                          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold italic">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {s.durationMinutes} min
                          </div>
                          <div className="text-xl font-black text-indigo-400 italic">
                            R$ {s.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    packages.map(p => (
                      <Card
                        key={p.id}
                        id={`online-package-${p.id}`}
                        onClick={() => setSelectedPackageId(p.id)}
                        className={`p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between cursor-pointer select-none group text-left ${
                          selectedPackageId === p.id 
                            ? 'bg-indigo-600/10 border-indigo-500 shadow-xl shadow-indigo-950/20' 
                            : 'bg-slate-950/40 border-slate-800/60 hover:bg-slate-950/80 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                              {p.totalSessions} sessões
                            </span>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                              selectedPackageId === p.id ? 'border-indigo-400 bg-indigo-600' : 'border-slate-700'
                            }`}>
                              {selectedPackageId === p.id && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                          <h4 className="text-lg font-black text-white italic capitalize tracking-tight mt-3 group-hover:text-indigo-300 transition-colors">
                            {p.name}
                          </h4>
                          <p className="text-xs text-slate-400 font-medium mt-2 leading-tight">
                            Intervalo de {p.sessionInterval || 15} dias entre sessões. Tratamento completo de estética de alta performance.
                          </p>
                        </div>
                        
                        <div className="mt-6 pt-3 border-t border-slate-900 flex justify-between items-end">
                          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold italic">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            Completo
                          </div>
                          <div className="text-xl font-black text-indigo-400 italic">
                            R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>

              {/* Professional Selection */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-slate-950/40 border border-slate-800/60 rounded-[2rem] p-6 text-left">
                  <h3 className="text-lg font-black text-white uppercase italic tracking-wider mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-400" /> 1. Escolha o Profissional
                  </h3>
                  
                  <div className="space-y-3">
                    {professionals.map(p => {
                      const isSelected = selectedProfessionalId === p.id;
                      // Display dynamic shifts for professionals
                      const shift = p.name.toLowerCase().includes('carlos') ? 'Manhã (08h às 12h)' : 'Integral (08h às 18h)';
                      
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedProfessionalId(p.id)}
                          className={`p-4 rounded-2xl border cursor-pointer select-none transition-all flex items-center gap-3 ${
                            isSelected 
                              ? 'bg-indigo-600/10 border-indigo-500 shadow-lg' 
                              : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center font-black text-indigo-300 italic border border-indigo-500/20 uppercase shrink-0">
                            {p.name.slice(4, 6)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-white italic truncate capitalize">{p.name}</p>
                            <p className="text-[11px] text-indigo-400 font-bold italic truncate uppercase tracking-wider">{p.specialty}</p>
                            <span className="text-[10px] text-slate-500 font-medium italic mt-0.5 block">{shift}</span>
                          </div>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-indigo-400 bg-indigo-600' : 'border-slate-800'
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-8">
                    <Button
                      disabled={!canGoToStep2}
                      onClick={() => setBookingStep(2)}
                      className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg italic uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-950/30 flex items-center justify-center gap-2 group transition-all"
                    >
                      avançar para horários <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: SELECT DATE AND TIME */}
          {bookingStep === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left"
            >
              {/* Date Blocks Carousel/Grid */}
              <div className="lg:col-span-8 space-y-6">
                <h3 className="text-xl font-black text-white uppercase italic tracking-wider flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-400" /> 2. Selecione o Dia
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {availableDates.map((date) => {
                    const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                    const dayOfWeek = format(date, 'eee', { locale: ptBR });
                    const dayOfMonth = format(date, 'dd');
                    const monthName = format(date, 'MMM', { locale: ptBR });

                    return (
                      <div
                        key={date.toISOString()}
                        onClick={() => { setSelectedDate(date); setSelectedTimeSlot(''); }}
                        className={`p-4 rounded-2xl border text-center cursor-pointer select-none transition-all flex flex-col justify-center items-center ${
                          isSelected 
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-xl shadow-indigo-950/20 scale-102' 
                            : 'bg-slate-950/40 border-slate-800/60 hover:bg-slate-950/80 hover:border-slate-700'
                        }`}
                      >
                        <p className={`text-[10px] font-black uppercase tracking-widest italic mb-1 ${
                          isSelected ? 'text-indigo-100' : 'text-slate-500'
                        }`}>
                          {dayOfWeek}
                        </p>
                        <p className="text-2xl font-black italic">{dayOfMonth}</p>
                        <p className={`text-[11px] font-bold capitalize italic mt-1 ${
                          isSelected ? 'text-indigo-200' : 'text-indigo-400'
                        }`}>
                          {monthName}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-slate-950/20 border border-slate-800/60 hover:border-slate-700/80 transition-colors rounded-[2rem] p-6 text-slate-400 text-xs font-semibold flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-white italic uppercase text-sm mb-1 text-indigo-300">Reserva Protegida de Horários</p>
                    <p className="leading-relaxed">Nosso algoritmo calcula agendas livres filtrando as cirurgias e retornos ativos do {selectedProfessional?.name}. Você verá apenas as janelas disponíveis que respeitam o tempo do procedimento.</p>
                  </div>
                </div>
              </div>

              {/* Time slots and Confirmation Trigger */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-slate-950/40 border border-slate-800/60 rounded-[2rem] p-6">
                  <h3 className="text-lg font-black text-white uppercase italic tracking-wider mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" /> 3. Horários Disponíveis
                  </h3>

                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto no-scrollbar pr-1">
                      {availableSlots.map(time => {
                        const isSelected = selectedTimeSlot === time;
                        return (
                          <div
                            key={time}
                            onClick={() => setSelectedTimeSlot(time)}
                            className={`py-3 text-center rounded-xl border font-mono font-bold text-sm cursor-pointer transition-all select-none ${
                              isSelected 
                                ? 'bg-indigo-600 text-white border-indigo-400 shadow-md' 
                                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700 text-slate-300'
                            }`}
                          >
                            {time}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center bg-slate-900/50 rounded-2xl border border-slate-800 flex flex-col items-center">
                      <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
                      <p className="text-sm font-black text-slate-300 italic">Sem horários neste dia</p>
                      <p className="text-slate-500 text-xs mt-1">Este profissional já tem todas as janelas agendadas ou está de folga hoje. Selecione outra data.</p>
                    </div>
                  )}

                  <div className="mt-8 space-y-3">
                    <Button
                      disabled={!canGoToStep3}
                      onClick={() => setBookingStep(3)}
                      className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg italic uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-950/30 flex items-center justify-center gap-2 group transition-all"
                    >
                      identificar paciente <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      onClick={() => setBookingStep(1)}
                      className="w-full h-10 text-slate-500 hover:text-white font-bold text-sm italic uppercase rounded-xl"
                    >
                      voltar
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: IDENTIFICATION */}
          {bookingStep === 3 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-xl mx-auto w-full text-left"
            >
              <div className="bg-slate-950/40 border border-slate-800/60 rounded-[2.5rem] p-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase italic tracking-wider mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-indigo-400" /> Confirmar seus Dados
                  </h3>
                  <p className="text-xs text-slate-400 font-medium italic">Insira suas informações de contato para receber o lembrete instantâneo pelo WhatsApp e o e-mail de confirmação da clínica.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="pac-name" className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input
                        id="pac-name"
                        type="text"
                        placeholder="Ex: Maria de Souza Silva"
                        value={patientName}
                        onChange={e => setPatientName(e.target.value)}
                        className="h-12 pl-10 border-slate-800 bg-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-bold italic"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="pac-email" className="text-xs font-black text-slate-400 uppercase tracking-widest italic">E-mail</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          id="pac-email"
                          type="email"
                          placeholder="Ex: maria@email.com"
                          value={patientEmail}
                          onChange={e => setPatientEmail(e.target.value)}
                          className="h-12 pl-10 border-slate-800 bg-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-bold italic"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="pac-phone" className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Celular / WhatsApp</Label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          id="pac-phone"
                          type="tel"
                          placeholder="Ex: (11) 99999-8888"
                          value={patientPhone}
                          onChange={e => setPatientPhone(e.target.value)}
                          className="h-12 pl-10 border-slate-800 bg-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono font-bold"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Box */}
                <div className="p-5 bg-indigo-950/20 border border-indigo-500/25 rounded-2xl flex flex-col gap-2 italic">
                  <div className="flex justify-between text-xs text-indigo-300 font-black uppercase tracking-wider">
                    <span>Resumo da Reserva</span>
                    <span>Confirmando...</span>
                  </div>
                  <div className="text-white text-sm font-extrabold capitalize leading-tight mt-1">
                    {selectedService ? selectedService.name : selectedPackage?.name} 
                  </div>
                  <div className="text-slate-400 text-xs font-medium capitalize mt-0.5">
                    com {selectedProfessional?.name} em {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} às <span className="font-mono text-white text-xs">{selectedTimeSlot}</span>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setBookingStep(2)}
                    className="h-14 flex-1 border-slate-800 hover:bg-slate-950 text-slate-400 hover:text-white font-black text-lg italic uppercase tracking-wider rounded-2xl"
                  >
                    voltar
                  </Button>
                  
                  <Button
                    disabled={!canConfirm}
                    onClick={handleConfirmBooking}
                    className="h-14 flex-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg italic uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-950/30 flex items-center justify-center gap-2 group transition-all"
                  >
                    Agendar agora <Check className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: SUCCESS RECEIPT & AUTOMATION SIMULATOR */}
          {bookingStep === 4 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left"
            >
              
              {/* Receipt */}
              <div className="lg:col-span-6 space-y-6">
                <div className="bg-slate-950 border border-indigo-500/30 overflow-hidden rounded-[2.5rem] shadow-2xl relative">
                  {/* Decorative stamp decoration */}
                  <div className="absolute right-4 top-4 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1 text-[10px] text-indigo-400 font-extrabold uppercase italic">
                    aprovado
                  </div>

                  <div className="bg-indigo-600 p-8 text-white text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-md">
                      <Check className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-black lowercase italic">Agendado com Sucesso!</h3>
                    <p className="text-indigo-100 mt-1 text-sm italic font-medium">As notificações e confirmações foram despachadas.</p>
                  </div>

                  <div className="p-8 space-y-6 bg-slate-950">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start pb-4 border-b border-slate-900">
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Paciente</p>
                          <p className="text-base font-black text-white italic capitalize mt-1">{patientName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">ID Agendamento</p>
                          <p className="text-xs font-mono text-slate-400 mt-1">#{(Math.random() * 100000).toFixed(0)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-900">
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Profissional</p>
                          <p className="text-sm font-black text-white italic capitalize mt-1">{selectedProfessional?.name}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Procedimento</p>
                          <p className="text-sm font-black text-indigo-400 italic capitalize mt-1 truncate">
                            {selectedService ? selectedService.name : selectedPackage?.name}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-900">
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Data do Atendimento</p>
                          <p className="text-sm font-black text-white italic mt-1">{format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Horário Confirmado</p>
                          <p className="text-sm font-black text-indigo-400 italic mt-1 font-mono">{selectedTimeSlot}h</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <Button
                        onClick={resetForm}
                        className="w-full h-12 bg-indigo-600 hover:bg-slate-800 text-white font-black text-base italic uppercase tracking-wider rounded-2xl shadow-xl transition-all"
                      >
                        fazer novo agendamento
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulated Automation Dispatches */}
              <div className="lg:col-span-6 space-y-6">
                <div>
                  <h4 className="text-lg font-black text-white uppercase italic tracking-wider mb-1 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" /> Simulador de Comunicações Stark
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">Veja os disparos automáticos gerados instantaneamente pelo bot do Stark Clinic:</p>
                </div>

                {/* WhatsApp Mock */}
                <div className="bg-slate-950/60 border border-emerald-500/25 rounded-3xl overflow-hidden p-5 flex flex-col justify-between">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-900/40">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-emerald-400 uppercase tracking-widest italic">Notificação WhatsApp (Enviada)</p>
                      <p className="text-[10px] font-mono text-slate-500 font-bold">{patientPhone}</p>
                    </div>
                  </div>
                  <div className="mt-4 p-4 rounded-2xl bg-[#0b141a]/90 text-slate-100 text-xs font-semibold leading-relaxed border border-slate-800 font-mono whitespace-pre-wrap max-h-[160px] overflow-y-auto no-scrollbar">
                    {simulatedNotifications.whatsapp}
                  </div>
                </div>

                {/* Email Mock */}
                <div className="bg-slate-950/60 border border-indigo-500/20 rounded-3xl overflow-hidden p-5 flex flex-col justify-between">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-900/40">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-indigo-400 uppercase tracking-widest italic">Email de Agendamento (Enviado)</p>
                      <p className="text-[10px] font-mono text-slate-500 font-bold">{patientEmail}</p>
                    </div>
                  </div>
                  <div className="mt-4 p-4 rounded-2xl bg-white text-slate-900 text-xs font-semibold leading-relaxed border border-slate-100 whitespace-pre-wrap max-h-[160px] overflow-y-auto no-scrollbar">
                    {simulatedNotifications.email}
                  </div>
                </div>

              </div>

            </motion.div>
          )}

        </AnimatePresence>

      </div>

      {/* Footer */}
      <div className="text-center pt-8 border-t border-slate-800/40 text-[10px] text-slate-500 font-extrabold uppercase italic relative z-10 select-none tracking-widest">
        © 2026 Stark Clinic Corporate. Todos os direitos reservados.
      </div>
    </div>
  );
}
