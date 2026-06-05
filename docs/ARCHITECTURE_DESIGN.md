# FREDAsoft Architecture & Design Decisions

This document is the single source of truth for architectural decisions in FREDAsoft.

It defines system behavior, data modeling philosophy, workflow decisions, and development constraints.

All contributors, including human developers and AI agents, must follow this document.

---

## 🧠 AI Operations Layer

### Agent Roles

#### Archie — Architect

Archie defines system-level structure and refactoring strategy.

Responsibilities:

- define architectural direction
- identify safe implementation phases
- break work into atomic tasks
- preserve system integrity
- prioritize scalability, safety, clarity, and traceability

#### Gabe — Sentry

Gabe reviews and hardens prompts before execution.

Responsibilities:

- enforce strict scope control
- prevent unintended refactors
- preserve existing behavior unless explicitly changed
- convert design direction into deterministic implementation instructions
- identify risk before work begins

#### Francine — Execution Agent

Francine executes implementation tasks.

Responsibilities:

- follow instructions exactly
- modify only the files and behavior specified
- report exact diffs and lint results
- avoid architectural decisions unless explicitly asked

Francine has no authority to:

- refactor beyond instructions
- introduce new patterns without approval
- modify unrelated code
- change data behavior without instruction

---

## 🛡️ Non-Negotiable Execution Rules

- Only modify what is explicitly specified.
- Preserve all existing behavior unless explicitly changed.
- No implicit refactors.
- No unrelated cleanup.
- Use explicit logic.
- Avoid truthy/falsy shortcuts when data integrity matters.
- Use safe, targeted React state updates.
- Do not mix unrelated concerns such as UI, security, data modeling, and performance in one task.
- If a task is marked **ANALYSIS ONLY**, no code changes are allowed.
- Do not assume intent.
- Report uncertainty instead of guessing.

Operational AI workflow protocol lives in root `AGENTS.md`. AI agents must follow `AGENTS.md` before implementation work.

**Product behavior disclosure:** User-facing behavior changes must be surfaced under the heading **Product behavior implications** before implementation. Full protocol: `AGENTS.md` §11 (Product Behavior Change Disclosure).

---

## 🧪 Required Verification

For implementation tasks, verify:

- target behavior works
- app builds or targeted lint/type checks pass where possible
- no new console errors are introduced
- no unrelated UI regression is introduced
- no unrelated data model or Firestore behavior is changed

Known unrelated lint/type issues should be reported separately and not hidden.

### CI pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs on push to `main` and on pull requests:

```text
npm ci
npm run lint
npm run test
npm run build
```

### Vitest helper tests

Targeted unit tests under `src/lib/__tests__/` cover shared report and audit helpers:

- `projectAuditReport.test.ts` — `projectAuditReport` warning visibility, custom/unassigned noise, and multiple unit-cost helpers
- `webReportFilters.test.ts` — `webReportFilters` inclusion and reconciliation logic
- `reportPreviewShared.test.ts` — `reportPreviewShared` preview filtering and sort helpers

---

## 🚦 Current Work State

Current phase:

```text
Data Integrity Stabilization
```

Recent completed areas:

```text
Custom project-only data records
Grouped custom template copy options
Record-level citations using Standards Browser
Citation inheritance into new data records
Reports using record-level citations as final references
Measurement type snapshot on projectData
Measurement metadata repair completed
Data Entry UI cleanup
Glossary Set metadata planning
Library citation defaults for findings and recommendations
Web Report Viewer — Financial, Referenced Standards, and Photo Addendum sections
Web Report Viewer — presentational component split (`WebReportControls`, section components, `webReportRecordSummaries`)
Project Audit — filter UI presentational split (`ProjectAuditWarningFilters`, `ProjectAuditFilterControls`, `ProjectAuditSummaryCards`, `ProjectAuditEmptyState`)
CI — lint, Vitest, and build on PRs and main
Vitest helper tests for `projectAuditReport`, `webReportFilters`, and `reportPreviewShared`
User preferences persisted in `userPreferences/{uid}` (not `users/{uid}`)
Gemini API proxied server-side via Express `POST /api/gemini`
Live projectData listener scoped by `fldPDataProject` (`useProjectData`)
Live locations listener scoped by `fldProjectID` (`useProjectData`)
Admin Trash — on-demand all-project deleted inspection fetch (live listener stays project-scoped)
In-app Cleanup Orphans excludes projectData hard-delete
```

Known ongoing risk areas:

- Firestore security rules may be overly permissive
- `App.tsx` remains a large coordination component
- several components are large and should be refactored carefully later
- heavy use of `any`
- Firestore subscription lifecycle should be reviewed
- runtime debug/migration logic should not remain in production indefinitely
- bundle size should be monitored

---

## 📦 Proven Code Patterns

### Safe React State Update

```ts
setState(prev =>
  prev.map(item =>
    item.id === targetId
      ? { ...item, ...updates }
      : item
  )
);
```

### Snapshot Rule

When copying data from one layer to another:

```text
copy values downward
then treat copied values as an editable snapshot
```

Do not continue linking values in a way that silently mutates historical records.

---

# 🧱 Core System Architecture

## 1. System Identity

FREDAsoft is a data-centric compliance platform.

It supports:

- inspections
- plan reviews
- accessibility assessments
- compliance documentation
- report generation

The system must support multiple standards, multiple project contexts, and project-specific professional judgment.

---

## 2. Core Data Model

High-level structure:

```text
Project
  → Facilities / Locations
  → projectData
  → Glossary Records
  → Glossary Sets
  → Libraries
  → Standards
```

Key collections:

```text
projectData       → findings and recommendations; primary operational data
glossary          → approved category/item/finding/recommendation combinations
master_standards  → standards and citation library
categories        → library categories
items             → library items
findings          → library findings
recommendations   → library recommendations / master recommendations
users             → roles and identity (admin-controlled profile; not app preference writes)
userPreferences   → per-user workspace/UI preferences (owner read/write)
```

✅ DECIDED (user preferences collection): Durable workspace context and account-tied UI preferences (e.g. `workspaceContext` client/facility/project selections) are stored in **`userPreferences/{uid}`**, not **`users/{uid}`**. Firestore rules allow **owner read/write** on `userPreferences`; `users/{uid}` remains **profile/role** with **admin-only write**. App persistence uses `firestoreService.preferences` → `userPreferences` collection. Legacy preference fields may still exist on old `users/{uid}` docs until manually migrated; new saves create/update `userPreferences` only.

✅ DECIDED: User-initiated deletion of `projectData` inspection records is a **soft delete** (`fldIsDeleted`, `fldDeleted`, `fldDeletedAt`, `fldDeletedBy`). Active views filter these out. Restore clears those flags via `firestoreService.restore('projectData', id)`. Hard document delete of `projectData` is **not** performed by in-app **Cleanup Orphans**; use read-only `scripts/maintenance/report-orphans.ts` (and future explicit admin maintenance) for full orphan review.

---

## Persistence and Storage Ownership

FREDAsoft uses more than one persistence mechanism. Each layer **owns** specific kinds of state. Cleanup or refactor work must **not** casually unify Firestore preferences, `localStorage`, and `sessionStorage` into a single approach unless there is an explicit design decision, migration plan, and verification that semantics (lifetime, scope, and authority) stay correct.

**Authoritative data** — including project data, report-relevant record state, glossary data, standards / master library data, and other domain collections — lives in **Firestore** (and the domain records those documents represent). Browser storage is not a substitute for that authority.

### Firestore user preferences

- Collection: **`userPreferences/{uid}`** (document ID = Firebase Auth UID).
- Owns **durable workspace context** and **user preference restoration** tied to the account (where implemented).
- Examples include active client, facility, project, and related workspace selections persisted for cross-session use.
- Intended to survive normal session boundaries and, where supported, browser or device changes for the same user.
- **`users/{uid}`** is not used for preference writes; it is for identity/role (admin write per rules).

### localStorage

- Owns **browser-local sticky selections** and **Data Entry draft recovery**.
- Data Entry drafts are **intentionally local** to the browser; they are a safety net, not the system of record.
- Draft restore paths must enforce **context compatibility**: a draft must not be applied when client, facility, project, target record, or mode no longer matches what the draft was saved against. Restores must not resurrect stale tuples into the wrong context.
- **Future:** centralizing **storage key constants** (e.g. one module of string keys) is allowed for maintainability, but must **not** change key names, lifetimes, or read/write semantics unless explicitly approved.

### sessionStorage

- Owns **temporary UI state** for the tab or session (e.g. Standards Browser UI state).
- Treat as **session convenience**, not authoritative project or library data.
- Standards Browser state here is **UI state** for that surface. It is **not** Active Glossary (or broader Data Entry glossary-mode) state; those remain distinct by design.

---

## Firestore live listener query scoping

✅ DECIDED (live **projectData** listener): **`useProjectData(projectId)`** subscribes to **`projectData`** with **`where('fldPDataProject', '==', projectId)`** when a project is selected; when **`projectId`** is null, arrays clear and no subscription runs. **`firestoreService.onSnapshot`** / **`firestoreService.data.onSnapshot`** accept optional **`QueryConstraint[]`**; callers without constraints retain **whole-collection** behavior. **App-level** filters (`fldPDataProject`, soft-delete flags, `fldPDataID`, legacy **`citation_num`**) remain **defensive** client-side checks. **Soft-delete predicates are not in Firestore queries** (legacy rows may lack delete flags). **Facility** scoping (`fldFacility`) is **client-side only**—not in Firestore queries.

✅ DECIDED (live **locations** listener): The same hook subscribes to **`locations`** with **`where('fldProjectID', '==', projectId)`**. **Facility** filtering (`fldFacID`) remains **client-side** (Data Entry, Data Explorer, reports). This preserves **same-project cross-facility** location lists and **orphan `fldLocation` label** resolution within the current project. **`locations`** documents missing **`fldProjectID`** are **legacy/data-quality** issues—they will not appear in the scoped listener and require **maintenance review** (e.g. **`scripts/maintenance/report-orphans.ts`**). New locations are stamped with **`fldProjectID`** on create in Data Entry.

✅ DECIDED (admin **Trash** — inspection records): The live **`projectData`** listener stays **project-scoped**. Admin **Trash Bin** **inspection records** use an explicit **on-demand** all-project fetch (**`firestoreService.data.list()`** when Trash opens—not a continuous listener): soft-deleted rows across all projects, excluding legacy **`citation_num`** rows. Restore refetches the trash list. **Download Full Backup** (admin) uses the same **all-project deleted-inspection** fetch. Trash columns for **clients / facilities / projects** remain on **global** portfolio listeners.

✅ DECIDED (**Cleanup Orphans** — in-app): Dashboard **Cleanup Orphans** (admin) **must not** hard-delete **`projectData`**. It may hard-delete only **facilities** and **projects** missing a parent **client** (global portfolio listeners). **`projectData` orphan review** belongs to read-only **`scripts/maintenance/report-orphans.ts`** and future explicit admin maintenance (preview/dry-run)—not the in-app button. See also **Firestore Write Boundaries** below.

✅ DECIDED (query scoping vs **Firestore rules**): Project-scoped live queries reduce **read volume** and **cross-project in-memory exposure**. Current rules still allow any **authenticated** user to read/write **`projectData`** and **`locations`**; **query scoping is not a security boundary** until rules add **membership/role** constraints (future client portal / project team model).

---

## Firestore Write Boundaries and Maintenance Script Safety

**Firestore writes are part of the system’s integrity boundary.** Any path that mutates stored documents — whether from the app, a batch API, or a script — can affect compliance data, auditability, and user trust. Treat writes as governed behavior, not implementation detail.

**Normal application writes** should go through the established service layer (e.g. `firestoreService`) unless a narrow exception is explicitly justified and reviewed.

