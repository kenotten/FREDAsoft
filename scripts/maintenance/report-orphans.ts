/**
 * Read-only maintenance: report orphan / integrity reference counts in Firestore.
 *
 * Uses Firebase Admin SDK (bypasses client security rules). No writes, deletes, or restores.
 *
 * Credentials (service account JSON path — keep local / secret):
 *
 *   PowerShell:
 *     $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
 *     npx tsx scripts/maintenance/report-orphans.ts
 *
 *   cmd.exe:
 *     set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json
 *     npx tsx scripts/maintenance/report-orphans.ts
 *
 * Optional explicit project:
 *     $env:FIREBASE_PROJECT_ID="your-project-id"
 *
 * If firebase-applet-config.json exists in the repo root, projectId is read from there
 * when env vars are unset — no credentials in that file.
 *
 * This script has no --apply mode (read-only only).
 */
import fs from 'fs';
import path from 'path';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const SAMPLE_LIMIT = 25;

function printCredentialHelp(): void {
  console.error(`
Firebase Admin could not initialize or access Firestore.

Set Application Default Credentials to a service account key (do not commit the JSON):

  PowerShell:
    $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\service-account.json"
    npx tsx scripts/maintenance/report-orphans.ts

  cmd.exe:
    set GOOGLE_APPLICATION_CREDENTIALS=C:\\path\\to\\service-account.json
    npx tsx scripts/maintenance/report-orphans.ts

Optional:
    $env:FIREBASE_PROJECT_ID="your-firebase-project-id"

The service account needs Firestore read access on the target project.
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

function addId(set: Set<string>, v: unknown): void {
  const s = norm(v);
  if (s) set.add(s);
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

function buildIdSet(rows: Row[], docId: boolean, ...fieldNames: string[]): Set<string> {
  const set = new Set<string>();
  for (const r of rows) {
    if (docId) addId(set, r.id);
    for (const f of fieldNames) {
      addId(set, r.data[f]);
    }
  }
  return set;
}

type OrphanBucket = {
  key: string;
  label: string;
  active: Row[];
  soft: Row[];
};

function bucketCounts(b: OrphanBucket): { active: number; soft: number; total: number } {
  return { active: b.active.length, soft: b.soft.length, total: b.active.length + b.soft.length };
}

function printBucket(b: OrphanBucket, formatSample: (r: Row) => string): void {
  const { active, soft, total } = bucketCounts(b);
  console.log(`${b.label}: ${total} (active: ${active}, soft-deleted/archived: ${soft})`);
  let n = 0;
  for (const r of b.active) {
    if (n >= SAMPLE_LIMIT) break;
    console.log(`  [active] ${formatSample(r)}`);
    n++;
  }
  for (const r of b.soft) {
    if (n >= SAMPLE_LIMIT) break;
    console.log(`  [soft-deleted/archived] ${formatSample(r)}`);
    n++;
  }
  if (total > SAMPLE_LIMIT) {
    console.log(`  ... (${total - SAMPLE_LIMIT} more not shown)`);
  }
  console.log('');
}

function pdContext(r: Row): string {
  const d = r.data;
  return [
    `fldPDataID=${norm(r.id) || norm(d.fldPDataID)}`,
    `fldPDataProject=${norm(d.fldPDataProject) || '(blank)'}`,
    `fldFacility=${norm(d.fldFacility) || '(blank)'}`,
    `fldLocation=${norm(d.fldLocation) || '(blank)'}`,
    `fldFindShort=${JSON.stringify(norm(d.fldFindShort) || '(blank)')}`,
  ].join(' | ');
}

async function main() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(
      'Note: GOOGLE_APPLICATION_CREDENTIALS is not set. Using Application Default Credentials if available; otherwise set it to a service account JSON path.\n'
    );
  }

  ensureAdminApp();
  const db = getFirestore();

  let clients: Row[], facilities: Row[], projects: Row[], projectData: Row[], locations: Row[];
  let categories: Row[], items: Row[], findings: Row[], glossary: Row[];

  try {
    [clients, facilities, projects, projectData, locations, categories, items, findings, glossary] =
      await Promise.all([
        fetchAll(db, 'clients'),
        fetchAll(db, 'facilities'),
        fetchAll(db, 'projects'),
        fetchAll(db, 'projectData'),
        fetchAll(db, 'locations'),
        fetchAll(db, 'categories'),
        fetchAll(db, 'items'),
        fetchAll(db, 'findings'),
        fetchAll(db, 'glossary'),
      ]);
  } catch (e: unknown) {
    console.error('Failed to read one or more collections.', e);
    printCredentialHelp();
    process.exit(1);
  }

  const clientIds = buildIdSet(clients, true, 'fldClientID');
  const facilityIds = buildIdSet(facilities, true, 'fldFacID');
  const projectIds = buildIdSet(projects, true, 'fldProjID');
  const locationIds = buildIdSet(locations, true, 'fldLocID');
  const categoryIds = buildIdSet(categories, true, 'fldCategoryID', 'id');
  const itemIds = buildIdSet(items, true, 'fldItemID', 'id');
  const findingIds = buildIdSet(findings, true, 'fldFindID', 'id');
  const glossaryIds = buildIdSet(glossary, true, 'fldGlosId');

  const facMissingClient: OrphanBucket = {
    key: 'facilities_missing_client',
    label: 'Facilities missing client (fldClient not in clients)',
    active: [],
    soft: [],
  };
  for (const r of facilities) {
    const fk = norm(r.data.fldClient);
    if (!fk || !clientIds.has(fk)) {
      (r.soft ? facMissingClient.soft : facMissingClient.active).push(r);
    }
  }

  const projMissingClient: OrphanBucket = {
    key: 'projects_missing_client',
    label: 'Projects missing client (fldClient not in clients)',
    active: [],
    soft: [],
  };
  for (const r of projects) {
    const fk = norm(r.data.fldClient);
    if (!fk || !clientIds.has(fk)) {
      (r.soft ? projMissingClient.soft : projMissingClient.active).push(r);
    }
  }

  const pdMissingProject: OrphanBucket = {
    key: 'projectdata_missing_project',
    label: 'ProjectData missing project (fldPDataProject not in projects)',
    active: [],
    soft: [],
  };
  for (const r of projectData) {
    if ((r.data as { citation_num?: unknown }).citation_num) continue;
    const fk = norm(r.data.fldPDataProject);
    if (!fk || !projectIds.has(fk)) {
      (r.soft ? pdMissingProject.soft : pdMissingProject.active).push(r);
    }
  }

  const pdMissingFacility: OrphanBucket = {
    key: 'projectdata_missing_facility',
    label: 'ProjectData missing facility (non-blank fldFacility not in facilities)',
    active: [],
    soft: [],
  };
  for (const r of projectData) {
    if ((r.data as { citation_num?: unknown }).citation_num) continue;
    const fk = norm(r.data.fldFacility);
    if (!fk) continue;
    if (!facilityIds.has(fk)) {
      (r.soft ? pdMissingFacility.soft : pdMissingFacility.active).push(r);
    }
  }

  const pdMissingLocation: OrphanBucket = {
    key: 'projectdata_missing_location',
    label: 'ProjectData missing location (non-blank fldLocation not in locations)',
    active: [],
    soft: [],
  };
  for (const r of projectData) {
    if ((r.data as { citation_num?: unknown }).citation_num) continue;
    const fk = norm(r.data.fldLocation);
    if (!fk) continue;
    if (!locationIds.has(fk)) {
      (r.soft ? pdMissingLocation.soft : pdMissingLocation.active).push(r);
    }
  }

  const pdMissingCategory: OrphanBucket = {
    key: 'projectdata_missing_category',
    label:
      'ProjectData missing category (fldPDataCategoryID present non-blank but not in categories)',
    active: [],
    soft: [],
  };
  for (const r of projectData) {
    if ((r.data as { citation_num?: unknown }).citation_num) continue;
    if (!Object.prototype.hasOwnProperty.call(r.data, 'fldPDataCategoryID')) continue;
    const fk = norm(r.data.fldPDataCategoryID);
    if (!fk) continue;
    if (!categoryIds.has(fk)) {
      (r.soft ? pdMissingCategory.soft : pdMissingCategory.active).push(r);
    }
  }

  const pdMissingItem: OrphanBucket = {
    key: 'projectdata_missing_item',
    label: 'ProjectData missing item (fldPDataItemID present non-blank but not in items)',
    active: [],
    soft: [],
  };
  for (const r of projectData) {
    if ((r.data as { citation_num?: unknown }).citation_num) continue;
    if (!Object.prototype.hasOwnProperty.call(r.data, 'fldPDataItemID')) continue;
    const fk = norm(r.data.fldPDataItemID);
    if (!fk) continue;
    if (!itemIds.has(fk)) {
      (r.soft ? pdMissingItem.soft : pdMissingItem.active).push(r);
    }
  }

  const pdMissingGlossary: OrphanBucket = {
    key: 'projectdata_missing_glossary',
    label: 'ProjectData missing glossary row (non-blank fldData not in glossary by fldGlosId / doc id)',
    active: [],
    soft: [],
  };
  for (const r of projectData) {
    if ((r.data as { citation_num?: unknown }).citation_num) continue;
    const fk = norm(r.data.fldData);
    if (!fk) continue;
    if (!glossaryIds.has(fk)) {
      (r.soft ? pdMissingGlossary.soft : pdMissingGlossary.active).push(r);
    }
  }

  const pdMissingMasterFind: OrphanBucket = {
    key: 'projectdata_missing_master_find',
    label:
      'ProjectData missing master finding (fldPDataMasterFindID present non-blank but not in findings)',
    active: [],
    soft: [],
  };
  for (const r of projectData) {
    if ((r.data as { citation_num?: unknown }).citation_num) continue;
    if (!Object.prototype.hasOwnProperty.call(r.data, 'fldPDataMasterFindID')) continue;
    const fk = norm(r.data.fldPDataMasterFindID);
    if (!fk) continue;
    if (!findingIds.has(fk)) {
      (r.soft ? pdMissingMasterFind.soft : pdMissingMasterFind.active).push(r);
    }
  }

  const locMissingFacility: OrphanBucket = {
    key: 'locations_missing_facility',
    label: 'Locations missing facility (non-blank fldFacID not in facilities)',
    active: [],
    soft: [],
  };
  for (const r of locations) {
    const fk = norm(r.data.fldFacID);
    if (!fk) continue;
    if (!facilityIds.has(fk)) {
      (r.soft ? locMissingFacility.soft : locMissingFacility.active).push(r);
    }
  }

  console.log('Orphan report (read-only, Firebase Admin)');
  console.log('==========================================');
  console.log(`Clients loaded:     ${clients.length}`);
  console.log(`Facilities loaded:  ${facilities.length}`);
  console.log(`Projects loaded:    ${projects.length}`);
  console.log(`ProjectData loaded: ${projectData.length}`);
  console.log(`Locations loaded:   ${locations.length}`);
  console.log(`Categories loaded:  ${categories.length}`);
  console.log(`Items loaded:       ${items.length}`);
  console.log(`Findings loaded:    ${findings.length}`);
  console.log(`Glossary loaded:    ${glossary.length}`);
  console.log('');
  console.log(
    'Soft-deleted/archived means any of: fldDeleted===true | fldIsDeleted===true | fldIsArchived===true'
  );
  console.log('ID matching: trimmed string equality (case-sensitive). Blank IDs treated as missing refs where noted.');
  console.log('ProjectData rows with citation_num set are excluded (legacy import rows).');
  console.log('');

  printBucket(facMissingClient, (r) => `id=${r.id} fldClient=${norm(r.data.fldClient) || '(blank)'} fldFacName=${JSON.stringify(norm(r.data.fldFacName))}`);
  printBucket(projMissingClient, (r) => `id=${r.id} fldClient=${norm(r.data.fldClient) || '(blank)'} fldProjName=${JSON.stringify(norm(r.data.fldProjName))}`);
  printBucket(pdMissingProject, (r) => `${pdContext(r)}`);
  printBucket(pdMissingFacility, (r) => `${pdContext(r)}`);
  printBucket(pdMissingLocation, (r) => `${pdContext(r)}`);
  printBucket(pdMissingCategory, (r) => `${pdContext(r)} | fldPDataCategoryID=${norm(r.data.fldPDataCategoryID)}`);
  printBucket(pdMissingItem, (r) => `${pdContext(r)} | fldPDataItemID=${norm(r.data.fldPDataItemID)}`);
  printBucket(pdMissingGlossary, (r) => `${pdContext(r)} | fldData=${norm(r.data.fldData)}`);
  printBucket(pdMissingMasterFind, (r) => `${pdContext(r)} | fldPDataMasterFindID=${norm(r.data.fldPDataMasterFindID)}`);
  printBucket(locMissingFacility, (r) => `id=${r.id} fldFacID=${norm(r.data.fldFacID)} fldLocName=${JSON.stringify(norm(r.data.fldLocName))} fldProjectID=${norm(r.data.fldProjectID)}`);

  console.log('Done. No writes performed.');
}

main().catch((e) => {
  console.error(e);
  printCredentialHelp();
  process.exit(1);
});
