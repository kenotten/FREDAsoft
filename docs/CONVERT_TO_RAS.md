# Convert to RAS

**Status:** Planning / architecture note. Data Entry work mode, RAS **covers**, and RAS report **body** are implemented; Web Report parity and report instances are **not** implemented.
**Last updated:** 2026-08-29 (report Slice C: RAS body, RAS PDF filename, Inspection Narrative fallback)
**Audience:** Product owner, architecture review, implementation planning

> **Disclaimer:** This document captures internal planning for adapting FREDAsoft toward Registered Accessibility Specialist (RAS) workflows under the Texas Department of Licensing and Regulation (TDLR). It does **not** assert legal compliance, required forms, or final field lists. All TDLR/RAS requirements must be verified from official sources, sample deliverables, and qualified review before any implementation.

---

## 1. Purpose

FREDAsoft today supports accessibility inspection and reporting workflows used by consultants and inspectors: organizing work by project and facility, capturing structured deficiency records, attaching findings/recommendations/standards/photos/costs, and producing printable/PDF-style reports plus an internal Web Report Viewer.

This document records **current planning decisions** and open questions for adapting FREDAsoft so it can support inspections performed as **Registered Accessibility Specialists (RAS)** under TDLR-related expectations in Texas. The goal is to align product thinking, data model options, reporting shape, glossary direction, and phased delivery—**without** committing to code, schema, or compliance claims in this phase.

---

## 2. Background

RAS-related accessibility work in Texas is tied to state licensing and compliance-oriented inspection/reporting practices. Inspectors operating in that context typically need traceable project context, TAS-oriented standards, structured comments/deficiencies, reports with certification language, and eventually submission/retention workflows.

FREDAsoft already models much of the *mechanics* of inspection documentation. RAS support is planned as a **project-level type** and a **separate report/record shape** layered on shared infrastructure (projects, facilities, locations, photos, citations)—not a replacement of assessment/consulting workflows.

**Planning posture:** Decisions in sections 3–11 below reflect the latest architecture conversation. They are **not** shipped product behavior until implemented and reviewed per **AGENTS.md**.

---

## 3. Current FREDAsoft capabilities relevant to RAS

Existing areas that may **carry forward** for RAS (with gaps noted):

| Area | Relevance | RAS planning note |
|------|-----------|-------------------|
| **Project / facility / location** | Core structure | RAS adds project type + report instances; locations/areas still apply |
| **Data Entry (`projectData`)** | Record capture | RAS mode omits recommendations/costs; may add sheet/detail # |
| **Glossary (TAS 2012, UFAS, etc.)** | Templates | RAS projects: **TAS 2012 only**; separate **rasFindings** library for Plan Review |
| **Findings / recommendations** | Masters + snapshots | RAS uses **comments**; no recommendations on RAS reports |
| **Standards / citations** | TAS references | Retained; no recommendation citations |
| **Photos** | Per-record images | Inspection: inspection photos. Review: same image UI for plan excerpts / sheet screenshots / visual references. Dedicated markup system later. |
| **Costs / financial** | Assessment reports | **Excluded** from RAS reports |
| **Web Report Viewer** | Read-only sections | RAS template likely drops Financial; other sections TBD |
| **PDF / Report Preview** | Sectioned PDF | RAS template separate from assessment template |
| **Project Audit** | QA warnings | Must not treat missing rec/cost as errors on RAS |
| **Future client portal + auth** | Published views | Phase 9+; outstanding-issues workflow across reports |

---

## 4. Project type (decided — planning)

FREDAsoft should support **project type** at the project level:

| Type | Meaning |
|------|---------|
| **`assessment`** | Current consulting/inspection-style work (default) |
| **`ras`** | Texas RAS/TDLR-oriented work |

**Rules (planning):**

- **RAS is selected when the project is created or configured** — not inferred per facility or per report only.
- **Existing projects default to `assessment`** — no silent conversion.
- **`ras` projects are TAS 2012 only** — glossary/standard enforcement must not break assessment projects that use other sets (UFAS, etc.).
- Assessment and RAS projects may coexist in one deployment; UI and validation branch on project type.

---

## 5. RAS report structure (decided — planning)

### Multiple report instances per RAS project

