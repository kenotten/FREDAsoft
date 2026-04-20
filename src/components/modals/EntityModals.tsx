import React from 'react';
import { Modal } from '../ui/modal';
import { Button, Input, Select } from '../ui/core';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Client, Facility, Project, Inspector } from '../../types';

interface ClientModalProps {
  isOpen: boolean;
  editingClient: Client | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const ClientModal = ({ isOpen, editingClient, onClose, onSubmit }: ClientModalProps) => {
  if (!isOpen) return null;
  return (
    <Modal 
      key="client-modal"
      title={editingClient ? "Edit Client" : "Add New Client"} 
      onClose={onClose}
      onSubmit={onSubmit}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit">{editingClient ? "Save Changes" : "Save Client"}</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input label="Client Name" name="name" defaultValue={editingClient?.fldClientName || ''} required />
        <Input label="Address" name="address" defaultValue={editingClient?.fldClientAddress || ''} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="City" name="city" defaultValue={editingClient?.fldClientCity || ''} />
          <Input label="State" name="state" defaultValue={editingClient?.fldClientState || ''} />
        </div>
        <Input label="ZIP" name="zip" defaultValue={editingClient?.fldClientZIP || ''} />
      </div>
    </Modal>
  );
};

interface FacilityModalProps {
  isOpen: boolean;
  editingFacility: Facility | null;
  clients: Client[];
  selections: any;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const FacilityModal = ({ isOpen, editingFacility, clients, selections, onClose, onSubmit }: FacilityModalProps) => {
  if (!isOpen) return null;
  const clientName = clients.find(c => c.fldClientID === (editingFacility?.fldClient || selections.clientId))?.fldClientName || "Unknown Client";
  
  return (
    <Modal 
      key="facility-modal"
      title={editingFacility ? "Edit Facility" : "Add New Facility"} 
      subTitle={clientName}
      onClose={onClose}
      onSubmit={onSubmit}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit">{editingFacility ? "Save Changes" : "Save Facility"}</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input label="Facility Name" name="name" defaultValue={editingFacility?.fldFacName || ''} required />
        <Input label="Address" name="address" defaultValue={editingFacility?.fldFacAddress || ''} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="City" name="city" defaultValue={editingFacility?.fldFacCity || ''} />
          <Input label="State" name="state" defaultValue={editingFacility?.fldFacState || ''} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="ZIP" name="zip" defaultValue={editingFacility?.fldFacZip || ''} />
          <Input label="Inspection Date" name="inspectionDate" type="date" defaultValue={editingFacility?.fldInspectionDate || ''} />
        </div>
      </div>
    </Modal>
  );
};

interface ProjectModalProps {
  isOpen: boolean;
  editingProject: Project | null;
  clients: Client[];
  facilities: Facility[];
  inspectors: Inspector[];
  selections: any;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  allowClientChange?: boolean; // Add this line
}

export const ProjectModal = ({ 
  isOpen, 
  editingProject, 
  clients, 
  facilities, 
  inspectors, 
  selections, 
  onClose, 
  onSubmit,
  allowClientChange // Add this line
}: ProjectModalProps) => {

  if (!isOpen) return null;
  const clientName = clients.find(c => c.fldClientID === (editingProject?.fldClient || selections.clientId))?.fldClientName || "Unknown Client";

  return (
    <Modal 
      key="project-modal"
      title={editingProject ? "Edit Project" : "New Project"} 
      subTitle={clientName}
      onClose={onClose}
      onSubmit={onSubmit}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit">{editingProject ? "Save Changes" : "Create Project"}</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* NEW CLIENT SELECTION BLOCK */}
        {allowClientChange ? (
          <Select 
            label="Project Client" 
            name="client" 
            defaultValue={editingProject?.fldClient || selections.clientId || ''}
            options={clients.map(c => ({ value: c.fldClientID, label: c.fldClientName }))}
            required
          />
        ) : (
          <input type="hidden" name="client" value={editingProject?.fldClient || selections.clientId || ''} />
        )}
        {/* END NEW BLOCK */}

        <div className="flex bg-zinc-100 p-1 rounded-lg mb-4">

          <button 
            type="button"
            onClick={(e) => {
              const form = (e.target as HTMLElement).closest('form');
              if (form) {
                const input = form.querySelector('input[name="projType"]') as HTMLInputElement;
                if (input) input.value = 'Assessment';
                form.querySelectorAll('.type-toggle').forEach(b => b.classList.remove('bg-white', 'shadow-sm', 'text-blue-600'));
                (e.target as HTMLElement).classList.add('bg-white', 'shadow-sm', 'text-blue-600');
              }
            }}
            className={cn(
              "flex-1 py-1.5 text-xs font-bold rounded-md transition-all type-toggle",
              (editingProject?.fldProjType === 'Assessment') ? "bg-white shadow-sm text-blue-600" : "text-zinc-500"
            )}
          >Assessment</button>
          <button 
            type="button"
            onClick={(e) => {
              const form = (e.target as HTMLElement).closest('form');
              if (form) {
                const input = form.querySelector('input[name="projType"]') as HTMLInputElement;
                if (input) input.value = 'TAS/RAS';
                form.querySelectorAll('.type-toggle').forEach(b => b.classList.remove('bg-white', 'shadow-sm', 'text-blue-600'));
                (e.target as HTMLElement).classList.add('bg-white', 'shadow-sm', 'text-blue-600');
              }
            }}
            className={cn(
              "flex-1 py-1.5 text-xs font-bold rounded-md transition-all type-toggle",
              (!editingProject || editingProject?.fldProjType === 'TAS/RAS') ? "bg-white shadow-sm text-blue-600" : "text-zinc-500"
            )}
          >TAS/RAS</button>
          <input type="hidden" name="projType" defaultValue={editingProject?.fldProjType || 'TAS/RAS'} />
        </div>

        <Input label="Project Name" name="name" defaultValue={editingProject?.fldProjName || ''} required />
        
        <div className="grid grid-cols-2 gap-4">
          <Input label="OCG Project #" name="projNumber" placeholder="YY-MM-XXXXX" defaultValue={editingProject?.fldProjNumber || ''} required />
          <Input label="External Ref / TABS #" name="externalRef" defaultValue={editingProject?.fldExternalRef || ''} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Date" name="date" type="date" defaultValue={editingProject?.fldPDDate || ''} required />
          <Select 
            label="Inspector" 
            name="inspector" 
            defaultValue={editingProject?.fldInspector || ''}
            options={[...inspectors].sort((a, b) => a.fldInspName.localeCompare(b.fldInspName)).map((i: any) => ({ value: i.fldInspID, label: i.fldInspName }))} 
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Associated Facilities</label>
          <div className="max-h-32 overflow-y-auto border border-zinc-200 rounded-lg p-2 space-y-1">
            {facilities.filter(f => f.fldClient === (editingProject?.fldClient || selections.clientId)).map(f => (
              <label key={f.fldFacID} className="flex items-center gap-2 p-1.5 hover:bg-zinc-50 rounded cursor-pointer">
                <input 
                  type="checkbox" 
                  name="facilities" 
                  value={f.fldFacID} 
                  defaultChecked={(Array.isArray(editingProject?.fldFacilities) && editingProject.fldFacilities.includes(f.fldFacID)) || f.fldFacID === selections.facilityId}
                  className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500" 
                />
                <span className="text-xs font-medium text-zinc-700">{f.fldFacName}</span>
              </label>
            ))}
          </div>
        </div>

        <Input label="Project Description" name="projDescription" defaultValue={editingProject?.fldProjDescription || ''} />
      </div>
    </Modal>
  );
};

interface InspectorModalProps {
  isOpen: boolean;
  editingInspector: Inspector | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const InspectorModal = ({ isOpen, editingInspector, onClose, onSubmit }: InspectorModalProps) => {
  if (!isOpen) return null;
  return (
    <Modal 
      key="inspector-modal"
      title={editingInspector ? "Edit Inspector" : "Add New Inspector"} 
      onClose={onClose}
      onSubmit={onSubmit}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit">{editingInspector ? "Save Changes" : "Save Inspector"}</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input label="Inspector Name" name="name" defaultValue={editingInspector?.fldInspName || ''} required />
        <Input label="Title" name="title" defaultValue={editingInspector?.fldTitle || ''} placeholder="e.g. Senior Inspector" />
        <Input label="Credentials" name="credentials" defaultValue={editingInspector?.fldCredentials || ''} placeholder="e.g. CASp, AIA" />
      </div>
    </Modal>
  );
};

interface DeleteConfirmationModalProps {
  deleteConfirmation: {
    title: string;
    message: string;
  } | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmationModal = ({ deleteConfirmation, onClose, onConfirm }: DeleteConfirmationModalProps) => {
  if (!deleteConfirmation) return null;
  return (
    <Modal
      key="delete-confirmation-modal"
      title={deleteConfirmation.title}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button 
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={onConfirm}
          >
            Delete
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700">
          <AlertCircle size={24} className="shrink-0" />
          <div>
            <p className="text-sm font-bold">This action cannot be undone.</p>
            <p className="text-xs mt-1 opacity-80">{deleteConfirmation.message}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
