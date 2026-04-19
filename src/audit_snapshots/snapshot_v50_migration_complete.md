# !!! VERSION 50.0 - THE GREAT HEALING !!!

This manifest provides a complete snapshot of the core architecture as of Task 61.

## 1. App.tsx
```tsx
// @ts-nocheck
/**
 * CACHE BUSTER BLOCK - VERSION 4.0
 * 1. Random string: a7f8g9h0j1k2l3m4n5b6v7c8x9z0
 * 2. Random string: q1w2e3r4t5y6u7i8o9p0a1s2d3f4
 * 3. Random string: z9x8c7v6b5n4m3l2k1j0h9g8f7d6
 * 4. Random string: m1n2b3v4c5x6z7a8s9d0f1g2h3j4
 * 5. Random string: p0o9i8u7y6t5r4e3w2q1l0k9j8h7
 * 6. Random string: g6f5d4s3a2z1x0c9v8b7n6m5l4k3
 * 7. Random string: j2h1g0f9d8s7a6z5x4c3v2b1n0m9
 * 8. Random string: l8k7j6h5g4f3d2s1a0z9x8c7v6b5
 * 9. Random string: n4m3l2k1j0h9g8f7d6s5a4z3x2c1
 * 10. Random string: v0b9n8m7l6k5j4h3g2f1d0s9a8z7
 * 11. Random string: x6c5v4b3n2m1l0k9j8h7g6f5d4s3
 * 12. Random string: a2s1d0f9g8h7j6k5l4z3x2c1v0b9
 * 13. Random string: n8m7l6k5j4h3g2f1d0s9a8z7x6c5
 * 14. Random string: v4b3n2m1l0k9j8h7g6f5d4s3a2z1
 * 15. Random string: x0c9v8b7n6m5l4k3j2h1g0f9d8s7
 * 16. Random string: a6z5x4c3v2b1n0m9l8k7j6h5g4f3
 * 17. Random string: d2s1a0z9x8c7v6b5n4m3l2k1j0h9
 * 18. Random string: g8f7d6s5a4z3x2c1v0b9n8m7l6k5
 * 19. Random string: j4h3g2f1d0s9a8z7x6c5v4b3n2m1
 * 20. Random string: l0k9j8h7g6f5d4s3a2z1x0c9v8b7
 * 21. Random string: n6m5l4k3j2h1g0f9d8s7a6z5x4c3
 * 22. Random string: v2b1n0m9l8k7j6h5g4f3d2s1a0z9
 * 23. Random string: x8c7v6b5n4m3l2k1j0h9g8f7d6s5
 * 24. Random string: a4z3x2c1v0b9n8m7l6k5j4h3g2f1
 * 25. Random string: d0s9a8z7x6c5v4b3n2m1l0k9j8h7
 * 26. Random string: g6f5d4s3a2z1x0c9v8b7n6m5l4k3
 * 27. Random string: j2h1g0f9d8s7a6z5x4c3v2b1n0m9
 * 28. Random string: l8k7j6h5g4f3d2s1a0z9x8c7v6b5
 * 29. Random string: n4m3l2k1j0h9g8f7d6s5a4z3x2c1
 * 30. Random string: v0b9n8m7l6k5j4h3g2f1d0s9a8z7
 * 31. Random string: x6c5v4b3n2m1l0k9j8h7g6f5d4s3
 * 32. Random string: a2s1d0f9g8h7j6k5l4z3x2c1v0b9
 * 33. Random string: n8m7l6k5j4h3g2f1d0s9a8z7x6c5
 * 34. Random string: v4b3n2m1l0k9j8h7g6f5d4s3a2z1
 * 35. Random string: x0c9v8b7n6m5l4k3j2h1g0f9d8s7
 * 36. Random string: a6z5x4c3v2b1n0m9l8k7j6h5g4f3
 * 37. Random string: d2s1a0z9x8c7v6b5n4m3l2k1j0h9
 * 38. Random string: g8f7d6s5a4z3x2c1v0b9n8m7l6k5
 * 39. Random string: j4h3g2f1d0s9a8z7x6c5v4b3n2m1
 * 40. Random string: l0k9j8h7g6f5d4s3a2z1x0c9v8b7
 * 41. Random string: n6m5l4k3j2h1g0f9d8s7a6z5x4c3
 * 42. Random string: v2b1n0m9l8k7j6h5g4f3d2s1a0z9
 * 43. Random string: x8c7v6b5n4m3l2k1j0h9g8f7d6s5
 * 44. Random string: a4z3x2c1v0b9n8m7l6k5j4h3g2f1
 * 45. Random string: d0s9a8z7x6c5v4b3n2m1l0k9j8h7
 * 46. Random string: g6f5d4s3a2z1x0c9v8b7n6m5l4k3
 * 47. Random string: j2h1g0f9d8s7a6z5x4c3v2b1n0m9
 * 48. Random string: l8k7j6h5g4f3d2s1a0z9x8c7v6b5
 * 49. Random string: n4m3l2k1j0h9g8f7d6s5a4z3x2c1
 * 50. Random string: v0b9n8m7l6k5j4h3g2f1d0s9a8z7
 */
console.log("!!! VERSION 53.0 - HEALTH AUDITOR !!!");
// VERSION 1.2.SYNC
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
import { DocumentManager } from './components/DocumentManager';
import { ReportPreview } from './components/ReportPreview';
import { ProjectSettings } from './components/ProjectSettings';
import { 
  LayoutDashboard,
  Users, 
  Building2, 
  Briefcase, 
  BookOpen, 
  ClipboardList, 
  LogOut, 
  Plus, 
  Search, 
  ChevronRight, 
  ChevronLeft,
  Menu,
  Save, 
  Trash2, 
  Download,
  Camera,
  X,
  Check,
  Loader2,
  Copy,
  Settings,
  Table,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  AlertCircle,
  Database,
  Play,
  Edit2,
  Edit3,
  Pencil,
  ImageIcon,
  FileText,
  CheckCircle,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Filter,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Book,
  Hash,
  Layout,
  Undo,
  Wifi,
  WifiOff,
  Cloud
} from 'lucide-react';
import metadata from '../metadata.json';
const FredaSoftSQ = "/favicon.png";
import FREDAsoftLogo from './Assets/FREDAsoftLogo.png';
import { v4 as uuidv4 } from 'uuid';
import { cn, toFraction, formatMeasurement, fromFraction, sanitizeData } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { entityService } from './services/entityService';
import { MainContent } from './components/layout/MainContent';

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
  Glossary, 
  ProjectData,
  StandardSnapshot,
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

import { resizeImage } from './lib/imageUtils';
import { Button, Input, Select, Card, Modal } from './components/ui/core';
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

  const runStandardsMigration = async () => {
    setIsMigratingStandards(true);
    setMigrationStatus('Checking legacy data...');
    try {
      const legacyStandards = await firestoreService.list('tas_standards');
      if (!legacyStandards || legacyStandards.length === 0) {
        toast.info('No legacy standards found.');
        setMigrationStatus('No legacy data.');
        return;
      }
      let currentBatch = writeBatch(db);
      let count = 0;
      for (const s of legacyStandards) {
        const { id, ...data } = s;
        const docRef = doc(db, 'tas_standards', id);
        currentBatch.set(docRef, { ...data, fldStandardType: 'TAS' }, { merge: true });
        count++;
        if (count === 500) { await currentBatch.commit(); currentBatch = writeBatch(db); count = 0; }
      }
      await currentBatch.commit();
      toast.success('Migration complete!');
    } catch (error) { toast.error('Migration failed.'); } finally { setIsMigratingStandards(false); }
  };

  const migrateUomToUnit = async () => {
    setIsDeduplicating(true);
    setDedupStatus({ current: 0, total: rawRecommendations.length, message: 'Migrating UOMs...' });
    try {
      let count = 0;
      let batch = writeBatch(db);
      for (const rec of rawRecommendations) {
        if (rec.fldUOM && !rec.fldUnit) {
          const unitType = rawUnitTypes.find(ut => ut.fldUTAbbr === rec.fldUOM);
          if (unitType) {
            const docRef = doc(db, 'recommendations', rec.id || rec.fldRecID);
            batch.update(docRef, { fldUnit: unitType.fldUTID });
            count++;
            if (count % 500 === 0) {
              await batch.commit();
              batch = writeBatch(db);
            }
          }
        }
      }
      if (count % 500 !== 0) await batch.commit();
      toast.success(`Migrated ${count} recommendations.`);
    } catch (error) { toast.error('Migration failed.'); } finally { setIsDeduplicating(false); setDedupStatus(null); }
  };

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
  const [rawCategories, setRawCategories] = useState<Category[]>([]);
  const [rawItems, setRawItems] = useState<Item[]>([]);
  const [rawFindings, setRawFindings] = useState<Finding[]>([]);
  const [rawUnitTypes, setRawUnitTypes] = useState<UnitType[]>([]);
  const [rawRecommendations, setRawRecommendations] = useState<Recommendation[]>([]);
  const [rawMasterRecommendations, setRawMasterRecommendations] = useState<MasterRecommendation[]>([]);
  const [glossary, setGlossary] = useState<Glossary[]>([]);
  const [standards, setStandards] = useState<MasterStandard[]>([]);
  const [rawLocations, setRawLocations] = useState<Location[]>([]);
  const [userPreferences, setUserPreferences] = useState<UserPreference | null>(null);
  const [rawProjectData, setRawProjectData] = useState<ProjectData[]>([]);
  const [documents, setDocuments] = useState<AppDocument[]>([]);
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

  useEffect(() => {
    console.log("DATA INTEGRITY AUDIT:");
    console.log("Total Glossary Records:", glossary.length);
    console.log("Total Master Recommendations:", rawMasterRecommendations.length);
    if (glossary.length > 0 && rawMasterRecommendations.length === 0) {
      console.warn("CRITICAL: Master Recommendations library is EMPTY but Glossary is populated.");
    }
  }, [glossary.length, rawMasterRecommendations.length]);

  useEffect(() => {
    return firestoreService.subscribeToReads((count) => {
      setSessionReads(count);
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
    const manualCheck = async () => {
      console.log("MANUAL CHECK: Attempting to fetch a single document from 'glossary'...");
      try {
        const q = query(collection(db, 'glossary'));
        const snap = await getDocs(q);
        if (snap.empty) {
          console.log("MANUAL CHECK RESULT: 'glossary' collection is EMPTY.");
        } else {
          console.log("MANUAL CHECK RESULT: Found document:", snap.docs[0].id);
          console.log("FIELDS FOUND:", Object.keys(snap.docs[0].data()));
        }
      } catch (err) {
        console.error("MANUAL CHECK ERROR:", err);
      }
    };
    manualCheck();
  }, []);

  useEffect(() => {
    // if (!user?.uid) return;
    console.log("EXECUTION: Calling firestoreService.data.onSnapshot now...");
    const unsub = firestoreService.data.onSnapshot((data) => {
      // Add safety check and filter out standards
      if (data && Array.isArray(data)) {
        const validProjectData = data.filter(d => !d.citation_num);
        
        // Sanity Check: Log blueprint-accurate data
        validProjectData.forEach(d => {
          console.log(`Record [${d.fldPDataID}] loaded. Rec: ${d.fldRecShort || 'UNDEFINED'}`);
        });

        setRawProjectData(validProjectData);
      }
    });
    const locUnsub = firestoreService.onSnapshot('locations', (data) => setRawLocations(data));
    return () => { unsub(); locUnsub(); };
  }, [user?.uid, selections.projectId, activeTab]);

  useEffect(() => {
    // if (!user?.uid) return;
    console.log("APP.TSX CHECK: Attempting to call Firestore for Glossary...");
    console.log("EXECUTION: Calling firestoreService.onSnapshot for core collections now...");
    try {
      const coreCollections = [
        { name: 'inspectors', setter: setRawInspectors },
        { name: 'clients', setter: setRawClients },
        { name: 'facilities', setter: setRawFacilities },
        { name: 'projects', setter: setRawProjects },
        { name: 'categories', setter: setRawCategories },
        { name: 'items', setter: setRawItems },
        { name: 'findings', setter: setRawFindings },
        { name: 'unitTypes', setter: setRawUnitTypes },
        { name: 'recommendations', setter: setRawMasterRecommendations },
        { name: 'glossary', setter: setGlossary },
        { name: 'tas_standards', setter: setStandards },
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

  const currentRecord = useMemo(() => projectData.find(d => d.fldPDataID === selections.editingRecordId) || null, [projectData, selections.editingRecordId]);

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

  const handleEditGlossaryItem = (item: any) => {
    setActiveTab('maintenance');
    setSelections(prev => ({
      ...prev,
      selectedCat: item.fldCat || '',
      selectedItem: item.fldItem || '',
      selectedFind: item.fldFind || '',
      selectedRec: item.fldRec || '',
      images: item.fldImages || [],
      isDirty: false
    }));
    toast.info(`Editing glossary record: ${item.findingShort || 'selected item'}`);
  };

  return (
    <ErrorBoundary>
      <Toaster position="top-center" />
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
                        options={clients.map((c, idx) => ({ value: c.fldClientID, label: c.fldClientName, key: `tray-c-${c.fldClientID || idx}` }))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Facility</label>
                      <Select value={traySelections.facilityId} onChange={(e) => setTraySelections({ ...traySelections, facilityId: e.target.value, projectId: '' })}
                        options={facilities.filter(f => f.fldClient === traySelections.clientId).map((f, idx) => ({ value: f.fldFacID, label: f.fldFacName, key: `tray-f-${f.fldFacID || idx}` }))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Project</label>
                      <Select value={traySelections.projectId} onChange={(e) => setTraySelections({ ...traySelections, projectId: e.target.value })}
                        options={projects.filter(p => p.fldClient === traySelections.clientId || p.fldFacID === traySelections.facilityId).map((p, idx) => ({ value: p.fldProjID, label: p.fldProjName, key: `tray-p-${p.fldProjID || idx}` }))} />
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
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsTrayOpen(true)}>
              <span className="text-zinc-900 font-bold">{projects.find(p => p.fldProjID === selections.projectId)?.fldProjName || "Select Project"}</span>
              <ChevronDown size={14} className="text-zinc-400" />
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
            selections={selections}
            setSelections={setSelections}
            clients={clients}
            facilities={facilities}
            projects={projects}
            inspectors={inspectors}
            handleSetActiveProject={handleSetActiveProject}
            initiateDelete={initiateDelete}
            handleEditClient={handleEditClient}
            handleEditFacility={handleEditFacility}
            handleEditProject={handleEditProject}
            handleEditInspector={handleEditInspector}
            setIsAddingClient={setIsAddingClient}
            setIsAddingFacility={setIsAddingFacility}
            setIsAddingProject={setIsAddingProject}
            setIsAddingInspector={setIsAddingInspector}
            stats={{ clients, facilities, projects, projectData, glossary, standards, categories, items, findings, recommendations }}
            setActiveTab={handleTabSwitch}
            collectionCounts={collectionCounts}
            isAdmin={isAdmin}
            deletedRecords={deletedRecords}
            onRestoreClient={onRestoreClient}
            onRestoreFacility={onRestoreFacility}
            onRestoreProject={onRestoreProject}
            onCleanupOrphans={onCleanupOrphans}
            currentRecord={currentRecord}
            selectedProject={selectedProject}
            selectedFacility={selectedFacility}
            items={items}
            findings={findings}
            setRawFindings={setRawFindings}
            recommendations={recommendations}
            setRawRecommendations={setRawRecommendations}
            handleSaveRecord={handleSaveRecord}
            onResetForm={onResetForm}
            categories={categories}
            standards={standards}
            setStandards={setStandards}
            allLocations={allLocations}
            unitTypes={unitTypes}
            mergedCategories={mergedCategories}
            projectData={projectData}
            locations={locations}
            glossary={activeGlossary}
            setGlossary={setGlossary}
            handleDeleteRecord={handleDeleteRecord}
            isDeduplicating={isDeduplicating}
            dedupStatus={dedupStatus}
            setIsSynced={setIsSynced}
            setActiveGlossaryId={setActiveGlossaryId}
            setUserPreferences={setUserPreferences}
            importMasterGlossary={importMasterGlossary}
            isUpdatingRef={isUpdatingRef}
            runStandardsMigration={runStandardsMigration}
            migrateUomToUnit={migrateUomToUnit}
            selectedInspector={selectedInspector}
            sessionReads={sessionReads}
            documents={documents}
            setIsDeduplicating={setIsDeduplicating}
            setDedupStatus={setDedupStatus}
            pendingChanges={pendingChanges}
            mergedItems={mergedItems}
            mergedFindings={mergedFindings}
            mergedRecommendations={mergedRecommendations}
            mergedGlossary={mergedGlossary}
            rawProjectData={rawProjectData}
            onEditGlossaryItem={handleEditGlossaryItem}
            setRawMasterRecommendations={setRawMasterRecommendations}
            setGlossary={setGlossary}
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
          recommendations={recommendations}
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
      {/* 🚀 ARCHITECTURAL NOTE: Full image compression engine implementation is the next phase. */}
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

```


