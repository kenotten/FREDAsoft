import React from 'react';
import { PortfolioView } from '../portfolio/PortfolioView';
import { DashboardView } from '../dashboard/DashboardView';
import ProjectDataEntry from '../ProjectDataEntry';
import { DataExplorer } from '../DataExplorer';
import { GlossaryView } from '../GlossaryView';
import GlossaryExplorer from '../GlossaryExplorer';
import { StandardsManager } from '../StandardsManager';
import { SettingsPage } from '../SettingsPage';
import { OrderManager } from '../OrderManager';
import { LibraryManager } from '../LibraryManager';
import { LibraryReports } from '../LibraryReports';
import { WebReportViewer } from '../webReport/WebReportViewer';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { releaseInactiveTabPanelFocus } from '../../lib/releaseInactiveTabPanelFocus';
import { FREDASOFT_DRAFT_LOCAL_STORAGE_KEY } from '../../lib/storageKeys';
import { buildProjectDataCloneSeed, type ProjectDataCloneSeed } from '../../lib/cloneProjectData';
import { 
  SelectionProps, 
  MasterDataProps, 
  EntityManagementProps, 
  ProjectContextProps, 
  OperationalProps 
} from './LayoutOrchestrator';

const DocumentManager = React.lazy(() =>
  import('../DocumentManager').then((m) => ({ default: m.DocumentManager }))
);

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
  type PendingExplorerNav = { kind: 'edit' | 'clone'; record: any } | null;
  const [pendingExplorerNav, setPendingExplorerNav] = React.useState<PendingExplorerNav>(null);
  const [pendingCloneSeed, setPendingCloneSeed] = React.useState<ProjectDataCloneSeed | null>(null);
  // Destructure for internal route compatibility
  const { selections, setSelections } = selectionProps;
  const currentEditingRecordId = selections?.editingRecordId || '';
  const { clients, facilities, projects, inspectors, rawInspectors, isAddingClient, setIsAddingClient, isAddingFacility, setIsAddingFacility, isAddingProject, setIsAddingProject, isAddingInspector, setIsAddingInspector, initiateDelete, handleEditClient, handleEditFacility, handleEditProject, handleEditInspector, deletedRecords, onRestoreClient, onRestoreFacility, onRestoreProject, onCleanupOrphans } = entityProps;
  const { projectData, selectedProject, selectedFacility, selectedInspector, documents, handleSaveRecord, handleDeleteRecord, handleSetActiveProject, onResetForm, pendingChanges } = projectProps;
  const { categories, items, findings, masterRecommendations, recommendations, standards, glossary, allLocations, unitTypes, mergedCategories, mergedItems, mergedFindings, mergedRecommendations, mergedGlossary, setRawFindings, setRawRecommendations, setRawMasterRecommendations, setGlossary, setStandards, importMasterGlossary, onEditGlossaryItem, onActivateGlossaryBuilderRecord, locations } = masterDataProps;
  const { isDeduplicating, dedupStatus, setIsSynced, setActiveGlossaryId, setUserPreferences, isUpdatingRef, runStandardsMigration, migrateUomToUnit, sessionReads, sessionWrites, collectionCounts, setIsDeduplicating, setDedupStatus } = opsProps;

  React.useEffect(() => {
    if (activeTab !== 'explorer' && pendingExplorerNav) {
      setPendingExplorerNav(null);
    }
  }, [activeTab, pendingExplorerNav]);

  React.useEffect(() => {
    releaseInactiveTabPanelFocus(activeTab);
  }, [activeTab]);

  const clearPendingCloneSeed = React.useCallback(() => {
    setPendingCloneSeed(null);
  }, []);

  const applyExplorerClone = React.useCallback(
    (record: any) => {
      const seed = buildProjectDataCloneSeed(record, glossary);
      setPendingCloneSeed(seed);
      try {
        localStorage.removeItem(FREDASOFT_DRAFT_LOCAL_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      onDataEntryDirtyChange?.(false);
      setSelections((s: any) => ({
        ...s,
        editingRecordId: null,
        isDirty: false,
        locationId: '',
        locationName: '',
        images: [],
      }));
      setActiveTab('data');
    },
    [glossary, onDataEntryDirtyChange, setActiveTab, setSelections]
  );

  return (
    <div
      className={cn(
        'flex-1 overflow-y-auto scroll-smooth flex flex-col',
        activeTab === 'library_manager' || activeTab === 'sequence_manager' ? 'p-0' : 'p-8'
      )}
    >
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
          onDeleteRecord={handleDeleteRecord}
          pendingCloneSeed={pendingCloneSeed}
          onPendingCloneSeedConsumed={clearPendingCloneSeed}
        />
      )}
      <div
        className={cn(
          activeTab === 'explorer'
            ? 'flex min-h-0 w-full flex-1 flex-col'
            : 'hidden'
        )}
        data-tab-panel="explorer"
      >
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
          standards={standards}
          selections={selections}
          onEditRecord={(record) => {
            const targetId = record?.fldPDataID || '';
            if (targetId && currentEditingRecordId && targetId === currentEditingRecordId) {
              setSelections((s: any) => ({ ...s, editingRecordId: targetId }));
              setActiveTab('data');
              return;
            }
            if (isDataEntryDirty) {
              setPendingExplorerNav({ kind: 'edit', record });
              return;
            }
            setSelections((s: any) => ({ ...s, editingRecordId: targetId }));
            setActiveTab('data');
          }}
          onCloneRecord={(record) => {
            if (!record?.fldPDataID) return;
            if (isDataEntryDirty) {
              setPendingExplorerNav({ kind: 'clone', record });
              return;
            }
            applyExplorerClone(record);
          }}
          onDeleteRecord={handleDeleteRecord}
        />
      </div>
      {activeTab === 'web_report' && (
        <WebReportViewer
          clients={clients}
          facilities={facilities}
          projects={projects}
          inspectors={inspectors}
          rawProjectData={projectProps.rawProjectData}
          subscribedProjectId={selections.projectId || ''}
          glossary={glossary}
          categories={categories}
          items={items}
          locations={locations}
          findings={findings}
          standards={standards}
          defaultProjectId={selections.projectId || ''}
          defaultFacilityId={selections.facilityId || ''}
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
          setIsSynced={setIsSynced}
          setActiveTab={setActiveTab}
          setActiveGlossaryId={setActiveGlossaryId}
          updatePreferences={setUserPreferences}
          isUpdatingRef={isUpdatingRef}
          clients={clients}
          facilities={facilities}
          projects={projects}
          onActivateGlossaryBuilderRecord={onActivateGlossaryBuilderRecord}
        />
      )}
      <div
        className={cn(
          activeTab === 'glossary_explorer'
            ? 'flex min-h-0 w-full flex-1 flex-col'
            : 'hidden'
        )}
        data-tab-panel="glossary_explorer"
      >
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
      </div>
      <div
        className={cn(
          activeTab === 'standards_manager'
            ? 'flex min-h-0 w-full flex-1 flex-col'
            : 'hidden'
        )}
        data-tab-panel="standards_manager"
      >
        <StandardsManager 
          standards={standards}
        />
      </div>
      <div
        className={cn(
          activeTab === 'sequence_manager'
            ? 'flex min-h-0 w-full flex-1 flex-col'
            : 'hidden'
        )}
        data-tab-panel="sequence_manager"
      >
        <OrderManager
          categories={categories}
          items={items}
          findings={findings}
        />
      </div>
      <div
        className={cn(
          activeTab === 'library_manager'
            ? 'flex min-h-0 w-full flex-1 flex-col'
            : 'hidden'
        )}
        data-tab-panel="library_manager"
      >
        <LibraryManager 
          ref={(props as any).libraryManagerRef}
          categories={categories}
          items={items}
          findings={findings}
          recommendations={recommendations as any}
          glossary={glossary}
          standards={standards}
          onDirtyChange={(props as any).onLibraryDirtyChange}
        />
      </div>
      <div
        className={cn(
          activeTab === 'library_reports' ? 'flex min-h-0 w-full flex-1 flex-col' : 'hidden'
        )}
        data-tab-panel="library_reports"
      >
        <LibraryReports
          standards={standards}
          findings={findings}
          recommendations={masterRecommendations}
          glossary={glossary}
          categories={categories}
          items={items}
        />
      </div>
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
        <React.Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center gap-2 p-12 text-zinc-500">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-sm font-medium">Loading documents…</span>
            </div>
          }
        >
          <DocumentManager documents={documents} isAdmin={isAdmin} />
        </React.Suspense>
      )}
      {activeTab === 'explorer' && pendingExplorerNav && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-100">
              <h2 className="text-lg font-bold text-zinc-900">Unsaved changes</h2>
              <p className="text-sm text-zinc-600 mt-2">
                {pendingExplorerNav.kind === 'clone'
                  ? 'You have unsaved changes in Data Entry. Cloning will discard them and open a new unsaved clone.'
                  : 'You have unsaved changes in the current record. Leaving will discard them.'}
              </p>
            </div>
            <div className="p-6 flex gap-3">
              <button
                type="button"
                onClick={() => setPendingExplorerNav(null)}
                className="flex-1 h-11 px-4 rounded-lg border border-zinc-200 text-zinc-700 font-medium hover:bg-zinc-50"
              >
                Continue Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  const nav = pendingExplorerNav;
                  if (!nav?.record) return;
                  localStorage.removeItem(FREDASOFT_DRAFT_LOCAL_STORAGE_KEY);
                  onDataEntryDirtyChange?.(false);
                  if (nav.kind === 'edit') {
                    setSelections((s: any) => ({ ...s, editingRecordId: nav.record.fldPDataID }));
                  } else {
                    applyExplorerClone(nav.record);
                  }
                  setPendingExplorerNav(null);
                  setActiveTab('data');
                }}
                className="flex-1 h-11 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium"
              >
                {pendingExplorerNav.kind === 'clone'
                  ? 'Discard Changes and Clone'
                  : 'Discard Changes and Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