**Direct `writeBatch` / low-level writes** in application code are allowed only when they are **intentional**, **narrowly scoped** (clear transaction intent, bounded document set), and **visible** in review. They must **not** be introduced or expanded under the cover of broad refactors, “cleanup,” or unrelated feature work without an explicit architectural note in this document or an approved task.

**Maintenance and import scripts** that read or write Firestore must be treated as **operational tooling** (run with intent, often against production or shared environments), **not** as casual developer utilities. They belong in the same risk class as migrations.

Scripts that **update** or **backfill** Firestore should **document clearly** in their header or companion README (minimum expectations):

- **Target environment** (e.g. emulator vs named project; how the operator selects it).
- **Dry-run mode** — whether the script supports a no-write / preview mode and how to invoke it.
- **Backup / export expectations** — whether an export or backup is required before run.
- **Operator confirmation** — prompts, flags, or runbooks that prevent mistaken execution.
- **Scope of mutation** — which **collections** and **fields** may be written, and what invariants must hold afterward.

**UI-triggered denormalization or repair writes** (for example, propagating stored display labels after a rename so historical rows stay readable) must be **explicit in code and documented** here or in a tightly linked maintenance note, so future readers know the write is intentional denormalization, not accidental duplication of business logic.

**Future abstraction** (e.g. consolidating write paths behind a thinner API) is allowed only **after** the intended **write policy** is documented and **existing behavior** is preserved or called out as an intentional breaking change with migration steps.

✅ DECIDED (in-app Cleanup Orphans): See **Firestore live listener query scoping — Cleanup Orphans** above. Dashboard button may **hard-delete** only **facilities** and **projects** whose parent **client** is missing. **`scripts/maintenance/report-orphans.ts`** is the read-only path for **`projectData`** orphan buckets.

---

# 🧠 Libraries, Glossary Sets, Glossary Records, and Data Records

## 3. Libraries Are the Foundation

Libraries define reusable professional content:

- finding language
- recommendation language
- measurement types
- units of measure
- unit costs
- default standards associations

Libraries are the origin of structured content.

✅ DECIDED: **Active Glossary** (glossary set chosen in Data Entry) filters which approved glossary rows drive Category / Item / Finding / Recommendation path options. **Standards Library Type** is separate and only scopes standards/citation browsing (e.g. Standards Browser). Active Glossary is user-selected and persisted locally in the browser for v1 (not derived from project or facility type).

✅ DECIDED: **Glossary Builder** (v1): the **Glossary Set** dropdown scopes **Finding** and **Recommendation** authoring choices to that set (via master `fldGlossarySetId` and active glossary rows on the item). **Category** and **Item** lists remain **shared** across sets in v1 because those master records do not carry glossary set ids.

Library Findings and Recommendations support direct citation associations.

Examples:

```text
finding.fldStandards
recommendation.fldStandards
```

These are reusable defaults, not project-specific final citations.

### Library Standard Context

✅ DECIDED: Library Findings and Recommendations are standard-context-specific.

Each library Finding and Recommendation belongs to one Glossary Set / standard-version context.

Examples:

```text
UFAS 1984 Finding
ADA 2010 Finding
TAS 2012 Finding
ANSI A117.1 2009 Finding
```

The same wording may exist in multiple library records when it applies under multiple standards.

This is intentional.

A library record should not be treated as a multi-standard container. Instead, controlled duplication is preferred so each library record can carry the correct:

- default citations
- measurement metadata
- thresholds
- applicability assumptions
- recommendation language
- reporting context

Possible fields:

```ts
fldGlossarySetId?: string;
fldGlossarySetName?: string;
fldStandardType?: string;
fldStandardVersion?: string;
```

Examples:

```text
finding.fldGlossarySetId: "UFAS_1984"
finding.fldGlossarySetName: "UFAS"
finding.fldStandardType: "UFAS"
finding.fldStandardVersion: "1984"
```

```text
recommendation.fldGlossarySetId: "ADA_2010"
recommendation.fldGlossarySetName: "ADA 2010"
recommendation.fldStandardType: "ADA"
recommendation.fldStandardVersion: "2010"
```

Existing library records without this metadata remain valid as legacy or unassigned records until explicitly classified.

Library standard context is used to guide candidate selection when building glossary records. It does not restrict downstream professional judgment.

---

## 4. Snapshot Inheritance Model

The system follows a snapshot inheritance model:

```text
Library → Glossary Record → Project Data Record
```

✅ DECIDED: **Library / Glossary / ProjectData snapshot model**

- **Master Finding** and **Master Recommendation** rows are reusable **source / template** records in the library (edited centrally, referenced by many workflows).
- **Categories** own **Items**; **Items** own reusable **Findings** and **Recommendations** in the catalog (FKs and editorial ownership), not as one-off project text.
- **Recommendations** are **not** strict hierarchical children of **Findings**; the library does not model a single mandatory parent-child chain from finding to recommendation.
- **Finding-to-recommendation relevance** is expressed through **association metadata** (e.g. suggested-recommendation lists on findings, builder/Data Entry UX, and **approved glossary pairings**).
- A **glossary row** approves a specific **Category + Item + Finding + Recommendation** pairing **for a Glossary Set** and holds **set-specific snapshot values** (e.g. default citations, unit/cost overrides, and other fields snapshotted at authoring time per this document’s inheritance rules).
- A **ProjectData** row **snapshots** the **selected glossary row** (and related captured fields) at inspection time rather than treating the library as a live, always-current join for historical rows.
- **Later** edits to masters or glossary rows **must not silently rewrite** existing **ProjectData**; updates flow **forward** only through **explicit** create, copy, or refresh / re-hydrate actions where the product intentionally implements them.

Rules:

- data is copied downward
- each layer is independently editable after copying
- no automatic upstream propagation
- no automatic downstream mutation after the snapshot is created

This ensures:

- historical accuracy
- stable reporting
- project-specific flexibility
- protection from unintended global changes

---

## 5. Glossary Sets Are Standard / Version Contexts

✅ DECIDED: Glossary records are indexed primarily by **Glossary Set**, meaning a standard/type/version context.

Examples of Glossary Sets:

```text
UFAS
ADA 2010
TAS 2012
TAS 1994
FHA Guidelines
ANSI A117.1 2009
IBC 2020
```

A Glossary Set represents the reusable working content associated with a particular compliance authority or standard version.

Examples:

```text
UFAS Glossary
ADA 2010 Glossary
TAS 2012 Glossary
ANSI A117.1 2009 Glossary
IBC 2020 Glossary
```

This does not mean that a project uses only one Glossary Set. Many real projects require multiple overlapping standards.

---

## 6. Glossary Records

A glossary record links:

```text
Category → Item → Finding → Recommendation
```

and belongs to a Glossary Set.

Phase 1 metadata fields on glossary records:

```ts
fldGlossarySetId?: string;
fldGlossarySetName?: string;
fldGlossaryStandardType?: string;
fldGlossaryStandardVersion?: string;
```

Examples:

```text
fldGlossarySetId: "UFAS"
fldGlossarySetName: "UFAS"
fldGlossaryStandardType: "UFAS"
fldGlossaryStandardVersion: "1984"
```

```text
fldGlossarySetId: "ADA_2010"
fldGlossarySetName: "ADA 2010"
fldGlossaryStandardType: "ADA"
fldGlossaryStandardVersion: "2010"
```

Existing glossary records without this metadata remain valid as legacy or unassigned records.

Glossary records are editable snapshots. They may add or remove citations, including citations from standards other than the source library record’s standard, when professional judgment requires it.

---

## 7. Project Families Are Prescriptive, Not Restrictive

✅ DECIDED: Project Families / Project Types are presets, not constraints.

A Project Family suggests which Glossary Sets are likely applicable, but it must not restrict users from enabling additional Glossary Sets.

Examples of Project Families:

```text
Housing with Federal Funding
Housing without Federal Funding
TDLR / RAS Project
ADA Title II Assessment
ADA Title III Assessment
Fair Housing Review
Public Right-of-Way Review
```

A Project Family may define:

- default Glossary Sets
- default active Glossary Set
- suggested standards
- report defaults
- workflow defaults

But users must be able to add or remove Glossary Sets based on professional judgment and project conditions.

Example:

```text
Project Family:
Housing with Federal Funding

Suggested Glossary Sets:
- UFAS
- ADA 2010
- FHA Guidelines
- ANSI A117.1 2009
- IBC 2020
- TAS 2012, if Texas / public facility scope applies
```

These are suggested defaults only.

---

## 8. Projects Enable Glossary Sets

Each project may enable one or more Glossary Sets.

A project should eventually store:

```ts
fldEnabledGlossarySetIds?: string[];
fldActiveGlossarySetId?: string;
fldProjectFamilyId?: string;
```

The enabled Glossary Sets define the working compliance universe for that project.

The active Glossary Set controls which glossary records are shown in Data Entry at a given moment.

Example:

```text
Client:
Harris Center

Project:
Accessibility Assessment

Project Family:
Housing with Federal Funding

Enabled Glossary Sets:
- UFAS
- ADA 2010
- FHA Guidelines
- ANSI A117.1 2009
- IBC 2020
- TAS 2012

Active Glossary Set:
UFAS
```

The user may switch the active Glossary Set depending on the scope being evaluated.

Example:

```text
Site arrival / parking / exterior route:
Active Glossary Set = TAS 2012

Dwelling units:
Active Glossary Sets = UFAS, IBC 2020, ANSI A117.1 2009
```

The system should eventually help users identify likely applicable standards, but it should not replace professional judgment.

---

## 9. Data Records Are the Source of Truth

Each project data record:

- inherits from a glossary record or is created as a custom project-only record
- is fully editable
- may diverge from the glossary
- stores final project-specific values

For glossary-based records:

```text
Glossary Record → Project Data Record
```

For custom records:

```text
Custom Project Record
```

Custom records are project-only and are not automatically added to the library or glossary.

Project data records are the final reporting source.

---

## 10. Controlled Duplication Across Glossary Sets

Duplicate or near-duplicate findings across standards are expected and correct.

Example:

```text
"Curb ramp slope exceeds allowable maximum"
```

may exist in:

```text
ADA 2010
TAS 2012
UFAS
ANSI A117.1
IBC
```

Even if the wording is identical, the records may differ in:

- citation
- legal authority
- applicability
- thresholds
- measurement rules
- recommended corrective language
- reporting context

This duplication is not a data-quality problem. It reflects real compliance differences.

Controlled duplication applies to both glossary records and library Finding / Recommendation records.

If the same finding or recommendation language applies under multiple standards, separate library records may be created for each applicable Glossary Set / standard-version context.

Example:

```text
Finding language:
"Grab bar height exceeds allowable maximum."

Library records:
- UFAS 1984 version
- ADA 2010 version
- TAS 2012 version
- ANSI A117.1 2009 version
```

These records may have identical or near-identical text, but each may carry different citations, thresholds, measurement assumptions, applicability notes, or reporting context.

This avoids storing multiple standard-specific citation sets inside a single library record and keeps snapshot inheritance simple.

Future copy tools may help create equivalent records across standards, but copying must create a new independently editable library record.

---

## Glossary Builder Related Record Workflow

✅ DECIDED: The legacy Glossary Builder **COPY & EDIT** control was removed (Phase 1 safety). It is replaced by explicit workflows—eventually a **Create Related Glossary Record** flow—and by existing safe controls (+ Finding, + Recommendation, Search/link, **SAVE RECORD**, Glossary Set template, **Prepare Target Set Records**).

