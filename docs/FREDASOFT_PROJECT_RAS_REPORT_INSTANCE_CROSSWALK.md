# FREDAsoft RAS Report Instance Crosswalk

**Status:** Documentation-only conceptual crosswalk (D3). **Not implemented.**  
**Last updated:** 2026-06-05  
**Branch context:** `d3-ras-report-instance-crosswalk`  
**Audience:** Product owner (Kenneth), architecture review (Archie), D4/D6/D7 implementation planning

> **Disclaimer:** This document clarifies how **TDLR/TABS registration milestones, statuses, and RAS-related fields** relate to **FREDAsoft RAS report instances** and related operational concepts. It does **not** specify Firestore collections, security rules, scrapers, UI, correspondence generation, or legal compliance. It does **not** collapse TDLR/TABS source data into FREDAsoft canonical data.

---

## Purpose

D3 answers: *When TDLR/TABS shows a status or milestone, what might that mean for FREDAsoft RAS work—and what must **not** be assumed?*

This is a **D3 conceptual crosswalk**, not implementation or schema. It builds on **`docs/CONVERT_TO_RAS.md`** (RAS project type and report instance planning), **D1** field mapping, **D2** reviewer workflow, **D4** schema sketch, **D5** stakeholder model, and **D6** extraction pipeline—so later work can distinguish:

- TDLR project registration / status **source** data  
- FREDAsoft **Project** / **Facility** operational records  
- FREDAsoft **RAS report instances** (authored deliverables)  
- **RAS Firm** party vs **assigned RAS** professional vs **reviewer/inspector** user roles  

**Outputs of D3:** terminology, candidate mappings, recommended product posture, and open questions for D4/D6/D7/D8—not final field names or automation rules.

---

## Scope and Non-Scope

### In scope

- Map TDLR/TABS milestone/status concepts to **possible** FREDAsoft RAS report instance concepts  
- Clarify terminology across source track, operational track, and deliverable track  
- Identify open questions before implementation  
- Relate D3 concepts to **D2** review screens and **D4** draft collection areas  

### Out of scope

| Topic | Note |
|-------|------|
| **Firestore schema** | Deferred to **D4** |
| **Scraper / import code** | Deferred to **D6** |
| **UI routes / components** | Deferred to implementation |
| **Correspondence letter generation** | Deferred to **D7** |
| **Legal interpretation** | Official TDLR sources must be verified separately |
| **Automatic report creation from TDLR status** | **Not assumed** — see Recommended Product Posture |

---

## Core Distinctions

| Concept | What it is | What it is not |
|---------|------------|----------------|
| **TDLR registration record** | Legal/as-recorded project + party + milestone snapshot from TDLR/TABS | A FREDAsoft **report** or **report instance** |
| **TDLR Current Status** | Point-in-time workflow label on TDLR source track (e.g. search enum `3001`–`3009`, Details **Current Status**, export **`Current Status`**) | A FREDAsoft **workflow state** by itself; not canonical Project status without review |
| **TDLR milestone / status rows** | Source evidence (Project Status Updates table, export dates, Manage Project labels) | Operational truth; not auto-promoted to FREDAsoft deliverables |
| **FREDAsoft RAS report instance** | Authored deliverable/work product under a **`ras`** Project: division, report kind, dates, narrative, child **projectData** records, PDF/Web output target | A mirror of TDLR status; created by staff workflow, not by scrape alone |
| **RAS Firm (TDLR party)** | As-recorded **RAS / RAS Firm** on registration (`RASName`, `RAS#`, Details RAS block) | Automatically the **assigned FREDAsoft RAS user** or inspector |
| **Plan Review By / Inspection By** | TABS Manage Project display labels (`lblProjectPlanReviewBy`, `lblProjectInspectionBy`) — may name a person, firm, or TDLR-assigned professional | Automatically a FREDAsoft Auth user, canonical stakeholder, or report instance owner without explicit link |

