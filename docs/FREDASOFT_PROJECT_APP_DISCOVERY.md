# FREDAsoft Project App — Lovable Prototype Discovery

**Status:** Discovery and architecture analysis only (documentation). **Not implemented.**  
**Last updated:** 2026-06-04  
**Branch context:** `project-app-discovery`  
**Audience:** Product owner (Kenneth), architecture review (Archie), implementation planning

> **Disclaimer:** This document analyzes a **Lovable/Supabase prototype** (“RASware” UI branding in the prototype) as a **requirements and workflow source**. It does **not** assert TDLR legal compliance, final FREDAsoft data models, or production readiness. It does **not** authorize porting prototype code, schema, or operational data into FREDAsoft.

---

## 1. Purpose, scope, disclaimer

### Purpose

Capture what the external **Project-management prototype** appears designed to do, how it differs from **FREDAsoft today**, and how it relates to **planned RAS work**—so future FREDAsoft **Project** surfaces can be designed deliberately on **Firebase/Firestore**, not by transplanting Supabase/React code.

### In scope

- Read-only inspection of prototype layout, routes, generated types, SQL migrations (structure only), and UI patterns.
- Gap analysis vs FREDAsoft **Client → Facility → Project → projectData** model and **reporting workflows**.
- **Requirement candidates**, **workflow candidates**, and **UI references** tagged explicitly—not final product decisions.

### Out of scope

| Topic | Note |
|-------|------|
| **Porting Lovable code** | No React components, hooks, or Supabase queries copied into FREDAsoft. |
| **Supabase schema / migrations** | `tbl*` tables and RLS SQL are **prototype artifacts** for field/workflow discovery only. |
| **Edge functions** | Backup, PDF correspondence, invitations, etc.—behavior described conceptually only. |
| **Firebase/Firestore design** | Remains **separate and future**; this doc does not specify collections, rules, or migrations. |
| **Inspection Data Entry** | Prototype has **no** `projectData`-equivalent (findings, recommendations, glossary). |
| **FREDAsoft reporting engine** | Report Preview, Web Report Viewer, Project Audit—not replaced by prototype `/reports` shell. |
| **Operational CSV exports** | Files under prototype `database-export/` may contain **PII**; **not copied, committed, or quoted** in this doc (column metadata from `table-structures.csv` only). |
| **Secrets** | No API keys, service-role values, or credentials reproduced here. |

### Tagging convention

Throughout this document:

- **Requirement candidate** — field, rule, or capability worth evaluating for FREDAsoft.
- **Workflow candidate** — user journey step sequence worth evaluating.
- **UI reference** — layout or interaction pattern worth evaluating (not a component to copy).

---

## 2. Sources inspected

### External (outside `C:\dev\fredasoft`)

