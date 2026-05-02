const admin = require("firebase-admin");

const TARGET_COLLECTION = "tas_standards";
const BATCH_SIZE = 400;

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

async function main() {
  const snap = await db.collection(TARGET_COLLECTION).get();
  const totalScanned = snap.docs.length;

  let skippedUfas = 0;
  let docsUpdated = 0;
  let missingTypeFixed = 0;
  let missingVersionFixed = 0;
  let batchesCommitted = 0;

  let batch = db.batch();
  let opsInBatch = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();

    if (data.fldStandardType === "UFAS") {
      skippedUfas++;
      continue;
    }

    const typeBlank = isBlank(data.fldStandardType);
    const versionBlank = isBlank(data.fldStandardVersion);

    if (!typeBlank && !versionBlank) {
      continue;
    }

    const patch = {};
    if (typeBlank) {
      patch.fldStandardType = "TAS";
      missingTypeFixed++;
    }
    if (versionBlank) {
      patch.fldStandardVersion = "2012";
      missingVersionFixed++;
    }

    batch.update(docSnap.ref, patch);
    opsInBatch++;
    docsUpdated++;

    if (opsInBatch >= BATCH_SIZE) {
      await batch.commit();
      batchesCommitted++;
      batch = db.batch();
      opsInBatch = 0;
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
    batchesCommitted++;
  }

  console.log(`total docs scanned: ${totalScanned}`);
  console.log(`docs skipped as UFAS: ${skippedUfas}`);
  console.log(`docs updated: ${docsUpdated}`);
  console.log(`missing type fixed: ${missingTypeFixed}`);
  console.log(`missing version fixed: ${missingVersionFixed}`);
  console.log(`batches committed: ${batchesCommitted}`);
}

main().catch(err => {
  console.error("Normalize failed:", err);
  process.exit(1);
});