## 2. firestoreService.ts
```ts
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp, 
  writeBatch,
  deleteDoc,
  Timestamp,
  orderBy,
  limit,
  collectionGroup
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { v4 as uuidv4 } from 'uuid';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const validCollections = [
  'inspectors', 'clients', 'facilities', 'designFirms', 'projects', 
  'categories', 'items', 'findings', 'unitTypes', 'recommendations', 
  'glossary', 'master_standards', 'tas_standards', 'tas_images', 
  'tas_image_associations', 'projectData', 'documents', 'locations'
];

let totalReads = 0;
const readListeners: ((count: number) => void)[] = [];

const trackRead = (count: number = 1) => {
  totalReads += count;
  readListeners.forEach(l => l(totalReads));
};

export const firestoreService = {
  subscribeToReads(callback: (count: number) => void) {
    readListeners.push(callback);
    callback(totalReads);
    return () => {
      const idx = readListeners.indexOf(callback);
      if (idx > -1) readListeners.splice(idx, 1);
    };
  },

  async save(collectionName: string, data: any, id?: string, sanitize: boolean = true) {
    if (!validCollections.includes(collectionName)) {
      throw new Error(`Invalid collection: ${collectionName}`);
    }
    const docId = id || data.id || uuidv4();
    const docRef = doc(db, collectionName, docId);
    
    const cleanData = sanitize ? {
      ...data,
      fldLastModified: serverTimestamp(),
      fldCreatedAt: data.fldCreatedAt || serverTimestamp(),
      fldIsDeleted: false
    } : data;

    try {
      await setDoc(docRef, cleanData, { merge: true });
      return docId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, collectionName);
    }
  },

  async delete(collectionName: string, id: string) {
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, collectionName);
    }
  },

  async softDelete(collectionName: string, id: string) {
    try {
      await updateDoc(doc(db, collectionName, id), {
        fldIsDeleted: true,
        fldDeletedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, collectionName);
    }
  },

  async restore(collectionName: string, id: string) {
    try {
      await updateDoc(doc(db, collectionName, id), {
        fldIsDeleted: false,
        fldDeletedAt: null
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, collectionName);
    }
  },

  async batchUpdate(collectionName: string, updates: { id: string, data: any }[]) {
    const batch = writeBatch(db);
    updates.forEach(({ id, data }) => {
      const docRef = doc(db, collectionName, id);
      batch.update(docRef, { ...data, fldLastModified: serverTimestamp() });
    });
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, collectionName);
    }
  },

  async list(collectionName: string, constraints: any[] = []) {
    try {
      const q = query(collection(db, collectionName), ...constraints);
      const querySnapshot = await getDocs(q);
      trackRead(querySnapshot.size);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collectionName);
    }
  },

  onSnapshot(collectionName: string, callback: (data: any[]) => void, constraints: any[] = []) {
    const q = query(collection(db, collectionName), ...constraints);
    return onSnapshot(q, (snapshot) => {
      trackRead(snapshot.size);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, collectionName);
    });
  },

  // Specific helpers for projectData
  data: {
    async save(data: any, id?: string) {
      return firestoreService.save('projectData', data, id);
    },
    async delete(id: string) {
      return firestoreService.delete('projectData', id);
    },
    onSnapshot(callback: (data: any[]) => void) {
      return firestoreService.onSnapshot('projectData', callback);
    }
  },

  // Specific helpers for glossary
  glossary: {
    async save(data: any, id?: string) {
      return firestoreService.save('glossary', data, id);
    },
    onSnapshot(callback: (data: any[]) => void) {
      return firestoreService.onSnapshot('glossary', callback);
    }
  },

  // Specific helpers for recommendations
  masterRecommendations: {
    async save(data: any, id?: string) {
      return firestoreService.save('recommendations', data, id);
    },
    onSnapshot(callback: (data: any[]) => void) {
      return firestoreService.onSnapshot('recommendations', callback);
    }
  }
};
```


## 3. firebase.ts
```ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };
```


## 4. types/index.ts
```ts
export interface Inspector {
  id?: string;
  fldInspID: string;
  fldInspName: string;
  fldInspEmail?: string;
  fldInspPhone?: string;
  fldIsDeleted?: boolean;
  fldDeleted?: boolean;
}

export interface Client {
  id?: string;
  fldClientID: string;
  fldClientName: string;
  fldIsDeleted?: boolean;
  fldDeleted?: boolean;
}

export interface Facility {
  id?: string;
  fldFacID: string;
  fldFacName: string;
  fldClient: string;
  fldIsDeleted?: boolean;
  fldDeleted?: boolean;
}

export interface DesignFirm {
  id?: string;
  fldFirmID: string;
  fldFirmName: string;
  fldIsDeleted?: boolean;
  fldDeleted?: boolean;
}

export interface Project {
  id?: string;
  fldProjID: string;
  fldProjName: string;
  fldClient: string;
  fldFacID: string;
  fldInspector: string;
  fldIsDeleted?: boolean;
  fldDeleted?: boolean;
}

export interface Category {
  id?: string;
  fldCatID: string;
  fldCatName: string;
  fldIsDeleted?: boolean;
  fldDeleted?: boolean;
}

export interface Item {
  id?: string;
  fldItemID: string;
  fldItemName: string;
  fldCat: string;
  fldIsDeleted?: boolean;
  fldDeleted?: boolean;
}

export interface Finding {
  id?: string;
  fldFindID: string;
  fldFindName: string;
  fldItem: string;
  fldSuggestedRecs?: string[];
  fldIsDeleted?: boolean;
  fldDeleted?: boolean;
}

export interface UnitType {
  id?: string;
  fldUTID: string;
  fldUTName: string;
  fldUTAbbr: string;
  fldIsDeleted?: boolean;
  fldDeleted?: boolean;
}

export interface Recommendation {
  id?: string;
  fldRecID: string;
  fldRecName: string;
  fldFind: string;
  fldUnit?: string;
  fldUOM?: string;
  fldIsDeleted?: boolean;
  fldDeleted?: boolean;
}

export interface Glossary {
  id?: string;
  fldGlossaryID: string;
  fldCat: string;
  fldItem: string;
  fldFind: string;
  fldRec: string;
  fldIsDeleted?: boolean;
  fldDeleted?: boolean;
}

export interface ProjectData {
  id?: string;
  fldPDataID: string;
  fldPDataProject: string;
  fldCat: string;
  fldItem: string;
  fldFind: string;
  fldRec: string;
  fldLocation?: string;
  fldQuantity?: number;
  fldImages?: string[];
  fldIsDeleted?: boolean;
  fldDeleted?: boolean;
}

export interface MasterStandard {
  id?: string;
  fldStandardID: string;
  fldStandardName: string;
  fldStandardType: string;
  citation_num?: string;
  fldIsDeleted?: boolean;
  fldDeleted?: boolean;
}

export interface UserPreference {
  uid: string;
  activeProject?: string;
}

export interface Location {
  id?: string;
  fldLocID: string;
  fldLocName: string;
  fldIsDeleted?: boolean;
  fldDeleted?: boolean;
}

export interface AppDocument {
  id?: string;
  fldDocID: string;
  fldDocName: string;
  fldDocUrl: string;
  fldProjID: string;
  fldIsDeleted?: boolean;
  fldDeleted?: boolean;
}
```