- A single **RAS project** can contain **multiple independent RAS report instances** (e.g. Preliminary Plan Review, then Revised Plan Review, then Official Inspection).
- **Beta:** Project-level fields (`fldPlanReviewRas`, `fldInspectionRas`, `tdlrRegistered`, one operative date per work mode) are the **current/default work context**. They do **not** mean the project has only one Review or one Inspection.
- **Report records are scoped to one report instance** (long-term) — each instance has its own record set.
- **v1: no automatic carry-forward** of records from a prior report instance into a new one. Staff copy or re-enter as needed.
- **Future (bonus):** outstanding-issues dashboard / client response workflow that tracks items **across** report instances (not in v1).
- **Do not build the instance collection in this documentation task.** Authoritative Beta vs long-term split: **`docs/ARCHITECTURE_DESIGN.md`** (Beta RAS / Assessment data model).

### Implications

- Data model needs a **RAS report instance** entity (or equivalent) linking: division, report kind, dates, narrative/certification text, and child records.
- Web Report / PDF generation targets **one selected report instance** at a time.
- Project Audit may need instance-scoped or project-scoped modes later.

---

## 6. RAS divisions and report kinds (decided — planning)

RAS work splits into two **divisions**:

### Plan Review

| Report kind |
|-------------|
| Preliminary Plan Review |
| Revised Plan Review |
| Official Plan Review |

### Inspection

| Report kind |
|-------------|
| Special Inspection |
| Official Inspection |

### One template, configured per instance

All RAS report kinds can share **one RAS report template**, differentiated by configuration:

- Report **title / heading**
- **Division** (Plan Review vs Inspection)
- **Report kind** (from lists above)
- **Narrative / certification language** (instance- or kind-specific boilerplate)
- **Visible labels** (e.g. “Comment” vs legacy “Finding” in UI)

Exact legal wording for each kind remains subject to TDLR/sample verification.

### Review / Inspection work mode (✅ implemented in Data Entry)

A **Review | Inspection** selector (✅ IMPLEMENTED in Data Entry) chooses which RAS work product is being created. It does **not** change Project type (still TAS/RAS).

- **Review mode** → responsible professional = `projects.fldPlanReviewRas`
- **Inspection mode** → responsible professional = `projects.fldInspectionRas`

Missing Plan Review RAS is **legitimate** when OCG performs Inspection only. Require only the professional for the active work mode. Do **not** silently copy assignments.

**Beta model (✅ IMPLEMENTED in Data Entry, `feat/ras-work-mode-data-entry`):** **`docs/ARCHITECTURE_DESIGN.md`**. Data Entry **Review | Inspection** selector; sticky local state keyed by Project (default Inspection); not stored on the Project document. Records: `fldWorkProduct`. Sheet: `fldSheet` (Review only). Dates: `fldPlanReviewDate` / `fldInspectionDate` (not `fldPDDate` for RAS Inspection). RAS PDF cover and body are implemented; Web Report parity is not.

### Plan Review Sheet (✅ implemented in Data Entry)

Inspection findings commonly use **Location**. Plan Review findings may use **Location** plus optional **Sheet** (e.g. A2.1). Sheet does **not** replace Location. Inspection mode need not show Sheet unless later requirements justify it. Do **not** change ProjectData schema in this task.

---

## 7. RAS record and report fields (decided — planning)

✅ DECIDED (2026-08-29): RAS **Plan Review** and **Inspection** reports contain findings / applicable TAS requirements. They do **not** contain Recommendations, cost estimates, or the Financial section. Assessment reporting remains unchanged. RAS PDF body is ✅ IMPLEMENTED (`feat/ras-report-body`).

### Excluded from RAS reports (and ideally from RAS Data Entry)

RAS reports **do not include**:

- Recommendations
- Recommendation citations
- Financials
- Quantities
- Unit costs
- Total costs

Assessment projects retain all of the above unchanged.

### Included on RAS report rows / records

| Field / concept | Notes |
|-----------------|-------|
| **Category** | From glossary / RAS library |
| **Item** | From glossary / RAS library |
| **Location / area** | Required for both divisions; Inspection primary locator |
| **Sheet / detail #** | **Plan Review:** support alongside location/area. **One free-text field**, e.g. `5/A4.2; 1/A15.3; C2.11` |
| **Comment** | Report-visible text (see §8) |
| **TAS reference(s)** | Standards/citations on record |
| **Photos / drawing references** | Inspection: inspection photos. Review: existing image UI for plan excerpts / sheet screenshots / details. Not a work-product discriminator. |

### Division-specific UI (planning)

- **Plan Review:** show **Location / area** and **Sheet / detail #** (both meaningful).
- **Inspection:** **Location / area** primary; **Sheet** not shown initially.

