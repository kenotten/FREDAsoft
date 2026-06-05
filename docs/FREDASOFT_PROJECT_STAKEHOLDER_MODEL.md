# FREDAsoft Project — Stakeholder Model (D5 Discovery)

**Status:** Documentation-only decision/discovery (D5). **Not implemented.**  
**Last updated:** 2026-06-04  
**Branch context:** `project-stakeholder-model`  
**Audience:** Product owner (Kenneth), architecture review (Archie), implementation planning

> **Disclaimer:** This document defines **requirement candidates**, **workflow candidates**, and **UI references** for FREDAsoft Project stakeholder modeling. It does **not** specify Firestore collections, security rules, migrations, importers, or application code. It does **not** port Lovable/Supabase prototype code or schema. Official **TDLR/TABS** legal requirements are **not asserted here** unless separately sourced (see §18).

---

## 0. Purpose, scope, disclaimer

### Purpose

Formalize how FREDAsoft Project should model **TDLR/RAS registration data**, **canonical internal stakeholders**, **project parties**, **contacts**, **correspondence recipients**, and **future client portal access**—without collapsing legal source records into operational master data.

This doc completes discovery phase **D5** (see **`docs/FREDASOFT_PROJECT_APP_DISCOVERY.md` §16**) and feeds later phases **D4** (Firestore schema sketch), **D6** (TDLR extraction pipeline), **D7** (correspondence), and **D8** (portal approval workflows).

### In scope

- Concept glossary and relationship diagrams
- Party taxonomy (Owner, Design Firm, RAS Firm, Tenant, Agent, Misc)
- Client vs Owner decision space
- Facility relationships
- Dual-track TDLR vs canonical data rules
- Matching/review and portal proposed-change **workflow candidates**
- Correspondence merge-field implications
- Recommended decision options and open questions

### Out of scope

| Topic | Note |
|-------|------|
| Firestore schema / rules | Deferred to **D4** |
| TDLR scraping implementation | Deferred to **D6** |
| Final user roles / permissions | Deferred to later auth design (§12) |
| Lovable code / `tbl*` schema port | Prototype = requirements source only |
| Inspection `projectData` | Unchanged; separate from stakeholder directory |
| Credentials / live TDLR access | Not documented here |

### Tagging convention

- **Requirement candidate** — capability or field worth evaluating  
- **Workflow candidate** — step sequence worth evaluating  
- **UI reference** — layout/interaction pattern from prototype worth evaluating (not code to copy)

---

## 1. Sources and related FREDAsoft documentation

| Source | Use in this doc |
|--------|-----------------|
| **`docs/FREDASOFT_PROJECT_APP_DISCOVERY.md`** | Lovable prototype summary; §15 product-owner domain clarification (dual-track TDLR vs canonical) |
| **`docs/ARCHITECTURE_DESIGN.md`** | Client/Facility/Project hierarchy; `projectData`; reporting; preferences |
| **`docs/CONVERT_TO_RAS.md`** | RAS project type; report instances; §11 header fields (Owner, Design firm, etc.) |
| **`docs/CLIENT_PORTAL_SPEC.md`** | Portal entry flow (Client → Projects); expanded report workspace |
| **`docs/REPORTING_SPEC.md`** | Assessment report ordering (distinct from correspondence PDFs) |
| Lovable prototype (external) | `types.ts` field names; polymorphic project link; correspondence recipient typing — **UI reference only** |

