# FREDAsoft Project — Implementation Readiness Plan

**Status:** Documentation-only planning checkpoint (Archie #11). **Not implementation.**  
**Last updated:** 2026-06-05  
**Branch context:** `archie-11-implementation-readiness`  
**Audience:** Product owner (Kenneth), architecture review (Archie), implementation planning

> **Disclaimer:** This document defines a **recommended implementation sequence** and **first vertical slice** after the Archie #10 D1–D8 discovery chain. It does **not** authorize code, Firestore schema, security rules, scrapers, importers, migrations, or UI delivery.

---

## Purpose

Summarize where the **Project / TDLR / RAS management layer** stands after Archie #10 and define the **next safe implementation sequence**—so later work stays aligned with dual-track architecture and does not skip staff review or auto-create operational records from TDLR source data.

**Grounding:** Archie #10 wrap-up (`docs/ArchieHistory.md`); Phase 6 history (`docs/FULL_PROJECT_HISTORY.md`); ✅ DECIDED blocks in `docs/ARCHITECTURE_DESIGN.md`; D1–D8 artifacts and D5/D6 supporting docs listed below.

---

## Current Readiness Summary

| Area | State |
|------|--------|
| **Conceptual architecture** | **Strong.** Dual-track TDLR source vs canonical operational data is documented across D1–D8, with review workflow (D2), schema sketch (D4), report/correspondence/portal boundaries (D3, D7, D8), and stakeholder model (D5). |
| **TDLR / Project-management implementation** | **Not yet built.** No Firestore source-track collections, review queue, approved links, or TDLR ingest in production code. |
| **FREDAsoft today** | **Client → Facility → Project**, **projectData** / reporting workflows, and RAS conversion planning exist; **no** stakeholder directory, TDLR snapshot track, or project-party model in app code. |
| **UI** | **Not the immediate next step** except **light wireframing** tied to the first vertical slice. Full six-screen D2 UI is a later phase—not v1 build scope. |

Discovery outputs are **decision-supporting**, not final schema or automation rules. Implementation must **re-ground** in D1–D8 before each slice.

---

## Durable Architecture Rule

Carry forward unchanged from Archie #10:

- TDLR/TABS source data is **legal/as-recorded source data**.
- It remains **separate** from FREDAsoft **canonical/operational** data.
- FREDAsoft **does not overwrite or correct** TDLR data.
- Candidate matches, portal submissions, report hints, correspondence hints, aliases, project/facility/stakeholder links, and recipient bindings require **explicit staff review**.
- Only **approved** associations become explicit match/link/alias records.
- **No** report, correspondence artifact, portal account, or canonical update is **auto-created** from TDLR status or source data alone.

---

## Recommended Implementation Sequence

Phases are **sequential in intent**; each should ship as **one small branch / slice** with lint/build and manual verification before merge.

| Phase | Focus | Primary doc inputs |
|-------|--------|-------------------|
| **1 — Implementation readiness** | This plan; vertical slice definition; staff workflow discovery (see Final recommendation) | Archie #10 wrap-up; D2; D4 |
| **2 — D4 schema refinement** | Finalize **collection boundaries** and naming for source track vs canonical; no broad refactor | `docs/FREDASOFT_PROJECT_TDLR_SCHEMA_SKETCH.md` |
| **3 — Manual source snapshot + Project link review** | **First buildable vertical slice** (below)—manual ingest, compare, approve link, audit | D2 Screens 1–3, 6 (subset); D1; D4 |
| **4 — Extraction / import dry-run support** | Logged intake, pasted/export row attach, metadata-only captures; **dry run**, no silent promotion | D6; source index |
| **5 — Staff review queue UI** | Expand toward D2 Screens 4–6: party match, field diff, draft suggestions | D2; D5; D1 |
| **6 — Report / correspondence linkage** | Assistive hints only; staff publication and recipient binding | D3; D7; `docs/CONVERT_TO_RAS.md` |
| **7 — Portal / auth role matrix** | Roles, invitation, rules sketch; portal proposals queue | D8; auth design (future) |

**Do not** start Phase 4 scrapers or Phase 7 portal before Phase 3 proves the review-and-link pattern on manual data.

---

## Recommended First Buildable Vertical Slice

**Scope:** **Manual TDLR source snapshot + Project link review** (Phase 3).

| In scope | Out of scope (this slice) |
|----------|---------------------------|
| Staff **manually** creates or attaches a **source snapshot** (paste, form entry, or single export row—minimal field set TBD) | Scraping, scheduled re-scrape, bulk import |
| Snapshot stored on **source track** separately from canonical **Project** | Auto-create or mutate canonical Project from TDLR fields |
| UI shows **read-only** snapshot summary + **candidate** FREDAsoft Project/Facility comparison | Full six-screen D2; party roster; field-level diff |
| Staff actions: **approve link**, **reject**, **defer**, **create new link record** (explicit) | Auto-merge; overwrite TDLR or canonical fields |
| **Audit event** on submit (who, when, snapshot id, outcome) | Portal, correspondence, report instances |

**Behavioral anchor:** Implements the **thinnest** path through D2—intake → snapshot summary → Project/Facility match → approval summary—without automation beyond assistive display.

---

## Explicit Non-Goals — First Implementation Slice

- No **automatic canonical Project creation** from TDLR data  
- No **automatic stakeholder / contact creation**  
- No **portal account** creation or invitation  
- No **correspondence** generation or templates  
- No **report instance** auto-creation from TDLR status or milestones  
- No **scraper / importer** in the first slice  
- No **security rules** or migration batch writes without dry-run review and explicit approval  

---

## Open Questions

Resolve before or during Phase 2–3 planning branches:

1. **Staff role** — Who uses the first review surface (internal staff only vs admin-only)? Align with D2 primary actor.  
2. **Minimum manual fields** — What must be entered or pasted for v1 (TABS #, project name, site text, status label, one party row)? Ground in D1 required vs optional rows.  
3. **Host surface** — Which existing FREDAsoft screen or route hosts the first review UI (Project detail, admin queue, separate TDLR review entry)?  
4. **Audit metadata** — Required fields for compliance and replay: reviewer uid, timestamp, snapshot version, comparison baseline, approved link ids, deferred items?  
5. **Workflow discovery timing** — Should a **staff day-in-the-life** doc precede D4 schema refinement, or run in parallel with Phase 1–2? **Recommendation:** capture workflow vocabulary **before** locking collection names (see below).

---

## Final Recommendation

Before substantial implementation, add a **short staff workflow discovery** document (docs-only):

- **Day-in-the-life** for TDLR-linked RAS project work today (tools, queues, handoffs, status vocabulary).  
- **Do not clone** the old Access app—but **mine** it for workflow language, statuses, report types, review queues, and pain points.  
- Use that vocabulary to validate Phase 3 wireframes and Phase 2 schema boundaries against **actual daily work**, not prototype tables alone.

Then proceed: **Phase 1 (this plan) → workflow discovery doc → Phase 2 schema refinement → Phase 3 vertical slice.**

---

## Related Documentation

| Document | Use |
|----------|-----|
| `docs/ArchieHistory.md` | Archie #10 wrap-up checkpoint |
| `docs/FULL_PROJECT_HISTORY.md` | Phase 6 deliverable list |
| `docs/ARCHITECTURE_DESIGN.md` | ✅ DECIDED D1–D8 |
| `docs/FREDASOFT_PROJECT_FIELD_LEVEL_MAPPING.md` | D1 — field concepts and reviewer actions |
| `docs/FREDASOFT_PROJECT_TDLR_REVIEW_WORKFLOW.md` | D2 — target review flow |
| `docs/FREDASOFT_PROJECT_TDLR_SCHEMA_SKETCH.md` | D4 — source-track sketch |
| `docs/FREDASOFT_PROJECT_RAS_REPORT_INSTANCE_CROSSWALK.md` | D3 — defer to Phase 6 |
| `docs/FREDASOFT_PROJECT_CORRESPONDENCE_REQUIREMENTS_CROSSWALK.md` | D7 — defer to Phase 6 |
| `docs/FREDASOFT_PROJECT_PORTAL_STAKEHOLDER_IMPLICATIONS.md` | D8 — defer to Phase 7 |
| `docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md` | D5 — party/canonical model |
| `docs/FREDASOFT_PROJECT_TDLR_EXTRACTION_PIPELINE.md` | D6 — Phase 4+ |
| `docs/reference/TDLR_RAS_TABS_SOURCE_INDEX.md` | Source catalog |
| `docs/FREDASOFT_PROJECT_APP_DISCOVERY.md` | Prototype context; not porting target |
| `docs/CONVERT_TO_RAS.md` | RAS report instances; Phase 6+ |

---

## Non-Goals (This Document)

- Implemented code, schema, rules, or migrations  
- Commitment to dates, team size, or tooling choices  
- Replacing D1–D8 artifacts or reopening discovery without a scoped change request  
