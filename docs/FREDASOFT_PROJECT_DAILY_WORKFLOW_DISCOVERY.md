# FREDAsoft Project — Daily Workflow Discovery

**Status:** Draft workflow discovery (Archie #11). **Not implementation.** **Not schema.** **Not UI.**  
**Last updated:** 2026-06-05  
**Branch context:** `archie-11-workflow-discovery`  
**Reviewers:** Kenneth (product owner), Kathy Rodriguez, Jessica Montalvo — **please correct, clarify, and rearrange**

> **Disclaimer:** This document captures **current daily workflow and project lifecycle** vocabulary for the future FREDAsoft **Project Management** feature. It reflects product-owner and staff narrative as of Archie #11 and **does not** authorize code, Firestore schema, security rules, importers, or UI. Terminology and status lists **will change** after staff review.

**Source:** Kenneth workflow narrative (Archie #11); grounded in `docs/FREDASOFT_PROJECT_IMPLEMENTATION_READINESS_PLAN.md` and Archie #10 D1–D8 discovery docs.

---

## 1. Purpose

This doc answers: *How do OCG staff and RAS professionals run a TDLR-linked accessibility project today, and what must FREDAsoft eventually support?*

It is a **structured draft for review**—not final requirements, not a screen spec, and not a port of the legacy Access application. Kenneth, Kathy, and Jessica should treat sections as **editable**: strike wrong steps, add missing queues, rename statuses, and note where spreadsheet/email work should become system queues.

**Relationship to other docs:**

| Doc | Role |
|-----|------|
| `docs/FREDASOFT_PROJECT_IMPLEMENTATION_READINESS_PLAN.md` | Sequencing and first vertical slice |
| D2 (`TDLR_REVIEW_WORKFLOW.md`) | Future **TDLR source** staff review (separate track) |
| D5 / D7 / D8 | Stakeholder, correspondence, portal boundaries |
| This doc | **Operational day-in-the-life** vocabulary for Project Management |

---

## 2. Workflow Principles

| Principle | Meaning for FREDAsoft |
|-----------|------------------------|
| **Multiple intake paths** | FREDAsoft must support **several intake scenarios**, not one linear “new project” wizard. |
| **Client = paying customer** | **Client** is the contract/billing relationship (who OCG invoices). |
| **Owner = legal responsible party** | **Owner** is the building/facility owner of record for TDLR/RAS obligations—not assumed identical to Client. |
| **Registrant = source field** | **Registrant** (person filing on TABS) is **as-recorded source data**; may **not** be a continuing stakeholder. |
| **Dual-track TDLR data** | TDLR/TABS data is **legal/as-recorded source**; it stays **separate** from FREDAsoft **canonical/operational** records. |
| **No silent overwrite** | Source values may **suggest** matches; they **do not** overwrite canonical Project, stakeholder, or contact fields. |
| **Staff review gates** | Links, stakeholders, correspondence visibility, official project actions, and TDLR alignment require **explicit staff review** (see D2, D8). |
| **Queues over spreadsheets** | Today’s spreadsheet-driven tracking should become **system queues**—but **which** queues drive work is **open** (§19). |

---

## 3. Project Intake Scenarios

FREDAsoft should anticipate **all** of the following entry paths (not one default):

| # | Scenario | Typical starting artifacts | Notes (draft) |
|---|----------|---------------------------|---------------|
| **A** | **Standard registered project** with TABS number | TABS #, PRF/TDLR data, plans | Most common post-registration path |
| **B** | **Preliminary review** before TABS registration | Plans, client/owner contact, fee discussion | May lack TABS # initially |
| **C** | **OCG-assisted registration** from paper PRF + payment | Paper PRF, payment, owner/agent info | OCG admin registers in TABS on behalf of parties |
| **D** | **Inspection-only / file transfer** from another RAS | TDLR **project file**, prior RAS context | Inspection work requires TDLR file before inspection |
| **E** | **OCG project number assigned** while **TABS # pending** | Internal OCG #, intake paperwork | TABS hydration added when number exists |

**Open:** Minimum fields to open a “preliminary” project shell (§19).

---

## 4. Client, Owner, Registrant, and Stakeholder Distinctions

| Concept | Role in daily work | FREDAsoft posture (draft) |
|---------|-------------------|---------------------------|
| **Client** | Paying customer; OCG business relationship | Canonical **Client** anchor; portal/billing scope **candidate** (D8) |
| **Owner** | Legally responsible party; official correspondence often required | **Owner** project party; distinct from Client unless explicitly linked (D5) |
| **Registrant** | Who filed on TABS (may be design professional) | **Source-field only** until staff links a contact/stakeholder |
| **Design professional** | Often registers **on behalf of** owner | **Design Firm** / contact party; not automatic Owner |
| **Owner agent / designated agent** | Authorized to act for owner on TDLR matters | **Agent** party; correspondence recipient **candidate** (D7) |

**Operational rule (draft):** **Owner** generally must receive **official** correspondence; Client may receive business correspondence depending on contract—exact rules **open** (§12, §19).

---

## 5. Service Scope / Project Type

First-class **service scopes** (a project may gain or change scope over time):

| Service scope | Description (draft) |
|---------------|---------------------|
| **Preliminary review only** | Early plan feedback before full registration path |
| **Plan review only** | Registered plan review without inspection scope |
| **Inspection only** | Inspection / file-transfer path |
| **Plan review + inspection** | Full lifecycle |
| **OCG-assisted registration** | OCG performs TABS registration step |
| **File transfer / takeover inspection** | Assume inspection from prior RAS |

**Note:** Scope may **evolve** on one project (e.g. preliminary → plan review → inspection). Transition rules **not finalized** (§19).

---

## 6. Current Project Statuses

Today’s **status vocabulary** (spreadsheet / manual tracking). FREDAsoft may later split these into **queue-driving status**, **milestone history**, and **work-state** fields—**not decided here**.

| Status | Typical meaning (draft — confirm with staff) |
|--------|-----------------------------------------------|
| **Submitted** | Intake received; not yet fully processed |
| **Assigned to RAS** | Official RAS assigned; work expected |
| **Preliminary Review** | Preliminary review in progress |
| **Preliminary Review Complete** | Preliminary pass complete |
| **Plan Review** | Plan review in progress |
| **Plan Review Complete** | RAS plan review finished internally |
| **Special Inspection** | Special inspection phase active |
| **Special Inspection Complete** | Special inspection phase closed |
| **Inspection** | Inspection phase active |
| **Inspection Approved** | Inspection outcome approved |
| **Inspection Disapproved** | Inspection outcome disapproved |
| **Response Approved** | Owner/design response accepted (post-disapproval path) |
| **Project Closed** | OCG operational close |
| **Project Sent to TDLR** | Final/submission milestone to TDLR |

**Staff action:** Mark which statuses should **drive queues** vs remain **historical labels only** (§19).

---

## 7. Staff Roles and Daily Queues

### Admins (intake and records)

**Kathy Rodriguez** and **Jessica Montalvo** (also referenced as Jessica/Jessica Montalvo in narrative) handle, among other duties:

- Project intake and preliminary answers  
- RAS assignment and due dates  
- Correspondence preparation and tracking  
- Payment tracking  
- Records and official send to TDLR  
- Spreadsheet maintenance today → **target system queues** tomorrow  

### RAS professionals

- Need **visibility to all projects** relevant to the firm, not only projects where they are the **officially assigned** RAS.  
- **One RAS** is **officially assigned** per project (accountability).  
- **Plan review** and **inspection** may involve the **same or different** RAS individuals in practice.  

### Queue direction (draft)

Replace spreadsheet tabs with queues such as: **intake pending**, **awaiting RAS assignment**, **RAS in progress**, **awaiting admin completion letter**, **awaiting payment**, **ready to send to TDLR**—exact names **TBD** with Kathy/Jessica.

---

## 8. RAS Assignment and RAS Work

Typical **plan review / inspection** handoff today:

```text
Admin identifies RAS → informs by call / email / text / spreadsheet
        → sets due date → forwards plans/documents
                → RAS completes review → returns to admin
                        → admin marks complete → prepares cover letter
                                → emails client/owner as required
```

| Step | Actor | Output |
|------|-------|--------|
| Assign + notify | Admin | Assigned RAS, due date, document package |
| Perform review | RAS | Review report/product to admin |
| Complete + correspond | Admin | Status update, cover letter, outbound email |
| Inspection-only path | Admin + RAS | **TDLR project file** must exist before inspection proceeds |

FREDAsoft should **support** this handoff (assignment, due dates, document refs, status)—not automate official correspondence without staff action (D7).

---

## 9. Critical Dates and Deadlines

### Essential project dates (track on every project)

| Date field | Use (draft) |
|------------|-------------|
| Date project received | Intake anchor |
| Date plans received | Plan review clock start |
| Date issued for construction | Construction/bid issuance |
| Date registered with TDLR | TABS registration milestone |
| Date assigned to RAS | Assignment anchor |
| Plan review due date | Admin-set expectation |
| Plan review completed date | RAS finished review |
| Plan review sent to owner date | Official delivery to owner |
| Inspection due date | Admin-set expectation |
| Inspection requested date | Request filed |
| Inspection scheduled date | Scheduled visit |
| Inspection completed date | Field work complete |
| Inspection report sent date | Report delivered |
| Closed date | OCG project closed |
| Sent to TDLR date | Final TDLR submission milestone |

### Statutory / business anchors (context — verify legally)

| Anchor | Narrative context (draft — not legal advice) |
|--------|-----------------------------------------------|
| **Plan review timing** | Plan review within **~30 days** of receiving plans (staff tracks; exact rule **confirm**) |
| **Plans to RAS after issuance** | Design professional/owner sends plans to RAS within **~10 days** of issuing for construction/bid |
| **Inspection timing** | Inspection within **one year** of construction completion; completion date from PRF; **changeable by owner written request** |

FREDAsoft should **store and display** these dates; it should **not** auto-enforce law without confirmed rules and staff override.

---

## 10. Documents and Official Record

### Document types on the project file

| Document | Category (draft) |
|----------|------------------|
| PRF / TDLR project data | Registration / source |
| Plans / construction documents | Technical |
| Owner–agent designation | Party authorization |
| Proof of submission | TDLR filing (D7) |
| Limited liability ownership form | Ownership (LLC/LP) |
| Request for inspection (owner or designated agent signature) | Inspection gate |
| Reports (plan review, inspection) | Deliverables |
| Correspondence | Official + business (D7) |
| Photos | Evidence |
| Stakeholder responses | Post-review |
| Notes | Log (§11) |
| TDLR project file | Required for inspection-only transfer |

### Required-before gates (draft)

| Gate | Documents typically required before proceeding |
|------|-----------------------------------------------|
| **Plan review** | Plans/construction documents; PRF/TDLR data as applicable; owner-agent designation when required |
| **Inspection** | TDLR project file (inspection-only transfer); request for inspection signed; prior plan review path satisfied per scope |

Exact checklist by **service scope** is **open** (§19).

---

## 11. Notes and Audit Trail

| Behavior | Draft requirement |
|----------|-------------------|
| **One chronological log per project** | Single timeline staff and RAS share |
| **Manual notes** | Staff and RAS enter notes today; must continue |
| **Automatic notes (future)** | Correspondence sent, uploads, status changes may append system notes |
| **Edit until TDLR send** | Notes editable until project closed and **sent to TDLR** (confirm cutoff) |
| **Official vs internal** | Some notes are **official-record**; others **internal-only** |
| **Visibility** | Classification rules **not finalized**—portal/disclosure impact (D8, §19) |

Align long-term with D4 **`tdlrAuditEvents`** and operational audit—not the same as user-facing activity feed (D8).

---

## 12. Correspondence and Communication

### Common correspondence types

| Type | Examples |
|------|----------|
| **Plan review complete** | Notice that plan review phase finished |
| **Notice of inspection due** | Inspection timing notice |
| **Inspection scheduling request** | Coordinate inspection date |
| **Cover letters** | Plan review and inspection packages to client/owner |

### Official vs ordinary

| Class | Handling (draft) |
|-------|------------------|
| **Official TDLR-protocol correspondence** | Must follow protocol; often **owner-visible** |
| **Ordinary business communication** | Client billing, informal updates—visibility rules **open** |

### Near-term vs future (product direction — not committed)

| Horizon | Capability |
|---------|------------|
| **Near-term** | Generate correspondence from template → **PDF** → store on project → staff **manually emails** → log event in project notes |
| **Future** | Send email from app; inbound email capture; SMS send/receive; portal messages (D8) |

**Open design area:** Correspondence **visibility and disclosure policy** (owner vs client vs internal)—see D7, §19.

---

## 13. Payment and Fees

| Topic | Current practice (draft) |
|-------|--------------------------|
| **Fee calculation** | From fee schedule; **Kathy/Kenneth** may adjust manually |
| **Tracking** | By service (especially **review** and **inspection**): pending vs paid |
| **In-app need** | Payment status should live **in the app**, not only spreadsheet |
| **Work blocking** | **Payment pending does not always block work**—some clients pay when their client pays |

v1 payment fields **not defined** (§19).

---

## 14. TDLR/TABS Interaction

| Topic | Posture |
|-------|---------|
| **TABS lookup / hydration** | Valuable to pull registration snapshot into FREDAsoft |
| **Source values** | TDLR/TABS values are **official as-recorded** even when wrong |
| **Corrections** | Fixes happen in **TABS through authorized process**—not by FREDAsoft overwriting source |
| **FREDAsoft mirror** | Store source snapshot **separately**; **manually link** canonical Client, Owner, Project, stakeholders after review (D1, D2, D6) |

This aligns with Archie #10: **no auto-promotion** from hydrate to canonical.

---

## 15. Stakeholder Roles

### Extended role list (project file)

Owner · Owner agent · Design professional · Design professional type · Contractor · Tenant · Property manager · RAS reviewer · RAS inspector · OCG admin

### Roles needed **daily** (minimum operational set)

| Role | Why it matters daily |
|------|----------------------|
| **OCG admin** | Intake, assignment, correspondence, TDLR send |
| **Phase RAS** | Assigned reviewer/inspector for current phase |
| **Design professional** | Registration and plan submission contact |
| **Owner** | Legal party; official correspondence |
| **Owner agent** | Authorized representative |

Map to D5 **project parties** and contacts—not one flat “stakeholder” table without review.

---

## 16. Portal Future State

| Topic | Draft posture |
|-------|---------------|
| **Permissions** | Complex **role-based matrix** eventually (owner, client, agent, design, RAS, admin) — D8 |
| **Owner visibility** | Important: owner must be informed of **official** activity |
| **Implementation order** | Portal is **future-state**; must **not** drive first implementation slice |

Near-term: staff-facing Project Management only.

---

## 17. Old Access App — Non-Goal

| Rule | Detail |
|------|--------|
| **Do not clone** | Legacy Microsoft Access app architecture is **not** a FREDAsoft design source |
| **Clean-slate** | FREDAsoft Project Management is a **new** operational model on Client/Facility/Project + dual-track TDLR |
| **Terminology only (optional)** | Kenneth may reference Access **labels** in review sessions; that does **not** import schema, screens, or workflows |

Lovable prototype and Access are **vocabulary mines**, not port targets (`APP_DISCOVERY.md`).

---

## 18. Implications for First Implementation Slice

`IMPLEMENTATION_READINESS_PLAN.md` proposed: **manual TDLR source snapshot + Project link review**.

**Workflow discovery adjustment (draft recommendation for Archie review):**

| Finding | Implication |
|---------|-------------|
| Daily work centers on **intake, status, dates, assignment, documents, payment**—not only TDLR link review | First slice may need an **internal project intake shell** (minimal Project + status + Client + scope) **before or alongside** TDLR snapshot link review |
| TDLR hydration is valuable but not the only entry path | Support **OCG # without TABS #** and non-TDLR-first preliminary paths |
| Spreadsheet replacement is the pain point | Even a **thin queue + dates + assignment** surface may deliver more daily value than link-review alone |

**Still explicit non-goals for first slice:** portal, SMS, full correspondence generation, scraper, full D2 six-screen queue, auto-create canonical records from TDLR.

**Proposed sequencing question:** Phase 3 = **(A)** TDLR link review only, **(B)** intake shell only, or **(C)** thin intake shell **+** manual TDLR snapshot link on same Project (§19).

---

## 19. Open Questions

Staff and Archie should resolve before schema refinement and vertical-slice coding:

1. Which statuses become **queue-driving** vs **historical milestones** only?  
2. What **minimum fields** create a valid preliminary project (each intake scenario)?  
3. What **service-scope transitions** must the system allow (and who approves)?  
4. What **documents are required** by each service scope at each gate?  
5. What correspondence must be **official-record** and **owner-visible**?  
6. What notes are **internal-only** vs **official-record**?  
7. What **payment fields** are required for v1?  
8. Should the first buildable vertical slice shift from **TDLR source link review only** to **project intake shell + source link review**?  
9. Which **existing FREDAsoft screen** (if any) hosts the first admin queue?  
10. How do **OCG project #** and **TABS #** relate on the Project record before/after registration?

---

## Related Documentation

| Document | Relevance |
|----------|-----------|
| `docs/FREDASOFT_PROJECT_IMPLEMENTATION_READINESS_PLAN.md` | Archie #11 sequencing |
| `docs/ArchieHistory.md` | Archie #10 wrap-up |
| `docs/FULL_PROJECT_HISTORY.md` | Phase 6 discovery |
| `docs/ARCHITECTURE_DESIGN.md` | DECIDED D1–D8 |
| `docs/FREDASOFT_PROJECT_FIELD_LEVEL_MAPPING.md` | D1 |
| `docs/FREDASOFT_PROJECT_TDLR_REVIEW_WORKFLOW.md` | D2 — TDLR staff review (future) |
| `docs/FREDASOFT_PROJECT_TDLR_SCHEMA_SKETCH.md` | D4 |
| `docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md` | D5 |
| `docs/FREDASOFT_PROJECT_CORRESPONDENCE_REQUIREMENTS_CROSSWALK.md` | D7 |
| `docs/FREDASOFT_PROJECT_PORTAL_STAKEHOLDER_IMPLICATIONS.md` | D8 |

---

## Review Instructions (Kenneth / Kathy / Jessica)

Please mark directly in this doc or in review notes:

- [ ] Intake scenarios complete? Missing paths?  
- [ ] Status list accurate? Rename or merge statuses?  
- [ ] Dates list complete? Wrong labels?  
- [ ] Document gates correct per service scope?  
- [ ] Correspondence list complete? Official vs business examples?  
- [ ] Payment rules accurate?  
- [ ] First implementation slice preference: **A**, **B**, or **C** (§18)?  

*End draft — Archie #11 workflow discovery.*
