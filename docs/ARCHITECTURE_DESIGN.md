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

---

## 🧪 Required Verification

For implementation tasks, verify:

- target behavior works
- app builds or targeted lint/type checks pass where possible
- no new console errors are introduced
- no unrelated UI regression is introduced
- no unrelated data model or Firestore behavior is changed

Known unrelated lint/type issues should be reported separately and not hidden.

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
users             → roles and identity
```

✅ DECIDED: User-initiated deletion of `projectData` inspection records is a **soft delete** (`fldIsDeleted`, `fldDeleted`, `fldDeletedAt`, `fldDeletedBy`). Active views filter these out. Restore clears those flags via `firestoreService.restore('projectData', id)`. Hard document delete remains only for explicit maintenance paths (e.g. orphan cleanup), not for normal user delete.

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

✅ DECIDED: Locations are **facility-scoped** in the app (`fldProjectID` + `fldFacID`). Data Entry and Data Explorer location pickers list only locations for the **selected project and facility**. **Deleting** a location is **blocked** when **active** (non-deleted, non-archived) `projectData` in the same project/facility scope references that location; there is **no cascade delete** of inspection records. Location removal remains **soft delete** only.

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