**Architecture rule (unchanged):** TDLR/TABS source data stays on the **source track**. FREDAsoft may **suggest** candidate report-instance hints, links, and draft dates; **staff reviewer** decides whether any operational or deliverable record is created (**D2**, **D6**).

---

## Source Concepts Reviewed

| Source | D3 use |
|--------|--------|
| **`docs/reference/EAB205N_PROJECT_REGISTRATION_FIELD_INDEX.md`** | Registration-time fields only; **no** post-registration status/milestone fields on form page 3 |
| **`docs/reference/TDLR_TABS_FORM_FIELD_DISCOVERY.md`** | **Current Status**, Project Status Updates (Registration / Plan Review / Inspection), Plan Review By / Inspection By, Manage menus, status enum `3001`/`3007`/`3008`/`3009` |
| **`docs/reference/TDLR_OPEN_RECORDS_EXPORT_FIELD_INDEX.md`** | **`Current Status`**, **`ProjectCreatedOn`** — bulk/status layer; may be stale vs live TABS |
| **`docs/CONVERT_TO_RAS.md`** | RAS **project type**; **Plan Review** vs **Inspection** divisions; report kinds (Preliminary / Revised / Official Plan Review; Special / Official Inspection); multiple instances per project |
| **`docs/FREDASOFT_PROJECT_FIELD_LEVEL_MAPPING.md`** (D1) | Post-registration status/milestone = **snapshot**; Plan Review By / Inspection By → assigned professional (**defer D3**) |
| **`docs/FREDASOFT_PROJECT_TDLR_REVIEW_WORKFLOW.md`** (D2) | Where status/milestones appear in review UI; defer/reject; no auto-merge |
| **`docs/FREDASOFT_PROJECT_TDLR_SCHEMA_SKETCH.md`** (D4) | Draft `milestoneRows[]`, party snapshots, draft report hints—not finalized |
| **`docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md`** (D5) | RAS Firm party vs **assigned RAS** vs Auth user |
| **`docs/FREDASOFT_PROJECT_TDLR_EXTRACTION_PIPELINE.md`** (D6) | Milestone snapshot families; proof-of-submission/inspection metadata; **D7** correspondence separate from inspection PDF |

**Source confirmation note:** Additional TABS statuses, cancellation/withdrawal labels, variance/substantial-compliance artifacts, and exact enum-to-label mapping for all lifecycle states are **not fully indexed** in current captures—rows below mark **open / needs source confirmation** where labels are uncertain.

---

## Candidate RAS Report Instance Types

**Default posture:** **No** report instance is **auto-created** from TDLR status alone. TDLR source data may **suggest** candidate report instances or milestone hints for **staff review**.

