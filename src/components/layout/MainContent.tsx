import React from 'react';
import { PortfolioView } from '../portfolio/PortfolioView';
import { DashboardView } from '../dashboard/DashboardView';
import ProjectDataEntry from '../ProjectDataEntry';
import { DataExplorer } from '../DataExplorer';
import { GlossaryView } from '../GlossaryView';
import GlossaryExplorer from '../GlossaryExplorer';
import { StandardsManager } from '../StandardsManager';
import { SettingsPage } from '../SettingsPage';
import { DocumentManager } from '../DocumentManager';
import { OrderManager } from '../OrderManager';
import { LibraryManager } from '../LibraryManager';
import { cn } from '../../lib/utils';
import { 
  SelectionProps, 
  MasterDataProps, 
  EntityManagementProps, 
  ProjectContextProps, 
  OperationalProps 
} from './LayoutOrchestrator';

interface MainContentProps {
  activeTab: string;
  isAdmin: boolean;
  setActiveTab: (tab: string) => void;
  isDataEntryDirty?: boolean;
  onDataEntryDirtyChange?: (dirty: boolean) => void;
  selectionProps: SelectionProps;
  masterDataProps: MasterDataProps;
  entityProps: EntityManagementProps;
  projectProps: ProjectContextProps;
  opsProps: OperationalProps;
}

