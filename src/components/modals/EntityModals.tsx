import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../ui/modal';
import { Button, Input, Select } from '../ui/core';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Client, Facility, Project, Inspector } from '../../types';
import { tenantFundedSelectValue } from '../../lib/projectMetadataFields';

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

  const [projType, setProjType] = useState<'Assessment' | 'TAS/RAS'>(
    editingProject?.fldProjType === 'Assessment' ? 'Assessment' : 'TAS/RAS'
  );

  useEffect(() => {
    if (!isOpen) return;
    setProjType(editingProject?.fldProjType === 'Assessment' ? 'Assessment' : 'TAS/RAS');
  }, [isOpen, editingProject?.fldProjID, editingProject?.fldProjType]);
  const isAssessment = projType === 'Assessment';
  const tdlr = editingProject?.tdlrRegistered;
  const clientName = clients.find(c => c.fldClientID === (editingProject?.fldClient || selections.clientId))?.fldClientName || "Unknown Client";

  const inspectorOptions = useMemo(
    () =>
      [...inspectors]
        .sort((a, b) => a.fldInspName.localeCompare(b.fldInspName))
        .map((i) => ({ value: i.fldInspID, label: i.fldInspName })),
    [inspectors]
  );

  if (!isOpen) return null;

  return (
    <Modal 
      key={isOpen ? `project-modal-${editingProject?.fldProjID || 'new'}` : 'project-modal-closed'}
      title={editingProject ? "Edit Project" : "New Project"} 
      subTitle={clientName}
      maxWidth="2xl"
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

        <div className="flex bg-zinc-100 p-1 rounded-lg mb-4">
          <button 
            type="button"
            onClick={() => setProjType('Assessment')}
            className={cn(
              "flex-1 py-1.5 text-xs font-bold rounded-md transition-all type-toggle",
              isAssessment ? "bg-white shadow-sm text-blue-600" : "text-zinc-500"
            )}
          >Assessment</button>
          <button 
            type="button"
            onClick={() => setProjType('TAS/RAS')}
            className={cn(
              "flex-1 py-1.5 text-xs font-bold rounded-md transition-all type-toggle",
              !isAssessment ? "bg-white shadow-sm text-blue-600" : "text-zinc-500"
            )}
          >TAS/RAS</button>
          <input type="hidden" name="projType" value={projType} />
        </div>

        <div className="space-y-1">
          <Input label="Project Name" name="name" defaultValue={editingProject?.fldProjName || ''} required />
          {!isAssessment && (
            <p className="text-[11px] text-zinc-500">TDLR/TABS registered Project Name — the sole Project Name for this TAS/RAS project.</p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">FREDA project identifiers</p>
          <Input label="OCG Project #" name="projNumber" placeholder="YY-MM-XXXXX" defaultValue={editingProject?.fldProjNumber || ''} required />
          <Input
            label="Architect / Design Professional Project #"
            name="externalRef"
            defaultValue={editingProject?.fldExternalRef || ''}
          />
        </div>

        <div className={isAssessment ? 'grid grid-cols-2 gap-4' : undefined}>
          {isAssessment ? (
            <Input label="Date" name="date" type="date" defaultValue={editingProject?.fldPDDate || ''} required />
          ) : (
            <input type="hidden" name="date" value={editingProject?.fldPDDate || ''} />
          )}
          {isAssessment && (
            <Select
              label="Assessment Inspector"
              name="inspector"
              placeholder="Not assigned"
              defaultValue={editingProject?.fldInspector || ''}
              options={inspectorOptions}
            />
          )}
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

        {isAssessment && (
          <Input
            label="Project Description / Scope of Work"
            name="projDescription"
            defaultValue={editingProject?.fldProjDescription || ''}
          />
        )}

        {!isAssessment && (
          <>
            <div className="space-y-2">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">FREDA RAS Assignments</p>
              <p className="text-[11px] text-zinc-500">Authoritative Project assignments. Same person may be selected in both fields; neither is copied automatically. Other screens should hydrate from these fields rather than ask again.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Plan Review RAS"
                  name="planReviewRas"
                  placeholder="Not assigned"
                  defaultValue={editingProject?.fldPlanReviewRas || ''}
                  options={inspectorOptions}
                />
                <Select
                  label="Inspection RAS"
                  name="inspectionRas"
                  placeholder="Not assigned"
                  defaultValue={editingProject?.fldInspectionRas || ''}
                  options={inspectorOptions}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Plan Review Date"
                  name="planReviewDate"
                  type="date"
                  defaultValue={editingProject?.fldPlanReviewDate || ''}
                />
                <Input
                  label="Inspection Date"
                  name="inspectionDate"
                  type="date"
                  defaultValue={editingProject?.fldInspectionDate || ''}
                />
              </div>
              <p className="text-[11px] text-zinc-500">Inspection Date is also the Inspection Report Date. Plan Review uses one review/report date.</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-4">
              <div>
                <p className="text-xs font-bold text-amber-800 uppercase tracking-widest">TDLR / TABS Registered Data</p>
                <p className="text-[11px] text-amber-900/80 mt-1">As recorded with TDLR. Official registered-project facts — not FREDA Client, Facility, or Assessment description. Project Name is the field above, not a second registered name.</p>
              </div>
              <input type="hidden" name="tdlrSource" value={tdlr?.source || 'manual'} />

              <Input label="TABS Project Number" name="tdlrTabsProjectNumber" defaultValue={tdlr?.tabsProjectNumber || ''} />
              <Input label="Scope of Work" name="tdlrScopeOfWork" defaultValue={tdlr?.scopeOfWork || ''} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Tenant Funded"
                  name="tdlrTenantFunded"
                  placeholder="Not selected"
                  defaultValue={tenantFundedSelectValue(tdlr?.tenantFunded)}
                  options={[
                    { value: 'true', label: 'Yes' },
                    { value: 'false', label: 'No' },
                  ]}
                />
                <Input label="Type of Work" name="tdlrTypeOfWork" defaultValue={tdlr?.typeOfWork || ''} />
              </div>

              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest pt-1">Registered site</p>
              <Input label="Facility / Building Name" name="tdlrSiteFacilityName" defaultValue={tdlr?.site?.facilityName || ''} />
              <Input label="Address" name="tdlrSiteAddress" defaultValue={tdlr?.site?.address || ''} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="City" name="tdlrSiteCity" defaultValue={tdlr?.site?.city || ''} />
                <Input label="State" name="tdlrSiteState" defaultValue={tdlr?.site?.state || ''} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="ZIP" name="tdlrSiteZip" defaultValue={tdlr?.site?.zip || ''} />
                <Input label="County (optional)" name="tdlrSiteCounty" defaultValue={tdlr?.site?.county || ''} />
              </div>

              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest pt-1">Registered Owner (report addressee)</p>
              <Input label="Owner Name" name="tdlrOwnerName" defaultValue={tdlr?.owner?.name || ''} />
              <Input label="Address" name="tdlrOwnerAddress" defaultValue={tdlr?.owner?.address || ''} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="City" name="tdlrOwnerCity" defaultValue={tdlr?.owner?.city || ''} />
                <Input label="State" name="tdlrOwnerState" defaultValue={tdlr?.owner?.state || ''} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="ZIP" name="tdlrOwnerZip" defaultValue={tdlr?.owner?.zip || ''} />
                <Input label="Owner Contact (optional)" name="tdlrOwnerContactName" defaultValue={tdlr?.owner?.contactName || ''} />
              </div>

              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest pt-1">Registered Design Firm</p>
              <Input label="Design Firm Name" name="tdlrDesignFirmName" defaultValue={tdlr?.designFirm?.name || ''} />
              <Input label="Design Professional Name (optional)" name="tdlrDesignProfessionalName" defaultValue={tdlr?.designFirm?.designProfessionalName || ''} />
            </div>
          </>
        )}
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
        <Input
          label="RAS Registration Number"
          name="rasNumber"
          placeholder="e.g. 149"
          defaultValue={editingInspector?.fldRasNumber || ''}
        />
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
