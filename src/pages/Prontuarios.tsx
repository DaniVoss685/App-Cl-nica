import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  FileText, 
  Search, 
  Plus, 
  Calendar, 
  User, 
  Clock,
  ChevronRight,
  Filter,
  Activity,
  ClipboardList,
  CheckCircle2,
  Trash2,
  Edit3,
  Bookmark,
  Check,
  X,
  Camera,
  Image as ImageIcon,
  ArrowRight,
  BookOpen,
  ArrowLeftRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { PatientModal } from '../components/PatientModal';

const DEFAULT_TEMPLATES = [
  {
    id: '1',
    title: 'Toxina Botulínica (Botox)',
    content: 'Realizado procedimento de aplicação de Toxina Botulínica em região frontal (12 UI), glabela (15 UI) e orbicular dos olhos (10 UI). Diluição padrão realizada com 2.0ml de soro fisiológico estéril 0,9%. Antissepsia local rigorosa com álcool 70%. Paciente cooperativo, tolerou bem a aplicação. Sem intercorrências imediatas ou sangramento ativo. Orientado a não deitar por 4 horas e evitar atividades físicas nas próximas 24h.'
  },
  {
    id: '2',
    title: 'Preenchimento Labial',
    content: 'Realizado preenchimento labial com Ácido Hialurônico (1.0ml). Utilizada técnica de retroinjeção retrógrada e microbolus com agulha 30G para definição de contorno e projeção de tubérculos lábio superior e inferior. Realizada massagem manual vigorosa local para homogeneização do produto. Presença de edema e eritema transitório previstos. Paciente ciente dos cuidados pós e orientado a aplicar compressa gelada.'
  },
  {
    id: '3',
    title: 'Limpeza de Pele Profunda',
    content: 'Limpeza de pele profunda realizada com higienização facial, esfoliação física, emoliência com vapor de ozônio e creme emoliente por 15 min. Extração manual de comedões abertos e fechados. Aplicação de alta frequência por 5 minutos para ação antisséptica, cicatrizante e descongestionante. Aplicação de máscara calmante de azuleno por 15 min. Finalizado com sérum regenerador e fotoproteção FPS 50.'
  },
  {
    id: '4',
    title: 'Bioestimulador de Colágeno',
    content: 'Procedimento de bioestimulação de colágeno facial com ácido poli-L-lático (Sculptra) diluído previamente em 8ml de AD + 2ml de lidocaína 2% sem vasoconritor. Aplicação com microcânula 22G em leque no plano subdérmico nas regiões malar, zigomática e contorno mandibular. Realizada massagem imediata. Paciente orientado a realizar protocolo de massagem 5-5-5 em domicílio.'
  },
  {
    id: '5',
    title: 'Avaliação Facial Estética (Anamnese)',
    content: 'Paciente compareceu relatando queixa de flacidez facial e perda de contorno mandibular. Ao exame clínico visual e palpação: presença de ptose leve de terço médio, sulco nasogeniano evidente, e perda de definição de borda mandibular. Proposta de plano terapêutico inicial: 2 sessões de Bioestimulador com intervalo de 30 dias + Toxina Botulínica preventiva em terço superior. Paciente esclarecido e aprovou proposta.'
  }
];

