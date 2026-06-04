# RAS Findings Import Format

**Status:** Planning / import-format spec. **Offline dry-run skeleton implemented** (no Firestore reads/writes).  
**Last updated:** 2026-06-03  
**Audience:** Product owner, content authors, architecture review, future importer implementers

> **Disclaimer:** This document defines how curated RAS Plan Review **comments** may be authored in spreadsheets and later imported into Firestore **`rasFindings`**. It does **not** assert TDLR legal compliance, final field names in production, or importer behavior until a separate implementation branch is approved per **AGENTS.md**.

---

## 1. Purpose

Define the **spreadsheet authoring format** and **target Firestore document shape** for curated **RAS Plan Review** findings/comments before any Firestore importer is written.

This spec supports the workflow decided in **`docs/CONVERT_TO_RAS.md`**: RAS Plan Review content is built in **reviewed spreadsheet batches** derived from **TAS 2012**, then imported into an independent **`rasFindings`** library—not cloned wholesale from the existing assessment **`findings`** collection.

**This document is planning only.** No application code, Firestore rules, or production writes. **Phase 8:** offline dry-run CLI validates spreadsheet batches locally.

**Dry-run command (offline v1 — no credentials):**

```text
npx tsx scripts/maintenance/dry-run-ras-findings-import.ts --input path/to/batch.xlsx
```

Outputs gitignored reports: **`reports/ras-findings-import-dry-run.json`** and **`.md`**. Item/standard resolution is **deferred** in v1 (`firestore_resolution_deferred_v1`).

**Human-facing spreadsheet layout:** column order, valid values, example rows, and authoring checklist are in **`docs/RAS_FINDINGS_SPREADSHEET_TEMPLATE.md`**. **Blank workbook:** **`templates/RAS_FINDINGS_TEMPLATE.xlsx`**. This file remains the authority for Firestore field map and import safety rules.

---

## 2. Source workflow

```text
TAS 2012 source material
  → spreadsheet batch (authoring)
  → human review / edit / vet
  → reviewStatus = approved
  → dry-run import report
  → explicit --write import (future)
  → rasFindings (Firestore)
```

| Step | Detail |
|------|--------|
| **Authoring** | Build rows in spreadsheet batches (Plan Review comment wording, category/item, TAS refs, tags). |
| **Review** | Staff edit, reject, or approve rows; track notes in **reviewerNotes**. |
| **Reference only** | Existing assessment **TAS findings** may seed or inspire rows but are **not** authoritative. |
| **Import** | Only **approved** rows import by default (see §5). |
| **Independence** | **`rasFindings`** is first-class RAS library content with **new IDs**. |
| **No provenance FK** | **`fldSourceFindID` is not required** and is **not** part of v1 import format. |

---

## 3. RAS library principles

| Principle | Rule |
|-----------|------|
| **Content type** | RAS records are **comments/findings**, not recommendations. |
| **Excluded fields** | No recommendation text, rec IDs, quantity, unit cost, total cost, or measurement/cost metadata on **`rasFindings`**. |
| **Report label** | User-facing label on RAS deliverables: **“Comment”** (see **`docs/CONVERT_TO_RAS.md` §8). |
| **Internal text fields** | Keep **`fldFindShort`** / **`fldFindLong`** for search, navigation, and report body text. |
| **Standards scope** | **TAS 2012 only** for this library (`fldStandardType` = `TAS`, `fldStandardVersion` = `2012`). |
| **Identity** | **New independent `fldFindID`** per imported row (UUID v4 or equivalent). |
| **Library type** | **`fldFindingLibraryType` = `ras_plan_review`** for Plan Review curated imports (see Open Questions for inspection library). |

---

## 4. Required spreadsheet columns

Authors should use one row per importable RAS comment. Column names below are **canonical for v1**; importers may accept normalized aliases in a future mapping table.

**Concrete template:** tab layout, full column table with formats, example rows, and pre-import checklist → **`docs/RAS_FINDINGS_SPREADSHEET_TEMPLATE.md`**.

### Core content (required for import)

