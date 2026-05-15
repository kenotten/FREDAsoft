/**
 * One-time maintenance: assign all Unassigned/Legacy glossary documents to TAS 2012.
 *
 * Uses Firebase Admin SDK (bypasses client security rules). Credentials are never committed.
 *
 * Dry-run by default; pass --apply to write. Only merges the four glossary-set fields.
 *
 * Credentials (service account JSON path — keep local / secret):
 *
 *   PowerShell:
 *     $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
 *     npx tsx scripts/maintenance/assign-unassigned-glossary-to-tas2012.ts
 *
 *   cmd.exe:
 *     set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json
 *     npx tsx scripts/maintenance/assign-unassigned-glossary-to-tas2012.ts
 *
 * Optional explicit project (if credentials alone do not resolve project id):
 *     $env:FIREBASE_PROJECT_ID="your-project-id"
 *
 * If firebase-applet-config.json exists in the repo root (client config), projectId
 * is read from there when env vars are unset — no credentials in that file.
 *
 * Apply (writes):
 *     npx tsx scripts/maintenance/assign-unassigned-glossary-to-tas2012.ts --apply
 *
 * Future: reassigning rows that already have a set may require citation review — not done here.
 */
import fs from 'fs';
import path from 'path';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { GLOSSARY_SET_DEFS } from '../../src/lib/glossarySets.ts';

const TAS_2012 = GLOSSARY_SET_DEFS.find((s) => s.id === 'TAS_2012');
if (!TAS_2012) {
  throw new Error('TAS_2012 definition missing from GLOSSARY_SET_DEFS (src/lib/glossarySets.ts)');
}

function isSoftDeleted(data: Record<string, unknown>): boolean {
  return (
    data.fldDeleted === true ||
    data.fldIsDeleted === true ||
    data.fldIsArchived === true
  );
}

function isUnassignedLegacy(data: Record<string, unknown>): boolean {
  const raw = data.fldGlossarySetId;
  if (raw === null || raw === undefined) return true;
  return String(raw).trim().length === 0;
}

const BATCH_LIMIT = 450;

function printCredentialHelp(): void {
  console.error(`
Firebase Admin could not initialize or access Firestore.

Set Application Default Credentials to a service account key (do not commit the JSON):

  PowerShell:
    $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\service-account.json"
    npx tsx scripts/maintenance/assign-unassigned-glossary-to-tas2012.ts

  cmd.exe:
    set GOOGLE_APPLICATION_CREDENTIALS=C:\\path\\to\\service-account.json
    npx tsx scripts/maintenance/assign-unassigned-glossary-to-tas2012.ts

Optional:
    $env:FIREBASE_PROJECT_ID="your-firebase-project-id"

If project id is still missing, ensure GOOGLE_APPLICATION_CREDENTIALS points to a
service account JSON (it contains project_id) or set FIREBASE_PROJECT_ID.

The service account needs Firestore read (and write for --apply) on the target project.
`);
}

function resolveProjectId(): string | undefined {
  const fromEnv =
    process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  if (fromEnv) return String(fromEnv).trim() || undefined;
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) return undefined;
  try {
    const j = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
    const pid = j.projectId ?? j.project_id;
    if (pid != null && String(pid).trim()) return String(pid).trim();
  } catch {
    /* ignore */
  }
  return undefined;
}

function ensureAdminApp(): void {
  if (getApps().length > 0) return;
  const projectId = resolveProjectId();
  try {
    initializeApp({
      credential: applicationDefault(),
      ...(projectId ? { projectId } : {}),
    });
  } catch (e) {
    console.error('initializeApp failed:', e);
    printCredentialHelp();
    process.exit(1);
  }
}

async function main() {
  const apply = process.argv.includes('--apply');

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(
      'Note: GOOGLE_APPLICATION_CREDENTIALS is not set. Using Application Default Credentials (e.g. gcloud user ADC) if available; otherwise set it to a service account JSON path.\n'
    );
  }

  ensureAdminApp();
  const db = getFirestore();

  let snap;
  try {
    snap = await db.collection('glossary').get();
  } catch (e: unknown) {
    console.error('Failed to read glossary collection.', e);
    printCredentialHelp();
    process.exit(1);
  }

  const scanned = snap.size;

  let skippedDeleted = 0;
  let skippedAssigned = 0;
  let wouldUpdate = 0;

  type Candidate = {
    id: string;
    prevSetId: string;
    prevSetName: string;
  };
  const candidates: Candidate[] = [];

  snap.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    if (isSoftDeleted(data)) {
      skippedDeleted++;
      return;
    }
    if (!isUnassignedLegacy(data)) {
      skippedAssigned++;
      return;
    }
    wouldUpdate++;
    candidates.push({
      id: d.id,
      prevSetId: String(data.fldGlossarySetId ?? '').trim() || '(empty)',
      prevSetName: String(data.fldGlossarySetName ?? '').trim() || '(empty)',
    });
  });

  const patch = {
    fldGlossarySetId: TAS_2012.id,
    fldGlossarySetName: TAS_2012.name,
    fldGlossaryStandardType: TAS_2012.standardType,
    fldGlossaryStandardVersion: TAS_2012.standardVersion,
  };

  console.log('--- assign-unassigned-glossary-to-tas2012 (Firebase Admin) ---');
  console.log(`Mode: ${apply ? 'APPLY (writes)' : 'DRY-RUN (no writes)'}`);
  console.log(`Target set (from glossarySets.ts): ${TAS_2012.id} / ${TAS_2012.name}`);
  console.log('');
  console.log(`Glossary docs scanned:        ${scanned}`);
  console.log(`Would update (unassigned):    ${wouldUpdate}`);
  console.log(`Skipped (already assigned):   ${skippedAssigned}`);
  console.log(`Skipped (deleted/archived):   ${skippedDeleted}`);
  console.log('');

  const sample = candidates.slice(0, 25);
  console.log(`Sample of ids that would be updated (up to 25 of ${wouldUpdate}):`);
  for (const c of sample) {
    console.log(
      `  ${c.id}  prev fldGlossarySetId=${JSON.stringify(c.prevSetId)}  prev fldGlossarySetName=${JSON.stringify(c.prevSetName)}`
    );
  }
  if (wouldUpdate > sample.length) {
    console.log(`  ... and ${wouldUpdate - sample.length} more`);
  }

  if (!apply) {
    console.log('');
    console.log('Dry-run complete. Re-run with --apply to write changes.');
    return;
  }

  let written = 0;
  let batch = db.batch();
  let ops = 0;

  for (const c of candidates) {
    const ref = db.collection('glossary').doc(c.id);
    batch.set(ref, patch, { merge: true });
    ops++;
    written++;
    if (ops >= BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
      console.log(`Committed batch… (${written} / ${wouldUpdate})`);
    }
  }
  if (ops > 0) {
    await batch.commit();
  }
  console.log('');
  console.log(`Apply complete. Updated ${written} glossary document(s).`);
}

main().catch((e) => {
  console.error(e);
  printCredentialHelp();
  process.exit(1);
});