Internal storage may reuse existing `projectData` fields where possible. TAS/RAS Data Entry **hides** Recommendation and cost/financial controls and does **not** require `recId`. New RAS rows must **not** auto-create Recommendation/cost content. Shared Glossary may still contain Recommendations for Assessment. RAS **reports** still omit Rec/Financial when rendering is implemented.

---

## 8. Finding vs Comment terminology (decided — planning)

| User-facing (RAS) | Internal / legacy |
|-------------------|-------------------|
| **Comment** | May still map to finding-style fields (`fldFindShort`, `fldFindLong`, etc.) |

**Planning rules:**

- **“Comment”** is the label on RAS reports and RAS Data Entry.
- **Short text** (`fldFindShort` or equivalent): library search, picker navigation, future table-style reports, internal use — **not** the primary line on RAS PDF in v1.
- **Long text** (`fldFindLong` or equivalent): **report-visible comment** for RAS v1.
- Do not require users to maintain duplicate short+long prose if only long is needed on the deliverable; short can remain a convenience field populated from library picks.

---

## 9. Glossary and library direction (decided — planning)

### RAS Plan Review library (`rasFindings`)

- **Do not** treat a straight clone of current assessment **findings** as the final authoritative RAS Plan Review library.
- **Preferred workflow:**
  1. Develop RAS comments in **spreadsheet batches** derived from TAS (start from **`templates/RAS_FINDINGS_TEMPLATE.xlsx`**)
  2. Review, edit, and vet internally
  3. **Import approved rows** into **`rasFindings`** (new collection or equivalent)

**Authoring workbook:** **`templates/RAS_FINDINGS_TEMPLATE.xlsx`** (layout: **`docs/RAS_FINDINGS_SPREADSHEET_TEMPLATE.md`**). **Import format spec:** **`docs/RAS_FINDINGS_IMPORT_FORMAT.md`**. **Phase 8:** offline dry-run CLI — **`scripts/maintenance/dry-run-ras-findings-import.ts`** (no Firestore writes; no credentials).
- Existing TAS findings may be **reference/seed** content only; RAS library becomes **independent first-class** content.

### Identity and metadata (planning)

- **No `fldSourceFindID` required** for RAS library rows.
- **New IDs** for `rasFindings` entries.
- Useful metadata fields (illustrative):
  - `fldFindingLibraryType` = `ras_plan_review` (and similar for other RAS library types if needed)
  - `fldNeedsReview`
  - Review status
  - Finding/comment type
  - Applicability tags
  - Compound finding flag
- **Preserve** item and standards/citation relationships.
- **Do not include** recommendation or cost fields on RAS findings.

### RAS Inspection library

- Existing **inspection/assessment TAS glossary** may be **reusable** for RAS Inspection comments (field-observed wording).
- **Separate curated Plan Review library** is required for drawing/plan wording (see §10).

### Snapshot integrity (unchanged principle)

Keep distinct:

1. **Active glossary / library** at edit time  
2. **Saved record snapshots** on `projectData`  
3. **Report output** from snapshots, not live master re-resolution  

RAS conversion must not reintroduce category/item/comment resolution bugs audited in assessment workflows.

### Import safety

- Library import must support **dry-run and review** before Firestore writes (**AGENTS.md** data safety).

---

## 10. Plan Review vs Inspection comment wording (decided — planning)

| Division | Comment style (examples) |
|----------|---------------------------|
| **Plan Review** | Planned/drawing conditions: “Plans show…”, “The drawings indicate…”, “Insufficient information is provided…” |
| **Inspection** | Observed field conditions: “The lavatory is located…”, “The door lacks…” |

- **Plan Review** → curated **`rasFindings`** / Plan Review library.
- **Inspection** → may leverage existing **TAS inspection/assessment** glossary patterns where wording fits observed conditions.

---

## 11. Report metadata and header fields

**Authoritative RAS report sourcing:** **`docs/ARCHITECTURE_DESIGN.md`** (Beta RAS / Assessment data model, 2026-08-28; Project metadata persistence on `feat/ras-beta-project-metadata`). That block supersedes earlier §11 rows that treated `fldTabsProjectNumber` / `fldTenantFunded` as long-term RAS sources, `fldInspector` as RAS Inspection RAS, or canonical names as registered wording.

### RAS vs Assessment sourcing (decided 2026-08-28)

Registered RAS facts live on **`projects.tdlrRegistered`** (TDLR as-recorded; Beta may be manual). Assessment facts live on FREDA Project / Facility / Inspector. Do not duplicate TABS # or Tenant Funded as independent FREDA operational copies.