| Column | Required | Description |
|--------|----------|-------------|
| **`rasFindShort`** | Yes | Short comment label for library search and pickers (maps to **`fldFindShort`**). |
| **`rasFindLong`** | Yes | Report-visible comment body for RAS v1 (maps to **`fldFindLong`**). |
| **`categoryName`** | Yes* | Human category name for resolution to **`categories`**. |
| **`itemName`** | Yes* | Human item name for resolution to **`items`**. |
| **`fldItem`** | Preferred | Stable item ID when known; if present, **wins** over name resolution. |
| **`tasRefs`** | Yes | TAS citation references for resolution to **`master_standards`** / standards IDs (see §8). |
| **`reviewStatus`** | Yes | Workflow state; only **`approved`** rows import by default (§5). |

\*If **`fldItem`** is provided and resolves, **`categoryName`** may be derived from the item’s category; importer still validates consistency.

### Classification (recommended)

| Column | Required | Description |
|--------|----------|-------------|
| **`findingType`** | Recommended | Comment/deficiency class (§6). |
| **`applicabilityTags`** | Optional | Semicolon- or comma-separated tags (§7). |
| **`isCompound`** | Optional | `true` / `false` — compound comment flag. |
| **`sortOrder`** | Optional | Numeric sort hint within item (`fldOrder`). |

### Review / import control

| Column | Required | Description |
|--------|----------|-------------|
| **`reviewerNotes`** | Optional | Internal review notes; not imported to Firestore report fields. |
| **`importAction`** | Optional | `create` (default), `skip`, or `update` (§12). |
| **`active`** | Optional | `true` / `false`; maps to soft-delete flags when false. |

### Forbidden columns (must be empty or absent)

Importers **must reject or flag** rows that populate any of:

- `recShort`, `recLong`, `recommendation`, `fldRecShort`, `fldRecLong`
- `fldUnitCost`, `fldQTY`, `fldTotalCost`, `quantity`, `unitCost`, `totalCost`
- Any recommendation or cost column from assessment export templates

---

## 5. Recommended review statuses

| Status | Meaning | Importable by default? |
|--------|---------|------------------------|
| **`draft`** | Initial authoring | No |
| **`needs_review`** | Ready for reviewer | No |
| **`approved`** | Vetted for library | **Yes** |
| **`rejected`** | Do not import | No |
| **`imported`** | Already written to Firestore (bookkeeping) | No (unless **`importAction=update`**) |

**Default importer rule:** only rows with **`reviewStatus` = `approved`** are eligible. Override (e.g. include `draft` for dev-only runs) requires explicit non-production flag and approval.

---

## 6. Finding / comment types (`findingType`)

Controlled vocabulary for **`fldFindingType`** (importer may warn on unknown values):

| Value | Typical use |
|-------|-------------|
| **`noncompliance`** | Clear TAS deficiency / non-compliant condition |
| **`insufficient_information`** | Plans/drawings lack detail to verify compliance |
| **`coordination_issue`** | Cross-discipline / sheet coordination problem |
| **`best_practice`** | Recommended practice beyond minimum (use sparingly) |
| **`caution`** | Risk or ambiguity warranting attention |
| **`informational`** | Neutral observation, not necessarily a deficiency |

Types drive filtering and QA; they are **not** report boilerplate by themselves.

---

## 7. Applicability tags (`applicabilityTags`)

Tags support **filtering and search** in library tooling. They are **not** report-visible text.

Examples (non-exhaustive):

- `plan_review`
- `inspection`
- `site`
- `parking`
- `toilet_rooms`
- `accessible_route`
- `transient_lodging`
- `employee_work_area`

**Format in spreadsheet:** semicolon-separated list, e.g. `plan_review;parking;accessible_route`.

**Storage:** array on document — **`fldApplicabilityTags`**.

---

## 8. Standards / citation mapping

| Rule | Detail |
|------|--------|
| **Source column** | **`tasRefs`** — one or more TAS references per row. |
| **Format** | Prefer standards **document IDs** already in **`master_standards`** / TAS library when known; otherwise citation keys resolvable by importer (e.g. `302.1`, `404.2.3.2`) with explicit match rules in importer spec. |
| **Resolution** | Importer **dry-run must list unresolved** references; no silent drop. |
| **Storage** | Resolved IDs → **`fldStandards`** (string array), same conceptual model as findings. |
| **No rec citations** | Do not import recommendation-linked or assessment-only citation bundles. |
| **Preserve on row** | Standards live on the **`rasFindings`** document, not on a separate recommendation master. |
| **TAS 2012 only** | Rows referencing non-TAS standards are **skipped** with reason in dry-run report. |

