import React from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Button, Select } from '../ui/core';
import { EntityManagementProps, SelectionProps } from '../layout/LayoutOrchestrator';

interface ProjectContextFormProps {
  selectionProps: SelectionProps;
  entityProps: EntityManagementProps;
}

export function ProjectContextForm({ selectionProps, entityProps }: ProjectContextFormProps) {
  const { selections, setSelections } = selectionProps;
  const { 
    clients, 
    facilities, 
    projects, 
    setIsAddingClient, 
    setIsAddingFacility, 
    setIsAddingProject,
    setEditingClient,
    setEditingFacility,
    setEditingProject,
    handleEditClient,
    handleEditFacility,
    handleEditProject,
    initiateDelete
  } = entityProps;

  return (
    <div className="space-y-6 pt-4">
      {/* Client Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Active Client</label>
          <Button variant="ghost" size="sm" onClick={() => { setEditingClient(null); setIsAddingClient(true); }} className="h-6 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50">
            <Plus size={12} className="mr-1" /> New Client
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Select 
            value={selections.clientId}
            onChange={(e: any) => setSelections({ ...selections, clientId: e.target.value, facilityId: '', projectId: '' })}
            options={clients
              .filter(c => c && c.fldClientID)
              .map(c => ({ 
                value: c.fldClientID, 
                label: c.fldClientName,
                key: `setup-client-${c.fldClientID}` 
              }))}
            className="flex-1"
          />
          {selections.clientId && (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  const client = clients.find(c => c.fldClientID === selections.clientId);
                  if (client) handleEditClient(client);
                }}
                className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit Client"
              >
                <Pencil size={16} />
              </button>
              <button 
                onClick={() => initiateDelete('client', selections.clientId)}
                className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete Client"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Facility Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Active Facility</label>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setEditingFacility(null); setIsAddingFacility(true); }} 
            disabled={!selections.clientId}
            className="h-6 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            <Plus size={12} className="mr-1" /> New Facility
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Select 
            value={selections.facilityId}
            onChange={(e: any) => setSelections({ ...selections, facilityId: e.target.value, projectId: '' })}
            options={facilities
              .filter(f => f && f.fldFacID && f.fldClient === selections.clientId)
              .map(f => ({ 
                value: f.fldFacID, 
                label: f.fldFacName,
                key: `setup-fac-${f.fldFacID}` 
              }))}
            disabled={!selections.clientId}
            className="flex-1"
          />
          {selections.facilityId && (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  const facility = facilities.find(f => f.fldFacID === selections.facilityId);
                  if (facility) handleEditFacility(facility);
                }}
                className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit Facility"
              >
                <Pencil size={16} />
              </button>
              <button 
                onClick={() => initiateDelete('facility', selections.facilityId)}
                className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete Facility"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Project Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Active Project</label>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setEditingProject(null); setIsAddingProject(true); }} 
            disabled={!selections.clientId}
            className="h-6 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            <Plus size={12} className="mr-1" /> New Project
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Select 
            value={selections.projectId}
            onChange={(e: any) => setSelections({ ...selections, projectId: e.target.value })}
            options={projects
              .filter(p => p && p.fldProjID && p.fldClient === selections.clientId && (!selections.facilityId || (Array.isArray(p.fldFacilities) && p.fldFacilities.includes(selections.facilityId))))
              .map(p => ({ 
                value: p.fldProjID, 
                label: p.fldProjName,
                key: `setup-proj-${p.fldProjID}` 
              }))}
            disabled={!selections.clientId}
            className="flex-1"
          />
          {selections.projectId && (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  const project = projects.find(p => p.fldProjID === selections.projectId);
                  if (project) handleEditProject(project);
                }}
                className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit Project"
              >
                <Pencil size={16} />
              </button>
              <button 
                onClick={() => initiateDelete('project', selections.projectId)}
                className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete Project"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}