| Concept | Assessment source | RAS source |
|---------|-------------------|------------|
| Project type | FREDA Project | FREDA Project |
| OCG Project # | `fldProjNumber` | `fldProjNumber` |
| TABS Project Number | N/A | `tdlrRegistered.tabsProjectNumber` |
| Tenant Funded | N/A | `tdlrRegistered.tenantFunded` |
| Project Name | `fldProjName` (FREDA-entered) | `fldProjName` (this **is** the TDLR registered Project Name) |
| Project Description / Scope | `fldProjDescription` (FREDA-authored) | `tdlrRegistered.scopeOfWork` (authoritative TABS Scope of Work; cover label **Project Description**). `fldProjDescription` may hold a synchronized copy — not independently edited, not the RAS report source. See **`docs/ARCHITECTURE_DESIGN.md`** Project Description vs TABS Scope of Work. |
| Type of Work | N/A | `tdlrRegistered.typeOfWork` (categorical; **not** Scope of Work) |
| Facility / location report identity | FREDA Facility | `tdlrRegistered.site` (internal property **site**; report meaning = registered TABS **Facility**) |
| Owner / addressee | Assessment-specific / current PDF behavior | `tdlrRegistered.owner` (required; not Client) |
| Registered Design Firm | N/A | `tdlrRegistered.designFirm` (not Client, not `fldDesigner`) |
| Responsible professional | `fldInspector` (Assessment Inspector) | Review mode → `fldPlanReviewRas`; Inspection mode → `fldInspectionRas` |
| Finding Location | available | available |
| Finding Sheet | not currently needed | Review mode only, optional |
| Report date | `fldPDDate` | `fldPlanReviewDate` or `fldInspectionDate` (Inspection Date = Inspection Report Date; **not** `fldPDDate`) |
| Standards | Assessment profile | RAS template: 2012 TAS |
| Architect/DP internal project # | `fldExternalRef` if used | `fldExternalRef` |

Template titles (`Plan Review Report`, `Inspection Report`) and the standards line (`2012 Texas Accessibility Standards`) remain RAS report-profile constants. **✅ IMPLEMENTED** cover (`feat/ras-report-cover`) and body (`feat/ras-report-body`). Authoritative investigation: **`docs/ARCHITECTURE_DESIGN.md`** (Beta RAS report-profile architecture).

**Production (feat/ras-beta-project-metadata + feat/professional-hydration + feat/ras-work-mode-data-entry + feat/ras-scope-description-sync):** New/Edit Project persists `tdlrRegistered` for TAS/RAS. Sole Project Name is `fldProjName`. TAS/RAS save synchronizes `fldProjDescription` from `tdlrRegistered.scopeOfWork` (including blank); Assessment `fldProjDescription` remains independently authored. Current-workflow professional hydrates from `fldInspector` (Assessment), `fldPlanReviewRas` (TAS/RAS Review), or `fldInspectionRas` (TAS/RAS Inspection). Session Active Inspector is not an assignment. RAS **cover** and **body** rendering are implemented (`feat/ras-report-cover`, `feat/ras-report-body`; cover Project Description reads Scope directly). Web Report parity is not. Flat `fldTabsProjectNumber` / `fldTenantFunded` are no longer written.

Do **not** treat FREDA normalized stakeholder names as substitutes for official registered report text.

### RAS dates (Beta)

One operative date per current work product. Assessment: `fldPDDate`. Plan Review: `fldPlanReviewDate`. Inspection: `fldInspectionDate` (Inspection Date = Inspection Report Date). Do **not** use `fldPDDate` as the RAS Inspection date. Long-term instances own additional dates. Project-level RAS dates are implemented on New/Edit Project.

### Other header notes

| Field | Note |
|-------|------|
| Registered project / Facility / owner / design firm | `tdlrRegistered` (internal `site` = registered TABS Facility/location; name is `fldProjName`) |
| OCG # / DP job # | FREDA Project |
| Plan Review RAS / Inspection RAS | `fldPlanReviewRas` / `fldInspectionRas` — one Project assignment per role; Inspector `fldRasNumber` for the credential |

---

## 12. Reporting considerations

### Assessment baseline (unchanged today)

Assessment reports retain: Narrative, Financial, Documentation (finding + recommendation), Referenced Standards, Photo Addendum (Web Report and PDF paths as implemented).

### RAS template (planning)

Authoritative report-profile decisions live in **`docs/ARCHITECTURE_DESIGN.md`** (Beta RAS report-profile architecture + Project Description vs TABS Scope of Work). Summary:

