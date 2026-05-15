/**
 * Guarded maintenance: backfill TAS 2012 glossary-set metadata on master library
 * findings and recommendations that are missing fldGlossarySetId.
 *
 * Default: DRY-RUN (no Firestore writes). Pass --write to apply.
 *
 * Does NOT touch: projectData, glossary, standards, or any row that already has
 * fldGlossarySetId, or soft-deleted/archived rows.
 *
 * Credentials (same as report-glossary-integrity.ts):
 *
 *   PowerShell:
 *     $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
 *     npx tsx scripts/maintenance/backfill-library-tas2012.ts
 *
 *   Apply:
 *     npx tsx scripts/maintenance/backfill-library-tas2012.ts --write
 *
 * Optional:
 *     $env:FIREBASE_PROJECT_ID="your-project-id"
 */
import fs from 'fs';
import path from 'path';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { GLOSSARY_SET_DEFS } from '../../src/lib/glossarySets.ts';

const BATCH_LIMIT = 450;

const TAS_2012 = GLOSSARY_SET_DEFS.find((s) => s.id === 'TAS_2012');
if (!TAS_2012) {
  throw new Error('TAS_2012 missing from GLOSSARY_SET_DEFS (src/lib/glossarySets.ts)');
}

/** Fields written on findings / recommendations (master library shape per types + Library conventions). */
const LIBRARY_PATCH = {
  fldGlossarySetId: TAS_2012.id,
  fldGlossarySetName: TAS_2012.name,
  fldStandardType: TAS_2012.standardType,
  fldStandardVersion: TAS_2012.standardVersion,
};

function printCredentialHelp(): void {
  console.error(`
Firebase Admin could not initialize or access Firestore.

Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path (do not commit the JSON).
See scripts/maintenance/report-orphans.ts or report-glossary-integrity.ts for examples.

Read: any service account with Firestore read.
Write (--write): same account needs Firestore update on findings + recommendations.
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

function norm(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function isSoftDeleted(data: Record<string, unknown>): boolean {
  return (
    data.fldDeleted === true ||
    data.fldIsDeleted === true ||
    data.fldIsArchived === true
  );
}

function isMissingGlossarySetId(data: Record<string, unknown>): boolean {
  return !norm(data.fldGlossarySetId);
}

type Row = { id: string; data: Record<string, unknown>; soft: boolean };

async function fetchAll(db: Firestore, name: string): Promise<Row[]> {
  const snap = await db.collection(name).get();
  const out: Row[] = [];
  snap.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    out.push({ id: d.id, data, soft: isSoftDeleted(data) });
  });
  return out;
}

type Candidate = {
  collection: 'findings' | 'recommendations';
  docId: string;
  shortLabel: string;
};

const SAMPLE_LIMIT = 25;

async function main() {
  const write = process.argv.includes('--write');

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(
      'Note: GOOGLE_APPLICATION_CREDENTIALS is not set. Using Application Default Credentials if available.\n'
    );
  }

  ensureAdminApp();
  const db = getFirestore();

  let findings: Row[];
  let recommendations: Row[];
  try {
    [findings, recommendations] = await Promise.all([
      fetchAll(db, 'findings'),
      fetchAll(db, 'recommendations'),
    ]);
  } catch (e: unknown) {
    console.error('Failed to read findings/recommendations.', e);
    printCredentialHelp();
    process.exit(1);
  }

  const findingCandidates: Candidate[] = [];
  let findingsSkippedDeleted = 0;
  let findingsSkippedHasSet = 0;
  for (const r of findings) {
    if (r.soft) {
      findingsSkippedDeleted++;
      continue;
    }
    if (!isMissingGlossarySetId(r.data)) {
      findingsSkippedHasSet++;
      continue;
    }
    findingCandidates.push({
      collection: 'findings',
      docId: r.id,
      shortLabel: norm(r.data.fldFindShort) || '(no fldFindShort)',
    });
  }

  const recommendationCandidates: Candidate[] = [];
  let recsSkippedDeleted = 0;
  let recsSkippedHasSet = 0;
  for (const r of recommendations) {
    if (r.soft) {
      recsSkippedDeleted++;
      continue;
    }
    if (!isMissingGlossarySetId(r.data)) {
      recsSkippedHasSet++;
      continue;
    }
    recommendationCandidates.push({
      collection: 'recommendations',
      docId: r.id,
      shortLabel: norm(r.data.fldRecShort) || '(no fldRecShort)',
    });
  }

  console.log('--- backfill-library-tas2012 (Firebase Admin) ---');
  console.log(`Mode: ${write ? 'WRITE (--write)' : 'DRY-RUN (default; no writes)'}`);
  console.log(`Patch (from glossarySets.ts TAS_2012): ${JSON.stringify(LIBRARY_PATCH)}`);
  console.log('');
  console.log('Findings');
  console.log(`  Loaded:                    ${findings.length}`);
  console.log(`  Would update (missing set): ${findingCandidates.length}`);
  console.log(`  Skipped (deleted/archived): ${findingsSkippedDeleted}`);
  console.log(`  Skipped (already has set):  ${findingsSkippedHasSet}`);
  console.log('');
  console.log('Recommendations');
  console.log(`  Loaded:                    ${recommendations.length}`);
  console.log(`  Would update (missing set): ${recommendationCandidates.length}`);
  console.log(`  Skipped (deleted/archived): ${recsSkippedDeleted}`);
  console.log(`  Skipped (already has set):  ${recsSkippedHasSet}`);
  console.log('');

  console.log(`Sample findings (up to ${SAMPLE_LIMIT} of ${findingCandidates.length}):`);
  for (const c of findingCandidates.slice(0, SAMPLE_LIMIT)) {
    console.log(`  doc=${c.docId}  ${JSON.stringify(c.shortLabel)}`);
  }
  if (findingCandidates.length > SAMPLE_LIMIT) {
    console.log(`  ... and ${findingCandidates.length - SAMPLE_LIMIT} more`);
  }
  console.log('');
  console.log(`Sample recommendations (up to ${SAMPLE_LIMIT} of ${recommendationCandidates.length}):`);
  for (const c of recommendationCandidates.slice(0, SAMPLE_LIMIT)) {
    console.log(`  doc=${c.docId}  ${JSON.stringify(c.shortLabel)}`);
  }
  if (recommendationCandidates.length > SAMPLE_LIMIT) {
    console.log(`  ... and ${recommendationCandidates.length - SAMPLE_LIMIT} more`);
  }

  if (!write) {
    console.log('');
    console.log('Dry-run complete. No Firestore writes. Re-run with --write to apply (after approval).');
    return;
  }

  let written = 0;
  let batch = db.batch();
  let ops = 0;

  async function enqueue(collection: 'findings' | 'recommendations', docId: string) {
    const ref = db.collection(collection).doc(docId);
    batch.set(ref, LIBRARY_PATCH, { merge: true });
    ops++;
    written++;
    if (ops >= BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
      console.log(`Committed batch… (${written} writes so far)`);
    }
  }

  for (const c of findingCandidates) {
    await enqueue('findings', c.docId);
  }
  for (const c of recommendationCandidates) {
    await enqueue('recommendations', c.docId);
  }

  if (ops > 0) {
    await batch.commit();
  }

  console.log('');
  console.log(
    `Write complete. Updated ${findingCandidates.length} finding(s) and ${recommendationCandidates.length} recommendation(s) (${written} total doc updates).`
  );
}

main().catch((e) => {
  console.error(e);
  printCredentialHelp();
  process.exit(1);
});
