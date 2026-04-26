import { 
  collection, 
  getDocs, 
  doc, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../firebase';
import { firestoreService } from './firestoreService';
import { toast } from 'sonner';

export interface MigrationResults {
  totalAnalyzed: number;
  cleanMatchesShort: number;
  cleanMatchesLong: number;
  ambiguous: number;
  unmatched: number;
  noGlossary: number;
  resolvable: number;
  samples: {
    matched: any[];
    ambiguous: any[];
    unmatched: any[];
  };
}

export const runStandardsMigration = async (setIsMigrating: (v: boolean) => void, setStatus: (s: string) => void) => {
  setIsMigrating(true);
  setStatus('Checking legacy data...');
  try {
    const legacyStandards = await firestoreService.list('tas_standards');
    if (!legacyStandards || legacyStandards.length === 0) {
      toast.info('No legacy standards found.');
      setStatus('No legacy data.');
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
  } catch (error) { 
    toast.error('Migration failed.'); 
  } finally { 
    setIsMigrating(false); 
  }
};

export const migrateUomToUnit = async (rawRecommendations: any[], rawUnitTypes: any[], setIsDeduplicating: (v: boolean) => void, setDedupStatus: (s: any) => void) => {
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
          // FIX (Task 124): fldUnit is a numeric cost field. fldUOM is the unit type string.
          // Do not write string fldUTID into numeric fldUnit.
          batch.update(docRef, { fldUOM: unitType.fldUTAbbr });
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
  } catch (error) { 
    toast.error('Migration failed.'); 
  } finally { 
    setIsDeduplicating(false); 
    setDedupStatus(null); 
  }
};

export const migrationService = {
  /**
   * STAGE 1: DRY RUN
   * Simulates the backfill without writing any data.
   */
  async runDryRun(): Promise<MigrationResults> {
    console.log("MIGRATION: Stage 1 - Dry Run started...");
    
    const pDataSnap = await getDocs(collection(db, 'projectData'));
    const findingsSnap = await getDocs(collection(db, 'findings'));
    const glossarySnap = await getDocs(collection(db, 'glossary'));

    const projectData = pDataSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
    const findings = findingsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
    const glossary = glossarySnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

    const eligible = projectData.filter(d => !d.fldData || d.fldData.trim() === "");
    
    const results: MigrationResults = {
      totalAnalyzed: eligible.length,
      cleanMatchesShort: 0,
      cleanMatchesLong: 0,
      ambiguous: 0,
      unmatched: 0,
      noGlossary: 0,
      resolvable: 0,
      samples: {
        matched: [],
        ambiguous: [],
        unmatched: []
      }
    };

    const normalize = (text: string) => (text || "").trim().toLowerCase();

    eligible.forEach(record => {
      const normFindShort = normalize(record.fldFindShort);
      const normFindLong = normalize(record.fldFindLong);

      // STEP 1 & 2 & 3: Match findings
      let matchedFindings = findings.filter(f => normalize(f.fldFindShort) === normFindShort);
      let matchType: 'SHORT' | 'LONG' | 'NONE' = matchedFindings.length > 0 ? 'SHORT' : 'NONE';

      if (matchedFindings.length === 0) {
        matchedFindings = findings.filter(f => normalize(f.fldFindLong) === normFindLong);
        if (matchedFindings.length > 0) matchType = 'LONG';
      }

      if (matchedFindings.length > 1) {
        results.ambiguous++;
        if (results.samples.ambiguous.length < 5) {
          results.samples.ambiguous.push({
            recordId: record.id,
            text: record.fldFindShort,
            matches: matchedFindings.map(f => f.fldFindShort)
          });
        }
      } else if (matchedFindings.length === 1) {
        if (matchType === 'SHORT') results.cleanMatchesShort++;
        else results.cleanMatchesLong++;

        const finding = matchedFindings[0];
        const findId = finding.fldFindID || finding.id;

        // STEP 5: Glossary Resolution
        const glosEntry = glossary.find(g => normalize(g.fldFind) === normalize(findId));

        if (glosEntry) {
          results.resolvable++;
          if (results.samples.matched.length < 10) {
            results.samples.matched.push({
              recordId: record.id,
              originalText: record.fldFindShort,
              proposedGlosId: glosEntry.fldGlosId || glosEntry.id,
              findingMatch: finding.fldFindShort
            });
          }
        } else {
          results.noGlossary++;
        }
      } else {
        results.unmatched++;
        if (results.samples.unmatched.length < 5) {
          results.samples.unmatched.push({
            recordId: record.id,
            text: record.fldFindShort
          });
        }
      }
    });

    console.log("DRY RUN COMPLETE:", results);
    return results;
  },

  /**
   * STAGE 2: EXECUTION
   * Applies resolvable matches to Firestore.
   */
  async executeBackfill(): Promise<{ updated: number; skippedAmbiguous: number; skippedUnmatched: number }> {
    // This will be implemented after approval.
    console.log("EXECUTION: Waiting for Stage 1 approval.");
    return { updated: 0, skippedAmbiguous: 0, skippedUnmatched: 0 };
  }
};