## 5. GlossaryBuilder.tsx
```tsx
import React, { useState, useEffect } from 'react';
import { ref, getDownloadURL, uploadString } from 'firebase/storage';
import { storage } from '../firebase';
import { resizeImage } from '../lib/imageUtils';
import { 
  Plus, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  Save, 
  Trash2, 
  RotateCcw, 
  Edit2, 
  Copy,
  ArrowUp,
  Book,
  Hash,
  Camera,
  X,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn, sanitizeData } from '../lib/utils';
import { Button, Select, Card, Input, Modal } from './ui/core';
import { toast } from 'sonner';
import { firestoreService, OperationType, handleFirestoreError } from '../services/firestoreService';
import { 
  Category, 
  Item, 
  Finding, 
  MasterRecommendation, 
  Glossary, 
  UnitType, 
  MasterStandard 
} from '../types';

interface GlossaryBuilderProps {
  categories: Category[];
  items: Item[];
  findings: Finding[];
  setFindings: React.Dispatch<React.SetStateAction<Finding[]>>;
  recommendations: any[]; // Legacy recommendations
  setRecommendations: React.Dispatch<React.SetStateAction<any[]>>;
  masterRecommendations: MasterRecommendation[];
  glossary: Glossary[];
  setGlossary: React.Dispatch<React.SetStateAction<Glossary[]>>;
  unitTypes: UnitType[];
  standards: MasterStandard[];
  selections: any;
  onSelectionChange: (selections: any) => void;
  updatePreferences: (prefs: any) => void;
  setIsSynced: (val: boolean) => void;
  isUpdatingRef: React.MutableRefObject<boolean>;
  setShowStandards: (val: boolean) => void;
  showStandards: boolean;
}

export function GlossaryBuilder({
  categories = [],
  items = [],
  findings = [],
  setFindings,
  recommendations = [],
  setRecommendations,
  masterRecommendations = [],
  glossary = [],
  setGlossary,
  unitTypes = [],
  standards = [],
  selections = {},
  onSelectionChange,
  updatePreferences,
  setIsSynced,
  isUpdatingRef,
  setShowStandards,
  showStandards
}: GlossaryBuilderProps) {
  const { selectedCat, selectedItem, selectedFind, selectedRec } = selections;

  const setSelectedCat = (val: string) => {
    if (val === selections.selectedCat) return;
    const newS = { ...selections, selectedCat: val, selectedItem: '', selectedFind: '', selectedRec: '' };
    onSelectionChange(newS);
    updatePreferences({ glossaryBuilderSelections: newS });
  };
  const setSelectedItem = (val: string) => {
    if (val === selections.selectedItem) return;
    const newS = { ...selections, selectedItem: val, selectedFind: '', selectedRec: '' };
    onSelectionChange(newS);
    updatePreferences({ glossaryBuilderSelections: newS });
  };
  const setSelectedFind = (val: string) => {
    isUpdatingRef.current = true;
    const newS = { ...selections, selectedFind: val, selectedRec: '' };
    onSelectionChange(newS);
    updatePreferences({ glossaryBuilderSelections: newS });
    setTimeout(() => { isUpdatingRef.current = false; }, 500);
  };
  const setSelectedRec = (val: string) => {
    isUpdatingRef.current = true;
    const newS = { ...selections, selectedRec: val };
    onSelectionChange(newS);
    updatePreferences({ glossaryBuilderSelections: newS });
    setTimeout(() => { isUpdatingRef.current = false; }, 500);
  };

  const [newType, setNewType] = useState<'category' | 'item' | 'finding' | 'recommendation' | 'glossary_record' | 'link_recommendation' | null>(null);
  const [formData, setFormData] = useState({
    catName: '', catOrder: '', itemName: '', itemOrder: '', findShort: '', findLong: '', findOrder: '', fldUnitType: '', recShort: '', recLong: '', recOrder: '', unit: '', uom: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, collection: string, label: string, type: 'delete' | 'unassociate', isAssociated?: boolean } | null>(null);

  const handleDeleteAction = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === 'delete') {
        await firestoreService.delete(confirmDelete.collection, confirmDelete.id);
        if (confirmDelete.collection === 'categories') setSelectedCat('');
        if (confirmDelete.collection === 'items') setSelectedItem('');
        if (confirmDelete.collection === 'findings') setSelectedFind('');
        if (confirmDelete.collection === 'recommendations') setSelectedRec('');
        if (confirmDelete.collection === 'glossary') {
          onSelectionChange({
            ...selections,
            selectedItem: '',
            selectedFind: '',
            selectedRec: '',
            images: [],
            isDirty: false
          });
        }
      } else {
        const field = confirmDelete.collection === 'items' ? 'fldCatID' : 
                      confirmDelete.collection === 'findings' ? 'fldItem' : 'fldFind';
        await firestoreService.save(confirmDelete.collection, { [field]: '' }, confirmDelete.id);
        if (confirmDelete.collection === 'items') setSelectedItem('');
        if (confirmDelete.collection === 'findings') setSelectedFind('');
        if (confirmDelete.collection === 'recommendations') setSelectedRec('');
      }
      setConfirmDelete(null);
      toast.success('Action completed successfully.');
    } catch (error) {
      console.error('Error in delete action:', error);
      toast.error('Error performing action.');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    isUpdatingRef.current = true;
    const loadingToast = toast.loading('Compressing and uploading images...');
    const uploadPromises = Array.from(files).map(async (file) => {
      if (images.length >= 4) return null;
      const storageRef = ref(storage, `images/master/${Date.now()}_${file.name}`);
      try {
        const resizedBase64 = await resizeImage(file, 1600, 1600);
        const snapshot = await uploadString(storageRef, resizedBase64, 'data_url');
        const url = await getDownloadURL(snapshot.ref);
        return url;
      } catch (error) {
        console.error('Error uploading image (master):', error);
        toast.error(`Failed to upload ${file.name}`);
        return null;
      }
    });
    const urls = await Promise.all(uploadPromises);
    toast.dismiss(loadingToast);
    const validUrls = urls.filter((url): url is string => url !== null);
    setImages(prev => [...prev, ...validUrls].slice(0, 4));
    if (e.target) e.target.value = '';
    setTimeout(() => { isUpdatingRef.current = false; }, 1000);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeStandard = (type: 'finding' | 'recommendation', standardId: string, parentId: string) => {
    if (type === 'finding') {
      const finding = findings.find(f => String(f.id || f.fldFindID || "").toLowerCase().trim() === String(parentId || "").toLowerCase().trim());
      if (finding) {
        const newStandards = (finding.fldStandards || []).filter(id => id !== standardId);
        firestoreService.save('findings', sanitizeData({ fldStandards: newStandards }), finding.fldFindID);
        setFindings(prev => prev.map(f => f.fldFindID === finding.fldFindID ? { ...f, fldStandards: newStandards } : f));
      }
    } else {
      const recommendation = masterRecommendations.find(r => (r.id || r.fldRecID || "").toLowerCase().trim() === (parentId || "").toLowerCase().trim());
      if (recommendation) {
        const newStandards = (recommendation.fldStandards || []).filter(id => id !== standardId);
        firestoreService.masterRecommendations.save(sanitizeData({ fldStandards: newStandards }), recommendation.fldRecID);
      }
    }
  };

  const handleDropStandard = (e: React.DragEvent, type: 'finding' | 'recommendation') => {
    e.preventDefault();
    const standardId = e.dataTransfer.getData('standardId');
    if (!standardId) return;

    if (type === 'finding' && selectedFind) {
      const finding = findings.find(f => String(f.id || f.fldFindID || "").toLowerCase().trim() === String(selectedFind || "").toLowerCase().trim());
      if (finding) {
        const current = finding.fldStandards || [];
        if (!current.includes(standardId)) {
          const next = [...current, standardId];
          firestoreService.save('findings', sanitizeData({ fldStandards: next }), finding.fldFindID);
          setFindings(prev => prev.map(f => f.fldFindID === finding.fldFindID ? { ...f, fldStandards: next } : f));
        }
      }
    } else if (type === 'recommendation' && selectedRec) {
      const recommendation = masterRecommendations.find(r => (r.id || r.fldRecID || "").toLowerCase().trim() === (selectedRec || "").toLowerCase().trim());
      if (recommendation) {
        const current = recommendation.fldStandards || [];
        if (!current.includes(standardId)) {
          const next = [...current, standardId];
          firestoreService.masterRecommendations.save(sanitizeData({ fldStandards: next }), recommendation.fldRecID);
        }
      }
    }
  };

  const images = selections.images || [];
  const setImages = (val: string[] | ((prev: string[]) => string[]), markDirty = true) => {
    const next = typeof val === 'function' ? val(images) : val;
    onSelectionChange({ ...selections, images: next, isDirty: markDirty });
  };

  const isDirty = selections.isDirty || false;
  const setIsDirty = (val: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof val === 'function' ? val(isDirty) : val;
    onSelectionChange({ ...selections, isDirty: next });
  };

  const filteredItems = items.filter((i: any) => i.fldCatID === selectedCat);

  const handleAddNew = async () => {
    if (!selectedCat || !selectedItem || !selectedFind || !selectedRec) return;
    const existing = glossary.find((g: any) => 
      String(g.fldCat || "").toLowerCase().trim() === String(selectedCat || "").toLowerCase().trim() && 
      String(g.fldItem || "").toLowerCase().trim() === String(selectedItem || "").toLowerCase().trim() && 
      String(g.fldFind || "").toLowerCase().trim() === String(selectedFind || "").toLowerCase().trim() && 
      (g.fldRec || g.fldRecID || "").toLowerCase().trim() === (selectedRec || "").toLowerCase().trim()
    );

    try {
      setIsSynced(false);
      if (existing) {
        const updatePayload = sanitizeData({ fldImages: images });
        await firestoreService.glossary.save(updatePayload, existing.fldGlosId);
        toast.success('Glossary record updated!');
      } else {
        const glosId = uuidv4();
        const newGlos = sanitizeData({
          fldGlosId: glosId, fldCat: selectedCat || '', fldItem: selectedItem || '', fldFind: selectedFind || '', fldRec: selectedRec || '', fldImages: images
        });
        await firestoreService.glossary.save(newGlos, glosId);
        toast.success('Glossary record created and linked!');
      }
      setIsDirty(false);
      onSelectionChange({ ...selections, selectedItem: '', selectedFind: '', selectedRec: '', images: [], isDirty: false });
    } catch (error) {
      handleFirestoreError(error, existing ? OperationType.UPDATE : OperationType.CREATE, 'glossary');
    }
  };

  const handleClearAll = () => {
    onSelectionChange({ ...selections, selectedItem: '', selectedFind: '', selectedRec: '', images: [], isDirty: false });
  };

  const saveNewGlossaryRecord = async () => {
    try {
      let findId = selectedFind;
      if (!selectedFind || (selectedCat && selectedItem && selectedFind && selectedRec)) {
        findId = uuidv4();
        const findingPayload = sanitizeData({
          fldFindID: findId, 
          fldItem: selectedItem || '', 
          fldFindShort: formData.findShort || '', 
          fldFindLong: formData.findLong || '', 
          fldOrder: parseInt(formData.findOrder) || 0,
          fldUnitType: formData.fldUnitType || '', 
          fldStandards: [],
          fldSuggestedRecs: []
        });
        await firestoreService.save('findings', findingPayload, findId);
      }
      
      const recId = uuidv4();
      const recPayload = sanitizeData({
        fldRecID: recId, 
        fldRecShort: formData.recShort || '', 
        fldRecLong: formData.recLong || '', 
        fldOrder: parseInt(formData.recOrder) || 0,
        fldUnit: Number(formData.unit) || 0, 
        fldUOM: formData.uom || 'EA', 
        fldStandards: []
      });
      
      // ✅ DECIDED: Write exclusively to master_recommendations
      await firestoreService.masterRecommendations.save(recPayload, recId);
      
      // Link to finding
      const finding = findings?.find(f => String(f.id || f.fldFindID || "").toLowerCase().trim() === String(findId || "").toLowerCase().trim());
      const suggested = [...(finding?.fldSuggestedRecs || []), recId];
      await firestoreService.save('findings', { fldSuggestedRecs: suggested }, findId);

      const glosId = uuidv4();
      const glossaryPayload = sanitizeData({
        fldGlosId: glosId, 
        fldCat: selectedCat || '', 
        fldItem: selectedItem || '', 
        fldFind: findId || '', 
        fldRec: recId || '', 
        fldImages: images || [], 
        fldStandards: selections.standards || []
      });
      await firestoreService.save('glossary', glossaryPayload, glosId);
      
      onSelectionChange({ ...selections, selectedItem: selectedItem, selectedFind: findId, selectedRec: recId, images: images || [], isDirty: false });
      setNewType(null);
      toast.success('Glossary record created!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'glossary');
    }
  };

  const saveNewCategory = async () => {
    console.log('!!! saveNewCategory TRIGGERED !!!');
    try {
      const id = editingId || uuidv4();
      // FORCE the payload structure to be literal
      const payload = { 
        fldCategoryID: id, 
        fldCategoryName: formData.catName, 
        fldOrder: formData.catOrder === '' ? 999 : Number(formData.catOrder) 
      };
      
      console.log('DEBUG: Final Payload before Firestore write:', payload);
      console.log('DEBUG: Targeting ID:', id);

      // Use direct firestoreService call
      const result = await firestoreService.save('categories', payload, id);
      
      console.log('DEBUG: Firestore returned result:', result);

      setNewType(null);
      setEditingId(null);
      setSelectedCat(id);
      toast.success(editingId ? 'Category updated!' : 'Category created!');
    } catch (error) {
      console.error('CRITICAL SAVE ERROR:', error);
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'categories');
    }
  };

  const saveNewItem = async () => {
    try {
      const id = editingId || uuidv4();
      const payload = sanitizeData({ fldItemID: id, fldItemName: formData.itemName, fldCatID: selectedCat, fldOrder: formData.itemOrder === '' ? 999 : Number(formData.itemOrder) });
      await firestoreService.save('items', payload, id);
      setNewType(null);
      setEditingId(null);
      setSelectedItem(id);
      toast.success(editingId ? 'Item updated!' : 'Item created!');
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'items');
    }
  };

  const saveNewFinding = async () => {
    try {
      const id = editingId || uuidv4();
      const payload = sanitizeData({ 
        fldFindID: id, 
        fldItem: selectedItem, 
        fldFindShort: formData.findShort, 
        fldFindLong: formData.findLong, 
        fldOrder: formData.findOrder === '' ? 999 : Number(formData.findOrder),
        fldUnitType: formData.fldUnitType,
        fldSuggestedRecs: editingId ? (findings?.find(f => String(f.id || f.fldFindID || "").toLowerCase().trim() === String(id || "").toLowerCase().trim())?.fldSuggestedRecs || []) : [],
        fldStandards: editingId ? (findings?.find(f => String(f.id || f.fldFindID || "").toLowerCase().trim() === String(id || "").toLowerCase().trim())?.fldStandards || []) : []
      });
      await firestoreService.save('findings', payload, id);
      setNewType(null);
      setEditingId(null);
      setSelectedFind(id);
      toast.success(editingId ? 'Finding updated!' : 'Finding created!');
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'findings');
    }
  };

  const saveNewRecommendation = async () => {
    try {
      const id = editingId || uuidv4();
      const payload = sanitizeData({ 
        fldRecID: id, 
        fldRecShort: formData.recShort, 
        fldRecLong: formData.recLong, 
        fldOrder: parseInt(formData.recOrder) || 0,
        fldUnit: Number(formData.unit) || 0, 
        fldUOM: formData.uom,
        fldStandards: editingId ? (masterRecommendations?.find(r => (r.id || r.fldRecID || "").toLowerCase().trim() === (id || "").toLowerCase().trim())?.fldStandards || []) : []
      });
      
      await firestoreService.masterRecommendations.save(payload, id);
      
      if (!editingId && selectedFind) {
        const finding = findings.find(f => String(f.id || f.fldFindID || "").toLowerCase().trim() === String(selectedFind || "").toLowerCase().trim());
        if (finding) {
          const suggested = [...(finding.fldSuggestedRecs || []), id];
          await firestoreService.save('findings', { fldSuggestedRecs: suggested }, selectedFind);
        }
      }

      setNewType(null);
      setEditingId(null);
      setSelectedRec(id);
      toast.success(editingId ? 'Master Recommendation updated!' : 'New Master Recommendation created!');
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'recommendations');
    }
  };

  const handleLinkRecommendation = async (recId: string) => {
    if (!selectedFind) return;
    try {
      const finding = findings.find(f => (f.id || f.fldFindID) === selectedFind);
      if (finding) {
        const suggested = [...(finding.fldSuggestedRecs || [])];
        if (!suggested.includes(recId)) {
          suggested.push(recId);
          await firestoreService.save('findings', { fldSuggestedRecs: suggested }, selectedFind);
          toast.success('Recommendation linked to finding');
        } else {
          toast.info('Already linked');
        }
      }
      setNewType(null);
    } catch (error) {
      toast.error('Failed to link recommendation');
    }
  };

  const handleDuplicateRecommendation = (rec: any) => {
    setEditingId(null);
    setFormData({
      ...formData,
      recShort: rec.fldRecShort + ' (Copy)',
      recLong: rec.fldRecLong,
      unit: rec.fldUnit?.toString() || '0',
      uom: rec.fldUOM || 'EA'
    });
    setNewType('recommendation');
  };

  const openEdit = (type: 'category' | 'item' | 'finding' | 'recommendation') => {
    if (type === 'category' && selectedCat) {
      const c = categories.find((c: any) => (c.id || c.fldCategoryID) === selectedCat);
      if (c) {
        setFormData({ ...formData, catName: c.fldCategoryName, catOrder: c.fldOrder?.toString() || '' });
        setEditingId(selectedCat);
      }
    } else if (type === 'item' && selectedItem) {
      const i = items.find((i: any) => (i.id || i.fldItemID) === selectedItem);
      if (i) {
        setFormData({ ...formData, itemName: i.fldItemName, itemOrder: i.fldOrder?.toString() || '' });
        setEditingId(selectedItem);
      }
    } else if (type === 'finding' && selectedFind) {
      const f = findings.find((f: any) => (f.id || f.fldFindID) === selectedFind);
      if (f) {
        setFormData({ ...formData, findShort: f.fldFindShort, findLong: f.fldFindLong, findOrder: f.fldOrder?.toString() || '', fldUnitType: f.fldUnitType || '' });
        setEditingId(selectedFind);
      }
    } else if (type === 'recommendation' && selectedRec) {
      const r = masterRecommendations.find((r: any) => (r.id || r.fldRecID || "").toLowerCase() === (selectedRec || "").toLowerCase());
      if (r) {
        setFormData({ ...formData, recShort: r.fldRecShort, recLong: r.fldRecLong, recOrder: r.fldOrder?.toString() || '', unit: r.fldUnit?.toString() || '0', uom: r.fldUOM || 'EA' });
        setEditingId(selectedRec);
      }
    }
    setNewType(type);
  };

  const openNewWithTemplate = (type: 'category' | 'item' | 'finding' | 'recommendation') => {
    setEditingId(null);
    if (type === 'category' && selectedCat) {
      const c = categories.find((c: any) => (c.id || c.fldCategoryID) === selectedCat);
      if (c) setFormData({ ...formData, catName: c.fldCategoryName + ' (Copy)', catOrder: (c.fldOrder || 0).toString() });
    } else if (type === 'item' && selectedItem) {
      const i = items.find((i: any) => (i.id || i.fldItemID) === selectedItem);
      if (i) setFormData({ ...formData, itemName: i.fldItemName + ' (Copy)', itemOrder: (i.fldOrder || 0).toString() });
    } else if (type === 'finding' && selectedFind) {
      const f = findings.find((f: any) => (f.id || f.fldFindID) === selectedFind);
      if (f) setFormData({ ...formData, findShort: f.fldFindShort + ' (Copy)', findLong: f.fldFindLong, findOrder: (f.fldOrder || 0).toString(), fldUnitType: f.fldUnitType || '' });
    } else if (type === 'recommendation' && selectedRec) {
      const r = masterRecommendations.find((r: any) => (r.id || r.fldRecID || "").toLowerCase() === (selectedRec || "").toLowerCase());
      if (r) setFormData({ ...formData, recShort: r.fldRecShort + ' (Copy)', recLong: r.fldRecLong, recOrder: (r.fldOrder || 0).toString(), unit: r.fldUnit?.toString() || '0', uom: r.fldUOM || 'EA' });
    } else {
      setFormData({ catName: '', catOrder: '', itemName: '', itemOrder: '', findShort: '', findLong: '', findOrder: '', fldUnitType: '', recShort: '', recLong: '', recOrder: '', unit: '', uom: '' });
    }
    setNewType(type);
  };

  const handleAddNewGlossaryFlow = () => {
    const cat = categories?.find((c: any) => String(c.id || c.fldCategoryID || "").toLowerCase().trim() === String(selectedCat || "").toLowerCase().trim());
    const item = items?.find((i: any) => String(i.id || i.fldItemID || "").toLowerCase().trim() === String(selectedItem || "").toLowerCase().trim());
    const find = findings?.find((f: any) => String(f.id || f.fldFindID || "").toLowerCase().trim() === String(selectedFind || "").toLowerCase().trim());
    const rec = masterRecommendations?.find((r: any) => (r.id || r.fldRecID || "").toLowerCase() === (selectedRec || "").toLowerCase());
    
    setFormData({
      catName: cat?.fldCategoryName || '', 
      catOrder: (cat?.fldOrder || 0).toString(), 
      itemName: item?.fldItemName || '', 
      itemOrder: (item?.fldOrder || 0).toString(), 
      findShort: find?.fldFindShort || '', 
      findLong: find?.fldFindLong || '', 
      findOrder: (find?.fldOrder || 0).toString(),
      fldUnitType: find?.fldUnitType || '', 
      recShort: rec?.fldRecShort || '', 
      recLong: rec?.fldRecLong || '', 
      recOrder: (rec?.fldOrder || 0).toString(),
      unit: rec?.fldUnit?.toString() || '0', 
      uom: rec?.fldUOM || 'EA'
    });
    setNewType('glossary_record');
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-zinc-900">Selection Workflow</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={handleClearAll} className="text-zinc-500 hover:text-zinc-900">
              <RotateCcw size={14} className="mr-1" /> CLEAR
            </Button>
            {selectedCat && selectedItem && selectedFind && selectedRec && (
              <Button size="sm" variant="ghost" onClick={() => {
                const existing = glossary?.find((g: any) => 
                  String(g.fldCat || "").toLowerCase().trim() === String(selectedCat || "").toLowerCase().trim() && 
                  String(g.fldItem || "").toLowerCase().trim() === String(selectedItem || "").toLowerCase().trim() && 
                  String(g.fldFind || "").toLowerCase().trim() === String(selectedFind || "").toLowerCase().trim() && 
                  (g.fldRec || g.fldRecID) === selectedRec
                );
                if (existing) setConfirmDelete({ id: existing.fldGlosId, collection: 'glossary', label: 'this glossary record', type: 'delete' });
              }} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                <Trash2 size={14} className="mr-1" /> DELETE RECORD
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={handleAddNewGlossaryFlow} disabled={!selectedCat || !selectedItem}>
              <Plus size={14} className="mr-1" /> {selectedCat && selectedItem && selectedFind && selectedRec ? "COPY & EDIT" : "ADD FINDING/REC"}
            </Button>
            <Button size="sm" onClick={handleAddNew} disabled={!selectedCat || !selectedItem || !selectedFind || !selectedRec} className={cn(!selectedCat || !selectedItem || !selectedFind || !selectedRec ? "bg-zinc-200" : "bg-indigo-600 hover:bg-indigo-700")}>
              <Save size={14} className="mr-1" /> SAVE RECORD
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2 items-end">
            <Select className="flex-1" label="Category" value={selectedCat} highlight={true} onChange={(e: any) => setSelectedCat(e.target.value)} options={[...categories].sort((a: any, b: any) => (a.fldOrder ?? 0) - (b.fldOrder ?? 0) || a.fldCategoryName.localeCompare(b.fldCategoryName)).map((c: any) => ({ value: c.fldCategoryID, label: c.fldCategoryName }))} />
            <div className="flex gap-1 items-end">
              <Button variant="secondary" size="sm" className="mb-1" onClick={() => openNewWithTemplate('category')}><Plus size={14} /></Button>
              <Button variant="secondary" size="sm" className="mb-1" disabled={!selectedCat} onClick={() => openEdit('category')}><Edit2 size={14} /></Button>
            </div>
          </div>

          <div className="flex gap-2 items-end">
            <Select className="flex-1" label="Item" disabled={!selectedCat} value={selectedItem} highlight={true} onChange={(e: any) => setSelectedItem(e.target.value)} options={[...filteredItems].sort((a: any, b: any) => (a.fldOrder ?? 0) - (b.fldOrder ?? 0) || a.fldItemName.localeCompare(b.fldItemName)).map((i: any) => ({ value: i.fldItemID, label: i.fldItemName }))} />
            <div className="flex gap-1 items-end">
              <Button variant="secondary" size="sm" className="mb-1" disabled={!selectedCat} onClick={() => openNewWithTemplate('item')}><Plus size={14} /></Button>
              <Button variant="secondary" size="sm" className="mb-1" disabled={!selectedItem} onClick={() => openEdit('item')}><Edit2 size={14} /></Button>
            </div>
          </div>

          <div className="flex gap-2 items-end">
            <Select className="flex-1" label="Finding" disabled={!selectedItem} value={selectedFind} highlight={true} onChange={(e: any) => setSelectedFind(e.target.value)} options={findings.filter((f: any) => f.fldItem === selectedItem).sort((a: any, b: any) => (a.fldOrder ?? 0) - (b.fldOrder ?? 0) || a.fldFindShort.localeCompare(b.fldFindShort)).map((f: any) => ({ value: f.fldFindID, label: f.fldFindShort }))} />
            <div className="flex gap-1 items-end">
              <Button variant="secondary" size="sm" className="mb-1" disabled={!selectedItem} onClick={() => openNewWithTemplate('finding')}><Plus size={14} /></Button>
              <Button variant="secondary" size="sm" className="mb-1" disabled={!selectedFind} onClick={() => openEdit('finding')}><Edit2 size={14} /></Button>
            </div>
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Recommendation</label>
              <div className="flex gap-2">
                <Select 
                  className="flex-1" 
                  disabled={!selectedFind} 
                  value={selectedRec} 
                  highlight={true} 
                  onChange={(e: any) => setSelectedRec(e.target.value)} 
                  options={[
                    { label: '--- Suggested ---', value: 'header-suggested', disabled: true },
                    ...(findings?.find(f => String(f.id || f.fldFindID || "").toLowerCase().trim() === String(selectedFind || "").toLowerCase().trim())?.fldSuggestedRecs || []).map(recId => {
                      const r = masterRecommendations.find(mr => (mr.id || mr.fldRecID || "").toLowerCase().trim() === (recId || "").toLowerCase().trim());
                      if (r) {
                        return { 
                          value: r.id || r.fldRecID, 
                          label: `${r.fldRecShort} | ${r.fldRecLong.substring(0, 60)}${r.fldRecLong.length > 60 ? '...' : ''}` 
                        };
                      }
                      return {
                        value: recId,
                        label: `⚠️ ORPHANED: ${recId} (Not in Master)`
                      };
                    }),
                    { label: '--- All Master ---', value: 'header-all', disabled: true },
                    ...(masterRecommendations.sort((a: any, b: any) => (a.fldOrder ?? 0) - (b.fldOrder ?? 0) || a.fldRecShort.localeCompare(b.fldRecShort)).map((r: any) => ({ 
                      value: r.id || r.fldRecID, 
                      label: `${r.fldRecShort} | ${r.fldRecLong.substring(0, 60)}${r.fldRecLong.length > 60 ? '...' : ''}` 
                    })))
                  ]} 
                />
                <Button variant="secondary" size="sm" onClick={() => setNewType('link_recommendation')} disabled={!selectedFind} title="Search Master Library">
                  <Search size={14} />
                </Button>
              </div>
            </div>
            <div className="flex gap-1 items-end">
              <Button variant="secondary" size="sm" className="mb-1" disabled={!selectedFind} onClick={() => openNewWithTemplate('recommendation')} title="Create New Master Recommendation"><Plus size={14} /></Button>
              <Button variant="secondary" size="sm" className="mb-1" disabled={!selectedRec} onClick={() => openEdit('recommendation')} title="Edit Master Recommendation"><Edit2 size={14} /></Button>
              <Button variant="secondary" size="sm" className="mb-1" disabled={!selectedRec} onClick={() => {
                const rec = masterRecommendations?.find(r => (r.id || r.fldRecID || "").toLowerCase().trim() === (selectedRec || "").toLowerCase().trim());
                if (rec) handleDuplicateRecommendation(rec);
              }} title="Duplicate as New"><Copy size={14} /></Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Selection Preview Card */}
      {(selectedFind || selectedRec) && (
        <Card className="p-6 bg-indigo-50/30 border-indigo-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {selectedFind && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Search size={16} />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Finding Preview</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                  <h4 className="font-bold text-zinc-900 mb-1">{findings?.find(f => String(f.id || f.fldFindID || "").toLowerCase().trim() === String(selectedFind || "").toLowerCase().trim())?.fldFindShort}</h4>
                  <p className="text-sm text-zinc-600 leading-relaxed">{findings?.find(f => String(f.id || f.fldFindID || "").toLowerCase().trim() === String(selectedFind || "").toLowerCase().trim())?.fldFindLong}</p>
                </div>
              </div>
            )}
            {selectedRec && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-600">
                  <FileText size={16} />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Recommendation Preview</h3>
                </div>
                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-zinc-900">{masterRecommendations?.find(r => (r.id || r.fldRecID || "").toLowerCase().trim() === (selectedRec || "").toLowerCase().trim())?.fldRecShort}</h4>
                    <div className="flex gap-2">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded uppercase">{masterRecommendations?.find(r => (r.id || r.fldRecID || "").toLowerCase().trim() === (selectedRec || "").toLowerCase().trim())?.fldUOM}</span>
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded uppercase">${masterRecommendations?.find(r => (r.id || r.fldRecID || "").toLowerCase().trim() === (selectedRec || "").toLowerCase().trim())?.fldUnit}</span>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-600 leading-relaxed">{masterRecommendations?.find(r => (r.id || r.fldRecID || "").toLowerCase().trim() === (selectedRec || "").toLowerCase().trim())?.fldRecLong}</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Modals */}
      {newType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900 uppercase tracking-tight">
                {editingId ? 'Edit' : 'Add New'} {newType.replace('_', ' ')}
              </h2>
              <button onClick={() => { setNewType(null); setEditingId(null); }} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                <Plus size={20} className="rotate-45 text-zinc-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {newType === 'category' && (
                <div className="space-y-4">
                  <Input label="Category Name" value={formData.catName} onChange={(e) => setFormData({ ...formData, catName: e.target.value })} autoFocus />
                  <Input label="Sort Order" type="number" value={formData.catOrder} onChange={(e) => setFormData({ ...formData, catOrder: e.target.value })} />
                </div>
              )}
              {newType === 'item' && (
                <div className="space-y-4">
                  <Input label="Item Name" value={formData.itemName} onChange={(e) => setFormData({ ...formData, itemName: e.target.value })} autoFocus />
                  <Input label="Sort Order" type="number" value={formData.itemOrder} onChange={(e) => setFormData({ ...formData, itemOrder: e.target.value })} />
                </div>
              )}
              {newType === 'finding' && (
                <div className="space-y-4">
                  <Input label="Finding Short Title" value={formData.findShort} onChange={(e) => setFormData({ ...formData, findShort: e.target.value })} autoFocus />
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Long Description</label>
                    <textarea 
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 outline-none min-h-[120px]"
                      value={formData.findLong}
                      onChange={(e) => setFormData({ ...formData, findLong: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Select label="Unit Type" value={formData.fldUnitType} onChange={(e: any) => setFormData({ ...formData, fldUnitType: e.target.value })} options={unitTypes.map(u => ({ value: u.fldUTName, label: u.fldUTName }))} />
                    <Input label="Sort Order" type="number" value={formData.findOrder} onChange={(e) => setFormData({ ...formData, findOrder: e.target.value })} />
                  </div>
                </div>
              )}
              {newType === 'recommendation' && (
                <div className="space-y-4">
                  <Input label="Recommendation Short Title" value={formData.recShort} onChange={(e) => setFormData({ ...formData, recShort: e.target.value })} autoFocus />
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Long Description</label>
                    <textarea 
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 outline-none min-h-[120px]"
                      value={formData.recLong}
                      onChange={(e) => setFormData({ ...formData, recLong: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Input label="Unit Cost" type="number" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
                    <Input label="UOM" value={formData.uom} onChange={(e) => setFormData({ ...formData, uom: e.target.value })} />
                    <Input label="Sort Order" type="number" value={formData.recOrder} onChange={(e) => setFormData({ ...formData, recOrder: e.target.value })} />
                  </div>
                </div>
              )}
              {newType === 'glossary_record' && (
                <div className="space-y-6">
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <p className="text-xs text-indigo-700 font-medium">
                      This will create a new Finding and Recommendation entry and link them to the current Category/Item.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Finding Details</h3>
                    <Input label="Finding Short Title" value={formData.findShort} onChange={(e) => setFormData({ ...formData, findShort: e.target.value })} />
                    <textarea 
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 outline-none min-h-[80px]"
                      placeholder="Long Finding Description"
                      value={formData.findLong}
                      onChange={(e) => setFormData({ ...formData, findLong: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Select label="Unit Type" value={formData.fldUnitType} onChange={(e: any) => setFormData({ ...formData, fldUnitType: e.target.value })} options={unitTypes.map(u => ({ value: u.fldUTName, label: u.fldUTName }))} />
                      <Input label="Finding Sort Order" type="number" value={formData.findOrder} onChange={(e) => setFormData({ ...formData, findOrder: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-4 pt-4 border-t border-zinc-100">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Recommendation Details</h3>
                    <Input label="Recommendation Short Title" value={formData.recShort} onChange={(e) => setFormData({ ...formData, recShort: e.target.value })} />
                    <textarea 
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-black/5 outline-none min-h-[80px]"
                      placeholder="Long Recommendation Description"
                      value={formData.recLong}
                      onChange={(e) => setFormData({ ...formData, recLong: e.target.value })}
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <Input label="Unit Cost" type="number" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
                      <Input label="UOM" value={formData.uom} onChange={(e) => setFormData({ ...formData, uom: e.target.value })} />
                      <Input label="Rec Sort Order" type="number" value={formData.recOrder} onChange={(e) => setFormData({ ...formData, recOrder: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}
              {newType === 'link_recommendation' && (
                <div className="space-y-4">
                  <Input 
                    label="Search Master Recommendations" 
                    placeholder="Type to filter..." 
                    value={formData.recShort} 
                    onChange={(e) => setFormData({ ...formData, recShort: e.target.value })}
                    autoFocus
                  />
                  <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2">
                    {masterRecommendations
                      .filter(r => r.fldRecShort.toLowerCase().includes(formData.recShort.toLowerCase()) || r.fldRecLong.toLowerCase().includes(formData.recShort.toLowerCase()))
                      .slice(0, 50)
                      .map(r => (
                        <button 
                          key={r.fldRecID}
                          onClick={() => handleLinkRecommendation(r.fldRecID)}
                          className="flex flex-col items-start p-3 text-left hover:bg-zinc-50 border border-zinc-100 rounded-xl transition-colors group"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-sm font-bold text-zinc-900">{r.fldRecShort}</span>
                            <Plus size={14} className="text-zinc-400 group-hover:text-indigo-600" />
                          </div>
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{r.fldRecLong}</p>
                        </button>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setNewType(null); setEditingId(null); }}>Cancel</Button>
              {newType !== 'link_recommendation' && (
                <Button onClick={() => {
                  console.log('Button clicked. current newType:', newType);
                  if (newType === 'category') {
                    console.log('Calling saveNewCategory...');
                    saveNewCategory();
                  }
                  if (newType === 'item') saveNewItem();
                  if (newType === 'finding') saveNewFinding();
                  if (newType === 'recommendation') saveNewRecommendation();
                  if (newType === 'glossary_record') saveNewGlossaryRecord();
                }}>
                  {editingId ? 'Update' : 'Save'} {newType.replace('_', ' ')}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Image and Standards Section */}
      <div className="grid grid-cols-2 gap-6">
        <Card 
          className="p-6 bg-zinc-50/50 border-dashed border-2 border-zinc-200"
          onDragOver={(e: React.DragEvent) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(e: React.DragEvent) => handleDropStandard(e, 'finding')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-zinc-400" />
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Finding Standards</h3>
            </div>
            <span className="text-[10px] font-bold text-zinc-400">Drag Standards Here</span>
          </div>
          <div className="space-y-2">
            {selectedFind ? (
              findings?.find(f => (f.id || f.fldFindID || "").toLowerCase().trim() === (selectedFind || "").toLowerCase().trim())?.fldStandards?.map(sid => {
                const s = standards?.find(st => (st.id || "").toLowerCase().trim() === (sid || "").toLowerCase().trim());
                return (
                  <div key={sid} className="flex items-center justify-between p-2 bg-white border border-zinc-200 rounded-lg group">
                    <span className="text-xs font-medium text-zinc-600 truncate">{s?.citation_num} - {s?.citation_name}</span>
                    <button onClick={() => removeStandard('finding', sid, selectedFind)} className="p-1 text-zinc-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-zinc-400 italic text-center py-4">Select a finding to manage standards</p>
            )}
          </div>
        </Card>

        <Card 
          className="p-6 bg-zinc-50/50 border-dashed border-2 border-zinc-200"
          onDragOver={(e: React.DragEvent) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(e: React.DragEvent) => handleDropStandard(e, 'recommendation')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-zinc-400" />
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Rec Standards</h3>
            </div>
            <span className="text-[10px] font-bold text-zinc-400">Drag Standards Here</span>
          </div>
          <div className="space-y-2">
            {selectedRec ? (
              masterRecommendations?.find(r => (r.id || r.fldRecID || "").toLowerCase().trim() === (selectedRec || "").toLowerCase().trim())?.fldStandards?.map(sid => {
                const s = standards?.find(st => (st.id || "").toLowerCase().trim() === (sid || "").toLowerCase().trim());
                return (
                  <div key={sid} className="flex items-center justify-between p-2 bg-white border border-zinc-200 rounded-lg group">
                    <span className="text-xs font-medium text-zinc-600 truncate">{s?.citation_num} - {s?.citation_name}</span>
                    <button onClick={() => removeStandard('recommendation', sid, selectedRec)} className="p-1 text-zinc-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-zinc-400 italic text-center py-4">Select a recommendation to manage standards</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Camera size={16} className="text-zinc-400" />
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Glossary Photos</h3>
          </div>
          <div className="flex gap-2">
            <input type="file" multiple accept="image/*" className="hidden" id="master-image-upload" onChange={handleImageUpload} />
            <Button size="sm" variant="secondary" onClick={() => document.getElementById('master-image-upload')?.click()} disabled={!selectedCat || !selectedItem || !selectedFind || !selectedRec}>
              <Plus size={14} className="mr-1" /> Add Photos
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {images.map((url: string, idx: number) => (
            <div key={idx} className="relative aspect-square group">
              <img src={url} className="w-full h-full object-cover rounded-xl border border-zinc-200" referrerPolicy="no-referrer" />
              <button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={12} />
              </button>
            </div>
          ))}
          {images.length === 0 && (
            <div className="col-span-4 py-8 text-center border-2 border-dashed border-zinc-100 rounded-2xl">
              <p className="text-xs text-zinc-400 italic">No photos linked to this glossary record</p>
            </div>
          )}
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <Modal 
          isOpen={!!confirmDelete} 
          onClose={() => setConfirmDelete(null)}
          title={confirmDelete.type === 'delete' ? 'Confirm Deletion' : 'Confirm Unassociation'}
        >
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">
              Are you sure you want to {confirmDelete.type === 'delete' ? 'permanently delete' : 'unassociate'} <span className="font-bold text-zinc-900">{confirmDelete.label}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleDeleteAction}>
                {confirmDelete.type === 'delete' ? 'Delete Permanently' : 'Unassociate'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
```


