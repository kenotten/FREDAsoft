
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

async function checkConflicts() {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
  const app = initializeApp(config);
  const db = getFirestore(app);

  const findingsSnap = await getDocs(collection(db, 'findings'));
  const findings = findingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const targetText = "Door latching H/W Not Compliant";
  const normalized = targetText.trim().toLowerCase();
  
  const matches = findings.filter(f => (f.fldFindShort || "").trim().toLowerCase() === normalized);
  
  console.log(`Conflicts for "${targetText}":`);
  matches.forEach(m => {
    console.log(` - ID: ${m.fldFindID || m.id} | Short: ${m.fldFindShort} | Long: ${m.fldFindLong?.substring(0, 40)}...`);
  });
}

checkConflicts().catch(console.error);
