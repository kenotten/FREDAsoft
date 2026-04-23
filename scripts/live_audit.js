
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs';

async function runLiveAudit() {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
  const app = initializeApp(config);
  const db = getFirestore(app);

  console.log("--- FIREBASE LIVE AUDIT START ---");

  // 1. PROJECT DATA ANALYSIS
  const pDataSnap = await getDocs(collection(db, 'projectData'));
  const allRecords = pDataSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  const totalCount = allRecords.length;
  const missingFldData = allRecords.filter(r => !r.fldData || r.fldData.trim() === "");
  const hasFldData = allRecords.filter(r => r.fldData && r.fldData.trim() !== "");

  // 2. GLOSSARY ANALYSIS
  const glossarySnap = await getDocs(collection(db, 'glossary'));
  const glossary = glossarySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const glossaryIds = new Set(glossary.map(g => (g.fldGlosId || g.id).trim().toLowerCase()));

  const resolved = hasFldData.filter(r => glossaryIds.has(r.fldData.trim().toLowerCase()));
  const unresolved = hasFldData.filter(r => !glossaryIds.has(r.fldData.trim().toLowerCase()));

  // 3. FINDINGS ANALYSIS
  const findingsSnap = await getDocs(collection(db, 'findings'));
  const findings = findingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  console.log(`TOTAL RECORDS: ${totalCount}`);
  console.log(`EMPTY fldData: ${missingFldData.length}`);
  console.log(`EXISTING fldData: ${hasFldData.length}`);
  console.log(`  - RESOLVED: ${resolved.length}`);
  console.log(`  - UNRESOLVED: ${unresolved.length}`);

  console.log("\n--- REAL MATCH PREVIEW (EMPTY fldData) ---");
  const normalize = (val) => (val || "").trim().toLowerCase();

  const samples = missingFldData.slice(0, 10);
  for (const record of samples) {
    const normShort = normalize(record.fldFindShort);
    const normLong = normalize(record.fldFindLong);

    let match = findings.find(f => normalize(f.fldFindShort) === normShort);
    let type = "SHORT";
    if (!match) {
      match = findings.find(f => normalize(f.fldFindLong) === normLong);
      type = "LONG";
    }

    if (match) {
      const glos = glossary.find(g => normalize(g.fldFind) === normalize(match.fldFindID || match.id));
      console.log(`DocID: ${record.id} | Link: ${match.fldFindID || match.id} | ProposedGlos: ${glos ? (glos.fldGlosId || glos.id) : 'NONE'} | Type: ${type}`);
      console.log(`  - Text: "${record.fldFindShort?.substring(0, 50)}..."`);
    } else {
      console.log(`DocID: ${record.id} | NO MATCH FOUND`);
    }
  }

  console.log("\n--- AMBIGUOUS / UNMATCHED SAMPLES ---");
  const unmatched = [];
  const ambiguous = [];

  for (const record of missingFldData) {
    const normShort = normalize(record.fldFindShort);
    const matches = findings.filter(f => normalize(f.fldFindShort) === normShort);
    
    if (matches.length > 1) {
      ambiguous.push({ id: record.id, text: record.fldFindShort, matches: matches.length });
    } else if (matches.length === 0) {
      const longMatches = findings.filter(f => normalize(f.fldFindLong) === normalize(record.fldFindLong));
      if (longMatches.length === 0) {
        unmatched.push({ id: record.id, text: record.fldFindShort });
      }
    }
  }

  console.log("AMBIGUOUS:");
  ambiguous.slice(0, 3).forEach(a => console.log(`  - ID: ${a.id} | Text: "${a.text}" | Conflicts: ${a.matches}`));
  console.log("UNMATCHED:");
  unmatched.slice(0, 3).forEach(u => console.log(`  - ID: ${u.id} | Text: "${u.text}"`));

  console.log("\n--- FIREBASE LIVE AUDIT END ---");
}

runLiveAudit().catch(console.error);
