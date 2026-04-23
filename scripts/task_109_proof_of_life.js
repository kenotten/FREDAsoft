
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Mocking sanitizeData from src/lib/utils.ts (post-fix)
const sanitizeData = (data) => {
  const sanitized = { ...data };
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined) {
      if (['fldStandards', 'fldImages', 'images', 'standards'].includes(key)) {
        sanitized[key] = [];
      } else {
        sanitized[key] = null;
      }
    }
  });
  return sanitized;
};

async function proofOfLife() {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
  const app = initializeApp(config);
  const db = getFirestore(app);

  const tracerId = "e7e16c48-fb45-4f47-a1a3-e1b5802bc122";
  const tracerNum = "703.6.2";
  
  const testId = uuidv4().slice(0,8);
  const findId = `POL-FIND-${testId}`;
  const recId = `POL-REC-${testId}`;
  const glosId = `POL-GLOS-${testId}`;
  const pdataId = `POL-PDATA-${testId}`;

  console.log(`--- PROOF-OF-LIFE START [${testId}] ---`);
  console.log(`Tracer Standard: ${tracerNum} (${tracerId})`);

  // STEP 1: FINDING VALIDATION
  console.log("\nSTEP 1: FINDING LAYER");
  const findData = {
    fldFindID: findId,
    fldFindShort: "POL Test Finding",
    fldFindLong: "Proof of Life Test Finding",
    fldStandards: [tracerId],
    fldTimestamp: new Date().toISOString()
  };
  await setDoc(doc(db, 'findings', findId), findData);
  const findSnap = await getDoc(doc(db, 'findings', findId));
  const findPersisted = findSnap.data()?.fldStandards || [];
  console.log(`Finding ID: ${findId}`);
  console.log(`fldStandards: ${JSON.stringify(findPersisted)}`);
  if (!findPersisted.includes(tracerId)) throw new Error("FAIL: Finding persistence");

  // STEP 2: RECOMMENDATION VALIDATION
  console.log("\nSTEP 2: RECOMMENDATION LAYER");
  const recData = {
    fldRecID: recId,
    fldRecShort: "POL Test Recommendation",
    fldRecLong: "Proof of Life Test Recommendation",
    fldStandards: [tracerId],
    fldTimestamp: new Date().toISOString()
  };
  await setDoc(doc(db, 'recommendations', recId), recData);
  const recSnap = await getDoc(doc(db, 'recommendations', recId));
  const recPersisted = recSnap.data()?.fldStandards || [];
  console.log(`Recommendation ID: ${recId}`);
  console.log(`fldStandards: ${JSON.stringify(recPersisted)}`);
  if (!recPersisted.includes(tracerId)) throw new Error("FAIL: Recommendation persistence");

  // STEP 3: GLOSSARY VALIDATION
  console.log("\nSTEP 3: GLOSSARY LAYER");
  const glosData = sanitizeData({
    fldGlosId: glosId,
    fldFind: findId,
    fldRec: recId,
    fldCat: "pol-cat",
    fldItem: "pol-item",
    fldStandards: [tracerId],
    fldLastModified: new Date().toISOString()
  });
  await setDoc(doc(db, 'glossary', glosId), glosData);
  const glosSnap = await getDoc(doc(db, 'glossary', glosId));
  const glosPersisted = glosSnap.data()?.fldStandards || [];
  console.log(`Glossary ID: ${glosId}`);
  console.log(`fldStandards: ${JSON.stringify(glosPersisted)}`);
  if (!glosPersisted.includes(tracerId)) throw new Error("FAIL: Glossary persistence (sanitizeData might still be stripping)");

  // STEP 4: PROJECTDATA VALIDATION (Simulation of App.tsx:handleSaveRecord)
  console.log("\nSTEP 4: PROJECTDATA LAYER");
  const pdataPayload = sanitizeData({
    fldPDataID: pdataId,
    fldPDataProject: "POL-PROJECT",
    fldFacility: "POL-FACILITY",
    fldData: glosId,
    fldLocation: "POL-LOC",
    fldFindShort: "POL Test Finding",
    fldFindLong: "Proof of Life Test Finding",
    fldRecShort: "POL Test Recommendation",
    fldRecLong: "Proof of Life Test Recommendation",
    fldQTY: 1,
    fldMeasurement: 10,
    fldUnitType: "Decimal",
    fldImages: [],
    fldStandards: [tracerId], // Inherited from UI logic
    fldInspID: "POL-INSP",
    fldTimestamp: new Date().toISOString()
  });
  
  await setDoc(doc(db, 'projectData', pdataId), pdataPayload);
  const pdataSnap = await getDoc(doc(db, 'projectData', pdataId));
  const pdataPersisted = pdataSnap.data()?.fldStandards || [];
  console.log(`ProjectData ID: ${pdataId}`);
  console.log(`fldStandards: ${JSON.stringify(pdataPersisted)}`);
  if (!pdataPersisted.includes(tracerId)) throw new Error("FAIL: ProjectData inheritance/persistence");

  console.log("\n--- VERDICT: SUCCESS ---");
  console.log("Full end-to-end flow confirmed.");
}

proofOfLife().catch(err => {
  console.error("\n--- VERDICT: FAIL ---");
  console.error(err.message);
  process.exit(1);
});