| Topic | Direction |
|-------|-----------|
| **Template count** | Shared pagination/print engine + explicit report profile (Plan Review / Inspection) |
| **Cover** | Mirror existing OCG RAS cover blocks (Header, hero, OCG INFORMATION, PROJECT INFORMATION, OWNER INFORMATION). Project Description on cover = TABS `tdlrRegistered.scopeOfWork`. Type of Work is a separate OCG INFORMATION field. Dates: **Plan Review Date:** / **Inspection Date:** (no separate Report Date). Registered Facility uses `tdlrRegistered.site` (do not treat “site” as a separate entity). Buildings/features inside a registered Facility are distinguished by Location. No FREDA stakeholder dump. |
| **Narrative** | **Included** on Assessment, RAS Plan Review, and RAS Inspection (operational FREDA narrative — not TABS Scope). Inspection uses a user-supplied **display-only** template fallback when no authored facility-specific or project `fldNarrative` text exists; authored wins; not persisted; not legal guidance. Plan Review / Assessment keep `'No project narrative provided.'` |
| **Section letters** | First included section after cover = **A**, then B, C… regardless of section type. Do not hard-code Findings unlettered / Standards=A / Images=B. |
| **Sections** | Cover → Narrative → Findings (no rec/cost; Review includes Sheet) → Referenced Standards → Photo/Image Addendum. **No** Financial. |
| **Web Report** | Later adapter slice; no print |
| **PDF** | Shared engine; Slice B cover + Slice C body implemented. RAS Print/Save as PDF filename stem: **`TABS# - Project Name - Plan Review`** or **`TABS# - Project Name - Inspection`**. Assessment remains **`Project Name - Facility Name`**. |

✅ DECIDED (2026-08-29): RAS Print/Save as PDF filename stem is **`TABS# - Project Name - Plan Review`** or **`TABS# - Project Name - Inspection`**. TABS # = `tdlrRegistered.tabsProjectNumber`; Project Name = `fldProjName`. Missing parts are omitted (no doubled separators); if both missing, **`Plan Review Report`** / **`Inspection Report`**. Assessment remains **`Project Name - Facility Name`**. Browser adds `.pdf`.

✅ DECIDED (2026-08-29): RAS Inspection Narrative uses a user-supplied **display-only** template fallback when no authored facility-specific or project `fldNarrative` text exists. Authored Narrative always wins. The fallback is **not** persisted automatically and is **not** legal guidance. Plan Review and Assessment keep the existing empty-narrative fallback. TABS Scope remains cover Project Description only.

### Requirements still to investigate

- Exact page order, fonts, signature blocks, mandatory boilerplate per report kind
- Submission/export format (PDF only vs portal — TBD)

---

## 13. Workflow considerations (updated)

```mermaid
flowchart LR
  A[Create project] --> B{Project type}
  B -->|assessment| C[Assessment Data Entry]
  B -->|ras| D[Create RAS report instance]
  D --> E[RAS Data Entry - comments only]
  E --> F[Project Audit - RAS rules]
  F --> G[Generate RAS report]
  G --> H[Staff / client review]
  H --> I[Export / archive]
  I -.-> J[Future: outstanding issues across reports]
```

| Step | Assessment (today) | RAS (planned) |
|------|----------------------|---------------|
| Create project | Default type | Select `ras`; TAS 2012 locked |
| Report scope | Facility-level report | Per **report instance** |
| Capture records | Finding + rec + costs | Comment + TAS + location/sheet; no rec/cost |
| Audit | Rec/cost warnings OK | Missing rec/cost **not** errors |
| Generate report | Assessment PDF/Web | RAS template + instance config |
| Cross-report tracking | N/A in v1 | Future dashboard (Phase 9) |

---

## 14. Risks, gotchas, and open questions

### Implementation gotchas (planning)

| Risk | Mitigation direction |
|------|----------------------|
| Data Entry assumes **finding + recommendation** pairing | RAS mode hides rec fields; validation branches on project/report type |
| Report and audit logic assumes **recommendation/cost** fields | RAS audit rule pack; do not flag missing rec/cost as errors |
| Plan Review needs **location/area and sheet/detail** | Both on form; sheet as single free-text field |
| **Report instances** need isolated record scopes | Foreign key / scope filter on all RAS queries |
| **TAS 2012-only** enforcement on `ras` projects | Guardrails on glossary picker; never block assessment projects |
| **Library import** | Dry-run, batch review, no accidental production overwrite |
| Cloning assessment findings into RAS library | Use spreadsheet vetting → `rasFindings`; avoid authoritative clone |

