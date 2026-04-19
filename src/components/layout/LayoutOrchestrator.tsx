import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Edit3, 
  Search, 
  ShieldCheck, 
  ClipboardList, 
  Table, 
  FileText, 
  Settings, 
  LogOut, 
  X, 
  ChevronDown,
  ShieldAlert
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button, Select, Card } from '../ui/core';
import { MainContent } from './MainContent';
import { ReportPreview } from '../ReportPreview';
import { 
  ClientModal, 
  FacilityModal, 
  ProjectModal, 
  InspectorModal, 
  DeleteConfirmationModal 
} from '../modals/EntityModals';
import FREDAsoftLogo from '../../Assets/FREDAsoftLogo.png';
import { 
  Client, 
  Facility, 
  Project, 
  Inspector, 
  Category, 
  Item, 
  Finding, 
  UnitType, 
  Recommendation, 
  MasterRecommendation, 
  Glossary, 
  ProjectData, 
  MasterStandard, 
  AppDocument,
  Location 
} from '../../types';

export interface SelectionProps {
  selections: any;
  setSelections: React.Dispatch<React.SetStateAction<any>>;
  isTrayOpen: boolean;
  setIsTrayOpen: (open: boolean) => void;
  traySelections: any;
  setTraySelections: (selections: any) => void;
  handleApplyTraySelections: () => void;
}

export interface MasterDataProps {
  categories: Category[];
  items: Item[];
  findings: Finding[];
  unitTypes: UnitType[];
  recommendations: MasterRecommendation[];
  masterRecommendations: MasterRecommendation[];
  activeGlossary: Glossary[];
  glossary: Glossary[];
  standards: MasterStandard[];
  allLocations: Location[];
  locations: Location[];
  mergedCategories: Category[];
  mergedItems: Item[];
  mergedFindings: Finding[];
  mergedRecommendations: MasterRecommendation[];
  mergedGlossary: Glossary[];
  setRawFindings: (data: Finding[]) => void;
  setRawMasterRecommendations: (data: MasterRecommendation[]) => void;
  setGlossary: (data: Glossary[]) => void;
  setStandards: (data: MasterStandard[]) => void;
  setRawRecommendations: (data: Recommendation[]) => void;
  importMasterGlossary: (csvData?: string) => Promise<void> | void;
  onEditGlossaryItem: (item: any) => void;
}

export interface EntityManagementProps {
  clients: Client[];
  facilities: Facility[];
  projects: Project[];
  inspectors: Inspector[];
  rawInspectors: Inspector[];
  isAddingClient: boolean;
  setIsAddingClient: (adding: boolean) => void;
  isAddingFacility: boolean;
  setIsAddingFacility: (adding: boolean) => void;
  isAddingProject: boolean;
  setIsAddingProject: (adding: boolean) => void;
  isAddingInspector: boolean;
  setIsAddingInspector: (adding: boolean) => void;
  editingClient: Client | null;
  setEditingClient: (client: Client | null) => void;
  editingFacility: Facility | null;
  setEditingFacility: (facility: Facility | null) => void;
  editingProject: Project | null;
  setEditingProject: (project: Project | null) => void;
  editingInspector: Inspector | null;
  setEditingInspector: (inspector: Inspector | null) => void;
  handleSubmitClient: (e: React.FormEvent<HTMLFormElement>) => void;
  handleSubmitFacility: (e: React.FormEvent<HTMLFormElement>) => void;
  handleSubmitProject: (e: React.FormEvent<HTMLFormElement>) => void;
  handleSubmitInspector: (e: React.FormEvent<HTMLFormElement>) => void;
  handleEditClient: (client: Client) => void;
  handleEditFacility: (facility: Facility) => void;
  handleEditProject: (project: Project) => void;
  handleEditInspector: (inspector: Inspector) => void;
  initiateDelete: (type: any, id: string) => void;
  deleteConfirmation: any;
  setDeleteConfirmation: (conf: any) => void;
  onRestoreClient: (id: string) => void;
  onRestoreFacility: (id: string) => void;
  onRestoreProject: (id: string) => void;
  onCleanupOrphans: () => Promise<void>;
  deletedRecords: any;
}

export interface ProjectContextProps {
  projectData: ProjectData[];
  rawProjectData: ProjectData[];
  selectedProject: Project | null;
  selectedFacility: Facility | null;
  selectedClient: Client | null;
  selectedInspector: Inspector | null;
  currentRecord: ProjectData | null;
  documents: AppDocument[];
  handleSaveRecord: (data: any) => Promise<void> | void;
  handleDeleteRecord: (id: string) => Promise<void> | void;
  handleSetActiveProject: () => void;
  onResetForm: () => void;
  pendingChanges: any;
}

