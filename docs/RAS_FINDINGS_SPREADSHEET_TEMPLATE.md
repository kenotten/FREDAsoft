# RAS Findings Spreadsheet Template

**Status:** Planning / human authoring template (not an implementation spec). **Not implemented.**  
**Last updated:** 2026-06-02  
**Audience:** Content authors, reviewers, future importer implementers

> **Disclaimer:** This document defines a **concrete spreadsheet layout** for authoring RAS Plan Review **comments** before any Firestore importer exists. Examples are **illustrative only** and do **not** assert TDLR compliance or correct TAS citations for real projects.

**Authority for Firestore shape and import safety:** **`docs/RAS_FINDINGS_IMPORT_FORMAT.md`**

---

## 1. Purpose

Define the **human-authored spreadsheet layout** for curated **RAS Plan Review** findings/comments.

Authors use this template to:

- Draft and review comment rows in batches  
- Track review status before import  
- Hand a predictable file shape to a **future** dry-run importer  

This doc is **template planning only**—no app code, Firestore writes, or import scripts.

---

## 2. Recommended sheet tabs

| Tab | Purpose |
|-----|---------|
| **README** | Instructions, versioning, batch name, owner, disclaimer (no legal compliance claim). |
| **Findings** | One row per RAS comment; **only tab read by future importer**. |
| **Valid Values** | Copy-paste allowed values for dropdowns / data validation (§4). |
| **Import Notes** | Batch metadata: date, reviewer, source TAS sections, dry-run report filename, import decisions. |
| **Review Log** *(optional)* | Row-level review history if not tracked in **reviewerNotes** on Findings tab. |

**File format (open):** Google Sheets (export CSV), Excel (`.xlsx`), or UTF-8 CSV—see **`RAS_FINDINGS_IMPORT_FORMAT.md` Q-RAS-IMP-001**. Column order on **Findings** tab should match §3.

---

## 3. Findings tab columns

One header row; data from row 2 onward. Column names are **case-sensitive** for v1.

### Authoring columns

| Column | Required? | Allowed values / format | Maps to (Firestore) | Notes |
|--------|-----------|-------------------------|---------------------|-------|
| **`importKey`** | Optional | Stable string, e.g. `PR-2026-001` | *(importer bookkeeping only)* | Future idempotent re-import key; not required v1. |
| **`importAction`** | Optional | `create` \| `update` \| `skip` | — | Default **`create`**. **`update`** only when updating existing **`rasFindings`** doc (future). |
| **`reviewStatus`** | **Yes** | See §4 | **`fldReviewStatus`** | Only **`approved`** imports by default. |
| **`rasFindShort`** | **Yes** | Plain text; ≤ ~120 chars recommended | **`fldFindShort`** | Search, picker, navigation—not primary PDF line in v1. |
| **`rasFindLong`** | **Yes** | Plain text; may be multi-sentence | **`fldFindLong`** | **Report-visible Comment** text for RAS Plan Review. |
| **`categoryName`** | Yes* | Must match existing **`categories.fldCategoryName`** | *(resolution)* | Required if **`fldItem`** blank. |
| **`itemName`** | Yes* | Must match existing **`items.fldItemName`** under category | *(resolution)* | Required if **`fldItem`** blank. |
| **`fldItem`** | Preferred | Existing **`items.fldItemID`** | **`fldItem`** | **Preferred** over name matching when known. |
| **`tasRefs`** | **Yes** | Semicolon-separated TAS refs or known standard IDs | **`fldStandards`** | Must resolve in dry-run (see **`RAS_FINDINGS_IMPORT_FORMAT.md` §8). |
| **`findingType`** | Recommended | See §4 | **`fldFindingType`** | Comment classification. |
| **`applicabilityTags`** | Optional | Semicolon-separated tags | **`fldApplicabilityTags`** | Filter/search only; not report text. |
| **`isCompound`** | Optional | `true` \| `false` | **`fldIsCompound`** | Default **`false`**. |
| **`sortOrder`** | Optional | Integer | **`fldOrder`** | Sort within item in library UI. |
| **`reviewerNotes`** | Optional | Plain text | *(spreadsheet-only v1)* | Internal; not on RAS report. |
| **`active`** | Optional | `true` \| `false` | **`fldDeleted`** / **`fldIsDeleted`** | Default **`true`**. **`false`** → soft-deleted on import. |

\*If **`fldItem`** resolves, importer derives category from item; names should still match for human QA.

### Forbidden / ignored columns

**Do not add these columns** to the Findings tab. If present (e.g. copied from assessment export), the future importer **must reject or skip** the row and report **forbiddenColumnsPopulated**:

