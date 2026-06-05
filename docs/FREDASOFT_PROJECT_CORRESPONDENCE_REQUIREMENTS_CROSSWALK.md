# FREDAsoft Correspondence Requirements Crosswalk

**Status:** Documentation-only conceptual crosswalk (D7). **Not implemented.**  
**Last updated:** 2026-06-05  
**Branch context:** `d7-correspondence-requirements-crosswalk`  
**Audience:** Product owner (Kenneth), architecture review (Archie), D4/D6/D8/implementation planning

> **Disclaimer:** This document clarifies **correspondence artifact families**, **recipient concepts**, and **boundaries vs RAS report instances** for FREDAsoft RAS/TDLR workflows. It does **not** specify Firestore collections, security rules, letter templates, PDF rendering, e-signature, scrapers, UI, or legal compliance. It does **not** collapse TDLR/TABS source data into FREDAsoft canonical data or operational correspondence records.

---

## Purpose

D7 answers: *What correspondence-related artifacts appear in TDLR/RAS workflows, how do they differ from RAS report deliverables, and what must **not** be assumed about automatic creation or recipient binding?*

This is a **D7 conceptual crosswalk**, not implementation, template design, schema, or legal advice. It builds on **D3** (report instance distinction), **D2** (reviewer workflow), **D4** (source-track sketch), **D5** (stakeholder/recipient model), **D6** (extraction pipeline), and **D1** (field mapping)—so later work can distinguish:

- TDLR/TABS registration, milestone, and document **source** data  
- FREDAsoft **RAS report instances** (authored plan review / inspection deliverables)  
- **Correspondence artifacts** (notices, proofs, requests, responses, letters, transmittals, filing-related documents)  
- **Reviewer-confirmed** recipients and party links  

**Outputs of D7:** terminology, candidate correspondence types, recipient crosswalk, recommended product posture, and open questions for D4/D6/D8/implementation—not final template merge fields, collection names, or automation rules.

---

## Scope and Non-Scope

### In scope

- Identify **correspondence artifact families** relevant to TDLR/RAS workflows  
- Distinguish correspondence artifacts from **RAS report instances** (**D3**)  
- Identify likely **source signals** (forms, TABS menus, document metadata) and **reviewer actions**  
- Prepare future template, schema, and UI work without designing them here  

### Out of scope

| Topic | Note |
|-------|------|
| **Firestore schema** | Deferred to **D4** and later implementation phases |
| **Template generation** | Future phase—merge fields not finalized here |
| **Letter rendering / PDF pipeline** | Separate from inspection **Report Preview** / Web Report |
| **E-signature workflow** | Not in scope |
| **Scraper / import code** | Deferred to **D6** |
| **Legal interpretation** | Official TDLR/RAS sources must be verified separately |
| **Automatic correspondence creation from TDLR status** | **Not assumed** — see Recommended Product Posture |

---

## Core Distinctions

| Concept | What it is | What it is not |
|---------|------------|----------------|
| **TDLR registration / status data** | Legal/as-recorded project, party, milestone, and document metadata on the **source track** | A FREDAsoft **correspondence record** or sent letter |
| **FREDAsoft RAS report instance** | Authored deliverable/work product under a **`ras`** Project: plan review or inspection division, report kind, narrative, **projectData**, PDF/Web output (**`docs/CONVERT_TO_RAS.md`**) | A proof form, TABS notification, or filing notice |
| **Correspondence artifact** | Notice, proof, request, response, letter, transmittal, or filing-related document—often with explicit **To/CC** parties | A RAS comment report body or inspection finding set |
| **Proof form (EAB242N / EAB244N)** | Filing/milestone **source document** or attachment reference; may relate to a report instance timeline | The plan review or inspection **report instance** itself |
| **TABS Notification / Letter** | TABS-system correspondence product or logged communication (**D5.5** menus) | Automatically a FREDAsoft-generated letter unless staff creates one |
| **Owner / Agent / Tenant / Design / RAS recipients** | Party roles on registration and Manage Project modals | Automatically canonical stakeholders or correspondence **To** lines without **D2** review |

**Architecture rule (unchanged):** TDLR/TABS source data stays on the **source track**. FREDAsoft may **suggest** candidate correspondence artifacts, recipient hints, and draft metadata; **staff reviewer** approves, rejects, creates links, leaves unmatched, or defers (**D2**). Only **approved associations** become explicit match/link/alias records. **No correspondence artifact is auto-created from TDLR status alone.**

---

## Source Concepts Reviewed