| RAS Report Instance Concept | Possible TDLR/TABS Source Signal | FREDAsoft Meaning | Auto-created? | Reviewer Action | Notes |
|----------------------------|----------------------------------|-------------------|---------------|-----------------|-------|
| **Plan Review** (Preliminary / Revised / Official) | Project Status Updates **Plan Review** row; Manage **Plan Review/Revisions** menu; status **`3009` Review Complete** (partial signal) | **`ras`** Project report instance — **Plan Review** division; kind per **`CONVERT_TO_RAS.md`** §6 | **No** | Suggest draft instance; staff creates/selects kind and dates | TDLR row does not distinguish Preliminary vs Revised vs Official—**open** |
| **Inspection** (Special / Official) | Project Status Updates **Inspection** row; Manage **Inspection** menu; status **`3001` Inspection Complete** (partial signal) | **`ras`** Project report instance — **Inspection** division; kind per CONVERT_TO_RAS | **No** | Suggest draft instance; staff selects kind | Same TDLR label may cover multiple FREDAsoft kinds |
| **Inspection Response** | Manage **Corrective Modifications**; milestone **Status** text on PSU rows | Possible follow-on inspection-related work product or correspondence track | **No** | **Defer** — map to report instance vs D7 correspondence **open** | Not a CONVERT_TO_RAS report kind today |
| **Proof of Submission** | EAB242N PDF ref; PSU **Submitted On** on plan-review-related rows; Manage Documents metadata | **Correspondence / filing artifact** or milestone snapshot—not necessarily a RAS comment report | **No** | **Snapshot**; optional link to plan review instance date | **D7** boundary |
| **Proof of Inspection** | EAB244N PDF ref; inspection PSU row **Submitted On** | Same—filing/milestone metadata vs inspection **report instance** | **No** | **Snapshot**; optional draft date on inspection instance | **D7** boundary |
| **Notice of Substantial Compliance** | Manage **Request for Closure**; status **`3007` Project Closed** (weak signal) | Possible closure/substantial-compliance **correspondence** artifact | **No** | **Defer** — needs source confirmation | Exact TABS label **open** |
| **Variance-related artifact** | Not indexed in current TABS captures | Possible special registration / alternate path artifact | **No** | **Defer** | See EAB205N alternate-form routing; **needs source confirmation** |
| **Special registration artifact** | TABS flags (`lblProjectStateLease`, `lblSpecialProjectCategory`, `lblIsRoadwayConstruction`) | Alternate registration path snapshot | **No** | **Snapshot** only unless staff links workflow | Not a standard RAS report instance |
| **General project correspondence** | TABS Notifications / Letters menus (`POST …/Notification/Product`, `…/Letters/Product`) | **D7** correspondence log—not RAS Web Report / PDF deliverable | **No** | **Snapshot** metadata; D7 templates | Distinct from inspection/plan review **report instances** |
| **Registration / source snapshot only** | **`3008` Project Registered**; Registration PSU row; **`ProjectCreatedOn`** (export); registration date filters | TDLR **milestone snapshot** on source track only | **No** | **Snapshot**; no report instance implied | Registration ≠ plan review deliverable |

---

## TDLR Status / Milestone Crosswalk

Labels below combine indexed sources. Where TABS may use additional values not yet captured, status is **open / needs source confirmation**.

| TDLR/TABS Status or Milestone | Source Layer | Possible FREDAsoft Interpretation | Report Instance Implication | Reviewer Decision Needed | Notes |
|------------------------------|--------------|-----------------------------------|----------------------------|--------------------------|-------|
| **Project created / `ProjectCreatedOn`** | Export **`ProjectCreatedOn`**; TABS registration date filters | TDLR **registration/system timestamp snapshot** | **None** by default — not FREDAsoft Project `createdAt` | **Snapshot**; **Defer** semantic binding (D1 open Q) | Registration date vs extraction timestamp TBD |
| **Current Status** (aggregate) | TABS Details **`lblProjectStatus`**; export **`Current Status`**; search enum | TDLR **workflow snapshot** on source track | May **weakly suggest** lifecycle phase—not a report kind | **Snapshot**; optional draft Project metadata | Export may be stale vs live TABS |
| **`3008` Project Registered** | TABS search filter enum; inferred from registration milestone | Registration complete on TDLR track | **No** auto plan review / inspection instance | **Snapshot** | Enum ↔ display text map TBD |
| **`3009` Review Complete** | TABS search filter enum | Plan review phase complete **on TDLR track** | May **suggest** a plan review report instance existed or is due—does not create one | **Snapshot** + optional **draft instance hint** | Does not identify Preliminary vs Official |
| **`3001` Inspection Complete** | TABS search filter enum | Inspection phase complete **on TDLR track** | May **suggest** inspection report instance | **Snapshot** + optional **draft instance hint** | Not same as FREDAsoft “report published” |
| **`3007` Project Closed** | TABS search filter enum | Project closed on TDLR track | Possible closure/substantial-compliance context | **Snapshot**; link to D7 **open** | |
| **Registration submitted/created** | PSU **Registration** row; Manage registration timeline | First milestone on source timeline | **Registration snapshot only** | **Snapshot** | |
| **Plan review milestone** | PSU **Plan Review** row (Report Date, Submitted On, Status) | TDLR plan-review **event snapshot** | **Candidate hint** for Plan Review division instance(s) | Staff decides if FREDAsoft instance exists / which **kind** | Multiple FREDAsoft kinds per one TDLR row possible |
| **Inspection requested** | Manage **Inspection** menu entry; PSU **Inspection** row (partial) | TDLR inspection workflow event | **Candidate hint** for Inspection division instance | **Defer** if row absent or incomplete | Exact “requested” label **needs source confirmation** |
| **Inspection performed** | PSU **Inspection** row Report Date; **`3001`** status | Inspection activity on TDLR track | **Candidate hint** for inspection instance dates | Optional **draft date only** on instance | |
| **Inspection response** | Manage **Corrective Modifications** | Post-inspection TDLR workflow step | **Unclear** — report instance vs correspondence | **Defer** | **Open** |
| **Proof of submission** | EAB242N; document metadata; PSU **Submitted On** | Filing artifact snapshot | Link metadata to plan review milestone—not auto report body | **Snapshot**; optional link to instance | **D7** |
| **Proof of inspection** | EAB244N; document metadata | Filing artifact snapshot | Link metadata to inspection milestone | **Snapshot**; optional link to instance | **D7** |
| **Substantial compliance / closed** | **Request for Closure** menu; **`3007`** | Closure-related TDLR state | Correspondence/substantial-compliance artifact **candidate** | **Defer** | Wording **needs source confirmation** |
| **Cancelled / withdrawn / expired / unknown** | Not indexed in current TABS captures | Anticipated lifecycle states | **Unknown** | **Snapshot** if encountered; **Defer** mapping | **Open** — confirm against live TABS / policy docs |

