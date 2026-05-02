import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Book, 
  FileText, 
  Hash, 
  AlertCircle, 
  Save, 
  X,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import { MasterStandard } from '../types';
import { storage } from '../firebase';
import { firestoreService } from '../services/firestoreService';
import { resizeImage } from '../lib/imageUtils';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Button = ({ className, variant = 'primary', size = 'md', children, ...props }: any) => {
  const variants = {
    primary: 'bg-black text-white hover:bg-zinc-800',
    secondary: 'bg-white text-black border border-zinc-200 hover:bg-zinc-50',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    ghost: 'bg-transparent text-zinc-600 hover:bg-zinc-100',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  return (
    <button className={cn('inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50', variants[variant as keyof typeof variants], sizes[size as keyof typeof sizes], className)} {...props}>
      {children}
    </button>
  );
};

const Input = ({ label, ...props }: any) => (
  <div className="space-y-1">
    {label && <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</label>}
    <input className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all" {...props} />
  </div>
);

const TextArea = ({ label, ...props }: any) => (
  <div className="space-y-1">
    {label && <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</label>}
    <textarea className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all min-h-[100px]" {...props} />
  </div>
);

const Select = ({ label, options = [], children, ...props }: any) => (
  <div className="space-y-1">
    {label && <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</label>}
    <select className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all appearance-none" {...props}>
      {Array.isArray(options) && options.map((opt: any, idx: number) => (
        <option key={opt.key || opt.value || `opt-${idx}`} value={opt.value}>
          {opt.label}
        </option>
      ))}
      {children}
    </select>
  </div>
);

export function StandardsManager({ standards }: { standards: MasterStandard[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedVersion, setSelectedVersion] = useState<string>('ALL');
  const [showAlphanumericOnly, setShowAlphanumericOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editingStandard, setEditingStandard] = useState<Partial<MasterStandard> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MasterStandard | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<MasterStandard | null>(null);

  const standardTypes = useMemo(() => {
    const types = new Set(standards.map(s => s.fldStandardType).filter(Boolean));
    return ['ALL', ...Array.from(types).sort()];
  }, [standards]);

  const standardVersions = useMemo(() => {
    const filtered = selectedType === 'ALL' 
      ? standards 
      : standards.filter(s => s.fldStandardType === selectedType);
    const versions = new Set(filtered.map(s => s.fldStandardVersion).filter(Boolean));
    return ['ALL', ...Array.from(versions).sort().reverse()];
  }, [standards, selectedType]);

  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    variant?: 'primary' | 'danger' | 'secondary';
  } | null>(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkUploadProgress, setBulkUploadProgress] = useState({ current: 0, total: 0 });
  const [showBulkUploader, setShowBulkUploader] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedStandards, setExpandedStandards] = useState<Set<string>>(new Set());

  const typePriority: Record<string, number> = {
    'Standard': 1,
    'Advisory': 2,
    'Exception': 3,
    'Exception Advisory': 4,
    'Figure': 5,
    'Table': 6
  };

  const compareStandards = (a: MasterStandard, b: MasterStandard) => {
    // 1. Citation Number (Natural Sort)
    const numA = (a.citation_num || '').trim();
    const numB = (b.citation_num || '').trim();
    const numCompare = numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' });
    
    if (numCompare !== 0) return numCompare;
    
    // 2. Relation Type Priority
    const prioA = typePriority[a.relation_type] || 99;
    const prioB = typePriority[b.relation_type] || 99;
    
    if (prioA !== prioB) return prioA - prioB;
    
    // 3. Sub-Sequence (Tie-breaker for multiple exceptions/figures/etc)
    const subA = a.sub_sequence || 0;
    const subB = b.sub_sequence || 0;
    if (subA !== subB) return subA - subB;

    // 4. Fallback to current order
    return (a.order || 0) - (b.order || 0);
  };

  const duplicateIds = useMemo(() => {
    const seen = new Map<string, string>();
    const duplicates = new Set<string>();
    standards.forEach(s => {
      const num = (s.citation_num || '').trim();
      const type = (s.relation_type || '').trim();
      const key = `${num}|${type}`;
      
      if (seen.has(key)) {
        duplicates.add(s.id);
        const firstId = seen.get(key);
        if (firstId) duplicates.add(firstId);
      } else {
        seen.set(key, s.id);
      }
    });
    return duplicates;
  }, [standards]);

  const alphanumericIds = useMemo(() => {
    const ids = new Set<string>();
    standards.forEach(s => {
      if (/[a-zA-Z]/.test(s.citation_num || '')) {
        ids.add(s.id);
      }
    });
    return ids;
  }, [standards]);

  const maxOrder = useMemo(() => {
    if (standards.length === 0) return 0;
    return Math.max(...standards.map(s => s.order ?? 0));
  }, [standards]);

  const resequenceAll = async (currentStandards: MasterStandard[]) => {
    const sorted = [...currentStandards].sort(compareStandards);
    const updates: { id: string, data: any }[] = [];
    let changed = 0;

    // Smart Normalize: Group by Citation + Type to assign sub-sequences if needed
    const groups = new Map<string, MasterStandard[]>();
    sorted.forEach(s => {
      const key = `${s.citation_num}|${s.relation_type}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    });

    // Final list with updated sub-sequences
    const finalSorted: MasterStandard[] = [];
    groups.forEach((items) => {
      if (items.length > 1) {
        // If multiple items, ensure they have sub-sequences 1, 2, 3...
        items.forEach((item, i) => {
          const newSub = i + 1;
          if (item.sub_sequence !== newSub) {
            updates.push({ id: item.id, data: { sub_sequence: newSub } });
            item.sub_sequence = newSub;
            changed++;
          }
          finalSorted.push(item);
        });
      } else {
        // Single item, clear sub_sequence if it was set (optional, but keeps it clean)
        const item = items[0];
        if (item.sub_sequence && item.sub_sequence !== 0) {
          updates.push({ id: item.id, data: { sub_sequence: 0 } });
          item.sub_sequence = 0;
          changed++;
        }
        finalSorted.push(item);
      }
    });

    // Re-sort final list just in case sub-sequence updates changed anything
    finalSorted.sort(compareStandards);

    finalSorted.forEach((s, i) => {
      const newOrder = (i + 1) * 10;
      if (s.order !== newOrder) {
        updates.push({ id: s.id, data: { order: newOrder } });
        changed++;
      }
    });
    
    if (changed > 0) {
      // console.log(`Smart Normalize: Updating ${changed} standards...`);
      await firestoreService.batchUpdate('tas_standards', updates, false);
    }
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expandedStandards);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedStandards(next);
  };

  const filteredStandards = useMemo(() => {
    let base = [...standards].sort(compareStandards);
    
    // Filter by archived status
    base = base.filter(s => !!s.fldIsArchived === showArchived);

    if (selectedType !== 'ALL') {
      base = base.filter(s => s.fldStandardType === selectedType);
    }
    
    if (selectedVersion !== 'ALL') {
      base = base.filter(s => s.fldStandardVersion === selectedVersion);
    }

    if (showAlphanumericOnly) {
      base = base.filter(s => alphanumericIds.has(s.id));
    }
    if (!searchQuery) return base;
    const q = searchQuery.toLowerCase();
    return base.filter(s => 
      s.citation_num.toLowerCase().includes(q) || 
      s.citation_name.toLowerCase().includes(q) ||
      s.content_text.toLowerCase().includes(q) ||
      s.chapter_name.toLowerCase().includes(q) ||
      s.section_name.toLowerCase().includes(q)
    );
  }, [standards, searchQuery, showAlphanumericOnly, showArchived, alphanumericIds, selectedType, selectedVersion]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingStandard) return;

    const loadingToast = toast.loading('Compressing and uploading image...');
    setIsSaving(true);
    try {
      const resizedBase64 = await resizeImage(file, 1600, 1600);
      const storageRef = ref(storage, `standards/${editingStandard.citation_num || 'temp'}_${Date.now()}_${file.name}`);
      const snapshot = await uploadString(storageRef, resizedBase64, 'data_url');
      const url = await getDownloadURL(snapshot.ref);
      setEditingStandard({ ...editingStandard, image_url: url });
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      toast.dismiss(loadingToast);
      setIsSaving(false);
    }
  };

  const handleBulkImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsBulkUploading(true);
    setBulkUploadProgress({ current: 0, total: files.length });
    
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const citationNum = file.name.split('.').slice(0, -1).join('.'); // e.g., 604.5.2 from 604.5.2.jpg
      
      try {
        const resizedBase64 = await resizeImage(file, 1600, 1600);
        const storageRef = ref(storage, `standards/${file.name}`);
        const snapshot = await uploadString(storageRef, resizedBase64, 'data_url');
        const url = await getDownloadURL(snapshot.ref);

        // Find standard by citation_num
        const target = standards.find(s => s.citation_num.trim() === citationNum.trim());
        if (target) {
          await firestoreService.save('tas_standards', { ...target, image_url: url }, target.id, false);
          successCount++;
        } else {
          console.warn(`No standard found for citation: ${citationNum}`);
          failCount++;
        }
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        failCount++;
      }
      
      setBulkUploadProgress(prev => ({ ...prev, current: i + 1 }));
    }

    setIsBulkUploading(false);
    setShowBulkUploader(false);
    toast.success(`Bulk upload complete: ${successCount} linked, ${failCount} failed/unlinked`);
  };

  const sanitizeData = (data: any) => {
    const sanitized = { ...data };
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === undefined) {
        if (['fldStandards', 'fldImages', 'images', 'standards'].includes(key)) {
          sanitized[key] = [];
        } else {
          sanitized[key] = null;
        }
      }
    });
    return sanitized;
  };

  const handleSave = async () => {
    const citationNum = editingStandard?.citation_num?.trim();

    if (!citationNum) {
      toast.error('Citation Number is required');
      return;
    }

    setIsSaving(true);
    try {
      const data = sanitizeData({
        ...editingStandard,
        order: Number(editingStandard.order) || 0,
        fldStandardType: editingStandard.fldStandardType || 'TAS',
        fldStandardVersion: editingStandard.fldStandardVersion || '2012'
      });

      let finalStandards = [...standards];

      if (editingStandard.id) {
        const { id, ...updateData } = data;
        await firestoreService.save('tas_standards', updateData, id, false);
        const idx = finalStandards.findIndex(s => s.id === id);
        if (idx > -1) finalStandards[idx] = { ...finalStandards[idx], ...updateData };
        toast.success('Standard updated successfully');
      } else {
        const newId = await firestoreService.save('tas_standards', data, undefined, false);
        finalStandards.push({ ...data, id: newId } as MasterStandard);
        toast.success('Standard added successfully');
      }

      // Automatically re-sequence after save
      await resequenceAll(finalStandards);
      
      setEditingStandard(null);
    } catch (error: any) {
      console.error('Error saving standard:', error);
      toast.error(`Failed to save standard: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirmArchive) return;
    try {
      const isArchiving = !confirmArchive.fldIsArchived;
      await firestoreService.save('tas_standards', { fldIsArchived: isArchiving }, confirmArchive.id, false);
      toast.success(`Standard ${isArchiving ? 'archived' : 'restored'} successfully`);
      setConfirmArchive(null);
    } catch (error) {
      console.error('Error archiving standard:', error);
      toast.error('Failed to update standard status');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await firestoreService.delete('tas_standards', confirmDelete.id);
      const finalStandards = standards.filter(s => s.id !== confirmDelete.id);
      
      // Automatically re-sequence after delete
      await resequenceAll(finalStandards);
      
      toast.success('Standard deleted successfully');
      setConfirmDelete(null);
    } catch (error) {
      console.error('Error deleting standard:', error);
      toast.error('Failed to delete standard');
    }
  };

  const normalizeOrders = async () => {
    setConfirmAction({
      title: 'Normalize Orders',
      message: 'This will re-sequence ALL standards (10, 20, 30...) based on their Citation Number and Type Priority. Continue?',
      confirmText: 'Normalize All',
      onConfirm: async () => {
        setIsSaving(true);
        try {
          await resequenceAll(standards);
          toast.success('Orders normalized successfully');
        } catch (error) {
          console.error('Error normalizing orders:', error);
          toast.error('Failed to normalize orders');
        } finally {
          setIsSaving(false);
          setConfirmAction(null);
        }
      }
    });
  };

  const cleanAlphanumericCitations = async () => {
    // console.log('Scanning for citations with "F" or "T" suffix...');
    const targets = standards.filter(s => {
      const num = (s.citation_num || '').trim().toUpperCase();
      return num.endsWith('F') || num.endsWith('T');
    });

    // console.log(`Found ${targets.length} targets:`, targets);

    if (targets.length === 0) {
      toast.info('No citations with "F" or "T" suffix found.');
      return;
    }

    setConfirmAction({
      title: 'Clean Figures & Tables',
      message: `Found ${targets.length} citations with "F" or "T" suffix. Convert to Figure/Table types, remove suffixes, and re-sequence?`,
      confirmText: 'Clean and Re-sequence',
      onConfirm: async () => {
        setIsSaving(true);
        try {
          const updates: { id: string, data: any }[] = [];
          const updatedStandards = [...standards];

          targets.forEach(s => {
            const num = s.citation_num.trim();
            const suffix = num.slice(-1).toUpperCase();
            const newCitation = num.slice(0, -1).trim();
            const newType = suffix === 'F' ? 'Figure' : 'Table';
            
            updates.push({
              id: s.id,
              data: {
                citation_num: newCitation,
                relation_type: newType
              }
            });
            
            const idx = updatedStandards.findIndex(st => st.id === s.id);
            if (idx > -1) {
              updatedStandards[idx] = { 
                ...updatedStandards[idx], 
                citation_num: newCitation,
                relation_type: newType
              };
            }
          });

          await firestoreService.batchUpdate('tas_standards', updates, false);
          
          // Re-sequence after cleaning
          await resequenceAll(updatedStandards);
          
          toast.success(`Cleaned ${targets.length} citations`);
        } catch (error) {
          console.error('Error cleaning citations:', error);
          toast.error('Failed to clean citations');
        } finally {
          setIsSaving(false);
          setConfirmAction(null);
        }
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      <div className="p-6 bg-white border-b border-zinc-200">
        <div className="flex items-center justify-end mb-6">
          <div className="flex items-center gap-2">
            {/* 
            <Button variant="secondary" onClick={cleanAlphanumericCitations} disabled={isSaving} title="Remove 'F' or 'T' suffixes and set correct Relation Type">
              <RefreshCw size={16} className="mr-2" />
              Clean Figures & Tables
            </Button>
            <Button variant="secondary" onClick={normalizeOrders} disabled={isSaving}>
              <Hash size={16} className="mr-2" />
              Normalize Orders
            </Button>
            */}
            <Button variant="secondary" onClick={() => setShowBulkUploader(true)} disabled={isSaving}>
              <Upload size={16} className="mr-2" />
              Bulk Upload Images
            </Button>
            <Button onClick={() => setEditingStandard({ 
              relation_type: 'Standard', 
              order: maxOrder + 10,
              chapter_name: '',
              section_num: '',
              section_name: '',
              citation_num: '',
              citation_name: '',
              content_text: '',
              fldStandardType: selectedType !== 'ALL' ? selectedType : 'TAS',
              fldStandardVersion: selectedVersion !== 'ALL' ? selectedVersion : '2012'
            })}>
              <Plus size={16} className="mr-2" />
              Add Standard
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Type Filter</label>
            <select 
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setSelectedVersion('ALL');
              }}
              className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 outline-none"
            >
              {standardTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Version Filter</label>
            <select 
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 outline-none"
            >
              {standardVersions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className="relative flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <input 
              className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-200 rounded-lg bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-black/5 outline-none transition-all"
              placeholder="Search standards by number, name, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button 
            variant={showAlphanumericOnly ? 'primary' : 'secondary'} 
            size="sm" 
            onClick={() => setShowAlphanumericOnly(!showAlphanumericOnly)}
            className="shrink-0"
          >
            <FileText size={16} className="mr-2" />
            {showAlphanumericOnly ? 'Showing Alphanumeric' : 'Filter Alphanumeric'}
            {alphanumericIds.size > 0 && !showAlphanumericOnly && (
              <span className="ml-2 px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded-full text-[10px] font-bold">
                {alphanumericIds.size}
              </span>
            )}
          </Button>
          <Button 
            variant={showArchived ? 'primary' : 'secondary'} 
            size="sm" 
            onClick={() => setShowArchived(!showArchived)}
            className="shrink-0"
          >
            <Trash2 size={16} className="mr-2" />
            {showArchived ? 'Showing Archived' : 'Show Archived'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-4 py-3 text-[10px] font-bold text-blue-600 uppercase tracking-wider w-16">Order</th>
                <th className="px-4 py-3 text-[10px] font-bold text-blue-600 uppercase tracking-wider w-16">Img</th>
                <th className="px-4 py-3 text-[10px] font-bold text-blue-600 uppercase tracking-wider w-24">Citation</th>
                <th className="px-4 py-3 text-[10px] font-bold text-blue-600 uppercase tracking-wider">Chapter / Section / Name</th>
                <th className="px-4 py-3 text-[10px] font-bold text-blue-600 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-[10px] font-bold text-blue-600 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredStandards.map((s, index) => (
                <React.Fragment key={`${s.id || 'new'}-${index}`}>
                  <tr className={cn(
                    "hover:bg-zinc-50 transition-colors group cursor-pointer", 
                    expandedStandards.has(s.id) && "bg-zinc-50",
                    duplicateIds.has(s.id) && "bg-orange-500/20 hover:bg-orange-500/30",
                    alphanumericIds.has(s.id) && !duplicateIds.has(s.id) && "bg-purple-500/10 hover:bg-purple-500/20"
                  )} onClick={() => toggleExpand(s.id)}>
                    <td className="px-4 py-3 text-xs font-mono text-zinc-400">{s.order}</td>
                    <td className="px-4 py-3">
                      {s.image_url ? (
                        <img 
                          src={s.image_url} 
                          alt="Standard" 
                          className="w-8 h-8 object-cover rounded border border-zinc-200"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded border border-dashed border-zinc-200 flex items-center justify-center text-zinc-300">
                          <ImageIcon size={12} />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-zinc-900">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          alphanumericIds.has(s.id) && "text-purple-600"
                        )}>
                          {s.citation_num}
                        </span>
                        {duplicateIds.has(s.id) && (
                          <AlertCircle size={12} className="text-orange-600" />
                        )}
                        {alphanumericIds.has(s.id) && (
                          <div className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-bold uppercase tracking-wider">
                            Alphanumeric
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">{s.chapter_name}</p>
                        <p className="text-xs font-medium text-zinc-700">{s.section_num} {s.section_name}</p>
                        <p className="text-[10px] text-zinc-500 italic">{s.citation_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                        s.relation_type === 'Standard' ? "bg-zinc-100 text-zinc-600" :
                        s.relation_type === 'Advisory' ? "bg-blue-100 text-blue-700" :
                        s.relation_type === 'Exception' ? "bg-amber-100 text-amber-700" :
                        s.relation_type === 'Exception Advisory' ? "bg-indigo-100 text-indigo-700" :
                        s.relation_type === 'Figure' ? "bg-purple-100 text-purple-700" :
                        "bg-teal-100 text-teal-700"
                      )}>
                        {s.relation_type} {s.sub_sequence && s.sub_sequence > 0 ? s.sub_sequence : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => setEditingStandard(s)}
                          className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900 transition-colors"
                          title="Edit Standard"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => setConfirmArchive(s)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            s.fldIsArchived 
                              ? "hover:bg-green-50 text-green-400 hover:text-green-600" 
                              : "hover:bg-amber-50 text-zinc-400 hover:text-amber-600"
                          )}
                          title={s.fldIsArchived ? "Restore Standard" : "Archive Standard"}
                        >
                          {s.fldIsArchived ? <RefreshCw size={14} /> : <Trash2 size={14} />}
                        </button>
                        <button 
                          onClick={() => setConfirmDelete(s)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-600 transition-colors"
                          title="Permanently Delete"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedStandards.has(s.id) && (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 bg-zinc-50 text-sm text-zinc-700 border-b border-zinc-100">
                        <div className="flex gap-6">
                          {s.image_url && (
                            <div className="shrink-0">
                              <img 
                                src={s.image_url} 
                                alt={s.citation_num} 
                                className="max-w-xs rounded-xl border border-zinc-200 shadow-sm"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                          <div className="whitespace-pre-wrap flex-1">
                            {s.content_text}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filteredStandards.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500 italic text-sm">
                    No standards found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingStandard && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900">
                {editingStandard.id ? 'Edit Standard' : 'Add New Standard'}
              </h3>
              <button onClick={() => setEditingStandard(null)} className="text-zinc-400 hover:text-zinc-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Standard Type" 
                  placeholder="e.g. TAS, ADA"
                  value={editingStandard.fldStandardType || ''} 
                  onChange={(e: any) => setEditingStandard({ ...editingStandard, fldStandardType: e.target.value })} 
                />
                <Input 
                  label="Standard Version" 
                  placeholder="e.g. 2012, 2010"
                  value={editingStandard.fldStandardVersion || ''} 
                  onChange={(e: any) => setEditingStandard({ ...editingStandard, fldStandardVersion: e.target.value })} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Order" 
                  type="number"
                  value={editingStandard.order} 
                  onChange={(e: any) => setEditingStandard({ ...editingStandard, order: e.target.value })} 
                />
                <Select 
                  label="Relation Type"
                  value={editingStandard.relation_type}
                  onChange={(e: any) => setEditingStandard({ ...editingStandard, relation_type: e.target.value as any })}
                  options={[
                    { value: 'Standard', label: 'Standard' },
                    { value: 'Advisory', label: 'Advisory' },
                    { value: 'Exception', label: 'Exception' },
                    { value: 'Figure', label: 'Figure' }
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Chapter Name" 
                  value={editingStandard.chapter_name} 
                  onChange={(e: any) => setEditingStandard({ ...editingStandard, chapter_name: e.target.value })} 
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input 
                    label="Sec #" 
                    className="col-span-1"
                    value={editingStandard.section_num} 
                    onChange={(e: any) => setEditingStandard({ ...editingStandard, section_num: e.target.value })} 
                  />
                  <Input 
                    label="Section Name" 
                    className="col-span-2"
                    value={editingStandard.section_name} 
                    onChange={(e: any) => setEditingStandard({ ...editingStandard, section_name: e.target.value })} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Citation #" 
                  value={editingStandard.citation_num} 
                  onChange={(e: any) => setEditingStandard({ ...editingStandard, citation_num: e.target.value })} 
                />
                <Input 
                  label="Citation Name" 
                  value={editingStandard.citation_name} 
                  onChange={(e: any) => setEditingStandard({ ...editingStandard, citation_name: e.target.value })} 
                />
              </div>

              <TextArea 
                label="Content Text" 
                value={editingStandard.content_text} 
                onChange={(e: any) => setEditingStandard({ ...editingStandard, content_text: e.target.value })} 
              />
            </div>

            <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setEditingStandard(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save size={16} className="mr-2" />
                {isSaving ? 'Saving...' : 'Save Standard'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Uploader Modal */}
      {showBulkUploader && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Upload size={20} className="text-zinc-400" />
                Bulk Image Uploader
              </h3>
              <button onClick={() => !isBulkUploading && setShowBulkUploader(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-zinc-500">
                Upload multiple images. Files will be automatically linked to standards if the filename matches the <strong>Citation Number</strong> (e.g., <code>604.5.2.jpg</code>).
              </p>

              {isBulkUploading ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase">
                    <span>Uploading...</span>
                    <span>{bulkUploadProgress.current} / {bulkUploadProgress.total}</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-black transition-all duration-300" 
                      style={{ width: `${(bulkUploadProgress.current / bulkUploadProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-zinc-200 rounded-xl cursor-pointer hover:border-zinc-400 transition-colors">
                  <Upload size={32} className="text-zinc-300 mb-2" />
                  <span className="text-sm font-medium text-zinc-600">Click to select images</span>
                  <span className="text-xs text-zinc-400 mt-1">Select multiple files (JPG, PNG, etc.)</span>
                  <input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleBulkImageUpload} 
                  />
                </label>
              )}
            </div>

            {!isBulkUploading && (
              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => setShowBulkUploader(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Archive Confirmation */}
      {confirmArchive && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6">
            <div className="flex items-center gap-4 text-amber-600">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">
                  {confirmArchive.fldIsArchived ? 'Restore Standard?' : 'Archive Standard?'}
                </h3>
                <p className="text-sm text-zinc-500">
                  {confirmArchive.fldIsArchived 
                    ? 'This will make the standard available for selection again.' 
                    : 'This will hide the standard from selection, but it will remain in the system for historical records.'}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmArchive(null)}>Cancel</Button>
              <Button 
                variant={confirmArchive.fldIsArchived ? 'primary' : 'danger'} 
                onClick={handleArchive}
              >
                {confirmArchive.fldIsArchived ? 'Restore' : 'Archive'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-red-50 rounded-full text-red-600 shrink-0">
                <AlertCircle size={24} />
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Permanent Deletion</h3>
                  <p className="text-sm text-zinc-600 mt-1">
                    Are you sure you want to delete standard <span className="font-bold text-zinc-900">"{confirmDelete.citation_num}"</span>?
                  </p>
                  <p className="text-xs text-red-600 font-medium mt-2 flex items-center gap-1">
                    <Trash2 size={12} /> This action cannot be undone.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                  <Button variant="danger" size="sm" onClick={handleDelete}>Delete Permanently</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generic Action Confirmation */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className={cn(
                "p-2 rounded-full shrink-0",
                confirmAction.variant === 'danger' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
              )}>
                <AlertCircle size={24} />
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">{confirmAction.title}</h3>
                  <p className="text-sm text-zinc-600 mt-1">{confirmAction.message}</p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" size="sm" onClick={() => setConfirmAction(null)}>Cancel</Button>
                  <Button 
                    variant={confirmAction.variant || 'primary'} 
                    size="sm" 
                    onClick={confirmAction.onConfirm}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Processing...' : (confirmAction.confirmText || 'Confirm')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