Prototype path (external, not in FREDAsoft repo): `C:\dev\LovableApp\extracted\codebase-clean\`

---

## 2. Problem statement

FREDAsoft Project must support:

1. **TDLR/RAS registration context** — legal/source registration text (party names, addresses, TABS metadata) that must remain **as recorded**.  
2. **Operational stakeholder directory** — normalized, searchable canonical records staff reuse across projects.  
3. **Project parties** — who plays which role (Owner, Design Firm, RAS Firm, etc.) on a given **Project**.  
4. **Correspondence** — merge letters to the right party/contact without conflating with inspection **reporting workflows**.  
5. **Future client portal** — scoped access and **proposed** master-data updates, not blind overwrites.

**Core tension:** The same real-world entity may appear under **different spellings** on different TDLR registrations. Raw TDLR rows must **not** silently overwrite canonical stakeholders. Conversely, staff need **one place** to maintain corrected addresses and contacts for day-to-day work.

**FREDAsoft today** has **Client → Facility → Project** and rich **projectData** inspection workflows, but **no** stakeholder directory, TDLR snapshot track, or project-party model.

---

## 3. Concept glossary

### 3.1 TDLR raw registration party snapshot

**Definition:** An immutable-or-audited copy of a **party row** (name, address fragments, contact text) **as recorded on a TDLR registration** at a point in time, tied to an extraction run and source reference.

**What it is not:** A canonical stakeholder; not editable operational truth without a separate promotion/review path.

**Requirement candidate:** Versioned if the same TABS registration is re-scraped and wording changes.

### 3.2 TDLR registration record (project-level)

**Definition:** Broader **source snapshot** for a registration event: TABS #, dates, fees, facility/site text, flags, **and** embedded party rows as-recorded. Preserved as the **legal/source registration record** (per discovery §15).

**What it is not:** The FREDAsoft **Project** document itself—though fields may **mirror** or **link** to Project metadata after review.

### 3.3 Canonical stakeholder

**Definition:** Internal, normalized **organization or person** record that FREDAsoft staff maintain and reuse across projects. Searchable; stable internal ID; address/phone/email are **operational truth** after review.

**What it is not:** A Firebase Auth user; not necessarily identical to **Client** or **Owner** on every project.

#### Stakeholder entity type (requirement candidate)

Canonical stakeholders may be typed as:

| Entity type | Description | Contact model note |
|-------------|-------------|-------------------|
| **Organization** | Company, agency, institution, multi-person firm | May have **contact persons** affiliated with the org |
| **Individual** | Natural person acting as the stakeholder (e.g. individual building owner) | Person **is** the stakeholder; optional separate “contact person” only when a delegate acts for them |
| **Sole proprietor / solo practice / single-member company** | One person operating under a business name | **Do not assume** a separate contacts table is always required—the canonical record may represent the person and trade name together |
| **Unknown / unresolved** | Parsed or imported row not yet matched to a trusted canonical record | Holds matching queue state until review promotes or links |

**Important:** Do **not** assume every stakeholder is a **firm with separate contacts**. The model must support individuals and sole practitioners without forcing an org→contact hierarchy.

### 3.4 Stakeholder alias / observed name

**Definition:** A text variant (from TDLR, CSV import, correspondence, or portal) **linked to one canonical stakeholder** for search and display. May include observed address fragments.

**Workflow candidate:** Multiple aliases per canonical; aliases accumulate over time rather than replacing history.

### 3.5 Project party / project role assignment

**Definition:** Join of **Project** + **canonical stakeholder** + **project role** (Owner, Design Firm, RAS Firm, Tenant, Agent, Misc), plus optional **primary** flag, date range, and free-text role description.

**What it is not:** The canonical stakeholder record itself; not the TDLR snapshot row (though it may **reference** which snapshot justified the link).

### 3.6 Contact person

**Definition:** A **person** affiliated with a canonical stakeholder organization (or representing an individual stakeholder’s delegate). Used for correspondence To/CC and portal identity **candidates**.

**What it is not:** The canonical stakeholder org record; not the same as **assigned RAS** on a project (professional assignment is a separate concept—§4).

### 3.7 Portal user / account relationship

**Definition:** A **Firebase Auth** identity (future) linked to portal scope: typically a **Client** org and/or **contact person** and/or **project membership**. Governs view/edit of published reports, project progress, and **proposed** master-data submissions.

**What it is not:** Internal staff login; not automatically every contact person in the directory.

### 3.8 Assigned RAS / assigned professional

**Definition:** **Workflow candidate:** The RAS (or other professional) **assigned by FREDAsoft** to perform plan review or inspection work on a project—may reference an internal staff user and/or a **RAS Firm** project party. Distinct from “RAS Firm on TDLR registration” though they may match.

**What it is not:** The same as **portal user** or **canonical RAS Firm** without an explicit assignment link.

---

## 4. Person, account, and assignment distinction

These concepts are **separate**. A real person may occupy **multiple roles**, but the data model must **not collapse** stakeholder, contact, user, and assignment into one record.

| Concept | Role in the model |
|---------|-------------------|
| **Canonical stakeholder** | Master org/person directory entry |
| **Contact person** | Person linked to a stakeholder (or delegate for an individual stakeholder) |
| **Project party** | Stakeholder + role on a specific **Project** |
| **Assigned RAS / assigned professional** | FREDAsoft operational assignment for delivery work |
| **Portal user** | External Auth account with portal scope |
| **Internal staff user** | FREDAsoft staff Auth account (Data Entry, reporting, project admin) |
| **Admin** | Elevated internal capabilities (user mgmt, maintenance)—exact scope deferred |
| **Developer / super-admin** | Environment/platform access—deferred |

```text
                    ┌─────────────────────┐
                    │  Canonical          │
                    │  stakeholder        │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         v                     v                     v
