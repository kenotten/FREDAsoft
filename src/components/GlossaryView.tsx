import React, { useState } from 'react';
import { StandardsBrowser } from './StandardsBrowser';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { GlossaryBuilder } from './GlossaryBuilder';
import { MasterStandard, Finding, MasterRecommendation, Glossary } from '../types';

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
  setIsSynced,
  isUpdatingRef
}: any) {
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

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Glossary Builder</h1>
        <p className="text-zinc-500">Manage the master inspection library</p>
      </div>

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
