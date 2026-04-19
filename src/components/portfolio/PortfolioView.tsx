import React from 'react';
import { Settings, CheckCircle } from 'lucide-react';
import { Button } from '../ui/core';
import { ProjectContextForm } from './ProjectContextForm';
import { InspectorSelection } from './InspectorSelection';
import { BrandingSection } from './BrandingSection';
import { 
  EntityManagementProps, 
  ProjectContextProps, 
  SelectionProps 
} from '../layout/LayoutOrchestrator';

interface PortfolioViewProps {
  selectionProps: SelectionProps;
  entityProps: EntityManagementProps;
  projectProps: ProjectContextProps;
}

export function PortfolioView({ selectionProps, entityProps, projectProps }: PortfolioViewProps) {
  const { selections } = selectionProps;
  const { handleSetActiveProject } = projectProps;
  const { projects } = entityProps;

  const isActiveContextSet = selections.clientId && selections.facilityId && selections.projectId;

  return (
    <div className="max-w-2xl mx-auto w-full space-y-8">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-200 space-y-6">
        <div className="flex items-center gap-3 text-blue-600 mb-2">
          <Settings size={24} />
          <h2 className="text-xl font-bold text-zinc-900">Project Setup</h2>
        </div>
        <p className="text-sm text-zinc-500">
          Configure your active context. This project will be used for all data entry and exploration.
        </p>
        
        <div className="space-y-6 pt-4">
          <ProjectContextForm selectionProps={selectionProps} entityProps={entityProps} />
          
          <InspectorSelection selectionProps={selectionProps} entityProps={entityProps} />

          <div className="pt-4">
            <Button 
              variant="primary" 
              className="w-full py-6 text-sm font-bold uppercase tracking-widest shadow-lg shadow-blue-200"
              onClick={handleSetActiveProject}
              disabled={!isActiveContextSet}
            >
              <CheckCircle size={18} className="mr-2" />
              Set as Active Project
            </Button>
          </div>
        </div>

        <BrandingSection />

        {isActiveContextSet && (
          <div className="mt-8 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Active Context Set</p>
              <p className="text-sm text-emerald-600">
                You are now working in: <span className="font-bold">
                  {projects.find(p => p.fldProjID === selections.projectId)?.fldProjName}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
