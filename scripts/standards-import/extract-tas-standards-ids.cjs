/**
 * Read-only: list all document IDs in tas_standards.
 * Usage:
 *   node extract-tas-standards-ids.cjs           # prints JSON array to stdout
 *   node extract-tas-standards-ids.cjs --ndjson  # one id per line
 *   node extract-tas-standards-ids.cjs --out ids.json
 *
 * Requires: gcloud auth application-default login
 * Requires: firebase-admin (npm install firebase-admin)
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const args = process.argv.slice(2);
const ndjson = args.includes("--ndjson");
const outIdx = args.indexOf("--out");
const outPath = outIdx !== -1 ? args[outIdx + 1] : null;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

async function main() {
  const snap = await db.collection("tas_standards").get();
  const ids = snap.docs.map((d) => d.id);

  if (outPath) {
    const abs = path.resolve(outPath);
    fs.writeFileSync(abs, JSON.stringify(ids, null, 2), "utf8");
    console.error(`Wrote ${ids.length} ids to ${abs}`);
    return;
  }

  if (ndjson) {
    process.stdout.write(ids.join("\n") + (ids.length ? "\n" : ""));
    return;
  }

  process.stdout.write(JSON.stringify(ids, null, 2) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });