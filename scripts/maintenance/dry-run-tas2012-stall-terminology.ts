/**
 * DRY RUN ONLY — stall → compartment terminology in TAS 2012 Toilet Rooms / Bathing Rooms.
 *
 * No Firestore writes. Outputs:
 *   - reports/tas2012-stall-terminology-dry-run.md
 *   - reports/tas2012-stall-terminology-dry-run.json
 *
 * Credentials (same as report-glossary-integrity.ts):
 *
 *   PowerShell:
 *     $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
 *     npx tsx scripts/maintenance/dry-run-tas2012-stall-terminology.ts
 *
 * Optional:
 *     $env:FIREBASE_PROJECT_ID="your-project-id"
 */
import fs from 'fs';
import path from 'path';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { resolveGlossarySetForRecord, resolveGlossarySetLabelForKey } from '../../src/lib/glossarySets.ts';
import { getRecommendationAssociatedItemIds } from '../../src/lib/libraryRecommendationMetadata.ts';

const REPORT_DIR = path.join(process.cwd(), 'reports');
const MD_PATH = path.join(REPORT_DIR, 'tas2012-stall-terminology-dry-run.md');
const JSON_PATH = path.join(REPORT_DIR, 'tas2012-stall-terminology-dry-run.json');

const TAS_2012_ID = 'TAS_2012';
const TARGET_CATEGORY_NAMES = new Set(['toilet rooms', 'bathing rooms']);

/** Whole-word stall / stalls only (not install, stalling, etc.). */
const STALL_MATCH_RE = /\bstalls\b|\bstall\b/gi;

type SourceType = 'master_library' | 'glossary_row' | 'projectData';

type ProposedReplacement = {
  collection: string;
  documentId: string;
  fieldPath: string;
  currentExcerpt: string;
  proposedExcerpt: string;
  resolvedGlossarySet: string;
  resolvedCategory: string;
  sourceType: SourceType;
  active: boolean;
  deletedOrArchived: boolean;
  matchQuality: 'straightforward' | 'ambiguous';
  /** If excluded from default write batch */
  excludedFromWrite: boolean;
  exclusionReason?: string;
};

type Row = { id: string; data: Record<string, unknown>; soft: boolean };

