import React, { useState } from 'react';
import { 
  Download,
  Layout,
  ArrowUp,
  ArrowDown,
  Book,
  Hash
} from 'lucide-react';
import { db } from '../firebase';
import { writeBatch, doc } from 'firebase/firestore';
import { firestoreService, OperationType, handleFirestoreError } from '../services/firestoreService';
import { StandardsBrowser } from './StandardsBrowser';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '../lib/utils';
import { Button, Card } from './ui/core';
import { toast } from 'sonner';
import { GlossaryBuilder } from './GlossaryBuilder';
import { MasterStandard, Finding, MasterRecommendation, Glossary } from '../types';
import { sanitizeData } from '../lib/utils';

export function GlossaryView({ 
  categories = [], 
  items = [], 
  findings = [], 
  setFindings,
  recommendations = [], 
  setRecommendations,
  masterRecommendations = [],
  glossary = [], 
  setGlossary,
  unitTypes = [], 
  standards = [], 
  selections = {}, 
  onSelectionChange,
  updatePreferences,
  importMasterGlossary,
  isDeduplicating,
  dedupStatus,
  setIsSynced,
  isUpdatingRef
}: any) {
  const [isSeeding, setIsSeeding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showStandards, setShowStandards] = useState(true);
  const [activeStandardTarget, setActiveStandardTarget] = useState<'finding' | 'recommendation' | 'glossary'>('finding');
  const [stagedFindingStds, setStagedFindingStds] = useState<string[]>([]);
  const [stagedRecStds, setStagedRecStds] = useState<string[]>([]);
  const [stagedGlosStds, setStagedGlosStds] = useState<string[]>([]);

  // INITIALIZE STAGED STATE
  const initializeStaged = () => {
    const { selectedFind, selectedRec, editingGlossaryId } = selections;

    const norm = (v: any) => String(v ?? '').toLowerCase().trim();
const safeArray = (v: any): string[] => {
  if (!v) return [];

  // Already an array
  if (Array.isArray(v)) {
    return Array.from(new Set(v.filter(Boolean)));
  }

  // Firestore map/object → convert to array
  if (typeof v === 'object') {
    return Array.from(new Set(Object.values(v).filter(Boolean)));
  }

  return [];
};

    // Finding
    const f = findings.find((f: Finding) =>
      norm(f.id) === norm(selectedFind) ||
      norm(f.fldFindID) === norm(selectedFind)
    );
    const fStds = safeArray(f?.fldStandards);
    setStagedFindingStds(fStds);

    // Recommendation
    const masterRecsSource = Array.isArray(masterRecommendations) ? masterRecommendations : [];
    const r = masterRecsSource.find((r: MasterRecommendation) =>
      norm(r.id) === norm(selectedRec) ||
      norm(r.fldRecID) === norm(selectedRec)
    );
    const rStds = safeArray(r?.fldStandards);
    setStagedRecStds(rStds);

    // Glossary
    const g = editingGlossaryId
      ? glossary.find((g: Glossary) =>
          norm(g.fldGlosId) === norm(editingGlossaryId) ||
          norm(g.id) === norm(editingGlossaryId)
        )
      : glossary.find((g: Glossary) =>
          norm(g.fldFind) === norm(selectedFind) &&
          norm(g.fldRec) === norm(selectedRec)
        );

 const gStds = safeArray(g?.fldStandards);


    if (g) {
      setStagedGlosStds(gStds);
    } else {
      const union = Array.from(new Set([...fStds, ...rStds]));
      setStagedGlosStds(union);
    }

  };

const lastIdentity = React.useRef('');

React.useEffect(() => {
  const { selectedFind, selectedRec, editingGlossaryId } = selections;

  const currentIdentity = `${selectedFind}-${selectedRec}-${editingGlossaryId}`;
  const identityChanged = currentIdentity !== lastIdentity.current;

  const norm = (v: any) => String(v ?? '').toLowerCase().trim();

  // Ensure the ACTUAL selected records exist before initializing
  const findingReady = findings.some((f: Finding) =>
    norm(f.id) === norm(selectedFind) ||
    norm(f.fldFindID) === norm(selectedFind)
  );

  const recReady = masterRecommendations.some((r: MasterRecommendation) =>
    norm(r.id) === norm(selectedRec) ||
    norm(r.fldRecID) === norm(selectedRec)
  );

  const glossaryReady = !editingGlossaryId || glossary.some((g: Glossary) =>
    norm(g.fldGlosId) === norm(editingGlossaryId) ||
    norm(g.id) === norm(editingGlossaryId)
  );

  const dataReady = findingReady && recReady && glossaryReady;

  if (!dataReady) return;

  if (identityChanged || !selections.isDirty) {
    initializeStaged();

    if (identityChanged) {
      lastIdentity.current = currentIdentity;
    }
  }
}, [
  selections.selectedFind,
  selections.selectedRec,
  selections.editingGlossaryId,
  findings,
  masterRecommendations,
  glossary
]);

  const handleAddStandard = (s: MasterStandard, targetOverride?: 'finding' | 'recommendation' | 'glossary') => {
    const standardId = s.id;
    if (!standardId) return;

    const target = targetOverride || activeStandardTarget;
    const { selectedFind, selectedRec, editingGlossaryId } = selections;

    if (target === 'finding') {
      if (!selectedFind) {
        toast.error('Please select a finding first');
        return;
      }
      if (!stagedFindingStds.includes(standardId)) {
        setStagedFindingStds(prev => [...prev, standardId]);
        // CASCADE to Glossary
        setStagedGlosStds(prev => Array.from(new Set([...prev, standardId])));
        onSelectionChange({ ...selections, isDirty: true });
        toast.success('Added to Finding (staged)');
      } else {
        toast.info('Already in Finding citations');
      }
    } else if (target === 'recommendation') {
      if (!selectedRec) {
        toast.error('Please select a recommendation first');
        return;
      }
      if (!stagedRecStds.includes(standardId)) {
        setStagedRecStds(prev => [...prev, standardId]);
        // CASCADE to Glossary
        setStagedGlosStds(prev => Array.from(new Set([...prev, standardId])));
        onSelectionChange({ ...selections, isDirty: true });
        toast.success('Added to Recommendation (staged)');
      } else {
        toast.info('Already in Recommendation citations');
      }
    } else if (target === 'glossary') {
      const { selectedCat, selectedItem, selectedFind, selectedRec } = selections;
      const hasMinimumContext = selectedCat && selectedItem && selectedFind && selectedRec;

      if (!hasMinimumContext) {
        toast.error('Select Category, Item, Finding, and Recommendation before adding glossary citations.');
        return;
      }
      if (!stagedGlosStds.includes(standardId)) {
        setStagedGlosStds(prev => [...prev, standardId]);
        onSelectionChange({ ...selections, isDirty: true });
        toast.success('Added to Glossary only (staged)');
      } else {
        toast.info('Already in Glossary overrides');
      }
    }
  };

  const handleRemoveStandard = (target: 'finding' | 'recommendation' | 'glossary', standardId: string) => {
    if (target === 'finding') {
      setStagedFindingStds(prev => prev.filter(id => id !== standardId));
      setStagedGlosStds(prev => prev.filter(id => id !== standardId));
      onSelectionChange({ ...selections, isDirty: true });
      toast.success('Removed from Finding (staged)');
    } else if (target === 'recommendation') {
      setStagedRecStds(prev => prev.filter(id => id !== standardId));
      setStagedGlosStds(prev => prev.filter(id => id !== standardId));
      onSelectionChange({ ...selections, isDirty: true });
      toast.success('Removed from Recommendation (staged)');
    } else if (target === 'glossary') {
      setStagedGlosStds(prev => prev.filter(id => id !== standardId));
      onSelectionChange({ ...selections, isDirty: true });
      toast.success('Removed from Glossary only (staged)');
    }
  };
  const seedStandards = async (csvData: string) => {
    setIsSeeding(true);
    setStatusMessage('Parsing standards...');
    try {
      const parseCSV = (data: string) => {
        const rows = [];
        let currentRow: string[] = [];
        let currentField = '';
        let inQuotes = false;
        let i = 0;
        const cleanData = data.startsWith('\uFEFF') ? data.slice(1) : data;
        const firstLineEnd = cleanData.indexOf('\n');
        const firstLine = firstLineEnd !== -1 ? cleanData.substring(0, firstLineEnd) : cleanData;
        const commaCount = (firstLine.match(/,/g) || []).length;
        const semiCount = (firstLine.match(/;/g) || []).length;
        const tabCount = (firstLine.match(/\t/g) || []).length;
        const separator = tabCount > commaCount && tabCount > semiCount ? '\t' : (semiCount > commaCount ? ';' : ',');

        while (i < cleanData.length) {
          const char = cleanData[i];
          const nextChar = cleanData[i + 1];
          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              currentField += '"';
              i += 2;
              continue;
            }
            inQuotes = !inQuotes;
            i++;
          } else if (char === separator && !inQuotes) {
            currentRow.push(currentField.trim());
            currentField = '';
            i++;
          } else if ((char === '\r' || char === '\n') && !inQuotes) {
            currentRow.push(currentField.trim());
            if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
              rows.push(currentRow);
            }
            currentRow = [];
            currentField = '';
            if (char === '\r' && nextChar === '\n') i++;
            i++;
          } else {
            currentField += char;
            i++;
          }
        }
        if (currentField || currentRow.length > 0) {
          currentRow.push(currentField.trim());
          rows.push(currentRow);
        }
        return rows;
      };

      const allRows = parseCSV(csvData);
      if (allRows.length < 2) throw new Error('CSV is empty or invalid');

      const rawHeaders = allRows[0];
      const headers = rawHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const findHeader = (possibleNames: string[]) => {
        for (const name of possibleNames) {
          const index = headers.indexOf(name.toLowerCase().replace(/[^a-z0-9]/g, ''));
          if (index !== -1) return index;
        }
        return -1;
      };

      const idx = {
        order: findHeader(['order', 'sort_order', 'fldOrder', 'sortorder', 'seq', 'sequence']),
        chapter: findHeader(['taschaptername', 'chapter', 'chapter_name', 'fldChapter', 'chaptername']),
        sectionNum: findHeader(['tassectionnum', 'section_num', 'section_number', 'fldSectionNum', 'sectionnum']),
        sectionName: findHeader(['tassectionname', 'section', 'section_name', 'fldSectionName', 'sectionname']),
        relation: findHeader(['relation', 'relation_type', 'fldRelation', 'relationtype']),
        tasNum: findHeader(['tasnum', 'citation_num', 'citation_number', 'fldTASNum', 'refnum', 'citationnum']),
        tasName: findHeader(['tasname', 'citation_name', 'citation', 'fldTASName', 'reftext', 'citationname']),
        text: findHeader(['memtastext', 'content', 'text', 'content_text', 'fldText', 'memotext'])
      };

      let lastChapter = 'Chapter 1';
      let lastSectionNum = '';
      let lastSectionName = '';
      let count = 0;
      let batch = writeBatch(db);
      let batchCount = 0;

      for (let i = 1; i < allRows.length; i++) {
        const values = allRows[i];
        if (values.length < 2) continue;
        const cleanOrderStr = (values[idx.order] || '').replace(/[^0-9.-]/g, '');
        const orderVal = parseInt(cleanOrderStr) || i;
        let chapter = values[idx.chapter] || '';
        let sectionNum = values[idx.sectionNum] || '';
        let sectionName = values[idx.sectionName] || '';
        if (chapter && chapter.length < 100) lastChapter = chapter;
        chapter = lastChapter;
        if (sectionNum && sectionNum.length < 50) lastSectionNum = sectionNum;
        sectionNum = lastSectionNum;
        if (sectionName && sectionName.length < 200) lastSectionName = sectionName;
        sectionName = lastSectionName;
        const relation = values[idx.relation] || 'Standard';
        let tasNum = values[idx.tasNum] || '';
        let tasName = values[idx.tasName] || '';
        const contentText = values[idx.text] || '';
        if (tasNum.length > 30) {
          if (!tasName) tasName = tasNum;
          tasNum = 'General';
        }
        if (!tasNum && !contentText) continue;
        const standard: MasterStandard = {
          id: uuidv4(),
          order: orderVal,
          chapter_name: chapter.trim(),
          section_num: sectionNum.trim(),
          section_name: sectionName.trim(),
          citation_num: tasNum.trim(),
          citation_name: tasName.trim(),
          content_text: contentText.trim(),
          relation_type: (relation as any) || 'Standard',
          fldStandardType: 'TAS',
          fldStandardVersion: '2012'
        };
        const docId = `${orderVal}_${tasNum}_${relation}`.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        batch.set(doc(db, 'tas_standards', docId), standard);
        batchCount++;
        count++;
        if (batchCount === 500) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
          setStatusMessage(`Imported ${count} standards...`);
        }
      }
      if (batchCount > 0) await batch.commit();
      setStatusMessage(`Successfully imported ${count} standards!`);
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err) {
      console.error(err);
      setStatusMessage('Error seeding standards.');
      setTimeout(() => setStatusMessage(null), 3000);
      handleFirestoreError(err, OperationType.WRITE, 'tas_standards');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Glossary Builder</h1>
          <p className="text-zinc-500">Manage the master inspection library</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => importMasterGlossary()} disabled={isDeduplicating}>
            {isDeduplicating ? dedupStatus : 'Import Master'}
          </Button>
          <input type="file" accept=".csv" className="hidden" id="standards-upload" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (ev) => seedStandards(ev.target?.result as string);
              reader.readAsText(file);
            }
          }} />
          <Button variant="secondary" onClick={() => document.getElementById('standards-upload')?.click()} isLoading={isSeeding}>
            Seed Standards
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-sm font-medium animate-pulse">
          {statusMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className={cn("space-y-8 transition-all duration-500", showStandards ? "col-span-1 lg:col-span-8" : "col-span-1 lg:col-span-12")}>
          <GlossaryBuilder 
            categories={categories}
            items={items}
            findings={findings}
            setFindings={setFindings}
            recommendations={recommendations}
            setRecommendations={setRecommendations}
            masterRecommendations={masterRecommendations}
            glossary={glossary}
            setGlossary={setGlossary}
            unitTypes={unitTypes}
            standards={standards}
            selections={selections}
            onSelectionChange={onSelectionChange}
            updatePreferences={updatePreferences}
            setIsSynced={setIsSynced}
            isUpdatingRef={isUpdatingRef}
            setShowStandards={setShowStandards}
            showStandards={showStandards}
            activeStandardTarget={activeStandardTarget}
            setActiveStandardTarget={setActiveStandardTarget}
            onAddStandard={handleAddStandard}
            onRemoveStandard={handleRemoveStandard}
            onDiscardChanges={initializeStaged}
            stagedFindingStds={stagedFindingStds}
            stagedRecStds={stagedRecStds}
            stagedGlosStds={stagedGlosStds}
          />
        </div>

        {showStandards && (
          <div className="col-span-1 lg:col-span-4 lg:sticky lg:top-8 lg:h-[calc(100vh-theme(spacing.32))] flex flex-col min-h-[400px] lg:min-h-0">
            <StandardsBrowser 
              standards={standards} 
              onSelect={handleAddStandard}
              className="flex-1"
            />
          </div>
        )}
      </div>
    </div>
  );
}
