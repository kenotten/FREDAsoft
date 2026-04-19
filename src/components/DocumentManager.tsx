import React, { useState } from 'react';
import metadata from '../../metadata.json';
import { 
  FileText, 
  Download, 
  Trash2, 
  Plus, 
  Upload,
  FileCode, 
  FileSearch,
  BookOpen,
  Loader2,
  Database,
  Search,
  Filter,
  Calendar,
  User,
  ExternalLink,
  AlertCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { AppDocument } from '../types';
import { auth, storage } from '../firebase';
import { firestoreService } from '../services/firestoreService';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { toast } from 'sonner';
import { USER_MANUAL_HTML } from '../UserManualContent';
import { SYNTAX_GUIDE_HTML } from '../SyntaxGuideContent';
import jsPDF from 'jspdf';

interface DocumentManagerProps {
  documents: AppDocument[];
  isAdmin: boolean;
}

export function DocumentManager({ documents, isAdmin }: DocumentManagerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'html' | 'pdf'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are supported.');
      return;
    }

    if (!auth.currentUser) {
      toast.error('You must be signed in to upload documents.');
      return;
    }

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `documents/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(uploadResult.ref);
      
      await firestoreService.save('documents', {
        fldDocName: file.name,
        fldDocType: 'pdf',
        fldContent: downloadUrl, // Store URL instead of content
        fldStoragePath: uploadResult.ref.fullPath, // Store path for deletion
        fldUploadedBy: auth.currentUser?.uid
      });

      toast.success('Document uploaded successfully.');
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document.');
      setIsUploading(false);
    }
  };

  const generateDocument = async (docType: 'user_manual' | 'syntax_guide', format: 'html' | 'pdf') => {
    if (!auth.currentUser) {
      toast.error('You must be signed in to generate documents.');
      return;
    }

    setIsGenerating(true);
    try {
      let content = '';
      let baseName = docType === 'user_manual' ? 'User_Manual' : 'Syntax_Style_Guide';
      let htmlContent = docType === 'user_manual' ? USER_MANUAL_HTML : SYNTAX_GUIDE_HTML;
      let name = `${baseName}_${new Date().toISOString().split('T')[0]}`;
      let storagePath = '';
      
      if (format === 'html') {
        content = htmlContent;
        name += '.html';
      } else {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text(docType === 'user_manual' ? `${metadata.name} User Manual` : `${metadata.name} Syntax & Style Guide`, 20, 20);
        doc.setFontSize(10);
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const text = tempDiv.innerText || tempDiv.textContent || "";
        
        const splitText = doc.splitTextToSize(text, 170);
        doc.text(splitText, 20, 35);
        
        const pdfBlob = doc.output('blob');
        const storageRef = ref(storage, `documents/${Date.now()}_${name}.pdf`);
        const uploadResult = await uploadBytes(storageRef, pdfBlob);
        content = await getDownloadURL(uploadResult.ref);
        storagePath = uploadResult.ref.fullPath;
        name += '.pdf';
      }

      await firestoreService.save('documents', {
        fldDocName: name,
        fldDocType: format,
        fldContent: content,
        fldStoragePath: storagePath,
        fldUploadedBy: auth.currentUser.uid
      });

      toast.success(`${format.toUpperCase()} document generated and saved.`);
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Failed to generate document.');
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      await firestoreService.delete('documents', id);
      toast.success('Document deleted.');
      setConfirmDeleteId(null);
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document.');
    }
  };

  const downloadDocument = async (doc: AppDocument) => {
    if (doc.fldDocType === 'pdf') {
      // For PDF, we have a URL
      window.open(doc.fldContent, '_blank');
    } else {
      const blob = new Blob([doc.fldContent || ''], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fldDocName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const viewDocument = (doc: AppDocument) => {
    if (doc.fldDocType === 'pdf') {
      window.open(doc.fldContent, '_blank');
    } else {
      const win = window.open();
      if (win) {
        win.document.write(doc.fldContent || '');
        win.document.close();
      }
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.fldDocName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || doc.fldDocType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-6">
      <div className="flex items-center justify-end">
        {isAdmin && (
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Upload</span>
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".pdf" 
                  className="hidden" 
                />
                <Button 
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="gap-2 border-dashed border-zinc-300 hover:border-zinc-400"
                >
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Upload PDF
                </Button>
              </div>
            </div>

            <div className="w-px h-10 bg-zinc-200 mx-2" />

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">User Manual</span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => generateDocument('user_manual', 'html')}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  <FileCode className="w-3.5 h-3.5" /> HTML
                </Button>
                <Button 
                  size="sm"
                  onClick={() => generateDocument('user_manual', 'pdf')}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  <FileText className="w-3.5 h-3.5" /> PDF
                </Button>
              </div>
            </div>

            <div className="w-px h-10 bg-zinc-200 mx-2" />

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Syntax Guide</span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => generateDocument('syntax_guide', 'html')}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  <FileCode className="w-3.5 h-3.5" /> HTML
                </Button>
                <Button 
                  size="sm"
                  onClick={() => generateDocument('syntax_guide', 'pdf')}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  <FileText className="w-3.5 h-3.5" /> PDF
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
          <input 
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-zinc-400 w-4 h-4" />
          <select 
            value={filterType}
            onChange={(e: any) => setFilterType(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="html">HTML</option>
            <option value="pdf">PDF</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-2">
        <AnimatePresence mode="popLayout">
          {filteredDocs.map((doc) => (
            <motion.div
              key={doc.fldDocID}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card className="p-6 hover:shadow-md transition-shadow group relative overflow-hidden">
                {isAdmin && (
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setConfirmDeleteId(doc.fldDocID)}
                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                    doc.fldDocType === 'pdf' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                  )}>
                    {doc.fldDocType === 'pdf' ? <FileText size={24} /> : <FileCode size={24} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-zinc-900 truncate pr-8">{doc.fldDocName}</h3>
                    <div className="flex flex-col gap-1 mt-2">
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                        <Calendar size={12} />
                        {doc.fldCreatedAt ? new Date(doc.fldCreatedAt).toLocaleDateString() : 'Just now'}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                        <Database size={12} />
                        {doc.fldDocType.toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-6">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => viewDocument(doc)}
                    className="gap-2"
                  >
                    <ExternalLink size={14} />
                    View
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => downloadDocument(doc)}
                    className="gap-2"
                  >
                    <Download size={14} />
                    Download
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredDocs.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-zinc-200">
            <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileSearch className="text-zinc-300 w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900">No documents found</h3>
            <p className="text-zinc-500">Generate a user manual or upload documents to get started.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h2 className="text-lg font-bold text-zinc-900">Confirm Deletion</h2>
                <button onClick={() => setConfirmDeleteId(null)} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                  <X size={18} className="text-zinc-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3">
                  <AlertCircle className="text-red-600 shrink-0" size={20} />
                  <div className="text-sm text-red-900">
                    <p className="font-bold mb-1">Are you sure?</p>
                    <p>This action cannot be undone. This document will be permanently removed from the repository.</p>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                  <Button 
                    variant="danger" 
                    onClick={() => deleteDocument(confirmDeleteId)}
                  >
                    Delete Document
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
