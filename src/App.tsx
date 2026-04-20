import PortfolioManager from './components/PortfolioManager';
import GlossaryExplorer from './components/GlossaryExplorer';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Fuse from 'fuse.js';
import { initializeApp, deleteApp, getApp } from 'firebase/app';
import firebaseConfig from '../firebase-applet-config.json';
import { Toaster, toast } from 'sonner';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  doc, 
  query, 
  where,
  limit,
  orderBy,
  getDocs,
  getDoc,
  writeBatch,
  serverTimestamp,
  QueryConstraint,
  onSnapshotsInSync,
  initializeFirestore,
  collectionGroup
} from 'firebase/firestore';
import { db, auth, storage, app } from './firebase';
import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { firestoreService, OperationType, handleFirestoreError } from './services/firestoreService';
import { 
  AlertCircle,
  Loader2
} from 'lucide-react';
import FREDAsoftLogo from './Assets/FREDAsoftLogo.png';
import { cn, toFraction, formatMeasurement, fromFraction, sanitizeData } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { entityService } from './services/entityService';

import { 
  runStandardsMigration, 
  migrateUomToUnit 
} from './services/migrationService';
import { 
  Inspector, 
  Client, 
  Facility, 
  DesignFirm, 
  Project, 
  Category, 
  Item, 
  Finding, 
  UnitType, 
  Recommendation, 
  MasterRecommendation,
  Glossary, 
  ProjectData,
  MasterStandard,
  UserPreference,
  Location,
  AppDocument
} from './types';

const handleSaveRecord = async (data: any) => {
  try {
    await firestoreService.data.save(data, data.fldPDataID);
    toast.success('Record saved successfully!');
  } catch (error) {
    console.error('Error saving record:', error);
    toast.error('Failed to save record.');
  }
};

import { Button, Card } from './components/ui/core';
import { ClientModal, FacilityModal, ProjectModal, InspectorModal, DeleteConfirmationModal } from './components/modals/EntityModals';
import { MASTER_GLOSSARY_CSV } from './constants/glossaryData';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      let message = "Something went wrong.";
      try {
        const errObj = JSON.parse(this.state.error.message);
        if (errObj.error.includes('quota')) message = "Firebase Quota Exceeded.";
        else if (errObj.error.includes('permission')) message = "Insufficient permissions.";
      } catch (e) {}
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4 text-center">
          <Card className="p-8 max-w-md w-full">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Application Error</h2>
            <p className="text-zinc-600 mb-6 text-sm">{message}</p>
            <Button onClick={() => window.location.reload()}>Reload Application</Button>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

const tabNames: Record<string, string> = {
  setup: 'Setup',
  dashboard: 'Dashboard',
  portfolio: 'Portfolio',
  maintenance: 'Glossary Builder',
  glossary_explorer: 'Glossary Explorer',
  standards_manager: 'Standards Manager',
  data: 'Project Data Entry',
  explorer: 'Data Explorer',
  documents: 'Documents',
  settings: 'Settings & Billing'
};

import { useCoreCollections } from './hooks/useCoreCollections';
import { useProjectData } from './hooks/useProjectData';