| Column (examples) | Reason |
|-------------------|--------|
| **`recommendation`**, **`recommendationShort`**, **`recommendationLong`** | RAS has **no recommendations**. |
| **`qty`**, **`quantity`** | No quantities on RAS library rows. |
| **`unitCost`**, **`totalCost`**, **`cost`** | No costs on RAS library rows. |
| Assessment **`fldRecShort`**, **`fldRecLong`**, **`fldUnit`**, etc. | Same rule—assessment-only fields. |

RAS Plan Review library rows are **comments only**—see **`docs/CONVERT_TO_RAS.md` §7–9**.

---

## 4. Valid values

Use the **Valid Values** tab for spreadsheet data validation dropdowns.

### `importAction`

| Value | Meaning |
|-------|---------|
| **`create`** | New **`rasFindings`** document (default). |
| **`update`** | Update existing doc (requires match key / ID in future importer). |
| **`skip`** | Exclude from import; listed in dry-run as skipped. |

### `reviewStatus`

| Value | Importable by default? |
|-------|------------------------|
| **`draft`** | No |
| **`needs_review`** | No |
| **`approved`** | **Yes** |
| **`rejected`** | No |
| **`imported`** | No (bookkeeping after prior import) |

### `findingType`

| Value |
|-------|
| **`noncompliance`** |
| **`insufficient_information`** |
| **`coordination_issue`** |
| **`best_practice`** |
| **`caution`** |
| **`informational`** |

### `isCompound`

| Value |
|-------|
| **`true`** |
| **`false`** |

### `active`

| Value | Effect on import |
|-------|------------------|
| **`true`** | Active library row (default). |
| **`false`** | Import as soft-deleted (`fldIsDeleted` / `fldDeleted`). |

### `applicabilityTags` (examples)

Semicolon-separated; not an exhaustive enum:

`plan_review` · `inspection` · `site` · `parking` · `toilet_rooms` · `accessible_route` · `transient_lodging` · `employee_work_area`

### `tasRefs` format (v1 authoring convention)

- Semicolon-separated entries per row.  
- Prefer **citation-style** segments resolvable to TAS 2012 standards in FREDAsoft, e.g. `404.2.3.2; 603.2.3`.  
- Standard **document IDs** allowed when authors have them.  
- Exact matching rules: **`RAS_FINDINGS_IMPORT_FORMAT.md` §8**, **Q-RAS-IMP-005**.

---

## 5. Example rows

Illustrative only—not legal or technical advice.

| importKey | importAction | reviewStatus | rasFindShort | rasFindLong | categoryName | itemName | fldItem | tasRefs | findingType | applicabilityTags | isCompound | sortOrder | reviewerNotes | active |
|-----------|--------------|--------------|--------------|-------------|--------------|----------|---------|---------|-------------|-------------------|------------|-----------|---------------|--------|
| PR-EX-001 | create | approved | Door maneuvering clearance | Plans show the restroom entry door with insufficient maneuvering clearance on the latch side. Provide dimensioned plan graphics confirming compliance with TAS maneuvering clearance requirements. | Doors | Interior Doors | | 404.2.3.2 | noncompliance | plan_review;toilet_rooms | false | 10 | Ready for batch 1 | true |
| PR-EX-002 | create | approved | Grab bar length not shown | Insufficient information is provided to verify grab bar length and mounting height at the water closet. Include enlarged details with dimensions on sheet A4.2. | Toilet Rooms | Grab Bars | | 604.5.1; 604.5.2 | insufficient_information | plan_review;toilet_rooms | false | 20 | | true |
| PR-EX-003 | create | approved | Accessible parking count and signage | Plans show accessible parking spaces, but signage and vertical clearance details are not coordinated across civil and architectural sheets. Clarify location, signage type, and mounting height for each accessible space. | Parking | Accessible Parking | | 502; 502.6 | coordination_issue | plan_review;parking | true | 30 | Compound—parking + signage | true |
| PR-EX-004 | create | needs_review | Ramp slope notation | Drawings indicate a site ramp; slope is noted as “see civil.” | Accessible Routes | Ramps | | 405 | caution | plan_review;accessible_route;site | false | | Waiting on civil sheet | true |
| PR-EX-005 | create | rejected | Old draft—duplicate | Plans show a door width note that duplicates an existing library comment. | Doors | Interior Doors | | 404.2.3 | noncompliance | plan_review | false | | Reject—use existing row | false |

**Import expectation:** rows **PR-EX-001** through **PR-EX-003** import when **`reviewStatus=approved`**; **PR-EX-004** and **PR-EX-005** skipped by default.

