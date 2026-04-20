import React from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Select } from '../ui/core';
import { EntityManagementProps, SelectionProps } from '../layout/LayoutOrchestrator';

interface InspectorSelectionProps {
  selectionProps: SelectionProps;
  entityProps: EntityManagementProps;
}

export function InspectorSelection({ selectionProps, entityProps }: InspectorSelectionProps) {
  const { selections, setSelections } = selectionProps;
  const { 
    inspectors, 
    setIsAddingInspector, 
    setEditingInspector,
    handleEditInspector, 
    initiateDelete 
  } = entityProps;

  const selectedInspector = inspectors.find(i => i.fldInspID === selections.inspectorId);

  return (
    <div className="space-y-4 pt-4 border-t border-zinc-100">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Inspector</label>
        <button 
          onClick={() => { setEditingInspector(null); setIsAddingInspector(true); }}
          className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
        >
          <Plus size={12} /> Add Inspector
        </button>
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <Select 
            value={selections.inspectorId || ''} 
            onChange={(e) => setSelections({ ...selections, inspectorId: e.target.value })}
            options={[
              { value: '', label: 'Select Inspector...' },
              ...inspectors.map(i => ({ value: i.fldInspID, label: i.fldInspName }))
            ]}
          />
        </div>
        {selections.inspectorId && (
          <div className="flex gap-1">
            <button 
              onClick={() => {
                if (selectedInspector) handleEditInspector(selectedInspector);
              }}
              className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit Inspector"
            >
              <Pencil size={16} />
            </button>
            <button 
              onClick={() => initiateDelete('inspector', selections.inspectorId)}
              className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Inspector"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
      {selections.inspectorId && selectedInspector && (
        <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
            {selectedInspector.fldInspName?.charAt(0) || 'I'}
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-900">
              {selectedInspector.fldInspName}
            </p>
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
              {selectedInspector.fldTitle || 'Inspector'} 
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