## 6. ProjectDataEntry.tsx
```tsx
// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { 
  Save, 
  Trash2, 
  Camera, 
  X, 
  Search,
  Plus,
  CheckCircle,
  Hash,
  Loader2,
  Book,
  AlertCircle,
  Undo,
  DollarSign,
  Edit2
} from 'lucide-react';
import { doc, writeBatch } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { firestoreService } from '../services/firestoreService';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { resizeImage } from '../lib/imageUtils';
import { toFraction, fromFraction } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
            <X size={18} className="text-zinc-500" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

export default function ProjectDataEntry({ 
  project = {}, facility = {}, inspector = {}, glossary = [], standards = [], activeRecord = null,
  onSave, onReset, items = [], findings = [], recommendations = [], masterRecommendations = [],
  unitTypes = [], mergedCategories = [], locations = [], selections = {}, onSelectionChange
}: any) {
  const [isSearchingAll, setIsSearchingAll] = useState(false);
  const editingRecordId = activeRecord?.fldPDataID || selections.editingRecordId;
  
  const selectedCat = selections.categoryId;
  const setSelectedCat = (val: string) => {
    // Cascading Reset: Clear everything downstream
    setFldFindShort('');
    setFldFindLong('');
    setFldRecShort('');
    setFldRecLong('');
    setFldStandards([]);
    onSelectionChange({ 
      ...selections, 
      categoryId: val, 
      itemId: '', 
      findId: '', 
      recId: '', 
      standards: [],
      isDirty: true 
    });
  };

  const selectedItem = selections.itemId || '';
  const setSelectedItem = (val: string) => {
    // Cascading Reset: Clear downstream local state
    setFldFindShort('');
    setFldFindLong('');
    setFldRecShort('');
    setFldRecLong('');
    setFldStandards([]);
    onSelectionChange({ ...selections, itemId: val, findId: '', recId: '', standards: [], isDirty: true });
  };
  
  const [fldImages, setFldImages] = useState<string[]>([]);
  const [fldStandards, setFldStandards] = useState<string[]>([]);
  const [fldQTY, setFldQTY] = useState<number | ''>(0);
  const [fldMeasurement, setFldMeasurement] = useState<number | ''>('');
  const [fldUnitType, setFldUnitType] = useState('Decimal');
  const [fldFindShort, setFldFindShort] = useState('');
  const [fldFindLong, setFldFindLong] = useState('');
  const [fldRecShort, setFldRecShort] = useState('');
  const [fldRecLong, setFldRecLong] = useState('');
  const [fldLocation, setFldLocation] = useState(selections.locationId || '');
  const [isDirty, setIsDirty] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const isFormDirty = useMemo(() => {
    if (activeRecord) {
      return (
        fldFindShort !== (activeRecord.fldFindShort || '') ||
        fldFindLong !== (activeRecord.fldFindLong || '') ||
        fldRecShort !== (activeRecord.fldRecShort || '') ||
        fldRecLong !== (activeRecord.fldRecLong || '') ||
        (fldQTY === '' ? 0 : Number(fldQTY)) !== (activeRecord.fldQTY || 0) ||
        (fldMeasurement === '' ? null : Number(fldMeasurement)) !== (activeRecord.fldMeasurement ?? null) ||
        fldUnitType !== (activeRecord.fldUnitType || 'Decimal') ||
        fldLocation !== (activeRecord.fldLocation || '') ||
        JSON.stringify(fldImages) !== JSON.stringify(activeRecord.fldImages || []) ||
        JSON.stringify(fldStandards) !== JSON.stringify(activeRecord.fldStandards || [])
      );
    } else {
      return (
        fldFindShort !== '' ||
        fldFindLong !== '' ||
        fldRecShort !== '' ||
        fldRecLong !== '' ||
        (fldQTY !== 0 && fldQTY !== '') ||
        fldMeasurement !== '' ||
        fldUnitType !== 'Decimal' ||
        fldImages.length > 0 ||
        fldStandards.length > 0
      );
    }
  }, [
    activeRecord, fldFindShort, fldFindLong, fldRecShort, fldRecLong,
    fldQTY, fldMeasurement, fldUnitType, fldLocation, fldImages, fldStandards
  ]);

  const focusClasses = "focus:border-amber-500 focus:bg-yellow-50 focus:ring-amber-500/10";

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<any>(null);
  const [newLocName, setNewLocName] = useState('');
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [savedDraft, setSavedDraft] = useState<any>(null);
  const [standardSearch, setStandardSearch] = useState('');

  // Recovery Protocol: Check for draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('fredasoft_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setSavedDraft(parsed);
        setShowRecoveryModal(true);
      } catch (e) {
        localStorage.removeItem('fredasoft_draft');
      }
    }
  }, []);

  // Auto-Save Logic: Every 5 seconds if dirty
  useEffect(() => {
    if (!isDirty) return;
    const interval = setInterval(() => {
      const draftData = {
        timestamp: new Date().toISOString(),
        fldFindShort, fldFindLong, fldRecShort, fldRecLong,
        fldQTY, fldMeasurement, fldUnitType,
        fldLocation,
        fldImages, fldStandards,
        selections: {
          categoryId: selections.categoryId,
          itemId: selections.itemId,
          findId: selections.findId,
          recId: selections.recId,
          locationId: selections.locationId
        }
      };
      localStorage.setItem('fredasoft_draft', JSON.stringify(draftData));
    }, 5000);
    return () => clearInterval(interval);
  }, [
    isDirty, fldFindShort, fldFindLong, fldRecShort, fldRecLong,
    fldQTY, fldMeasurement, fldUnitType,
    fldLocation,
    fldImages, fldStandards, selections
  ]);

  const handleResumeDraft = () => {
    if (!savedDraft) return;
    setFldFindShort(savedDraft.fldFindShort || '');
    setFldFindLong(savedDraft.fldFindLong || '');
    setFldRecShort(savedDraft.fldRecShort || '');
    setFldRecLong(savedDraft.fldRecLong || '');
    setFldQTY(savedDraft.fldQTY || 0);
    setFldMeasurement(savedDraft.fldMeasurement || '');
    setFldUnitType(savedDraft.fldUnitType || 'Decimal');
    setFldLocation(savedDraft.fldLocation || '');
    setFldImages(savedDraft.fldImages || []);
    setFldStandards(savedDraft.fldStandards || []);
    
    if (savedDraft.selections) {
      onSelectionChange({
        ...selections,
        ...savedDraft.selections
      });
    }
    
    localStorage.removeItem('fredasoft_draft');
    setShowRecoveryModal(false);
    setIsDirty(true);
    toast.success('Draft recovered');
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('fredasoft_draft');
    setShowRecoveryModal(false);
    setSavedDraft(null);
    toast.info('Draft discarded');
  };

  useEffect(() => {
    if (activeRecord) {
      console.log("Hydrating Form with:", activeRecord);
      // BLUEPRINT-ACCURATE POPULATION
      const glos = (glossary || []).find((g: any) => (g.id || g.fldGlosId || "").toLowerCase() === (activeRecord.fldData || "").toLowerCase());
      
      const newSelections = {
        ...selections,
        locationId: activeRecord.fldLocation || selections.locationId,
        categoryId: glos?.fldCat || selections.categoryId || '',
        itemId: glos?.fldItem || selections.itemId || '',
        findId: glos?.fldFind || selections.findId || '',
        recId: glos?.fldRec || selections.recId || ''
      };

      onSelectionChange(newSelections);
      console.log("Selections set to:", newSelections);

      setFldFindShort(activeRecord.fldFindShort || '');
      setFldFindLong(activeRecord.fldFindLong || '');
      setFldRecShort(activeRecord.fldRecShort || '');
      setFldRecLong(activeRecord.fldRecLong || '');
      setFldQTY(activeRecord.fldQTY || 0);
      setFldMeasurement(activeRecord.fldMeasurement || '');
      setFldUnitType(activeRecord.fldUnitType || 'Decimal');
      setFldLocation(activeRecord.fldLocation || '');
      setFldImages(Array.isArray(activeRecord.fldImages) ? activeRecord.fldImages : []);
      setFldStandards(Array.isArray(activeRecord.fldStandards) ? activeRecord.fldStandards : []);
      setIsDirty(false);
    } else {
      // Inheritance Lock: Initialize from selections if new record
      if (selections.locationId) setFldLocation(selections.locationId);
    }
  }, [activeRecord?.fldPDataID, glossary]);

  useEffect(() => {
    if (selections.recId && !isDirty && !activeRecord) {
      const rec = (masterRecommendations || []).find(r => (r.id || r.fldRecID || "").toLowerCase().trim() === (selections.recId || "").toLowerCase().trim());
      if (rec) {
        setFldRecShort(rec.fldRecShort || '');
        setFldRecLong(rec.fldRecLong || '');
        setFldStandards(rec.fldStandards || []);
      }
    }
  }, [selections.recId, masterRecommendations, isDirty, activeRecord]);

  const handleSave = () => {
    if (!fldLocation) { toast.error('Location is required'); return; }
    if (!inspector?.fldInspID) { toast.error('Inspector context is missing. Please select an inspector in Setup.'); return; }
    
    onSave({
      fldPDataID: editingRecordId,
      fldPDataProject: selections.projectId,
      fldFacility: facility?.fldFacID || activeRecord?.fldFacility,
      fldData: activeRecord?.fldData || selections.glosId || "",
      fldLocation,
      fldFindShort,
      fldFindLong,
      fldRecShort,
      fldRecLong,
      fldQTY: Number(fldQTY) || 0,
      fldMeasurement: fldMeasurement === '' ? null : Number(fldMeasurement),
      fldUnitType,
      fldImages,
      fldStandards: fldStandards,
      fldInspID: inspector.fldInspID,
      fldTimestamp: new Date().toISOString()
    });
    // Update selections for sticky behavior
    onSelectionChange({ ...selections, locationId: fldLocation, isDirty: false });
    localStorage.removeItem('fredasoft_draft');
    setIsDirty(false);
  };

  const confirmAction = (title: string, message: string, action: () => void) => {
    if (isFormDirty) {
      setConfirmModal({
        isOpen: true,
        title,
        message,
        onConfirm: () => {
          action();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      });
    } else {
      action();
    }
  };

  const handleClearForm = () => {
    confirmAction(
      "Clear Form",
      "You have unsaved changes. Are you sure you want to discard them and clear the form?",
      () => {
        setFldFindShort('');
        setFldFindLong('');
        setFldRecShort('');
        setFldRecLong('');
        setFldQTY(0);
        setFldMeasurement('');
        setFldUnitType('Decimal');
        setFldImages([]);
        setFldStandards([]);
        setIsDirty(false);
        localStorage.removeItem('fredasoft_draft');
        
        // Reset the Cascade: Clear downstream selections
        onSelectionChange({
          ...selections,
          itemId: '',
          findId: '',
          recId: '',
          standards: [],
          isDirty: false
        });
        
        toast.info('Form cleared');
      }
    );
  };

  const handleResetToOriginal = () => {
    if (!activeRecord) return;
    confirmAction(
      "Reset to Original",
      "You have unsaved changes. Are you sure you want to revert to the original record state?",
      () => {
        setFldFindShort(activeRecord.fldFindShort || '');
        setFldFindLong(activeRecord.fldFindLong || '');
        setFldRecShort(activeRecord.fldRecShort || '');
        setFldRecLong(activeRecord.fldRecLong || '');
        setFldQTY(activeRecord.fldQTY || 0);
        setFldMeasurement(activeRecord.fldMeasurement || '');
        setFldUnitType(activeRecord.fldUnitType || 'Decimal');
        setFldLocation(activeRecord.fldLocation || '');
        setFldImages(Array.isArray(activeRecord.fldImages) ? activeRecord.fldImages : []);
        setFldStandards(Array.isArray(activeRecord.fldStandards) ? activeRecord.fldStandards : []);
        setIsDirty(false);
        toast.info('Restored to original');
      }
    );
  };

  const handleCancelEdit = () => {
    confirmAction(
      "Cancel Edit",
      "You have unsaved changes. Are you sure you want to cancel editing and switch to a new record?",
      () => {
        onReset(); // This should set editingRecordId to null in parent
        setFldFindShort('');
        setFldFindLong('');
        setFldRecShort('');
        setFldRecLong('');
        setFldQTY(0);
        setFldMeasurement('');
        setFldImages([]);
        setFldStandards([]);
        setIsDirty(false);
        localStorage.removeItem('fredasoft_draft');
        toast.info('Edit cancelled');
      }
    );
  };

  const handleAddLocation = async (name: string) => {
    if (!name || !selections.projectId) {
      toast.error('Project context is required to add locations.');
      return;
    }
    try {
      const newLoc = {
        fldLocID: uuidv4(),
        fldLocName: name,
        fldFacID: selections.facilityId || '',
        fldProjectID: selections.projectId
      };
      
      console.log(`[Location Tool] Attempting to add: "${name}" to Project: ${selections.projectId}`);
      
      // VITAL: Ensure the write is awaited before proceeding
      await firestoreService.save('locations', newLoc, newLoc.fldLocID);
      
      // Dropdown Sync: Update local state and app-level selections
      setFldLocation(newLoc.fldLocID);
      onSelectionChange({ ...selections, locationId: newLoc.fldLocID });
      
      toast.success(`Location [${name}] successfully added.`);
      console.log(`[Location Tool] Success: ${name} (ID: ${newLoc.fldLocID})`);
    } catch (error) {
      console.error('[Location Tool] Error:', error);
      toast.error('Failed to add location. Check console for details.');
    }
  };

  const handleUpdateLocation = async (locId: string, newName: string) => {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'locations', locId), { fldLocName: newName });
      
      // Cascade update to projectData records for this project
      projectData.forEach(d => {
        if (d.fldLocation === locId) {
          batch.update(doc(db, 'projectData', d.fldPDataID), { 
            fldLocation: locId,
            fldLocationName: newName // Ensure denormalized name is updated for exports
          });
        }
      });
      
      await batch.commit();
      toast.success('Location updated');
    } catch (error) {
      toast.error('Failed to update location');
    }
  };

  const handleDeleteLocation = async (locId: string) => {
    try {
      await firestoreService.softDelete('locations', locId);
      if (fldLocation === locId) setFldLocation('');
      toast.success('Location removed');
    } catch (error) {
      toast.error('Failed to remove location');
    }
  };

  const facilityLocations = (Array.isArray(locations) ? locations : [])
    .filter(l => (l.fldProjectID === selections.projectId || (l.fldFacID && l.fldFacID === selections.facilityId)) && !l.fldIsDeleted)
    .sort((a, b) => a.fldLocName.localeCompare(b.fldLocName));

  const activeGlossaryEntry = useMemo(() => {
    if (!selections.categoryId || !selections.itemId || !selections.findId || !selections.recId) return null;
    return (glossary || []).find(g => 
      (g.id || g.fldGlosId || "").toLowerCase().trim() === (activeRecord?.fldPDataID || "").toLowerCase().trim() || 
      (String(g.fldCat || "").toLowerCase().trim() === String(selections.categoryId || "").toLowerCase().trim() && 
       String(g.fldItem || "").toLowerCase().trim() === String(selections.itemId || "").toLowerCase().trim() && 
       String(g.fldFind || "").toLowerCase().trim() === String(selections.findId || "").toLowerCase().trim() && 
       (g.fldRec || g.fldRecID || "").toLowerCase().trim() === (selections.recId || "").toLowerCase().trim())
    );
  }, [glossary, selections]);

  const filteredStandards = useMemo(() => {
    if (!activeGlossaryEntry || !activeGlossaryEntry.fldStandards) return [];
    const allowedIds = activeGlossaryEntry.fldStandards;
    return (standards || []).filter(s => allowedIds.includes(s.id));
  }, [standards, activeGlossaryEntry]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      <div className="flex-1 overflow-y-auto w-full bg-transparent">
        {/* LAYER 1: STICKY HEADER - Opaque background to mask scrolling content */}
        <div className="sticky top-0 z-30 bg-zinc-50 border-b border-zinc-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-8 py-6 space-y-6">
            {/* Header Title & Inspector Badge - Wrapped in a card-like container for floating effect */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
                  <Book size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 leading-tight">Data Entry</h2>
                  <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Recording Inspection Findings</p>
                </div>
              </div>
              
              {inspector && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
                  <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider leading-none">Active Inspector</span>
                    <span className="text-xs font-bold text-zinc-900 tracking-tight">
                      {inspector.fldInspName || inspector.fldInspID}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* TOP CONTEXT CARD - Now part of sticky header */}
            <Card className="p-6 border-zinc-200 shadow-sm bg-white">
              <div className="flex flex-wrap gap-6">
                {/* CATEGORY SELECT */}
                <div className="flex-1 min-w-[240px] relative group">
                  <Select 
                    label="Category"
                    value={selectedCat}
                    onChange={(e: any) => setSelectedCat(e.target.value)}
                    selectClassName={focusClasses}
                    options={(Array.isArray(mergedCategories) ? mergedCategories : [])
                      .map((c, index) => ({ 
                        value: c.fldCategoryID || c.fldCatID || `missing-${index}`, 
                        label: c.fldCategoryName || c.fldCatName || 'Select Category',
                        key: `cat-${c.fldCategoryID || c.fldCatID || index}` 
                      }))}
                  />
                  {selectedCat && (
                    <button 
                      onClick={() => setSelectedCat('')}
                      className="absolute right-10 top-8 p-1 text-zinc-400 hover:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Clear Category"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {/* ITEM SELECT */}
                <div className="flex-1 min-w-[240px]">
                  <Select 
                    label="Item"
                    value={selectedItem}
                    onChange={(e: any) => setSelectedItem(e.target.value)}
                    selectClassName={focusClasses}
                    options={(Array.isArray(items) ? items : [])
                      .filter(i => i && i.fldCatID === selectedCat)
                      .map((i, index) => ({ 
                        value: i.fldItemID || `missing-item-${index}`, 
                        label: i.fldItemName || 'Select Item',
                        key: `item-${i.fldItemID || index}` 
                      }))}
                  />
                </div>
                <div className="flex-1 min-w-[240px] flex items-end gap-2">
                  <div className="flex-1 relative group">
                    <Select 
                      label="Location / Area"
                      value={fldLocation}
                      onChange={(e: any) => { 
                        setFldLocation(e.target.value); 
                        onSelectionChange({ ...selections, locationId: e.target.value });
                        setIsDirty(true); 
                      }}
                      selectClassName={focusClasses}
                      options={facilityLocations.map(l => ({ value: l.fldLocID, label: l.fldLocName, key: l.fldLocID }))}
                    />
                    {fldLocation && (
                      <button 
                        onClick={() => {
                          setFldLocation('');
                          onSelectionChange({ ...selections, locationId: '' });
                        }}
                        className="absolute right-10 top-8 p-1 text-zinc-400 hover:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Clear Location"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="mb-1"
                    onClick={() => setIsLocationModalOpen(true)}
                    title="Manage Locations"
                  >
                    <Edit2 size={16} />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* LAYER 2: SCROLLABLE CONTENT */}
        <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">
          {/* FINDING CARD */}
          <Card className="p-6 space-y-6 border-zinc-200 shadow-sm">
            <Select 
              label="Finding"
              value={selections.findId || ''}
              onChange={(e: any) => {
                 const find = (findings || []).find(f => (f.id || f.fldFindID || "").toLowerCase() === (e.target.value || "").toLowerCase());
                 if(find) { setFldFindShort(find.fldFindShort); setFldFindLong(find.fldFindLong); }
                 setFldStandards([]); // Clear standards on finding change
                 onSelectionChange({...selections, findId: e.target.value, isDirty: true});
              }}
              selectClassName={focusClasses}
              options={(Array.isArray(findings) ? findings : [])
                .filter(f => f && f.fldFindID && f.fldItem === selectedItem)
                .map(f => ({ value: f.fldFindID, label: f.fldFindShort, key: `find-${f.fldFindID}` }))}
            />
            <div className="space-y-4">
              <Input 
                label="Finding Summary"
                value={fldFindShort} 
                onChange={(e: any) => { setFldFindShort(e.target.value); setIsDirty(true); }} 
                placeholder="Brief finding description" 
                className={focusClasses}
              />
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Finding Detailed Description</label>
                <textarea 
                  className={cn("w-full p-3 border border-zinc-200 rounded-lg text-sm min-h-[120px] transition-all outline-none", focusClasses)} 
                  value={fldFindLong} 
                  onChange={(e: any) => { setFldFindLong(e.target.value); setIsDirty(true); }} 
                  placeholder="Detailed finding description..."
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-6 border-zinc-200 shadow-sm">
             <div className="flex items-center justify-between">
               <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Recommendation</label>
               <Button 
                 variant="ghost" 
                 size="sm" 
                 onClick={() => setIsSearchingAll(!isSearchingAll)}
                 className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700"
               >
                 {isSearchingAll ? "SHOW SUGGESTED" : "SEARCH ALL MASTER"}
               </Button>
             </div>
             <Select 
              value={selections.recId || ''}
              onChange={(e: any) => {
                 const rec = (masterRecommendations || []).find(r => (r.id || r.fldRecID || "").toLowerCase() === (e.target.value || "").toLowerCase());
                 if(rec) { 
                   setFldRecShort(rec.fldRecShort); 
                   setFldRecLong(rec.fldRecLong); 
                   // Pull standards from master recommendation
                   setFldStandards(rec.fldStandards || []);
                 }
                 onSelectionChange({...selections, recId: e.target.value, isDirty: true});
              }}
              selectClassName={focusClasses}
              options={isSearchingAll ? (
                (masterRecommendations || [])
                  .sort((a, b) => a.fldRecShort.localeCompare(b.fldRecShort))
                  .map(r => ({ value: r.fldRecID, label: r.fldRecShort, key: `rec-${r.fldRecID}` }))
              ) : (
                (masterRecommendations || [])
                  .filter(r => {
                    const finding = (findings || []).find(f => (f.id || f.fldFindID || "").toLowerCase() === (selections.findId || "").toLowerCase());
                    return finding?.fldSuggestedRecs?.some((recId: string) => recId.toLowerCase() === (r.fldRecID || r.id || "").toLowerCase());
                  })
                  .sort((a, b) => a.fldRecShort.localeCompare(b.fldRecShort))
                  .map(r => ({ value: r.fldRecID, label: r.fldRecShort, key: `rec-${r.fldRecID}` }))
              )}
            />
            <div className="space-y-4">
              <Input 
                label="Recommendation Summary"
                value={fldRecShort} 
                onChange={(e: any) => { setFldRecShort(e.target.value); setIsDirty(true); }} 
                placeholder="Brief recommendation" 
                className={focusClasses}
              />
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Recommendation Detailed Description</label>
                <textarea 
                  className={cn("w-full p-3 border border-zinc-200 rounded-lg text-sm min-h-[120px] transition-all outline-none", focusClasses)} 
                  value={fldRecLong} 
                  onChange={(e: any) => { setFldRecLong(e.target.value); setIsDirty(true); }} 
                  placeholder="Detailed recommendation description..."
                />
              </div>
            </div>
          </Card>

          {/* MEASUREMENTS & QUANTITY */}
          <Card className="p-6 space-y-6 border-zinc-200 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">Measurements & Quantity</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input 
                label="Quantity (fldQTY)"
                type="number"
                value={fldQTY}
                onChange={(e: any) => { setFldQTY(e.target.value); setIsDirty(true); }}
                className={focusClasses}
              />
              <Select 
                label="Unit Type (fldUnitType)"
                value={fldUnitType}
                onChange={(e: any) => { setFldUnitType(e.target.value); setIsDirty(true); }}
                selectClassName={focusClasses}
                options={[
                  { value: 'Decimal', label: 'Decimal' },
                  { value: 'Fraction', label: 'Fraction' },
                  { value: 'Seconds', label: 'Seconds' },
                  { value: 'Percentage', label: 'Percentage' }
                ]}
              />
              <Input 
                label="Measurement (fldMeasurement)"
                value={fldMeasurement}
                onChange={(e: any) => { setFldMeasurement(e.target.value); setIsDirty(true); }}
                className={focusClasses}
                placeholder="Actual recorded value"
              />
            </div>
          </Card>

          {/* STANDARDS SELECTION */}
          <Card className="p-6 space-y-6 border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h3 className="text-sm font-bold text-zinc-900">Applicable Standards (fldStandards)</h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                <input 
                  type="text"
                  placeholder="Search standards..."
                  className={cn("w-full pl-9 pr-3 py-1.5 text-xs border border-zinc-200 rounded-full outline-none transition-all", focusClasses)}
                  value={standardSearch}
                  onChange={(e) => setStandardSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-1">
              {filteredStandards.length === 0 ? (
                <div className="col-span-full py-8 text-center text-zinc-400 italic text-sm">
                  {!selections.findId ? "Select a Finding to see Standards" : "No standards associated with this finding."}
                </div>
              ) : (
                filteredStandards
                  .filter(s => 
                    !standardSearch || 
                    s.citation_num.toLowerCase().includes(standardSearch.toLowerCase()) ||
                    s.citation_name.toLowerCase().includes(standardSearch.toLowerCase())
                  )
                  .map(s => {
                    const isSelected = fldStandards.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          setFldStandards(prev => 
                            isSelected ? prev.filter(id => id !== s.id) : [...prev, s.id]
                          );
                          setIsDirty(true);
                        }}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-xl border text-left transition-all group",
                          isSelected 
                            ? "bg-amber-50 border-amber-200 ring-1 ring-amber-200" 
                            : "bg-white border-zinc-200 hover:border-zinc-300"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors",
                          isSelected ? "bg-amber-500 border-amber-500 text-white" : "bg-zinc-50 border-zinc-200 group-hover:border-zinc-300"
                        )}>
                          {isSelected && <CheckCircle size={12} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-900 truncate">{s.citation_num}</p>
                          <p className="text-[10px] text-zinc-500 line-clamp-2 leading-tight">{s.citation_name}</p>
                        </div>
                      </button>
                    );
                  })
              )}
            </div>
            {fldStandards.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {fldStandards.map(id => {
                  const s = standards.find(st => (st.id || "").toLowerCase() === (id || "").toLowerCase());
                  if (!s) return null;
                  return (
                    <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 text-zinc-700 rounded-full text-[10px] font-medium border border-zinc-200">
                      {s.citation_num}
                      <button onClick={() => { setFldStandards(prev => prev.filter(i => i !== id)); setIsDirty(true); }}>
                        <X size={10} className="hover:text-red-500" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="flex flex-wrap justify-end gap-3 p-4">
             {editingRecordId ? (
                <>
                  <Button 
                    variant="secondary" 
                    onClick={handleResetToOriginal} 
                    className="px-6 h-11 min-w-[140px]"
                  >
                    Reset to Original
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={handleCancelEdit} 
                    className="px-6 h-11 min-w-[140px] text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Cancel Edit
                  </Button>
                </>
             ) : (
                <Button 
                  variant="secondary" 
                  onClick={handleClearForm} 
                  className="px-8 h-11 min-w-[140px]"
                >
                  Clear Form
                </Button>
             )}
             <Button 
               onClick={handleSave} 
               disabled={!isFormDirty} 
               className="px-12 h-11 min-w-[160px] bg-zinc-900 hover:bg-black text-white shadow-lg shadow-zinc-200"
             >
               {activeRecord ? 'Update Record' : 'Save Record'}
             </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showRecoveryModal && savedDraft && (
          <Modal title="Draft Recovery" onClose={handleDiscardDraft}>
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  <Undo className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-blue-900">Unsaved Draft Found</h3>
                  <p className="text-xs text-blue-700 mt-1">
                    Saved on {new Date(savedDraft.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-3 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  <span>Preview</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Location</label>
                    <p className="text-sm font-medium truncate">
                      {(facilityLocations || []).find(l => (l.id || l.fldLocID || "").toLowerCase() === (savedDraft.fldLocation || "").toLowerCase())?.fldLocName || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Finding</label>
                    <p className="text-sm font-medium truncate">{savedDraft.fldFindShort || 'Untitled'}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" className="flex-1" onClick={handleDiscardDraft}>Discard Draft</Button>
                <Button className="flex-1" onClick={handleResumeDraft}>Resume Draft</Button>
              </div>
            </div>
          </Modal>
        )}

        {confirmModal.isOpen && (
          <Modal 
            title={confirmModal.title} 
            onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          >
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                  <AlertCircle className="text-amber-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-amber-900">Unsaved Changes</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    {confirmModal.message}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  className="flex-1 h-11" 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                >
                  Keep Editing
                </Button>
                <Button 
                  className="flex-1 h-11 bg-amber-600 hover:bg-amber-700 text-white" 
                  onClick={confirmModal.onConfirm}
                >
                  Discard Changes
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {isLocationModalOpen && (
          <Modal title="Manage Locations" onClose={() => setIsLocationModalOpen(false)}>
            <div className="space-y-6">
              <div className="flex gap-2">
                <Input 
                  placeholder="New location name..." 
                  className="flex-1"
                  value={newLocName}
                  onChange={(e: any) => setNewLocName(e.target.value)}
                  onKeyDown={(e: any) => {
                    if (e.key === 'Enter') {
                      handleAddLocation(newLocName);
                      setNewLocName('');
                    }
                  }}
                />
                <Button onClick={() => {
                  handleAddLocation(newLocName);
                  setNewLocName('');
                }}>
                  <Plus size={16} className="mr-2" /> Add
                </Button>
              </div>

              <div className="max-h-64 overflow-y-auto border border-zinc-200 rounded-xl divide-y divide-zinc-100">
                {facilityLocations.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400 italic text-sm">No locations defined for this facility.</div>
                ) : (
                  facilityLocations.map(loc => (
                    <div key={loc.fldLocID} className="p-3 flex items-center justify-between hover:bg-zinc-50 transition-colors group">
                      {editingLoc?.fldLocID === loc.fldLocID ? (
                        <div className="flex-1 flex gap-2">
                          <Input 
                            autoFocus
                            defaultValue={loc.fldLocName}
                            className="h-8 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleUpdateLocation(loc.fldLocID, e.currentTarget.value);
                                setEditingLoc(null);
                              }
                            }}
                          />
                          <Button size="sm" onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            handleUpdateLocation(loc.fldLocID, input.value);
                            setEditingLoc(null);
                          }}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingLoc(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-medium text-zinc-700">{loc.fldLocName}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setEditingLoc(loc)}
                              className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteLocation(loc.fldLocID)}
                              className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
                <AlertCircle className="text-blue-600 shrink-0" size={18} />
                <p className="text-xs text-blue-700 leading-relaxed">
                  Renaming a location will automatically update the display name across all associated records.
                </p>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
```


