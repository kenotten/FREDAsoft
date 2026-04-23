
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

async function auditLibraryFields() {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
  const app = initializeApp(config);
  const db = getFirestore(app);

  console.log("--- LIBRARY FIELD DEEP AUDIT ---");

  const recSnap = await getDocs(collection(db, 'recommendations'));
  const recs = recSnap.docs.map(d => d.data());
  
  console.log(`Recommendations: ${recs.length}`);
  console.log(`  Records with fldStandards (populated): ${recs.filter(r => Array.isArray(r.fldStandards) && r.fldStandards.length > 0).length}`);
  console.log(`  Records with fldCitation (populated string): ${recs.filter(r => typeof r.fldCitation === 'string' && r.fldCitation.trim() !== "").length}`);
  
  const recWithCitation = recs.find(r => typeof r.fldCitation === 'string' && r.fldCitation.trim() !== "");
  if (recWithCitation) {
    console.log(`  Example fldCitation: "${recWithCitation.fldCitation}"`);
  }

  const findSnap = await getDocs(collection(db, 'findings'));
  const finds = findSnap.docs.map(d => d.data());
  console.log(`Findings: ${finds.length}`);
  console.log(`  Records with fldStandards (populated): ${finds.filter(f => Array.isArray(f.fldStandards) && f.fldStandards.length > 0).length}`);

  console.log("--- AUDIT END ---");
}

auditLibraryFields().catch(console.error);