| Source | D7 use |
|--------|--------|
| **Proof-of-Submission EAB242N** | Local ref `Proof-of-Submission-EAB242N.pdf` (**`docs/reference/TDLR_RAS_TABS_SOURCE_INDEX.md`** §3); plan-review filing artifact; **unreviewed** — field-level merge rules **need source confirmation** |
| **Proof-of-Inspection EAB244N** | Local ref `Proof-of-Inspection-EAB244N.pdf`; inspection filing artifact; **unreviewed** |
| **Request-for-Inspection EAB241N** | Local ref `Request-for-Inspection-EAB241N.pdf`; inspection request form; help sheet `EAB-Request-for-Inspection-Form-Help-Sheet.pdf`; **unreviewed** |
| **Inspection-Response EAB229N** | Local ref `Inspection-Response-EAB229N.pdf`; post-inspection response; boundary vs inspection report **open**; **unreviewed** |
| **Notice-of-Substantial-Compliance EAB246N** | Local ref `Notice-of-Substantial-Compliance-EAB246N.pdf`; closure/substantial-compliance letter candidate; **unreviewed** |
| **Designated-Agent EAB243N** | Local ref `eab243n-designated-agent-form.pdf`; EAB205N §4 attachment when designated agent section used; **unreviewed** |
| **TABS Notifications / Letters menus** | **`docs/reference/TDLR_TABS_FORM_FIELD_DISCOVERY.md`** §6.1 — `POST /TABS/Notification/Product`, `POST /TABS/Letters/Product`; correspondence track, not inspection PDF |
| **D3 RAS report instance crosswalk** | Proof forms, TABS letters/notifications explicitly **not** report instances; **D7** boundary |
| **D5 stakeholder / contact model** | Client ≠ Owner; Agent ≠ Owner; contact persons; correspondence merge context layers (§13) |
| **D6 extraction pipeline** | §6.6 documents/correspondence; notifications/letters as metadata for extraction, not letter bodies in repo |

**Source confirmation note:** Binary PDFs in `FREDAsoftReferenceMaterials` are **indexed by filename only** unless otherwise marked reviewed. RAS bulletins (`RAS-Bulletin-2023-06-owner-response-need.pdf`, `RAS-Notification-Help.pdf`, `rasprocedures2018.pdf`), exact TABS letter/notification product fields, and regulatory timing for each form are **not fully reviewed** in current captures—rows below mark **open / needs source confirmation** where labels or merge fields are uncertain.

---

## Candidate Correspondence Artifact Types

**Default posture:** **No** correspondence artifact is **auto-created** from TDLR status alone. TDLR/TABS source data may **suggest** candidate correspondence artifacts for **staff review**.

| Correspondence Artifact Concept | Possible Source Signal | FREDAsoft Meaning | Auto-created? | Reviewer Action | Notes |
|--------------------------------|------------------------|-------------------|---------------|-----------------|-------|
| **Proof of Submission** | EAB242N PDF ref; Manage Documents metadata; PSU **Plan Review** row **Submitted On** | Filing/milestone **correspondence artifact** or source attachment snapshot | **No** | **Snapshot**; optional link to plan review report instance / milestone | Distinct from plan review **report body** (**D3**) |
| **Proof of Inspection** | EAB244N PDF ref; PSU **Inspection** row **Submitted On** | Filing/milestone correspondence artifact | **No** | **Snapshot**; optional link to inspection report instance | Distinct from inspection **report instance** |
| **Request for Inspection** | EAB241N; Manage **Inspection** menu; help sheet | Formal inspection **request** correspondence candidate | **No** | **Snapshot**; **Defer** recipient rules | Scheduling fields **need source confirmation** |
| **Inspection Response** | EAB229N; Manage **Corrective Modifications** | Owner/design **response** to inspection findings | **No** | **Defer** — correspondence vs portal upload **open** | Not a CONVERT_TO_RAS report kind |
| **Notice of Substantial Compliance** | EAB246N; Manage **Request for Closure**; status **`3007` Project Closed** (weak signal) | Closure / substantial-compliance **notice** candidate | **No** | **Defer** — needs source confirmation | Exact TABS label and trigger **open** |
| **Designated Agent form / agent authorization** | EAB243N attachment; EAB205N §4; Agent modal | **Agent authorization** source document + **Agent** party context | **No** | **Snapshot**; link to **Agent** project party after **D2** Screen 4 | Form ≠ correspondence letter unless staff generates one |
| **Owner response / corrective modification response** | Manage **Corrective Modifications**; RAS Bulletin 2023-06 (unreviewed) | Post-inspection **response** correspondence candidate | **No** | **Defer** | Portal submission rules **D8 open** |
| **TABS Notification** | `POST /TABS/Notification/Product`; `RAS-Notification-Help.pdf` (unreviewed) | TABS-system **notification** as source evidence or external correspondence reference | **No** | **Snapshot** metadata; optional manual log entry | Import vs reference-only **open** |
| **TABS Letter** | `POST /TABS/Letters/Product` | TABS-generated **letter product** as source evidence or reference | **No** | **Snapshot**; **Defer** FREDAsoft mirror | Not auto FREDAsoft PDF |
| **General transmittal** | Staff workflow; future template | Internal or external **cover/transmittal** for filings or client packages | **No** | Staff-created when implemented | Template phase deferred |
| **Internal review note** | D2 review session; staff workflow | Non-client **review memo** or queue note | **No** | Staff-only; audit trail | Not TDLR source artifact |
| **Source snapshot only** | Registration PSU row; document metadata without mapped artifact type | TDLR **document/milestone snapshot** on source track | **No** | **Snapshot** — no FREDAsoft correspondence implied | Preserve even if no operational letter created |

