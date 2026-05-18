import React, { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { db } from '../../firebase';
import type { Facility, Project } from '../../types';
import { resolveFacilityReportNarrative } from '../../lib/reportPreviewShared';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

type Props = {
  isOpen: boolean;
  project: Project;
  facility: Facility;
  onClose: () => void;
};

export function FacilityNarrativeModal({ isOpen, project, facility, onClose }: Props) {
  const facilityId = String(facility.fldFacID || '').trim();
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const stored = facilityId ? project.fldFacilityNarratives?.[facilityId] : undefined;
    setText(stored ?? '');
  }, [isOpen, facilityId, project.fldFacilityNarratives, project.fldProjID]);

  const legacyNarrative = String(project.fldNarrative || '').trim();
  const hasStoredForFacility = Boolean(
    facilityId && String(project.fldFacilityNarratives?.[facilityId] ?? '').trim()
  );

  const handleSave = async () => {
    if (!facilityId) {
      toast.error('Select a facility before saving narrative.');
      return;
    }
    setIsSaving(true);
    try {
      const nextMap = { ...(project.fldFacilityNarratives || {}) };
      const trimmed = text.trim();
      if (trimmed) {
        nextMap[facilityId] = trimmed;
      } else {
        delete nextMap[facilityId];
      }
      const projectRef = doc(db, 'projects', project.fldProjID);
      await updateDoc(projectRef, { fldFacilityNarratives: nextMap });
      toast.success('Facility narrative saved.');
      onClose();
    } catch (error) {
      console.error('Failed to save facility narrative:', error);
      toast.error('Failed to save facility narrative.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const resolvedPreview = resolveFacilityReportNarrative(project, facilityId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit facility narrative"
      subTitle={`${project.fldProjName} — ${facility.fldFacName}`}
      maxWidth="2xl"
      overlayClassName="z-[100]"
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleSave} isLoading={isSaving}>
            Save narrative
          </Button>
        </div>
      }
    >
      <p className="text-sm text-zinc-600 leading-relaxed">
        This text appears in the report Narrative section for this facility only. Other facilities in
        the project can have their own narrative.
      </p>
      {!hasStoredForFacility && legacyNarrative ? (
        <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          No facility-specific narrative saved yet. The report currently uses the legacy project
          narrative until you save text here.
        </p>
      ) : null}
      {!text.trim() && !legacyNarrative ? (
        <p className="mt-2 text-xs text-zinc-500">
          Report preview will show: &ldquo;{resolvedPreview}&rdquo;
        </p>
      ) : null}
      <div className="mt-4">
        <Textarea
          label="Narrative"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          placeholder="Enter the facility narrative for this project…"
          className="font-mono text-sm"
        />
      </div>
    </Modal>
  );
}
