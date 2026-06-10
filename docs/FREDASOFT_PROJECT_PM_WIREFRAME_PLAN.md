# FREDAsoft Project Management — Wireframe / Prototype Plan

**Status:** Wireframe/prototype planning only. **Not implementation.**  
**Last updated:** 2026-06-09  
**Branch context:** `archie-11-pm-wireframe-plan`  
**Audience:** Kenneth, Kathy Rodriguez, Jessica Montalvo, OCG RASes, architecture review (Archie)

> **Hard boundaries for any prototype built from this plan:**  
> **No real data.** **No Firebase reads.** **No Firebase writes.** **No auth changes.** **No storage uploads.** **No TDLR/TABS live calls.** **No production implementation.**  
> The prototype exists **only** to test workflow understanding.

---

## 1. Purpose

This plan translates `docs/FREDASOFT_PROJECT_DAILY_WORKFLOW_DISCOVERY.md` into a **mock-data-only clickable workflow** for review—before Firestore schema hardening, before production UI, and before importers or live TDLR integration.

**Goal:** Let Kenneth, Kathy, Jessica, and OCG RASes **click through fake projects** and surface:

- Missing steps or handoffs  
- Wrong or confusing statuses  
- Screens in the wrong order  
- Missing document types or gates  
- Bad terminology (Client vs Owner vs Registrant)  
- Places where TDLR source data might be confused with canonical project data  

**This document is the plan for the prototype—not the prototype itself.**

---

## 2. Prototype Principles

| Principle | Meaning |
|-----------|---------|
| **Prototype the workflow, not the database** | Screens and click paths matter; collection names and persistence do not. |
| **Fake/sample projects only** | Hard-coded or local JSON fixtures—no production Client/Project records. |
| **Visible mock banner** | Every screen shows **PROTOTYPE / MOCK DATA — NOT SAVED**. |
| **No canonical mutation** | Clicks do not create or update real FREDAsoft records. |
| **No Firebase** | No `firebase` import, no Firestore, no Auth, no Storage. |
| **Disposable** | Prototype may be deleted or replaced after review; no merge obligation. |
| **Staff review before schema** | Feedback from this prototype informs D4 refinement and first implementation slice—not the reverse. |

Align with Archie #10 dual-track rule: source suggestions never overwrite canonical data, even in mock UX (show side-by-side, not silent merge).

---

## 3. Intended Reviewers

| Reviewer | Expected validation |
|----------|---------------------|
| **Kenneth** | Product scope, service scopes, status vocabulary, statutory date anchors, first-slice direction (intake vs TDLR link), correspondence official vs business |
| **Kathy Rodriguez** | Intake paths, payment fields, fee adjustment, correspondence prep, RAS assignment handoff, queue priorities, document gates before plan review/inspection |
| **Jessica Montalvo** | Same admin workflows as Kathy; records/TDLR send milestones, notes official vs internal, spreadsheet replacement queues |
| **OCG RASes** | RAS assignment view, due dates, document access, status transitions they perform vs admin, plan review → return to admin path, inspection-only file requirement |

Reviewers should **rename, reorder, and strike**—not approve aesthetics.

---

## 4. Proposed Prototype Screens

Each screen is **wireframe level**: layout + labels + mock interactions only.

### 4.1 PM Dashboard / Work Queue