┌────────────────┐   ┌─────────────────┐   ┌──────────────────┐
│ Contact person │   │ Project party   │   │ Alias / observed │
│ (person)       │   │ (on Project)    │   │ name             │
└───────┬────────┘   └────────┬────────┘   └──────────────────┘
        │                     │
        │ may link to         │ role: Owner, Design,
        v                     │ RAS Firm, Tenant, …
┌────────────────┐            │
│ Portal user    │            v
│ (Auth account) │   ┌─────────────────┐
└────────────────┘   │ Assigned RAS /  │
                     │ professional    │
                     └────────┬────────┘
                              │ may link to
                              v
                     ┌─────────────────┐
                     │ Internal staff  │
                     │ user (Auth)     │
                     └─────────────────┘
```

**Architecture implication:** Future Firestore design (D4) should use **explicit links** between these concepts, not a single “person” document that mixes directory, auth, and project role.

---

## 5. FREDAsoft hierarchy today vs Project-app needs

### Today (operational)

```text
Client
  └── Facility(ies)
        └── Project
              └── projectData (assessment / inspection records)
              └── locations, glossary, reporting workflows
```

- **Client:** Portfolio / contract customer in workspace context (`userPreferences` workspace selections).  
- **Facility:** Building/site entity; address; facility-scoped locations and Data Entry.  
- **Project:** Inspection and reporting container; may span multiple facilities (assessment) or typically one (RAS).

### Project-app additions (requirement candidates)

```text
Project
  ├── TDLR registration snapshot(s)     [source / legal track]
  ├── Project parties                   [canonical stakeholder + role]
  ├── (optional) links to Client/Facility
  └── correspondence / milestone metadata (separate from projectData)
```

**Two graphs coexist:** Portfolio hierarchy (**Client → Facility → Project**) and stakeholder graph (**TDLR snapshot → alias → canonical → project party**). Intersections are **optional links**, not forced equality.

---

## 6. Party taxonomy

Prototype used separate `tbl*` firm tables (artifact only). **Requirement candidate** for FREDAsoft: **one canonical stakeholder directory** with **project role** on assignment—not six parallel entity silos.

| Project role | Typical meaning | CONVERT_TO_RAS / TDLR relevance |
|--------------|-----------------|----------------------------------|
| **Owner** | Building owner on registration | §11 header: Owner name / address |
| **Design Firm** | Architect / design professional | §11: Architect / Design Professional / Design Firm |
| **RAS Firm** | Registered accessibility consultant firm on registration | §11: RAS Name / # (firm may differ from assigned individual) |
| **Tenant** | Occupant / tenant funding party | Tenant funds flags on project metadata |
| **Agent** | Owner’s agent or representative | Correspondence routing candidate |
| **Misc** | Other party with `role_description` | Lovable **UI reference** (`tblprojectstakeholder.role_description`) |

**Project-party fields (workflow candidates from prototype):** `is_primary`, `start_date`, `end_date`, `role_description`.

**Explicit non-port:** Polymorphic `stakeholder_table_name` + `stakeholder_record_id` from Lovable—prefer explicit **role enum + canonical stakeholder ID** in FREDAsoft.

---

## 7. Client vs Owner — decision space

Discovery §14 Q2 and §15 establish that **canonical stakeholders are separate from raw TDLR names**. The remaining product decision is how **FREDAsoft Client** relates to **Owner**.

| Option | Model | When it fits | Risk |
|--------|--------|--------------|------|
| **A — Separate (recommended default)** | **Client** = portfolio customer FREDA contracts with. **Owner** = project party role (canonical stakeholder). Optional **link** when same org. | Typical RAS/TDLR: consultant’s client ≠ registered building owner | UI label “Client” vs TDLR “Owner” must be clear in portal and staff UI |
| **B — Client subsumes Owner when linked** | One canonical record; Client record also carries Owner project party when same entity | Nonprofit/government owns its buildings and is the contract client | Breaks when Client hires FREDA for a third-party owner’s site |
| **C — Project-type split** | Assessment uses Client anchor; RAS emphasizes Owner anchor | If product lines diverge sharply | Splits correspondence and portal rules |

### Recommended default (pending Kenneth confirmation)

**Option A:** Treat **Client** as **billing / portfolio / portal anchor**, and **Owner** as a **project party role** on the canonical stakeholder directory. Same real-world org may appear as both with an explicit **same-as** link—not an automatic merge.

**Portal note:** `CLIENT_PORTAL_SPEC.md` entry flow is **Client → Projects**. Portal users likely map to **Client** (or contact under Client), while RAS report headers may require **Owner** lines from TDLR snapshot and/or canonical Owner party—sources may differ (§14).

---

## 8. Facility relationships

| Relationship | Requirement candidate behavior |
|--------------|--------------------------------|
| **Facility ↔ Project** | FREDAsoft: Project references facilities (`fldFacilities`); RAS often **one facility per project** |
| **Facility ↔ Client** | Facility belongs to **Client** in portfolio hierarchy |
| **Facility ↔ Owner** | Owner stakeholder may own/operate facility; **optional link**, not replacement for Facility address fields |
| **TDLR site text ↔ Facility** | TDLR snapshot may duplicate site name/address **as-recorded**; matching workflow may suggest Facility link after **review** |
| **Prototype inline address on project** | **UI reference only**—prefer **Facility** for site address in FREDAsoft; do not overwrite Facility from TDLR without review |

**Architecture implication:** **Facility** remains the building/site entity for Data Entry and **reporting workflows**. TDLR snapshots are **parallel source text**, not authoritative over Facility without promotion.

---

## 9. Dual-track data model (conceptual)

### Tracks

| Track | Purpose | Mutability |
|-------|---------|------------|
| **TDLR / source** | Legal registration record as captured | Append/version; not silently overwritten |
| **Canonical** | Internal operational directory | Staff-maintained; portal changes via approval |
| **Project party** | Who is on this project in which role | Links canonical to Project |
| **Alias** | Observed name variants | Accumulates; links to canonical |

### End-to-end flow (requirement candidate)

```text
TDLR extract / manual capture
        │
        v