### Regulatory and product questions (still open)

- Exact TDLR/RAS deliverable format and legally required fields
- Required forms or submission APIs (if any)
- Immutable audit log after submission?
- Corrections / re-inspection: new report instance only in v1 — workflow for amendments TBD
- Published snapshot vs live data for client portal

---

## 15. Proposed phased approach (updated)

Sequential phases; scope and timing require Archie/user approval each phase. **None of this is implemented** by this document alone.

| Phase | Focus | Outcomes |
|-------|--------|----------|
| **1** | Finalize RAS **data/report architecture** document | Project type, report instance model, field map, header metadata binding |
| **2** | Define RAS findings **spreadsheet / import format** | Column spec, validation rules, dry-run contract — **`docs/RAS_FINDINGS_IMPORT_FORMAT.md`** |
| **3** | Build / import curated **`rasFindings`** library in batches | Vetted Plan Review comments in Firestore |
| **4** | Add project-level type **`assessment` \| `ras`** | Default assessment; RAS → TAS 2012 only |
| **5** | Add **RAS report instance** model | Division, report kind, scoped records |
| **6** | Add **RAS Data Entry** mode | No recommendations/costs; Plan Review sheet/detail; Inspection location-first |
| **7** | Add **RAS report template** (PDF + Web) | Shared template; per-instance title/narrative/labels |
| **8** | Add **RAS-specific audit** checks | RAS blockers without rec/cost false positives |
| **9** | Client portal / **outstanding issues** across reports | Later; not v1 |

Each implementation phase: plan → Archie review → branch → lint/build → manual test → **✅ DECIDED** in `docs/ARCHITECTURE_DESIGN.md` when durable.

---

## 16. Requirements still to investigate (TDLR / operations)

Research backlog — confirm against official sources and sample deliverables:

- TDLR registration / TABS identifiers and required formatting
- Submission channels (portal, API, email/PDF only)
- Record retention and immutability after filing
- Mandatory certification/signature language per report kind
- Photo and drawing reference minimums

---

## 17. Non-goals for now

- **No application code** changes from this document alone  
- **No Firestore schema or rules changes** until architecture + migration approved  
- **No claim of TDLR legal compliance** until requirements verified  
- **No changes to assessment PDF/Report Preview** until RAS template is scoped separately  
- **No automatic carry-forward** of RAS records between report instances in v1  
- **No `rasFindings` production import** without dry-run and approval  
- **No package.json / dependency changes** for docs-only updates  

---

## Related documentation

- **`templates/RAS_FINDINGS_TEMPLATE.xlsx`** — blank RAS Plan Review findings authoring workbook (v1)
- **`docs/RAS_FINDINGS_IMPORT_FORMAT.md`** — spreadsheet columns, target **`rasFindings`** shape, import safety, dry-run report (Phase 2; planning only)
- **`docs/RAS_FINDINGS_SPREADSHEET_TEMPLATE.md`** — spreadsheet layout spec for the workbook
- **`docs/RAS_FINDING_AUTHORING_STYLE.md`** — Plan Review library finding prose (Batch 1+ conventions)
- **`docs/FREDASOFT_PROJECT_APP_DISCOVERY.md`** — Lovable Project prototype discovery (metadata/stakeholder workflows; not inspection Data Entry)
- **`docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md`** — D5 stakeholder model (Owner/Design/RAS parties; TDLR vs canonical; RAS addressee = TDLR Owner)
- **`docs/FREDASOFT_PROJECT_TDLR_EXTRACTION_PIPELINE.md`** — D6 TDLR/TABS extraction pipeline sketch (source snapshots vs canonical; milestone/report-instance hints)
- **`docs/reference/EAB205N_PROJECT_REGISTRATION_FIELD_INDEX.md`** — EAB205N registration field index (pre-D1; §11 header field sources)
- **`docs/reference/TDLR_OPEN_RECORDS_EXPORT_FIELD_INDEX.md`** — TDLR open-records export column headers (pre-D1; bulk/legacy field-name layer)
- `docs/ARCHITECTURE_DESIGN.md` — durable ✅ DECIDED blocks (Beta RAS / Assessment data model; dual-track; cover identity)
- `AGENTS.md` — protected areas, behavior disclosure, Firestore data safety

When implementation starts, add concise **✅ DECIDED** entries to `ARCHITECTURE_DESIGN.md` and keep this file as the full planning context.