export function Prontuarios() {
  const { 
    patients, 
    appointments, 
    services, 
    professionals, 
    medicalRecords, 
    addMedicalRecord,
    doctorNotes,
    addDoctorNote,
    updateDoctorNote,
    removeDoctorNote,
    beforeAfterPhotos,
    addBeforeAfterPhoto,
    removeBeforeAfterPhoto
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'evolucoes' | 'anotacoes' | 'fotos'>('evolucoes');

  // Patient Modal triggers
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientModalOpen, setPatientModalOpen] = useState(false);

  // Custom Templates states
  const [templates, setTemplates] = useState<any[]>(() => {
    const saved = localStorage.getItem('stark_clinical_templates');
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
  });
  const [isManageTemplatesOpen, setIsManageTemplatesOpen] = useState(false);
  const [isEditingTemplate, setIsEditingTemplate] = useState<any | null>(null);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');

  // Nova Evolução states
  const [isNewEvolutionOpen, setIsNewEvolutionOpen] = useState(false);
  const [evoPatientId, setEvoPatientId] = useState('');
  const [evoType, setEvoType] = useState<'evolução' | 'avaliação' | 'prescrição' | 'exame'>('evolução');
  const [evoProfessionalId, setEvoProfessionalId] = useState('');
  const [evoContent, setEvoContent] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('none');
  const [evoDate, setEvoDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Nova Anotação states
  const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [notePatientId, setNotePatientId] = useState('none');
  const [noteIsDraft, setNoteIsDraft] = useState(true);

  // Novo Antes e Depois states
  const [isNewPhotoOpen, setIsNewPhotoOpen] = useState(false);
  const [photoPatientId, setPhotoPatientId] = useState('');
  const [photoProcedure, setPhotoProcedure] = useState('');
  const [photoDate, setPhotoDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [photoBefore, setPhotoBefore] = useState('');
  const [photoAfter, setPhotoAfter] = useState('');
  const [photoNotes, setPhotoNotes] = useState('');

  // Save templates to storage
  const handleSaveTemplates = (newTemplates: any[]) => {
    setTemplates(newTemplates);
    localStorage.setItem('stark_clinical_templates', JSON.stringify(newTemplates));
  };

  // Memoized records lists
  const records = useMemo(() => {
    const list: any[] = medicalRecords.map(mr => ({
      id: mr.id,
      patientId: mr.patientId,
      professionalId: mr.professionalId,
      appointmentId: mr.appointmentId,
      date: mr.date.split('T')[0],
      time: mr.date.includes('T') ? mr.date.split('T')[1].substring(0, 5) : '12:00',
      content: mr.content,
      type: mr.type,
      isEvolution: true,
      serviceName: mr.appointmentId ? services.find(s => s.id === appointments.find(a => a.id === mr.appointmentId)?.serviceId)?.name : 'evolução clínica'
    }));

    appointments
      .filter(a => a.status === 'realizado')
      .forEach(appt => {
        const hasLinkedRecord = medicalRecords.some(r => r.appointmentId === appt.id);
        if (!hasLinkedRecord) {
          list.push({
            id: `appt-${appt.id}`,
            patientId: appt.patientId,
            professionalId: appt.professionalId,
            appointmentId: appt.id,
            date: appt.date,
            time: appt.startTime,
            content: appt.notes || 'consulta realizada - sem evolução registrada',
            type: 'evolução',
            isEvolution: false,
            serviceName: services.find(s => s.id === appt.serviceId)?.name || 'procedimento realizado'
          });
        }
      });

    return list
      .filter(item => {
        if (!searchTerm) return true;
        const patient = patients.find(p => p.id === item.patientId);
        const pName = (patient?.name || '').toLowerCase();
        const pContent = (item.content || '').toLowerCase();
        const pService = (item.serviceName || '').toLowerCase();
        const term = searchTerm.toLowerCase();
        return pName.includes(term) || pContent.includes(term) || pService.includes(term) || item.date.includes(term);
      })
      .sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return (b.time || '').localeCompare(a.time || '');
      });
  }, [appointments, medicalRecords, services, patients, searchTerm]);

  // Doctor notes filtering
  const filteredNotes = useMemo(() => {
    return (doctorNotes || []).filter(note => {
      const term = searchTerm.toLowerCase();
      const patient = patients.find(p => p.id === note.patientId);
      const patientName = patient ? patient.name.toLowerCase() : '';
      return note.title.toLowerCase().includes(term) || 
             note.content.toLowerCase().includes(term) || 
             patientName.includes(term);
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [doctorNotes, patients, searchTerm]);

  // Before & After photos filtering
  const filteredPhotos = useMemo(() => {
    return (beforeAfterPhotos || []).filter(item => {
      const term = searchTerm.toLowerCase();
      const patient = patients.find(p => p.id === item.patientId);
      const patientName = patient ? patient.name.toLowerCase() : '';
      return item.procedureName.toLowerCase().includes(term) || 
             patientName.includes(term) || 
             (item.notes || '').toLowerCase().includes(term);
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [beforeAfterPhotos, patients, searchTerm]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const evolutionsToday = records.filter(r => r.date === todayStr).length;

  const handleTemplateSelection = (id: string) => {
    setSelectedTemplateId(id);
    if (id === 'none') return;
    const temp = templates.find(t => t.id === id);
    if (temp) {
      setEvoContent(temp.content);
    }
  };

  // Submit Nova Evolução
  const handleCreateEvolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evoPatientId) {
      toast.error('Selecione um paciente!');
      return;
    }
    if (!evoContent.trim()) {
      toast.error('Escreva o conteúdo da evolução!');
      return;
    }

    const selectedProf = evoProfessionalId || (professionals.length > 0 ? professionals[0].id : 'none');

    addMedicalRecord({
      patientId: evoPatientId,
      professionalId: selectedProf,
      date: `${evoDate}T${format(new Date(), 'HH:mm:ss')}`,
      content: evoContent,
      type: evoType
    });

    toast.success('Evolução clínica registrada com sucesso!');
    setIsNewEvolutionOpen(false);
    setEvoPatientId('');
    setEvoContent('');
    setEvoType('evolução');
    setSelectedTemplateId('none');
  };

  // Submit Doctor Note
  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) {
      toast.error('Título e conteúdo são obrigatórios!');
      return;
    }

    const patientVal = notePatientId === 'none' ? undefined : notePatientId;

    if (editingNoteId) {
      updateDoctorNote(editingNoteId, {
        title: noteTitle,
        content: noteContent,
        patientId: patientVal,
        isDraft: noteIsDraft
      });
      toast.success('Anotação atualizada!');
    } else {
      addDoctorNote({
        title: noteTitle,
        content: noteContent,
        patientId: patientVal,
        isDraft: noteIsDraft
      });
      toast.success('Anotação criada com sucesso!');
    }

    setIsNewNoteOpen(false);
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteContent('');
    setNotePatientId('none');
    setNoteIsDraft(true);
  };

  // Convert draft note to evolution
  const handleConvertNoteToEvolution = (note: any) => {
    setEvoPatientId(note.patientId || '');
    setEvoContent(note.content);
    setEvoType('evolução');
    setEvoDate(format(new Date(), 'yyyy-MM-dd'));
    
    // Remove the draft note after conversion
    removeDoctorNote(note.id);
    
    setIsNewEvolutionOpen(true);
    toast.info('Modifique os dados e clique em Salvar para formalizar a evolução.');
  };

  // Base64 file loaders for images
  const handleBeforePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => setPhotoBefore(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAfterPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => setPhotoAfter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Submit Before & After Photo
  const handleSavePhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoPatientId || !photoProcedure.trim()) {
      toast.error('Paciente e procedimento são obrigatórios!');
      return;
    }
    if (!photoBefore || !photoAfter) {
      toast.error('Selecione ambas as fotos (Antes e Depois) para fazer a comparação!');
      return;
    }

    addBeforeAfterPhoto({
      patientId: photoPatientId,
      procedureName: photoProcedure,
      date: photoDate,
      beforePhotoUrl: photoBefore,
      afterPhotoUrl: photoAfter,
      notes: photoNotes
    });

    toast.success('Pares de fotos de Antes & Depois cadastrado!');
    setIsNewPhotoOpen(false);
    setPhotoPatientId('');
    setPhotoProcedure('');
    setPhotoBefore('');
    setPhotoAfter('');
    setPhotoNotes('');
  };

  // Add or Edit template in templates manager
  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateTitle.trim() || !newTemplateContent.trim()) {
      toast.error('Título e conteúdo são obrigatórios!');
      return;
    }

    if (isEditingTemplate) {
      const updated = templates.map(t => t.id === isEditingTemplate.id ? { ...t, title: newTemplateTitle, content: newTemplateContent } : t);
      handleSaveTemplates(updated);
      toast.success('Modelo atualizado!');
    } else {
      const newTemp = {
        id: String(Date.now()),
        title: newTemplateTitle,
        content: newTemplateContent
      };
      handleSaveTemplates([...templates, newTemp]);
      toast.success('Novo modelo criado!');
    }

    setNewTemplateTitle('');
    setNewTemplateContent('');
    setIsEditingTemplate(null);
  };

  // Delete a template
  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    handleSaveTemplates(updated);
    toast.success('Modelo removido!');
    if (selectedTemplateId === id) {
      setSelectedTemplateId('none');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic lowercase">gestão de prontuários</h1>
          <p className="text-slate-500 lowercase">histórico clínico digital, anotações de rascunho e galeria comparativa.</p>
        </div>
        <div className="flex gap-2">
          {activeSubTab === 'evolucoes' && (
            <>
              <Button 
                onClick={() => setIsManageTemplatesOpen(true)}
                variant="outline" 
                className="rounded-xl font-bold text-xs h-11 border-slate-200 lowercase shrink-0 cursor-pointer"
              >
                gerenciar templates
              </Button>
              <Button 
                onClick={() => {
                  if (professionals.length > 0) setEvoProfessionalId(professionals[0].id);
                  setIsNewEvolutionOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs h-11 shadow-lg shadow-indigo-100 lowercase cursor-pointer"
              >
                <Plus className="w-5 h-5 mr-2" />
                nova evolução
              </Button>
            </>
          )}
          {activeSubTab === 'anotacoes' && (
            <Button 
              onClick={() => {
                setEditingNoteId(null);
                setNoteTitle('');
                setNoteContent('');
                setNotePatientId('none');
                setNoteIsDraft(true);
                setIsNewNoteOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs h-11 shadow-lg shadow-indigo-100 lowercase cursor-pointer"
            >
              <Plus className="w-5 h-5 mr-2" />
              nova anotação/rascunho
            </Button>
          )}
          {activeSubTab === 'fotos' && (
            <Button 
              onClick={() => setIsNewPhotoOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs h-11 shadow-lg shadow-indigo-100 lowercase cursor-pointer"
            >
              <Plus className="w-5 h-5 mr-2" />
              novo antes & depois
            </Button>
          )}
        </div>
      </div>

      {/* Sub Tabs Selector */}
      <div className="flex gap-1.5 p-1 bg-slate-100/80 rounded-2xl max-w-lg select-none">
        <button 
          onClick={() => setActiveSubTab('evolucoes')}
          className={cn(
            "flex-1 py-2 px-4 text-[10px] font-black italic rounded-xl transition-all capitalize whitespace-nowrap cursor-pointer",
            activeSubTab === 'evolucoes' ? "bg-white text-indigo-650 shadow-sm" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <FileText className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
          Evoluções & Prontuário
        </button>
        <button 
          onClick={() => setActiveSubTab('anotacoes')}
          className={cn(
            "flex-1 py-2 px-4 text-[10px] font-black italic rounded-xl transition-all capitalize whitespace-nowrap cursor-pointer",
            activeSubTab === 'anotacoes' ? "bg-white text-indigo-650 shadow-sm" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Edit3 className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
          Bloco de Notas (Rabiscos)
        </button>
        <button 
          onClick={() => setActiveSubTab('fotos')}
          className={cn(
            "flex-1 py-2 px-4 text-[10px] font-black italic rounded-xl transition-all capitalize whitespace-nowrap cursor-pointer",
            activeSubTab === 'fotos' ? "bg-white text-indigo-650 shadow-sm" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Camera className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
          Antes e Depois
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <Input 
            placeholder={
              activeSubTab === 'evolucoes' ? "Buscar por paciente, procedimento ou data..." :
              activeSubTab === 'anotacoes' ? "Buscar notes por título, conteúdo ou paciente..." :
              "Buscar fotos por paciente ou procedimento..."
            }
            className="pl-12 h-12 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-indigo-500 text-sm font-bold text-slate-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-slate-200 shrink-0">
          <Filter className="w-5 h-5 text-slate-400" />
        </Button>
      </div>

      {/* Main Content Area based on SubTab */}
      {activeSubTab === 'evolucoes' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">data / hora</th>
                      <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">paciente</th>
                      <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">procedimento/tipo</th>
                      <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">status evolução</th>
                      <th className="text-center py-4 px-6 text-[10px] font-black text-slate-400 italic lowercase">ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec) => {
                      const patient = patients.find(p => p.id === rec.patientId);
                      return (
                        <tr 
                          key={rec.id} 
                          onClick={() => {
                            setSelectedPatientId(rec.patientId);
                            setPatientModalOpen(true);
                          }}
                          className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                              <span className="font-mono text-xs text-slate-700">{format(new Date(rec.date + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                              <span className="text-[10px] text-slate-400 ml-1 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-350" /> {rec.time}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 text-xs font-bold capitalize">
                                {patient?.name ? patient.name.charAt(0) : 'P'}
                              </div>
                              <span className="font-black text-slate-900 italic text-sm">{patient?.name || 'Paciente não encontrado'}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-white text-indigo-650 border-indigo-100 text-[10px] font-extrabold truncate max-w-[180px] lowercase italic">
                                {rec.serviceName}
                              </Badge>
                              <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[9px] font-bold lowercase">
                                {rec.type}
                              </Badge>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                              <span className={cn(
                                "text-xs font-bold lowercase italic",
                                rec.isEvolution ? "text-green-600" : "text-amber-600"
                              )}>
                                {rec.isEvolution ? "finalizada (assinada)" : "agendamento concluído"}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                            <Button 
                              onClick={() => {
                                setSelectedPatientId(rec.patientId);
                                setPatientModalOpen(true);
                              }}
                              variant="ghost" 
                              size="sm" 
                              className="bg-slate-50 text-slate-650 hover:bg-indigo-600 hover:text-white rounded-xl lowercase italic font-bold cursor-pointer"
                            >
                              abrir ficha
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}

                    {records.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 font-bold italic text-sm">
                          Nenhum registro clínico encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="p-6 bg-white border-slate-200 rounded-[2rem] shadow-sm">
              <h3 className="font-black text-slate-900 italic mb-4 flex items-center gap-2 lowercase text-sm">
                <Activity className="w-5 h-5 text-indigo-500" />
                overview clínico
              </h3>
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 mb-1 lowercase">evoluções registradas hoje</p>
                  <p className="text-2xl font-black text-slate-900 italic">{evolutionsToday}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 mb-1 lowercase">total geral de evoluções</p>
                  <p className="text-2xl font-black text-indigo-600 italic">{medicalRecords.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-slate-900 text-white rounded-[2rem] shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-[5rem]" />
              <div className="relative z-10">
                <ClipboardList className="w-8 h-8 text-indigo-400 mb-4" />
                <h3 className="text-xl font-black italic leading-tight mb-2 lowercase">modelos inteligentes</h3>
                <p className="text-slate-400 text-xs mb-6 lowercase">crie prontuários 10x mais rápido com nossos templates configurados.</p>
                <Button 
                  onClick={() => setIsManageTemplatesOpen(true)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 rounded-xl lowercase cursor-pointer"
                >
                  gerenciar templates
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeSubTab === 'anotacoes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredNotes.map((note) => {
            const patient = patients.find(p => p.id === note.patientId);
            return (
              <Card 
                key={note.id} 
                className={cn(
                  "p-5 rounded-[2rem] border shadow-sm relative flex flex-col justify-between min-h-[220px] transition-all group hover:shadow-md",
                  note.isDraft ? "bg-amber-50/40 border-amber-200/50" : "bg-indigo-50/20 border-indigo-100/60"
                )}
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="font-black text-slate-900 italic text-sm line-clamp-1">{note.title}</span>
                    <Badge className={cn(
                      "text-[9px] font-black uppercase tracking-wider rounded-lg shrink-0 px-2 py-0.5",
                      note.isDraft ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-indigo-100 text-indigo-800 border border-indigo-200"
                    )}>
                      {note.isDraft ? 'rascunho' : 'anotação'}
                    </Badge>
                  </div>
                  <p className="text-slate-650 text-xs font-medium leading-relaxed line-clamp-5 whitespace-pre-line mb-4">
                    {note.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100/60 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                    <span className="font-mono">{format(new Date(note.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                    {patient ? (
                      <button 
                        onClick={() => {
                          setSelectedPatientId(patient.id);
                          setPatientModalOpen(true);
                        }}
                        className="text-indigo-600 hover:underline flex items-center gap-0.5 font-black uppercase tracking-wider"
                      >
                        👤 {patient.name.split(' ')[0]}
                      </button>
                    ) : (
                      <span className="text-slate-400 italic">anotação livre</span>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-[10px] font-bold cursor-pointer"
                      onClick={() => {
                        setEditingNoteId(note.id);
                        setNoteTitle(note.title);
                        setNoteContent(note.content);
                        setNotePatientId(note.patientId || 'none');
                        setNoteIsDraft(note.isDraft);
                        setIsNewNoteOpen(true);
                      }}
                    >
                      editar
                    </Button>
                    {note.isDraft && patient && (
                      <Button
                        size="sm"
                        className="h-8 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 rounded-lg text-[10px] font-black cursor-pointer border border-indigo-200/50"
                        onClick={() => handleConvertNoteToEvolution(note)}
                      >
                        <BookOpen className="w-3 h-3 mr-1" /> evolução
                      </Button>
                    )}
                    <button 
                      onClick={() => {
                        removeDoctorNote(note.id);
                        toast.success('Anotação excluída');
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer self-center"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}

          {filteredNotes.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 font-bold italic text-sm">
              Nenhuma anotação ou rascunho encontrado. Clique em "+ Nova Anotação/Rascunho" para começar.
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'fotos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredPhotos.map((item) => {
            const patient = patients.find(p => p.id === item.patientId);
            return (
              <Card key={item.id} className="p-5 rounded-[2.5rem] border border-slate-200 shadow-sm bg-white overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div>
                      <h4 className="font-black text-slate-900 italic text-sm">{item.procedureName}</h4>
                      <p className="text-[10px] text-slate-400 font-bold italic">{patient?.name || 'Paciente não encontrado'}</p>
                    </div>
                    <Badge variant="outline" className="bg-slate-50 text-slate-500 text-[8px] font-bold shrink-0">{item.date}</Badge>
                  </div>

                  {/* Before / After Images slider comparator */}
                  <div className="relative h-56 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center select-none group">
                    <div className="absolute inset-0 grid grid-cols-2 divide-x divide-white">
                      <div className="relative w-full h-full overflow-hidden">
                        <img src={item.beforePhotoUrl} alt="Antes" className="absolute inset-0 w-full h-full object-cover" />
                        <span className="absolute bottom-2 left-2 bg-black/60 text-white font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-lg z-10">Antes</span>
                      </div>
                      <div className="relative w-full h-full overflow-hidden">
                        <img src={item.afterPhotoUrl} alt="Depois" className="absolute inset-0 w-full h-full object-cover" />
                        <span className="absolute bottom-2 right-2 bg-indigo-600/90 text-white font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-lg z-10">Depois</span>
                      </div>
                    </div>
                    {/* Visual Comparison indicator */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-white/95 text-indigo-950 font-black text-[10px] italic shadow-lg rounded-xl px-3 py-1.5 flex items-center gap-1">
                        <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-550" />
                        antes & depois
                      </div>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-[11px] text-slate-500 font-medium italic mt-3 line-clamp-2 leading-relaxed bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                      {item.notes}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-mono">Cadastrado em {format(new Date(item.createdAt), 'dd/MM/yyyy')}</span>
                  <button 
                    onClick={() => {
                      removeBeforeAfterPhoto(item.id);
                      toast.success('Par de fotos excluído');
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Excluir comparação"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            );
          })}

          {filteredPhotos.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 font-bold italic text-sm">
              Nenhuma foto de Antes & Depois cadastrada. Clique em "+ Novo Antes & Depois" para criar.
            </div>
          )}
        </div>
      )}

      {/* Patient details modal */}
      {selectedPatientId && (
        <PatientModal 
          isOpen={patientModalOpen}
          onClose={() => {
            setPatientModalOpen(false);
            setSelectedPatientId(null);
          }}
          patientId={selectedPatientId}
          initialTab="clinical"
        />
      )}

      {/* DIALOG: NOVA EVOLUÇÃO */}
      <Dialog open={isNewEvolutionOpen} onOpenChange={setIsNewEvolutionOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-3xl p-6 shadow-2xl font-sans text-xs">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic text-slate-900 lowercase">nova evolução clínica</DialogTitle>
            <DialogDescription className="text-slate-400 lowercase">registre um novo evento no histórico do paciente.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateEvolution} className="space-y-4 pt-3 text-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Paciente *</Label>
                <Select value={evoPatientId} onValueChange={setEvoPatientId}>
                  <SelectTrigger className="h-11 bg-slate-50 border-none font-bold text-slate-800 rounded-xl">
                    <SelectValue placeholder="Selecione o paciente..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px] overflow-y-auto">
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id} className="font-bold text-xs">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Tipo de Registro</Label>
                <Select value={evoType} onValueChange={(v: any) => setEvoType(v)}>
                  <SelectTrigger className="h-11 bg-slate-50 border-none font-bold text-slate-800 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="evolução" className="font-bold text-xs">Evolução Clínica</SelectItem>
                    <SelectItem value="avaliação" className="font-bold text-xs">Avaliação / Anamnese</SelectItem>
                    <SelectItem value="prescrição" className="font-bold text-xs">Prescrição Médica</SelectItem>
                    <SelectItem value="exame" className="font-bold text-xs">Exame / Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Profissional Responsável</Label>
                <Select value={evoProfessionalId} onValueChange={setEvoProfessionalId}>
                  <SelectTrigger className="h-11 bg-slate-50 border-none font-bold text-slate-800 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals.map(p => (
                      <SelectItem key={p.id} value={p.id} className="font-bold text-xs">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Data do Atendimento</Label>
                <Input 
                  type="date" 
                  value={evoDate}
                  onChange={(e) => setEvoDate(e.target.value)}
                  className="h-11 bg-slate-50 border-none font-bold rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100/60">
              <Label className="text-[10px] font-black text-indigo-900 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-indigo-550" /> Carregar Modelo Pré-Configurado (Template)
              </Label>
              <Select value={selectedTemplateId} onValueChange={handleTemplateSelection}>
                <SelectTrigger className="h-10 bg-white border-slate-200 font-bold text-indigo-950 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  <SelectItem value="none" className="font-medium text-slate-400 italic">Escrever texto livre (sem modelo)</SelectItem>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id} className="font-bold text-xs">{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Conteúdo / Descrição Clínica *</Label>
              <Textarea 
                value={evoContent}
                onChange={(e) => setEvoContent(e.target.value)}
                placeholder="Insira aqui as notas de evolução, exames, queixas e detalhes clínicos..."
                className="min-h-[160px] bg-slate-50 border-none font-medium text-sm text-slate-800 rounded-xl focus-visible:ring-indigo-500"
                required
              />
            </div>

            <div className="flex gap-3 justify-end pt-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsNewEvolutionOpen(false)}
                className="rounded-xl h-11 text-slate-500 font-bold text-xs lowercase cursor-pointer"
              >
                cancelar
              </Button>
              <Button 
                type="submit"
                className="bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl h-11 px-6 font-bold text-xs lowercase shadow-lg shadow-indigo-100 cursor-pointer"
              >
                salvar evolução
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: NOVA ANOTAÇÃO / RABISCO */}
      <Dialog open={isNewNoteOpen} onOpenChange={setIsNewNoteOpen}>
        <DialogContent className="max-w-xl bg-white rounded-3xl p-6 shadow-2xl font-sans text-xs">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic text-slate-900 lowercase">
              {editingNoteId ? 'editar anotação médica' : 'nova anotação médica / rascunho'}
            </DialogTitle>
            <DialogDescription className="text-slate-400 lowercase">
              crie uma nota de rascunho clínico. você pode mantê-la livre ou vinculá-la a um paciente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveNote} className="space-y-4 pt-3 text-slate-800">
            <div className="space-y-1">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Título da Anotação *</Label>
              <Input 
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Ex: Idéia de tratamento paciente tal, rascunho rápido, etc."
                className="h-11 bg-slate-50 border-none font-bold rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Vincular a Paciente</Label>
                <Select value={notePatientId} onValueChange={setNotePatientId}>
                  <SelectTrigger className="h-11 bg-slate-50 border-none font-bold text-slate-800 rounded-xl">
                    <SelectValue placeholder="Sem paciente (Anotação livre)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    <SelectItem value="none" className="font-bold text-slate-400 italic">Sem paciente (Anotação livre)</SelectItem>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id} className="font-bold text-xs">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Tipo da Nota</Label>
                <Select value={noteIsDraft ? 'draft' : 'note'} onValueChange={(v) => setNoteIsDraft(v === 'draft')}>
                  <SelectTrigger className="h-11 bg-slate-50 border-none font-bold text-slate-800 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft" className="font-bold text-xs">Rascunho Rápido (Rabisco)</SelectItem>
                    <SelectItem value="note" className="font-bold text-xs">Nota Clínica Salva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Texto da Anotação *</Label>
              <Textarea 
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Rabisque suas anotações, lembretes ou rascunhos sobre tratamentos aqui..."
                className="min-h-[160px] bg-slate-50 border-none font-medium text-sm text-slate-800 rounded-xl focus-visible:ring-indigo-500"
                required
              />
            </div>

            <div className="flex gap-3 justify-end pt-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsNewNoteOpen(false)}
                className="rounded-xl h-11 text-slate-500 font-bold text-xs lowercase cursor-pointer"
              >
                cancelar
              </Button>
              <Button 
                type="submit"
                className="bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl h-11 px-6 font-bold text-xs lowercase shadow-lg shadow-indigo-100 cursor-pointer"
              >
                salvar anotação
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: NOVO ANTES E DEPOIS (FOTOS) */}
      <Dialog open={isNewPhotoOpen} onOpenChange={setIsNewPhotoOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-3xl p-6 shadow-2xl font-sans text-xs">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic text-slate-900 lowercase">novo antes e depois (anexar fotos)</DialogTitle>
            <DialogDescription className="text-slate-400 lowercase">cadastre fotos comparativas de um paciente para análise ou postagens.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePhoto} className="space-y-4 pt-3 text-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Paciente *</Label>
                <Select value={photoPatientId} onValueChange={setPhotoPatientId} required>
                  <SelectTrigger className="h-11 bg-slate-50 border-none font-bold text-slate-800 rounded-xl">
                    <SelectValue placeholder="Selecione o paciente..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id} className="font-bold text-xs">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Procedimento *</Label>
                <Input 
                  value={photoProcedure}
                  onChange={(e) => setPhotoProcedure(e.target.value)}
                  placeholder="Ex: Preenchimento Labial, Botox"
                  className="h-11 bg-slate-50 border-none font-bold rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Data da Foto</Label>
                <Input 
                  type="date" 
                  value={photoDate}
                  onChange={(e) => setPhotoDate(e.target.value)}
                  className="h-11 bg-slate-50 border-none font-bold rounded-xl"
                  required
                />
              </div>
              <div>
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Observações Clínicas (Opcional)</Label>
                <Input 
                  value={photoNotes}
                  onChange={(e) => setPhotoNotes(e.target.value)}
                  placeholder="Ex: Após 15 dias da aplicação, 1ml"
                  className="h-11 bg-slate-50 border-none font-bold rounded-xl"
                />
              </div>
            </div>

            {/* Simulated/Real File Selection for Before and After */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Foto de ANTES *</Label>
                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 transition-colors p-4 rounded-2xl flex flex-col items-center justify-center bg-slate-50/50 min-h-[140px] text-center relative overflow-hidden group">
                  {photoBefore ? (
                    <>
                      <img src={photoBefore} alt="Antes preview" className="absolute inset-0 w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => setPhotoBefore('')}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-700 transition-colors z-20 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-slate-400 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold text-slate-500">Arraste ou Clique para subir a foto de antes</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleBeforePhotoChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        required
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Foto de DEPOIS *</Label>
                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 transition-colors p-4 rounded-2xl flex flex-col items-center justify-center bg-slate-50/50 min-h-[140px] text-center relative overflow-hidden group">
                  {photoAfter ? (
                    <>
                      <img src={photoAfter} alt="Depois preview" className="absolute inset-0 w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => setPhotoAfter('')}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-700 transition-colors z-20 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-slate-400 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold text-slate-500">Arraste ou Clique para subir a foto de depois</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleAfterPhotoChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        required
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsNewPhotoOpen(false)}
                className="rounded-xl h-11 text-slate-500 font-bold text-xs lowercase cursor-pointer"
              >
                cancelar
              </Button>
              <Button 
                type="submit"
                className="bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl h-11 px-6 font-bold text-xs lowercase shadow-lg shadow-indigo-100 cursor-pointer"
              >
                salvar fotos comparativas
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: GERENCIAR TEMPLATES */}
      <Dialog open={isManageTemplatesOpen} onOpenChange={setIsManageTemplatesOpen}>
        <DialogContent className="max-w-3xl bg-white rounded-3xl p-6 shadow-2xl font-sans text-xs">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black italic text-slate-900 lowercase">modelos de prontuário (templates)</DialogTitle>
            <DialogDescription className="text-slate-400 lowercase">crie e gerencie os modelos textuais usados na evolução clínica.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 max-h-[500px] overflow-y-auto pr-1">
            <div className="md:col-span-2 space-y-4 border-r border-slate-100 pr-4">
              <h4 className="font-extrabold text-slate-900 uppercase text-[10px] tracking-wider mb-2">
                {isEditingTemplate ? 'Editar Modelo' : 'Novo Modelo'}
              </h4>
              <form onSubmit={handleSaveTemplate} className="space-y-3">
                <div>
                  <Label className="text-[9px] text-slate-400 font-bold uppercase mb-1 block">Título do Modelo *</Label>
                  <Input 
                    value={newTemplateTitle}
                    onChange={(e) => setNewTemplateTitle(e.target.value)}
                    placeholder="Ex: Botox preventivo"
                    className="h-10 border-slate-200 text-xs font-bold w-full rounded-xl bg-slate-50/50"
                    required
                  />
                </div>
                <div>
                  <Label className="text-[9px] text-slate-400 font-bold uppercase mb-1 block">Texto / Corpo do Modelo *</Label>
                  <Textarea 
                    value={newTemplateContent}
                    onChange={(e) => setNewTemplateContent(e.target.value)}
                    placeholder="Escreva a estrutura do texto..."
                    className="min-h-[140px] border-slate-200 text-xs font-medium w-full rounded-xl bg-slate-50/50"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  {isEditingTemplate && (
                    <Button 
                      type="button" 
                      onClick={() => {
                        setIsEditingTemplate(null);
                        setNewTemplateTitle('');
                        setNewTemplateContent('');
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-slate-500 rounded-xl h-9 text-[10px] font-bold cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5 mr-1" /> cancelar
                    </Button>
                  )}
                  <Button 
                    type="submit"
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-9 px-4 text-[10px] font-bold lowercase shadow-md shadow-indigo-150 shrink-0 cursor-pointer"
                  >
                    {isEditingTemplate ? 'salvar alterações' : 'criar modelo'}
                  </Button>
                </div>
              </form>
            </div>

            <div className="md:col-span-3 space-y-3">
              <h4 className="font-extrabold text-slate-900 uppercase text-[10px] tracking-wider mb-2">Modelos Cadastrados</h4>
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {templates.map(t => (
                  <div key={t.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col justify-between gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-extrabold text-slate-900 italic text-[11px]">{t.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button 
                          onClick={() => {
                            setIsEditingTemplate(t);
                            setNewTemplateTitle(t.title);
                            setNewTemplateContent(t.content);
                          }}
                          className="p-1.5 text-indigo-650 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTemplate(t.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium line-clamp-3 leading-relaxed whitespace-pre-line bg-white/60 p-2 rounded-xl border border-slate-100">
                      {t.content}
                    </p>
                  </div>
                ))}

                {templates.length === 0 && (
                  <p className="text-slate-400 font-bold italic text-center py-8">Nenhum modelo cadastrado.</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex justify-end">
            <Button 
              onClick={() => setIsManageTemplatesOpen(false)}
              className="bg-slate-900 text-white rounded-xl h-10 px-5 font-bold text-xs lowercase cursor-pointer"
            >
              fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