---

## RAS / Reviewer / Inspector Identity Crosswalk

**Emphasis:** Source party snapshots and display labels remain **as-recorded**. Linking a TDLR RAS name or “Plan Review By” text to a FREDAsoft user, stakeholder, or report instance requires **explicit staff review** (**D2** Screen 4). **RAS Firm** and **assigned RAS individual** must **not** collapse automatically (**D5**).

| Source Concept | Source Field(s) | Possible FREDAsoft Target | Link Type | Reviewer Action | Notes |
|----------------|-----------------|---------------------------|-----------|-----------------|-------|
| **RAS Firm** | Details **RAS Name**, **RAS #**, **RAS Address**; export **`RASName`**, **`RAS#`**, **`RASAddress`**; EAB205N §1 | **RAS Firm** project party → canonical **stakeholder** | Approved party link | **Match** / **Create** / **Defer** | Registration RAS ≠ assigned professional by default |
| **RAS Name** (display) | `lblProjectRAS`; party snapshot `asRecorded.name` | Alias text + stakeholder candidate | Alias / party link | **Match** or **alias** | May be firm or individual spelling |
| **RAS License / registration number** | **`RAS#`**; `filter-ras-number`; RAS modal `LicenseNumber` | Match key for canonical stakeholder; snapshot only | Strong **candidate** signal | **Match** by license #; **Snapshot** always | Do not auto-merge |
| **Plan Review By** | `lblProjectPlanReviewBy` (Manage Project) | **Assigned RAS** / professional **candidate**; or canonical **contact** | Assignment or party link | **Defer** — user vs stakeholder vs contact (**D3 open**) | Display text only on TABS; not on export |
| **Inspection By** | `lblProjectInspectionBy` | Same as Plan Review By for inspection division | Assignment link | **Defer** | |
| **Assigned FREDAsoft RAS user** | *(FREDAsoft operational — not on TDLR form)* | Auth **user** + **assignment** to project/report instance | Explicit assignment record | Staff assigns in FREDAsoft; optional link to TDLR hint | **D5** §3.8 |
| **Staff Reviewer** | *(D2 workflow actor)* | **`tdlrReviewSessions`** submitter; not TDLR party | Audit / workflow | N/A for TDLR ingest | Distinct from RAS professional |
| **Inspector user** | Operational role on inspection instance | Same as assigned RAS **or** separate inspector Auth user | Assignment | Staff decision | **Open** whether always same as assigned RAS |
| **Contact person** | Owner/Design/RAS modal emails/phones; **Person Filing Form** | **Contact person** under stakeholder | Contact link | **Match** / **Create** | Registrant ≠ Owner by default |

