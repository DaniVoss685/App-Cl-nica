import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Activity,
  ArrowLeftRight,
  BookOpen,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  Edit3,
  FileText,
  Filter,
  Image as ImageIcon,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  User,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../store';
import { clinicalPhotosBucket, supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger } from './ui/select';
import { Textarea } from './ui/textarea';
import type { DoctorNote } from '../types';

type ClinicalTab = 'evolucoes' | 'rascunhos' | 'fotos';
type RecordType = 'evolução' | 'avaliação' | 'prescrição' | 'exame';

interface ClinicalRecordWorkspaceProps {
  patientId?: string | null;
  embedded?: boolean;
  initialTab?: ClinicalTab;
  onOpenPatient?: (patientId: string) => void;
}

const DEFAULT_TEMPLATES = [
  {
    id: '1',
    title: 'Toxina Botulínica (Botox)',
    content: 'Realizado procedimento de aplicação de Toxina Botulínica em região frontal, glabela e orbicular dos olhos. Antissepsia local rigorosa. Paciente tolerou bem, sem intercorrências imediatas. Orientado a não deitar por 4 horas e evitar atividades físicas nas próximas 24h.'
  },
  {
    id: '2',
    title: 'Preenchimento Labial',
    content: 'Realizado preenchimento labial com ácido hialurônico. Técnica aplicada conforme planejamento, com edema e eritema transitórios previstos. Paciente orientado sobre cuidados pós-procedimento, compressa gelada e sinais de alerta.'
  },
  {
    id: '3',
    title: 'Limpeza de Pele Profunda',
    content: 'Limpeza de pele profunda realizada com higienização, esfoliação, emoliência, extração manual, alta frequência, máscara calmante e fotoproteção. Paciente tolerou bem o procedimento.'
  }
];

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

const makePhotoPath = (clientId: string, patientId: string, side: 'antes' | 'depois', file: File) => {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
  return `${clientId}/${patientId}/${Date.now()}-${side}.${safeExt}`;
};

const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  evolução: 'Evolução Clínica',
  avaliação: 'Avaliação / Anamnese',
  prescrição: 'Prescrição',
  exame: 'Exame / Outro'
};

const selectDisplayClass = 'block w-full truncate text-left text-sm font-black';