export const MainContent: React.FC<MainContentProps> = (props) => {
  const {
    activeTab,
    isAdmin,
    setActiveTab,
    isDataEntryDirty = false,
    onDataEntryDirtyChange,
    selectionProps,
    masterDataProps,
    entityProps,
    projectProps,
    opsProps
  } = props;
  const [pendingEditRecord, setPendingEditRecord] = React.useState<any>(null);
  // Destructure for internal route compatibility
  const { selections, setSelections } = selectionProps;
  const currentEditingRecordId = selections?.editingRecordId || '';
  const { clients, facilities, projects, inspectors, rawInspectors, isAddingClient, setIsAddingClient, isAddingFacility, setIsAddingFacility, isAddingProject, setIsAddingProject, isAddingInspector, setIsAddingInspector, initiateDelete, handleEditClient, handleEditFacility, handleEditProject, handleEditInspector, deletedRecords, onRestoreClient, onRestoreFacility, onRestoreProject, onCleanupOrphans } = entityProps;
  const { projectData, selectedProject, selectedFacility, selectedInspector, documents, handleSaveRecord, handleDeleteRecord, handleSetActiveProject, onResetForm, pendingChanges } = projectProps;
  const { categories, items, findings, masterRecommendations, recommendations, standards, glossary, allLocations, unitTypes, mergedCategories, mergedItems, mergedFindings, mergedRecommendations, mergedGlossary, setRawFindings, setRawRecommendations, setRawMasterRecommendations, setGlossary, setStandards, importMasterGlossary, onEditGlossaryItem, locations } = masterDataProps;
  const { isDeduplicating, dedupStatus, setIsSynced, setActiveGlossaryId, setUserPreferences, isUpdatingRef, runStandardsMigration, migrateUomToUnit, sessionReads, sessionWrites, collectionCounts, setIsDeduplicating, setDedupStatus } = opsProps;

  React.useEffect(() => {
    if (activeTab !== 'explorer' && pendingEditRecord) {
      setPendingEditRecord(null);
    }
  }, [activeTab, pendingEditRecord]);

  return (
    <div className={cn("flex-1 overflow-y-auto scroll-smooth flex flex-col", activeTab === 'library_manager' ? "p-0" : "p-8")}>
      {activeTab === 'setup' && (
        <PortfolioView 
          selectionProps={selectionProps}
          entityProps={entityProps}
          projectProps={projectProps}
        />
      )}
      {activeTab === 'dashboard' && (
        <DashboardView 
          isAdmin={isAdmin}
          setActiveTab={setActiveTab}
          entityProps={entityProps}
          masterDataProps={masterDataProps}
          projectProps={projectProps}
        />
      )}
      {activeTab === 'data' && (
        <ProjectDataEntry 
          projectData={projectData}
          project={selectedProject} 
          facility={selectedFacility} 
          inspector={selectedInspector}
          glossary={glossary}
          items={items} 
          findings={findings} 
          recommendations={recommendations} 
          masterRecommendations={masterRecommendations}
          onSave={handleSaveRecord} 
          onReset={onResetForm} 
          selections={selections} 
          onSelectionChange={setSelections} 
          categories={categories} 
          standards={standards} 
          locations={allLocations} 
          unitTypes={unitTypes} 
          mergedCategories={mergedCategories} 
          onDirtyChange={(dirty: boolean) => onDataEntryDirtyChange?.(dirty)}
        />
      )}
      {activeTab === 'explorer' && (
        <DataExplorer 
          projectData={projectData} 
          projects={projects} 
          facilities={facilities} 
          clients={clients} 
          categories={categories}
          items={items}
          findings={findings}
          recommendations={recommendations}
          masterRecommendations={masterRecommendations}
          locations={locations}
          glossary={glossary}
          selections={selections}
          onEditRecord={(record) => {
            const targetId = record?.fldPDataID || '';
            if (targetId && currentEditingRecordId && targetId === currentEditingRecordId) {
              setSelections((s: any) => ({ ...s, editingRecordId: targetId }));
              setActiveTab('data');
              return;
            }
            if (isDataEntryDirty) {
              setPendingEditRecord(record);
              return;
            }
            setSelections((s: any) => ({ ...s, editingRecordId: targetId }));
            setActiveTab('data');
          }} 
          onDeleteRecord={handleDeleteRecord}
        />
      )}
      {activeTab === 'maintenance' && (
        <GlossaryView 
          categories={categories}
          items={items}
          findings={findings}
          setFindings={setRawFindings}
          recommendations={recommendations}
          setRecommendations={setRawRecommendations}
          masterRecommendations={masterRecommendations}
          glossary={glossary}
          setGlossary={setGlossary}
          unitTypes={unitTypes}
          standards={standards}
          selections={selections}
          onSelectionChange={setSelections}
          isDeduplicating={isDeduplicating}
          dedupStatus={dedupStatus}
          setIsSynced={setIsSynced}
          setActiveTab={setActiveTab}
          setActiveGlossaryId={setActiveGlossaryId}
          updatePreferences={setUserPreferences}
          importMasterGlossary={importMasterGlossary}
          isUpdatingRef={isUpdatingRef}
          clients={clients}
          facilities={facilities}
          projects={projects}
        />
      )}
      {activeTab === 'glossary_explorer' && (
        <GlossaryExplorer 
          clients={clients}
          facilities={facilities}
          projects={projects}
          categories={categories}
          items={items}
          findings={findings}
          recommendations={recommendations}
          masterRecommendations={masterRecommendations}
          glossary={glossary}
          unitTypes={unitTypes}
          projectData={projectData}
          mergedCategories={mergedCategories}
          mergedItems={mergedItems}
          mergedFindings={mergedFindings}
          mergedRecommendations={mergedRecommendations}
          mergedGlossary={mergedGlossary}
          importMasterGlossary={importMasterGlossary}
          migrateUomToUnit={migrateUomToUnit}
          isDeduplicating={isDeduplicating}
          setIsDeduplicating={setIsDeduplicating}
          dedupStatus={dedupStatus}
          setDedupStatus={setDedupStatus}
          onEditGlossaryItem={onEditGlossaryItem}
          setRawMasterRecommendations={setRawMasterRecommendations}
          setGlossary={setGlossary}
        />
      )}
      {activeTab === 'standards_manager' && (
        <StandardsManager 
          standards={standards}
        />
      )}
      {activeTab === 'sequence_manager' && (
        <OrderManager 
          categories={categories}
          items={items}
          findings={findings}
        />
      )}
      {activeTab === 'library_manager' && (
        <LibraryManager 
          ref={(props as any).libraryManagerRef}
          categories={categories}
          items={items}
          findings={findings}
          recommendations={recommendations as any}
          onDirtyChange={(props as any).onLibraryDirtyChange}
        />
      )}
      {activeTab === 'settings' && (
        <SettingsPage 
          sessionReads={sessionReads}
          sessionWrites={sessionWrites}
          findings={findings}
          recommendations={recommendations}
          glossary={glossary}
          onEditGlossaryItem={onEditGlossaryItem}
          isAdmin={isAdmin}
        />
      )}
      {activeTab === 'documents' && (
        <DocumentManager 
          documents={documents} 
          isAdmin={isAdmin} 
        />
      )}
      {activeTab === 'explorer' && pendingEditRecord && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-100">
              <h2 className="text-lg font-bold text-zinc-900">Unsaved changes</h2>
              <p className="text-sm text-zinc-600 mt-2">
                You have unsaved changes in the current record. Leaving will discard them.
              </p>
            </div>
            <div className="p-6 flex gap-3">
              <button
                onClick={() => setPendingEditRecord(null)}
                className="flex-1 h-11 px-4 rounded-lg border border-zinc-200 text-zinc-700 font-medium hover:bg-zinc-50"
              >
                Continue Editing
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('fredasoft_draft');
                  onDataEntryDirtyChange?.(false);
                  setSelections((s: any) => ({ ...s, editingRecordId: pendingEditRecord.fldPDataID }));
                  setPendingEditRecord(null);
                  setActiveTab('data');
                }}
                className="flex-1 h-11 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium"
              >
                Discard Changes and Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