function printCredentialHelp(): void {
  console.error(`
Firebase Admin could not initialize or access Firestore.

Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path (do not commit the JSON).
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

function normKey(v: unknown): string {
  return norm(v).toLowerCase();
}

function isSoftDeleted(data: Record<string, unknown>): boolean {
  return data.fldDeleted === true || data.fldIsDeleted === true || data.fldIsArchived === true;
}

function isTas2012Set(data: Record<string, unknown>): boolean {
  const resolved = resolveGlossarySetForRecord(data);
  return resolved.setKey.toUpperCase() === TAS_2012_ID;
}

function resolvedSetLabel(data: Record<string, unknown>): string {
  return resolveGlossarySetForRecord(data).setLabel;
}

async function fetchAll(db: Firestore, name: string): Promise<Row[]> {
  const snap = await db.collection(name).get();
  const out: Row[] = [];
  snap.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    out.push({ id: d.id, data, soft: isSoftDeleted(data) });
  });
  return out;
}

function capitalizeLike(sourceWord: string, replacement: string): string {
  if (sourceWord === sourceWord.toUpperCase()) return replacement.toUpperCase();
  if (sourceWord.length > 0 && sourceWord[0] === sourceWord[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function replaceStallWord(word: string): string {
  const lower = word.toLowerCase();
  if (lower === 'stalls') return capitalizeLike(word, 'compartments');
  if (lower === 'stall') return capitalizeLike(word, 'compartment');
  return word;
}

export function replaceStallTerminologyInText(text: string): { next: string; changed: boolean } {
  if (!text || !STALL_MATCH_RE.test(text)) {
    return { next: text, changed: false };
  }
  STALL_MATCH_RE.lastIndex = 0;
  let changed = false;
  const next = text.replace(STALL_MATCH_RE, (match) => {
    const rep = replaceStallWord(match);
    if (rep !== match) changed = true;
    return rep;
  });
  return { next, changed };
}

function excerptAroundMatch(text: string, maxLen = 120): string {
  const m = STALL_MATCH_RE.exec(text);
  STALL_MATCH_RE.lastIndex = 0;
  if (!m || m.index === undefined) return text.slice(0, maxLen);
  const start = Math.max(0, m.index - 40);
  const end = Math.min(text.length, m.index + m[0].length + 40);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return prefix + text.slice(start, end) + suffix;
}

function scanStringField(input: {
  collection: string;
  documentId: string;
  fieldPath: string;
  value: string;
  resolvedGlossarySet: string;
  resolvedCategory: string;
  sourceType: SourceType;
  soft: boolean;
  excludedFromWrite: boolean;
  exclusionReason?: string;
  matchQuality?: 'straightforward' | 'ambiguous';
}): ProposedReplacement | null {
  const { next, changed } = replaceStallTerminologyInText(input.value);
  if (!changed) return null;
  return {
    collection: input.collection,
    documentId: input.documentId,
    fieldPath: input.fieldPath,
    currentExcerpt: excerptAroundMatch(input.value),
    proposedExcerpt: excerptAroundMatch(next),
    resolvedGlossarySet: input.resolvedGlossarySet,
    resolvedCategory: input.resolvedCategory,
    sourceType: input.sourceType,
    active: !input.soft,
    deletedOrArchived: input.soft,
    matchQuality: input.matchQuality ?? 'straightforward',
    excludedFromWrite: input.excludedFromWrite,
    exclusionReason: input.exclusionReason,
  };
}

function mainHeader(title: string): string {
  return `\n## ${title}\n\n`;
}

async function main() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(
      'Note: GOOGLE_APPLICATION_CREDENTIALS is not set. Using Application Default Credentials if available.\n'
    );
  }

  ensureAdminApp();
  const db = getFirestore();

  let glossary: Row[],
    projectData: Row[],
    findings: Row[],
    recommendations: Row[],
    categories: Row[],
    items: Row[];

  try {
    [glossary, projectData, findings, recommendations, categories, items] = await Promise.all([
      fetchAll(db, 'glossary'),
      fetchAll(db, 'projectData'),
      fetchAll(db, 'findings'),
      fetchAll(db, 'recommendations'),
      fetchAll(db, 'categories'),
      fetchAll(db, 'items'),
    ]);
  } catch (e: unknown) {
    console.error('Failed to read collections.', e);
    printCredentialHelp();
    process.exit(1);
  }

  const catById = new Map<string, Row>();
  const targetCategoryIds = new Set<string>();
  const categoryNameById = new Map<string, string>();

  for (const c of categories) {
    const cid = norm(c.data.fldCategoryID) || c.id;
    const name = norm(c.data.fldCategoryName);
    catById.set(normKey(cid), c);
    catById.set(normKey(c.id), c);
    categoryNameById.set(normKey(cid), name);
    if (TARGET_CATEGORY_NAMES.has(name.toLowerCase())) {
      targetCategoryIds.add(normKey(cid));
    }
  }

  const itemById = new Map<string, Row>();
  const scopedItemIds = new Set<string>();

  for (const i of items) {
    const iid = norm(i.data.fldItemID) || i.id;
    itemById.set(normKey(iid), i);
    itemById.set(normKey(i.id), i);
    const catKey = normKey(i.data.fldCatID);
    if (targetCategoryIds.has(catKey)) {
      scopedItemIds.add(normKey(iid));
    }
  }

  function categoryNameForItemId(itemId: string): string {
    const item = itemById.get(normKey(itemId));
    if (!item) return '(unknown item)';
    const catKey = normKey(item.data.fldCatID);
    return categoryNameById.get(catKey) || norm(catById.get(catKey)?.data.fldCategoryName) || '(unknown category)';
  }

  function categoryNameForCatId(catId: string): string {
    return categoryNameById.get(normKey(catId)) || norm(catById.get(normKey(catId))?.data.fldCategoryName) || '(unknown category)';
  }

  function isTargetCategoryId(catId: string): boolean {
    return targetCategoryIds.has(normKey(catId));
  }

  const findingById = new Map<string, Row>();
  for (const f of findings) {
    findingById.set(normKey(f.data.fldFindID), f);
    findingById.set(normKey(f.id), f);
  }

  const recById = new Map<string, Row>();
  for (const r of recommendations) {
    recById.set(normKey(r.data.fldRecID), r);
    recById.set(normKey(r.id), r);
  }

  const glossaryByDataKey = new Map<string, Row>();
  for (const g of glossary) {
    const glos = norm(g.data.fldGlosId);
    if (glos) glossaryByDataKey.set(normKey(glos), g);
    glossaryByDataKey.set(normKey(g.id), g);
  }

  /** Glossary rows in scope: TAS_2012 + target category */
  const glossaryInScope = new Set<string>();
  const recIdsViaGlossaryInScope = new Set<string>();
  const findIdsViaGlossaryInScope = new Set<string>();

  for (const g of glossary) {
    if (!isTas2012Set(g.data)) continue;
    const catId = norm(g.data.fldCat);
    if (!isTargetCategoryId(catId)) continue;
    glossaryInScope.add(g.id);
    glossaryInScope.add(normKey(g.data.fldGlosId));
    const recId = norm(g.data.fldRec) || norm(g.data.fldRecID);
    const findId = norm(g.data.fldFind);
    if (recId) recIdsViaGlossaryInScope.add(normKey(recId));
    if (findId) findIdsViaGlossaryInScope.add(normKey(findId));
  }

  const findingFields = ['fldFindShort', 'fldFindLong'] as const;
  const recFields = ['fldRecShort', 'fldRecLong', 'fldCitation'] as const;
  const projectDataFields = ['fldFindShort', 'fldFindLong', 'fldRecShort', 'fldRecLong'] as const;

  function resolveGlossaryRow(data: Record<string, unknown>): Row | undefined {
    const k = normKey(data.fldData);
    if (!k) return undefined;
    return glossaryByDataKey.get(k);
  }

  function isLegacyProjectDataCitationRow(data: Record<string, unknown>): boolean {
    return Object.prototype.hasOwnProperty.call(data, 'citation_num');
  }

  function pickProjectDataScanFields(data: Record<string, unknown>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const field of projectDataFields) {
      const v = norm(data[field]);
      if (v) out[field] = v;
    }
    return out;
  }

  const proposed: ProposedReplacement[] = [];
  const excluded: { reason: string; collection: string; documentId: string; fieldPath: string; excerpt: string }[] =
    [];

  // --- Master findings ---
  for (const f of findings) {
    if (!isTas2012Set(f.data)) continue;
    const itemId = norm(f.data.fldItem);
    if (!scopedItemIds.has(normKey(itemId))) continue;

    const catName = categoryNameForItemId(itemId);
    const setLabel = resolvedSetLabel(f.data);
    const docId = norm(f.data.fldFindID) || f.id;

    for (const field of findingFields) {
      const value = norm(f.data[field]);
      if (!value) continue;
      const row = scanStringField({
        collection: 'findings',
        documentId: docId,
        fieldPath: field,
        value,
        resolvedGlossarySet: setLabel,
        resolvedCategory: catName,
        sourceType: 'master_library',
        soft: f.soft,
        excludedFromWrite: f.soft,
        exclusionReason: f.soft ? 'soft-deleted/archived (excluded from default writes)' : undefined,
      });
      if (row) proposed.push(row);
    }
  }

  // --- Master recommendations ---
  for (const r of recommendations) {
    if (!isTas2012Set(r.data)) continue;
    const docId = norm(r.data.fldRecID) || r.id;
    const recKey = normKey(docId);

    const associatedIds = getRecommendationAssociatedItemIds(
      r.data as unknown as import('../../src/types').MasterRecommendation
    );
    const fldItem = norm(r.data.fldItem);
    const inScopeViaItem =
      (fldItem && scopedItemIds.has(normKey(fldItem))) ||
      associatedIds.some((id) => scopedItemIds.has(normKey(id)));
    const inScopeViaGlossary = recIdsViaGlossaryInScope.has(recKey);

    if (!inScopeViaItem && !inScopeViaGlossary) continue;

    let catName = '(multiple / via glossary)';
    if (inScopeViaGlossary) {
      const gRow = glossary.find(
        (g) =>
          glossaryInScope.has(g.id) &&
          normKey(norm(g.data.fldRec) || norm(g.data.fldRecID)) === recKey
      );
      if (gRow) catName = categoryNameForCatId(norm(gRow.data.fldCat));
    } else if (fldItem) {
      catName = categoryNameForItemId(fldItem);
    } else if (associatedIds.length > 0) {
      catName = categoryNameForItemId(associatedIds[0]);
    }

    const setLabel = resolvedSetLabel(r.data);

    for (const field of recFields) {
      const value = norm(r.data[field]);
      if (!value) continue;
      const row = scanStringField({
        collection: 'recommendations',
        documentId: docId,
        fieldPath: field,
        value,
        resolvedGlossarySet: setLabel,
        resolvedCategory: catName,
        sourceType: 'master_library',
        soft: r.soft,
        excludedFromWrite: r.soft,
        exclusionReason: r.soft ? 'soft-deleted/archived (excluded from default writes)' : undefined,
        matchQuality: field === 'fldCitation' ? 'ambiguous' : 'straightforward',
      });
      if (row) proposed.push(row);
    }
  }

  // --- Categories / items (names only; TAS scope N/A on cat/item docs) ---
  for (const c of categories) {
    const cid = norm(c.data.fldCategoryID) || c.id;
    if (!isTargetCategoryId(cid)) continue;
    const name = norm(c.data.fldCategoryName);
    const row = scanStringField({
      collection: 'categories',
      documentId: cid,
      fieldPath: 'fldCategoryName',
      value: name,
      resolvedGlossarySet: 'TAS 2012 (category in scope; no set field on category)',
      resolvedCategory: name,
      sourceType: 'master_library',
      soft: c.soft,
      excludedFromWrite: c.soft,
      exclusionReason: c.soft ? 'soft-deleted/archived (excluded from default writes)' : undefined,
    });
    if (row) proposed.push(row);
  }

  for (const i of items) {
    const iid = norm(i.data.fldItemID) || i.id;
    if (!scopedItemIds.has(normKey(iid))) continue;
    const name = norm(i.data.fldItemName);
    const catName = categoryNameForItemId(iid);
    const row = scanStringField({
      collection: 'items',
      documentId: iid,
      fieldPath: 'fldItemName',
      value: name,
      resolvedGlossarySet: 'TAS 2012 (item in scope; set resolved via linked masters/glossary)',
      resolvedCategory: catName,
      sourceType: 'master_library',
      soft: i.soft,
      excludedFromWrite: i.soft,
      exclusionReason: i.soft ? 'soft-deleted/archived (excluded from default writes)' : undefined,
    });
    if (row) proposed.push(row);
  }

  // --- Glossary rows: no app-owned long text fields; linkage only (no duplicate master text scan) ---
  const glossaryStringFields = ['fldGlossarySetName'] as const;
  for (const g of glossary) {
    if (!glossaryInScope.has(g.id) && !glossaryInScope.has(normKey(g.data.fldGlosId))) continue;
    const catName = categoryNameForCatId(norm(g.data.fldCat));
    const setLabel = resolvedSetLabel(g.data);
    for (const field of glossaryStringFields) {
      const value = norm(g.data[field]);
      if (!value) continue;
      const row = scanStringField({
        collection: 'glossary',
        documentId: norm(g.data.fldGlosId) || g.id,
        fieldPath: field,
        value,
        resolvedGlossarySet: setLabel,
        resolvedCategory: catName,
        sourceType: 'glossary_row',
        soft: g.soft,
        excludedFromWrite: g.soft,
        exclusionReason: g.soft ? 'soft-deleted/archived (excluded from default writes)' : undefined,
      });
      if (row) proposed.push(row);
    }
  }

  // --- projectData ---
  for (const pd of projectData) {
    if (isLegacyProjectDataCitationRow(pd.data)) {
      excluded.push({
        reason: 'legacy citation-shaped projectData row (skipped)',
        collection: 'projectData',
        documentId: norm(pd.data.fldPDataID) || pd.id,
        fieldPath: '(document)',
        excerpt: '',
      });
      continue;
    }

    const glos = resolveGlossaryRow(pd.data);
    let setLabel = '';
    let catId = norm(pd.data.fldPDataCategoryID);
    let inScope = false;

    if (glos && glossaryInScope.has(glos.id)) {
      inScope = true;
      setLabel = resolvedSetLabel(glos.data);
      catId = norm(glos.data.fldCat) || catId;
    } else if (glos && isTas2012Set(glos.data) && isTargetCategoryId(norm(glos.data.fldCat))) {
      inScope = true;
      setLabel = resolvedSetLabel(glos.data);
      catId = norm(glos.data.fldCat);
    } else {
      const masterFindId = norm(pd.data.fldPDataMasterFindID);
      const masterRecId = norm(pd.data.fldPDataMasterRecID);
      const findRow = masterFindId ? findingById.get(normKey(masterFindId)) : undefined;
      const recRow = masterRecId ? recById.get(normKey(masterRecId)) : undefined;
      const setRow = findRow || recRow;
      if (setRow && isTas2012Set(setRow.data)) {
        const itemId =
          norm(pd.data.fldPDataItemID) ||
          norm(findRow?.data.fldItem) ||
          norm(recRow?.data.fldItem) ||
          '';
        if (scopedItemIds.has(normKey(itemId)) || isTargetCategoryId(catId)) {
          inScope = true;
          setLabel = resolvedSetLabel(setRow.data);
          if (!catId && itemId) {
            const item = itemById.get(normKey(itemId));
            catId = norm(item?.data.fldCatID);
          }
        }
      }
    }

    if (!inScope || !isTargetCategoryId(catId)) {
      if (STALL_MATCH_RE.test(JSON.stringify(pickProjectDataScanFields(pd.data)))) {
        STALL_MATCH_RE.lastIndex = 0;
        const catName = categoryNameForCatId(catId) || '(out of scope)';
        excluded.push({
          reason: `out of scope (set=${setLabel || 'unknown'}, category=${catName})`,
          collection: 'projectData',
          documentId: norm(pd.data.fldPDataID) || pd.id,
          fieldPath: '(scan)',
          excerpt: excerptAroundMatch(norm(pd.data.fldFindShort) || norm(pd.data.fldRecShort)),
        });
      }
      continue;
    }

    const catName = categoryNameForCatId(catId);
    const docId = norm(pd.data.fldPDataID) || pd.id;

    for (const field of projectDataFields) {
      const value = norm(pd.data[field]);
      if (!value) continue;
      const row = scanStringField({
        collection: 'projectData',
        documentId: docId,
        fieldPath: field,
        value,
        resolvedGlossarySet: setLabel || resolveGlossarySetLabelForKey(TAS_2012_ID),
        resolvedCategory: catName,
        sourceType: 'projectData',
        soft: pd.soft,
        excludedFromWrite: pd.soft,
        exclusionReason: pd.soft ? 'soft-deleted/archived (excluded from default writes)' : undefined,
      });
      if (row) proposed.push(row);
    }
  }

  // --- Summary ---
  const activeProposed = proposed.filter((p) => !p.excludedFromWrite);
  const byCollection: Record<string, number> = {};
  const byField: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const bySource: Record<string, number> = {};

  for (const p of proposed) {
    byCollection[p.collection] = (byCollection[p.collection] || 0) + 1;
    byField[p.fieldPath] = (byField[p.fieldPath] || 0) + 1;
    byCategory[p.resolvedCategory] = (byCategory[p.resolvedCategory] || 0) + 1;
    bySource[p.sourceType] = (bySource[p.sourceType] || 0) + 1;
  }

  const targetCategoryList = [...categories]
    .filter((c) => targetCategoryIds.has(normKey(norm(c.data.fldCategoryID) || c.id)))
    .map((c) => `${norm(c.data.fldCategoryName)} (${norm(c.data.fldCategoryID) || c.id})`);

  let md = `# TAS 2012 Stall → Compartment Terminology (DRY RUN)

**Branch:** cleanup-tas2012-toilet-bathing-stall-terminology  
**Status:** DRY RUN ONLY — no Firestore writes performed.

### Scope rules

- Glossary set: \`TAS_2012\` / TAS 2012 via \`resolveGlossarySetForRecord\` (id → name → type/version).
- Categories: **Toilet Rooms**, **Bathing Rooms** (by \`fldCategoryName\`, case-insensitive).
- Whole-word replacement only: \\bstalls\\b / \\bstall\\b (plural pass then singular in implementation).
- **Excluded:** \`standards\` / official citation \`content_text\`; UFAS and other sets; other categories.
- **Default writes exclude:** soft-deleted/archived rows (\`fldDeleted\`, \`fldIsDeleted\`, \`fldIsArchived\`).

### Resolved target categories

${targetCategoryList.length ? targetCategoryList.map((l) => `- ${l}`).join('\n') : '- *(none found in Firestore — verify category names)*'}

### Summary counts

| Metric | Count |
|--------|------:|
| Total proposed field replacements | ${proposed.length} |
| Active (would write by default) | ${activeProposed.length} |
| Deleted/archived (reported, excluded from default writes) | ${proposed.filter((p) => p.excludedFromWrite).length} |
| Out-of-scope stall hits (excluded) | ${excluded.length} |

#### By collection

${Object.entries(byCollection)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n') || '- (none)'}

#### By field

${Object.entries(byField)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n') || '- (none)'}

#### By category

${Object.entries(byCategory)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n') || '- (none)'}

#### By source type

${Object.entries(bySource)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n') || '- (none)'}

`;

  md += mainHeader('Proposed replacements (detail)');
  md += '| Collection | Doc ID | Field | Set | Category | Source | Active | Quality | Current excerpt | Proposed excerpt |\n';
  md += '|------------|--------|-------|-----|----------|--------|--------|---------|-----------------|------------------|\n';

  for (const p of proposed) {
    const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
    md += `| ${p.collection} | ${esc(p.documentId)} | ${p.fieldPath} | ${esc(p.resolvedGlossarySet)} | ${esc(p.resolvedCategory)} | ${p.sourceType} | ${p.active ? 'yes' : 'no'} | ${p.matchQuality} | ${esc(p.currentExcerpt)} | ${esc(p.proposedExcerpt)} |\n`;
  }

  if (excluded.length) {
    md += mainHeader('Excluded matches (not proposed for write)');
    for (const e of excluded.slice(0, 100)) {
      md += `- **${e.collection}** / \`${e.documentId}\` / ${e.fieldPath}: ${e.reason}${e.excerpt ? ` — "${e.excerpt}"` : ''}\n`;
    }
    if (excluded.length > 100) md += `\n*…and ${excluded.length - 100} more.*\n`;
  }

  md += `\n---\n\n**Next step:** Review this report and approve before running a write script.\n`;

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(MD_PATH, md, 'utf-8');
  fs.writeFileSync(
    JSON_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        scope: {
          glossarySet: TAS_2012_ID,
          categories: [...TARGET_CATEGORY_NAMES],
          targetCategoryIds: [...targetCategoryIds],
          scopedItemCount: scopedItemIds.size,
        },
        summary: {
          totalProposed: proposed.length,
          activeProposed: activeProposed.length,
          excludedOutOfScope: excluded.length,
          byCollection,
          byField,
          byCategory,
          bySource,
        },
        proposed,
        excluded,
      },
      null,
      2
    ),
    'utf-8'
  );

  console.log('Dry run complete.');
  console.log(`  Proposed replacements: ${proposed.length} (${activeProposed.length} active)`);
  console.log(`  Excluded out-of-scope hits: ${excluded.length}`);
  console.log(`  Markdown: ${MD_PATH}`);
  console.log(`  JSON:   ${JSON_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