---

## 9. Category / item mapping

| Rule | Detail |
|------|--------|
| **Prefer IDs** | **`fldItem`** when stable; importer validates item exists and is active. |
| **Name resolution** | If only **`categoryName`** + **`itemName`**, importer resolves against **`categories`** / **`items`**. |
| **Ambiguity** | Multiple matches → row **skipped**; dry-run lists candidates. |
| **No auto-create (v1)** | Importer **must not** create categories or items unless explicitly approved in a future spec revision. |
| **Consistency** | If both ID and names provided, ID wins; names must match or row is flagged. |

---

## 10. Target Firestore shape (`rasFindings`)

Proposed document fields for imported Plan Review rows:

| Field | Type | Notes |
|-------|------|-------|
| **`fldFindID`** | string | Document ID; new UUID per create |
| **`fldFindShort`** | string | From **`rasFindShort`** |
| **`fldFindLong`** | string | From **`rasFindLong`** |
| **`fldItem`** | string | FK to **`items.fldItemID`** |
| **`fldStandards`** | string[] | Resolved TAS standard IDs |
| **`fldStandardType`** | string | `"TAS"` |
| **`fldStandardVersion`** | string | `"2012"` |
| **`fldFindingLibraryType`** | string | `"ras_plan_review"` |
| **`fldNeedsReview`** | boolean | Optional; true if post-import QA flag needed |
| **`fldReviewStatus`** | string | Copy of spreadsheet **`reviewStatus`** at import time |
| **`fldFindingType`** | string | From **`findingType`** |
| **`fldApplicabilityTags`** | string[] | From **`applicabilityTags`** |
| **`fldIsCompound`** | boolean | From **`isCompound`** |
| **`fldOrder`** | number | From **`sortOrder`** |
| **`fldDeleted`** / **`fldIsDeleted`** | boolean | Soft-delete; set when **`active`** = false |
| **`fldCreatedAt`** / **`fldLastModified`** | timestamp | Set by importer / **`firestoreService`** on write |

**Explicitly absent:** recommendation fields, cost fields, glossary set IDs for assessment, **`fldSourceFindID`**.

Collection name **`rasFindings`** is planning terminology; final collection name and Firestore rules require architecture approval before implementation.

---

## 11. Import safety rules

Future importer (not in this branch) must follow **AGENTS.md** data safety:

| Rule | Requirement |
|------|-------------|
| **Dry-run default** | No Firestore writes unless explicit **`--write`** (or equivalent) **and** confirmation flag. |
| **Preview artifacts** | Emit **JSON and/or CSV report**: proposed creates, updates, skips, errors. |
| **Unresolved refs** | Block write if configured strict mode; otherwise skip row and report. |
| **No overwrite** | Do not update existing **`rasFindings`** unless **`importAction` = `update`** and dry-run matched target ID. |
| **No rec/cost** | Reject rows with recommendation/cost columns populated. |
| **No secrets** | Never commit service account JSON; use env-based credentials per maintenance script pattern. |
| **Environment** | Document target project; require operator confirmation for production. |

Reference pattern: **`scripts/maintenance/dry-run-ras-findings-import.ts`** (offline dry-run; no credentials). Firestore-backed maintenance scripts such as **`report-orphans.ts`** remain separate.

---

## 12. Duplicate and update strategy

| Topic | v1 rule |
|-------|---------|
| **New rows** | **`importAction` absent or `create`** → new **`fldFindID`**. |
| **Updates** | **`importAction` = `update`** requires existing **`fldFindID`** in spreadsheet or explicit match key (future). Offline v1 skips with **`import_action_update_not_supported_v1`**. |
| **Skips** | **`importAction` = `skip`** → dry-run lists as skipped. |
| **No source FK** | **`fldSourceFindID` not required**; do not dedupe by assessment finding ID. |
| **Duplicate detection** | Offline v1: within-batch **`rasFindShort`** + item key. Future: collisions against existing **`rasFindings`**. |
| **Re-import** | Rows marked **`imported`** in spreadsheet should not create duplicates unless **`update`** is explicit. |
| **Future stable key** | Optional **`importKey`** column may be added later for idempotent re-import; not required for v1. |

---

## 13. Validation / dry-run report

