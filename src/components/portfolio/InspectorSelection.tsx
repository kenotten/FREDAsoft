import React, { useMemo } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { EntityManagementProps, SelectionProps } from '../layout/LayoutOrchestrator';
import {
  currentWorkflowResponsibleProfessionalLabel,
  resolveCurrentWorkflowResponsibleProfessional,
} from '../../lib/responsibleProfessional';

interface InspectorSelectionProps {
  selectionProps: SelectionProps;
  entityProps: EntityManagementProps;
}

export function InspectorSelection({ selectionProps, entityProps }: InspectorSelectionProps) {
  const { selections } = selectionProps;
  const {
    inspectors,
    projects,
    setIsAddingInspector,
    setEditingInspector,
    handleEditInspector,
    initiateDelete,
  } = entityProps;

  const selectedProject = useMemo(
    () => projects.find((p) => p.fldProjID === selections.projectId) || null,
    [projects, selections.projectId]
  );

  const responsible = resolveCurrentWorkflowResponsibleProfessional(selectedProject, inspectors);
  const responsibleLabel = currentWorkflowResponsibleProfessionalLabel(selectedProject);

  const directoryInspectors = useMemo(
    () => [...inspectors].sort((a, b) => a.fldInspName.localeCompare(b.fldInspName)),
    [inspectors]
  );

  return (
    <div className="space-y-4 pt-4 border-t border-zinc-100">
      {selectedProject && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            {responsibleLabel}
          </p>
          {responsible ? (
            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                {responsible.fldInspName?.charAt(0) || 'I'}
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900">{responsible.fldInspName}</p>
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                  {responsible.fldTitle || 'Assigned on this project'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              Not assigned. Set this on New/Edit Project. Downstream screens hydrate from the Project assignment.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
          Inspector directory
        </label>
        <button
          type="button"
          onClick={() => {
            setEditingInspector(null);
            setIsAddingInspector(true);
          }}
          className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
        >
          <Plus size={12} /> Add Inspector
        </button>
      </div>
      <p className="text-[11px] text-zinc-500">
        Add, edit, or delete directory records. This is not a project assignment.
      </p>
      <div className="max-h-40 overflow-y-auto border border-zinc-200 rounded-lg divide-y divide-zinc-100">
        {directoryInspectors.length === 0 ? (
          <p className="p-3 text-sm text-zinc-500">No inspectors in the directory.</p>
        ) : (
          directoryInspectors.map((inspector) => (
            <div key={inspector.fldInspID} className="flex items-center gap-2 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800 truncate">{inspector.fldInspName}</p>
                {inspector.fldTitle ? (
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{inspector.fldTitle}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => handleEditInspector(inspector)}
                className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit Inspector"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={() => initiateDelete('inspector', inspector.fldInspID)}
                className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete Inspector"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
