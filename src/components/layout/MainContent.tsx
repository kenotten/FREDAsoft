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
    selectionProps,
    masterDataProps,
    entityProps,
    projectProps,
    opsProps
  } = props;
  // Destructure for internal route compatibility
  const { selections, setSelections } = selectionProps;
  const { clients, facilities, projects, inspectors, rawInspectors, isAddingClient, setIsAddingClient, isAddingFacility, setIsAddingFacility, isAddingProject, setIsAddingProject, isAddingInspector, setIsAddingInspector, initiateDelete, handleEditClient, handleEditFacility, handleEditProject, handleEditInspector, deletedRecords, onRestoreClient, onRestoreFacility, onRestoreProject, onCleanupOrphans } = entityProps;
  const { projectData, selectedProject, selectedFacility, selectedInspector, documents, handleSaveRecord, handleDeleteRecord, handleSetActiveProject, onResetForm, pendingChanges } = projectProps;
  const { categories, items, findings, masterRecommendations, recommendations, standards, glossary, allLocations, unitTypes, mergedCategories, mergedItems, mergedFindings, mergedRecommendations, mergedGlossary, setRawFindings, setRawRecommendations, setRawMasterRecommendations, setGlossary, setStandards, importMasterGlossary, onEditGlossaryItem, locations } = masterDataProps;
  const { isDeduplicating, dedupStatus, setIsSynced, setActiveGlossaryId, setUserPreferences, isUpdatingRef, runStandardsMigration, migrateUomToUnit, sessionReads, sessionWrites, collectionCounts, setIsDeduplicating, setDedupStatus } = opsProps;

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
          onEditRecord={(record) => { setSelections((s: any) => ({ ...s, editingRecordId: record.fldPDataID })); setActiveTab('data'); }} 
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
    </div>
  );
};
