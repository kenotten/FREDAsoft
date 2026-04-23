
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import fs from 'fs';

async function executeStage2() {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
  const app = initializeApp(config);
  const db = getFirestore(app);

  console.log("--- HARRIS CENTER BACKFILL: STAGE 2 EXECUTION START ---");

  // 1. FETCH DATA
  const pDataSnap = await getDocs(collection(db, 'projectData'));
  const findingsSnap = await getDocs(collection(db, 'findings'));
  const glossarySnap = await getDocs(collection(db, 'glossary'));

  const pData = pDataSnap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
  const findings = findingsSnap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
  const glossary = glossarySnap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));

  const normalize = (text) => (text || "").trim().toLowerCase();

  const results = {
    updated: [],
    skippedAmbiguous: 0,
    skippedUnmatched: 0,
    skippedDeleted: 0,
    skippedAlreadyPopulated: 0
  };

  const eligibleRecords = pData.filter(r => !r.fldData || r.fldData.trim() === "");
  results.skippedAlreadyPopulated = pData.length - eligibleRecords.length;

  for (const record of eligibleRecords) {
    const normShort = normalize(record.fldFindShort);
    const normLong = normalize(record.fldFindLong);

    // 2. MATCHING LOGIC
    let matches = findings.filter(f => normalize(f.fldFindShort) === normShort);
    
    // If no short match, try long match
    if (matches.length === 0) {
      matches = findings.filter(f => normalize(f.fldFindLong) === normLong);
    }

    if (matches.length === 0) {
      results.skippedUnmatched++;
      continue;
    }

    if (matches.length > 1) {
      // Check if only one is not deleted
      const activeMatches = matches.filter(f => !f.fldIsDeleted);
      if (activeMatches.length === 1) {
        matches = activeMatches;
      } else {
        results.skippedAmbiguous++;
        continue;
      }
    }

    const matchedFinding = matches[0];

    // 3. SAFETY CHECK: DELETED FINDING
    if (matchedFinding.fldIsDeleted === true) {
      results.skippedDeleted++;
      continue;
    }

    // 4. FIND CORRESPONDING GLOSSARY RECORD
    const findingId = matchedFinding.fldFindID || matchedFinding.firestoreId;
    const glosEntry = glossary.find(g => normalize(g.fldFind) === normalize(findingId));

    if (!glosEntry) {
      results.skippedUnmatched++; // Or orphaned finding without glossary
      continue;
    }

    const targetGlosId = glosEntry.fldGlosId || glosEntry.firestoreId;

    // 5. EXECUTE UPDATE
    try {
      const docRef = doc(db, 'projectData', record.firestoreId);
      await updateDoc(docRef, { fldData: targetGlosId });
      
      results.updated.push({
        pDataId: record.firestoreId,
        fldGlosId: targetGlosId,
        findingText: record.fldFindShort
      });
      console.log(`UPDATED: ${record.firestoreId} -> GLOS: ${targetGlosId} (${record.fldFindShort})`);
    } catch (error) {
      console.error(`FAILED to update ${record.firestoreId}:`, error.message);
    }
  }

  console.log("\n--- EXECUTION SUMMARY ---");
  console.log(`RECORDS UPDATED: ${results.updated.length}`);
  console.log(`SKIPPED (AMBIGUOUS): ${results.skippedAmbiguous}`);
  console.log(`SKIPPED (UNMATCHED): ${results.skippedUnmatched}`);
  console.log(`SKIPPED (DELETED FINDING): ${results.skippedDeleted}`);
  console.log(`ALREADY POPULATED: ${results.skippedAlreadyPopulated}`);

  console.log("\n--- UPDATED IDS ---");
  results.updated.forEach(u => {
    console.log(`DocID: ${u.pDataId} | fldData: ${u.fldGlosId}`);
  });

  console.log("\n--- HARRIS CENTER BACKFILL: STAGE 2 EXECUTION END ---");
}

executeStage2().catch(console.error);