---

## Relationship to D2 Review Screens

| D2 screen | D3 concepts surfaced |
|-----------|---------------------|
| **Screen 1 — TDLR Lookup / Intake** | Extraction run may fetch status/milestone-bearing pages (public Details vs Manage Project); export **`Current Status`** / **`ProjectCreatedOn`** may attach as separate snapshot layer |
| **Screen 2 — Source Snapshot Summary** | **Status / milestone block**: Current Status, Project Status Updates rows, Plan Review By / Inspection By, document metadata refs (CAD, proof forms); all **read-only** source evidence |
| **Screen 3 — Project / Facility Match Review** | Links TDLR project snapshot to FREDAsoft **`ras`** **Project** (type from CONVERT_TO_RAS)—does **not** create report instances |
| **Screen 4 — Stakeholder / Party Match Review** | **RAS Firm** row; optional split of firm vs individual; Plan Review By / Inspection By may appear as **contact/assignment hints**—reviewer links explicitly |
| **Screen 5 — Field-Level Differences** | Status text, milestone dates, assigned-professional labels may differ across export vs live TABS; optional **draft** report-instance date hints—unchecked by default |
| **Screen 6 — Approval Summary** | Lists approved links/aliases/drafts only; **no** automatic RAS report instance creation unless staff explicitly included a draft deliverable action (future—**not assumed in D3**) |

---

## Relationship to D4 Schema Sketch

Conceptual mapping only—**collection names not finalized** (**D4**).

| D4 draft area (conceptual) | D3 content stored or referenced |
|----------------------------|----------------------------------|
| **`tdlrProjectSnapshots`** — `milestoneRows[]` | PSU-style rows: Description, Report Date, Submitted On, Status; Current Status; export status dates |
| **`tdlrProjectSnapshots`** — document metadata | CAD, LLO, proof-of-submission/inspection refs |
| **`tdlrPartySnapshots`** — RAS / RAS Firm | RAS name, #, address as-recorded |
| **`tdlrParsedFields`** | Normalized status enum codes, parsed milestone dates, license match keys |
| **`tdlrCandidateMatches`** | Suggested links: RAS Firm → stakeholder; Plan Review By → assigned RAS; **optional** report-instance kind hint (assistive) |
| **`tdlrApprovedLinks`** | Approved project-party and assignment links after review |
| **`tdlrDraftUpdates`** | Proposed report-instance dates/kinds as **draft hints**<br>—not live instances |
| **`tdlrAuditEvents`** | Reviewer decisions on milestone mapping and RAS identity links |

FREDAsoft **RAS report instance** documents (operational deliverable track) are **not** defined in D4 TDLR sketch—they belong on the canonical/`ras` Project side per **`CONVERT_TO_RAS.md`**, linked from approved hints only after staff action.

---

## Recommended Product Posture

| # | Posture |
|---|---------|
| **PP-1** | **Show TDLR milestones as source evidence** on Screen 2 and in snapshot history—always with source layer and capture timestamp. |
| **PP-2** | Use milestones to **suggest**, not **create**, FREDAsoft RAS report instances. |
| **PP-3** | **Staff reviewer** (or future explicit staff workflow) decides whether a report instance exists, which **division/kind** applies, and which dates bind. |
| **PP-4** | Keep **correspondence artifacts** (proof forms, TABS letters/notifications) distinct from **RAS plan review/inspection report deliverables** (**D7**). |
| **PP-5** | **Retain source snapshot** even when no FREDAsoft report instance is created—TDLR track is complete without a deliverable mirror. |
| **PP-6** | **No auto-create** of report instances from TDLR status alone; **current assumption: no** auto-draft report from status (**D2** carry-forward). |
| **PP-7** | Prefill of report dates from TDLR, if ever offered, is **draft suggestion only** on **`tdlrDraftUpdates`**—never silent write to report instance. |

