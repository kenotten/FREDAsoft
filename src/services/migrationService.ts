import { 
  initializeApp, 
  deleteApp 
} from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc,
  arrayUnion,
  doc, 
  initializeFirestore, 
  collectionGroup,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { firestoreService } from './firestoreService';
import { Recommendation, UnitType } from '../types';

/**
 * ARCHITECTURAL HEALING & MIGRATION SERVICE
 * 
 * This service contains legacy migration and recovery scripts used during the 
 * transition from the Enterprise database to the local (default) database.
 * 
 * These functions are archived here for forensic auditability and potential 
 * future reuse.
 */

export const migrationService = {
  /**
   * TASK 43/44: Manual Migration of Glossary and Standards
   */
  async runManualMigration() {
    console.log("MIGRATION: Manual Migration started...");
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    const burnerAppName = "MigrationSilo_" + Date.now();
    const literalConfig = {
      projectId: "path-recovery",
      appId: "1:702924902097:web:2eca6b418a7c6055117ff0",
      apiKey: "AIzaSyDG5r2VGAVAk4jY7-v3FspSnYajSqoZ4Kw",
      authDomain: "path-recovery.firebaseapp.com",
      storageBucket: "path-recovery.appspot.com",
      messagingSenderId: "702924902097"
    };

    const sourceApp = initializeApp(literalConfig, burnerAppName);

    try {
      const sourceDb = initializeFirestore(sourceApp, {
        databaseId: 'freda-enterprise',
        experimentalForceLongPolling: true
      } as any);

      const targetedId = "43b6c195-f6e8-4caa-981d-8f6fcb113de9";
      const docRef = doc(sourceDb, "glossary", targetedId);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const allDocs = await getDocs(collection(sourceDb, "glossary"));
        for (const d of allDocs.docs) {
          await setDoc(doc(db, 'glossary', d.id), d.data());
        }

        const tasDocs = await getDocs(collection(sourceDb, "tas_standards"));
        for (const d of tasDocs.docs) {
          await setDoc(doc(db, 'tas_standards', d.id), d.data());
        }
        toast.success("Migration completed successfully!");
      } else {
        toast.error("Migration failed: Target document not found.");
      }

      await deleteApp(sourceApp);
    } catch (err) {
      console.error("SILO ERROR:", err);
      toast.error("Migration failed. See console.");
    }
  },

  /**
   * TASK 50: Deep-Path Discovery for Large Documents
   */
  async runDocumentRecovery() {
    console.log("MIGRATION: Document Recovery started (Deep Scan Mode)...");
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    const burnerAppName = "DocRecoverySilo_" + Date.now();
    const literalConfig = {
      projectId: "path-recovery",
      appId: "1:702924902097:web:2eca6b418a7c6055117ff0",
      apiKey: "AIzaSyDG5r2VGAVAk4jY7-v3FspSnYajSqoZ4Kw",
      authDomain: "path-recovery.firebaseapp.com",
      storageBucket: "path-recovery.appspot.com",
      messagingSenderId: "702924902097"
    };

    const sourceApp = initializeApp(literalConfig, burnerAppName);
    
    try {
      const sourceDb = initializeFirestore(sourceApp, {
        databaseId: 'freda-enterprise',
        experimentalForceLongPolling: true
      } as any);

      const results: any[] = [];
      
      try {
        const topSnap = await getDocs(collection(sourceDb, "documents"));
        results.push(...topSnap.docs);
      } catch (e) {}

      try {
        const groupSnap = await getDocs(collectionGroup(sourceDb, "documents"));
        groupSnap.docs.forEach(d => {
          if (!results.find(r => r.id === d.id)) results.push(d);
        });
      } catch (e) {}

      for (const d of results) {
        const data = d.data();
        try {
          await setDoc(doc(db, "documents", d.id), data);
        } catch (writeErr: any) {
          if (data.fldContent) {
            const { fldContent, ...lightData } = data;
            fldContent;
            await setDoc(doc(db, "documents", d.id), lightData);
          }
        }
      }

      await deleteApp(sourceApp);
      toast.success(`Successfully processed ${results.length} documents!`);
    } catch (err) {
      console.error("DOC RECOVERY ERROR:", err);
      toast.error("Document recovery failed.");
    }
  },

  /**
   * TASK 53: Project Skeleton Recovery (Excluding Narratives)
   */
  async runSkeletonSync() {
    console.log("MIGRATION: Skeleton Sync started...");
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    const burnerAppName = "SkeletonSyncSilo_" + Date.now();
    const literalConfig = {
      projectId: "path-recovery",
      appId: "1:702924902097:web:2eca6b418a7c6055117ff0",
      apiKey: "AIzaSyDG5r2VGAVAk4jY7-v3FspSnYajSqoZ4Kw",
      authDomain: "path-recovery.firebaseapp.com",
      storageBucket: "path-recovery.appspot.com",
      messagingSenderId: "702924902097"
    };

    const sourceApp = initializeApp(literalConfig, burnerAppName);
    
    try {
      const sourceDb = initializeFirestore(sourceApp, {
        databaseId: 'freda-enterprise',
        experimentalForceLongPolling: true
      } as any);

      const snap = await getDocs(collection(sourceDb, "projects"));
      for (const d of snap.docs) {
        const projectData = d.data();
        const { fldNarrative, ...skeleton } = projectData;
        fldNarrative;
        await setDoc(doc(db, "projects", d.id), skeleton);
      }

      await deleteApp(sourceApp);
      toast.success(`Successfully synced ${snap.docs.length} project skeletons!`);
    } catch (err) {
      console.error("SKELETON SYNC ERROR:", err);
      toast.error("Skeleton sync failed.");
    }
  },

  /**
   * TASK 60: Architectural Heal (The Great Healing)
   */
  async runArchitecturalHeal() {
    console.log("MIGRATION: Architectural Heal started...");
    
    try {
      const recsSnap = await getDocs(collection(db, "recommendations"));
      const findingsSnap = await getDocs(collection(db, "findings"));
      
      const recs = recsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      const findings = findingsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      
      let processedCount = 0;
      let linkedCount = 0;

      for (const rec of recs) {
        const fldFind = rec.fldFind;
        const fldRecID = rec.fldRecID || rec.id;
        
        if (fldFind && fldRecID) {
          const finding = findings.find(f => f.fldFindID === fldFind);
          if (finding) {
            await updateDoc(doc(db, "findings", finding.id), {
              fldSuggestedRecs: arrayUnion(fldRecID)
            });
            linkedCount++;
          }
        }
        processedCount++;
      }

      toast.success(`Healing Complete. Processed ${processedCount} recs, established ${linkedCount} links.`);
    } catch (err) {
      console.error("ARCHITECTURAL HEAL ERROR:", err);
      toast.error("Architectural heal failed.");
    }
  }
};

export const runStandardsMigration = async (setIsMigratingStandards: any, setMigrationStatus: any) => {
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

export const migrateUomToUnit = async (
  rawRecommendations: Recommendation[], 
  rawUnitTypes: UnitType[], 
  setIsDeduplicating: any, 
  setDedupStatus: any
) => {
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