Offline v1 dry-run (`mode: offline_dry_run_v1`) output includes at minimum:

| Metric / section | Content |
|------------------|---------|
| **totalRows** | All non-empty data rows in batch |
| **approvedRows** | Rows with **`reviewStatus=approved`** |
| **structurallyValidRows** | Approved rows passing required-field, enum, duplicate, and forbidden-column checks |
| **blockedRows** | Rows blocked by validation (missing required, invalid values, duplicate in batch) |
| **blockedPendingFirestoreResolution** | Structurally valid rows whose item/standard IDs are not resolved offline |
| **skippedRows** | By reason code (**`importAction=skip`**, **`update` not supported v1**, non-**`approved`** status, etc.) |
| **proposedCreatePreviews** | Preview-only proposed **`rasFindings`** document shape (not written) |
| **unresolvedItems** | Row index, names/ID, reason **`firestore_resolution_deferred_v1`** |
| **unresolvedStandards** | Row index, **`tasRefs`** tokens, deferred reason |
| **duplicateWarnings** | Within-batch normalized **`rasFindShort`** + item key collisions |
| **missingRequired** | Row index, missing column list |
| **forbiddenColumnsPopulated** | Forbidden header/column presence |
| **proposedCreates** | Preview document list (same as **proposedCreatePreviews** count) |
| **proposedUpdates** | Empty in offline v1 (**`importAction=update`** not supported) |

Future Firestore-backed dry-run may add **`importableRows`** after resolution; offline v1 does **not** report rows as fully importable when resolution is deferred.

---

## 14. Non-goals

- **No Data Entry RAS mode** in this spec phase  
- **No RAS report generator** (PDF / Web Report RAS template)  
- **No Firestore write importer** (offline dry-run skeleton only for Phase 8)  
- **No Firestore schema/rules/migration** until architecture approval  
- **No client portal / outstanding-issue workflow**  
- **No TDLR legal compliance claim** until verified against official sources  
- **No automatic category/item creation** in v1  
- **No clone-from-`findings`** authoritative import path  

---

## 15. Open questions

| ID | Question | Notes |
|----|----------|-------|
| **Q-RAS-IMP-001** | **Spreadsheet source of truth:** Google Sheets export CSV, Excel (`.xlsx`), or checked-in CSV only? | **v1 authoring artifact:** **`templates/RAS_FINDINGS_TEMPLATE.xlsx`**. Future importer parser format TBD. |
| **Q-RAS-IMP-002** | Should **`findingType`** be a strict enum in Firestore rules / importer, or free text with warnings? | Affects validation strictness. |
| **Q-RAS-IMP-003** | Is one **`rasFindings`** library enough, or separate **`ras_plan_review`** vs **`ras_inspection`** libraries/collections? | Plan Review uses this spec; Inspection may reuse assessment TAS glossary per **`CONVERT_TO_RAS.md`**. |
| **Q-RAS-IMP-004** | Must Plan Review rows be **`approved`** in spreadsheet before any Firestore write? | Default here: **yes** for production. |
| **Q-RAS-IMP-005** | Exact **`tasRefs`** syntax: citation numbers only, standard doc IDs, or pipe-delimited mixed? | Importer matching rules TBD in implementation branch. |
| **Q-RAS-IMP-006** | Should **`reviewerNotes`** be stored on Firestore doc or remain spreadsheet-only? | v1: spreadsheet-only unless audit trail needed. |
| **Q-RAS-IMP-007** | Batch size limits and partial-failure behavior for large imports? | Firestore batch limits; transaction strategy in implementation. |

---

## Related documentation

- **`templates/RAS_FINDINGS_TEMPLATE.xlsx`** — blank v1 authoring workbook  
- **`docs/RAS_FINDINGS_SPREADSHEET_TEMPLATE.md`** — human authoring spreadsheet layout, valid values, examples, checklist  
- **`docs/CONVERT_TO_RAS.md`** — RAS product planning, glossary direction, phased delivery  
- **`docs/ARCHITECTURE_DESIGN.md`** — durable ✅ DECIDED blocks when RAS is implemented  
- **`AGENTS.md`** — Firestore write safety, protected areas, behavior disclosure  

When implementation begins, add concise **✅ DECIDED** entries to **`ARCHITECTURE_DESIGN.md`** and keep this file as the import-format source of truth.