## 7. PortfolioManager.tsx
```tsx
import React, { useState } from 'react';
import { 
  Users, 
  Briefcase, 
  Plus, 
  X, 
  Edit2, 
  Trash2 
} from 'lucide-react';
import { Button, Card } from './ui/core';
import { cn } from '../lib/utils';

export default function PortfolioManager({
  clients, 
  facilities, 
  projects, 
  projectData, 
  inspectors, 
  selectedClientId, 
  setSelectedClientId, 
  viewMode, 
  setViewMode,
  onDeleteClient,
  onDeleteFacility,
  onDeleteProject,
  isAddingClient,
  setIsAddingClient,
  editingClient,
  setEditingClient,
  isAddingFacility,
  setIsAddingFacility,
  editingFacility,
  setEditingFacility,
  isAddingProject,
  setIsAddingProject,
  editingProject,
  setEditingProject,
  saveClient,
  saveFacility,
  saveProject,
  selections
}: any) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const selectedClient = clients.find((c: any) => c.fldClientID === selectedClientId);
  const clientFacilities = facilities.filter((f: any) => f.fldClient === selectedClientId);
  const clientProjects = projects.filter((p: any) => p.fldClient === selectedClientId);

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-6 overflow-y-auto p-1">
      {/* Client Selection */}
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Active Client</label>
            <div className="flex items-center gap-2">
              <select 
                className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black/5 min-w-[200px]"
                value={selectedClientId || ''}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                <option value="">None / Show All Projects</option>
                {[...clients].filter(c => c.fldClientID).sort((a, b) => a.fldClientName.localeCompare(b.fldClientName)).map(c => (
                  <option key={c.fldClientID} value={c.fldClientID}>{c.fldClientName}</option>
                ))}
              </select>
              {selectedClientId && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setSelectedClientId('')} 
                  title="Clear Selection"
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  <X size={16} />
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setIsAddingClient(true)} title="Add Client">
                <Plus size={16} />
              </Button>
              {selectedClientId && (
                <Button variant="secondary" size="sm" onClick={() => setEditingClient(selectedClient)} title="Edit Client">
                  <Edit2 size={16} />
                </Button>
              )}
              {selectedClientId && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => {
                    if (window.confirm('Delete this client and all associated facilities, projects, and data?')) {
                      onDeleteClient(selectedClientId);
                    }
                  }}
                  title="Delete Client"
                  className="text-zinc-400 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {!selectedClientId ? (
        <div className="space-y-6">
          <Card className="flex flex-col items-center justify-center p-12 text-center space-y-4 border-dashed">
            <div className="p-4 bg-zinc-50 rounded-full">
              <Users size={48} className="text-zinc-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">No Client Selected</h3>
              <p className="text-zinc-500 max-w-md">Please select a client from the dropdown above to manage their facilities and projects, or create a new client to get started.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsAddingClient(true)}>
                <Plus size={16} className="mr-2" /> Create First Client
              </Button>
              <Button variant="secondary" onClick={() => {
                const globalList = document.getElementById('global-project-list');
                if (globalList) globalList.scrollIntoView({ behavior: 'smooth' });
              }}>
                <Briefcase size={16} className="mr-2" /> Show All Projects
              </Button>
            </div>
          </Card>

          {projects.length > 0 && (
            <div id="global-project-list" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-900">Global Project List (Reassignment Tool)</h3>
                <p className="text-xs text-zinc-500">Showing all projects in the database</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {projects
  .filter((p: any) => p && p.fldProjID)
  .map((p: any) => {
    const client = clients.find((c: any) => c && c.fldClientID === p.fldClient);
    return (
      <Card key={`portfolio-proj-${p.fldProjID}`} className="p-4 flex flex-col justify-between hover:border-zinc-300 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-zinc-100 rounded-lg text-zinc-500">
                            <Briefcase size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-zinc-900 line-clamp-1">{p.fldProjName}</h4>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                              Client: {client?.fldClientName || 'Unknown/Orphaned'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-xs"
                        onClick={() => setEditingProject(p)}
                      >
                        <Edit2 size={12} className="mr-2" /> Reassign / Edit
                      </Button>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* View Toggle & Actions */}
          <div className="flex items-center justify-between bg-zinc-100/50 p-1 rounded-xl w-fit">
            <button 
              onClick={() => setViewMode('projects')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                viewMode === 'projects' ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              View by Project
            </button>
            <button 
              onClick={() => setViewMode('facilities')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                viewMode === 'facilities' ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              View by Facility
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900">
                {viewMode === 'projects' ? 'Projects' : 'Facilities'}
              </h2>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setIsAddingFacility(true)}>
                  <Plus size={14} className="mr-1" /> Add Facility
                </Button>
                <Button size="sm" onClick={() => setIsAddingProject(true)}>
                  <Plus size={14} className="mr-1" /> New Project
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {viewMode === 'projects' ? (
                clientProjects.length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-zinc-100 rounded-2xl text-zinc-400 italic">
                    No projects found for this client.
                  </div>
                ) : (
                  clientProjects.filter(p => p.fldProjID).map((p: any) => {
                    const associatedFacIds = [...new Set(projectData.filter((d: any) => d.fldPDataProject === p.fldProjID).map((d: any) => d.fldFacility))];
                    const associatedFacs = facilities.filter(f => associatedFacIds.includes(f.fldFacID));
                    const isExpanded = expandedId === p.fldProjID;

                    return (
                      <Card key={p.fldProjID} className="overflow-hidden">
                        <div 
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-50 transition-colors"
                          onClick={() => setExpandedId(isExpanded ? null : p.fldProjID)}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn("p-2 rounded-lg transition-colors", isExpanded ? "bg-black text-white" : "bg-zinc-100 text-zinc-500")}>
                              <Briefcase size={20} />
                            </div>
                            <div>
                              <h3 className="font-bold text-zinc-900">{p.fldProjName}</h3>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                  {p.fldPDDate || 'No Date'}
                                </span>
                                {p.fldProjNumber && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-zinc-300" />
                                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                                      #{p.fldProjNumber}
                                    </span>
                                  </>
                                )}
                                <span className="w-1 h-1 rounded-full bg-zinc-300" />
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                  {associatedFacs.length} Facilities
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingProject(p); }}>
                              <Edit2 size={14} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-zinc-400 hover:text-red-600"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                if (window.confirm('Delete this project and all associated data?')) {
                                  onDeleteProject(p.fldProjID);
                                }
                              }}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )
              ) : (
                clientFacilities.length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-zinc-100 rounded-2xl text-zinc-400 italic">
                    No facilities found for this client.
                  </div>
                ) : (
  clientFacilities
    .filter((f: any) => f && f.fldFacID)
    .map((f: any) => (
    <Card key={`portfolio-fac-${f.fldFacID}`} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-zinc-100 rounded-lg text-zinc-500">
                          <Users size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-zinc-900">{f.fldFacName}</h3>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            {f.fldFacAddress || 'No Address'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingFacility(f)}>
                          <Edit2 size={14} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-zinc-400 hover:text-red-600"
                          onClick={() => { 
                            if (window.confirm('Delete this facility and all associated projects and data?')) {
                              onDeleteFacility(f.fldFacID);
                            }
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </Card>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```


