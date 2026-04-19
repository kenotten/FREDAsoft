import React, { useState, useEffect, useMemo } from 'react';
import metadata from '../../metadata.json';
import { Project, Inspector, ProjectData } from '../types';
import { Modal } from './ui/modal';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { Calendar, FileText, User, MapPin, Hash, Info, CreditCard } from 'lucide-react';

interface ProjectSettingsProps {
  project: Project;
  inspectors: Inspector[];
  projectData: ProjectData[];
  onClose: () => void;
  onUpdate: (updatedProject: Project) => void;
}

export function ProjectSettings({
  project,
  inspectors,
  projectData,
  onClose,
  onUpdate
}: ProjectSettingsProps) {
  const [formData, setFormData] = useState<Partial<Project>>({ ...project });
  const [isSaving, setIsSaving] = useState(false);

  const totalCost = 0;

  useEffect(() => {
    setFormData({ ...project });
  }, [project]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const projectRef = doc(db, 'projects', project.fldProjID);
      const payload = {
        fldProjName: formData.fldProjName,
        fldInspector: formData.fldInspector,
        fldClient: formData.fldClient,
        fldDesigner: formData.fldDesigner,
        fldPDDate: formData.fldPDDate
      };
      await updateDoc(projectRef, payload);
      onUpdate({ ...project, ...payload } as Project);
      toast.success('Project settings updated!');
      onClose();
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Project Settings" maxWidth="xl">
      <div className="space-y-6 p-1">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <Info size={14} /> General Info
          </h3>
          <Input 
            label="Project Name" 
            value={formData.fldProjName || ''} 
            onChange={(e) => setFormData({ ...formData, fldProjName: e.target.value })}
            placeholder="Enter project name..."
          />
          <Input 
            label="Project Date" 
            type="date"
            value={formData.fldPDDate || ''} 
            onChange={(e) => setFormData({ ...formData, fldPDDate: e.target.value })}
          />
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Inspector</label>
            <select 
              className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
              value={formData.fldInspector || ''}
              onChange={(e) => setFormData({ ...formData, fldInspector: e.target.value })}
            >
              <option value="">Select Inspector</option>
              {inspectors.map(i => (
                <option key={i.fldInspID} value={i.fldInspID}>{i.fldInspName}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} isLoading={isSaving}>Save Settings</Button>
        </div>
      </div>
    </Modal>
  );
}