---

## Recipient / Party Crosswalk

**Emphasis:** Source party snapshots remain **as-recorded**. Correspondence **To/CC** binding requires **explicit staff review** (**D2** Screen 4) or future **template rules**—not inference from TDLR field presence alone.

| Recipient or Party Concept | Source Field(s) | Possible FREDAsoft Target | Reviewer Action | Notes |
|----------------------------|-----------------|---------------------------|-----------------|-------|
| **Owner** | EAB205N §3 Owner name/address/phone/email; `lblProjectOwner`; export Owner columns | Canonical **stakeholder** + **Owner** project party + contact person(s) | **Match** / **Create** / **Defer** | **Client ≠ Owner** by default (**D5**) |
| **Owner Representative** | EAB205N §3 Representative; Owner modal representative fields | **Contact person** under Owner stakeholder | **Match** / **Create** / **Defer** | Trust/business/government owner context |
| **Tenant** | EAB205N §5 Tenant block; `lblProjectTenant`; Tenant modal | **Tenant** project party → stakeholder | **Match** / **Leave unmatched** / **Defer** | TABS **Not Assigned** → often unmatched |
| **Design Firm / Design Professional** | EAB205N §5 Design Firm; Design modal `ContactType` = Design_Firm; license fields | **Design Firm** party + contact person | **Match** / **Create** | Design Professional may be contact under firm |
| **RAS Firm** | EAB205N §1 RAS; Details RAS Name/#/Address; export **`RASName`**, **`RAS#`** | **RAS Firm** project party → canonical stakeholder | **Match** / **Create** / **Defer** | Registration RAS ≠ assigned individual by default (**D3**, **D5**) |
| **Assigned RAS user** | *(FREDAsoft operational)*; hints: `lblProjectPlanReviewBy`, `lblProjectInspectionBy` | Auth **user** + project/report **assignment** | Staff assigns; optional link to TDLR hint | Not inferred from RAS Firm row alone |
| **Agent / Designated Agent** | EAB205N §4; EAB243N; Agent modal `ContactType` = Agent | **Agent** project party → stakeholder | **Match** / **Create** / **Defer** | **Agent ≠ Owner**; often absent from export |
| **Person Filing Form** | TABS Details registrant contact; `lblProjectContact`; not on EAB205N page 3 | **Registrant** contact snapshot; optional contact person | **Match** / **Leave unmatched** | **Not** automatically canonical stakeholder |
| **TDLR / regulator recipient** | TABS filing/submission targets; notification products | External **regulator** reference—not a FREDAsoft stakeholder | **Snapshot** / N/A | No legal interpretation in app copy until source confirmed |
| **Client / billing contact** | FREDAsoft **Client** entity; contract context | **Client** anchor (assessment/RAS billing) | Explicit **Client ↔ Owner** link if same entity | Default: separate from TDLR Owner |
| **Portal stakeholder** | Future portal identity (**D8**) | Auth account scoped to project party / contact | **Defer** to portal design | May submit responses—rules **open** |

---

## Correspondence vs Report Instance Crosswalk

