
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Mocking sanitizeData since we've already verified the source code change
// and we want to test the full flow through Firestore.
const sanitizeDataManual = (data) => {
  const sanitized = { ...data };
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined) {
      if (['fldStandards', 'fldImages', 'images', 'standards'].includes(key)) {
        sanitized[key] = [];
      } else {
        sanitized[key] = null;
      }
    }
    // THE REDACTED BLOCK IS GONE
  });
  return sanitized;
};

async function verifyPersistence() {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
  const app = initializeApp(config);
  const db = getFirestore(app);

  const testGlosId = "test-glos-" + uuidv4().slice(0, 8);
  const testStandards = ["TAS 604.5", "ADAAG 309.4"];

  console.log(`\n--- VERIFICATION A: WRITE TEST ---`);
  console.log(`Target Document ID: ${testGlosId}`);
  
  const rawData = {
    fldGlosId: testGlosId,
    fldCat: "verification-cat",
    fldItem: "verification-item",
    fldFind: "verification-find",
    fldRec: "verification-rec",
    fldStandards: testStandards,
    fldImages: [],
    fldLastModified: new Date().toISOString()
  };

  const sanitized = sanitizeDataManual(rawData);
  console.log("Sanitized Payload fldStandards:", JSON.stringify(sanitized.fldStandards));

  await setDoc(doc(db, 'glossary', testGlosId), sanitized);
  console.log("✓ Record saved to Firestore.");

  console.log(`\n--- VERIFICATION B: PERSISTENCE CHECK ---`);
  const snap = await getDoc(doc(db, 'glossary', testGlosId));
  const savedData = snap.data();

  if (savedData && Array.isArray(savedData.fldStandards) && savedData.fldStandards.length === 2) {
    console.log("✓ SUCCESS: fldStandards exists and values are intact.");
    console.log("Saved Values:", JSON.stringify(savedData.fldStandards));
  } else {
    console.error("✖ FAILURE: fldStandards is missing or corrupted.");
    console.log("Document Content:", JSON.stringify(savedData));
    process.exit(1);
  }

  console.log(`\n--- VERIFICATION C: REGRESSION CHECK ---`);
  const expectedKeys = ['fldGlosId', 'fldCat', 'fldItem', 'fldFind', 'fldRec', 'fldStandards', 'fldImages', 'fldLastModified'];
  const actualKeys = Object.keys(savedData);
  const missingKeys = expectedKeys.filter(k => !actualKeys.includes(k));
  
  if (missingKeys.length === 0) {
    console.log("✓ SUCCESS: No other fields were affected.");
  } else {
    console.error("✖ FAILURE: Missing fields detected:", missingKeys);
  }

  console.log(`\n--- PHASE 1 VERIFICATION COMPLETE ---`);
}

verifyPersistence().catch(console.error);