export interface OperationalProps {
  isDeduplicating: boolean;
  dedupStatus: any;
  setIsDeduplicating: (deduplicating: boolean) => void;
  setDedupStatus: (status: any) => void;
  isSynced: boolean;
  setIsSynced: (synced: boolean) => void;
  isUpdatingRef: React.MutableRefObject<boolean>;
  sessionReads: number;
  sessionWrites: number;
  collectionCounts: any;
  runStandardsMigration: () => void;
  migrateUomToUnit: () => void;
  setUserPreferences: (prefs: any) => void;
  setActiveGlossaryId: (id: string | null) => void;
}

interface LayoutOrchestratorProps {
  // Shell Props
  isAdmin: boolean;
  handleLogout: () => void;
  tabNames: Record<string, string>;
  activeTab: string;
  handleTabSwitch: (newTab: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  showReportPreview: boolean;
  setShowReportPreview: (show: boolean) => void;

  // Grouped Props
  selectionProps: SelectionProps;
  masterDataProps: MasterDataProps;
  entityProps: EntityManagementProps;
  projectProps: ProjectContextProps;
  opsProps: OperationalProps;
}

export function LayoutOrchestrator(props: LayoutOrchestratorProps) {
  const {
    isAdmin,
    handleLogout,
    tabNames,
    activeTab,
    handleTabSwitch,
    isSidebarOpen,
    setIsSidebarOpen,
    showReportPreview,
    setShowReportPreview,
    selectionProps,
    masterDataProps,
    entityProps,
    projectProps,
    opsProps
  } = props;

  // Destructure for Shell Header/Sidebar needs
  const { selections, isTrayOpen, setIsTrayOpen, traySelections, setTraySelections, handleApplyTraySelections } = selectionProps;
  const { projects, clients, facilities, rawInspectors, isAddingClient, editingClient, setIsAddingClient, setEditingClient, handleSubmitClient, isAddingFacility, editingFacility, setIsAddingFacility, setEditingFacility, handleSubmitFacility, isAddingProject, editingProject, setIsAddingProject, setEditingProject, handleSubmitProject, isAddingInspector, editingInspector, setIsAddingInspector, setEditingInspector, handleSubmitInspector, deleteConfirmation, setDeleteConfirmation } = entityProps; 
  const { selectedProject, selectedClient, selectedFacility, selectedInspector, rawProjectData } = projectProps;
  const { standards, glossary, categories, items, locations, activeGlossary, recommendations, findings } = masterDataProps;
  const { isDeduplicating, dedupStatus, setIsDeduplicating, setDedupStatus } = opsProps;

  return (
    <>
      {isAdmin && (
        <div className="bg-amber-50 border-b border-amber-200 p-2 flex justify-center gap-4">
          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest flex items-center">
            <ShieldCheck size={12} className="mr-1" /> Administrator Mode Active
          </p>
        </div>
      )}
      <div className="h-screen flex bg-zinc-50 overflow-hidden">
        <AnimatePresence>
          {isTrayOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsTrayOpen(false)} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]" />
              <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }} className="fixed top-0 left-0 right-0 bg-white border-b border-zinc-200 shadow-xl z-[70] p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold uppercase tracking-widest">Context Selection</h3>
                    <button onClick={() => setIsTrayOpen(false)}><X size={20} /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Client</label>
                      <Select value={traySelections.clientId} onChange={(e) => setTraySelections({ ...traySelections, clientId: e.target.value, facilityId: '', projectId: '' })}
                        options={(clients.map((c, idx) => ({ value: c.fldClientID, label: c.fldClientName, key: `tray-c-${c.fldClientID || idx}` }))) || []} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Facility</label>
                      <Select value={traySelections.facilityId} onChange={(e) => setTraySelections({ ...traySelections, facilityId: e.target.value, projectId: '' })}
                        options={(facilities.filter(f => f.fldClient === traySelections.clientId).map((f, idx) => ({ value: f.fldFacID, label: f.fldFacName, key: `tray-f-${f.fldFacID || idx}` }))) || []} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Project</label>
                      <Select value={traySelections.projectId} onChange={(e) => setTraySelections({ ...traySelections, projectId: e.target.value })}
                        options={(projects.filter(p => p.fldClient === traySelections.clientId || p.fldFacID === traySelections.facilityId).map((p, idx) => ({ value: p.fldProjID, label: p.fldProjName, key: `tray-p-${p.fldProjID || idx}` }))) || []} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setIsTrayOpen(false)}>Cancel</Button><Button onClick={handleApplyTraySelections}>Apply</Button></div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col">
          <div className="p-6 border-b border-zinc-100"><img src={FREDAsoftLogo} alt="Logo" className="h-8 w-auto" /></div>
          <nav className="flex-1 p-4 space-y-1">
            <NavItem active={activeTab === 'setup'} onClick={() => handleTabSwitch('setup')} icon={<Settings size={18} />} label="Setup" />
            <NavItem active={activeTab === 'dashboard'} onClick={() => handleTabSwitch('dashboard')} icon={<LayoutDashboard size={18} />} label="Dashboard" />
            <NavItem active={activeTab === 'maintenance'} onClick={() => handleTabSwitch('maintenance')} icon={<Edit3 size={18} />} label="Glossary Builder" />
            <NavItem active={activeTab === 'glossary_explorer'} onClick={() => handleTabSwitch('glossary_explorer')} icon={<Search size={18} />} label="Glossary Explorer" />
            <NavItem active={activeTab === 'standards_manager'} onClick={() => handleTabSwitch('standards_manager')} icon={<ShieldCheck size={18} />} label="Standards Manager" />
            <NavItem active={activeTab === 'data'} onClick={() => handleTabSwitch('data')} icon={<ClipboardList size={18} />} label="Project Data Entry" />
            <NavItem active={activeTab === 'explorer'} onClick={() => handleTabSwitch('explorer')} icon={<Table size={18} />} label="Data Explorer" />
            <NavItem active={activeTab === 'documents'} onClick={() => handleTabSwitch('documents')} icon={<FileText size={18} />} label="Documents" />
            <NavItem active={activeTab === 'settings'} onClick={() => handleTabSwitch('settings')} icon={<Settings size={18} />} label="Settings & Billing" />
          </nav>
          <div className="p-4 border-t border-zinc-100"><Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-red-500"><LogOut size={16} className="mr-2" />Sign Out</Button></div>
        </aside>

        <main className="flex-1 h-screen overflow-hidden flex flex-col relative">
          <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsTrayOpen(true)}>
                <span className="text-zinc-900 font-bold">{projects.find(p => p.fldProjID === selections.projectId)?.fldProjName || "Select Project"}</span>
                <ChevronDown size={14} className="text-zinc-400" />
              </div>
              <span className="ml-4 text-[10px] font-mono text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full uppercase tracking-widest">v86.0 | STRUCTURAL_REPAIR</span>
            </div>
            <div className="flex items-center gap-4">
              {selectedProject && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setShowReportPreview(true)}
                  className="bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100"
                >
                  <FileText size={14} className="mr-2" /> View Report
                </Button>
              )}
              <div className="flex items-center gap-2 px-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-full text-[11px] font-mono text-zinc-500">
                 fredasoft.app / <span className="font-bold">{tabNames[activeTab] || activeTab}</span>
              </div>
            </div>
          </header>
          
          <MainContent 
            activeTab={activeTab}
            isAdmin={isAdmin}
            setActiveTab={handleTabSwitch}
            selectionProps={selectionProps}
            masterDataProps={masterDataProps}
            entityProps={entityProps}
            projectProps={projectProps}
            opsProps={opsProps}
          />
        </main>
      </div>

      {showReportPreview && selectedProject && selectedClient && selectedFacility && selectedInspector && (
        <ReportPreview 
          project={selectedProject}
          client={selectedClient}
          facility={selectedFacility}
          inspector={selectedInspector}
          projectData={rawProjectData}
          standards={standards}
          glossary={glossary}
          categories={categories}
          items={items}
          locations={locations}
          recommendations={recommendations as any}
          onClose={() => setShowReportPreview(false)}
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      )}

      {deleteConfirmation && (
        <DeleteConfirmationModal 
          deleteConfirmation={deleteConfirmation} 
          onClose={() => setDeleteConfirmation(null)} 
          onConfirm={deleteConfirmation.onConfirm}
        />
      )}

      <ClientModal 
        isOpen={isAddingClient} 
        editingClient={editingClient} 
        onClose={() => { setIsAddingClient(false); setEditingClient(null); }} 
        onSubmit={handleSubmitClient} 
      />
      <FacilityModal 
        isOpen={isAddingFacility} 
        editingFacility={editingFacility} 
        clients={clients} 
        selections={selections} 
        onClose={() => { setIsAddingFacility(false); setEditingFacility(null); }} 
        onSubmit={handleSubmitFacility} 
      />
      <ProjectModal 
        isOpen={isAddingProject} 
        editingProject={editingProject} 
        clients={clients} 
        facilities={facilities} 
        inspectors={rawInspectors} 
        selections={selections} 
        onClose={() => { setIsAddingProject(false); setEditingProject(null); }} 
        onSubmit={handleSubmitProject} 
        allowClientChange={true}
      />
      <InspectorModal
        isOpen={isAddingInspector}
        editingInspector={editingInspector}
        onClose={() => { setIsAddingInspector(false); setEditingInspector(null); }}
        onSubmit={handleSubmitInspector}
      />
    </>
  );
}

function NavItem({ active, onClick, icon, label }: any) {
  return (
    <button key={label} onClick={onClick} className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all', active ? 'bg-zinc-100 text-black' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50')}>
      {icon} {label}
    </button>
  );
}