┌───────────────────┐
│ Parsed party row   │  (untrusted)
│ + registration     │
│   snapshot         │
└─────────┬─────────┘
          │
          v
┌───────────────────┐
│ Match suggestions  │──► new canonical? link alias? link project party?
└─────────┬─────────┘
          │
          v
┌───────────────────┐
│ Staff review       │  (workflow candidate — no blind overwrite)
└─────────┬─────────┘
          │
          ├──────────────────────┐
          v                      v
┌──────────────────┐    ┌──────────────────┐
│ Alias →          │    │ Project party    │
│ canonical        │    │ (role on Project)│
└──────────────────┘    └──────────────────┘
```

### Preservation rules (requirement candidates)

1. **Write-once / append-only** TDLR party rows per snapshot (or versioned snapshots on re-scrape).  
2. **Promotion path:** parsed field → proposed alias or proposed canonical → review → link.  
3. **No automatic propagation:** updating canonical address does **not** rewrite historical TDLR snapshots or past correspondence `merged_data`.  
4. **Display:** Staff UI may show **TDLR as-recorded** vs **canonical (internal)** side-by-side when they differ.  
5. **Report headers:** CONVERT_TO_RAS §11 Owner/Design fields—which track feeds PDF—is **open** (§15 Q3).

---

## 10. Matching and review workflows

**Workflow candidate** pipeline:

1. **Ingest** — TDLR extraction (D6), CSV import, or manual entry produces **parsed** rows.  
2. **Suggest** — System proposes match to existing canonical, new canonical, or alias-only link.  
3. **Review queue** — Staff confirms, rejects, or defers (`unknown / unresolved` entity type).  
4. **Link** — Approved alias → canonical; optional automatic **project party** creation for matched role.  
5. **Audit** — Who matched, when, source snapshot ID.

**UI references from Lovable (not code to port):**

- Search-first directory pick before linking to project  
- Global firm/owner maintenance routes, then attach to project  
- Minimum search length before results  

**Not decided:** Matching algorithm (exact, fuzzy, manual-only v1).

---

## 11. Client portal and proposed changes

Per discovery §15 points 7–9:

| Step | Requirement candidate |
|------|------------------------|
| Portal user views | Project progress, project information, published **reports** |
| Portal user submits | Changes to company / contact / address fields |
| System creates | **Proposed change** record—not direct canonical write |
| Staff reviews | Approve (apply to canonical), reject, or partial field approve |
| Audit | Submitter, timestamp, before/after, approver |

**Scope variants (open):** Org-wide address change vs project-specific contact update.

**Portal membership (requirement candidate):** Project + membership role + which report instances are published—feeds future auth rules (deferred §12).

**Cross-reference:** `CLIENT_PORTAL_SPEC.md` today focuses on **interactive report workspace**; Kenneth’s clarification adds **project administration and master-data stewardship**—this doc covers the latter; full portal spec update is optional later (D8).

---

## 12. User roles — deferred

**User roles are relevant** to portal access, staff capabilities, and correspondence approval, but **final role design is deferred** to a later **auth/permissions design** phase. This doc does **not** define Firestore rules, role enums in code, or admin UI.

### Likely future roles (capture only—not decisions)

| Role | Intent (draft) |
|------|----------------|
| **Developer / super-admin** | Platform/environment access |
| **Admin** | Organization admin (users, templates, maintenance) |
| **Internal staff** | FREDAsoft operational users (projects, Data Entry, reporting) |
| **Assigned RAS** | Professional assigned to deliver plan review / inspection on a project |
| **Client portal user** | External Auth account with Client/project scope |
| **Stakeholder contact / project viewer** | Narrow portal or read-only access tied to contact/project party |

**Relationship to §4:** Roles attach to **Auth accounts** and **assignments**; they do **not** replace canonical stakeholder or project party records. One person may hold multiple roles (e.g. internal staff who is also an assigned RAS on a project)—model with **separate links**, not one merged profile.

---

## 13. Correspondence merge-field implications

Correspondence templates and formatted PDF letters are **first-class requirements**, **separate** from inspection **reporting workflows** (Report Preview, Web Report Viewer).

Prototype `correspondence_records` (structure only, not porting): `template_id`, `merged_data`, `primary_recipient_type` + `primary_recipient_id`, `project_id`.

### Merge context layers (requirement candidate)

| Source | Example merge fields | Notes |
|--------|---------------------|-------|
| **Project** | Project name, TABS #, OCG #, status, milestone dates | Operational metadata |
| **Project party (by role)** | Owner name/address, Design firm, RAS firm | Primary recipient selection |
| **Contact person** | Salutation, email, phone | Letter To / CC |
| **Facility** | Facility name, site address | May differ from owner mailing address |
| **TDLR snapshot** | As-recorded owner name/address | When letter must match **registration wording** |
| **Canonical stakeholder** | Normalized name/address | Default internal operations |

**Requirement candidate rule:** Each template field declares **preferred source** (canonical vs TDLR-as-recorded vs project override). Historical `merged_data` on sent letters remains immutable.

---

## 14. Lovable prototype as UI/workflow reference

| Prototype pattern | FREDAsoft tag |
|-------------------|---------------|
| Separate firm tables per role (`tblowner`, `tbldesignfirm`, …) | **Anti-pattern for FREDAsoft**—prefer single directory + role |
| `tblprojectstakeholder` polymorphic link | **UI reference** for project roster, primary flag, dates |
| Owner org + `tblownercontact` | **UI reference**—remember individual owners may not need separate contacts |
| Search-first stakeholder pick | **UI reference** |
| `correspondence_templates` / `correspondence_records` | **Workflow candidate** for letter generation |
| `profile_approvals` / invitations | **Workflow candidate** for portal onboarding |

**No Lovable code, CSV row data, secrets, or Supabase schema** are copied into FREDAsoft.

---

## 15. Gap vs FREDAsoft today

| Capability | FREDAsoft today | After Project stakeholder model (future) |
|------------|-----------------|----------------------------------------|
| Client / Facility / Project | Yes | Unchanged hierarchy |
| projectData / reporting | Yes | Unchanged |
| Stakeholder directory | No | **Requirement candidate** |
| TDLR snapshot track | No | **Requirement candidate** |
| Project parties | No | **Requirement candidate** |
| Alias / matching | No | **Requirement candidate** |
| Correspondence PDFs | No (inspection reports only) | **Requirement candidate** (separate pipeline) |
| Portal master-data approval | No | **Requirement candidate** (D8) |

---

## 16. Recommended decision options

| ID | Decision | Recommendation |
|----|----------|----------------|
| **SM-1** | Dual-track TDLR vs canonical | **Adopt** (discovery §15) — formalized in §9 |
| **SM-2** | Single canonical directory + role on project party | **Recommend** over Lovable six-table split |
| **SM-2b** | Typed sub-collections per party kind | Document as **alternative** — reject unless Kenneth wants Lovable parity |
| **SM-3** | Client ≠ Owner default; optional same-as link | **Recommend default** pending §15 Q1 |
| **SM-4** | Facility holds site address; TDLR duplicates until linked | **Recommend** |
| **SM-5** | Stakeholder entity types include individual / sole prop / unknown | **Adopt** (§3.3) |
| **SM-6** | Separate stakeholder / contact / user / assignment records | **Adopt** (§4) |
| **SM-7** | Portal updates → proposed-change queue | **Recommend** (§11) |
| **SM-8** | Correspondence merge source policy per field | **Require Kenneth input** before D7 |
| **SM-9** | Defer Firestore names and auth rules | **Explicit deferral** to D4 + auth phase |

---

## 17. Open questions for Kenneth

1. **Client vs Owner:** For typical RAS projects, is **Client** always the contract customer when TDLR **Owner** is a different entity?  
2. **Portal identity:** Does a portal user log in as **Client org**, **Owner**, or **any project-party contact**?  
3. **Report header authority:** For RAS PDF headers (CONVERT_TO_RAS §11), must Owner/Design lines use **TDLR as-recorded**, **canonical**, or staff choice per report?  
4. **Primary party:** Multiple Owners or Design Firms allowed—with one **primary** for correspondence?  
5. **Misc role:** Is **Misc** sufficient, or are additional TDLR party types expected?  
6. **Agent vs Owner:** Default correspondence recipient when both appear on registration?  
7. **Facility duplication:** Should TDLR site address **create/link a Facility**, or stay on snapshot until reviewed?  
8. **Re-scrape:** When TDLR owner name changes on re-scrape, new snapshot + new alias, or update existing snapshot?  
9. **Individual owners:** How often are owners persons without an org wrapper—and should UI default to **individual** entity type?  
10. **Existing Clients:** Should current FREDAsoft **Client** records ever auto-become **Owner** stakeholders, or stay separate?  
11. **Assigned RAS vs RAS Firm party:** Must assigned professional always match TDLR **RAS Firm** project party?  
12. **Sole proprietor:** Treat as **individual**, **organization**, or dedicated type for merge fields?

---

## 18. TDLR/TABS source material (review before D6)

Before finalizing **D6** extraction field lists, scraping scope, or any **legal/registration assumptions**:

- Official **TDLR** and **TABS** procedures, forms, and registration pages should be **reviewed from primary sources**.  
- Internal **RAS procedure materials** (operational checklists, fee/milestone conventions) should be reviewed separately from prototype field inventories.  
- This document and **`docs/FREDASOFT_PROJECT_APP_DISCOVERY.md`** do **not** assert current TDLR legal requirements unless explicitly sourced in a future revision.  
- **No credentials**, login instructions, or live system access details belong in FREDAsoft documentation.

**D6 dependency:** Extraction pipeline design should cite **which official source** each parsed field maps from—not Lovable `tblproject` columns alone.

---

## 19. Phased follow-ups

| Phase | Deliverable | Depends on |
|-------|-------------|------------|
| **D4** | Firestore schema sketch (docs only) | SM-1–SM-9; auth phase for roles |
| **D6** | TDLR extraction pipeline sketch | §18 source review; §9 dual-track |
| **D7** | Correspondence template + PDF letter spec | §13; Kenneth §17 Q3, Q6, Q12 |
| **D8** | Portal submission + approval workflow | §11; `CLIENT_PORTAL_SPEC.md` |
| **Auth** | Roles and permissions design | §12 likely roles; portal membership |

---

## 20. Document control

| Item | Value |
|------|-------|
| Created | 2026-06-04 |
| Phase | D5 stakeholder model discovery |
| FREDAsoft implementation | **None** |
| Lovable code in repo | **None** |
| Secrets in doc | **None** |
| PII / CSV row content | **None** |
| TDLR legal claims | **None** without primary source citation |

---

## Related documentation index

| Document | Relevance |
|----------|-----------|
| **`docs/FREDASOFT_PROJECT_APP_DISCOVERY.md`** | Prototype discovery; §15 domain clarification |
| **`docs/ARCHITECTURE_DESIGN.md`** | Core data model; DECIDED blocks |
| **`docs/CONVERT_TO_RAS.md`** | RAS headers; report instances |
| **`docs/CLIENT_PORTAL_SPEC.md`** | Portal navigation and report workspace |
| **`docs/REPORTING_SPEC.md`** | Assessment PDF ordering |
| **`AGENTS.md`** | Protected areas; no Firestore writes without approval |