---

## 6. Authoring rules

1. **Only `approved` rows import by default**—set **`reviewStatus`** explicitly; use **`needs_review`** / **`draft`** while editing.  
2. **`rasFindShort`** — internal search and library navigation; keep concise and unique within item where possible.  
3. **`rasFindLong`** — **report-visible Comment** on RAS Plan Review deliverables (v1).  
4. **Plan Review wording** — prefer drawing/plan phrasing: *“Plans show…”*, *“The drawings indicate…”*, *“Insufficient information is provided…”* (see **`docs/CONVERT_TO_RAS.md` §10).  
5. **`tasRefs`** — must be resolvable to TAS 2012 standards in FREDAsoft; dry-run lists unresolved refs.  
6. **`fldItem`** — use when ID is known; reduces name-matching errors.  
7. **No recommendations or costs** — do not add forbidden columns or paste assessment export columns.  
8. **No `fldSourceFindID`** — RAS library is independent; do not link to assessment **`findings`** IDs in the sheet.  
9. **TAS 2012 only** — do not reference UFAS, ADA, or other standards in **`tasRefs`** for this library.  
10. **Illustrative content** — examples in this doc are not compliance determinations.

---

## 7. Pre-import validation checklist

Before requesting a dry-run (future importer):

- [ ] **Required fields** present on every **`approved`** row: **`rasFindShort`**, **`rasFindLong`**, **`tasRefs`**, **`reviewStatus`**, and (**`fldItem`** OR **`categoryName`** + **`itemName`**)  
- [ ] **`tasRefs`** resolve against TAS 2012 standards (dry-run report shows zero unresolved for approved rows)  
- [ ] **`fldItem`** / category+item resolve with no ambiguous matches  
- [ ] **Forbidden columns** absent or empty (recommendation, qty, cost, etc.)  
- [ ] **Duplicate review** — scan for duplicate **`rasFindShort`** / **`rasFindLong`** within same item; resolve or reject  
- [ ] **Approved only** — non-**`approved`** rows intentionally left for later or marked **`skip`**  
- [ ] **Wording review** — Plan Review tone; no field-observation language unless intentional  
- [ ] **Legal disclaimer** — batch reviewed by qualified staff; **no compliance claim** from spreadsheet alone  
- [ ] **Batch metadata** recorded on **Import Notes** tab (reviewer, date, file version)

---

## 8. Future importer expectations

The importer (separate implementation branch) should:

| Expectation | Detail |
|-------------|--------|
| **Read Findings tab** | Header row + data rows; ignore other tabs except optional config. |
| **Dry-run default** | No Firestore writes; emit JSON/CSV report per **`RAS_FINDINGS_IMPORT_FORMAT.md` §13**. |
| **Skipped rows** | By **`reviewStatus`**, **`importAction=skip`**, unresolved refs, forbidden columns, duplicates. |
| **Unresolved** | Items and standards listed with row numbers and reasons. |
| **Writes** | Only with explicit **`--write`** (or equivalent) **and** operator confirmation. |
| **Target collection** | **`rasFindings`** field map per **`RAS_FINDINGS_IMPORT_FORMAT.md` §10**. |

---

## 9. Relationship to `docs/RAS_FINDINGS_IMPORT_FORMAT.md`

| Document | Role |
|----------|------|
| **`RAS_FINDINGS_IMPORT_FORMAT.md`** | **Authority** for import philosophy, Firestore field map, safety rules, dry-run report schema, open questions. |
| **`RAS_FINDINGS_SPREADSHEET_TEMPLATE.md`** (this file) | **Human-facing** column layout, valid values, examples, and authoring checklist. |

When the two docs differ, **`RAS_FINDINGS_IMPORT_FORMAT.md`** wins for importer behavior; update this template to match after architecture review.

---

## Open questions

| ID | Question |
|----|----------|
| **Q-RAS-TPL-001** | Publish a blank **Google Sheets** or **Excel** file in repo, or docs-only column spec? |
| **Q-RAS-TPL-002** | Should **Findings** tab include a frozen **`fldFindID`** column after first import for **`update`** rows? |
| **Q-RAS-TPL-003** | Dropdown validation: enforce on sheet vs validate only at import? |

---

## Related documentation

- **`docs/RAS_FINDINGS_IMPORT_FORMAT.md`** — target Firestore shape and import safety  
- **`docs/CONVERT_TO_RAS.md`** — RAS product planning and glossary workflow  
- **`AGENTS.md`** — Firestore data safety before any import implementation  
