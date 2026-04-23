
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

async function runStandardsAudit() {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
  const app = initializeApp(config);
  const db = getFirestore(app);

  console.log("--- STANDARDS INHERITANCE AUDIT CENSUS ---");

  const collections = ['findings', 'recommendations', 'master_recommendations', 'glossary', 'projectData'];
  const auditResults = {};

  for (const collName of collections) {
    const snap = await getDocs(collection(db, collName));
    const docs = snap.docs.map(doc => doc.data());
    
    auditResults[collName] = {
      total: docs.length,
      has_fldStandards: docs.filter(d => 'fldStandards' in d).length,
      populated_fldStandards: docs.filter(d => Array.isArray(d.fldStandards) && d.fldStandards.length > 0).length,
      has_fldCitations: docs.filter(d => 'fldCitations' in d).length,
      populated_fldCitations: docs.filter(d => d.fldCitations).length,
      other_fields: Array.from(new Set(docs.flatMap(d => Object.keys(d))))
    };
  }

  console.log(JSON.stringify(auditResults, null, 2));

  // Sample check for projectData
  const pDataSnap = await getDocs(collection(db, 'projectData'));
  const pDataSamples = pDataSnap.docs.slice(0, 5).map(doc => ({ id: doc.id, data: doc.data() }));
  console.log("\n--- PROJECTDATA SAMPLES ---");
  pDataSamples.forEach(s => {
    console.log(`ID: ${s.id} | fldStandards: ${JSON.stringify(s.data.fldStandards)}`);
  });

  // Sample check for Glossary
  const glosSnap = await getDocs(collection(db, 'glossary'));
  const glosSamples = glosSnap.docs.slice(0, 5).map(doc => ({ id: doc.id, data: doc.data() }));
  console.log("\n--- GLOSSARY SAMPLES ---");
  glosSamples.forEach(s => {
    console.log(`ID: ${s.id} | fldStandards: ${JSON.stringify(s.data.fldStandards)}`);
  });

  console.log("\n--- STANDARDS INHERITANCE AUDIT END ---");
}

runStandardsAudit().catch(console.error);