✅ DECIDED: **Glossary Builder finding search** is for **template creation only**. Selecting an existing finding for the current item and glossary set remains the **Finding dropdown** (canonical reuse path). **Search existing findings to use as a template** (enabled when category/item context is selected) searches active master findings within a chosen scope: **Current item** (`fldItem` match, all sets for that item), **Current glossary set** (`fldGlossarySetId` match, all items), or **All findings** (no item/set filter on the pool—only active-master and dropdown-id exclusion). Short/long text filters within the scope. Finding ids in `findingsForSelectedSet` are excluded in every scope. The selected glossary set affects scope 2, dropdown exclusion, and template save metadata—not the **All findings** pool. **Use as template** prefills the new-finding modal with wording fields only (`fldFindShort`, `fldFindLong`, `fldMeasurementType`, `fldUnitType`); the admin saves to create a new independent master finding in the **current** item and glossary set context with `fldStandards: []` and no functional linkage or provenance fields to the source. No Firestore write occurs until Save.

### Master library vs glossary records

| Layer | What it is | Shared across glossary rows? |
|-------|------------|------------------------------|
| **Master Finding** (`findings`) | Library finding text, measurement type, suggested recs, finding-level standards | One finding id can appear in multiple glossary rows (same item, different rec or set). |
| **Master Recommendation** (`master_recommendations`) | Library recommendation text, unit/cost defaults, rec-level standards | One rec id can be linked from multiple findings / glossary rows. |
| **Glossary record** (`glossary`) | Approved **five-tuple** snapshot: Category + Item + Finding + Recommendation + **Glossary Set**, plus glossary-level citations, images, and unit/cost overrides | One row per exact five-tuple; independently editable from library after snapshot. |

✅ DECIDED: **Master finding / recommendation archive (Library Manager Phase 1)** uses `fldIsArchived` on `findings` and `recommendations` documents — **not** `fldDeleted` / `fldIsDeleted`. Archive hides masters from active Library Manager lists (`Show archived` toggle for review/restore). Archiving is allowed even when glossary rows reference the master; the archive modal warns with glossary usage counts. Archive does **not** mutate glossary rows or projectData. Restore sets `fldIsArchived: false`. Archived rows are read-only in Library Manager until restored.

✅ DECIDED: **Master finding / recommendation archive — selection behavior (Phase 2)** distinguishes **selectable** vs **resolvable** masters. **Selectable** = not soft-deleted and not archived (used for new Glossary Builder and Data Entry path/template pools). **Resolvable** = not soft-deleted; archived allowed (used to display existing glossary rows and open/save existing projectData records). App exposes dual lists: selectable (`findings`, `masterRecommendations`) and resolvable (`resolvableFindings`, `resolvableMasterRecommendations`). Library Manager receives resolvable lists so **Show archived** continues to work. Archived masters show `(archived)` via `formatArchivedMasterLabel` / lifecycle helpers. Prepare Target Set does not reuse archived target-set matches for new creation. Restore makes a master selectable again. No Firestore schema/rules/migration changes in Phase 2.

The UI must always make clear which action the user is taking:

1. **Edit/reuse** an existing shared master finding or recommendation (same id).
2. **Create** a new independent master finding or recommendation (new id).
3. **Change only** the glossary record snapshot (new or updated five-tuple, possibly reusing existing master ids).

Data Entry path dropdowns key findings by **master finding id** but display **short text** (`fldFindShort`). Recommendation options are keyed by **glossary row** (`fldGlosId`) with labels from **rec short text**. Silent creation of new master ids with unchanged short labels produces duplicate-looking options and is a product defect.

### Product model: five-tuple

✅ DECIDED: A **glossary row** (`glossary` collection document) is the approved snapshot for one exact **five-tuple**:

```text
Category + Item + Finding (master id) + Recommendation (master id) + Glossary Set
```

The five-tuple is the identity key in Glossary Builder (`findExactGlossaryByFiveTuple`, workflow banners, related-record creates). Master finding and recommendation documents are separate library layers; the glossary row binds them under a category/item path and glossary set.

Supported product intents:

1. Create a brand-new glossary record from scratch (greenfield).
2. Edit an existing glossary record (same five-tuple; **SAVE RECORD** updates snapshot and staged master text/citations).
3. Create a **related** glossary record from an existing selection (new five-tuple, explicit reuse/create choices) — **Continue** implemented for intents 4–5 below.
4. Reuse an existing finding with a new recommendation (same `fldFind`, new `fldRec`, new glossary row) — ✅ Phase 2B.
5. Create a new finding and reuse an existing recommendation (new `fldFind`, same `fldRec`, new glossary row) — ✅ Phase 2C.
6. Create a new finding and new recommendation from selected text (new both, new glossary row) — ✅ Phase 2D (`new_find_new_rec`).
7. Avoid duplicate-looking findings/recommendations in Data Entry (same set + item + normalized short label must not silently fork masters).

### Why COPY & EDIT was unsafe

The former **COPY & EDIT** button (shown when all four path fields were selected) opened the same modal as **ADD FINDING/REC** but, on save (`saveNewGlossaryRecord`), **always minted new finding and recommendation ids** even when the user had already selected existing masters. It prefilled short/long text **without** a required ` (Copy)` suffix or disambiguator. That produced:

- Multiple master records with identical `fldFindShort` / `fldRecShort` under the same item and glossary set context.
- Confusing Data Entry dropdowns (same label, different ids).
- Unnecessary library duplication when the user only wanted another glossary pairing or a cross-set variant.

Phase 1 safety (implemented): hide **COPY & EDIT**, keep **ADD FINDING/REC** for greenfield (category + item, full finding/rec path not both selected), and block full-path bulk copy in `saveNewGlossaryRecord` with a directed error message.

### “Create Related Glossary Record” modal (Phase 2A–2C)

✅ DECIDED: Single explicit entry point when category, item, finding, and recommendation are all selected. The user chooses a **relationship type** in the modal, edits scenario-specific fields, then clicks **Continue** for an orchestrated write path in the implemented scenarios (Phases 2B and 2C). The modal must not perform silent triple-create (finding + recommendation + glossary) without labeled user choices.

