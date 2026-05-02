const fs = require("fs");
const admin = require("firebase-admin");

const INPUT = "scripts/standards-import/ufas_standards.json";
const COLLECTION = "ufas_standards";

// Use Firebase Admin credentials from environment
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function main() {
  const records = JSON.parse(fs.readFileSync(INPUT, "utf8"));

  console.log(`Preparing to import ${records.length} records into ${COLLECTION}`);

  let batch = db.batch();
  let count = 0;

  for (const record of records) {
    const ref = db.collection(COLLECTION).doc(record.id);
    batch.set(ref, record, { merge: true });
    count++;

    if (count % 400 === 0) {
      await batch.commit();
      console.log(`Committed ${count} records...`);
      batch = db.batch();
    }
  }

  await batch.commit();
  console.log(`Import complete: ${count} records written to ${COLLECTION}`);
}

main().catch(err => {
  console.error("Import failed:", err);
  process.exit(1);
});