export function ClinicalRecordWorkspace({
  patientId,
  embedded = false,
  initialTab = 'evolucoes',
  onOpenPatient
}: ClinicalRecordWorkspaceProps) {
  const {
    currentClient,
    currentUser,
    patients,
    appointments,
    services,
    professionals,
    medicalRecords,
    doctorNotes,
    beforeAfterPhotos,
    addMedicalRecord,
    addDoctorNote,
    updateDoctorNote,
    removeDoctorNote,
    addBeforeAfterPhoto,
    removeBeforeAfterPhoto
  } = useStore();

  const fixedPatient = patientId ? patients.find(p => p.id === patientId) : undefined;
  const defaultProfessionalId = currentUser?.professionalId || professionals.find(p => p.tipoMembro !== 'gestao')?.id || professionals[0]?.id || '';

  const [activeTab, setActiveTab] = useState<ClinicalTab>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem('stark_clinical_templates');
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
  });

  const [isEvolutionOpen, setIsEvolutionOpen] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoProgress, setPhotoProgress] = useState(0);

  const [pendingConversionNote, setPendingConversionNote] = useState<DoctorNote | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const [evoPatientId, setEvoPatientId] = useState(patientId || '');
  const [evoProfessionalId, setEvoProfessionalId] = useState(defaultProfessionalId);
  const [evoType, setEvoType] = useState<RecordType>('evolução');
  const [evoDate, setEvoDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [evoContent, setEvoContent] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('none');

  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [notePatientId, setNotePatientId] = useState(patientId || 'none');
  const [noteProfessionalId, setNoteProfessionalId] = useState(defaultProfessionalId || 'none');
  const [noteIsDraft, setNoteIsDraft] = useState(true);

  const [photoPatientId, setPhotoPatientId] = useState(patientId || '');
  const [photoProfessionalId, setPhotoProfessionalId] = useState(defaultProfessionalId || 'none');
  const [photoProcedure, setPhotoProcedure] = useState('');
  const [photoDate, setPhotoDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [photoNotes, setPhotoNotes] = useState('');
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState('');
  const [afterPreview, setAfterPreview] = useState('');

  const patientFilter = (itemPatientId?: string) => !patientId || itemPatientId === patientId;
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const records = useMemo(() => {
    const list = medicalRecords
      .filter(r => patientFilter(r.patientId))
      .map(r => {
        const appt = r.appointmentId ? appointments.find(a => a.id === r.appointmentId) : undefined;
        const service = appt?.serviceId ? services.find(s => s.id === appt.serviceId) : undefined;
        return {
          ...r,
          serviceName: service?.name || 'evolução clínica',
          isFormal: true
        };
      });

    if (!patientId) {
      appointments
        .filter(a => a.status === 'realizado' && !medicalRecords.some(r => r.appointmentId === a.id))
        .forEach(appt => {
          list.push({
            id: `appt-${appt.id}`,
            patientId: appt.patientId,
            professionalId: appt.professionalId,
            appointmentId: appt.id,
            date: `${appt.date}T${appt.startTime || '12:00'}:00`,
            content: appt.notes || 'Atendimento concluído sem evolução formal registrada.',
            type: 'evolução',
            serviceName: services.find(s => s.id === appt.serviceId)?.name || 'procedimento realizado',
            isFormal: false
          } as any);
        });
    }

    return list
      .filter(item => {
        if (!normalizedSearch) return true;
        const patient = patients.find(p => p.id === item.patientId);
        const content = `${patient?.name || ''} ${item.content || ''} ${(item as any).serviceName || ''} ${item.type || ''}`.toLowerCase();
        return content.includes(normalizedSearch);
      })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [appointments, medicalRecords, normalizedSearch, patientId, patients, services]);

  const notes = useMemo(() => {
    return (doctorNotes || [])
      .filter(note => patientFilter(note.patientId))
      .filter(note => {
        if (!normalizedSearch) return true;
        const patient = patients.find(p => p.id === note.patientId);
        return `${note.title} ${note.content} ${patient?.name || ''}`.toLowerCase().includes(normalizedSearch);
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [doctorNotes, normalizedSearch, patientId, patients]);

  const photos = useMemo(() => {
    return (beforeAfterPhotos || [])
      .filter(photo => patientFilter(photo.patientId))
      .filter(photo => {
        if (!normalizedSearch) return true;
        const patient = patients.find(p => p.id === photo.patientId);
        return `${photo.procedureName} ${photo.notes || ''} ${patient?.name || ''}`.toLowerCase().includes(normalizedSearch);
      })
      .sort((a, b) => (b.date || b.createdAt).localeCompare(a.date || a.createdAt));
  }, [beforeAfterPhotos, normalizedSearch, patientId, patients]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const recordsToday = records.filter(r => String(r.date).startsWith(today) && (r as any).isFormal).length;
  const pendingDrafts = notes.filter(n => n.isDraft).length;

  const getPatientLabel = (id?: string, emptyLabel = 'Selecione o Paciente') => {
    if (!id || id === 'none') return emptyLabel;
    return patients.find(p => p.id === id)?.name || 'Paciente Não Encontrado';
  };

  const getProfessionalLabel = (id?: string) => {
    if (!id || id === 'none') return 'Não Informado';
    return professionals.find(p => p.id === id)?.name || 'Profissional Não Encontrado';
  };

  const getTemplateLabel = (id: string) => {
    if (!id || id === 'none') return 'Texto Livre';
    return templates.find((t: any) => t.id === id)?.title || 'Template Não Encontrado';
  };

  const resetEvolution = () => {
    setEvoPatientId(patientId || '');
    setEvoProfessionalId(defaultProfessionalId);
    setEvoType('evolução');
    setEvoDate(format(new Date(), 'yyyy-MM-dd'));
    setEvoContent('');
    setSelectedTemplateId('none');
    setPendingConversionNote(null);
  };

  const openEvolution = () => {
    resetEvolution();
    setIsEvolutionOpen(true);
  };

  const openNote = () => {
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteContent('');
    setNotePatientId(patientId || 'none');
    setNoteProfessionalId(defaultProfessionalId || 'none');
    setNoteIsDraft(true);
    setIsNoteOpen(true);
  };

  const openPhoto = () => {
    setPhotoPatientId(patientId || '');
    setPhotoProfessionalId(defaultProfessionalId || 'none');
    setPhotoProcedure('');
    setPhotoDate(format(new Date(), 'yyyy-MM-dd'));
    setPhotoNotes('');
    setBeforeFile(null);
    setAfterFile(null);
    setBeforePreview('');
    setAfterPreview('');
    setPhotoProgress(0);
    setIsPhotoOpen(true);
  };

  const handleTemplateSelection = (id: string) => {
    setSelectedTemplateId(id);
    const template = templates.find((t: any) => t.id === id);
    if (template) setEvoContent(template.content);
  };

  const saveEvolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evoPatientId) return toast.error('Selecione o paciente.');
    if (!evoContent.trim()) return toast.error('Escreva a evolução clínica.');

    setSaving(true);
    try {
      const record = await addMedicalRecord({
        patientId: evoPatientId,
        professionalId: evoProfessionalId || defaultProfessionalId || undefined,
        date: `${evoDate}T${format(new Date(), 'HH:mm:ss')}`,
        content: evoContent.trim(),
        type: evoType,
        convertedFromNoteId: pendingConversionNote?.id
      });

      if (pendingConversionNote) {
        await removeDoctorNote(pendingConversionNote.id);
        toast.success('Rascunho convertido em evolução.');
      } else {
        toast.success('Evolução clínica registrada.');
      }

      setActiveTab('evolucoes');
      setIsEvolutionOpen(false);
      resetEvolution();
      return record;
    } catch (err) {
      toast.error('Não foi possível salvar a evolução.');
    } finally {
      setSaving(false);
    }
  };

  const saveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return toast.error('Título e texto são obrigatórios.');

    setSaving(true);
    const payload = {
      title: noteTitle.trim(),
      content: noteContent.trim(),
      patientId: notePatientId === 'none' ? undefined : notePatientId,
      professionalId: noteProfessionalId === 'none' ? undefined : noteProfessionalId,
      isDraft: noteIsDraft
    };

    try {
      if (editingNoteId) {
        await updateDoctorNote(editingNoteId, payload);
        toast.success('Anotação atualizada.');
      } else {
        await addDoctorNote(payload);
        toast.success(noteIsDraft ? 'Rascunho salvo.' : 'Anotação clínica salva.');
      }
      setIsNoteOpen(false);
      setActiveTab('rascunhos');
    } finally {
      setSaving(false);
    }
  };

  const convertNote = (note: DoctorNote) => {
    if (!note.patientId) {
      toast.error('Vincule o rascunho a um paciente antes de converter.');
      return;
    }
    setPendingConversionNote(note);
    setEvoPatientId(note.patientId);
    setEvoProfessionalId(note.professionalId || defaultProfessionalId);
    setEvoType('evolução');
    setEvoDate(format(new Date(), 'yyyy-MM-dd'));
    setEvoContent(note.content);
    setSelectedTemplateId('none');
    setIsEvolutionOpen(true);
    toast.info('Revise e salve para formalizar a evolução.');
  };

  const uploadClinicalPhoto = async (file: File, preview: string, targetPatientId: string, side: 'antes' | 'depois') => {
    if (!currentClient?.id) return { path: '', url: preview };
    const path = makePhotoPath(currentClient.id, targetPatientId, side, file);
    const { error } = await supabase.storage.from(clinicalPhotosBucket).upload(path, file, {
      contentType: file.type || 'image/jpeg',
      upsert: false
    });
    if (error) throw error;
    const signed = await supabase.storage.from(clinicalPhotosBucket).createSignedUrl(path, 60 * 60 * 24 * 7);
    return { path, url: signed.data?.signedUrl || preview };
  };

  const savePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoPatientId || !photoProcedure.trim()) return toast.error('Paciente e procedimento são obrigatórios.');
    if (!beforeFile || !afterFile || !beforePreview || !afterPreview) return toast.error('Selecione as fotos de antes e depois.');

    setSaving(true);
    setPhotoProgress(15);
    try {
      let before = { path: '', url: beforePreview };
      let after = { path: '', url: afterPreview };
      try {
        before = await uploadClinicalPhoto(beforeFile, beforePreview, photoPatientId, 'antes');
        setPhotoProgress(55);
        after = await uploadClinicalPhoto(afterFile, afterPreview, photoPatientId, 'depois');
      } catch (uploadErr) {
        console.warn('Storage clínico indisponível; salvando preview local.', uploadErr);
        toast.warning('Storage indisponível. As fotos foram mantidas no cache local.');
      }

      setPhotoProgress(85);
      await addBeforeAfterPhoto({
        patientId: photoPatientId,
        professionalId: photoProfessionalId === 'none' ? undefined : photoProfessionalId,
        procedureName: photoProcedure.trim(),
        date: photoDate,
        beforePhotoPath: before.path,
        afterPhotoPath: after.path,
        beforePhotoUrl: before.url,
        afterPhotoUrl: after.url,
        notes: photoNotes.trim() || undefined
      });
      setPhotoProgress(100);
      toast.success('Antes e depois cadastrado.');
      setActiveTab('fotos');
      setIsPhotoOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoFile = async (file: File | undefined, side: 'before' | 'after') => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem.');
      return;
    }
    const preview = await readFileAsDataUrl(file);
    if (side === 'before') {
      setBeforeFile(file);
      setBeforePreview(preview);
    } else {
      setAfterFile(file);
      setAfterPreview(preview);
    }
  };

  const saveTemplates = (nextTemplates: any[]) => {
    setTemplates(nextTemplates);
    localStorage.setItem('stark_clinical_templates', JSON.stringify(nextTemplates));
  };

  const tabButton = (tab: ClinicalTab, icon: React.ReactNode, label: string, count: number) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      className={cn(
        'h-11 px-4 rounded-xl text-xs font-black flex items-center gap-2 transition-all whitespace-nowrap',
        activeTab === tab
          ? 'bg-slate-950 text-white shadow-lg shadow-slate-200'
          : 'text-slate-500 hover:text-slate-950 hover:bg-white'
      )}
    >
      {icon}
      {label}
      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md', activeTab === tab ? 'bg-white/15' : 'bg-slate-100')}>
        {count}
      </span>
    </button>
  );

  return (
    <div className={cn('space-y-6', embedded ? 'text-slate-900' : 'p-6 max-w-[1600px] mx-auto')}>
      {!embedded && (
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider mb-3">
              <Activity className="w-3.5 h-3.5" />
              Histórico clínico digital
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-950 italic tracking-tight">Gestão De Prontuários</h1>
            <p className="text-slate-500 mt-1 max-w-2xl">Evoluções formais, rascunhos rápidos do médico e comparação fotográfica antes/depois em uma linha clínica única.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsTemplatesOpen(true)} className="h-11 rounded-xl border-slate-200 font-bold text-xs">
              <ClipboardList className="w-4 h-4 mr-2" />
              Templates
            </Button>
            <Button onClick={openEvolution} className="h-11 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-black text-xs">
              <Plus className="w-4 h-4 mr-2" />
              Nova Evolução
            </Button>
          </div>
        </div>
      )}

      {embedded && fixedPatient && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-black text-slate-950 italic text-xl">Linha clínica de {fixedPatient.name}</h3>
            <p className="text-sm text-slate-500">Evoluções, rascunhos e fotos comparativas do tratamento.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={openEvolution} className="h-10 rounded-xl bg-slate-950 text-white font-bold text-xs">
              <FileText className="w-4 h-4 mr-2" />
              Evolução
            </Button>
            <Button onClick={openNote} variant="outline" className="h-10 rounded-xl font-bold text-xs">
              <Edit3 className="w-4 h-4 mr-2" />
              Rascunho
            </Button>
            <Button onClick={openPhoto} variant="outline" className="h-10 rounded-xl font-bold text-xs">
              <Camera className="w-4 h-4 mr-2" />
              Antes/Depois
            </Button>
          </div>
        </div>
      )}

      <div className={cn('grid gap-4', embedded ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-3')}>
        <Card className="p-5 rounded-2xl border-slate-200 bg-white shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">evoluções formais</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-3xl font-black italic text-slate-950">{medicalRecords.filter(r => patientFilter(r.patientId)).length}</span>
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
        </Card>
        <Card className="p-5 rounded-2xl border-slate-200 bg-white shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">registradas hoje</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-3xl font-black italic text-slate-950">{recordsToday}</span>
            <Clock className="w-6 h-6 text-indigo-500" />
          </div>
        </Card>
        <Card className="p-5 rounded-2xl border-slate-200 bg-white shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">rascunhos pendentes</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-3xl font-black italic text-slate-950">{pendingDrafts}</span>
            <Edit3 className="w-6 h-6 text-amber-500" />
          </div>
        </Card>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 xl:items-center justify-between">
        <div className="flex gap-1.5 p-1.5 bg-slate-100 rounded-2xl overflow-x-auto">
          {tabButton('evolucoes', <FileText className="w-4 h-4" />, 'Evoluções', records.length)}
          {tabButton('rascunhos', <Edit3 className="w-4 h-4" />, 'Rascunhos', notes.length)}
          {tabButton('fotos', <Camera className="w-4 h-4" />, 'Antes/Depois', photos.length)}
        </div>
        <div className="flex gap-2 min-w-0">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar paciente, procedimento ou texto clínico..."
              className="h-11 rounded-xl pl-10 bg-white border-slate-200 font-medium"
            />
          </div>
          <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-slate-200">
            <Filter className="w-4 h-4 text-slate-500" />
          </Button>
        </div>
      </div>

      {activeTab === 'evolucoes' && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div className="space-y-3">
            {records.map((record: any) => {
              const patient = patients.find(p => p.id === record.patientId);
              const prof = professionals.find(p => p.id === record.professionalId);
              return (
                <Card key={record.id} className="p-5 rounded-2xl bg-white border-slate-200 shadow-sm hover:border-slate-300 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex gap-4 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-slate-950 text-white flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="font-black text-slate-950 italic">{patient?.name || 'Paciente não encontrado'}</h4>
                          <Badge variant="outline" className="rounded-lg text-[10px] font-black lowercase">{record.type}</Badge>
                          <Badge className={cn('rounded-lg text-[10px] font-black', record.isFormal ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                            {record.isFormal ? 'Formalizada' : 'Pendente De Evolução'}
                          </Badge>
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          {format(new Date(record.date), 'dd/MM/yyyy HH:mm')} {prof?.name ? `• ${prof.name}` : ''}
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-slate-700 whitespace-pre-line">{record.content}</p>
                      </div>
                    </div>
                    {!embedded && record.patientId && (
                      <Button variant="outline" onClick={() => onOpenPatient?.(record.patientId)} className="h-9 rounded-xl text-xs font-bold shrink-0">
                        <User className="w-3.5 h-3.5 mr-1.5" />
                        Ficha
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
            {records.length === 0 && (
              <EmptyState icon={<FileText className="w-9 h-9" />} title="Nenhuma Evolução Encontrada" text="Registre a primeira evolução formal do tratamento." action={openEvolution} label="Nova Evolução" />
            )}
          </div>
          {!embedded && (
            <div className="space-y-4">
              <Card className="p-5 rounded-2xl bg-slate-950 text-white border-none shadow-xl">
                <Sparkles className="w-7 h-7 text-emerald-300 mb-5" />
                <h3 className="text-lg font-black italic">Modelos inteligentes</h3>
                <p className="text-sm text-slate-300 mt-2">Use templates para acelerar a evolução sem perder riqueza clínica.</p>
                <Button onClick={() => setIsTemplatesOpen(true)} className="w-full mt-5 h-10 rounded-xl bg-white text-slate-950 hover:bg-slate-100 font-black text-xs">
                  Gerenciar Templates
                </Button>
              </Card>
              <Card className="p-5 rounded-2xl bg-white border-slate-200">
                <h3 className="font-black text-slate-950 italic mb-4">Ações rápidas</h3>
                <div className="grid gap-2">
                  <Button onClick={openNote} variant="outline" className="justify-start h-10 rounded-xl font-bold text-xs">
                    <Edit3 className="w-4 h-4 mr-2" /> Rascunho Médico
                  </Button>
                  <Button onClick={openPhoto} variant="outline" className="justify-start h-10 rounded-xl font-bold text-xs">
                    <Camera className="w-4 h-4 mr-2" /> Antes E Depois
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {activeTab === 'rascunhos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {notes.map(note => {
            const patient = patients.find(p => p.id === note.patientId);
            return (
              <Card key={note.id} className={cn('p-5 rounded-2xl border shadow-sm min-h-[210px] flex flex-col justify-between', note.isDraft ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-200')}>
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-black italic text-slate-950 line-clamp-2">{note.title}</h4>
                    <Badge className={cn('rounded-lg text-[9px] font-black uppercase', note.isDraft ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800')}>
                      {note.isDraft ? 'Rascunho' : 'Nota'}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-slate-700 leading-relaxed whitespace-pre-line line-clamp-5">{note.content}</p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-200/60">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                    <span>{format(new Date(note.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                    <span>{patient?.name || 'Nota Livre'}</span>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2 mt-3">
                    <Button size="sm" variant="outline" className="h-8 rounded-lg text-[10px] font-bold" onClick={() => {
                      setEditingNoteId(note.id);
                      setNoteTitle(note.title);
                      setNoteContent(note.content);
                      setNotePatientId(note.patientId || 'none');
                      setNoteProfessionalId(note.professionalId || 'none');
                      setNoteIsDraft(note.isDraft);
                      setIsNoteOpen(true);
                    }}>
                      Editar
                    </Button>
                    {note.isDraft && (
                      <Button size="sm" className="h-8 rounded-lg bg-slate-950 text-white text-[10px] font-bold" onClick={() => convertNote(note)}>
                        <BookOpen className="w-3 h-3 mr-1" /> Evolução
                      </Button>
                    )}
                    <Button size="icon-sm" variant="ghost" className="text-red-500" onClick={async () => {
                      await removeDoctorNote(note.id);
                      toast.success('Anotação removida.');
                    }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
          {notes.length === 0 && (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyState icon={<Edit3 className="w-9 h-9" />} title="Nenhum Rascunho Encontrado" text="Crie lembretes rápidos durante a consulta e converta depois em evolução." action={openNote} label="Novo Rascunho" />
            </div>
          )}
        </div>
      )}

      {activeTab === 'fotos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {photos.map(photo => {
            const patient = patients.find(p => p.id === photo.patientId);
            return (
              <Card key={photo.id} className="p-4 rounded-2xl bg-white border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h4 className="font-black italic text-slate-950">{photo.procedureName}</h4>
                    <p className="text-[11px] text-slate-500 font-bold">{patient?.name || 'Paciente não encontrado'} • {format(new Date(photo.date + 'T12:00:00'), 'dd/MM/yyyy')}</p>
                  </div>
                  <Button size="icon-sm" variant="ghost" className="text-red-500" onClick={async () => {
                    await removeBeforeAfterPhoto(photo.id);
                    toast.success('Comparativo removido.');
                  }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                  <PhotoPanel src={photo.beforePhotoUrl} label="antes" tone="dark" />
                  <PhotoPanel src={photo.afterPhotoUrl} label="depois" tone="indigo" />
                </div>
                {photo.notes && <p className="mt-3 text-xs text-slate-600 bg-slate-50 rounded-xl p-3 leading-relaxed">{photo.notes}</p>}
              </Card>
            );
          })}
          {photos.length === 0 && (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyState icon={<Camera className="w-9 h-9" />} title="Nenhum Antes/Depois Cadastrado" text="Anexe fotos comparativas para acompanhar a evolução visual do procedimento." action={openPhoto} label="Novo Antes/Depois" />
            </div>
          )}
        </div>
      )}

      <Dialog open={isEvolutionOpen} onOpenChange={setIsEvolutionOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl max-h-[92vh] overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-white p-0 shadow-2xl">
          <div className="bg-slate-950 px-6 py-5 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl md:text-3xl font-black italic tracking-tight">
                {pendingConversionNote ? 'Converter Rascunho Em Evolução' : 'Nova Evolução Clínica'}
              </DialogTitle>
              <DialogDescription className="text-slate-300">
                Formalize a evolução do tratamento no histórico do paciente.
              </DialogDescription>
            </DialogHeader>
          </div>
          <form onSubmit={saveEvolution} className="space-y-6 px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
              <Field label="Paciente *">
                <Select value={evoPatientId} onValueChange={setEvoPatientId} disabled={!!patientId}>
                  <SelectTrigger className="h-12 w-full min-w-0 justify-start rounded-2xl bg-slate-50 border-slate-200 px-4">
                    <span className={selectDisplayClass}>{getPatientLabel(evoPatientId)}</span>
                  </SelectTrigger>
                  <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Profissional">
                <Select value={evoProfessionalId || 'none'} onValueChange={(v) => setEvoProfessionalId(v === 'none' ? '' : v)}>
                  <SelectTrigger className="h-12 w-full min-w-0 justify-start rounded-2xl bg-slate-50 border-slate-200 px-4">
                    <span className={selectDisplayClass}>{getProfessionalLabel(evoProfessionalId)}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não Informado</SelectItem>
                    {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tipo">
                <Select value={evoType} onValueChange={(v) => setEvoType(v as RecordType)}>
                  <SelectTrigger className="h-12 w-full min-w-0 justify-start rounded-2xl bg-slate-50 border-slate-200 px-4">
                    <span className={selectDisplayClass}>{RECORD_TYPE_LABELS[evoType]}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="evolução">Evolução Clínica</SelectItem>
                    <SelectItem value="avaliação">Avaliação / Anamnese</SelectItem>
                    <SelectItem value="prescrição">Prescrição</SelectItem>
                    <SelectItem value="exame">Exame / Outro</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Data">
                <Input type="date" value={evoDate} onChange={(e) => setEvoDate(e.target.value)} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-black" />
              </Field>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,420px)_minmax(0,1fr)] gap-5">
              <Field label="Template Clínico">
                <Select value={selectedTemplateId} onValueChange={handleTemplateSelection}>
                  <SelectTrigger className="h-12 w-full min-w-0 justify-start rounded-2xl bg-emerald-50 border-emerald-100 px-4 text-emerald-950">
                    <span className={selectDisplayClass}>{getTemplateLabel(selectedTemplateId)}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Texto Livre</SelectItem>
                    {templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Status Do Registro</p>
                <p className="mt-1 text-sm font-bold text-slate-700">
                  {pendingConversionNote ? 'Este rascunho só será removido depois que a evolução for salva com sucesso.' : 'A evolução será adicionada à linha clínica do paciente.'}
                </p>
              </div>
            </div>
            <Field label="Descrição Clínica *">
              <Textarea value={evoContent} onChange={(e) => setEvoContent(e.target.value)} className="min-h-[300px] rounded-2xl bg-slate-50 border-slate-200 p-5 text-[15px] leading-relaxed" placeholder="Descreva queixas, evolução, conduta, orientações, intercorrências e próximos passos..." />
            </Field>
            <DialogActions saving={saving} onCancel={() => setIsEvolutionOpen(false)} submitLabel={pendingConversionNote ? 'Salvar Evolução E Remover Rascunho' : 'Salvar Evolução'} />
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isNoteOpen} onOpenChange={setIsNoteOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl max-h-[92vh] overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-white p-0 shadow-2xl">
          <div className="bg-slate-950 px-6 py-5 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl md:text-3xl font-black italic tracking-tight">
                {editingNoteId ? 'Editar Anotação Médica' : 'Novo Rascunho Médico'}
              </DialogTitle>
              <DialogDescription className="text-slate-300">
                Registre lembretes rápidos da consulta, ideias clínicas ou pontos para revisar depois.
              </DialogDescription>
            </DialogHeader>
          </div>
          <form onSubmit={saveNote} className="space-y-6 px-6 py-6">
            <Field label="Título *">
              <Input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-black" placeholder="Ex: Retorno pós-procedimento, ideia para próxima sessão" />
            </Field>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Field label="Paciente">
                <Select value={notePatientId} onValueChange={setNotePatientId} disabled={!!patientId}>
                  <SelectTrigger className="h-12 w-full min-w-0 justify-start rounded-2xl bg-slate-50 border-slate-200 px-4">
                    <span className={selectDisplayClass}>{getPatientLabel(notePatientId, 'Nota Livre')}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nota Livre</SelectItem>
                    {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Profissional">
                <Select value={noteProfessionalId} onValueChange={setNoteProfessionalId}>
                  <SelectTrigger className="h-12 w-full min-w-0 justify-start rounded-2xl bg-slate-50 border-slate-200 px-4">
                    <span className={selectDisplayClass}>{getProfessionalLabel(noteProfessionalId)}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não Informado</SelectItem>
                    {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tipo">
                <Select value={noteIsDraft ? 'draft' : 'note'} onValueChange={(v) => setNoteIsDraft(v === 'draft')}>
                  <SelectTrigger className="h-12 w-full min-w-0 justify-start rounded-2xl bg-slate-50 border-slate-200 px-4">
                    <span className={selectDisplayClass}>{noteIsDraft ? 'Rascunho Rápido' : 'Nota Clínica'}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho Rápido</SelectItem>
                    <SelectItem value="note">Nota Clínica</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Texto Do Rascunho *">
              <Textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} className="min-h-[300px] rounded-2xl bg-slate-50 border-slate-200 p-5 text-[15px] leading-relaxed" placeholder="Rabisque observações, hipóteses, lembretes, alertas do paciente e próximos passos..." />
            </Field>
            <DialogActions saving={saving} onCancel={() => setIsNoteOpen(false)} submitLabel="Salvar Anotação" />
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPhotoOpen} onOpenChange={setIsPhotoOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-6xl max-h-[92vh] overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-white p-0 shadow-2xl">
          <div className="bg-slate-950 px-6 py-5 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl md:text-3xl font-black italic tracking-tight">Novo Antes E Depois</DialogTitle>
              <DialogDescription className="text-slate-300">
                Anexe imagens comparativas para acompanhar a evolução visual do paciente.
              </DialogDescription>
            </DialogHeader>
          </div>
          <form onSubmit={savePhoto} className="space-y-6 px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
              <Field label="Paciente *">
                <Select value={photoPatientId} onValueChange={setPhotoPatientId} disabled={!!patientId}>
                  <SelectTrigger className="h-12 w-full min-w-0 justify-start rounded-2xl bg-slate-50 border-slate-200 px-4">
                    <span className={selectDisplayClass}>{getPatientLabel(photoPatientId)}</span>
                  </SelectTrigger>
                  <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Profissional">
                <Select value={photoProfessionalId} onValueChange={setPhotoProfessionalId}>
                  <SelectTrigger className="h-12 w-full min-w-0 justify-start rounded-2xl bg-slate-50 border-slate-200 px-4">
                    <span className={selectDisplayClass}>{getProfessionalLabel(photoProfessionalId)}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não Informado</SelectItem>
                    {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Procedimento *">
                <Input value={photoProcedure} onChange={(e) => setPhotoProcedure(e.target.value)} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-black" placeholder="Ex: Preenchimento" />
              </Field>
              <Field label="Data">
                <Input type="date" value={photoDate} onChange={(e) => setPhotoDate(e.target.value)} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-black" />
              </Field>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <UploadBox label="Foto De Antes" preview={beforePreview} onClear={() => { setBeforeFile(null); setBeforePreview(''); }} onFile={(file) => handlePhotoFile(file, 'before')} />
              <UploadBox label="Foto De Depois" preview={afterPreview} onClear={() => { setAfterFile(null); setAfterPreview(''); }} onFile={(file) => handlePhotoFile(file, 'after')} />
            </div>
            <Field label="Observações Clínicas">
              <Textarea value={photoNotes} onChange={(e) => setPhotoNotes(e.target.value)} className="min-h-[120px] rounded-2xl bg-slate-50 border-slate-200 p-5 leading-relaxed" placeholder="Ex: 15 dias após aplicação, edema reduzido, manutenção prevista..." />
            </Field>
            {saving && <Progress value={photoProgress} className="h-2 rounded-full" />}
            <DialogActions saving={saving} onCancel={() => setIsPhotoOpen(false)} submitLabel="Salvar Fotos Comparativas" />
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isTemplatesOpen} onOpenChange={setIsTemplatesOpen}>
        <DialogContent className="max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic text-slate-950">Templates Clínicos</DialogTitle>
            <DialogDescription>Gerencie textos base para acelerar a evolução clínica.</DialogDescription>
          </DialogHeader>
          <TemplateManager templates={templates} onChange={saveTemplates} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-2">
      <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</Label>
      {children}
    </div>
  );
}

function DialogActions({ saving, onCancel, submitLabel }: { saving: boolean; onCancel: () => void; submitLabel: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-end gap-3 border-t border-slate-100 pt-5">
      <Button type="button" variant="ghost" onClick={onCancel} className="h-12 rounded-2xl font-bold text-xs">Cancelar</Button>
      <Button type="submit" disabled={saving} className="h-12 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-black text-xs px-7">
        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {submitLabel}
      </Button>
    </div>
  );
}

function EmptyState({ icon, title, text, action, label }: { icon: React.ReactNode; title: string; text: string; action: () => void; label: string }) {
  return (
    <Card className="py-16 px-6 text-center rounded-2xl bg-white border-dashed border-slate-200">
      <div className="w-20 h-20 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">{icon}</div>
      <h3 className="mt-5 text-lg font-black italic text-slate-950">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">{text}</p>
      <Button onClick={action} className="mt-5 h-10 rounded-xl bg-slate-950 text-white font-black text-xs">
        <Plus className="w-4 h-4 mr-2" />
        {label}
      </Button>
    </Card>
  );
}

function PhotoPanel({ src, label, tone }: { src: string; label: string; tone: 'dark' | 'indigo' }) {
  return (
    <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
      {src ? <img src={src} alt={label} className="absolute inset-0 w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-slate-300 absolute inset-0 m-auto" />}
      <span className={cn('absolute bottom-2 left-2 rounded-lg px-2 py-1 text-[9px] uppercase font-black tracking-wider text-white', tone === 'dark' ? 'bg-black/70' : 'bg-indigo-600/90')}>
        {label}
      </span>
      {label === 'depois' && (
        <div className="absolute top-2 left-2 rounded-full bg-white/90 p-1 text-slate-950 shadow">
          <ArrowLeftRight className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  );
}

function UploadBox({ label, preview, onClear, onFile }: { label: string; preview: string; onClear: () => void; onFile: (file?: File) => void }) {
  return (
    <div className="min-w-0 space-y-2">
      <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</Label>
      <div className="relative min-h-[310px] rounded-[1.35rem] border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center text-center group">
        {preview ? (
          <>
            <img src={preview} alt={label} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-4 pt-12">
              <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-white px-4 text-xs font-black text-slate-950 shadow-lg">
                <Camera className="mr-2 h-4 w-4" />
                Substituir Imagem
                <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} className="sr-only" />
              </label>
            </div>
            <button type="button" onClick={onClear} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg">
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="p-6">
            <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-4 group-hover:text-slate-500 transition-colors" />
            <p className="text-sm font-black text-slate-700">Clique Para Anexar</p>
            <p className="text-xs text-slate-400 mt-1">JPG, PNG ou WEBP</p>
            <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateManager({ templates, onChange }: { templates: any[]; onChange: (templates: any[]) => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const reset = () => {
    setTitle('');
    setContent('');
    setEditingId(null);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return toast.error('Título e conteúdo são obrigatórios.');
    if (editingId) {
      onChange(templates.map(t => t.id === editingId ? { ...t, title: title.trim(), content: content.trim() } : t));
      toast.success('Template atualizado.');
    } else {
      onChange([...templates, { id: String(Date.now()), title: title.trim(), content: content.trim() }]);
      toast.success('Template criado.');
    }
    reset();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
      <form onSubmit={save} className="md:col-span-2 space-y-3">
        <Field label={editingId ? 'Editar modelo' : 'Novo modelo'}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-10 rounded-xl bg-slate-50 border-slate-200 font-bold" placeholder="Nome do template" />
        </Field>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[180px] rounded-xl bg-slate-50 border-slate-200 p-3" placeholder="Texto base..." />
        <div className="flex gap-2">
          {editingId && <Button type="button" variant="ghost" onClick={reset} className="h-9 rounded-xl text-xs font-bold">Cancelar</Button>}
          <Button type="submit" className="h-9 rounded-xl bg-slate-950 text-white text-xs font-black">{editingId ? 'Salvar' : 'Criar'}</Button>
        </div>
      </form>
      <div className="md:col-span-3 space-y-2 max-h-[420px] overflow-y-auto">
        {templates.map(t => (
          <div key={t.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <h4 className="font-black italic text-slate-950">{t.title}</h4>
              <div className="flex gap-1">
                <Button size="icon-sm" variant="ghost" onClick={() => { setEditingId(t.id); setTitle(t.title); setContent(t.content); }}><Edit3 className="w-3.5 h-3.5" /></Button>
                <Button size="icon-sm" variant="ghost" className="text-red-500" onClick={() => onChange(templates.filter(item => item.id !== t.id))}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-600 line-clamp-3 whitespace-pre-line">{t.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