| Source | Location | How used |
|--------|----------|----------|
| Prototype zip | `C:\dev\LovableApp\codebase.zip` | Extracted to `C:\dev\LovableApp\extracted\` |
| Application root | `...\extracted\codebase-clean\` | Routes, pages, components, hooks |
| Supabase integration | `src/integrations/supabase/types.ts`, `client.ts` | Table/column inventory (types only) |
| SQL migrations | `supabase/migrations/*.sql` | Table creation patterns (not imported) |
| Edge functions | `supabase/functions/*` | Capability list (names only) |
| Schema metadata | `database-export/table-structures.csv` | Column names/types only—**no row data** |
| E2E tests | `tests/e2e/*.spec.ts` | Intended journeys (file names only) |
| Package manifest | `package.json` | Stack identification |

**Secret-risk scan (filenames only):** No `.env` files in the extracted tree. `client.ts` uses placeholder `YOUR_SUPABASE_URL` / `YOUR_SUPABASE_ANON_KEY`. Edge functions reference `SUPABASE_SERVICE_ROLE_KEY` via runtime env (names only). Test helpers reference `process.env.TEST_PASSWORD` (not documented). **No secret values are printed in this document.**

### FREDAsoft (read-only docs)

| Document | Use |
|----------|------|
| `docs/ARCHITECTURE_DESIGN.md` | Client/Facility/Project, `projectData`, reporting, preferences, listeners |
| `docs/CONVERT_TO_RAS.md` | RAS project type, report instances, assessment vs RAS |
| `docs/CLIENT_PORTAL_SPEC.md` | Future portal hierarchy (reference) |
| `docs/REPORTING_SPEC.md` | Assessment report ordering (reference) |

**Not inspected on this branch:** `src/**`, Firestore rules, `package.json`, live Firestore data.

---

## 3. Executive summary

The Lovable prototype is a **standalone Project-registration and stakeholder-management application** built on **Supabase (Postgres) + React**, branded in the UI as **RASware**. It centers on **`tblproject`** records with rich **TDLR-oriented metadata** (e.g. TABS number, plan review / inspection dates and fees, project status lifecycle), **multi-type stakeholders** (Owner, Design firm, RAS firm, Tenant, Agent, Misc), and **administrative** features (roles, backups, correspondence templates, profile approval).

**FREDAsoft today** is a **Firebase/Firestore** inspection platform whose operational core is **assessment Data Entry** (`projectData`: findings, recommendations, standards, costs, photos) under **Client → Facility → Project**, plus mature **reporting workflows** (PDF / Web Report) and **Project Audit**. Project portfolio management in FREDAsoft is lighter than the prototype’s dedicated project hub.

**The prototype is not a substitute for FREDAsoft reporting or inspection workflows.** It is a **requirements source** for a possible future **FREDAsoft Project app** (or expanded project shell)—especially **project metadata**, **stakeholder roster**, **milestone dates/fees**, and **list UX**—while **RAS plan review** and **RAS inspection** record capture remain governed by **`docs/CONVERT_TO_RAS.md`** and separate glossary/`rasFindings` work.

**No code, schema, edge functions, or CSV row data should be ported** into FREDAsoft from this prototype.

---

## 4. Lovable stack and repo layout

### Technology stack

| Layer | Technology |
|-------|------------|
| Build | Vite 5 |
| UI | React 18, TypeScript |
| Styling | Tailwind CSS, shadcn/ui (Radix primitives) |
| Routing | react-router-dom v6 |
| Forms | react-hook-form + zod |
| Server state | TanStack React Query |
| Backend | Supabase (Auth, Postgres, Storage, Edge Functions) |
| Tests | Vitest, Playwright, Testing Library |
| Tooling | ESLint, `lovable-tagger` (Lovable platform) |

### Repository layout (prototype)

```text
codebase-clean/
├── src/
│   ├── pages/           # Route-level screens (~33)
│   ├── components/      # Domain + ui/ (shadcn)
│   ├── hooks/
│   ├── contexts/        # AuthContext
│   ├── integrations/supabase/
│   └── lib/
├── supabase/
│   ├── migrations/      # Postgres schema evolution
│   └── functions/       # Deno edge functions
├── database-export/     # CSV dumps (PII risk—metadata only used here)
├── tests/e2e/
└── public/
```

**UI reference:** Standard Lovable export—thin `src/`, heavy page components, generated `types.ts`.

---

## 5. Domain model / entities / relationships

Prototype table names (`tbl*`, lowercase in generated types) are **artifacts only**. Below they are summarized as **entities** for requirements discussion.

### Core hub

| Prototype entity | Role | FREDAsoft analogue (conceptual) |
|------------------|------|----------------------------------|
| **`tblproject`** | Central project record: name, address, status, TABS/OCG, dates, fees, flags | **Project** (+ some fields may belong on **Facility** or future **RAS report instance**) |
| **`tblprojectstakeholder`** | Links project → stakeholder row in a typed firm/owner table | *No direct equivalent*—partially **Client** / contacts / future project team |
| **`tblowner`** / **`tblownercontact`** | Building owner org + contacts | **Requirement candidate:** Owner as party distinct from **Client** |
| **Firm + contact tables** | `tbldesignfirm`, `tblrasfirm`, `tbltenantfirm`, `tblagentfirm`, `tblmiscfirm` (+ contacts) | Stakeholder taxonomy—not FREDAsoft glossary |

### Geography / address

| Prototype entity | Role |
|------------------|------|
| **`tblcity`**, **`tblcounty`**, **`tblcitycounty`** | Normalized city/county with relationships |
| **`tbladdress`** | Reusable address records with optional overrides |

**UI reference:** City/county **cascading combobox** on project and firm forms.

### Platform / admin

| Prototype entity | Role |
|------------------|------|
| **`profiles`** | User profile extension |
| **`user_roles`**, **`permissions`**, **`role_*`** | RBAC, templates, audit |
| **`correspondence_templates`**, **`correspondence_records`** | Letter/document tracking |
| **`backup_*`**, **`bulk_operations`** | Admin operations |
| **`profile_approvals`**, **`user_invitations`** | Stakeholder-linked profile workflow |

### Relationship sketch (prototype)

```text
tblproject
  ├── tblprojectstakeholder → (tblowner | tbldesignfirm | tblrasfirm | tbltenantfirm | tblagentfirm | tblmiscfirm)
  │                              └── *contact tables
  └── (inline project address fields + facility_name text)

profiles ←→ user_roles
correspondence_* (parallel track to project)
```

**Not in prototype:** **Client**, **Facility**, **`projectData`**, findings, recommendations, glossary, `master_standards`, locations (as inspection areas), photos on records.

---

## 6. Auth, roles, and permissions intent

### Auth model (prototype)

- **Supabase Auth** with session persisted in **localStorage** (`AuthContext`).
- **`ProtectedRoute`** wraps authenticated routes.
- **`profiles`** row per user; role checks via **`user_roles`** and RPCs (e.g. `has_role` for `admin` / `user`).

### Roles (observed)

| Role | Typical use (inferred) |
|------|----------------------|
| **admin** | Admin dashboard, backups, bulk ops, user management |
| **user** | Standard authenticated staff |
| **viewer** | Fallback / read-oriented |

**Requirement candidate:** Differentiated staff vs read-only access for project portfolio.

**Workflow candidate:** Profile **approval** before stakeholder-linked identities are active (`profile_approvals`, stakeholder invitation edge function).

### Permissions (prototype)

- Tables: `permissions`, `role_permissions`, `user_resource_permissions`, `role_templates`, `role_audit_log`.
- SQL migrations reference **RLS** and **service_role**-only access for sensitive columns (e.g. session tokens).

**Not porting:** Postgres RLS policies or Supabase RPC definitions. **FREDAsoft** future design remains **Firestore rules** + app-level checks (see `ARCHITECTURE_DESIGN.md`—query scoping is not yet a security boundary).

---

## 7. User journeys / workflows

Tagged as **workflow candidate** unless noted.

### Authentication

| Step | Prototype route | Notes |
|------|-----------------|-------|
| Sign in / sign up | `/auth` | Email/password |
| Landing | `/` | Index |

### Portfolio / dashboard

| Step | Route | Notes |
|------|-------|-------|
| Dashboard | `/dashboard` | Stats cards, navigation to Projects, Stakeholders modal |
| Settings | `/settings` | Profile/password |

**UI reference:** Dashboard **navigation cards** + breadcrumbs.

### Project lifecycle

| Step | Route | Notes |
|------|-------|-------|
| List projects | `/projects` | Search, column filters, sort, column picker, delete |
| Create project | `/projects/new` → `ProjectDetail` | Large single-page form |
| Edit project | `/projects/:projectId` | Same form with load/save |
| Import | `/projects/import` | CSV-oriented import path |

**Workflow candidate:** Project **status** progression (enum observed in form schema: e.g. Project Registered → Review Complete → Inspection Complete → Project Closed).

**Workflow candidate:** **Milestone dates** block (registered, plans reviewed, inspection, special inspection, fees received, sent to RAS, returned to TDLR, closed, etc.).

**Workflow candidate:** **Fee fields** (plan review, inspection, special inspection) with received-date pairs.

### Stakeholder attachment (per project)

| Step | Route | Notes |
|------|-------|-------|
| Choose type | `/projects/:id/stakeholders/select-type` | Tenant, Agent, Designer, RAS, Misc, Owner |
| Add firm/owner | Type-specific routes under project | Reuses global firm entry patterns |

**Workflow candidate:** **Search-first** firm/contact pick (minimum character thresholds on search pages).

**Workflow candidate:** **Primary stakeholder** flag on `tblprojectstakeholder`.

### Global stakeholder maintenance

Parallel routes for create/search without project context, e.g.:

- `/owner-entry`, `/owner-contact-search`
- `/design-firm-entry`, `/ras-firm-entry`, `/tenant-firm-entry`, `/agent-firm-entry`, `/misc-firm-entry`
- Matching `*-contact-search` routes

**Workflow candidate:** Maintain **reusable directory** of firms/contacts, then link to projects.

### Correspondence

| Step | Route | Notes |
|------|-------|-------|
| Manage correspondence | `/correspondence-management` | Templates/records |
| PDF generation | Edge function `generate-pdf-correspondence` | Merge fields—concept only |

**Requirement candidate:** Track outgoing letters tied to project milestones (separate from inspection **reporting workflows**).

### Admin

| Step | Route | Notes |
|------|-------|-------|
| Admin dashboard | `/admin`, `/admin-dashboard` | User mgmt, backup, bulk role, city/county import |
| Test flows | `/test-stakeholder-flows` | Internal QA page |

### Reports (prototype)

| Step | Route | Notes |
|------|-------|-------|
| Reports hub | `/reports` | Sidebar shell; **not** FREDAsoft Report Preview / Web Report |

**Gap note:** Prototype **Reports** is a **UI reference** for navigation placeholder, not a spec for assessment/RAS deliverable PDFs.

### Orphan / unused (observed)

- `src/pages/Clients.tsx` exists but is **not registered** in `App.tsx`—likely abandoned Lovable screen.

---

## 8. UI/UX patterns to consider

| Pattern | Where seen | FREDAsoft tag |
|---------|------------|---------------|
| **Sectioned project form** (collapsible dates, financials, stakeholders) | `ProjectDetail`, `DateSection`, `FinancialSection` | **UI reference** |
| **Stakeholder type modal** then dedicated flow | Dashboard, `StakeholderTypeModal` | **UI reference** |
| **Unified firm/contact search** | `StakeholderUnifiedSearch`, `*ContactSearch` pages | **UI reference** |
| **Data grid: column picker + filters + sort modal** | `Projects.tsx`, `useColumnPreferences` | **UI reference** for Project list |
| **Unsaved changes guard** | `UnsavedChangesDialog`, `useUnsavedChanges` | **Workflow candidate** |
| **City/county cascading combobox** | `useCityCountyData`, `Combobox` | **UI reference** |
| **Breadcrumbs + back navigation** | Multiple pages | **UI reference** |
| **Toast feedback** | shadcn/sonner | Already common in FREDAsoft patterns |
| **Role-gated admin panels** | `AdminDashboard` | **Requirement candidate** for admin-only tools |

---

## 9. Data field inventory

Column names below come from generated **`types.ts`** / **`table-structures.csv`** metadata only. Mapping to FREDAsoft fields is **requirement candidate**—not a schema decision.

### Project (`tblproject`) — requirement candidates

| Group | Example prototype fields |
|-------|---------------------------|
| Identity | `project_name`, `project_description`, `scope_of_work`, `ocg_number`, `tabs_number` |
| Status | `project_status` (enum) |
| Site | `facility_name`, `fldprojectaddress`, `fldprojectaddress2`, `fldprojectcity`, `fldprojectstate`, `fldprojectzip`, `fldprojectcounty`, `fldprojectcountry` |
| Classification | `work_type`, `funding_type`, `tenant_only_funding`, `inspection_only`, `fldstatelease`, `fldspecialcategory`, `fldroadway`, `fld_state_lease_number` |
| Scale / cost estimate | `square_feet`, `estimated_cost` |
| Registration | `registered_by`, `registrant_phone`, `project_registered_date` |
| Milestone dates | `start_date`, `completion_date`, `documents_received_date`, `documents_issued_date`, `plans_reviewed_date`, `pr_fee_received_date`, `inspection_date`, `inspection_fee_received_date`, `special_inspection_date`, `si_fee_received_date`, `special_inspection_2_date`, `si_fee_2_received_date`, `project_approved_letter_sent_date`, `sent_to_ras_date`, `returned_to_tdlr_date`, `project_closed_date`, `inspection_report_sent_date` |
| Fees | `plan_review_fee`, `inspection_fee`, `special_inspection_fee` |
| Notes | `comments` |
| Audit | `created_at`, `updated_at`, `created_by`, `updated_by` |

**FREDAsoft mapping notes:**

- **`tabs_number`**, RAS/TDLR dates, and fee fields align with **RAS plan review** / **RAS inspection** planning in `CONVERT_TO_RAS.md` §11—likely on **Project** or future **RAS report instance**, not on `projectData` rows.
- **`facility_name`** on project may overlap FREDAsoft **Facility** (`fldFacName`)—entity binding TBD.
- **`ocg_number`** may map to operational project number fields—confirm with Kenneth.

### Project stakeholder link (`tblprojectstakeholder`)

| Field | Requirement candidate |
|-------|----------------------|
| `project_id` | Link to Project |
| `stakeholder_table_name` + `stakeholder_record_id` | Polymorphic association pattern |
| `role_description`, `is_primary`, `start_date`, `end_date` | Roster semantics |

### Stakeholder firms / contacts (prototype `tbl*`)

Each firm type has firm + contact tables (name, address, phone, email, active flag, audit columns). **Requirement candidate:** Texas accessibility projects need **Designer**, **RAS**, **Owner**, **Tenant**, **Agent** parties.

### Correspondence

| Entity | Requirement candidate |
|--------|----------------------|
| `correspondence_templates` | Letter templates with merge fields |
| `correspondence_records` | Sent/generated document log |

### Not in prototype (FREDAsoft core)

| FREDAsoft concept | Note |
|-------------------|------|
| **Client** | Top-level portfolio owner in FREDAsoft |
| **Facility** | Building/site under Client |
| **projectData** | Inspection/assessment records |
| **Glossary / library** | Categories, items, findings, recommendations |
| **Locations** | Inspection areas within project |
| **Report snapshots** | PDF/Web Report from `projectData` |

---

## 10. Gap analysis: Lovable vs FREDAsoft today

| Dimension | Lovable prototype | FREDAsoft today |
|-----------|-------------------|-----------------|
| **Primary database** | Supabase Postgres | Firestore (`freda-enterprise`) |
| **Hierarchy** | Project-centric + stakeholders | **Client → Facility → Project** |
| **Core work surface** | Project registration & roster | **Data Entry** + **projectData** |
| **Inspection records** | None | Findings, recs, standards, costs, photos |
| **Reporting workflows** | Placeholder `/reports` + correspondence PDF | **Report Preview**, **Web Report**, print |
| **Project Audit** | None | Assessment QA on `projectData` |
| **Glossary / TAS library** | None | Masters + glossary sets |
| **User preferences** | Column prefs per page (Supabase table) | `userPreferences` for workspace context |
| **Trash / soft delete** | Project delete dialog | Soft delete on major entities + admin Trash |
| **Auth** | Supabase Auth + roles | Firebase Auth (rules evolution planned) |

### Requirement candidates from gaps

1. **Rich project metadata** (TABS, fees, milestone dates) is **missing or sparse** in FREDAsoft Project UI today—prototype defines a **workflow candidate** checklist.
2. **Stakeholder directory** (Owner, RAS firm, Designer, etc.) is **not modeled** like FREDAsoft **Client**—may be additive, not a replacement.
3. **FREDAsoft must keep** `projectData` and **reporting workflows** as authoritative inspection/assessment path; prototype does not replace them.

### UI references worth cherry-picking (not copying code)

- Project **list** with configurable columns and persisted filters.
- **Sectioned** project detail form with dates and financials separated from core identity fields.

---

## 11. Gap analysis: Lovable vs FREDAsoft RAS direction

From **`docs/CONVERT_TO_RAS.md`** (planning only):

| RAS planning topic | Prototype overlap | Gap |
|--------------------|-------------------|-----|
| **Project type `ras`** | Implicit (RASware branding, RAS firm entities, RAS dates) | Prototype does not implement FREDAsoft **project type** flag or TAS 2012-only glossary enforcement |
| **RAS report instances** | Single `tblproject` with many date fields | CONVERT_TO_RAS expects **multiple report instances** per project (Preliminary/Revised/Official Plan Review; Special/Official Inspection) |
| **RAS Data Entry** | None | Prototype has no comment-only records |
| **`rasFindings` library** | None | Separate FREDAsoft track (`content/ras-findings/batches/`, style guide) |
| **Plan Review metadata** (sheet/detail #, location) | Partial (`facility_name`, address) | Header fields in CONVERT_TO_RAS §11 largely **not** in prototype |
| **No rec/cost on RAS** | Project fees exist (administrative) | Fee fields are **project admin**, not inspection cost columns—do not conflate |

**Requirement candidates** for RAS from prototype:

- **Milestone date** fields may inform **report instance** or **project-level** RAS tracking (which date applies to which report kind—**open question**).
- **RAS firm / contact** directory aligns with **RAS Name / #** and correspondence parties in CONVERT_TO_RAS §11.

**Explicit non-goals:** Importing prototype schema to implement RAS inspection or Plan Review **comment** capture.

---

## 12. What not to port

| Category | Reason |
|----------|--------|
| **All `src/` React/TS** | Wrong stack integration (Supabase vs Firestore); generated page size / duplication |
| **`supabase/migrations`** | Postgres ≠ Firestore; `tbl*` naming not FREDAsoft convention |
| **Edge functions** (backup, PDF, invitations, phone format, city-county populate) | Separate ops/product decisions; Deno/Supabase runtime |
| **`database-export/*.csv` rows** | PII / operational data |
| **`package.json` / lockfile** | No new FREDAsoft dependencies from prototype |
| **Supabase Auth + RLS model** | FREDAsoft uses Firebase Auth; rules TBD separately |
| **E2E tests** | Tied to live Supabase + test credentials |
| **Lovable README URL** | Platform metadata only |

---

## 13. Recommended FREDAsoft product directions

Options for architecture review—not decisions.

### Option A — Metadata enrichment only

Keep FREDAsoft navigation; add **Project detail** fields and milestone dates inspired by prototype inventory. **Lowest risk.** Stakeholders remain manual or deferred.

### Option B — Project hub module (new surface)

Add a dedicated **Project app** area: portfolio list (UI reference from prototype) + detail form + optional stakeholder directory. **Data Entry** and **reporting workflows** unchanged. Firestore schema designed fresh.

### Option C — RAS admin shell first

Implement RAS-specific **project + report instance** metadata (per CONVERT_TO_RAS) using prototype **date/fee** fields as **requirement candidates**, without full stakeholder taxonomy.

### Option D — Correspondence track (separate)

Track correspondence/merge documents as optional module—do not merge with Report Preview PDF pipeline.

**Recommendation for discovery phase:** Shortlist **Option A + B** for Kenneth/Archie review; keep **C** aligned with RAS phase order in CONVERT_TO_RAS; treat **D** as optional later.

---

## 14. Open questions for Kenneth / Archie

1. Is the Lovable prototype the intended UX for a **FREDAsoft Project app**, or only a **field checklist** for Project records?
2. Should **Owner** and **stakeholder firms** exist in FREDAsoft, or should parties map onto **Client** (+ contacts) only?
3. Where should **TABS #**, **OCG #**, and **fee/date milestones** live: **Project**, **Facility**, or **RAS report instance**?
4. Is **correspondence / merge-letter PDF** in scope for FREDAsoft, separate from inspection reports?
5. Should FREDAsoft adopt **project list column preferences** (prototype pattern) for the portfolio grid?
6. Is any **live Supabase** environment still authoritative, or is the zip **archive-only**?
7. How should prototype **Reports** relate to **Report Preview** and **Web Report Viewer**? (Expected answer: unrelated.)
8. **Import** (`/projects/import`)—required for migration from legacy systems?
9. For **RAS plan review** vs **RAS inspection**, which prototype dates map to which **report kind**?
10. Does **facility_name** on prototype project duplicate FREDAsoft **Facility**, or replace it for RAS-only projects?

---

## 15. Product-owner domain clarification: TDLR records, canonical stakeholders, correspondence, and portal direction

**Source:** Kenneth (product owner), 2026-06 follow-up to this discovery doc.  
**Status:** Architecture and requirements **implications** only—not implementation decisions, Firestore schema, or porting from the Lovable prototype.

### Dual-track data: TDLR registration vs canonical stakeholders

1. **TDLR registration data** must be **preserved as recorded**—it is the **legal / source registration record** and must not be silently replaced by internal cleanup.
2. **Canonical internal stakeholders** (Owner, Designer, RAS firm, Tenant, Agent, etc.) are a **separate track** from raw party names and addresses as they appeared on TDLR registration.
3. **Name, address, and entity variations are expected.** Multiple raw variants may **link to one canonical stakeholder**; the system should tolerate inconsistency across sources and time.
4. **Normalization** should support **aliases / observed names**, **review**, and **matching** workflows—not blind overwrite of canonical records from a single scraped or imported row.

**Architecture implication:** FREDAsoft should plan for **immutable-or-audited TDLR snapshots** plus a **maintained canonical stakeholder directory** with explicit linkage, not a single flattened “project party” table copied from prototype `tbl*` shapes.

### TDLR extraction / scraping (separate pipeline)

5. **TDLR data extraction or scraping** is a **separate pipeline**, not inline project form entry. **Requirement candidate** capabilities include:
   - source page / source reference per extraction run
   - extraction logs (when, what URL or source, success/failure)
   - parsed fields stored distinctly from reviewed/canonical data
   - human **review** before parsed values promote to trusted internal use

**Architecture implication:** Do not conflate “save project” in the Project app with “ingest TDLR HTML/PDF/API output.” Prototype manual entry and import paths are **UI references** only.

### Correspondence vs inspection reporting

6. **Correspondence templates** and **formatted PDF letters** (merge fields, milestone-triggered letters) are **first-class requirements**, **separate** from **inspection report PDF generation** (Report Preview, Web Report Viewer, assessment/RAS deliverable reports).

**Architecture implication:** Aligns with discovery **Option D** and Lovable `correspondence_*` tables as **workflow candidates**—not substitutes for `projectData`-driven reporting workflows.

### Client portal direction (extends `CLIENT_PORTAL_SPEC.md`)

7. **Client portal** scope (future) includes, per project: **project progress**, **project information**, **reports** (published deliverables), and **client-submitted updates** to company / contact / address data.
8. Client-submitted updates should **likely be reviewed and approved** before they modify **canonical** Client, Facility, contact, or stakeholder records—submissions are **workflow candidates**, not automatic writes.
9. Portal access implies a future **roles / project membership / published-report access** model (who sees which project, which report instances, and what they may edit vs view).

**Cross-reference:** `docs/CLIENT_PORTAL_SPEC.md` today emphasizes the portal as an **interactive expanded report workspace** (findings, photos, sorting). Kenneth’s clarification adds **project administration and master-data stewardship** as portal-adjacent requirements—not yet fully specified in that doc.

### What this does not decide

10. Collection names, Firestore rules, UI routes, scraping technology, and approval UX remain **open** for Archie review and phased discovery (§16). This section **narrows intent**; it does not authorize implementation or Supabase/Lovable porting.

---

## 16. Suggested phased discovery follow-ups

| Phase | Deliverable | Depends on |
|-------|-------------|------------|
| **D1** | Field-level **mapping spreadsheet** (prototype column → FREDAsoft candidate field) | Answers to §14 Q3, Q10 |
| **D2** | **Workflow wireframes** (ASCII or external) for Project hub vs Data Entry entry points | Option A/B/C choice |
| **D3** | **RAS report instance** field spec crosswalk (CONVERT_TO_RAS §11 ↔ prototype dates) | RAS phase approval |
| **D4** | **Firestore schema sketch** (docs only)—separate branch, no implementation | ARCHITECTURE_DESIGN ✅ DECIDED process |
| **D5** | Stakeholder model decision (directory vs Client-only; dual-track TDLR vs canonical per §15) | Q1, Q2; §15 |
| **D6** | TDLR extraction pipeline sketch (source, log, parsed, review) | §15 points 5–6 |
| **D7** | Correspondence template + PDF letter requirements spec | §15 point 6; Option D |
| **D8** | Portal submission + approval workflow (canonical record updates) | §15 points 7–9; `CLIENT_PORTAL_SPEC.md` |

**Not suggested:** Supabase→Firestore migration scripts, copying edge functions, or importing `database-export` CSVs into the repo.

---

## 17. Related FREDAsoft documentation index

| Document | Relevance |
|----------|-----------|
| **`docs/ARCHITECTURE_DESIGN.md`** | Client/Facility/Project, `projectData`, reporting, listeners, preferences |
| **`docs/CONVERT_TO_RAS.md`** | RAS project type, report instances, plan review vs inspection |
| **`docs/CLIENT_PORTAL_SPEC.md`** | Future Client → Project → Facility → Reports hierarchy |
| **`docs/REPORTING_SPEC.md`** | Assessment report ordering (distinct from prototype Reports) |
| **`docs/RAS_FINDING_AUTHORING_STYLE.md`** | RAS Plan Review library prose (separate from Project app) |
| **`docs/RAS_FINDINGS_IMPORT_FORMAT.md`** | `rasFindings` import (not prototype) |
| **`AGENTS.md`** | Protected areas, no Firestore writes without approval |

---

## Document control

| Item | Value |
|------|-------|
| Created | 2026-06-04 |
| Updated | 2026-06-04 (§15 product-owner domain clarification) |
| Prototype path | `C:\dev\LovableApp\extracted\codebase-clean\` (external) |
| FREDAsoft implementation | **None** on this branch |
| Secrets in doc | **None** |
| PII / CSV row content in doc | **None** |
