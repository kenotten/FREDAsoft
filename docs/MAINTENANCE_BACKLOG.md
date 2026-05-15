# FREDA Maintenance Backlog
 
 ## Purpose
 
 This document tracks non-critical technical debt, cleanup tasks, and system improvements identified during development. These items are intentionally deferred to avoid disrupting active feature work or stabilization efforts.

**Process:** Prefer **behavior-preserving extractions** and **one small branch per item**. Avoid broad rewrites. Run **`npm run build`** after each change and do **targeted manual smoke tests** (Data Entry drafts, report preview, workspace switch) when behavior could be affected.

---

## Codex / workflow-refactor — architectural analysis follow-up

Cross-check policies already captured in `docs/ARCHITECTURE_DESIGN.md` (persistence ownership, Firestore write boundaries). This section tracks **remaining implementation and refactor work** only.

### 1. Completed cleanup items

The following were completed on the workflow-refactor arc and should not be re-scheduled as open work:

| Item | Notes |
|------|--------|
| Shared ID normalization helper | `src/lib/idUtils.ts` — `normalizeId` / `idsEqual`; callers use shared helper. |
| Glossary Set metadata helper | `glossarySetMetadataForId` in `src/lib/glossarySets.ts`; `GlossaryBuilder` uses it. |
| Persistence and storage ownership | Documented in `ARCHITECTURE_DESIGN.md`. |
| Firestore write safety / maintenance scripts | Documented in `ARCHITECTURE_DESIGN.md`. |
| Browser storage key constants | `src/lib/storageKeys.ts`; sticky selections, drafts, Active Glossary key, Standards Browser session prefixes. |
| Report citation grouping helper | `formatGroupedStandardCitations` moved to `src/lib/reportPreviewShared.ts`. |

### 2. Recommended next safe refactors

Small, **reviewable** extractions; **no** layout, save sequencing, or Firestore contract changes unless explicitly scoped.

* **Data Entry — draft helpers:** Extract pure functions for draft payload shape, context-compatibility checks, and persistability gates from `ProjectDataEntry.tsx` into a `src/lib/` module (or colocated `projectDataEntryDraft.ts`). **Next substantial code task candidate**, but only with **careful line-by-line review** — draft recovery must stay context-safe (client / facility / project / record / mode).
* **Data Entry — save payload builder:** Isolate `sanitizeData`-bound payload assembly into named builders (still called from the same save paths); preserve batch ordering and field names.
* **Data Entry — hydration / reset helpers:** Extract “sync form from `activeRecord`” and “reset to new record” logic into pure or near-pure helpers where possible; keep a single orchestration entry point in the component.
* **ReportPreview — additional pure derivation:** Any remaining sort keys, label strings, or record-derived lists that do not touch refs, layout, or pagination — mirror the `formatGroupedStandardCitations` pattern into `reportPreviewShared.ts`.

### 3. Higher-risk refactors (require fresh review)

Treat as **mini-design reviews**: write a short scope note before coding; prefer feature flags or staged PRs only if justified.

* **ReportPreview — pagination / measurement:** Moving DOM measurement, page slicing, or addendum row virtualization out of `ReportPreview.tsx` is **high regression risk** for print/PDF and section selection. Defer until dedicated time; pair with visual/print smoke tests.

### 4. Do not touch without a specific plan

* **Broad `App.tsx` rewrites** (selection wiring, subscription layout, modal orchestration) — high blast radius.
* **Unifying** `localStorage`, `sessionStorage`, and Firestore preferences **without** an explicit migration spec (see architecture doc).
* **Citation “utility consolidation”** that would **change** report citation fallback or ordering semantics — report output must remain **report-specific**; shared utilities may only deduplicate **identical** logic with tests or side-by-side verification.
* **Any** multi-file “cleanup” PR that mixes behavior, formatting, and dependency churn.

### 5. Suggested next branch

| Priority | Suggested branch name (example) | Scope |
|----------|----------------------------------|--------|
| 1 | `data-entry-draft-helpers` | Draft-only pure helper extraction; no JSX moves in first PR. |
| 2 | `data-entry-payload-builders` | Save payload builders only; unchanged Firestore API usage. |
| 3 | `report-preview-shared-derivations` | Additional pure helpers into `reportPreviewShared.ts` only. |

**Larger themes** (track as separate epics when picked up; still **one small PR per step**):

* **App — selection ownership / typed selection domains:** Gradually replace `any` selection bags with narrow types; do not rename Firestore field names in the same pass.
* **Workspace persistence hook:** Extract Firestore + `localStorage` sticky sync from `App.tsx` behind a hook **without** changing read/write timing in the first iteration.
* **Firestore write abstraction:** Policy is documented; implementation abstraction (thin wrapper, batch helpers) waits until a written call map exists and tests/smoke paths are defined.
* **`ProjectDataEntry.tsx` bloat:** Reduce size **only** via **pure-helper extraction** and **named builders** — not by splitting JSX into many opaque subcomponents in one go.

---

## Current Backlog
 
 ### Dependency Hygiene Review (Post-Stabilization)
 
 **Summary:**
 Review and clean up Node dependencies to ensure long-term stability, security, and maintainability.
 
 **Tasks:**
 
 * Regenerate and standardize `package-lock.json`
 * Document Node version requirement (>=20)
 * Audit PDF generation pipeline (`html2pdf.js`, `html2canvas`) for safe usage
 * Remove unused dependencies (e.g., `is-thirteen`)
 * Verify necessity of `@google/genai`
 * Run `npm audit` and resolve actionable findings
 
 **Priority:** Low
 **Phase:** Post-UI Polish / Pre-Production Hardening
 
 ---
 
 ### Reference Data Manager for Controlled Dropdown Lists
 
 **Summary:**
 Create an admin-facing tool for managing controlled dropdown values used throughout FREDA, so values do not need to be hard-coded or updated directly in code.
 
 **Purpose:**
 Provide a centralized “one-stop shop” for managing app-wide reference lists such as Cost Unit Types, Measurement Units, and other controlled vocabularies.
 
 **Potential Lists:**
 
 * Cost Unit Types: EA, LF, SF, LS, etc.
 * Measurement Units / UOM: %, inches, degrees, seconds, etc.
 * Location / Area labels
 * Inspector roles or titles
 * Other future controlled dropdown values
 
 **Required Concepts:**
 
 * list name / category
 * code value
 * display label
 * description
 * sort order
 * active / inactive status
 * system-locked flag for protected values
 
 **Important Rules:**
 
 * Do not hard-delete values that may have been used in project records
 * Use active/inactive status instead
 * Preserve historical records and reports
 * Keep Cost Unit Types and Measurement Units conceptually separate
 * Avoid mixing physical measurement units with economic cost units
 
 **Priority:** Medium
 **Phase:** Future Admin / Platform Scalability
 **Status:** Deferred
 
 **Notes:**
 For now, dropdown value changes may be handled as one-off code/data updates. This feature should be implemented later when FREDA’s controlled vocabulary needs grow beyond manual maintenance.
 
 ---
 
 ## Guidelines
 
 * Only include non-blocking items
 * Do not include active sprint tasks
 * Do not include architectural changes (those belong in ARCHITECTURE_DESIGN.md)
 * Each entry should be actionable and clearly scoped
 * Update this document as new technical debt or cleanup opportunities are identified
 
 ---
 
 ## Future Sections (Optional)
 
 (Leave placeholders for future expansion)
 
 * Performance Optimization
 * Security Hardening
 * Codebase Refactoring
 * Tooling Improvements
 
 