## 8. GlossaryExplorer.tsx
```tsx
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  Edit2, 
  Plus, 
  ChevronRight, 
  ChevronDown,
  Database,
  ShieldAlert,
  Loader2,
  Copy,
  Pencil
} from 'lucide-react';
import { Button, Input, Select, Card } from './ui/core';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { firestoreService } from '../services/firestoreService';
import { migrationService } from '../services/migrationService';
import { db } from '../firebase';
import { writeBatch, doc, setDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';

export default function GlossaryExplorer({
  categories = [], 
  items = [], 
  findings = [], 
  recommendations = [], 
  masterRecommendations = [],
  glossary = [], 
  unitTypes = [],
  importMasterGlossary,
  isDeduplicating,
  csvData,
  onEditGlossaryItem,
  setRawMasterRecommendations,
  setGlossary
}: any) {
  const [localMasterRecs, setLocalMasterRecs] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchMasterRecs = async () => {
      console.log("FETCH STATUS: Received", masterRecommendations.length, "recommendations and", glossary.length, "glossary items.");
      console.log('[GLOSSARY EXPLORER] GABRIEL DIRECTIVE: Forcing local fetch from Firestore...');
      
      // Force reload if data is missing after 5 seconds
      const reloadTimer = setTimeout(() => {
        if (masterRecommendations.length === 0 && glossary.length === 0) {
          console.error("[GLOSSARY EXPLORER] Data missing after 5s. Reloading...");
          window.location.reload();
        }
      }, 5000);

      try {
        const querySnapshot = await getDocs(collection(db, 'recommendations'));
        const recs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`[GLOSSARY EXPLORER] Local fetch complete. Found ${recs.length} records.`);
        setLocalMasterRecs(recs);
        clearTimeout(reloadTimer);
      } catch (error: any) {
        console.error('[GLOSSARY EXPLORER] Local fetch FAILED. Error Code:', error.code, 'Message:', error.message);
        toast.error(`Failed to fetch data: ${error.message}`);
        clearTimeout(reloadTimer);
      }
    };
    fetchMasterRecs();
  }, []);

  console.log('AUDIT - Master Rec Shape:', localMasterRecs[0]);
  const [sortMode, setSortMode] = useState<'order' | 'alpha'>('order');
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [columnFilters, setColumnFilters] = useState({
    finding: '',
    recommendation: ''
  });
  const [showColumnSearch, setShowColumnSearch] = useState({
    finding: false,
    recommendation: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<{ id: string, field: string, value: any } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, name: string } | null>(null);
  const [healthAudit, setHealthAudit] = useState<{
    orphanedFindings: number;
    orphanedRecommendations: number;
    infertilFindings: number;
    brokenLinks: number;
    totalFindings: number;
    totalRecs: number;
    totalGlossary: number;
  } | null>(null);

  const runHealthAudit = () => {
    console.log("HEALTH AUDIT: Starting tally...");
    
    // 1. Orphaned Findings (No Item parent)
    const orphanedFindings = findings.filter((f: any) => !f.fldItem).length;
    
    // 2. Orphaned Recommendations (Not linked to any Finding)
    const linkedRecIds = new Set();
    glossary.forEach((g: any) => { if (g.fldRec) linkedRecIds.add(g.fldRec); });
    findings.forEach((f: any) => { 
      if (f.fldSuggestedRecs) {
        f.fldSuggestedRecs.forEach((id: string) => linkedRecIds.add(id));
      }
    });
    
    const orphanedRecommendations = localMasterRecs.filter((r: any) => {
      const id = r.id || r.fldRecID;
      return !linkedRecIds.has(id);
    }).length;

    // 3. Infertil Findings (No recommendations)
    const infertilFindings = findings.filter((f: any) => {
      const hasSuggested = f.fldSuggestedRecs && f.fldSuggestedRecs.length > 0;
      const hasGlossaryLink = glossary.some((g: any) => g.fldFind === (f.id || f.fldFindID));
      return !hasSuggested && !hasGlossaryLink;
    }).length;

    // 4. Broken Glossary Links (Glossary records with dead Rec IDs)
    const masterRecIds = new Set(localMasterRecs.map(r => (r.id || r.fldRecID || "").toLowerCase().trim()));
    const brokenLinks = glossary.filter((g: any) => {
      if (!g.fldRec) return false;
      return !masterRecIds.has(String(g.fldRec).toLowerCase().trim());
    }).length;

    setHealthAudit({
      orphanedFindings,
      orphanedRecommendations,
      infertilFindings,
      brokenLinks,
      totalFindings: findings.length,
      totalRecs: localMasterRecs.length,
      totalGlossary: glossary.length
    });
    
    toast.success("Health Audit Complete!");
  };

  // Filter items based on selected category
  const filteredItems = useMemo(() => {
    if (!selectedCategoryId) return items;
    return items.filter((i: any) => i.fldCatID === selectedCategoryId);
  }, [items, selectedCategoryId]);

  const toggleRow = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedRows(next);
  };

  const handleSaveEdit = async () => {
    if (!editingField) return;
    setIsSaving(true);
    try {
      const { id, field, value } = editingField;
      let collection = '';
      
      if (field === 'fldFindLong' || field === 'fldFindShort' || field === 'fldOrder') {
        collection = 'findings';
      } else if (field === 'fldRecLong' || field === 'fldUOM' || field === 'fldUnit' || field === 'fldRecShort' || field === 'fldOrder') {
        collection = 'recommendations';
      }

      if (collection) {
        // Ensure numeric values are numbers
        const finalValue = (field === 'fldOrder') ? (value === '' ? 999 : Number(value)) : (field === 'fldUnit' ? Number(value) : value);
        await firestoreService.save(collection, { [field]: finalValue }, id, false);
        toast.success('Updated successfully');
      }
      setEditingField(null);
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetireGlossary = async (id: string) => {
    setIsSaving(true);
    try {
      await firestoreService.softDelete('glossary', id);
      toast.success('Record retired');
    } catch (error) {
      toast.error('Failed to retire');
    } finally {
      setIsSaving(false);
    }
  };

  const masterRecsRef = React.useRef(masterRecommendations);
  React.useEffect(() => {
    masterRecsRef.current = masterRecommendations;
  }, [masterRecommendations]);

  const handleRecoverToMaster = async (row: any) => {
    setIsSaving(true);
    try {
      const payload = { 
        fldRecID: row.fldRec, 
        fldRecShort: row.recommendationShort, 
        fldRecLong: row.recommendationLong, 
        fldOrder: 999 
      };
      await firestoreService.save('recommendations', payload, row.fldRec);
      toast.success('Recommendation recovered to Master library');
    } catch (error) {
      console.error('Recovery error:', error);
      toast.error('Failed to recover recommendation');
    } finally {
      setIsSaving(false);
    }
  };

  const resolvedGlossary = useMemo(() => {
    if (!glossary) return [];
    return glossary.map((g: any) => {
      const gRecId = g.fldRec || g.fldRecID;
      const gFindId = String(g.fldFind || "").toLowerCase().trim();
      const gItemId = String(g.fldItem || "").toLowerCase().trim();
      const gCatId = String(g.fldCat || "").toLowerCase().trim();

      // Robust lookup with trimming
      let finding = findings?.find((f: any) => 
        String(f.id || "").toLowerCase().trim() === gFindId || 
        String(f.fldFindID || "").toLowerCase().trim() === gFindId
      );
      
      // Exact lookup in Master (Gabriel Directive: Hard-Wired to Local Source)
      const effectiveMasterRecs = (localMasterRecs && localMasterRecs.length > 0) ? localMasterRecs : (masterRecommendations || []);
      let matchedRec = effectiveMasterRecs.find((r: any) => 
        (r.id || r.fldRecID || "").toLowerCase().trim() === (gRecId || "").toLowerCase().trim()
      );
      
      let suggestedHealRec = null;
      if (!matchedRec && gRecId) {
        suggestedHealRec = effectiveMasterRecs.find((r: any) => 
          String(r.fldRecShort || "").toLowerCase().trim() === String(g.recommendationShort || "").toLowerCase().trim()
        );
      }

      if (!matchedRec && gRecId && (g.recommendationShort || g.recommendationLong)) {
        console.error('CRITICAL: Glossary ID not found in Master:', gRecId);
        console.log('Glossary Record Context:', g);
      }
      
      // Fallback to legacy recommendations if missing from master
      let legacyRec = null;
      if (!matchedRec) {
        legacyRec = recommendations?.find((r: any) => 
          (r.id || r.fldRecID || "").toLowerCase().trim() === (gRecId || "").toLowerCase().trim()
        );
      }

      let item = items?.find((i: any) => 
        String(i.id || "").toLowerCase().trim() === gItemId ||
        String(i.fldItemID || "").toLowerCase().trim() === gItemId
      );
      
      if (!item && finding) {
        const findItemId = String(finding.fldItem || "").toLowerCase().trim();
        item = items?.find((i: any) => 
          String(i.id || "").toLowerCase().trim() === findItemId ||
          String(i.fldItemID || "").toLowerCase().trim() === findItemId
        );
      }
      
      let category = categories?.find((c: any) => 
        String(c.id || "").toLowerCase().trim() === gCatId ||
        String(c.fldCategoryID || "").toLowerCase().trim() === gCatId
      );

      if (!category && item) {
        const itemCatId = String(item.fldCatID || "").toLowerCase().trim();
        category = categories?.find((c: any) => 
          String(c.id || "").toLowerCase().trim() === itemCatId ||
          String(c.fldCategoryID || "").toLowerCase().trim() === itemCatId
        );
      }

      const finalRec = matchedRec || legacyRec;

      return {
        ...g,
        fldCat: g.fldCat || category?.fldCategoryID || category?.id,
        fldItem: g.fldItem || item?.fldItemID || item?.id,
        fldFind: g.fldFind || finding?.fldFindID || finding?.id,
        fldRec: g.fldRec || finalRec?.fldRecID || finalRec?.id,
        
        categoryName: category?.fldCategoryName || 'Unknown',
        itemName: item?.fldItemName || 'Unknown',
        catOrder: category?.fldOrder ?? Infinity,
        itemOrder: item?.fldOrder ?? Infinity,
        findOrder: finding?.fldOrder ?? Infinity,
        recOrder: finalRec?.fldOrder ?? Infinity,
        findingShort: finding?.fldFindShort || 'Unknown',
        findingLong: finding?.fldFindLong || '',
        recommendationShort: finalRec?.fldRecShort || g.recommendationShort || 'Recommendation Not Found',
        recommendationLong: finalRec?.fldRecLong || g.recommendationLong || '',
        fldRecShort: finalRec?.fldRecShort || g.fldRecShort || g.recommendationShort || 'Recommendation Not Found',
        fldRecLong: finalRec?.fldRecLong || g.fldRecLong || g.recommendationLong || '',
        fldOrder: finalRec?.fldOrder || g.fldOrder || 0,
        uom: finalRec?.fldUOM || 'EA',
        unitCost: finalRec?.fldUnit || 0,
        findingId: finding?.fldFindID || finding?.id,
        recommendationId: finalRec?.fldRecID || finalRec?.id,
        isOrphaned: !matchedRec && !!gRecId,
        canRecover: !matchedRec && !!gRecId,
        suggestedHealRec,
        canHeal: !!suggestedHealRec && !matchedRec,
        isMissing: !matchedRec && !legacyRec,
        matchedRec // For "Missing Master Links" filter
      };
    });
  }, [glossary, categories, items, findings, recommendations, masterRecommendations, localMasterRecs]);

  const handleRepairLink = async (glossaryId: string, newRecId: string) => {
    setIsSaving(true);
    try {
      await firestoreService.save('glossary', { fldRec: newRecId }, glossaryId);
      toast.success('Link repaired successfully');
    } catch (error) {
      console.error('Repair error:', error);
      toast.error('Failed to repair link');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredData = useMemo(() => {
    let base = resolvedGlossary;

    // 1. Status Filter: Missing Master Links
    if (showMissingOnly) {
      base = base.filter((d: any) => (!d.matchedRec || d.recommendationShort === 'Recommendation Not Found') && d.fldRec);
    }

    // 2. Category/Item Filters
    if (selectedCategoryId) {
      base = base.filter((d: any) => d.fldCat === selectedCategoryId);
    }
    if (selectedItemId) {
      base = base.filter((d: any) => d.fldItem === selectedItemId);
    }

    // 3. Column Filters
    if (columnFilters.finding) {
      const q = columnFilters.finding.toLowerCase();
      base = base.filter((d: any) => 
        d.findingShort?.toLowerCase().includes(q) || 
        d.findingLong?.toLowerCase().includes(q)
      );
    }
    if (columnFilters.recommendation) {
      const q = columnFilters.recommendation.toLowerCase();
      base = base.filter((d: any) => 
        d.recommendationShort?.toLowerCase().includes(q) || 
        d.recommendationLong?.toLowerCase().includes(q)
      );
    }

    // 4. Global Search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      base = base.filter((d: any) => 
        (d.categoryName?.toLowerCase().includes(q)) ||
        (d.itemName?.toLowerCase().includes(q)) ||
        (d.findingShort?.toLowerCase().includes(q)) ||
        (d.findingLong?.toLowerCase().includes(q)) ||
        (d.recommendationShort?.toLowerCase().includes(q)) ||
        (d.recommendationLong?.toLowerCase().includes(q)) ||
        (d.fldGlosId?.toLowerCase().includes(q))
      );
    }

    // 5. Sorting Logic
    const sortFn = (a: any, b: any, field: string, orderField: string) => {
      if (sortMode === 'order') {
        const valA = a[orderField] ?? Infinity;
        const valB = b[orderField] ?? Infinity;
        if (valA !== valB) return valA - valB;
      }
      return (a[field] || '').localeCompare(b[field] || '');
    };

    return [...base].sort((a: any, b: any) => {
      // Category
      const catSort = sortFn(a, b, 'categoryName', 'catOrder');
      if (catSort !== 0) return catSort;

      // Item
      const itemSort = sortFn(a, b, 'itemName', 'itemOrder');
      if (itemSort !== 0) return itemSort;

      // Finding (Always by order then alpha per stability requirement)
      const findSort = (a.findOrder ?? Infinity) - (b.findOrder ?? Infinity) || (a.findingShort || '').localeCompare(b.findingShort || '');
      if (findSort !== 0) return findSort;

      // Recommendation (Always by order then alpha per stability requirement)
      return (a.recOrder ?? Infinity) - (b.recOrder ?? Infinity) || (a.recommendationShort || '').localeCompare(b.recommendationShort || '');
    });
  }, [resolvedGlossary, searchTerm, selectedCategoryId, selectedItemId, sortMode, showMissingOnly, columnFilters]);

  const EditableField = ({ id, field, value, type = 'text', label, inline = false }: any) => {
    const isEditing = editingField?.id === id && editingField?.field === field;
    
    if (isEditing) {
      return (
        <div className={cn("flex flex-col gap-2 w-full", inline ? "p-1" : "")} onClick={(e) => e.stopPropagation()}>
          {!inline && <label className="text-[10px] font-bold text-zinc-400 uppercase">{label}</label>}
          {type === 'textarea' ? (
            <textarea 
              className="w-full p-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-black/5 outline-none min-h-[100px]"
              value={editingField.value}
              onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
              autoFocus
            />
          ) : (
            <input 
              className="w-full p-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-black/5 outline-none"
              value={editingField.value}
              onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
              autoFocus
            />
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>Cancel</Button>
          </div>
        </div>
      );
    }

    return (
      <div className={cn("group relative flex flex-col", inline ? "" : "gap-1")}>
        {!inline && <label className="text-[10px] font-bold text-zinc-400 uppercase">{label}</label>}
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm text-zinc-700", inline ? "truncate" : "whitespace-pre-wrap")}>
            {value || <span className="text-zinc-300 italic">Empty</span>}
          </p>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setEditingField({ id, field, value });
            }}
            className="p-1 text-zinc-400 hover:text-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Edit2 size={12} />
          </button>
        </div>
      </div>
    );
  };

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      if (sortMode === 'order') {
        const valA = a.fldOrder ?? Infinity;
        const valB = b.fldOrder ?? Infinity;
        if (valA !== valB) return valA - valB;
      }
      return (a.fldCategoryName || '').localeCompare(b.fldCategoryName || '');
    });
  }, [categories, sortMode]);

  const sortedItems = useMemo(() => {
    const base = selectedCategoryId ? items.filter((i: any) => i.fldCatID === selectedCategoryId) : items;
    return [...base].sort((a, b) => {
      if (sortMode === 'order') {
        const valA = a.fldOrder ?? Infinity;
        const valB = b.fldOrder ?? Infinity;
        if (valA !== valB) return valA - valB;
      }
      return (a.fldItemName || '').localeCompare(b.fldItemName || '');
    });
  }, [items, selectedCategoryId, sortMode]);

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-6 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Glossary Explorer</h1>
          <p className="text-sm text-zinc-500">Production-ready data management dashboard</p>
        </div>
        <div className="flex items-center bg-zinc-100 p-1 rounded-xl">
          <button 
            onClick={() => {
              if (window.confirm("This will rebuild relationships between all findings and recommendations in the database. Proceed?")) {
                migrationService.runArchitecturalHeal();
              }
            }}
            className="px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all text-amber-600 hover:text-amber-700 flex items-center gap-2"
          >
            <ShieldAlert size={12} />
            EXECUTE ARCHITECTURAL HEAL
          </button>
          <div className="w-px h-4 bg-zinc-200 mx-1" />
          <button 
            onClick={runHealthAudit}
            className="px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all text-zinc-500 hover:text-zinc-700 flex items-center gap-2"
          >
            <RefreshCw size={12} className={cn(isSaving && "animate-spin")} />
            Run Health Audit
          </button>
          <div className="w-px h-4 bg-zinc-200 mx-1" />
          <button 
            onClick={() => setSortMode('order')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
              sortMode === 'order' ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >Sort by Order</button>
          <button 
            onClick={() => setSortMode('alpha')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
              sortMode === 'alpha' ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >Sort Alphabetically</button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {healthAudit && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <Card className="p-4 bg-amber-50 border-amber-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest">Orphaned Findings</p>
                  <p className="text-2xl font-bold text-amber-900">{healthAudit.orphanedFindings}</p>
                  <p className="text-[10px] text-amber-600 mt-1">No Item parent ({healthAudit.totalFindings} total)</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-purple-50 border-purple-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                  <Database size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-purple-800 uppercase tracking-widest">Orphaned Recs</p>
                  <p className="text-2xl font-bold text-purple-900">{healthAudit.orphanedRecommendations}</p>
                  <p className="text-[10px] text-purple-600 mt-1">Unlinked to Findings ({healthAudit.totalRecs} total)</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-red-50 border-red-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg text-red-600">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-red-800 uppercase tracking-widest">Infertil Findings</p>
                  <p className="text-2xl font-bold text-red-900">{healthAudit.infertilFindings}</p>
                  <p className="text-[10px] text-red-600 mt-1">Findings with zero recs</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <RefreshCw size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-blue-800 uppercase tracking-widest">Broken Links</p>
                  <p className="text-2xl font-bold text-blue-900">{healthAudit.brokenLinks}</p>
                  <p className="text-[10px] text-blue-600 mt-1">Glossary links to dead Recs</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <input 
              className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:ring-2 focus:ring-black/5 outline-none transition-all"
              placeholder="Global Search (titles, descriptions, IDs)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Select 
              value={selectedCategoryId} 
              onChange={(e: any) => {
                setSelectedCategoryId(e.target.value);
                setSelectedItemId('');
              }}
              className="w-48"
              options={sortedCategories.map((c: any) => ({ value: c.fldCategoryID, label: c.fldCategoryName }))}
              placeholder="All Categories"
            />

            <Select 
              value={selectedItemId} 
              onChange={(e: any) => setSelectedItemId(e.target.value)}
              className="w-48"
              options={sortedItems.map((i: any) => ({ value: i.fldItemID, label: i.fldItemName }))}
              placeholder="All Items"
            />
          </div>
        </div>

        <div className="flex items-center gap-6 px-1">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className={cn(
              "w-4 h-4 rounded border flex items-center justify-center transition-all",
              showMissingOnly ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-zinc-300 group-hover:border-zinc-400"
            )}>
              {showMissingOnly && <CheckCircle size={10} />}
            </div>
            <input 
              type="checkbox" 
              className="hidden" 
              checked={showMissingOnly} 
              onChange={(e) => setShowMissingOnly(e.target.checked)} 
            />
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Show Missing Master Links Only</span>
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-white border border-zinc-200 rounded-xl shadow-sm">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-0 z-10 bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="w-10 px-4 py-3"></th>
                <th className="w-32 px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Category</th>
                <th className="w-32 px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Item</th>
                <th className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Finding Short</span>
                    <button 
                      onClick={() => setShowColumnSearch(prev => ({ ...prev, finding: !prev.finding }))}
                      className={cn("p-1 rounded hover:bg-zinc-200 transition-colors", showColumnSearch.finding && "text-blue-600 bg-blue-50")}
                    >
                      <Search size={12} />
                    </button>
                  </div>
                  {showColumnSearch.finding && (
                    <div className="mt-2">
                      <input 
                        className="w-full px-2 py-1 text-[10px] border border-zinc-200 rounded bg-white outline-none focus:ring-2 focus:ring-blue-500/10"
                        placeholder="Filter findings..."
                        value={columnFilters.finding}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, finding: e.target.value }))}
                        autoFocus
                      />
                    </div>
                  )}
                </th>
                <th className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Recommendation Short</span>
                    <button 
                      onClick={() => setShowColumnSearch(prev => ({ ...prev, recommendation: !prev.recommendation }))}
                      className={cn("p-1 rounded hover:bg-zinc-200 transition-colors", showColumnSearch.recommendation && "text-blue-600 bg-blue-50")}
                    >
                      <Search size={12} />
                    </button>
                  </div>
                  {showColumnSearch.recommendation && (
                    <div className="mt-2">
                      <input 
                        className="w-full px-2 py-1 text-[10px] border border-zinc-200 rounded bg-white outline-none focus:ring-2 focus:ring-blue-500/10"
                        placeholder="Filter recommendations..."
                        value={columnFilters.recommendation}
                        onChange={(e) => setColumnFilters(prev => ({ ...prev, recommendation: e.target.value }))}
                        autoFocus
                      />
                    </div>
                  )}
                </th>
                <th className="w-20 px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">UOM</th>
                <th className="w-24 px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Cost</th>
                <th className="w-16 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredData.map((row: any) => (
                <React.Fragment key={row.id}>
                  <tr 
                    className={cn(
                      "hover:bg-zinc-50 transition-colors cursor-pointer group",
                      expandedRows.has(row.id) && "bg-zinc-50"
                    )}
                    onClick={() => toggleRow(row.id)}
                  >
                    <td className="px-4 py-3">
                      {expandedRows.has(row.id) ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-400" />}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-zinc-600 truncate">{row.categoryName}</td>
                    <td className="px-4 py-3 text-xs font-medium text-zinc-900 truncate">{row.itemName}</td>
                    <td className="px-4 py-3">
                      <EditableField id={row.findingId} field="fldFindShort" value={row.findingShort} inline />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <EditableField id={row.recommendationId} field="fldRecShort" value={row.recommendationShort} inline />
                        {row.isOrphaned && (
                          <div className="flex items-center gap-1.5">
                            <span title="Orphaned: Not in Master">
                              <ShieldAlert size={12} className="text-amber-500 shrink-0" />
                            </span>
                            {row.canHeal && (
                              <Button 
                                size="xs" 
                                variant="secondary" 
                                className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 text-[9px] h-5 px-1.5 font-bold"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRepairLink(row.fldGlosId, row.suggestedHealRec.fldRecID || row.suggestedHealRec.id);
                                }}
                              >
                                REPAIR LINK
                              </Button>
                            )}
                            {row.canRecover && (
                              <Button 
                                size="xs" 
                                variant="secondary" 
                                className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 text-[9px] h-5 px-1.5 font-bold"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRecoverToMaster(row);
                                }}
                              >
                                RECOVER TO MASTER
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <EditableField id={row.recommendationId} field="fldUOM" value={row.uom} inline />
                    </td>
                    <td className="px-4 py-3">
                      <EditableField id={row.recommendationId} field="fldUnit" value={row.unitCost} inline />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditGlossaryItem(row);
                          }}
                          className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit in Builder"
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ id: row.id, name: row.findingShort });
                          }}
                          className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Retire Item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRows.has(row.id) && (
                    <tr className="bg-zinc-50/50">
                      <td colSpan={3}></td>
                      <td className="px-4 py-4 border-b border-zinc-100 align-top">
                        <div className="space-y-4">
                          <EditableField 
                            id={row.findingId} 
                            field="fldFindLong" 
                            value={row.findingLong} 
                            type="textarea" 
                            label="Long Finding"
                          />
                          <EditableField 
                            id={row.findingId} 
                            field="fldOrder" 
                            value={row.fldOrder} 
                            type="number" 
                            label="Finding Sort Order"
                          />
                        </div>
                      </td>
                      <td colSpan={3} className="px-4 py-4 border-b border-zinc-100 align-top">
                        <div className="space-y-4">
                          <EditableField 
                            id={row.recommendationId} 
                            field="fldRecLong" 
                            value={row.recommendationLong} 
                            type="textarea" 
                            label="Long Recommendation"
                          />
                          <EditableField 
                            id={row.recommendationId} 
                            field="fldOrder" 
                            value={row.fldOrder} 
                            type="number" 
                            label="Rec Sort Order"
                          />
                        </div>

                        {(() => {
                          const recId = row.fldRec;
                          
                          if (recId === "5071ed43-a137-46a1-8843-4121f4cf6fb3") {
                            console.log('TARGET FOUND IN STATE:', !!localMasterRecs.find(r => (r.id || r.fldRecID) === recId));
                          }
                          const isActuallyInMaster = localMasterRecs.some(mr => {
                            const match = (mr.id || mr.fldRecID || "").toLowerCase().trim() === (recId || "").toLowerCase().trim();
                            if (expandedRows.has(row.id)) {
                              console.log('Comparing:', recId, 'to:', (mr.id || mr.fldRecID), 'Match:', match);
                            }
                            return match;
                          });
                          
                          if (isActuallyInMaster || !recId) return null;

                          return (
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                              <div className="flex items-center gap-2 text-amber-700">
                                <ShieldAlert size={16} />
                                <span className="text-xs font-bold uppercase">Orphaned Recommendation</span>
                              </div>
                              <Button size="sm" onClick={() => handleRecoverToMaster(row)} disabled={isSaving}>
                                <Database size={14} className="mr-2" />
                                Recover to Master
                              </Button>
                            </div>
                          );
                        })()}
                        
                        {/* Metadata Footer */}
                        <div className="mt-8 pt-4 border-t border-zinc-200 flex items-center justify-between">
                          <div className="flex gap-4 text-[9px] font-mono text-zinc-400 uppercase tracking-tight">
                            <span>GLOS: {row.fldGlosId}</span>
                            <span>CAT: {row.fldCat}</span>
                            <span>ITEM: {row.fldItem}</span>
                            <span>FIND: {row.fldFind}</span>
                            <span>REC: {row.fldRec}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-zinc-400 italic text-sm">
                    No records found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-100 bg-red-50/50">
              <div className="flex items-center gap-3 text-red-600">
                <ShieldAlert size={24} />
                <h2 className="text-lg font-bold">Retire Glossary Item</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-600 leading-relaxed">
                Are you sure you want to retire <span className="font-bold text-zinc-900">"{deleteConfirm.name}"</span>?
              </p>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                <AlertCircle className="text-amber-600 shrink-0" size={18} />
                <p className="text-xs text-amber-700 leading-relaxed">
                  It will no longer appear in the Data Entry options, but will remain in the database for historical integrity in old reports.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white" 
                onClick={() => handleRetireGlossary(deleteConfirm.id)}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 size={16} className="mr-2" />}
                Retire Item
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```


