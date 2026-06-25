import React, { useState, useMemo, useRef } from 'react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  File, 
  Folder, 
  Search, 
  Upload, 
  MoreVertical, 
  Grid, 
  List as ListIcon,
  Filter,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Download,
  Share2,
  Trash2,
  Plus,
  FolderPlus,
  X,
  FileDown,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../components/ui/dialog';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { FileItem } from '../types';

export function Documentos() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  // Core management states from store
  const { 
    repoFolders: folders, 
    repoFiles: files, 
    addRepoFolder: addFolder, 
    renameRepoFolder: renameFolder, 
    deleteRepoFolder: deleteFolder, 
    addRepoFile: addFile, 
    deleteRepoFile: deleteFile, 
    renameRepoFile: renameFile 
  } = useStore();

  // Folder Color Props Mapping
  const getFolderColorProps = (folderName: string) => {
    // Elegant system mapping folders to distinct color profiles
    const hash = folderName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      { 
        bg: 'bg-emerald-50/40 hover:bg-emerald-50/70', 
        border: 'border-emerald-150 border-emerald-200', 
        borderLeft: 'border-l-emerald-500',
        text: 'text-emerald-600', 
        fill: 'fill-emerald-100', 
        highlight: 'text-emerald-700 font-bold', 
        bgBadge: 'bg-emerald-50 text-emerald-800 border-emerald-100' 
      },
      { 
        bg: 'bg-amber-50/40 hover:bg-amber-50/70', 
        border: 'border-amber-150 border-amber-200', 
        borderLeft: 'border-l-amber-500',
        text: 'text-amber-655 text-amber-600', 
        fill: 'fill-amber-100', 
        highlight: 'text-amber-800 font-bold', 
        bgBadge: 'bg-amber-50 text-amber-800 border-amber-100' 
      },
      { 
        bg: 'bg-sky-50/40 hover:bg-sky-50/70', 
        border: 'border-sky-150 border-sky-200', 
        borderLeft: 'border-l-sky-500',
        text: 'text-sky-600', 
        fill: 'fill-sky-100', 
        highlight: 'text-sky-700 font-bold', 
        bgBadge: 'bg-sky-50 text-sky-800 border-sky-100' 
      },
      { 
        bg: 'bg-rose-50/40 hover:bg-rose-50/70', 
        border: 'border-rose-150 border-rose-200', 
        borderLeft: 'border-l-rose-500',
        text: 'text-rose-600', 
        fill: 'fill-rose-100', 
        highlight: 'text-rose-700 font-bold', 
        bgBadge: 'bg-rose-50 text-rose-800 border-rose-100' 
      },
      { 
        bg: 'bg-violet-50/40 hover:bg-violet-50/70', 
        border: 'border-violet-150 border-violet-200', 
        borderLeft: 'border-l-violet-500',
        text: 'text-violet-650 text-violet-600', 
        fill: 'fill-violet-100', 
        highlight: 'text-violet-800 font-bold', 
        bgBadge: 'bg-violet-50 text-violet-800 border-violet-100' 
      },
      { 
        bg: 'bg-teal-50/40 hover:bg-teal-50/70', 
        border: 'border-teal-150 border-teal-200', 
        borderLeft: 'border-l-teal-500',
        text: 'text-teal-600', 
        fill: 'fill-teal-100', 
        highlight: 'text-teal-750 text-teal-700 font-bold', 
        bgBadge: 'bg-teal-50 text-teal-800 border-teal-105 border-teal-100' 
      },
      { 
        bg: 'bg-indigo-50/40 hover:bg-indigo-50/70', 
        border: 'border-indigo-150 border-indigo-200', 
        borderLeft: 'border-l-indigo-505 border-l-indigo-500',
        text: 'text-indigo-600', 
        fill: 'fill-indigo-100', 
        highlight: 'text-indigo-800 font-bold', 
        bgBadge: 'bg-indigo-50 text-indigo-800 border-indigo-100' 
      },
    ];
    return colors[hash % colors.length];
  };

  // Preview file state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  
  // Real-world raw file objects state & Deletion success modal state
  const [fileObjects, setFileObjects] = useState<Record<string, File>>({});
  const [selectedFileObject, setSelectedFileObject] = useState<File | null>(null);
  const [isDeleteSuccessModalOpen, setIsDeleteSuccessModalOpen] = useState(false);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState('');

  // Deletion confirmation modals states
  const [isDeleteFolderModalOpen, setIsDeleteFolderModalOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);

  const [isDeleteFileModalOpen, setIsDeleteFileModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);

  // Rename modal states
  const [isRenameFolderModalOpen, setIsRenameFolderModalOpen] = useState(false);
  const [renameFolderOldName, setRenameFolderOldName] = useState('');
  const [renameFolderNewName, setRenameFolderNewName] = useState('');

  const [isRenameFileModalOpen, setIsRenameFileModalOpen] = useState(false);
  const [renameFileId, setRenameFileId] = useState('');
  const [renameFileName, setRenameFileName] = useState('');

  // Modal control states
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  React.useEffect(() => {
    const handleOpenFolder = () => {
      setNewFolderName('');
      setIsFolderModalOpen(true);
    };
    const handleOpenUpload = () => {
      setIsUploadModalOpen(true);
    };
    const handleClose = () => {
      setIsFolderModalOpen(false);
      setIsUploadModalOpen(false);
    };

    window.addEventListener('open-onboarding-folder-modal', handleOpenFolder);
    window.addEventListener('open-onboarding-upload-modal', handleOpenUpload);
    window.addEventListener('close-onboarding-modals', handleClose);

    return () => {
      window.removeEventListener('open-onboarding-folder-modal', handleOpenFolder);
      window.removeEventListener('open-onboarding-upload-modal', handleOpenUpload);
      window.removeEventListener('close-onboarding-modals', handleClose);
    };
  }, []);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFolder, setUploadFolder] = useState('Modelos');
  const [uploadType, setUploadType] = useState<'pdf' | 'doc' | 'image' | 'sheet'>('pdf');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successFileNameSaved, setSuccessFileNameSaved] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate folder stats dynamically
  const getFolderStats = (folderName: string) => {
    const folderFiles = files.filter(f => f.folder.toLowerCase() === folderName.toLowerCase());
    const count = folderFiles.length;
    const totalSize = folderFiles.reduce((acc, f) => {
      const sizeVal = parseFloat(f.size);
      return acc + (isNaN(sizeVal) ? 0 : sizeVal);
    }, 0).toFixed(1);
    return `${count} ${count === 1 ? 'arquivo' : 'arquivos'} • ${totalSize} mb`;
  };

  // Filter files based on selected folder & search bar
  const filteredFiles = useMemo(() => {
    let result = files;
    if (selectedFolder) {
      result = result.filter(f => f.folder.toLowerCase() === selectedFolder.toLowerCase());
    }
    if (searchTerm) {
      result = result.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return result;
  }, [files, selectedFolder, searchTerm]);

  // Handle Nova Pasta creation
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      toast.error('O nome da pasta não pode estar vazio.');
      return;
    }
    const cleanName = newFolderName.trim();
    // Capitalize each word's first letter
    const capitalized = cleanName.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    if (folders.some(f => f.toLowerCase() === capitalized.toLowerCase())) {
      toast.error('Esta pasta já existe.');
      return;
    }
    addFolder(capitalized);
    setNewFolderName('');
    setIsFolderModalOpen(false);
    toast.success(`Pasta "${capitalized}" criada com sucesso!`);
  };

  // Handle Folder Renaming
  const handleRenameFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameFolderNewName.trim()) {
      toast.error('O nome da pasta não pode estar vazio.');
      return;
    }
    const cleanNewName = renameFolderNewName.trim();
    const capitalized = cleanNewName.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    if (folders.some(f => f.toLowerCase() === capitalized.toLowerCase() && f.toLowerCase() !== renameFolderOldName.toLowerCase())) {
      toast.error('Esta pasta já existe.');
      return;
    }
    renameFolder(renameFolderOldName, capitalized);
    setIsRenameFolderModalOpen(false);
    toast.success(`Pasta renomeada para "${capitalized}" com sucesso!`);
    if (selectedFolder === renameFolderOldName) {
      setSelectedFolder(capitalized);
    }
  };

  // Real Object URL state for live previews
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);

  React.useEffect(() => {
    if (previewFile && fileObjects[previewFile.id]) {
      const url = URL.createObjectURL(fileObjects[previewFile.id]);
      setActivePreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setActivePreviewUrl(null);
    }
  }, [previewFile, fileObjects]);

  // Trigger file preview
  const handlePreviewFile = (file: FileItem) => {
    setPreviewFile(file);
    setIsPreviewModalOpen(true);
  };

  // Trigger folder deletion confirmation
  const handleDeleteFolder = (folderName: string) => {
    setFolderToDelete(folderName);
    setIsDeleteFolderModalOpen(true);
  };

  const confirmDeleteFolder = () => {
    if (folderToDelete) {
      deleteFolder(folderToDelete);
      setDeleteSuccessMessage(`A pasta "${folderToDelete}" e todos os seus documentos correspondentes foram excluídos permanentemente.`);
      setIsDeleteSuccessModalOpen(true);
      if (selectedFolder === folderToDelete) {
        setSelectedFolder(null);
      }
      setFolderToDelete(null);
      setIsDeleteFolderModalOpen(false);
    }
  };

  // Handle File Renaming
  const handleRenameFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameFileName.trim()) {
      toast.error('O nome do arquivo não pode estar vazio.');
      return;
    }
    renameFile(renameFileId, renameFileName.trim());
    setIsRenameFileModalOpen(false);
    toast.success('Arquivo renomeado com sucesso!');
  };

  // Trigger hidden local file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFileObject(file);
      setUploadFileName(file.name);
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') setUploadType('pdf');
      else if (['doc', 'docx'].includes(ext || '')) setUploadType('doc');
      else if (['xls', 'xlsx', 'csv'].includes(ext || '')) setUploadType('sheet');
      else if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext || '')) setUploadType('image');
      else setUploadType('pdf');
    }
  };

  // Handle real-world file drop or selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileObject(file);
      setUploadFileName(file.name);
      
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') setUploadType('pdf');
      else if (['doc', 'docx'].includes(ext || '')) setUploadType('doc');
      else if (['xls', 'xlsx', 'csv'].includes(ext || '')) setUploadType('sheet');
      else if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext || '')) setUploadType('image');
      else setUploadType('pdf');
    }
  };

  // Form submit for document uploading
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileName.trim()) {
      toast.error('Por favor, selecione ou digite um arquivo.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 25;
      });
    }, 150);

    setTimeout(() => {
      const sizeVal = selectedFileObject 
        ? (selectedFileObject.size / (1024 * 1024)).toFixed(1)
        : (Math.random() * 2 + 0.2).toFixed(1);
      const today = formatToday();
      const newFileId = String(Date.now());

      const newFile: FileItem = {
        id: newFileId,
        name: uploadFileName,
        type: uploadType,
        size: `${sizeVal} mb`,
        date: today,
        folder: uploadFolder
      };

      if (selectedFileObject) {
        setFileObjects(prev => ({
          ...prev,
          [newFileId]: selectedFileObject
        }));
        setSelectedFileObject(null);
      }

      addFile(newFile);
      setIsUploading(false);
      setUploadProgress(0);
      setSuccessFileNameSaved(uploadFileName);
      setUploadFileName('');
      setIsUploadModalOpen(false);
      setIsSuccessModalOpen(true);
    }, 900);
  };

  const formatToday = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const handleDeleteFile = (file: FileItem) => {
    setFileToDelete(file);
    setIsDeleteFileModalOpen(true);
  };

  const confirmDeleteFile = () => {
    if (fileToDelete) {
      deleteFile(fileToDelete.id);
      setDeleteSuccessMessage(`O arquivo "${fileToDelete.name}" foi excluído permanentemente da plataforma.`);
      setIsDeleteSuccessModalOpen(true);
      setFileToDelete(null);
      setIsDeleteFileModalOpen(false);
    }
  };

  const handleDownloadFile = (file: FileItem) => {
    if (fileObjects[file.id]) {
      // Direct binary download for real uploaded files
      const realFile = fileObjects[file.id];
      const url = URL.createObjectURL(realFile);
      const link = document.createElement('a');
      link.href = url;
      link.download = realFile.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Download de "${file.name}" realizado com sucesso!`);
      return;
    }

    let mimeType = 'application/octet-stream';
    let fileContent = '';

    if (file.type === 'pdf') {
      mimeType = 'application/pdf';
      fileContent = `%PDF-1.4\n%...\n1 0 obj <\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj <\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj <\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 <\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj <\n/Length 120\n>>\nstream\nBT\n/F1 18 Tf\n70 700 Td\n(Clinica Flow - Documento PDF Simulado) Tj\n/F1 12 Tf\n0 -30 Td\n(Nome do Arquivo: ${file.name}) Tj\n0 -20 Td\n(Diretorio: ${file.folder}) Tj\n0 -20 Td\n(Data de Emissao: ${file.date}) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000015 00000 n\n0000000074 00000 n\n0000000130 00000 n\n0000000305 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n492\n%%EOF`;
    } else if (file.type === 'doc') {
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      fileContent = `CLINICA FLOW - ACORDO DE DOCUMENTOS\n==================================\n\nNome do Documento: ${file.name}\nDiretorio: ${file.folder}\nData: ${file.date}\nTamanho do Arquivo: ${file.size}\n\nEste e um documento de texto simulado gerado pelo sistema clinico da Clinica Flow.`;
    } else if (file.type === 'sheet') {
      mimeType = 'text/csv;charset=utf-8;';
      fileContent = `ID_ARQUIVO,NOME_ARQUIVO,DIRETORIO,DATA,TAMANHO_PROVISORIO\n"${file.id}","${file.name}","${file.folder}","${file.date}","${file.size}"\n`;
    } else if (file.type === 'image') {
      mimeType = 'image/svg+xml';
      fileContent = `<svg xmlns="http://www.w3.org/2005/svg" viewBox="0 0 400 400" width="100%" height="100%">
        <rect width="100%" height="100%" fill="#f8fafc" />
        <circle cx="200" cy="200" r="80" fill="#e0e7ff" stroke="#6366f1" stroke-width="4" />
        <text x="50%" y="210" font-family="'Inter', sans-serif" font-weight="bold" font-size="20" fill="#4f46e5" text-anchor="middle">CLINICA FLOW</text>
        <text x="50%" y="300" font-family="'Inter', sans-serif" font-size="12" fill="#64748b" text-anchor="middle">${file.name}</text>
      </svg>`;
    } else {
      fileContent = `Clinica Flow: ${file.name}`;
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Download de "${file.name}" realizado com sucesso!`);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-8 h-8 text-red-500 shrink-0" />;
      case 'doc': return <FileText className="w-8 h-8 text-blue-500 shrink-0" />;
      case 'image': return <ImageIcon className="w-8 h-8 text-emerald-500 shrink-0" />;
      case 'sheet': return <FileSpreadsheet className="w-8 h-8 text-green-600 shrink-0" />;
      default: return <File className="w-8 h-8 text-slate-400 shrink-0" />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="p-6 space-y-6 max-w-[1600px] mx-auto select-none"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic">Repositório de Arquivos</h1>
          <p className="text-slate-500">Gestão Documental, Modelos, Orçamentos e Recibos em PDF, Word ou Excel.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            id="onboarding-btn-new-folder"
            onClick={() => setIsFolderModalOpen(true)}
            variant="outline" 
            className="rounded-xl h-11 px-4 border-slate-200 hover:border-slate-300 hover:bg-slate-50 font-bold transition-all flex items-center gap-2"
          >
            <FolderPlus className="w-4 h-4 text-slate-500" />
            Nova Pasta
          </Button>
          <Button 
            id="onboarding-btn-upload-file"
            onClick={() => {
              // Pre-select actively navigated/clicked folder if any, otherwise first folder, otherwise default
              setUploadFolder(selectedFolder || folders[0] || 'Modelos');
              setIsUploadModalOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs h-11 shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Documentos
          </Button>
        </div>
      </div>

      {/* Filter indicator banner if filter is active */}
      <AnimatePresence>
        {selectedFolder && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between bg-indigo-50 border border-indigo-100 text-indigo-900 px-5 py-3 rounded-2xl"
          >
            <div className="flex items-center gap-2 text-sm font-bold">
              <Folder className="w-4 h-4 text-indigo-600 fill-indigo-100" />
              <span>Navegando na Pasta: <span className="font-extrabold capitalize italic">"{selectedFolder}"</span></span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedFolder(null)}
              className="hover:bg-indigo-100/50 text-indigo-700 hover:text-indigo-900 h-8 px-3 rounded-xl flex items-center gap-1.5 font-bold italic"
            >
              <X className="w-4 h-4" />
              Ver Tudo
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-xl group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <Input 
            placeholder="Buscar Documentos, Contratos, Orçamentos, Recibos..." 
            className="pl-12 h-12 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 self-end md:self-auto">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("rounded-lg", viewMode === 'grid' && "bg-slate-100 text-indigo-600")}
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("rounded-lg", viewMode === 'list' && "bg-slate-100 text-indigo-600")}
            onClick={() => setViewMode('list')}
          >
            <ListIcon className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Folders Section - entry staggards */}
      <motion.div 
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.05 } }
        }}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6"
      >
        {folders.map(folder => {
          const colorProps = getFolderColorProps(folder);
          const isCurrentSelected = selectedFolder === folder;
          return (
            <motion.div
              key={folder}
              variants={{
                hidden: { opacity: 0, y: 15 },
                show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
              }}
              whileHover={{ y: -3 }}
              onClick={() => setSelectedFolder(folder)}
            >
              <Card className={cn(
                "p-6 bg-white rounded-[2.2rem] shadow-sm hover:shadow-xl hover:border-slate-300 transition-all cursor-pointer group border border-l-4",
                colorProps.border,
                colorProps.borderLeft,
                isCurrentSelected ? `${colorProps.bg} shadow-md ring-2 ring-slate-100` : ""
              )}>
                <div className="flex items-center justify-between mb-4">
                  <Folder className={cn(
                    "w-10 h-10 transition-all",
                    isCurrentSelected 
                      ? `${colorProps.text} ${colorProps.fill} scale-105` 
                      : `text-slate-300 ${colorProps.fill} group-hover:scale-110 group-hover:${colorProps.text}`
                  )} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameFolderOldName(folder);
                          setRenameFolderNewName(folder);
                          setIsRenameFolderModalOpen(true);
                        }} 
                        className="gap-2 cursor-pointer font-bold italic text-slate-700"
                      >
                        Renomear
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder);
                        }} 
                        className="gap-2 text-red-650 text-red-600 cursor-pointer font-bold italic"
                      >
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <h3 className={cn("font-black text-slate-900 italic mb-1 transition-colors", `group-hover:${colorProps.text}`)}>{folder}</h3>
                <p className="text-[10px] text-slate-400 font-bold lowercase tracking-widest">{getFolderStats(folder)}</p>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="pt-6 border-t border-slate-100">
        <h2 className="text-sm font-black text-slate-400 italic mb-6">
          {selectedFolder ? `Arquivos em "${selectedFolder}"` : 'Todos os Arquivos Recentes'}
        </h2>
        
        {filteredFiles.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center space-y-4 bg-white border border-slate-200 rounded-[2rem]">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center">
              <File className="w-8 h-8" />
            </div>
            <div>
              <p className="font-bold text-slate-800 italic">Nenhum arquivo encontrado</p>
              <p className="text-xs text-slate-400">Tente buscar outro termo ou mude de pasta.</p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredFiles.map(file => {
                const folderColor = getFolderColorProps(file.folder);
                return (
                  <motion.div
                    key={file.id}
                    layout
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card 
                      onClick={() => handlePreviewFile(file)}
                      className="bg-white border hover:border-slate-350 border-slate-200 rounded-[2rem] shadow-sm hover:shadow-xl transition-all group p-6 flex flex-col justify-between h-[210px] cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-4" onClick={(e) => e.stopPropagation()}>
                        <div className="p-3 bg-slate-50 group-hover:bg-indigo-50/50 rounded-2xl group-hover:scale-105 transition-all">
                          {getFileIcon(file.type)}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-slate-600">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => handlePreviewFile(file)} className="gap-2 cursor-pointer font-bold italic text-slate-700">
                              <Eye className="w-4 h-4" /> Prévia
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadFile(file)} className="gap-2 cursor-pointer font-bold italic text-slate-700">
                              <Download className="w-4 h-4" /> Baixar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setRenameFileId(file.id);
                                setRenameFileName(file.name);
                                setIsRenameFileModalOpen(true);
                              }} 
                              className="gap-2 cursor-pointer font-bold italic text-slate-700"
                            >
                              Renomear
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteFile(file)} className="gap-2 text-red-650 text-red-600 cursor-pointer font-bold italic">
                              <Trash2 className="w-4 h-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 italic text-sm line-clamp-2 mb-2 leading-snug group-hover:text-indigo-600 transition-colors uppercase select-all" title={file.name}>
                          {file.name}
                        </h4>
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 tracking-tighter pt-2 border-t border-slate-50/55 border-slate-100">
                          <Badge className={cn("text-[8px] font-extrabold hover:opacity-90 border border-slate-100 rounded-lg capitalize italic px-2 py-0.5", folderColor.bgBadge)}>
                            {file.folder}
                          </Badge>
                          <span className="font-mono">{file.size}</span>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        ) : (
          <Card className="bg-white border-slate-200 rounded-[2rem] shadow-sm overflow-hidden border-b-4 border-b-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic tracking-wider">Nome</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic tracking-wider">Tamanho</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic tracking-wider">Modificado</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 italic tracking-wider">Pasta</th>
                    <th className="text-center py-4 px-6 text-[10px] font-black text-slate-400 italic tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {filteredFiles.map(file => {
                      const folderColor = getFolderColorProps(file.folder);
                      return (
                        <motion.tr 
                          key={file.id} 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => handlePreviewFile(file)}
                          className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors group cursor-pointer"
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="scale-75 group-hover:scale-95 transition-all">{getFileIcon(file.type)}</div>
                              <span className="font-bold text-slate-905 text-slate-900 group-hover:text-indigo-605 group-hover:text-indigo-600 transition-colors">{file.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 font-mono text-xs text-slate-500 lowercase">{file.size}</td>
                          <td className="py-4 px-6 font-mono text-xs text-slate-500 lowercase">{file.date}</td>
                          <td className="py-4 px-6">
                            <Badge className={cn("font-extrabold text-[10px] border border-slate-100 rounded-lg capitalize px-2 py-0.5", folderColor.bgBadge)}>
                              {file.folder}
                            </Badge>
                          </td>
                          <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem onClick={() => handlePreviewFile(file)} className="gap-2 cursor-pointer font-bold italic text-slate-707 text-slate-700">
                                  <Eye className="w-4 h-4" /> Prévia
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadFile(file)} className="gap-2 cursor-pointer font-bold italic text-slate-700">
                                  <Download className="w-4 h-4" /> Baixar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setRenameFileId(file.id);
                                    setRenameFileName(file.name);
                                    setIsRenameFileModalOpen(true);
                                  }} 
                                  className="gap-2 cursor-pointer font-bold italic text-slate-700"
                                >
                                  Renomear
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteFile(file)} className="gap-2 text-red-650 text-red-600 cursor-pointer font-bold italic">
                                  <Trash2 className="w-4 h-4" /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Nova Pasta Modal */}
      <Dialog open={isFolderModalOpen} onOpenChange={setIsFolderModalOpen}>
        <DialogContent className="rounded-[2.2rem] max-w-md p-8 select-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-950 italic flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-indigo-500" />
              Nova Pasta do Repositório
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateFolder} className="space-y-6 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase italic">Nome da Pasta</label>
              <Input 
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Ex: Orçamentos, Recibos, Termos..."
                className="h-12 border-slate-200 rounded-2xl bg-white text-slate-900 font-medium"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsFolderModalOpen(false)}
                className="rounded-xl font-bold border-slate-200"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
              >
                Criar Pasta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upload Documentos Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="rounded-[2.2rem] max-w-lg p-8 select-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-950 italic flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-500 animate-bounce" />
              Upload de Documentos
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleUploadSubmit} className="space-y-6 pt-4">
            {/* Real File Input selection zone */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
            />

            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={cn(
                "border-2 border-dashed rounded-2xl p-6 text-center space-y-2 transition-all group cursor-pointer",
                isDragging 
                  ? "border-indigo-500 bg-indigo-50/20 scale-[1.02]" 
                  : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50"
              )}
            >
              <div className="w-12 h-12 bg-slate-50 group-hover:bg-indigo-50 rounded-xl flex items-center justify-center mx-auto text-slate-400 group-hover:text-indigo-500 transition-colors">
                <FileDown className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <p className="font-extrabold text-sm text-slate-800">Clique para Selecionar ou Arraste o Arquivo Aqui</p>
                <p className="text-[11px] text-slate-400">Formatos Aceitos: PDF, Word (Docx), Excel (Xlsx), Imagens</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase italic">Nome do Arquivo / Tópico</label>
              <Input 
                value={uploadFileName}
                onChange={(e) => setUploadFileName(e.target.value)}
                placeholder="Ainda Não Selecionado"
                className="h-12 border-slate-200 rounded-2xl bg-white text-slate-900 font-bold italic"
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase italic">Destino da Pasta</label>
                <select 
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value)}
                  className="w-full h-12 rounded-2xl border border-slate-205 border-slate-200 px-4 text-sm font-bold bg-white text-slate-700 capitalize focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  {folders.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase italic">Selecione o Tipo do Arquivo</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'pdf', title: 'PDF', subtitle: 'Recibo/Laudo', icon: FileText, activeBg: 'bg-red-50/50 border-red-500 ring-2 ring-red-100', activeText: 'text-red-650 text-red-600', iconColor: 'text-red-500' },
                    { id: 'doc', title: 'Word', subtitle: 'Orçamento', icon: FileText, activeBg: 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-100', activeText: 'text-blue-650 text-blue-600', iconColor: 'text-blue-500' },
                    { id: 'sheet', title: 'Excel', subtitle: 'Planilha', icon: FileSpreadsheet, activeBg: 'bg-green-50/50 border-green-500 ring-2 ring-green-100', activeText: 'text-green-650 text-green-600', iconColor: 'text-green-600' },
                    { id: 'image', title: 'Imagem', subtitle: 'Logo/Foto', icon: ImageIcon, activeBg: 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-100', activeText: 'text-emerald-650 text-emerald-600', iconColor: 'text-emerald-500' }
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = uploadType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setUploadType(item.id as any)}
                        className={cn(
                          "p-3 rounded-2xl border text-left transition-all flex flex-col justify-between h-20 cursor-pointer outline-none",
                          isSelected ? item.activeBg : "border-slate-200 bg-white hover:bg-slate-50"
                        )}
                      >
                        <Icon className={cn("w-5 h-5", isSelected ? item.activeText : "text-slate-400")} />
                        <div>
                          <p className={cn("text-xs font-black italic", isSelected ? item.activeText : "text-slate-700")}>{item.title}</p>
                          <p className="text-[9px] text-slate-400 font-bold whitespace-nowrap leading-none mt-0.5">{item.subtitle}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black tracking-wider text-slate-400 uppercase">
                  <span>Enviando...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                     className="h-full bg-indigo-600 transition-all duration-150" 
                     style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsUploadModalOpen(false)}
                disabled={isUploading}
                className="rounded-xl font-bold border-slate-200"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isUploading || !uploadFileName}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
              >
                Enviar e Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Renomear Pasta Modal */}
      <Dialog open={isRenameFolderModalOpen} onOpenChange={setIsRenameFolderModalOpen}>
        <DialogContent className="rounded-[2.2rem] max-w-md p-8 select-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-950 italic flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-indigo-500" />
              Renomear Pasta do Repositório
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRenameFolderSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase italic">Novo Nome da Pasta</label>
              <Input 
                value={renameFolderNewName}
                onChange={(e) => setRenameFolderNewName(e.target.value)}
                placeholder="Ex: Orçamentos, Recibos, Termos..."
                className="h-12 border-slate-200 rounded-2xl bg-white text-slate-900 font-medium"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsRenameFolderModalOpen(false)}
                className="rounded-xl font-bold border-slate-200"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
              >
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Renomear Arquivo Modal */}
      <Dialog open={isRenameFileModalOpen} onOpenChange={setIsRenameFileModalOpen}>
        <DialogContent className="rounded-[2.2rem] max-w-md p-8 select-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-950 italic flex items-center gap-2">
              <FileDown className="w-5 h-5 text-indigo-500" />
              Renomear Arquivo
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRenameFileSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase italic">Novo Nome do Arquivo</label>
              <Input 
                value={renameFileName}
                onChange={(e) => setRenameFileName(e.target.value)}
                placeholder="Ex: Contrato-Assinado.pdf"
                className="h-12 border-slate-200 rounded-2xl bg-white text-slate-900 font-medium"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsRenameFileModalOpen(false)}
                className="rounded-xl font-bold border-slate-200"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
              >
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal De Sucesso No Upload De Arquivo */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="rounded-[2.2rem] max-w-md p-8 select-none text-center">
          <div className="flex flex-col items-center space-y-4 pt-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center scale-110 shadow-sm border border-emerald-100">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-black text-slate-900 italic tracking-tight">
                Documento Anexado Com Sucesso
              </DialogTitle>
              <p className="text-sm text-slate-500 font-medium">
                O arquivo <span className="font-extrabold text-indigo-600 underline break-all">"{successFileNameSaved}"</span> foi salvo com sucesso no diretório <span className="font-bold underline text-slate-705">"{uploadFolder}"</span>!
              </p>
            </div>
          </div>
          <DialogFooter className="justify-center sm:justify-center pt-6">
            <Button 
              type="button" 
              onClick={() => setIsSuccessModalOpen(false)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-8 h-11 shadow-md"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão de Pasta */}
      <Dialog open={isDeleteFolderModalOpen} onOpenChange={setIsDeleteFolderModalOpen}>
        <DialogContent className="rounded-[2.2rem] max-w-md p-8 select-none">
          <div className="text-center space-y-4 pt-2">
            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-100 animate-pulse">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-xl font-black text-slate-900 italic tracking-tight">
                Excluir Pasta do Repositório?
              </DialogTitle>
              <p className="text-sm text-slate-500">
                Você está prestes a excluir a pasta <span className="font-extrabold text-red-600">"{folderToDelete}"</span>. Os arquivos contidos nela ficarão ocultos ou serão reorganizados. Esta ação é definitiva.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-6 justify-center sm:justify-center flex-row">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setIsDeleteFolderModalOpen(false)}
              className="rounded-xl font-bold border-slate-200 flex-1"
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={confirmDeleteFolder}
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md flex-1"
            >
              Sim, Excluir Pasta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão de Arquivo */}
      <Dialog open={isDeleteFileModalOpen} onOpenChange={setIsDeleteFileModalOpen}>
        <DialogContent className="rounded-[2.2rem] max-w-md p-8 select-none">
          <div className="text-center space-y-4 pt-2">
            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-100">
              <Trash2 className="w-6 h-6 animate-bounce" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-xl font-black text-slate-900 italic tracking-tight">
                Excluir Documento?
              </DialogTitle>
              <p className="text-sm text-slate-500">
                Tem certeza de que deseja excluir o arquivo <span className="font-extrabold text-slate-800 break-all">"{fileToDelete?.name}"</span>? Esta ação não poderá ser desfeita.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-6 justify-center sm:justify-center flex-row">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setIsDeleteFileModalOpen(false)}
              className="rounded-xl font-bold border-slate-205 border-slate-200 flex-1"
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={confirmDeleteFile}
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md flex-1"
            >
              Excluir Arquivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Prévia Interativa de Arquivos */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="rounded-[2.2rem] max-w-2xl p-8 select-none">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                {previewFile && getFileIcon(previewFile.type)}
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 uppercase italic tracking-tight line-clamp-1 max-w-[400px]">
                  {previewFile?.name}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none text-[9px] font-bold py-0 px-2 capitalize italic">
                    {previewFile?.folder}
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-bold font-mono">{previewFile?.size} • Modificado em {previewFile?.date}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Document canvas visualizer zone */}
          <div className="my-5 bg-slate-50 border border-slate-100 rounded-2xl p-6 min-h-[350px] flex flex-col justify-between overflow-y-auto max-h-[500px] shadow-inner font-sans">
            {activePreviewUrl ? (
              <div className="w-full h-full flex flex-col flex-1 space-y-4">
                <div className="flex justify-between items-center bg-white border border-slate-100 p-3 rounded-lg text-slate-700 font-bold text-xs">
                  <span className="font-mono text-[10px] text-slate-500">Visualização de Documento Real</span>
                  <a 
                    href={activePreviewUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-bold font-sans text-xs"
                  >
                    Abrir em Nova Aba ↗
                  </a>
                </div>
                {previewFile?.type === 'pdf' ? (
                  <div className="flex flex-col items-center justify-center py-10 px-6 text-center bg-white rounded-xl border border-slate-100 shadow-sm space-y-4 flex-1">
                    <div className="p-4 bg-rose-50 text-rose-500 rounded-full">
                      <FileText className="w-10 h-10" />
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-800 text-sm">Visualização Segura de PDF</p>
                      <p className="text-[11px] text-slate-500 max-w-sm mt-1.5 leading-relaxed">
                        Por segurança, o Chrome bloqueia a exibição de PDFs integrados dentro do painel. Clique nos botões abaixo para acessar seu documento original de maneira rápida e segura:
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <a 
                        href={activePreviewUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-md italic uppercase"
                      >
                        Abrir em Nova Aba ↗
                      </a>
                      <button 
                        type="button"
                        onClick={() => previewFile && handleDownloadFile(previewFile)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all active:scale-95 italic uppercase"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Baixar PDF Original
                      </button>
                    </div>
                  </div>
                ) : previewFile?.type === 'image' ? (
                  <div className="flex items-center justify-center p-2 bg-white rounded-xl border border-slate-100">
                    <img 
                      src={activePreviewUrl} 
                      className="max-w-full max-h-[300px] object-contain rounded-lg shadow-sm"
                      alt={previewFile?.name}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-xl border border-slate-100">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-3">
                      {previewFile && getFileIcon(previewFile.type)}
                    </div>
                    <p className="font-black text-slate-800 text-sm">Arquivo Carregado</p>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      O arquivo foi recebido com sucesso. Clique em "Abrir em Nova Aba" acima para visualização total ou faça o download para abri-lo localmente.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // Fallback for mock files - no automatic assumptions about receipts/diagnosis
              <div className="flex flex-col items-center justify-center text-center py-14 space-y-4">
                <div className="p-4 bg-slate-100 text-slate-400 rounded-full">
                  <FileText className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <p className="font-black text-slate-800 text-base italic uppercase tracking-tight">Documento de Demonstração</p>
                  <p className="text-xs text-slate-550 text-slate-550 max-w-md mx-auto leading-relaxed">
                    Este é um arquivo de demonstração padrão do sistema. Para visualizar e interagir com o conteúdo real de um PDF ou imagem correspondente, faça o upload de um arquivo real utilizando o painel de envios.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2 justify-between flex-row pt-4 border-t border-slate-100">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setIsPreviewModalOpen(false)}
              className="rounded-xl font-bold border-slate-200 flex-1 sm:flex-initial"
            >
              Fechar Visualização
            </Button>
            {activePreviewUrl ? (
              <a 
                href={activePreviewUrl} 
                target="_blank" 
                rel="noreferrer"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 px-6 h-10 text-sm"
              >
                Visualizar Inteiro
              </a>
            ) : (
              <Button 
                type="button" 
                onClick={() => {
                  if (previewFile) {
                    handleDownloadFile(previewFile);
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 flex items-center gap-2 flex-1 sm:flex-initial"
              >
                <Download className="w-4 h-4" />
                Baixar Arquivo
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão Realizada com Sucesso */}
      <Dialog open={isDeleteSuccessModalOpen} onOpenChange={setIsDeleteSuccessModalOpen}>
        <DialogContent className="rounded-[2.2rem] max-w-md p-8 select-none">
          <div className="text-center space-y-4 pt-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
              <svg xmlns="http://www.w3.org/2005/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-xl font-black text-slate-900 italic tracking-tight uppercase">
                Excluído com Sucesso!
              </DialogTitle>
              <p className="text-sm text-slate-500 leading-relaxed">
                {deleteSuccessMessage}
              </p>
            </div>
          </div>
          <DialogFooter className="pt-6 justify-center flex">
            <Button 
              type="button" 
              onClick={() => setIsDeleteSuccessModalOpen(false)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black italic rounded-xl w-full h-11 shadow-md uppercase"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
