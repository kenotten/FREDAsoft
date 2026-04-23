
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';

async function runGlossaryBackfill() {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
  const app = initializeApp(config);
  const db = getFirestore(app);

  console.log("--- GLOSSARY STANDARDS BACKFILL STARTED ---");

  // Load Libraries
  const findingsSnap = await getDocs(collection(db, 'findings'));
  const findingsMap = new Map();
  findingsSnap.docs.forEach(d => {
    const data = d.data();
    const id = (data.fldFindID || d.id).toLowerCase().trim();
    findingsMap.set(id, data);
  });
  console.log(`Loaded ${findingsMap.size} Findings.`);

  const recsSnap = await getDocs(collection(db, 'recommendations'));
  const recsMap = new Map();
  recsSnap.docs.forEach(d => {
    const data = d.data();
    const id = (data.fldRecID || d.id).toLowerCase().trim();
    recsMap.set(id, data);
  });
  console.log(`Loaded ${recsMap.size} Recommendations.`);

  // Load Glossary
  const glossarySnap = await getDocs(collection(db, 'glossary'));
  const glossaries = glossarySnap.docs.map(d => ({ ...d.data(), id: d.id }));
  console.log(`Processing ${glossaries.length} Glossary records...`);

  let totalAnalyzed = 0;
  let updatedCount = 0;
  let skippedAlreadyHas = 0;
  let skippedNoParents = 0;
  let skippedNoStandardsInParents = 0;

  const sampleUpdates = [];

  for (const glos of glossaries) {
    totalAnalyzed++;

    // 1. Skip if already has standards
    if (Array.isArray(glos.fldStandards) && glos.fldStandards.length > 0) {
      skippedAlreadyHas++;
      continue;
    }

    const findingId = (glos.fldFind || "").toLowerCase().trim();
    const recId = (glos.fldRec || "").toLowerCase().trim();

    const finding = findingsMap.get(findingId);
    const recommendation = recsMap.get(recId);

    if (!finding && !recommendation) {
      skippedNoParents++;
      continue;
    }

    // 2. Collect Standards
    const rawStandards = [];
    if (finding && Array.isArray(finding.fldStandards)) {
      rawStandards.push(...finding.fldStandards);
    }
    if (recommendation && Array.isArray(recommendation.fldStandards)) {
      rawStandards.push(...recommendation.fldStandards);
    }

    // 3. Normalize and Deduplicate
    const cleanStandards = Array.from(new Set(
      rawStandards
        .filter(s => typeof s === 'string' && s.trim() !== "")
        .map(s => s.trim())
    ));

    if (cleanStandards.length === 0) {
      skippedNoStandardsInParents++;
      continue;
    }

    // 4. Apply Backfill
    console.log(`Backfilling Glossary [${glos.id}] with ${cleanStandards.length} standards.`);
    
    await setDoc(doc(db, 'glossary', glos.id), {
      fldStandards: cleanStandards,
      fldLastModified: serverTimestamp()
    }, { merge: true });

    updatedCount++;
    if (sampleUpdates.length < 5) {
      sampleUpdates.push({
        id: glos.id,
        findingId,
        recId,
        standards: cleanStandards
      });
    }
  }

  console.log("\n--- BACKFILL REPORT ---");
  console.log(`TOTAL GLOSSARY ANALYZED: ${totalAnalyzed}`);
  console.log(`RECORDS UPDATED: ${updatedCount}`);
  console.log(`RECORDS SKIPPED (Already had standards): ${skippedAlreadyHas}`);
  console.log(`RECORDS SKIPPED (No parent match): ${skippedNoParents}`);
  console.log(`RECORDS SKIPPED (Parents have no standards): ${skippedNoStandardsInParents}`);
  
  if (sampleUpdates.length > 0) {
    console.log("\n--- SAMPLE UPDATES ---");
    sampleUpdates.forEach(s => {
      console.log(`Glossary ID: ${s.id}`);
      console.log(`  Finding: ${s.findingId}`);
      console.log(`  Rec    : ${s.recId}`);
      console.log(`  Merged Standards: ${JSON.stringify(s.standards)}`);
    });
  }

  console.log("\n--- GLOSSARY STANDARDS BACKFILL COMPLETE ---");
}

runGlossaryBackfill().catch(console.error);