| Aspect | Detail |
|--------|--------|
| **Purpose** | Replace spreadsheet tabs with queue cards: intake pending, assigned, in review, awaiting payment, ready for TDLR send. |
| **Primary questions** | Is this the right **first screen**? What filters does Kathy need vs Jessica vs RAS? |
| **Key mock fields** | Queue name, count, sample project rows (OCG #, Client, status, assigned RAS, due date, payment flag) |
| **Out of scope** | Real-time sync, notifications, email integration |

### 4.2 New Project Intake

| Aspect | Detail |
|--------|--------|
| **Purpose** | Start project from one of several intake scenarios (preliminary, TABS registered, OCG-assisted, inspection-only, OCG # pending TABS). |
| **Primary questions** | Minimum fields per scenario? Single wizard vs scenario picker? |
| **Key mock fields** | Intake scenario selector, OCG project #, TABS # (optional), Client, site name, service scope, date received |
| **Out of scope** | Validation against live TDLR, auto Client/Owner creation from TABS |

### 4.3 Project Overview

| Aspect | Detail |
|--------|--------|
| **Purpose** | Single-project hub: identity, scope, status, key dates, assigned RAS, payment summary. |
| **Primary questions** | What belongs in header vs tabs? What does RAS see vs admin? |
| **Key mock fields** | Project name, OCG #, TABS #, Client, Owner (linked), current status, service scope, next due date |
| **Out of scope** | Deep projectData / inspection findings (existing FREDAsoft reporting) |

### 4.4 TDLR/TABS Source Snapshot

| Aspect | Detail |
|--------|--------|
| **Purpose** | Show **as-recorded** TDLR data separately from canonical project fields (D2 Screen 2 subset). |
| **Primary questions** | Is source clearly **read-only**? Where do candidate match hints appear without overwriting parties? |
| **Key mock fields** | TABS #, registrant name, owner text as-recorded, status label, milestone dates, “suggested link” badges |
| **Out of scope** | Live TABS lookup, scraper, auto-promote to canonical |

### 4.5 Stakeholder / Project Parties

| Aspect | Detail |
|--------|--------|
| **Purpose** | Client, Owner, Design Professional, Owner Agent, Tenant, RAS Firm—distinct rows (D5). |
| **Primary questions** | Client ≠ Owner obvious? Registrant separate from Owner? Primary correspondence recipient? |
| **Key mock fields** | Party role, display name, email, phone, primary flag, link-to-canonical (mock) |
| **Out of scope** | Stakeholder directory search, portal invitation |

### 4.6 Service Scope and Status

| Aspect | Detail |
|--------|--------|
| **Purpose** | Scope transitions (preliminary → plan review → inspection) and status progression. |
| **Primary questions** | Which statuses **drive queues** vs history? Who can change status? |
| **Key mock fields** | Service scope dropdown, status dropdown (14 workflow statuses), status history list |
| **Out of scope** | Enforcing legal deadlines automatically |

### 4.7 Dates and Deadlines

| Aspect | Detail |
|--------|--------|
| **Purpose** | Critical dates from workflow discovery §9. |
| **Primary questions** | Which dates are required at intake vs later? Which drive alerts? |
| **Key mock fields** | Received, plans received, registered, assigned, PR due/completed/sent, inspection requested/scheduled/completed/sent, closed, sent to TDLR |
| **Out of scope** | Calendar integration, statutory auto-calculation |

### 4.8 Documents and Official Record

| Aspect | Detail |
|--------|--------|
| **Purpose** | Document checklist by scope; plan-review vs inspection gates. |
| **Key mock fields** | Document type, required flag, mock “attached” checkbox, gate labels (before plan review / before inspection) |
| **Out of scope** | Real upload, virus scan, Storage paths |

### 4.9 RAS Assignment

| Aspect | Detail |
|--------|--------|
| **Purpose** | Admin assigns official RAS, due date, forwards mock plan package. |
| **Primary questions** | One assigned RAS vs contributors? Notification UX (mock only)? |
| **Key mock fields** | Assigned RAS name, due date, phase (plan review / inspection), mock “notify RAS” button |
| **Out of scope** | Email/SMS, RAS availability calendar |

### 4.10 Notes and Audit Trail

| Aspect | Detail |
|--------|--------|
| **Purpose** | Chronological project log; official vs internal note types. |
| **Primary questions** | Where do internal notes live vs owner-visible? Edit until TDLR send? |
| **Key mock fields** | Timestamp, author role, note text, visibility (official / internal), mock system events |
| **Out of scope** | Immutable production audit store |

### 4.11 Correspondence

| Aspect | Detail |
|--------|--------|
| **Purpose** | Template pick → mock PDF generated → log “emailed manually” event (D7 near-term). |
| **Primary questions** | Official vs business correspondence? Owner visibility? |
| **Key mock fields** | Template name (Plan Review Complete, Notice of Inspection Due, cover letter), mock PDF link, sent date, recipient party |
| **Out of scope** | Real PDF engine, outbound email, merge field spec finalization |

### 4.12 Payment and Fees

| Aspect | Detail |
|--------|--------|
| **Purpose** | Fee line items by service; pending/paid; manual adjustment. |
| **Primary questions** | Does payment block work in UI (even if not in policy)? Where does Kathy see totals? |
| **Key mock fields** | Service (preliminary, plan review, inspection), amount, schedule vs adjusted, status pending/paid |
| **Out of scope** | Payment processor, invoicing integration |

### 4.13 Review Checklist / Staff Feedback

| Aspect | Detail |
|--------|--------|
| **Purpose** | Capture reviewer notes per screen: missing step, rename status, required field, wrong handoff. |
| **Primary questions** | Is feedback form sufficient for Archie planning? |
| **Key mock fields** | Screen id, issue type, free text, reviewer name (mock), export feedback summary (clipboard/download mock) |
| **Out of scope** | Ticketing system integration |

---

## 5. Recommended First Click Path

**Scenario:** Preliminary project → TABS added later → scope expands (mirrors workflow discovery §18 option C).

| Step | Screen | Mock action |
|------|--------|-------------|
| 1 | **PM Dashboard** | Admin (Kathy) opens queue; clicks **New project** |
| 2 | **New Project Intake** | Scenario: **Preliminary review**; OCG # `OCG-2026-0142`; **no TABS #**; Client “Acme Dev LLC”; site “West Campus Building A” |
| 3 | **Stakeholder / Parties** | Add Owner, Design Professional, Owner Agent (Client shown separately—not auto-Owner) |
| 4 | **Service Scope and Status** | Scope: **Preliminary Review**; status: **Submitted** → **Assigned to RAS** |
| 5 | **Documents** | Attach mock “plans.pdf” placeholder; mark plans received date |
| 6 | **RAS Assignment** | Assign mock RAS “Jordan Lee”; due date +14 days; mock notify |
| 7 | **Dates** | Set date project received, date plans received |
| 8 | **Service Scope and Status** | RAS path: **Preliminary Review** → **Preliminary Review Complete** (admin marks) |
| 9 | **TDLR Source Snapshot** | Later: add TABS # `TABS-123456`; paste mock snapshot (owner spelling differs from canonical Owner) |
| 10 | **TDLR Source Snapshot** | Review **candidate** party match; **do not** overwrite canonical Owner—mock “approve link” only |
| 11 | **Service Scope and Status** | Change scope to **Plan Review**; status **Plan Review** |
| 12 | **Payment and Fees** | Add plan review fee; status **payment pending**—work continues (mock) |
| 13 | **Correspondence** | Generate mock “Plan Review Complete” PDF event; log manual email to Owner |
| 14 | **Notes** | Admin adds official note + internal note |
| 15 | **Review Checklist** | Staff records: “Missing step?”, “Status rename?”, “First slice = intake + TDLR?” |

**Open questions left in path:** Minimum preliminary fields, whether payment banner should warn admin, correspondence owner vs client default.

---

## 6. Alternate Click Paths

| Path | Entry | Stress tests |
|------|-------|--------------|
| **Standard registered TABS** | Intake with TABS # on day one | Source snapshot + parties from registration; skip preliminary |
| **OCG-assisted registration** | Intake scenario C; payment captured early | Admin registers in TABS (mock); TABS # added mid-flow |
| **Inspection-only transfer** | Intake scenario D | **TDLR project file** required before inspection status; block mock inspection until doc checked |
| **Plan review only → plan + inspection** | Scope starts plan review only | Later scope transition adds inspection; new dates and payment line |

Each path should end at **Review Checklist** with scenario tag.

---

## 7. Mock Data Model (Prototype Only)

**Not schema. Not Firestore. Not implementation.** Local JSON or in-memory fixtures only.

```text
mockProject {
  id, ocgProjectNumber, tabsNumber?, projectName, siteName,
  serviceScope, currentStatus, statusHistory[],
  clientLabel, dateReceived, ...
}

mockProjectParty {
  projectId, role,  // Client | Owner | DesignProfessional | OwnerAgent | Tenant | RASFirm
  displayName, email?, phone?, isPrimaryCorrespondence?, isCanonicalLinked (mock bool)
}

mockTdlrSourceSnapshot {
  projectId, tabsNumber, capturedAt, asRecorded { ownerName, registrantName, statusLabel, ... },
  candidateLinks[]  // assistive only
}

mockDocument {
  projectId, docType, label, requiredForGate?, attached (mock bool), mockFileName
}

mockNote {
  projectId, at, authorRole, text, visibility  // official | internal
}

mockCorrespondenceEvent {
  projectId, templateKey, mockPdfLabel, sentAt?, recipientPartyRole, manuallyEmailed (mock bool)
}

mockPaymentItem {
  projectId, serviceKey, amount, scheduleAmount?, status  // pending | paid
}

mockRASAssignment {
  projectId, rasDisplayName, phase, dueDate, assignedAt, active (mock bool)
}
```

Relationships are **logical for UX only**—no foreign-key enforcement, no sync to `projects` collection.

---

## 8. Prototype Safety Boundaries

| Boundary | Rule |
|----------|------|
| Firebase | **No** import, init, or env config for prototype fixtures |
| Firestore | **No** collections, rules, or writes |
| Security rules | **No** changes |
| Routes | **No** production route unless later explicitly marked **dev/prototype** and gated |
| Uploads | **No** real file upload—placeholders only |
| Email / SMS | **No** sending |
| TDLR | **No** scraping, API, or live TABS lookup |
| Auto-create | **No** automatic stakeholder or canonical record creation from TDLR source values |
| Auth | **No** role matrix implementation—mock “view as Admin / RAS” toggle acceptable |

---

## 9. UI/UX Questions to Answer

Use prototype walkthroughs to decide:

1. Is the **first useful screen** a dashboard/work queue—or project search?  
2. What must **Kathy** see first on login (intake queue, payment pending, RAS overdue)?  
3. What must **Jessica** see first (records, TDLR send queue, correspondence prep)?  
4. What must a **RAS** see first (my assignments, all projects read-only, due this week)?  
5. Are **statuses** queue-driving, decorative, or both?  
6. Where should **payment status** appear (dashboard card, project header, tab only)?  
7. Where do **official vs internal** notes appear—and can RAS see internal?  
8. Where does **TDLR source** appear so it is never confused with canonical Owner/address?  
9. Where do **documents** and **correspondence** live—one tab or split?  
10. Do **service scope transitions** need approval or free edit by admin?  
11. Does the prototype support **multiple intake scenarios** without confusion?  
12. Is **OCG # vs TABS #** relationship clear when TABS is pending?

---

## 10. Suggested Visual Layout

```text
+------------------------------------------------------------------+
| [PROTOTYPE — MOCK DATA — NOT SAVED]                    [View: Admin v]
+------------------------------------------------------------------+
| NAV          |  PROJECT: West Campus Building A  (OCG-2026-0142)   |
| - Dashboard  |  Status: Plan Review  |  Scope: Plan Review         |
| - New intake |  Client: Acme Dev   |  RAS: Jordan Lee  Due: ...   |
| - (queues)   +--------------------------------------------------+
|              |  [Overview][Parties][Source][Docs][Dates][RAS]     |
|              |  [Notes][Correspondence][Payment][Feedback]        |
|              |                                                    |
|              |  (active panel content)                            |
+------------------------------------------------------------------+
```

- **Left navigation:** Dashboard queues + global “New project”  
- **Dashboard:** Cards per queue with counts and sortable mock rows  
- **Project detail:** Header = identity + status + scope + key dates  
- **Tabs/panels:** Parties, TDLR source (visually distinct background), documents, notes, correspondence, payment  
- **Banner:** Persistent mock-data warning; optional “view as RAS” toggle  

---

## 11. Proposed Review Method

**For Kenneth, Kathy, Jessica (and RAS volunteers):**

1. Schedule **30–60 minute** walkthrough per **click path** (§5 + one alternate from §6).  
2. Use **Review Checklist** screen (or printed form) per path: missing step, wrong status name, missing document, confusing label.  
3. **Rename statuses** on sticky notes or in checklist—do not debate color/fonts.  
4. List **required fields** discovered at intake and at each gate.  
5. Vote on first implementation slice: **(A)** TDLR link only, **(B)** intake shell only, **(C)** both (workflow discovery §18).  
6. Export feedback to Archie **before** D4 schema refinement or production UI branch.

**Success criterion:** Staff can describe their day using prototype screen names without reverting to spreadsheet vocabulary.

---

## 12. Relationship to First Implementation Slice

`docs/FREDASOFT_PROJECT_IMPLEMENTATION_READINESS_PLAN.md` proposed **manual TDLR source snapshot + Project link review** as Phase 3.

`docs/FREDASOFT_PROJECT_DAILY_WORKFLOW_DISCOVERY.md` §18 suggests daily work may require a **thin internal project intake shell** **before or alongside** TDLR link review.

**This prototype should:**

- Exercise **intake + parties + status + assignment + payment** enough to judge spreadsheet replacement value  
- Exercise **TDLR snapshot panel** enough to judge dual-track clarity  
- Produce evidence for **A / B / C** slice choice—not presume TDLR-only v1  

Prototype feedback **does not** authorize backend work; it informs the next planning commit only.

---

## 13. Explicit Non-Goals

- Production UI or shipped PM feature  
- Firestore schema decisions or collection names  
- Firebase / Auth / Storage integration  
- Client portal (D8)  
- SMS or email automation  
- Real document storage or virus scan  
- Live TDLR/TABS integration or scraping (D6)  
- Full correspondence template engine (D7)  
- Full RBAC permission matrix  
- Automatic creation of reports, correspondence, or stakeholders from TDLR  
- Porting legacy Access app screens  

---

## 14. Open Questions

| # | Question |
|---|----------|
| 1 | Should prototype live **inside FREDAsoft app** as dev-only route, or **outside** (standalone HTML/Storybook)? |
| 2 | **Code-based** clickable mock vs Figma vs markdown walkthrough with screenshots? |
| 3 | Which screens are **must-have** for first staff review session (minimum viable walkthrough)? |
| 4 | Which **mock project scenarios** are most realistic for OCG (pick 2 for v1 prototype build)? |
| 5 | How much **payment detail** is needed in prototype (single line vs multi-service ledger)? |
| 6 | How much **document workflow** (gates, checklists) vs simple attachment list? |
| 7 | What **feedback format** should Kathy/Jessica use (in-app checklist, Google Doc, printed form)? |
| 8 | Should RAS reviewers get a **separate simplified** layout or role toggle on same screens? |
| 9 | After prototype, does Archie #11 close with **slice decision doc** before any implementation branch? |

---

## 15. Related Documentation

| Document | Relevance |
|----------|-----------|
| `docs/FREDASOFT_PROJECT_DAILY_WORKFLOW_DISCOVERY.md` | Primary workflow vocabulary and statuses |
| `docs/FREDASOFT_PROJECT_IMPLEMENTATION_READINESS_PLAN.md` | Sequencing and first slice options |
| `docs/FREDASOFT_PROJECT_TDLR_REVIEW_WORKFLOW.md` | D2 — future TDLR staff review (source panel reference) |
| `docs/FREDASOFT_PROJECT_TDLR_SCHEMA_SKETCH.md` | D4 — defer naming until after prototype |
| `docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md` | D5 — parties and Client ≠ Owner |
| `docs/FREDASOFT_PROJECT_CORRESPONDENCE_REQUIREMENTS_CROSSWALK.md` | D7 — correspondence tab scope |
| `docs/FREDASOFT_PROJECT_PORTAL_STAKEHOLDER_IMPLICATIONS.md` | D8 — portal not in prototype |
| `docs/ARCHITECTURE_DESIGN.md` | DECIDED D1–D8 |
| `docs/FULL_PROJECT_HISTORY.md` | Phase 6 discovery history |
| `docs/ArchieHistory.md` | Archie #10 wrap-up; Archie #11 context |

---

*End wireframe/prototype plan — Archie #11.*