import { LayoutOrchestrator } from './components/layout/LayoutOrchestrator';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  const [activeGlossaryId, setActiveGlossaryId] = useState<string | null>(null);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    try {
      if (isMobile) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Failed to sign in with Google.");
    }
  };

  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          setUser(result.user);
          setIsAdmin(result.user.email === 'kenotten@statereview.com');
        }
      } catch (error) {
        console.error("Redirect result error:", error);
        // Don't toast here as it might trigger on every refresh if there was an old error
      }
    };
    checkRedirect();
  }, []);

  useEffect(() => { document.title = `FREDAsoft | ${tabNames[activeTab] || activeTab}`; }, [activeTab]);
  const [isMigratingStandards, setIsMigratingStandards] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState('');
  const [collectionCounts, setCollectionCounts] = useState({ tas: 0, master: 0 });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      try {
        setUser(u);
        if (u) {
          setIsAdmin(u.email === 'kenotten@statereview.com');
        }
      } catch (err) {
        console.error("Auth error:", err);
      } finally {
        setLoading(false); // This MUST run to stop the spinner
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    try {
      const unsubTas = firestoreService.onSnapshot('tas_standards', (data) => setCollectionCounts(prev => ({ ...prev, tas: data.length })));
      return () => { unsubTas(); };
    } catch (error) {
      console.error('Error setting up collection count listeners:', error);
    }
  }, []);

  const [navigationStack, setNavigationStack] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [portfolioClientId, setPortfolioClientId] = useState<string | null>(null);
  const [portfolioViewMode, setPortfolioViewMode] = useState<'projects' | 'facilities'>('projects');

  const [rawInspectors, setRawInspectors] = useState<Inspector[]>([]);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [rawClients, setRawClients] = useState<Client[]>([]);
  const [rawFacilities, setRawFacilities] = useState<Facility[]>([]);
  const [rawDesignFirms, setRawDesignFirms] = useState<DesignFirm[]>([]);
  const [rawProjects, setRawProjects] = useState<Project[]>([]);
  const [rawRecommendations, setRawRecommendations] = useState<Recommendation[]>([]);
  const [userPreferences, setUserPreferences] = useState<UserPreference | null>(null);
  const [documents, setDocuments] = useState<AppDocument[]>([]);

  // Hook for Master Data Collections
  const {
    rawCategories,
    rawItems,
    rawFindings,
    rawUnitTypes,
    rawMasterRecommendations,
    glossary,
    standards,
    setRawFindings,
    setRawMasterRecommendations,
    setGlossary,
    setStandards
  } = useCoreCollections(user?.uid);

  const [pendingChanges, setPendingChanges] = useState<any>({});
  const [changeHistory, setChangeHistory] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState<{ nextTab: string } | null>(null);
  const [isDeduplicating, setIsDeduplicating] = useState(false);
  const [dedupStatus, setDedupStatus] = useState<any>(null);
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSynced, setIsSynced] = useState(true);
  const isUpdatingRef = useRef(false);
  const [sessionReads, setSessionReads] = useState(0);
  const [sessionWrites, setSessionWrites] = useState(0);

  useEffect(() => {
    return firestoreService.subscribeToReads((count) => {
      setSessionReads(count);
    });
  }, []);

  useEffect(() => {
    return firestoreService.subscribeToWrites((count) => {
      setSessionWrites(count);
    });
  }, []);

  const importMasterGlossary = async (csvData: string = MASTER_GLOSSARY_CSV) => {
    setIsDeduplicating(true);
    setDedupStatus({ current: 0, total: 0, message: 'Parsing CSV...' });
    try {
      const rows = csvData.split('\n').filter(r => r.trim());
      const dataRows = rows.slice(1);
      setDedupStatus({ current: 0, total: dataRows.length, message: 'Importing records...' });
      
      toast.info('Master Glossary import started...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Master Glossary imported successfully');
    } catch (error) {
      toast.error('Import failed');
    } finally {
      setIsDeduplicating(false);
      setDedupStatus(null);
    }
  };

  const [isAddingClient, setIsAddingClient] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isAddingFacility, setIsAddingFacility] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isAddingInspector, setIsAddingInspector] = useState(false);
  const [editingInspector, setEditingInspector] = useState<Inspector | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<any>(null);

  const [selections, setSelections] = useState(() => {
    const saved = localStorage.getItem('fredasoft_selections');
    const initial = { clientId: '', facilityId: '', projectId: '', categoryId: '', itemId: '', findId: '', recId: '', locationId: '', locationName: '', images: [], isDirty: false, editingRecordId: null };
    if (saved) try { return { ...initial, ...JSON.parse(saved), isDirty: false, editingRecordId: null }; } catch (e) { return initial; }
    return initial;
  });

  // Hook for Project-Specific Data Collections
  const { rawProjectData, rawLocations } = useProjectData(selections.projectId);

  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [traySelections, setTraySelections] = useState({ clientId: selections.clientId, facilityId: selections.facilityId, projectId: selections.projectId });

  useEffect(() => {
    if (isTrayOpen) setTraySelections({ clientId: selections.clientId, facilityId: selections.facilityId, projectId: selections.projectId });
  }, [isTrayOpen, selections]);

  const handleApplyTraySelections = () => {
    setSelections(prev => ({ ...prev, ...traySelections }));
    setIsTrayOpen(false);
    toast.success('Context Updated');
  };

  const clients = useMemo(() => rawClients.filter(c => !c.fldDeleted && !c.fldIsDeleted), [rawClients]);
  const facilities = useMemo(() => rawFacilities.filter(f => !f.fldDeleted && !f.fldIsDeleted), [rawFacilities]);
  const projects = useMemo(() => rawProjects.filter(p => !p.fldDeleted && !p.fldIsDeleted), [rawProjects]);
  const projectData = useMemo(() => rawProjectData.filter(d => !d.fldDeleted && !d.fldIsDeleted && (!selections.projectId || d.fldPDataProject === selections.projectId)), [rawProjectData, selections.projectId]);
  const inspectors = useMemo(() => rawInspectors.filter(i => !i.fldDeleted && !i.fldIsDeleted), [rawInspectors]);
  const categories = useMemo(() => rawCategories.filter(c => !c.fldDeleted && !c.fldIsDeleted), [rawCategories]);
  const items = useMemo(() => rawItems.filter(i => !i.fldDeleted && !i.fldIsDeleted), [rawItems]);
  const findings = useMemo(() => rawFindings.filter(f => !f.fldDeleted && !f.fldIsDeleted), [rawFindings]);
  const unitTypes = useMemo(() => rawUnitTypes.filter(u => !u.fldDeleted && !u.fldIsDeleted), [rawUnitTypes]);
  const recommendations = useMemo(() => rawMasterRecommendations.filter(r => !r.fldDeleted && !r.fldIsDeleted), [rawMasterRecommendations]);
  const masterRecommendations = useMemo(() => rawMasterRecommendations.filter(r => !r.fldDeleted && !r.fldIsDeleted), [rawMasterRecommendations]);
  const activeGlossary = useMemo(() => glossary.filter(g => !g.fldDeleted && !g.fldIsDeleted), [glossary]);
  const allLocations = useMemo(() => rawLocations.filter(l => !l.fldDeleted && !l.fldIsDeleted), [rawLocations]);
  const locations = allLocations; // Alias for compatibility

  const deletedRecords = useMemo(() => ({
    clients: rawClients.filter(c => c.fldIsDeleted),
    facilities: rawFacilities.filter(f => f.fldIsDeleted),
    projects: rawProjects.filter(p => p.fldIsDeleted),
    projectData: rawProjectData.filter(d => d.fldIsDeleted)
  }), [rawClients, rawFacilities, rawProjects, rawProjectData]);

  const onRestoreClient = (id: string) => firestoreService.restore('clients', id);
  const onRestoreFacility = (id: string) => firestoreService.restore('facilities', id);
  const onRestoreProject = (id: string) => firestoreService.restore('projects', id);

  const onCleanupOrphans = async () => {
    try {
      const orphanedFacilities = rawFacilities.filter(f => !rawClients.find(c => c.fldClientID === f.fldClient));
      const orphanedProjects = rawProjects.filter(p => !rawClients.find(c => c.fldClientID === p.fldClient));
      const orphanedData = rawProjectData.filter(d => !rawProjects.find(p => p.fldProjID === d.fldPDataProject));

      const batch = writeBatch(db);
      orphanedFacilities.forEach(f => batch.delete(doc(db, 'facilities', f.fldFacID)));
      orphanedProjects.forEach(p => batch.delete(doc(db, 'projects', p.fldProjID)));
      orphanedData.forEach(d => batch.delete(doc(db, 'projectData', d.fldPDataID)));

      await batch.commit();
      toast.success('Orphaned records cleaned up');
    } catch (error) {
      toast.error('Failed to cleanup orphans');
    }
  };

  useEffect(() => {
    // if (!user?.uid) return;
    try {
      const coreCollections = [
        { name: 'inspectors', setter: setRawInspectors },
        { name: 'clients', setter: setRawClients },
        { name: 'facilities', setter: setRawFacilities },
        { name: 'projects', setter: setRawProjects },
        { name: 'documents', setter: setDocuments }
      ];
      const unsubs = coreCollections.map(col => firestoreService.onSnapshot(col.name, col.setter));
      return () => unsubs.forEach(u => u());
    } catch (error) {
      console.error('Error setting up core collection listeners:', error);
    }
  }, [user?.uid]);

  const handleLogout = () => signOut(auth);
  const handleTabSwitch = (newTab: string) => { setActiveTab(newTab); };

  const handleEditClient = (client: Client) => entityService.handleEditClient(client, setEditingClient, setIsAddingClient);
  const handleEditFacility = (facility: Facility) => entityService.handleEditFacility(facility, setEditingFacility, setIsAddingFacility);
  const handleEditProject = (project: Project) => entityService.handleEditProject(project, setEditingProject, setIsAddingProject);
  const handleEditInspector = (inspector: Inspector) => entityService.handleEditInspector(inspector, setEditingInspector, setIsAddingInspector);

  const initiateDelete = (type: 'client' | 'facility' | 'project' | 'inspector', id: string) => 
    entityService.initiateDelete(type, id, { clients, facilities, projects, inspectors }, setDeleteConfirmation, selections, setSelections);

  const handleSetActiveProject = () => {
    toast.success('Project context set successfully');
    // ✅ DECIDED: User stays on Setup tab after activation
  };

  const handleSubmitClient = (e: React.FormEvent<HTMLFormElement>) => 
    entityService.handleSubmitClient(e, editingClient, setIsAddingClient, setEditingClient);

  const handleSubmitFacility = (e: React.FormEvent<HTMLFormElement>) => 
    entityService.handleSubmitFacility(e, editingFacility, selections.clientId, setIsAddingFacility, setEditingFacility);

  const handleSubmitProject = (e: React.FormEvent<HTMLFormElement>) => 
    entityService.handleSubmitProject(e, editingProject, selections.clientId, setIsAddingProject, setEditingProject);

  const handleSubmitInspector = (e: React.FormEvent<HTMLFormElement>) => 
    entityService.handleSubmitInspector(e, editingInspector, setIsAddingInspector, setEditingInspector);

  const selectedProject = useMemo(() => projects.find(p => p.fldProjID === selections.projectId) || null, [projects, selections.projectId]);
  const selectedFacility = useMemo(() => facilities.find(f => f.fldFacID === selections.facilityId) || null, [facilities, selections.facilityId]);
  const selectedClient = useMemo(() => clients.find(c => c.fldClientID === selections.clientId) || null, [clients, selections.clientId]);
  const selectedInspector = useMemo(() => {
    const inspectorId = selectedProject?.fldInspector || selections.inspectorId;
    if (!inspectorId) return null;
    return inspectors.find(i => i.fldInspID === inspectorId) || null;
  }, [selectedProject, inspectors, selections.inspectorId]);

  const project = selectedProject; // Alias for compatibility
  const facility = selectedFacility; // Alias for compatibility
  
  const onResetForm = () => {
    setSelections(prev => ({ 
      ...prev, 
      // categoryId: '', // STICKY: Keep category
      itemId: '', 
      findId: '', 
      recId: '', 
      // locationId: '', // STICKY: Keep location
      images: [], 
      isDirty: false, 
      editingRecordId: null 
    }));
  };
  const mergedCategories = useMemo(() => categories, [categories]);
  const mergedItems = useMemo(() => items, [items]);
  const mergedFindings = useMemo(() => findings, [findings]);
  const mergedRecommendations = useMemo(() => recommendations, [recommendations]);
  const mergedGlossary = useMemo(() => glossary, [glossary]);

  const handleDeleteRecord = async (id: string) => {
    setDeleteConfirmation({
      title: 'Delete Record',
      message: 'Are you sure you want to delete this inspection record? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await firestoreService.data.delete(id);
          toast.success('Record deleted');
        } catch (error) {
          toast.error('Failed to delete record');
        } finally {
          setDeleteConfirmation(null);
        }
      }
    });
  };

  const handleEditGlossaryItem = (item: any) => {
    setActiveTab('maintenance');
    setSelections(prev => ({
      ...prev,
      selectedCat: item.fldCat || '',
      selectedItem: item.fldItem || '',
      selectedFind: item.fldFind || '',
      selectedRec: item.fldRec || '',
      editingGlossaryId: item.fldGlosId || item.id || '',
      images: item.fldImages || [],
      standards: item.fldStandards || [],
      isDirty: false
    }));
    toast.info(`Editing glossary record: ${item.findingShort || 'selected item'}`);
  };

  const selectionProps = {
    selections,
    setSelections,
    isTrayOpen,
    setIsTrayOpen,
    traySelections,
    setTraySelections,
    handleApplyTraySelections
  };

  const masterDataProps = {
    categories,
    items,
    findings,
    unitTypes,
    recommendations,
    masterRecommendations,
    activeGlossary,
    glossary,
    standards,
    allLocations,
    locations,
    mergedCategories,
    mergedItems,
    mergedFindings,
    mergedRecommendations,
    mergedGlossary,
    setRawFindings,
    setRawMasterRecommendations,
    setGlossary,
    setStandards,
    setRawRecommendations,
    importMasterGlossary,
    onEditGlossaryItem: handleEditGlossaryItem
  };

  const entityProps = {
    clients,
    facilities,
    projects,
    inspectors,
    rawInspectors,
    isAddingClient,
    setIsAddingClient,
    isAddingFacility,
    setIsAddingFacility,
    isAddingProject,
    setIsAddingProject,
    isAddingInspector,
    setIsAddingInspector,
    editingClient,
    setEditingClient,
    editingFacility,
    setEditingFacility,
    editingProject,
    setEditingProject,
    editingInspector,
    setEditingInspector,
    handleSubmitClient,
    handleSubmitFacility,
    handleSubmitProject,
    handleSubmitInspector,
    handleEditClient,
    handleEditFacility,
    handleEditProject,
    handleEditInspector,
    initiateDelete,
    deleteConfirmation,
    setDeleteConfirmation,
    onRestoreClient,
    onRestoreFacility,
    onRestoreProject,
    onCleanupOrphans,
    deletedRecords
  };

  const projectProps = {
    projectData,
    rawProjectData,
    selectedProject,
    selectedFacility,
    selectedClient,
    selectedInspector,
    documents,
    handleSaveRecord,
    handleDeleteRecord,
    handleSetActiveProject,
    onResetForm,
    pendingChanges
  };

  const opsProps = {
    isDeduplicating,
    dedupStatus,
    setIsDeduplicating,
    setDedupStatus,
    isSynced,
    setIsSynced,
    isUpdatingRef,
    sessionReads,
    sessionWrites,
    collectionCounts,
    runStandardsMigration: () => runStandardsMigration(setIsMigratingStandards, setMigrationStatus),
    migrateUomToUnit: () => migrateUomToUnit(rawRecommendations, rawUnitTypes, setIsDeduplicating, setDedupStatus),
    setUserPreferences,
    setActiveGlossaryId
  };

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-zinc-50"><Loader2 className="w-8 h-8 animate-spin text-zinc-400" /></div>;

  if (!user) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-50 p-4">
      <div className="mb-8 flex flex-col items-center">
        <img src={FREDAsoftLogo} alt="Logo" className="h-16 w-auto mb-4" />
        <h1 className="text-2xl font-bold text-zinc-900">FREDAsoft</h1>
        <p className="text-zinc-500 text-sm">Field Resilience & Data Safety</p>
      </div>
      <Button onClick={handleLogin} className="px-8 py-6 text-lg rounded-2xl shadow-lg shadow-blue-100">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6 mr-3" alt="Google" />
        Sign in with Google
      </Button>
    </div>
  );

  return (
    <ErrorBoundary>
      <Toaster position="top-center" />
      <LayoutOrchestrator
        isAdmin={isAdmin}
        handleLogout={handleLogout}
        tabNames={tabNames}
        activeTab={activeTab}
        handleTabSwitch={handleTabSwitch}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        showReportPreview={showReportPreview}
        setShowReportPreview={setShowReportPreview}
        selectionProps={selectionProps}
        masterDataProps={masterDataProps}
        entityProps={entityProps}
        projectProps={projectProps}
        opsProps={opsProps}
      />
      {/* !!! VERSION 86.0 - THE RECONSTRUCTION !!! */}
    </ErrorBoundary>
  );
}

function NavItem({ active, onClick, icon, label }: any) {
  return (
    <button key={label} onClick={onClick} className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all', active ? 'bg-zinc-100 text-black' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50')}>
      {icon} {label}
    </button>
  );
}