---

## Open Questions for D4 / D6 / D7 / D8

### Status and milestones

1. **Exact TABS status labels and full enum list** beyond `3001`, `3007`, `3008`, `3009` — confirm from live TABS and policy docs.  
2. Do PSU **Plan Review** rows map 1:1 to a single CONVERT_TO_RAS **report kind**, or can one row represent multiple FREDAsoft instances?  
3. **Cancelled / withdrawn / expired** — do these appear as statuses or milestone rows? (**needs source confirmation**)  
4. Should **`ProjectCreatedOn`** (export) ever prefill FREDAsoft Project schedule metadata as **draft only**?

### RAS identity and assignment

5. Should **Plan Review By** / **Inspection By** link to **Auth user**, **canonical stakeholder**, **contact person**, or a new **assignment** entity?  
6. Split **RAS Firm** canonical record vs **assigned RAS individual** on the same review row—or always separate links?  
7. Can Plan Review By name differ from registered **RAS Firm** on the same project—and how should FREDAsoft display both?

### Report instance model (D4 / CONVERT_TO_RAS)

8. Do **report instances** live under **`projects/{id}`** subcollection vs top-level collection?  
9. How do **correspondence artifacts** (**D7**) reference—or not reference—report instance ids?  
10. Should proof-of-submission/inspection metadata appear on report instance, Project, or correspondence log only?

### Workflow and portal (D6 / D8)

11. Should any TDLR status **prefill report dates** as draft on instance creation UI? (**current assumption: optional draft hint only, never auto**)  
12. Can **portal stakeholders** see TDLR milestone-derived **progress** without seeing raw source snapshots?  
13. Should re-scrape diff highlight milestone changes that **suggest** new report instance review?

### Automation (product)

14. Can any TDLR status ever **auto-create a draft report instance**? **Current assumption: no.**

---

## Related Documentation

| Document | Relevance |
|----------|-----------|
| `docs/FREDASOFT_PROJECT_FIELD_LEVEL_MAPPING.md` | D1 — status/milestone field mapping and reviewer actions |
| `docs/FREDASOFT_PROJECT_TDLR_REVIEW_WORKFLOW.md` | D2 — review screens and outcomes |
| `docs/FREDASOFT_PROJECT_TDLR_SCHEMA_SKETCH.md` | D4 — milestone and party snapshot sketch |
| `docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md` | D5 — RAS Firm vs assigned RAS vs user |
| `docs/FREDASOFT_PROJECT_TDLR_EXTRACTION_PIPELINE.md` | D6 — milestone snapshot stages |
| `docs/FREDASOFT_PROJECT_APP_DISCOVERY.md` | Prototype milestone/status field discovery |
| `docs/CONVERT_TO_RAS.md` | RAS project type, divisions, report kinds |
| `docs/reference/EAB205N_PROJECT_REGISTRATION_FIELD_INDEX.md` | Registration-only fields |
| `docs/reference/TDLR_TABS_FORM_FIELD_DISCOVERY.md` | TABS status/PSU/Plan Review By fields |
| `docs/reference/TDLR_OPEN_RECORDS_EXPORT_FIELD_INDEX.md` | Export status columns |
| `docs/reference/TDLR_RAS_TABS_SOURCE_INDEX.md` | Source catalog (EAB242N/EAB244N proof forms) |
| `docs/ARCHITECTURE_DESIGN.md` | Durable architecture decisions |

---

## Non-goals (D3)

- Implemented Firestore schema for report instances or TDLR snapshots  
- Security rules, migrations, scrapers, or importers  
- UI wireframes beyond D2 references  
- Correspondence template or letter generation (**D7**)  
- Legal/compliance assertions about TDLR workflow timing  
- Automatic creation of RAS report instances from TDLR status  