| Artifact / Event | Correspondence? | Report Instance? | Source Evidence? | Reviewer Decision Needed | Notes |
|------------------|-----------------|------------------|------------------|--------------------------|-------|
| **Plan Review report** | **No** (deliverable) | **Yes** — Plan Review division per **CONVERT_TO_RAS** | Optional link to TDLR milestone hint | Staff creates/selects kind and dates | Authored comment report—not a proof form |
| **Inspection report** | **No** (deliverable) | **Yes** — Inspection division | Optional milestone hint | Staff creates/selects kind | Distinct from proof of inspection |
| **Proof of Submission** | **Yes** — filing artifact | **No** | **Yes** — EAB242N / document metadata | Optional link to plan review instance | **D3** / **D7** boundary |
| **Proof of Inspection** | **Yes** — filing artifact | **No** | **Yes** — EAB244N / document metadata | Optional link to inspection instance | Filing ≠ report body |
| **Request for Inspection** | **Yes** — request form | **No** | **Yes** — EAB241N / menu action | Recipients and timing **open** | May precede inspection instance |
| **Inspection Response** | **Yes** — response artifact | **No** (today) | **Yes** — EAB229N / corrective mods | Correspondence vs portal upload **Defer** | Not CONVERT_TO_RAS report kind |
| **Notice of Substantial Compliance** | **Yes** — notice candidate | **No** | **Yes** — EAB246N / closure signals | **Defer** — source confirmation | Weak link to **`3007`** status |
| **TABS letter** | **Yes** — external letter product | **No** | **Yes** — TABS Letters menu | Reference vs import **open** | Not FREDAsoft Report Preview PDF |
| **TABS notification** | **Yes** — notification product | **No** | **Yes** — TABS Notifications menu | **Snapshot** metadata | Distinct from internal review note |
| **Registration source snapshot** | **No** (unless staff letter) | **No** | **Yes** — PSU Registration row | **Snapshot** only | Registration ≠ correspondence by default |

---

## Workflow Relationship

Where **D7** fits into **D2** and **D3**:

| D2 screen | D7 concepts surfaced |
|-----------|---------------------|
| **Screen 2 — Source Snapshot Summary** | Document metadata refs (EAB242N, EAB244N, EAB243N, EAB241N, EAB229N, EAB246N); TABS Notifications/Letters menu presence; PSU **Submitted On** dates—all **read-only** source evidence; correspondence suggestions labeled **candidate**, not created |
| **Screen 4 — Party Match Review** | Confirms **recipients** for future correspondence: Owner, Agent, Tenant, Design Firm, RAS Firm, registrant/contact persons; **Client ↔ Owner** remains explicit optional link |
| **Screen 5 — Field-Level Differences** | May surface differing recipient/contact emails, phones, or addresses across export vs live TABS; optional **draft** correspondence metadata hints—unchecked by default |
| **Screen 6 — Approval Summary** | May list approved party links and aliases that **enable** future correspondence targeting; **approved correspondence links / draft suggestions** are future—not assumed in D7 |
| **D3 report instance crosswalk** | Keeps **plan review / inspection report deliverables** separate from proof forms, TABS letters/notifications, and filing artifacts—staff must not treat PSU row or proof metadata as auto report instance or auto letter |

---

## Relationship to D4 Schema Sketch

Conceptual mapping only—**collection names not finalized** (**D4**). D7 correspondence concepts extend the **source/review track**; operational correspondence records (if any) would live on the **canonical/operational track**, linked via approved bridges—not merged into TDLR snapshots.

| D4 draft area (conceptual) | D7 content stored or referenced |
|----------------------------|----------------------------------|
| **`tdlrProjectSnapshots`** — `documentMetadata[]` | Proof form refs, designated-agent attachment, TABS letter/notification product refs, CAD/LLO (non-correspondence attachments) |
| **`tdlrPartySnapshots`** | As-recorded recipient names, addresses, emails, phones per role |
| **`tdlrParsedFields`** | Normalized email/phone/address keys for recipient **candidate** ranking |
| **`tdlrCandidateMatches`** | Suggested links: document metadata → correspondence artifact type hint; party row → future recipient binding (assistive only) |
| **`tdlrApprovedLinks`** | Approved project-party and contact links that **enable** correspondence targeting after review |
| **`tdlrDraftUpdates`** | Proposed correspondence metadata (e.g. suggested primary recipient role)—**draft hints only**, not sent letters |
| **`tdlrAuditEvents`** | Reviewer decisions on correspondence hints, recipient links, defer/reject |

Future **operational correspondence** (templates, sent records, merge snapshots) is **not** sketched in D4 TDLR collections—would require separate design phase linked from approved project/report/party ids.

---

## Recommended Product Posture

