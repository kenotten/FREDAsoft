const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const INPUT = path.join("scripts", "standards-import", "ufas_standards.json");
const TARGET_COLLECTION = "tas_standards";
const BATCH_SIZE = 400;

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

function abort(message) {
  console.error(message);
  process.exit(1);
}

async function main() {
  const raw = fs.readFileSync(INPUT, "utf8");
  const records = JSON.parse(raw);

  if (!Array.isArray(records) || records.length === 0) {
    abort(`Abort: expected a non-empty JSON array in ${INPUT}`);
  }

  const ufasCount = records.length;
  console.log(`Read ${ufasCount} UFAS records from ${INPUT}`);

  for (let i = 0; i < records.length; i++) {
    const id = records[i].id;
    if (id === undefined || id === null || String(id).trim() === "") {
      abort(`Abort: missing or empty id at UFAS JSON index ${i}`);
    }
  }

  const ufasIds = records.map(r => String(r.id).trim());
  const uniqueUfas = new Set(ufasIds);
  if (uniqueUfas.size !== ufasIds.length) {
    abort(`Abort: duplicate id(s) inside UFAS JSON (${ufasIds.length} rows, ${uniqueUfas.size} unique ids)`);
  }

  const existingSnap = await db.collection(TARGET_COLLECTION).get();
  const existingIds = new Set(existingSnap.docs.map(d => d.id));
  console.log(`Scanned ${existingIds.size} existing documents in ${TARGET_COLLECTION}`);

  const collisions = ufasIds.filter(id => existingIds.has(id));
  if (collisions.length > 0) {
    const sample = collisions.slice(0, 20);
    console.error(`Abort: ${collisions.length} document id(s) in UFAS already exist in ${TARGET_COLLECTION}`);
    console.error(`Sample: ${sample.join(", ")}${collisions.length > sample.length ? " ..." : ""}`);
    process.exit(1);
  }

  let batch = db.batch();
  let opsInBatch = 0;
  let totalWritten = 0;
  let batchesCommitted = 0;

  for (const record of records) {
    const id = String(record.id).trim();
    const ref = db.collection(TARGET_COLLECTION).doc(id);
    const payload = {
      ...record,
      id,
      fldStandardType: "UFAS",
      fldStandardVersion: "1984"
    };
    batch.set(ref, payload, { merge: false });
    opsInBatch++;
    totalWritten++;

    if (opsInBatch >= BATCH_SIZE) {
      await batch.commit();
      batchesCommitted++;
      console.log(`Committed batch ${batchesCommitted} (${opsInBatch} writes)`);
      batch = db.batch();
      opsInBatch = 0;
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
    batchesCommitted++;
    console.log(`Committed batch ${batchesCommitted} (${opsInBatch} writes)`);
  }

  console.log(`Done: wrote ${totalWritten} documents to ${TARGET_COLLECTION} in ${batchesCommitted} batch commit(s); collisions were 0`);
}

main().catch(err => {
  console.error("Import failed:", err);
  process.exit(1);
});