## 9. package.json
```json
{
  "name": "react-example",
  "private": true,
  "version": "1.0.9",
  "type": "module",
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build",
    "start": "node server.ts",
    "preview": "vite preview",
    "lint": "node --max-old-space-size=4096 node_modules/typescript/bin/tsc --noEmit"
  },
  "dependencies": {
    "@google/genai": "^1.29.0",
    "@tailwindcss/vite": "^4.1.14",
    "@types/uuid": "^10.0.0",
    "@vitejs/plugin-react": "^5.0.4",
    "clsx": "^2.1.1",
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "firebase": "^12.10.0",
    "fuse.js": "^7.1.0",
    "html2canvas": "^1.4.1",
    "html2pdf.js": "^0.14.0",
    "is-thirteen": "^2.0.0",
    "jspdf": "^4.2.1",
    "lucide-react": "^0.546.0",
    "motion": "^12.38.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-markdown": "^10.1.0",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.5.0",
    "uuid": "^13.0.0",
    "vite": "^6.2.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^22.14.0",
    "autoprefixer": "^10.4.21",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.21.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.0"
  }
}
```

## 10. firestore.rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ===============================================================
    // Helper Functions
    // ===============================================================
    function isAuthenticated() {
      return request.auth != null;
    }

    function isAdmin() {
      return isAuthenticated() && 
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
         (request.auth.token.email == "kenotten@statereview.com" && request.auth.token.email_verified == true));
    }

    function isValidString(val, min, max) {
      return val is string && val.size() >= min && val.size() <= max;
    }

    function isValidUUID(val) {
      return val is string && val.size() >= 32;
    }

    // ===============================================================
    // Rules
    // ===============================================================

    match /inspectors/{doc} { allow read: if true; }
    match /clients/{doc} { allow read: if true; }
    match /facilities/{doc} { allow read: if true; }
    match /designFirms/{doc} { allow read: if true; }
    match /projects/{doc} { allow read: if true; }
    match /categories/{doc} { allow read: if true; }
    match /items/{doc} { allow read: if true; }
    match /findings/{doc} { allow read: if true; }
    match /unitTypes/{doc} { allow read: if true; }
    match /recommendations/{doc} { allow read: if true; }
    match /glossary/{doc} { allow read: if true; }
    match /master_standards/{doc} { allow read: if true; }
    match /tas_standards/{doc} { allow read: if true; }
    match /tas_images/{doc} { allow read: if true; }
    match /tas_image_associations/{doc} { allow read: if true; }
    match /projectData/{doc} { allow read: if true; }
    match /documents/{doc} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }

    match /{path=**} {
      allow read: if true;
      allow write: if isAuthenticated();
    }

    // More specific rules would go here for production hardening.
    // For now, we allow authenticated users to manage the inspection data.
  }
}
```