| # | Posture |
|---|---------|
| **CP-1** | **Show correspondence-related TDLR/TABS artifacts as source evidence** on Screen 2 and in snapshot history—with source layer and capture timestamp. |
| **CP-2** | **Suggest** correspondence artifact types and recipient hints; **do not create** operational correspondence automatically. |
| **CP-3** | Keep **proof, notice, and request forms** distinct from **RAS plan review / inspection report deliverables** (**D3**). |
| **CP-4** | **Require staff review** before linking recipients or promoting source document refs to operational correspondence records. |
| **CP-5** | **Preserve as-recorded source artifacts** even when no FREDAsoft correspondence record is created—the TDLR track is complete without a letter mirror. |
| **CP-6** | Treat **template generation and PDF letter rendering** as a **later phase**—separate pipeline from Report Preview / Web Report. |
| **CP-7** | **Avoid legal interpretation** in app copy, merge fields, or milestone triggers until primary sources are reviewed and product owner confirms wording. |
| **CP-8** | **No auto-draft correspondence** from TDLR status alone; **current assumption: no** (**D2** / **D3** carry-forward). |

---

## Open Questions for D4 / D6 / D8 / Implementation

### Correspondence model

1. **Exact correspondence artifact model** — single `correspondence_records` concept vs typed artifacts (proof, request, notice, letter)?  
2. Does correspondence belong under **Project**, under **report instance**, or both?  
3. Should **proof forms** link to **report instance**, **milestone snapshot**, or **both**?  
4. Can any correspondence ever **auto-draft** from TDLR signals? **Current assumption: no.**

### Recipients and parties

5. **Recipient rules** for **Owner vs Agent vs Client** when multiple appear on registration—default **To** line per template type? (**D5** §17, SM-8)  
6. Is **Person Filing Form** ever a valid primary recipient, or always secondary/registrant-only?  
7. Should **RAS Firm** receive operational correspondence, or only **assigned RAS** contact?

### TABS products and import

8. Can **TABS letters/notifications** be **imported** (body/PDF capture) or **referenced** by metadata only?  
9. What merge fields exist on TABS Letter vs Notification products? (**needs source confirmation**)  
10. Should FREDAsoft log **outbound** staff letters separately from **inbound/filing** proof forms?

### Portal and workflow

11. Can **portal users** submit **correspondence responses** (e.g. inspection response, owner corrective modification)? (**D8**)  
12. **Template merge fields** and **approval workflow** before send—who approves, what is immutable after send?  
13. **Retention and access control** for correspondence artifacts vs source snapshots vs sent-letter `merged_data`?

### Extraction (D6)

14. Which correspondence PDFs should D6 **extract field labels** from vs **metadata-only** index?  
15. Should re-scrape diff highlight new document metadata that **suggests** correspondence review?

---

## Related Documentation

| Document | Relevance |
|----------|-----------|
| `docs/FREDASOFT_PROJECT_RAS_REPORT_INSTANCE_CROSSWALK.md` | D3 — report instance vs correspondence boundary |
| `docs/FREDASOFT_PROJECT_TDLR_REVIEW_WORKFLOW.md` | D2 — review screens, party match, approval outcomes |
| `docs/FREDASOFT_PROJECT_TDLR_SCHEMA_SKETCH.md` | D4 — source-track snapshot and link sketch |
| `docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md` | D5 — Client ≠ Owner; contacts; correspondence merge layers |
| `docs/FREDASOFT_PROJECT_TDLR_EXTRACTION_PIPELINE.md` | D6 — document/correspondence extraction posture |
| `docs/FREDASOFT_PROJECT_FIELD_LEVEL_MAPPING.md` | D1 — party and milestone field mapping |
| `docs/CONVERT_TO_RAS.md` | RAS report divisions/kinds—deliverables distinct from correspondence |
| `docs/reference/TDLR_RAS_TABS_SOURCE_INDEX.md` | Source catalog (EAB242N–EAB246N, bulletins, help sheets) |
| `docs/reference/TDLR_TABS_FORM_FIELD_DISCOVERY.md` | D5.5 — Notifications/Letters menus, Manage Project workflow |
| `docs/reference/EAB205N_PROJECT_REGISTRATION_FIELD_INDEX.md` | Registration party fields and designated-agent attachment |
| `docs/reference/TDLR_OPEN_RECORDS_EXPORT_FIELD_INDEX.md` | Export party columns (Agent often absent) |
| `docs/FREDASOFT_PROJECT_APP_DISCOVERY.md` | Prototype correspondence tables—workflow reference only |
| `docs/ARCHITECTURE_DESIGN.md` | Durable architecture decisions |

---

## Non-goals (D7)

- Implemented Firestore schema for correspondence or TDLR snapshots  
- Security rules, migrations, scrapers, or importers  
- Letter templates, merge-field specs, or PDF rendering  
- E-signature or outbound mail integration  
- UI routes or correspondence management screens  
- Legal/compliance assertions about filing timing or recipient obligations  
- Automatic creation of correspondence records from TDLR status or document metadata  