| Scenario id | Title | Status |
|-------------|-------|--------|
| `same_find_new_rec` | Same finding + new recommendation | ✅ **Implemented** (Phase 2B) |
| `new_find_same_rec` | New finding + same recommendation | ✅ **Implemented** (Phase 2C) |
| `new_find_new_rec` | New finding + new recommendation | ✅ **Implemented** (Phase 2D) |
| `cross_set_template` | Cross-set related record | ❌ **Not implemented** via modal **Continue**; use template flow below (see [Cross-Glossary-Set Related Record Design](#cross-glossary-set-related-record-design)) |

Manual **SAVE RECORD** remains the path for greenfield rows and for post-Continue citation/image edits on the activated row. Related-record **Continue** paths (2B and 2C) create the new master record(s) and a glossary row in one transaction; they do not replace **SAVE RECORD** for ongoing snapshot edits.

#### Cross-set / template flow (not modal Continue)

Scenario **D** (cross-set) is **not** implemented via modal **Continue**. It remains on the existing safe path:

1. Change **Glossary Set** (template banner when a four-tuple exists in another set).
2. **Prepare Target Set Records** (creates or reuses target-set masters).
3. **SAVE RECORD** for the target-set glossary row.

The modal `cross_set_template` radio only directs the user to that flow; it does not write on **Continue**.

### Duplicate-prevention rules

✅ DECIDED:

- **Same glossary set + same item + same normalized short label** must not **silently** create a new master finding or recommendation id. Require edited short title, auto-suffix (e.g. ` (Copy)`), or explicit “fork master” confirmation.
- **Identical short text across different glossary sets** may be valid (controlled duplication per standard/version context; see §10 above).
- Before creating a glossary row, if `findExactGlossaryByFiveTuple` matches, direct the user to **edit existing** / **SAVE RECORD**, not create.
- Reuse deterministic text match helpers (e.g. `normalizeForDeterministicMatch`) for same-set collision checks, aligned with **Prepare Target Set Records** reuse behavior.
- Optional future: Data Entry label disambiguation (set name or truncated id) when multiple masters share short text—out of scope for Phase 2 modal.

### Citation and snapshot behavior (related records)

✅ DECIDED: A glossary row’s `fldStandards` may be **hydrated** from the standards attached to the selected master finding and selected master recommendation, with duplicate citations filtered out.

**Terminology**

| Term | Meaning |
|------|---------|
| Master finding standards | Standards stored on the selected finding record (`findings.fldStandards`). |
| Master recommendation standards | Standards stored on the selected recommendation record (`master_recommendations.fldStandards`). |
| Glossary row standards | `fldStandards` stored directly on the glossary row/document (`glossary.fldStandards`). |
| Hydrate / inherit | Populate glossary row standards from selected master finding and/or selected master recommendation standards (deduped). |

**Normal new glossary creation**

When the user selects a master finding and master recommendation from their libraries, glossary row `fldStandards` should hydrate from **both** selected masters, with duplicates filtered out.

**Related-record creation (Phase 2B / 2C / 2D)**

| Scenario | Glossary row hydration | New master(s) | Source glossary row |
|----------|------------------------|---------------|---------------------|
| **2B** — Same finding + new recommendation | Hydrate from the **reused** master finding only | New recommendation: `fldStandards: []` | Do **not** copy `fldStandards` from the source/host/template glossary row |
| **2C** — New finding + same recommendation | Hydrate from the **reused** master recommendation only | New finding: `fldStandards: []` | Do **not** copy `fldStandards` from the source/host/template glossary row |
| **2D** — New finding + new recommendation (✅ Phase 2D) | No hydration at creation | New finding and new recommendation: `fldStandards: []`; new glossary row: `fldStandards: []` | Do **not** copy `fldStandards` from the source/host/template glossary row |
| **Cross-glossary-set** (template / Prepare Target Set Records) | No standards hydrate **across** glossary sets | Per target-set master create/reuse rules | Do **not** copy source-set `fldStandards`; new glossary row standards start empty unless later set by normal user action |

**Important distinction**

- **Correct:** Standards from the selected/reused master finding and selected/reused master recommendation may hydrate the glossary row (deduped).
- **Incorrect:** Source/host/template glossary row standards are copied into the new glossary row merely because the related record was created from that source row.

Duplicate citation ids are filtered by existing normalization (`normalizeStringArray`, staged `Set` unions).

**Other snapshot fields when branching from a source glossary row or selection**

| Field | Default | Notes |
|-------|---------|--------|
| Finding/rec long text (staged) | Copy from source masters | User edits in Glossary Builder before **SAVE RECORD**. |
| Unit/cost on glossary | Copy from source glossary when present | Matches template hydration behavior. |
| Measurement metadata | Copy from source **finding** | Data Entry aligns measurement fields to selected finding. |
| Images (`fldImages`) | **Opt-in** (unchecked by default) for manual **SAVE RECORD** flows | Phase 2B/2C **Continue** always writes `[]`; do not silently share image sets across related rows. |

### Implemented related-record scenarios (Phase 2B and 2C)

Both implemented scenarios share these behaviors:

- Entry: **Create Related Record...** when category, item, finding, and recommendation are selected.
- Orchestrated handler on modal **Continue** (`applySameFindingNewRecommendation` / `applyNewFindingSameRecommendation`).
- New glossary row always created for the current category, item, glossary set, and the scenario’s finding and recommendation ids.
- `fldImages` on the new glossary row is always `[]` (images are not copied).
- Glossary `fldUnitCost` / `fldUnitType` copied from the **source glossary row** when present.
- Immediate UI activation via App-level `activateGlossaryBuilderRecord` (functional `setSelections` in `App.tsx`), passed as `onActivateGlossaryBuilderRecord` from Glossary Builder.
- Optimistic updates to in-memory collections (`setRecommendations` / `setFindings`, `setGlossary`) so dropdowns reflect new masters before Firestore listeners settle.
- `pendingRelatedActivationRef` blocks the glossary sync effect from rehydrating the **source** five-tuple until the new row’s ids land in selections.
- Modal prefill: `relatedPrefillKeyRef` + `relatedFormTouchedRef` — prefill runs only when the user has not edited; saving sets `relatedRecordSaving` so prefill does not overwrite in-flight edits.

#### Phase 2B — Same finding + new recommendation (`same_find_new_rec`)

| Action | Behavior |
|--------|----------|
| **Master recommendation** | Creates new `master_recommendations` document (new `fldRecID`). |
| **Master finding** | Reuses existing `selectedFind` (same finding id on new glossary row). |
| **Finding link** | Appends new recommendation id to `finding.fldSuggestedRecs` **only when** the new id is not already present (updates source finding document for this link field only). |
| **Source recommendation** | Not modified. |
| **Source glossary row** | Not modified. |
| **New glossary row** | Five-tuple: same category, item, and finding; **new** recommendation id; current glossary set. `fldStandards` from source glossary row when present, else union of source finding and source recommendation master standards. |
| **New rec master standards** | `fldStandards: []` on create. |
| **Duplicate guard** | Normalized short title must differ from source rec; blocked if another rec in same glossary set + item context already has that short title. |
| **Activation** | `selectedFind` unchanged; `selectedRec` → new rec id; `editingGlossaryId` → new `fldGlosId`. |
| **Pending guard** | Kind `same_find_new_rec`; matches category, item, and **unchanged finding**; blocks sync while `selectedRec` is still the source recommendation id, or while the resolved row is the source five-tuple. |

#### Phase 2C — New finding + same recommendation (`new_find_same_rec`)

| Action | Behavior |
|--------|----------|
| **Master finding** | Creates new `findings` document (new `fldFindID`). |
| **Master recommendation** | Reuses existing `selectedRec` (same rec id on new glossary row). |
| **Glossary set on finding** | New finding includes `glossarySetMetadataForId(selectedGlossarySetId)` so `findingsForSelectedSet` / `masterMatchesSelectedGlossarySet` includes it in the Finding dropdown immediately. |
| **Finding link** | New finding `fldSuggestedRecs: [sourceRecId]` (reused recommendation only). |
| **Finding-level standards** | `fldStandards: []` on create (empty; not copied from source finding). |
| **Measurement** | `fldMeasurementType` / `fldUnitType` copied from source finding. |
| **Source finding** | Not modified (no write to source finding document). |
| **Source recommendation** | Not modified. |
| **Source glossary row** | Not modified. |
| **New glossary row** | Five-tuple: same category, item, and recommendation; **new** finding id; current glossary set. `fldStandards` from source glossary row when present, else union of source finding and source recommendation master standards. |
| **Duplicate guard** | Normalized short title must differ from source finding; blocked if another finding in same glossary set + item context already has that short title. |
| **Activation** | `selectedFind` → new find id; `selectedRec` unchanged; `editingGlossaryId` → new `fldGlosId`. |
| **Pending guard** | Kind `new_find_same_rec`; matches category, item, **unchanged recommendation**, and **glossary set key**; blocks sync while `selectedFind` is still the source finding id, or while the resolved row is the source five-tuple. |

### UI and state requirements (implemented)

✅ DECIDED:

1. **Continue must leave the user on the newly created related row** — not merely persist data in Firestore. Activation sets `editingGlossaryId`, path fields, and staged glossary standards from the new row.
2. **Dropdowns must list and select new masters immediately** — optimistic `setFindings` / `setRecommendations` plus correct glossary-set metadata on new masters (especially new findings in Phase 2C).
3. **Modal prefill must not clobber user edits** — `relatedFormTouchedRef` and `relatedRecordSaving` gate prefill effects.
4. **Scenario forms visible under the selected option** — recommendation/finding inputs render inline below the selected radio (not only after all four scenario cards) so fields are not below the fold.

Sync effects and pending guards must use **functional** `onSelectionChange((prev) => …)` where selections are merged after `await`; avoid `onSelectionChange({ ...selections, … })` in async paths (stale closure over `selections`).

### Not implemented (do not imply these work on Continue)

| Scenario | Expected behavior today |
|----------|-------------------------|
| **Cross-set** — `cross_set_template` | Modal **Continue** shows info toast only; use Glossary Set dropdown + template banner + **Prepare Target Set Records** + **SAVE RECORD** (partial automation today — see [Cross-Glossary-Set Related Record Design](#cross-glossary-set-related-record-design)). |
| **Phase 3** duplicate cleanup | Admin reporting/migration; not part of related-record branches. |

---

## Cross-Glossary-Set Related Record Design

**Status:** Design proposal (docs branch). **Not** a single orchestrated modal **Continue** write path today.

**Related implemented same-set flows:** Phase 2B (`same_find_new_rec`), 2C (`new_find_same_rec`), 2D (`new_find_new_rec`) — all create a new glossary row in the **current** glossary set via modal **Continue**.

### 1. Product definition

✅ DECIDED: A **cross-glossary-set related record** is a **new approved glossary row** in a **target glossary set** that corresponds to the same category, item, finding text, and recommendation text intent as a **source** selection in another set — using **target-set master finding and recommendation documents** (reused or newly created in that set), not the source-set master ids.

| Concept | Same-set related record (2B/2C/2D) | Cross-set related record |
|---------|-----------------------------------|-------------------------|
| Glossary set | Unchanged (current dropdown set) | **Different** target set |
| Master finding/rec ids | Reuse and/or create **in current set** | Reuse and/or create **in target set only** |
| Source five-tuple | Starting point; source row usually unchanged | Reference only; source row **not moved** |
| Primary UX today | **Create Related Record** modal **Continue** | **Glossary Set** change + template banner + **Prepare Target Set Records** + manual **SAVE RECORD** |
| Linking model | New glossary row; optional `fldSuggestedRecs` update (2B) | **Create/reuse** flow — **not** a live link between sets (no shared master ids across sets) |

**Not** a “link flow”: target rows do not reference source `fldGlosId` as an active join for runtime behavior (provenance trace fields on **new** target masters are allowed — see §4).

**Is a template/copy flow:** User copies **text and measurement/cost defaults** from source masters (and optionally from source glossary row for unit/cost) into **independent** target-set masters and a **new** target-set glossary snapshot.

### 2. Source vs target terminology

| Term | Meaning |
|------|---------|
| **Source glossary set** | Set of the glossary row currently being edited / the set on the source five-tuple when the user starts cross-set work. |
| **Target glossary set** | Set selected in the **Glossary Set** dropdown for the row to be created. Must differ from source set for cross-set intent. |
| **Source five-tuple** | `Category + Item + sourceFindId + sourceRecId + sourceGlossarySetId` (exact glossary row identity in source set). |
| **Target five-tuple** | `Category + Item + targetFindId + targetRecId + targetGlossarySetId` — must be unique in `glossary` before save. |
| **Source master finding / recommendation** | `findings` / `master_recommendations` documents tied to the **source** selection (may lack `fldGlossarySetId` on legacy recs). |
| **Target master finding / recommendation** | Masters **scoped to target set** (`fldGlossarySetId` + `glossarySetMetadataForId`) — either pre-existing (text match) or created on prepare. |

Category and Item remain **shared** across sets in v1 (no per-set category/item ids).

### 3. Master record behavior

#### Implemented today (`handlePrepareTargetSetRecords` in Glossary Builder)

When the user clicks **Prepare Target Set Records** (template banner, target set selected):

1. Resolve **source** finding/rec from current path selection (source-set ids still selected in UI).
2. **Reuse** target-set finding if exactly one match: same target set + same item + normalized `fldFindShort` **and** `fldFindLong` equal to source.
3. **Reuse** target-set recommendation if exactly one match: same target set + (same `fldItem` as source rec when source rec has `fldItem`) + normalized short **and** long equal to source.
4. If **multiple** text matches in target set → **error**, no writes.
5. If **no** match → **create** new finding and/or rec in target set with:
   - Copied short/long text from source masters
   - `fldStandards: []`
   - `glossarySetMetadataForId(targetSet)`
   - Provenance: `fldSourceFindingId` / `fldSourceRecommendationId`, `fldSourceGlossarySetId`, `fldSourceCopiedAt`
   - Measurement fields copied from source finding on create; rec unit/UOM from source rec
   - `fldSuggestedRecs: []` on new finding (user links via SAVE / library later)
6. Switch UI selection to **target** find/rec ids; clear `editingGlossaryId`; stage standards from **reused** target masters only (`glossary` staged `[]`).
7. **Does not** create the target glossary row — user must **SAVE RECORD**.

#### Design rules (target-set masters)

✅ DECIDED:

- Target-set masters are **always** distinct documents from source-set masters (different ids), even when short text is identical across sets (controlled duplication per §10).
- **Never** reuse source-set finding/rec ids on the target five-tuple.
- Text-match reuse in target set is **deterministic** (`normalizeForDeterministicMatch` on short; long must match for finding/rec prepare today).

OPEN:

- **Q-CROSS-001:** Should reuse require **short-only** match (like 2B/2C duplicate guards) or keep short **+** long (stricter, current prepare behavior)?
- **Q-CROSS-002:** When zero target matches exist, should the UI require an explicit **“Create new target masters”** confirmation before write (today: implicit on button click)?
- **Q-CROSS-003:** Should prepare auto-append target rec id to target finding `fldSuggestedRecs` (symmetry with 2B)?

### 4. Standards behavior

✅ DECIDED (cross-set — non-negotiable):

| Rule | Detail |
|------|--------|
| No cross-set standards inheritance | Do **not** copy `fldStandards` from source glossary row, source-set finding, or source-set recommendation onto target glossary row or onto **new** target masters. |
| New target masters | `fldStandards: []` on create (implemented in **Prepare Target Set Records**). |
| No source glossary row copy | Target glossary `fldStandards` must **not** be populated from source/host/template glossary row merely because the user branched from that row. |

✅ DECIDED (target-set-only hydration — when reusing existing target masters after prepare):

| Situation | Staged / row behavior |
|-----------|----------------------|
| Reused target finding exists | Staged **finding** standards may reflect **that target finding’s** `fldStandards` (implemented: `onReplaceStagedStandards` uses `findingMatches[0].fldStandards`). |
| Reused target rec exists | Staged **rec** standards may reflect **that target rec’s** `fldStandards` (implemented). |
| Target glossary row | Staged glossary standards start **`[]`** after prepare; normal **SAVE RECORD** / selection rules apply until user edits. |

**Incorrect:** Hydrating target glossary row from source-set master standards or source glossary row standards at prepare or at a future modal **Continue**.

Same-set rules (2B/2C/2D) remain in the table above; do not apply source-glossary-row copy rules from older doc lines to 2B/2C (implemented: finding-only / rec-only / none).

### 5. Images

✅ DECIDED:

- **Prepare Target Set Records** does not copy images (no glossary row created yet).
- **Future orchestrated cross-set Continue** (if added): new target glossary row `fldImages: []` by default — same as 2B/2C/2D.

OPEN:

- **Q-CROSS-004:** Today, when the user changes glossary set and the sync effect finds a **source-set four-tuple** in another set (`otherSetRows`), it may set `selections.images` from that **source-set glossary row** (`templateRow.fldImages`) while `editingGlossaryId` is cleared. Confirm whether cross-set template UX should **always** clear images until explicit opt-in on **SAVE RECORD** (recommended: align with “no silent image copy across sets”).

### 6. Measurement / unit / cost behavior

| Field | Source for target (today / proposal) | Notes |
|-------|--------------------------------------|--------|
| `fldMeasurementType`, `fldUnitType` (finding) | Copy from **source finding** on **new** target finding create | Implemented in prepare |
| `fldUnit`, `fldUOM`, `fldOrder` (rec) | Copy from **source rec** on **new** target rec create | Implemented |
| `fldUnitCost`, `fldUnitType` (glossary override) | OPEN — manual **SAVE RECORD**; sync may clear overrides in template mode | Same-set 2B/2C copy from **source glossary row** when present; cross-set should **not** auto-copy source glossary unit/cost without user confirmation |
| Category / Item | Unchanged (shared masters) | v1 |

OPEN:

- **Q-CROSS-005:** Should target glossary row inherit unit/cost overrides from **source glossary row** on save, or only from target rec defaults?

### 7. Activation behavior

| Approach | Description |
|----------|-------------|
| **Today (prepare path)** | User stays in Builder on target find/rec; `editingGlossaryId` cleared; banner “New Glossary Record Pending” until **SAVE RECORD**. Source row unchanged. **Revert** restores source set + staged standards snapshot. |
| **Recommended (future orchestrated cross-set)** | After successful target master + glossary create: **switch dropdown to target set**, **activate new target five-tuple** (`activateGlossaryBuilderRecord` + `pendingRelatedActivationRef` pattern), same as 2B/2C/2D — user lands on editable target row, not source. |

✅ DECIDED (recommendation for implementation): **Activate target row** on completion of an orchestrated cross-set write (when shipped). Keeping the user on the source row after creating a target record is easy to misread as “nothing happened.”

### 8. Duplicate prevention

Apply checks in **target set** before any Firestore write (orchestrated path should mirror prepare + save):

| Check | Rule |
|-------|------|
| Target finding short title | If creating new finding: normalized short must not collide with another finding in **target set + item** (exclude self). OPEN: allow same short as source set (yes — different sets). |
| Target rec short title | Same pattern in **target set + item context** (`masterRecOverlapsSelectedItemContext` pattern). |
| Target five-tuple | `findExactGlossaryByFiveTuple` in **target set** must be empty before create; else block and direct to edit existing. |
| Ambiguous text reuse | >1 finding or >1 rec text match in target set → block (implemented). |
| Partial writes | If any check fails, **no** finding/rec/glossary writes in that transaction. |

### 9. UI flow

#### Today

| Surface | Behavior |
|---------|----------|
| **Create Related Record** modal → `cross_set_template` | **Continue** → info toast; directs to Glossary Set + **Prepare Target Set Records** (no Firestore writes on Continue). |
| **Glossary Set** dropdown | Changing set while on an **existing** source five-tuple captures `templateSourceSnapshot` (source set id, `editingGlossaryId`, staged standards) and clears staged standards to `[]`. |
| Template banner | Shown when `glossaryWorkflowStatus.kind === 'template'` (four-tuple exists in another set, no exact row in current set). |
| **Prepare Target Set Records** | Creates/reuses target masters only. |
| **SAVE RECORD** | User creates target glossary row (normal five-tuple upsert). |

✅ DECIDED: Until an orchestrated cross-set **Continue** exists, **do not** imply modal **Continue** performs cross-set saves.

OPEN:

- **Q-CROSS-006:** Should modal **Continue** eventually run the same orchestration as prepare + save in one step, or remain a launcher for the dropdown/banner path (Phase X1 = clarification only)?
- **Q-CROSS-007:** Pre-save summary dialog: “Will reuse/create target finding X, target rec Y, new glossary row in {target set}” — required?

**Proposed modal copy (when `cross_set_template` selected):** “Cross-set records are not created on Continue. Select the **target Glossary Set**, use **Prepare Target Set Records**, then **SAVE RECORD**. Citations and images are not copied from the source set automatically.”

### 10. Implementation phases

| Phase | Scope | Status |
|-------|--------|--------|
| **X1 — Docs + UI clarification** | Architecture (this section); modal/helper text; no new writes | OPEN (docs in progress) |
| **X2 — Target-set duplicate preview** | Dry-run panel: reuse vs create, five-tuple collision, ambiguous match — no writes | Not started |
| **X3 — Orchestrated cross-set create** | Single transactional path: target masters (reuse/create) + target glossary row + activation; standards/images rules above | Not started |
| **X4 — Activation / polish** | `pendingRelatedActivationRef` for cross-set; optimistic lists; Revert semantics | Not started |

**Dependency:** X3 should reuse `normalizeForDeterministicMatch`, `glossarySetMetadataForId`, `findExactGlossaryByFiveTuple`, and provenance fields already used in **Prepare Target Set Records**.

### 11. Non-goals

- No migrations or bulk duplicate cleanup (Phase 3 admin remains separate).
- No Data Entry or Report Preview changes as part of cross-set work unless explicitly scoped.
- No automatic cross-set **standards** inheritance.
- No silent **image** copy across sets (unless Q-CROSS-004 resolves otherwise).
- No shared master ids across glossary sets.
- No “link only” glossary rows without target-set masters.

### Current code map (reference)

| Area | File / symbol |
|------|----------------|
| Modal scenario + toast | `GlossaryBuilder` — `cross_set_template`, `handleRelatedRecordContinue` |
| Template snapshot | `templateSourceSnapshot`, Glossary Set `onChange` |
| Prepare writes | `handlePrepareTargetSetRecords` |
| Template banner UI | `glossaryWorkflowStatus.kind === 'template'` |
| Set metadata | `src/lib/glossarySets.ts` — `glossarySetMetadataForId` |
| Revert | `handleRevertTemplateSource` |

---

### Implementation phases and guardrails

**Phase 1 (done):** Remove **COPY & EDIT** UI; guard `saveNewGlossaryRecord` against full-path silent duplicate masters; preserve greenfield **ADD FINDING/REC**.

**Phase 2A (done):** Modal scaffolding — relationship type selection, scenario forms, prefill defaults; **Continue** wired only as scenarios ship (2B, 2C).

**Phase 2B (done):** `same_find_new_rec` — see table above.

**Phase 2C (done):** `new_find_same_rec` — see table above.

**Phase 2D (done):** `new_find_new_rec` — create both masters and a glossary row in the current set, with collision checks on both short titles; no standards hydration at creation.

**Phase 3 (not started):** Duplicate reporting/cleanup (admin): list masters with same normalized short text + same `fldItem` + same `fldGlossarySetId` but different ids; no automatic deletion without review.

### Implementation cautions (related-record work)

- Use App-level **`activateGlossaryBuilderRecord`** (`setSelections` functional updater); do not rely on stale `selections` object spreads after `await`.
- Use **`pendingRelatedActivationRef`** with scenario-specific match predicates so glossary hydration does not snap back to the source row mid-activation.
- **Do not silently copy images** — new glossary rows always start with `fldImages: []`.
- **Do not broaden Glossary Builder refactors** — extend `applySameFindingNewRecommendation` / `applyNewFindingSameRecommendation` and modal UI only per phase.
- **Do not mix** duplicate cleanup, migrations, Data Entry, or Report Preview changes into Phase 2B/2C/2D feature branches.
- New master findings in a named glossary set **must** carry `glossarySetMetadataForId` (or equivalent `fldGlossarySetId`) or they will be filtered out of the Finding dropdown (`findingsForSelectedSet`).

**Guardrails for all implementation work:**

- No silent duplicate master creation.
- Prefer **one scenario per implementation branch/PR** (2B → 2C → 2D).
- Do not change **SAVE RECORD** five-tuple upsert semantics without explicit product approval.
- Do not change Data Entry or Report Preview as part of Phase 2 modal work unless separately specified (e.g. label disambiguation).

---

## 11. Immediate Phase 1 Glossary Set Implementation

✅ DECIDED: Phase 1 adds Glossary Set metadata directly to glossary records.

Phase 1 does not require a separate `glossarySets` collection.

Phase 1 does not change Data Entry filtering yet.

Phase 1 does not automatically migrate existing glossary records.

Phase 1 goals:

- allow new glossary records to be tagged as UFAS, ADA 2010, TAS 2012, etc.
- allow current Harris Center work to be tagged as UFAS
- preserve legacy/unassigned glossary rows
- prepare for future active Glossary Set filtering

Files likely affected:

```text
src/types/index.ts
src/components/GlossaryBuilder.tsx
src/components/GlossaryExplorer.tsx
docs/ARCHITECTURE_DESIGN.md
```

Files not affected in Phase 1:

```text
src/components/ProjectDataEntry.tsx
src/components/DataExplorer.tsx
src/components/ReportPreview.tsx
src/services/firestoreService.ts
```

---

## 12. Future Phase: Glossary Set Registry

A future phase may add a formal collection:

```text
glossarySets
```

Possible fields:

```ts
id: string;
name: string;
standardType: string;
standardVersion?: string;
isActive?: boolean;
sortOrder?: number;
```

Examples:

```text
UFAS
ADA_2010
TAS_2012
TAS_1994
FHA_GUIDELINES
ANSI_A117_1_2009
IBC_2020
```

This registry would support:

- controlled Glossary Set options
- admin management
- sorting
- activation/deactivation
- future Project Family presets

---

## 13. Future Phase: Library Standard Context Metadata

A future implementation phase may expose standard-context metadata on library Findings and Recommendations.

Possible fields:

```ts
fldGlossarySetId?: string;
fldGlossarySetName?: string;
fldStandardType?: string;
fldStandardVersion?: string;
```

This phase should:

- apply only to library Findings and Recommendations
- not add standard context to Categories or Items
- treat existing untagged records as legacy/unassigned
- avoid backfills or migrations unless explicitly reviewed
- avoid changing glossary filtering until a separate phase
- avoid changing Project Data or reports

The goal is to allow users to classify new library content as UFAS, ADA 2010, TAS 2012, ANSI A117.1, etc., while continuing active project work.

---

## 14. Future Phase: Project Families

A future phase may add:

```text
projectFamilies
```

Possible fields:

```ts
id: string;
name: string;
defaultGlossarySetIds: string[];
defaultActiveGlossarySetId?: string;
description?: string;
isActive?: boolean;
```

A project may then store:

```ts
fldProjectFamilyId?: string;
fldEnabledGlossarySetIds?: string[];
fldActiveGlossarySetId?: string;
```

Important rule:

```text
Project Families suggest.
They do not restrict.
```

Users must always be able to enable additional Glossary Sets or remove suggested Glossary Sets when professional judgment requires it.

---

## 15. Future Phase: Active Glossary Set in Data Entry

A future Data Entry phase should add:

```text
Active Glossary Set
```

This will allow users to switch the working Glossary Set while entering records.

Example:

```text
Active Glossary Set: UFAS
Category → Item → Finding → Recommendation
```

Switching the active Glossary Set should filter available glossary records.

Custom Record mode remains available regardless of active Glossary Set.

---

## 16. Revised User Mental Model

User-facing mental model:

```text
1. Choose project context.
2. Enable applicable Glossary Sets.
3. Select the active Glossary Set.
4. Select a finding/recommendation.
5. Adjust the data record as needed.
6. Add or modify citations if needed.
```

Users should not need to understand:

- joins
- normalization
- many-to-many relationships
- database structure

But users should understand:

```text
Glossary Set = standard/version working context
Project Family = suggested bundle
Project Data Record = final project-specific truth
```

---

# ⚖️ Standards Model

## 17. Standards Are Layered

Projects may involve multiple overlapping standards, including:

- ADA
- TAS
- UFAS
- FHA / ANSI
- IBC
- local code amendments
- federal funding requirements
- agency-specific requirements

The system must allow multiple standards to be relevant to the same project.

---

## 18. Time-Based Compliance

Evaluation Standard may differ from Recommendation Standard.

Example:

```text
Building constructed: 2008
Evaluation standard: TAS 1994
Recommendation standard: TAS 2012
```

The system must support this distinction.

A project or record may need to document:

- the standard used to evaluate the existing condition
- the standard used for recommended corrective work
- why those standards differ

---

## 19. Standard Record Model

The `master_standards` library uses a unified schema.

Standard relation types include:

```text
Standard
Advisory
Exception
Figure
Table
```

Optional fields may include:

```text
imageUrl
imageCaption
content_text
citation_num
citation_name
fldStandardType
fldStandardVersion
```

---

# 🧬 Concept vs Version

## 20. Concept Layer — Deferred

A future concept layer may be added.

Planned field:

```text
conceptId
```

The concept layer would allow the system to associate equivalent or related requirements across standard versions.

Example:

```text
Accessible route running slope
  → ADA 2010 version
  → TAS 2012 version
  → UFAS version
  → ANSI version
```

This is deferred but should remain future-ready.

---

## 21. Version Layer

Each concept may eventually exist as:

- ADA version
- TAS version
- UFAS version
- ANSI version
- IBC version
- context-specific version

For now, controlled duplication across standards is acceptable and expected.

---

# 🔁 Data Flow

## 22. Library → Glossary

When creating a glossary record from library content, copy:

- finding text
- recommendation text
- measurement metadata
- cost defaults
- standards/citations
- category/item/finding/recommendation IDs

When selecting library content for a glossary record, the preferred candidate list should eventually be filtered by the active Glossary Set / standard-version context.

Example:

```text
Active Glossary Set: UFAS 1984
Selected Item: Grab Bars

Preferred finding candidates:
- library findings for Grab Bars with fldGlossarySetId = "UFAS_1984"
```

Library records from other Glossary Sets may be used as copy/template sources through explicit search or copy workflows, but they should not be silently treated as belonging to the active Glossary Set.

Creating a glossary record from a library record copies the library record’s current content and citation defaults into the glossary as a snapshot.

The glossary record becomes independently editable.

Later changes to the library do not automatically update the glossary.

---

## 23. Glossary → Data Record

When creating a project data record from a glossary record, copy:

- finding text
- recommendation text
- measurement metadata
- cost defaults
- standards/citations
- glossary linkage
- category/item/finding/recommendation context as needed

The project data record becomes independently editable.

Later changes to the glossary do not automatically update the data record.

---

## 24. Integrity Rule

```text
Records NEVER update glossary automatically.
Glossary NEVER updates library automatically.
Library changes NEVER silently mutate glossary or project data.
Glossary changes NEVER silently mutate saved project data.
```

Explicit sync or refresh tools may be added in the future, but they must be:

- intentional
- reviewable
- selective
- reversible where possible
- protected by backup or confirmation safeguards

---

# 🧾 Record-Level Citations

## 25. Citation Snapshot Model

The citation model follows the broader snapshot inheritance architecture:

```text
Library → Glossary → Project Data Record
```

Citations may eventually exist at all three layers:

```text
Finding / Recommendation Library Citations
        ↓ copied into
Glossary Citations
        ↓ copied into
Project Data Record Citations
```

Each layer inherits defaults from the layer above, but once copied, the citation set becomes an editable snapshot for that layer.

Library citation defaults are standard-context-specific because library Findings and Recommendations are standard-context-specific.

A library Finding or Recommendation should carry the citation defaults for its own Glossary Set / standard-version context.

If identical wording is needed under another standard, the preferred approach is to create a separate library record for that standard context and assign that record its own citation defaults.

Glossary records and Project Data records remain professionally flexible snapshots. They may add or remove citations, including citations from standards other than the source library record’s standard, when professional judgment requires it.

---

## 26. Project Data Citations

✅ DECIDED: Project data citations are stored on:

```text
projectData.fldStandards
```

This field represents the final citation set for that specific record.

For glossary-based records:

- citations are inherited from the glossary when the record is created
- the user may add or remove citations for that specific data record
- changes apply only to that data record

For custom records:

- citations start empty unless the user adds them
- the user may add citations manually

Reports use `projectData.fldStandards` as the final citation source.

---

## 27. Citation Reporting Policy

✅ DECIDED: Reports treat `projectData.fldStandards` as authoritative.

If `projectData.fldStandards` exists as an array:

- use that array
- even if it is empty

If an older glossary-linked record has no `fldStandards` field:

- fallback to `glossary.fldStandards` for legacy display only

Do not union record citations with glossary citations at report time.

This prevents removed record-level citations from reappearing in reports.

✅ DECIDED (report UI v1): **View Report** opens a section-selection dialog before `ReportPreview`. The cover page is always included; other sections default to on for the current open only (no `localStorage`). **Referenced standards** and **Photo addendum** rows are omitted when `getReportSectionAvailability` reports no content. Deselected sections are not rendered (no empty placeholders). Page labels keep fixed prefixes (narrative Roman numerals, documentation `1,2,…`, financial `A*`, standards `B*`, photo `D*`); gaps when a section is omitted are acceptable.

✅ DECIDED (report preview): The same dialog offers **report record sort** (default **Category → Location → Item**; optional **Location → Category → Item**). It drives **`filterReportProjectForPreview`** (Documentation order). **Financial Summary** follows the same choice: default mode groups by category with columns Item \| Location \| …; location-first mode groups by location with columns Category \| Item \| …. It is not persisted. **Referenced standards** addendum ordering stays citation-driven. **Photo addendum** keeps location-first display; `filteredData` order may only affect tie-breaks within the same location label.

✅ DECIDED (Web Report Viewer — foundation): Internal **Web Report Viewer** tab provides **separate read-only web rendering** (Option B) using **live Firestore-backed data** already loaded in the app shell. **No auth/client portal**, **no published snapshots**, **no print**, and **no changes to `ReportPreview.tsx`**. Initial sections: **heading** (always included), **narrative**, and **documentation** with the same two hierarchy modes as PDF reports. **Financial**, **Referenced Standards**, and **Photo Addendum** are implemented (see v1 blocks below). Full on-screen order: Narrative → Financial → Documentation → Referenced Standards → Photo Addendum. **Section toggles** control included on-screen content (and future print/export); **accordion collapse is screen-only** and does not affect inclusion.

✅ DECIDED (Web Report Viewer — content filters): **Category**, **location**, and **item** filters are **inclusion controls** on the full facility report dataset (options derived from records for the selected project/facility only). Filters combine with **AND** logic, default to **all options selected**, and define displayed documentation (and future web print/export inclusion). **Canonical record numbers** remain fixed from the full facility set (filtered views may show gaps). **Accordion collapse** stays screen-only. **`ReportPreview.tsx` / PDF path unchanged** in Web Report Viewer work.

✅ DECIDED (Web Report Viewer — collapsed item summaries): When item-level groups are collapsed, item group headers show compact record summaries (canonical record number + short finding + short recommendation) via `webReportRecordSummaries` helpers. Screen-scanning assistance only; does not replace expanded record cards. Spreadsheet-style export remains future work.

✅ DECIDED (Web Report Viewer — session controls): **Sort hierarchy**, **section inclusion** (narrative / financial / documentation / referenced standards / photo addendum), **record inclusion filters** (category / location / item IDs), and **section expand UI** (narrative, documentation, financial, standards, photo addendum) persist via a **controls-only** session write that **preserves** stored `collapsedKeys` and `financialCollapsedKeys` for the same project/facility. **Documentation accordion collapsed keys** are written **explicitly** on collapse/expand (toggle, toolbar, reconcile) so remount never overwrites them with an empty Set. Single payload (`fredasoft.webReport.state.v1`) per **current project + facility**. Survives tab navigation and **browser refresh** in the same tab session. **Changing project or facility** resets to defaults and replaces storage (v1 does **not** restore prior facility when A → B → A). **Logout** clears the session key. **Scroll position** not persisted. Collapsed keys **reconciled** when the documentation tree changes. Filter IDs **pruned** on restore/option changes without wiping user filters. No Firestore / `localStorage` / `ReportPreview.tsx` changes.

✅ DECIDED (Web Report Viewer — empty/current facility selection): Web Report Viewer facility selection is **local to the Web Report tab**. It may include the **current active workspace facility** as a **view-only option** when that facility belongs to the **current client context**, even if the facility is **not listed in `project.fldFacilities`** and has **no `projectData` records**. This prevents **silent fallback** to another facility’s report and allows an empty facility to remain selected with a clear **“No documentation records”** state. The Web Report Viewer **must not write Firestore**, **must not auto-link** facilities to `project.fldFacilities`, and **must not change** the global active facility from its local dropdown.

✅ DECIDED (Web Report Viewer — Financial section v1): A new **Financial** section is available in Web Report Viewer as a **view-only** section between **Narrative** and **Documentation**. It summarizes **the same included records** used by documentation filters (category/location/item inclusion) and uses the existing report enrichment pipeline’s **report-adjusted costs**. Financial layout follows the selected **sort hierarchy** (one parent level at a time: category or location) with **one detail row per included record** (no aggregation), parent subtotals, and a grand total footer. Financial parent-row collapse uses **`financialCollapsedKeys`** in session state (separate from documentation `collapsedKeys`). Financial visibility and section expanded state persist in the same Web Report session controls payload. Documentation accordion collapse remains display-only and does not affect financial totals. **No Firestore writes** and **no `ReportPreview.tsx`/PDF behavior changes** in this phase.

✅ DECIDED (Web Report Viewer — Referenced Standards section v1): **Referenced Standards** is a read-only Web Report section rendered **after Documentation** (order: Narrative → Financial → Documentation → Referenced Standards). It uses **currently included/filtered** documentation records (same category/location/item inclusion as Financial/Documentation; documentation accordion collapse does not affect included standards). Content is built via shared **`buildReferencedAddendumEntries()`** / citation formatting helpers (not duplicated from `ReportPreview.tsx`). Section inclusion and top-level expand state persist in **`fredasoft.webReport.state.v1`** (`standards`, `standardsExpanded`; legacy missing values default to on/expanded). Toggle is **disabled** when no referenced standards exist for included records; enabled empty state explains filter scope. **`ReportPreview.tsx` / PDF unchanged.**

✅ DECIDED (Web Report Viewer — Photo Addendum section v1): **Photo Addendum** is a read-only Web Report section rendered **after Referenced Standards** (order: Narrative → Financial → Documentation → Referenced Standards → Photo Addendum). It shows **supplemental photographs** from included records (`fldImages` index **2+**, matching PDF addendum convention; indices 0–1 remain on documentation cards). Uses the **same included/filtered** records as Financial/Documentation/Referenced Standards; documentation accordion collapse does not affect photo inclusion. Section inclusion and top-level expand persist in **`fredasoft.webReport.state.v1`** (`photoAddendum` / legacy `photos`, `photoAddendumExpanded` / legacy `photosExpanded`; missing values default to on/expanded). Toggle is **disabled** when no supplemental photos exist for included records. **`ReportPreview.tsx` / PDF unchanged.**

✅ DECIDED (Web Report Viewer — presentational split): `WebReportViewer.tsx` orchestrates session state, filters, and enrichment. Presentational UI lives under `src/components/webReport/`: **`WebReportControls`**, **`WebReportDocumentationSection`**, **`WebReportFinancialSection`**, **`WebReportStandardsSection`**, **`WebReportPhotoAddendumSection`**, **`WebReportFindingCard`**, **`WebReportCollapseToggle`**, and **`webReportRecordSummaries.ts`** (compact collapsed-row labels). Split is maintainability-only; user-facing behavior is unchanged from the prior monolith.

✅ FUTURE FIX (Web Report Viewer — project/facility association consistency): The **broader project/facility association workflow** remains future work. When a facility is created or intentionally paired with a project, the app should eventually offer a **deliberate workflow** to update `project.fldFacilities` or prompt the user. That association must happen **outside Web Report Viewer**, which stays view-only.

✅ DECIDED (Project Audit — internal QA v1): **Project Audit** is a new **internal read-only** tab for project-wide QA. It loads **active** `projectData` for the **selected project** across **all facilities** (derived from `fldFacility` on records, not limited to `project.fldFacilities`). Records group by **Finding ID** or **Recommendation ID** with accordion expand/collapse, facility filter, and text search. Each row shows snapshot finding/recommendation text, **raw saved costs** (no cost multiplier), and **effective citations** via `getRecordStandardIds` + citation labels. **Warning flags** surface missing IDs, unresolved lookups, archived/missing masters, snapshot-vs-master text drift, multiple costs/pairings, and inconsistent citation sets. **No Firestore writes**, no PDF/export, no edit/jump-to-record. Does **not** change Web Report Viewer, `ReportPreview.tsx`, PDF output, or Data Entry save behavior.

✅ DECIDED (Project Audit — report content filter): **Report content issues only** is a read-only filter that limits visible groups/records to those with missing/unresolved **category**, **item**, or **location**, or blank **snapshot** finding/recommendation text (`fldFindShort`/`fldFindLong`/`fldRecShort`/`fldRecLong` only — not master library text). Metadata warnings (IDs, glossary row, archived master, snapshot drift, costs, citations) remain visible when the filter is off and do not satisfy this filter. Summary shows a **Report content issues** record count for the current mode/facility/search scope.

✅ DECIDED (Project Audit — warning filters): Project Audit **warning filters are view-only**. Warning **generation is unchanged** except **`multiple_costs` semantics** (see below). Filters control **visibility** of groups/records and badges. **Report content issues only** remains the primary report-blocker shortcut (maps to report-content warning codes). A collapsible panel adds **category** and **per-code** toggles (Report content, Metadata & linkage, Snapshot drift, Group consistency, Lookup & glossary), plus **Select all / Clear all / Reset defaults**. Optional **Hide expected custom/unassigned noise** suppresses badges only: on **custom** records with report snapshots, metadata noise (`missing_finding_id`, `missing_recommendation_id`, `missing_glossary_row`, `master_finding_missing`, `master_rec_missing` when snapshot text exists); on **Unassigned** groups (`masterId` null), group consistency badges including `multiple_costs`. **Report-content codes are never suppressed.** **`multiple_costs`** is emitted only when records sharing the same **recommendation cost bucket** have more than one distinct **unit cost** (raw saved `fldUnitCost` on the audit row — not report-multiplier-adjusted, not `totalCost`). Quantity/total may differ without triggering this warning. Bucket key = master rec ID, or `id`+snapshot when both exist, or snapshot-only when no ID — never finding ID. Records with missing unit cost are skipped for this check. Different recommendations with different unit costs in one finding group do **not** qualify. Unassigned groups (`masterId` null) do not emit `multiple_costs`. Rose badge styling for report-content codes is unchanged.

✅ DECIDED (Project Audit — session UI state): Project Audit **filters and UI state** persist in **`sessionStorage`** (`fredasoft.projectAudit.state.v1`) **per project ID** (mode, facility filter, search, report-content shortcut, warning panel open, enabled warning codes, hide expected custom/unassigned noise toggle, collapsed group keys). **Logout** clears the store (same as Web Report session). Switching projects restores that project’s saved audit state independently. Facility filter is reconciled to valid facility options on restore; collapsed group keys are pruned to keys that still exist for the current build/mode.

✅ DECIDED (Project Audit — filter visibility rules): With **no limiting filters** (all facilities, blank search, report-content off, all warning codes enabled), **every audit record** is shown. **Warning codes cleared** still shows all records but hides badges and sets warnings count to **0**. **Partial warning-code selection** narrows to records/groups with ≥1 enabled visible warning. **Report content issues only** is the explicit report-content record filter; empty result with no issues in scope shows a **success** empty state. **Hide expected custom/unassigned noise** affects badge/count visibility only, not which records appear.

✅ DECIDED (Project Audit — filter UI split): `ProjectAuditReportView.tsx` orchestrates audit build and session state. Filter and summary UI lives in presentational components under `src/components/projectAudit/`: **`ProjectAuditWarningFilters`**, **`ProjectAuditFilterControls`**, **`ProjectAuditSummaryCards`**, and **`ProjectAuditEmptyState`**. Split is maintainability-only; audit logic and filter semantics are unchanged.

Future work should investigate and implement a deliberate project/facility association workflow:

- When a facility is created while an active project context is selected, the app should offer to associate that facility with the project, likely by updating `project.fldFacilities`.
- When an existing same-client facility is intentionally paired with a project, the app should offer a clear “associate facility with project” action rather than waiting for the first `projectData` save to backfill the relationship.
- A read-only audit may be useful to find facilities used in workspace/report contexts but missing from `project.fldFacilities`.

---

## 28. Future Citation Drift / Refresh Workflow

Changes to citations at an upstream layer should not automatically mutate downstream records.

Example:

```text
finding.fldStandards changes
```

should not automatically update:

```text
glossary.fldStandards
projectData.fldStandards
```

Because library records are standard-context-specific, citation drift review should compare a glossary record against the library Finding / Recommendation records from which it was originally copied, not against superficially similar records from other standards.

A future workflow may allow users/admins to compare current library citation defaults against citations currently stored on a glossary record.

Possible UI action:

```text
Review Library Citation Updates
```

This action would compare:

```text
Current Library Defaults
vs.
Current Glossary Citations
```

Example:

```text
Current Glossary Citations
- TAS 302.1
- TAS 403.5.1

Current Library Defaults
- TAS 302.1
- TAS 403.5.2
```

The user/admin could then decide whether to:

- add a newly inherited citation
- remove an outdated citation
- replace a citation
- keep the glossary as-is
- apply all suggested changes
- ignore the difference for this glossary record

Future copy or refresh tools may help create equivalent library records across Glossary Sets, but such tools must create or update records explicitly and reviewably. They must not silently merge standards or mutate downstream snapshots.

---

## 29. Citation Refresh Options

### Option A: Per-Glossary Review

Add a review action directly in Glossary Builder.

Example:

```text
Review Library Citation Updates
```

This evaluates only the currently selected glossary record.

Benefits:

- simple mental model
- lower risk
- good for case-by-case review
- avoids accidental bulk changes

This is likely the best first implementation.

### Option B: Admin Citation Drift Audit

Create a future admin/audit panel that identifies glossary records whose citations differ from their underlying library defaults.

Example:

```text
Glossary Citation Drift Audit
```

The audit could list:

- glossary record
- associated category/item/finding/recommendation
- current glossary citations
- current library default citations
- added/removed/different citation IDs
- suggested action

This should require explicit approval before changes are applied.

### Option C: Bulk Refresh With Preview

A future advanced admin workflow could allow selected glossary records to be refreshed from library defaults in bulk.

This should only be allowed with:

- clear preview
- selective approval
- backup protection
- duplicate detection
- ability to skip records
- confirmation before write

Bulk refresh must never be silent or automatic.

---

## 30. Possible Citation Metadata for Future Sync

Future records may store citation inheritance metadata such as:

```text
fldInheritedFindingStandardsSnapshot
fldInheritedRecommendationStandardsSnapshot
fldCitationLastSyncedAt
fldCitationSourceVersion
```

These fields are not required immediately, but may help distinguish:

- citations originally inherited from the library
- citations added directly to the glossary
- citations removed intentionally at the glossary level
- citations that differ because the library changed later

A simpler first implementation can compare live library citation values against current glossary citation values without additional metadata.

---

# 📏 Measurement Metadata

## 31. Measurement Metadata Snapshot

✅ DECIDED: Project data snapshots measurement metadata from the finding/library context at record creation.

Project data stores:

```text
projectData.fldMeasurementType
projectData.fldMeasurementUnit
projectData.fldMeasurement
```

Library findings store:

```text
finding.fldMeasurementType
finding.fldUnitType
```

Examples:

```text
fldMeasurementType: "Slope"
fldMeasurementUnit: "%"
fldMeasurement: 2.5
```

```text
fldMeasurementType: "Width"
fldMeasurementUnit: "IN"
fldMeasurement: 31.5
```

Data Entry does not allow direct editing of measurement type for glossary-based records.

This protects statistical consistency and prevents users from accidentally mixing incompatible measurement types.

---

## 32. Measurement Metadata Repair

If a data record is missing measurement metadata, the correct process is:

```text
Fix source metadata upstream.
Review affected data records.
Apply repair explicitly.
```

Do not silently mutate existing project data when library metadata changes.

A read-only measurement metadata audit panel may identify records where:

```text
projectData.fldMeasurementType is missing
projectData.fldMeasurementUnit is missing
```

A repair workflow may explicitly update selected project data records from linked finding metadata.

Repair rules:

- update projectData only
- never update glossary/library records from repair
- fill missing fields only by default
- do not overwrite non-empty measurement metadata unless a future explicit overwrite workflow is designed
- do not infer from text

The temporary audit/repair panel may be hidden from the UI after cleanup, but retained in the codebase for future admin use.

---

# 🧰 Custom Project Records

## 33. Custom Record Mode

✅ DECIDED: Data Entry supports custom project-only records.

Custom records:

- are not linked to a glossary
- do not create library records
- do not create glossary records
- are project-specific
- save `fldRecordSource: "custom"`
- save `fldData: ""`

Custom records may store:

```text
fldPDataCategoryID
fldPDataItemID
fldPDataMasterFindID
fldPDataMasterRecID
```

Template IDs are trace fields only. They do not create glossary linkage.

---

## 34. Custom Record Template Copy

In Custom Record mode, users may:

- write a finding freehand
- write a recommendation freehand
- optionally copy a finding template from the library
- optionally copy a recommendation template from the library

Copying from the library:

- copies text/default values into the data record
- does not link the record to the glossary
- does not create a glossary record
- does not create a library record
- remains editable before save

Finding template copy may populate:

```text
fldFindShort
fldFindLong
fldMeasurementType
fldMeasurementUnit
```

Recommendation template copy may populate:

```text
fldRecShort
fldRecLong
fldUnitCost
fldUnitType
```

---

## 35. Custom Record Promotion — Future Phase

Phase 1 allows users to create project-only custom data records that are not linked to the glossary or library.

A future phase will define how high-quality custom records can be reviewed and promoted into reusable library/glossary content.

Core principle:

```text
Custom Project Record ≠ Library Record
Custom Project Record ≠ Glossary Record
```

Promotion into the library/glossary must be intentional and controlled.

---

## 36. Request Add to Glossary — Future Phase

A future workflow may allow a user to submit a custom data record for review.

Example action:

```text
Request Add to Glossary
```

This action should create a pending request, not a glossary record.

Possible collection:

```text
glossaryRequests
```

Possible fields:

```text
sourceProjectDataId
sourceProjectId
sourceFacilityId
proposedCategoryId
proposedItemId
proposedFindingShort
proposedFindingLong
proposedRecommendationShort
proposedRecommendationLong
proposedMeasurementType
proposedMeasurementUnit
proposedUnitCost
proposedCostUnit
proposedStandards
submittedBy
submittedAt
status
reviewedBy
reviewedAt
reviewNotes
```

Suggested statuses:

```text
pending
approved
rejected
duplicate
needs_revision
```

---

## 37. Admin Review Workflow — Future Phase

Admins should eventually have a review queue for pending glossary requests.

Admin actions may include:

- approve as new glossary entry
- reject request
- mark as duplicate
- edit before approving
- link to an existing finding
- link to an existing recommendation
- create new finding and/or recommendation records
- create final glossary link row

Approval may create or update:

```text
findings
recommendations
glossary
```

depending on whether reusable library records already exist.

Promotion should avoid creating duplicate or low-quality library records.

Before approval, the admin should be able to compare the requested custom record against existing:

- categories
- items
- findings
- recommendations
- glossary rows
- standards associations

The admin should decide whether to:

```text
Use existing library records
Create new library records
Create only a new glossary link
Reject as project-specific only
```

---

# 🏗️ Project Types / Project Families

## 38. Project Families

Project Families are practical compliance contexts.

Examples:

```text
Housing with Federal Funding
Housing without Federal Funding
TDLR / RAS Project
ADA Title II Assessment
ADA Title III Assessment
Fair Housing Review
Public Right-of-Way Review
```

Project Families are:

```text
prescriptive defaults
not restrictive gates
```

They may suggest:

- applicable Glossary Sets
- default active Glossary Set
- report defaults
- workflow defaults
- likely standards

They may not prevent users from enabling additional Glossary Sets.

---

## 39. Harris Center Example

The Harris Center project is an example of a complex housing assessment.

Example context:

```text
Client:
Harris Center

Project:
Accessibility Assessment

Project Family:
Housing with Federal Funding

Possible relevant Glossary Sets:
- UFAS
- ADA 2010
- FHA Guidelines
- ANSI A117.1 2009
- IBC 2020
- TAS 2012
```

Because the project involves housing, federal funding, disability programs, and Texas facilities, multiple standards may apply.

The user may use:

- TAS for exterior/site/public facility elements where TAS is most stringent or required
- UFAS for federally funded program requirements
- ADA 2010 when applicable or adopted by agency policy
- FHA / ANSI / IBC for dwelling-unit or multifamily housing conditions
- other standards as professional judgment requires

The app may help organize these choices in the future, but the user must remain able to exercise professional judgment.

---

# 🧪 UI Strategy

## 40. Dual Mode

FREDAsoft supports two broad usage modes:

```text
Field / mobile → fast input, access to mobile device camera
Office / desktop → full management, review, reporting, cleanup
```

Data Entry must remain efficient in the field.

Management and cleanup tools may be more detailed and desktop-oriented.

---

## 41. Data Entry Modes

Data Entry supports:

```text
Glossary Record mode
Custom Record mode
```

Glossary Record mode:

- uses approved glossary records
- saves a glossary link
- inherits defaults from the glossary
- allows project-specific edits

Custom Record mode:

- creates a project-only record
- does not require glossary linkage
- allows freehand finding/recommendation text
- may copy library templates as starting points

---

## 42. Citation UI in Data Entry

Data Entry uses the Standards Browser for record-level citations.

Users may:

- search and filter standards
- click `+` to add a citation
- drag/drop citations into the record citation area
- remove selected citations

All changes affect only:

```text
projectData.fldStandards
```

---

# 📸 Image Architecture — Future

Planned image features:

- image ordering
- primary report images
- appendix images
- metadata-based image storage
- caption management
- image source tracking

Project data records may store image arrays, but reporting should eventually support richer image metadata.

---

# 🔐 Firebase Safety

## Gemini API access

✅ DECIDED (Gemini API access): Gemini **generateContent** is accessed **server-side only** via Express **`POST /api/gemini`** (`server/geminiRoute.ts`, registered in `server.ts`). The **`GEMINI_API_KEY`** lives in server environment only (see `.env.example`); it is **never bundled into the client**. Client features that need Gemini must call the proxy route, not the Google API directly.

✅ DECIDED (query scoping vs rules): Live **project-scoped** Firestore listeners improve cost and in-memory isolation; they do **not** replace **Firestore security rules**. Tighter **membership/role** rules remain future work—see **Firestore live listener query scoping**.

---

Firestore behavior must follow these principles:

- no uncontrolled writes
- no loops
- explicit triggers only
- scoped queries
- use operation locks where needed
- avoid runtime migrations in production
- avoid broad unreviewed batch updates
- use confirmation and backup protection for destructive or broad operations

---

# 🧭 User Mental Model

Users should understand:

```text
Libraries define standard-context-specific reusable language and defaults.
Glossary Sets define standard/version context.
Glossary Records define approved combinations.
Project Families suggest applicable Glossary Sets.
Projects enable one or more Glossary Sets.
Data Records are final project-specific truth.
Standards define legal/technical authority.
```

Users should not need to understand:

- joins
- normalization
- database structure
- many-to-many relationships
- Firestore document IDs

---

# 🧭 Design Philosophy

The system must balance:

- flexibility
- clarity
- traceability
- accuracy
- usability
- historical stability
- professional judgment

The system should guide users, not trap them.

Defaults should be helpful, but not restrictive.

---

# 🟢 Final Architecture Summary

```text
Libraries → define standard-context-specific reusable language and defaults
Glossary Sets → define standard/version working contexts
Glossary Records → define approved category/item/finding/recommendation combinations
Project Families → suggest applicable Glossary Sets
Projects → enable one or more Glossary Sets
Project Data Records → define final project-specific truth
Standards → define legal/technical authority
```

---

# ✅ Architectural Decisions Locked

- Concept layer → deferred, future-ready
- Snapshot inheritance → copied downward, independently editable
- Glossary records → standard/version-indexed through Glossary Set metadata
- Library Findings / Recommendations → standard-context-specific, one Glossary Set / standard-version context per record
- Controlled duplication across standards → expected and acceptable
- Project Families / Project Types → prescriptive defaults only, never restrictive
- Standards handling → implicit multi-citation model
- Library sync → explicit only, never automatic, with backup protection
- Citation inheritance → copied downward, later refresh explicit only
- Measurement metadata → snapshotted onto project data records
- Custom records → project-only unless promoted through future admin workflow
- Project data records → final reporting source

---

# 🚀 Next Steps

Near-term:

- implement Phase 1 Glossary Set metadata
- tag current Harris Center glossary work as UFAS
- expose Glossary Set metadata in Glossary Builder
- show/filter Glossary Set metadata in Glossary Explorer
- document and later expose standard-context metadata for library Findings and Recommendations

Later:

- add formal `glossarySets` registry
- add Project Family presets
- allow projects to enable multiple Glossary Sets
- add active Glossary Set selector in Data Entry
- add library Finding / Recommendation standard-context metadata if not already implemented
- add explicit citation drift review
- add custom record promotion workflow
- continue Firestore security hardening

## Project Context Management

Projects, facilities, and locations are project-context entities.

They may be edited, but they should not be hard-deleted while project data or child entities depend on them.

Preferred lifecycle:

```text
active → archived → admin hard delete, only if safe


And another section:

```markdown
## Project Personnel

People may act as Inspectors, Reviewers, or both.

Projects should eventually support multiple assigned people rather than a single inspector.

Project team assignment is distinct from record authorship. A future project team model may store assigned users with project-specific roles such as inspector and reviewer.

Plan review workflows will use Reviewers, while field assessment workflows will use Inspectors. Some users may serve in both capacities.

## Future Phase: Project Context Entity Management

Projects, facilities, and locations use archive-first lifecycle management.

Preferred lifecycle:

```text
active → archived → admin hard delete, only if safe

For dependency guards, I would use these rules:

Project:
- block archive if active projectData exists for the project
- decide separately whether linked facilities in fldFacilities[] should also block archive
Projects, facilities, and locations may be edited, but they must not be archived or hard-deleted while active dependent records exist.

Dependency rules:

A project may not be archived if active projectData records reference it.
A facility may not be archived if active projectData records or active locations reference it.
A location may not be archived if active projectData records reference it.

Facilities are the working entity for buildings and other built-environment areas. Buildings are treated as a type of facility, not a separate required hierarchy layer.

Locations remain a flexible project-defined label for now. Structured location fields may be added later, but current workflows should support disciplined naming conventions.

✅ DECIDED: Locations are **facility-scoped** in the app (`fldProjectID` + `fldFacID`). The live **`locations`** listener is **project-scoped** (`fldProjectID`); facility narrowing is client-side. Data Entry and Data Explorer location pickers list only locations for the **selected project and facility**. **Deleting** a location is **blocked** when **active** (non-deleted, non-archived) `projectData` in the same project/facility scope references that location; there is **no cascade delete** of inspection records. Location removal remains **soft delete** only.

Hard delete is reserved for admin cleanup of erroneous entries and should require strict proof that no active dependent records exist.

Facility:
- block archive if active projectData exists for the facility
- block archive if active locations exist for the facility

Location:
- block archive if active projectData references the location

Add a concise future phase section covering:
1. active → archived → admin hard delete lifecycle
2. dependency guards for projects, facilities, locations
3. no cascade delete
4. no silent mutation of projectData
5. facility as the building/site entity
6. locations as flexible labels for now
7. inspector/reviewer/team model deferred

✅ DECIDED (RAS findings authoring - Phase 7, planning artifact only): Checked-in blank Excel workbook **`templates/RAS_FINDINGS_TEMPLATE.xlsx`** for RAS Plan Review comment batches. Layout spec: **`docs/RAS_FINDINGS_SPREADSHEET_TEMPLATE.md`**; import/Firestore authority: **`docs/RAS_FINDINGS_IMPORT_FORMAT.md`**. **Findings** tab is the only tab intended for a future importer. No Firestore importer, schema change, or app UI in this artifact phase.

✅ DECIDED (RAS findings import - Phase 8, offline dry-run skeleton only): Maintenance CLI **`scripts/maintenance/dry-run-ras-findings-import.ts`** validates **Findings** tab batches locally; outputs gitignored **`reports/ras-findings-import-dry-run.json`** and **`.md`**. No Firestore reads/writes, no credentials, no write mode. Item/standard resolution deferred in v1.

✅ DECIDED (RAS finding authoring style - documentation only): Internal prose conventions for Plan Review library batches in **`docs/RAS_FINDING_AUTHORING_STYLE.md`**. Canonical first example: **`content/ras-findings/batches/RAS-PR-batch1-doors-maneuvering-clearance.xlsx`**. Spreadsheet column layout remains **`docs/RAS_FINDINGS_SPREADSHEET_TEMPLATE.md`**; import authority unchanged (**`docs/RAS_FINDINGS_IMPORT_FORMAT.md`**). No app, importer, or Firestore changes in this doc phase.

✅ DECIDED (RAS finding syntax families - documentation only): **`docs/RAS_FINDING_AUTHORING_STYLE.md` §7** defines syntax families for reusable library prose. **Family 1** (condition not provided) matches Batch 1 doors/maneuvering clearance; **Family 2** (measurable/dimensional criteria) documented with templates and examples only—no new batch workbook in this phase. No Firebase/Firestore import, schema, or app changes.

✅ DECIDED (Lovable Project prototype discovery - documentation only): **`docs/FREDASOFT_PROJECT_APP_DISCOVERY.md`** records read-only analysis of the external Lovable/Supabase prototype (`C:\dev\LovableApp\extracted\`) as a requirements/workflow source. No Lovable code, Supabase schema, edge functions, CSV row data, or secrets copied into FREDAsoft. No app, Firestore, or package changes in this doc phase.

✅ DECIDED (Project discovery domain clarification - documentation only): Product-owner follow-up in **`docs/FREDASOFT_PROJECT_APP_DISCOVERY.md` §15** documents architecture implications: **TDLR/TABS source records** preserved as-recorded (legal/source) separately from **FREDAsoft canonical records**; matching/linking is explicit; FREDAsoft **never overwrites/corrects TDLR source data** (hydration creates draft operational records for staff review and explicit linking); TDLR **scraping/extraction** as a separate logged/reviewed pipeline; **correspondence PDF letters** separate from inspection **reporting workflows**; **client portal** implications (progress, project info, reports, client-submitted master-data updates with likely approval). No Firestore schema, rules, or app implementation in this phase.

✅ DECIDED (D5 Project stakeholder model - documentation only): **`docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md`** documents dual-track **TDLR snapshot vs canonical stakeholder** model, **project party** roles, **stakeholder entity types** (organization, individual, sole proprietor, unknown), and separate **stakeholder / contact / user / assignment** concepts; **Client vs Owner** decision space (default: separate); user **roles deferred** to later auth design. No Firestore schema, rules, migration, or app implementation in this phase.
