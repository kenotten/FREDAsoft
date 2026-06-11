# FREDAsoft Project — TDLR/TABS Field Verification

**Status:** Field verification draft.  
**Evidence source:** Observed TDLR/TABS screens captured during Archie #11 (screenshots and saved HTML/text).  
**Last updated:** 2026-06-05  
**Branch context:** `archie-11-tabs-field-verification`  
**Audience:** Kenneth, Kathy Rodriguez, Jessica Montalvo, OCG RASes, architecture review (Archie)

> **This document is not implementation.**  
> **Not schema.**  
> **Not a migration plan.**  
> **Not a Firebase collection design.**  
> **Not a TDLR integration plan.**  
> **Not a promise that all TABS fields have been captured.**

---

## Durable rule (carry forward)

**TDLR/TABS data is legal/as-recorded source data.** FREDAsoft may mirror source snapshots and propose **candidate links**, but TDLR/TABS values **do not automatically overwrite** FREDAsoft canonical **Client**, **Facility**, **Project**, **Contact**, **Stakeholder**, **report**, **correspondence**, or **portal** data. **Staff review is required** before any canonical link or operational action.

Aligns with Archie #10 dual-track posture (`docs/FREDASOFT_PROJECT_IMPLEMENTATION_READINESS_PLAN.md`, `docs/FREDASOFT_PROJECT_TDLR_REVIEW_WORKFLOW.md`, D5 stakeholder model).

---

## 1. Purpose

This document captures **fields observed directly** on current TDLR/TABS **Project Registration**, **Manage Contacts**, and **Registration Review / Verify** surfaces during Archie #11 evidence gathering.

**Why it exists:**

- Provide **evidence-grounded field inventory** before D4 schema refinement, D1 field-mapping updates, or PM prototype Phase B.
- Separate **as-recorded TABS labels and values** from **candidate FREDAsoft canonical/operational** interpretations.
- Surface **gaps and open questions** (post-payment screens, update flows, dropdown option lists) without committing to implementation.

**What it is not:** final requirements, legal interpretation, parser spec, or authorization to build Firestore collections.

**Prior related work:** `docs/reference/TDLR_TABS_FORM_FIELD_DISCOVERY.md` indexed Search and Manage Project captures (pre-D6). This doc **extends** that inventory with **registration-wizard and verify-step** observations from Archie #11. Manage Project `lbl*` and contact-modal patterns are reconciled where the same fields appear on Verify.

**PII posture:** Example values below are **sanitized or structural** (enum labels, Yes/No, field shapes). No committed capture reproduces live emails, phones, street addresses, or session tokens.

---

## 2. Source evidence

### 2.1 Observed TABS surfaces (Archie #11)

| Surface | Observed role | Evidence |
|---------|---------------|----------|
| **Project Registration Form — Project Information** | Registration wizard step: RAS block + project/site/scope/economics fields | Archie #11 screenshot + saved HTML/text |
| **Manage Contacts** | Owner, Owner Agent, Design Firm, Tenant contact entry (registration and/or post-registration) | Archie #11 screenshot + saved HTML/text; modal field ids align with `manageprojectPS.txt` contact modals |
| **Registration Review / Verify** | Read-only summary before submit/payment; project contacts summary table | Archie #11 screenshot + saved HTML/text; summary labels align with Manage Project `#proj_ident` `lbl*` ids |
| **Payment step context** | Fee/payment before or alongside project number assignment | Observed in registration flow context (Archie #11); detail fields **not fully indexed** here |
| **Site-wide notices (registration)** | CAD, LLO, AOF/SOS, owner-agent form, false-information warning | Observed banner/notice text on registration and Manage Project captures |

### 2.2 Evidence storage

- Captures are **outside the FREDAsoft git repo** (local reference materials / Archie #11 bundle).
- Repo retains **field structure and sanitized examples** only.
- **No live TABS network access** was required to author this doc.

### 2.3 Reconciled reference captures (pre–Archie #11)

| Reference file | Relevance |
|----------------|-----------|
| `FREDAsoftReferenceMaterials/TABS_Page_Captures/manageprojectPS.txt` | Manage Project `lbl*` summary, `#tblContacts`, Owner/Agent/Design/Tenant/RAS modals |
| `docs/reference/TDLR_TABS_FORM_FIELD_DISCOVERY.md` | Prior field inventory, modal patterns, enumerations |
| `docs/reference/EAB205N_PROJECT_REGISTRATION_FIELD_INDEX.md` | EAB205N semantic anchor when TABS registration labels match paper form |

---

## 3. Field classification rules

Each observed TABS field should be classified **before** schema or prototype hardening:

| Classification | Meaning | FREDAsoft posture |
|----------------|---------|-------------------|
| **TDLR/TABS source snapshot field** | Legal/as-recorded value as shown on TABS at capture time | Store on **source track** only; version/append on re-capture |
| **Candidate canonical project/facility/client/stakeholder link** | TABS text may **suggest** a FREDAsoft entity or project party | **Assistive match only** until staff approves link |
| **FREDAsoft operational field** | OCG workflow data not defined by TABS registration (queues, internal status, fee adjustment, correspondence log) | Maintained on **canonical/operational track**; never auto-filled from TABS alone |
| **Review/approval metadata** | Who approved a link, when, from which snapshot, defer/reject | Audit/review session — not TABS source text |
| **Out of scope / lookup-list option** | Country, city, county, business-type enum values embedded in TABS HTML | Capture as **lookup reference** or raw id + resolved label; **not** FREDAsoft schema enums until product decides |

**Dropdown rule:** TABS `<select>` values (e.g. `BusinessType` `27004` = LLC) are **source-layer enums** until staff and product map them to FREDAsoft entity types. Do not treat TABS option lists as final FREDAsoft field enums.

**Registrant rule:** Person filing / registrant contact phone on registration is **source evidence**; registrant is **not** automatically a continuing canonical stakeholder (D5, D8).

---

## 4. Project Information fields observed

**Surface:** Project Registration Form — Project Information (and matching **Verify** summary labels where noted).

| TABS label | Observed HTML/input id if known | Required? | Example value from evidence | FREDAsoft interpretation | Notes / open questions |
|------------|----------------------------------|-----------|------------------------------|--------------------------|-------------------------|
| RAS information (section) | *(section header)* | Yes (block) | RAS block present on registration | Source snapshot — RAS firm assignment context | Distinct from post-registration Plan Review By / Inspection By |
| RAS name | `Name` (RAS modal/display); Verify summary via `lblProjectRAS` | Yes | `LAST,FIRST` display format | Candidate **RAS Firm** party + **assigned RAS** display | RAS modal on Manage Project is **read-only** — IT staff only |
| RAS number | `LicenseNumber` (RAS modal label "RAS Number") | Yes | Numeric license (e.g. `149`) | Source snapshot + canonical RAS credential **candidate** | Strong match key; not editable in captured Manage UI |
| RAS email | `Email` (RAS modal) | Observed on RAS info display | *(sanitized)* | Contact person candidate; source snapshot | Shown on RAS Info modal post-registration |
| RAS phone | `Phone` (RAS modal) | Observed on RAS info display | *(sanitized)* | Contact person candidate; source snapshot | |
| Estimated construction cost | Registration input *(id not yet indexed in repo)*; Verify: `lblProjectEstCost` | Yes | `$350,000` (format observed) | **Source snapshot only** (not inspection/finding cost) | Excludes A/E fees per EAB205N instructions |
| Estimated construction start date | Registration input *(id not yet indexed)*; Verify: `lblProjectEstStartdate` | Yes | `3/1/2016` (date shape) | Source snapshot + optional schedule metadata **candidate** | Datepicker `MM/DD/YYYY` pattern on search filters |
| Estimated construction completion date | Registration input *(id not yet indexed)*; Verify: `lblProjectEstEnddate` | Yes | `5/1/2016` (date shape) | Source snapshot + optional schedule metadata **candidate** | |
| Project name | Registration input *(id not yet indexed)*; Verify: `lblProjectName` | Yes | Commercial remodel project name (sanitized) | Source snapshot + Project display name **candidate** | |
| Building or facility name | Registration input *(id not yet indexed)*; Verify: `lblBuildingorFacilityName` | Conditional | Named building label (sanitized) | Source snapshot + **Facility** name **candidate** | TABS label spelling: "Building or FacilityName" on Manage |
| Physical address / Address 1 | Registration address block; Verify composite: `lblProjectAddress` | Yes | Street, city, state, zip, county in one line on Verify | Source snapshot + **Facility** address **candidate** | Manage modals decompose: `Street1`, `USCity`, `USState`, `USZip`, `USCounty` |
| Other address / Address 2 | `Street2` (modal pattern) | No | Optional second line | Source snapshot | |
| City | `USCity` (US path) | Yes | City name | Source snapshot; TABS may use numeric city id in registration `<select>` | Full city list not reproduced |
| State | `USState` (numeric state code in modals) | Yes | Texas | Source snapshot | |
| Zip code | `USZip` | Yes | 5-digit zip | Source snapshot | |
| County | `USCounty` / location county on project | Yes | County name (e.g. Harris) | Source snapshot + Facility county **candidate** | Search uses `filter-location-county` numeric ids |
| Type of work / Job class | Registration select *(id not yet indexed)*; Verify: `lblProjectJobClass` | Yes | `Renovation/Alteration` | Source snapshot enum | EAB205N: New Construction; Renovation/Alteration; Additions |
| Estimate of square footage | Registration input *(id not yet indexed)*; Verify: `lblProjectEstimateOfSquareFootage` | Yes | `Unknown` observed | Source snapshot | EAB205N combines with scope; TABS splits |
| Scope of work | Registration textarea *(id not yet indexed)*; Verify: `lblProjectScopeOfWork` | Yes | Short scope narrative (sanitized) | Source snapshot + Project description **candidate** | |
| Type of funds / Owner class | Registration select *(id not yet indexed)*; Verify: `lblProjectOwnerClass` | Yes | Long owner-class sentence (private/public wording) | Source snapshot | EAB205N "Type of Funding" |
| Private funds provided by tenant | Registration Yes/No *(id not yet indexed)*; Verify: `lblProjectPrivateFunds` | Conditional (renovation) | `Not available` / Yes / No shapes observed | Source snapshot flag | Relates to tenant section when Yes |
| Roadway construction | Verify: `lblIsRoadwayConstruction` | Observed on Verify | `No` | Source snapshot flag | May affect CAD requirement |
| CAD number | Registration input *(id not yet indexed)*; Verify: `lblProjectCADNumber` | Conditional (non-roadway) | Empty or numeric account | Source snapshot + **document checklist** candidate | Notice: CAD copy upload required |
| State project | Verify: `lblProjectStateLease` | Observed | `No` | Source snapshot flag | Alternate registration form for state lease |
| Special category project | Verify: `lblSpecialProjectCategory` | Observed | `No` | Source snapshot flag | EAB245N family routing |
| State lease number | Verify: `lblProjectStateLeaseNumber` | Conditional | Empty when not state lease | Source snapshot | |
| Registrant contact phone | Verify: `lblProjectContact` | Observed | `Not Available` in sample | **Registrant** source field — contact **candidate** only | Not the same as Owner phone |
| Registration / payment step context | Payment route referenced (`/TABS/Payment/…`) | Process gate | Payment before TABS # in flow | **Operational milestone** (fee paid), not registration field | Post-payment fields **not fully captured** (§11) |

---

## 5. Contact / party fields observed

**Surfaces:** Manage Contacts (registration wizard and Manage Project modals); Verify **Project contacts summary** table.

Shared modal API: `POST /TABS/Project/EditContact`; hidden `ContactType`: `Owner`, `Agent`, `Design_Firm`, `Tenant`.

### 5.1 Building or Facility Owner

| Contact section | TABS label | Observed HTML/input id if known | Required? | Example value from evidence | FREDAsoft interpretation | Notes / open questions |
|-----------------|------------|-----------------------------------|-----------|------------------------------|--------------------------|-------------------------|
| Owner | Owner name | `ContactName` / `Name` | Yes | Entity name (sanitized LLC) | **Owner** project party + stakeholder **candidate** | Must align with CAD per TABS notice; **≠ Client** by default |
| Owner | Business type | `BusinessType` | Yes | `Limited Liability Corporation` (enum label) | Source snapshot + entity type **candidate** | LLC/LP/LLP triggers LLO/AOF/SOS notices |
| Owner | Owner address 1 | `Street1` | Yes | Mailing line 1 (sanitized) | Stakeholder address **candidate**; source snapshot | PO Box allowed for owner mailing |
| Owner | Owner address 2 | `Street2` | No | Optional | Source snapshot | |
| Owner | Country | `Country` | Yes | `8000236` (US code in modals) | Lookup id + label | Full country list in TABS HTML |
| Owner | City | `USCity` (US) | Yes | City name | Source snapshot | |
| Owner | State | `USState` | Yes | Texas code | Source snapshot | |
| Owner | Zip code | `USZip` | Yes | 5-digit | Source snapshot | |
| Owner | County | `USCounty` | Yes | County name | Source snapshot | |
| Owner | Contact name | `DesignProfessionalName` (label: representative / direct employee) | Yes | Person name (sanitized) | **Contact person** candidate | TABS label differs from EAB205N "Representative" |
| Owner | Phone | `Phone` | Yes | Phone (sanitized) | Contact person candidate; source snapshot | |
| Owner | Email | `Email` | Yes | Email (sanitized) | Contact person candidate; source snapshot | EAB205N: unique among project contacts |

### 5.2 Owner's Designated Agent

| Contact section | TABS label | Observed HTML/input id if known | Required? | Example value from evidence | FREDAsoft interpretation | Notes / open questions |
|-----------------|------------|-----------------------------------|-----------|------------------------------|--------------------------|-------------------------|
| Agent | Designated agent or company name | `Name` / `ContactName` | Yes (if section used) | Agent or firm name | **Owner Agent** project party **candidate** | Modal title: Owner Agent Designation |
| Agent | Address 1 | `Street1` | Yes | Line 1 (sanitized) | Source snapshot | |
| Agent | Address 2 | `Street2` | No | Optional | Source snapshot | |
| Agent | Country | `Country` | Yes | US code | Lookup | |
| Agent | City | `USCity` | Yes | City | Source snapshot | |
| Agent | State | `USState` | Yes | State | Source snapshot | |
| Agent | Zip code | `USZip` | Yes | Zip | Source snapshot | |
| Agent | County | `USCounty` | Yes | County | Source snapshot | |
| Agent | Contact name | `DesignProfessionalName` (representative) | Yes | Person name | Contact person **candidate** | |
| Agent | Phone | `Phone` | Yes | Phone | Contact person candidate | |
| Agent | Email | `Email` | Observed on agent pattern | Email | Contact person candidate | Confirm required on registration vs manage |
| Agent | Owner agent designation form | `WrittenConfirmation` (file) | Required if agent section completed | PDF upload | **Document checklist** — EAB243N family | Observed notice on registration |

### 5.3 Design Firm / Design Professional

| Contact section | TABS label | Observed HTML/input id if known | Required? | Example value from evidence | FREDAsoft interpretation | Notes / open questions |
|-----------------|------------|-----------------------------------|-----------|------------------------------|--------------------------|-------------------------|
| Design | Design firm name | `Name` / `ContactName` | Yes (if section used) | Firm name (sanitized) | **Design Firm** party **candidate** | Registrant may be design professional — still separate roles |
| Design | Address 1 | `Street1` | Yes | Line 1 | Source snapshot | |
| Design | Address 2 | `Street2` | No | Optional | Source snapshot | |
| Design | Country | `Country` | Yes | US | Lookup | |
| Design | City | `USCity` | Yes | City | Source snapshot | |
| Design | State | `USState` | Yes | State | Source snapshot | |
| Design | Zip code | `USZip` | Yes | Zip | Source snapshot | |
| Design | County | `USCounty` | Yes | County | Source snapshot | |
| Design | Design professional name | `DesignProfessionalName` | Yes | Professional name | Contact person **candidate** | |
| Design | Phone | `Phone` | Yes | Phone | Contact person candidate | |
| Design | Email | `Email` | Conditional | Email | Contact person candidate | |
| Design | Type of license | *(license type select on registration capture)* | Conditional | Architect / Engineer / etc. | Source snapshot enum | EAB205N license types |
| Design | License number | `LicenseNumber` | Conditional | Numeric/alphanumeric | Source snapshot | Label: "if applicable" |

### 5.4 Tenant

| Contact section | TABS label | Observed HTML/input id if known | Required? | Example value from evidence | FREDAsoft interpretation | Notes / open questions |
|-----------------|------------|-----------------------------------|-----------|------------------------------|--------------------------|-------------------------|
| Tenant | Tenant contact name | `Name` / `ContactName` | Conditional (if other than owner) | Person or org (sanitized) | **Tenant** project party **candidate** | Section: tenant if other than owner |
| Tenant | Phone | `Phone` | Yes (if tenant section) | Phone | Contact person candidate | |
| Tenant | Email | `Email` | Yes (if tenant section) | Email | Contact person candidate | |
| Tenant | *(section note)* | — | — | — | Relates to **private funds provided by tenant** when renovation | May be empty / "Not Assigned" post-registration |

---

## 6. Registration Review / Verify summary fields

**Surface:** Registration Review / Verify (read-only summary before submit). Display ids align with Manage Project `#proj_ident` unless noted.

| Verify summary label | Observed id / source | Example (sanitized) | FREDAsoft interpretation | Notes |
|----------------------|----------------------|---------------------|--------------------------|-------|
| Project name | `lblProjectName` | Commercial project name | Source snapshot + Project name **candidate** | |
| Building/facility name | `lblBuildingorFacilityName` | Building label | Facility **candidate** | |
| Address summary | `lblProjectAddress` | Composite street, city, state, zip, county | Facility address **candidate** | Single-line on Verify |
| Scope of work | `lblProjectScopeOfWork` | Narrative | Source snapshot | |
| Estimate of square footage | `lblProjectEstimateOfSquareFootage` | `Unknown` or numeric | Source snapshot | |
| Estimated start date | `lblProjectEstStartdate` | Date | Source snapshot | |
| Estimated end date | `lblProjectEstEnddate` | Date | Source snapshot | |
| Estimated cost | `lblProjectEstCost` | Currency | Source snapshot | |
| Job class | `lblProjectJobClass` | `Renovation/Alteration` | Source snapshot | |
| Owner class | `lblProjectOwnerClass` | Funding class sentence | Source snapshot | |
| Private funds provided by tenant | `lblProjectPrivateFunds` | Yes/No/Not available | Source snapshot | |
| Roadway construction | `lblIsRoadwayConstruction` | `No` | Source snapshot | |
| Project CAD number | `lblProjectCADNumber` | CAD account or empty | Source snapshot + document gate | |
| Owner | `lblProjectOwner` | Owner entity name | Owner party **candidate** | Side-by-side with canonical Owner |
| Tenant | `lblProjectTenant` | Tenant name or empty | Tenant party **candidate** | |
| RAS | `lblProjectRAS` | RAS display name | Assigned RAS **candidate** | |
| State project | `lblProjectStateLease` | `No` | Source snapshot | |
| Special category project | `lblSpecialProjectCategory` | `No` | Source snapshot | |
| State lease number | `lblProjectStateLeaseNumber` | Empty | Source snapshot | |
| Registrant contact phone | `lblProjectContact` | Phone or `Not Available` | Registrant source only | |

### 6.1 Project contacts summary table (Verify)

Observed columns match Manage Project `#tblContacts`:

| Column | FREDAsoft interpretation | Notes |
|--------|--------------------------|-------|
| Contact type | Maps to project party role (Owner, Design Firm, RAS, Tenant, Agent) | Display e.g. "Building Or Facility Owner", "Design Firm", "Registered Accessibility Specialists" |
| Name | Organization / party name as recorded | Source snapshot row |
| Contact or professional name | Person row within party | Contact person **candidate** |
| Address | Composite mailing/site text | Source snapshot |
| Phone | Phone as recorded | Source snapshot |
| Email | Email as recorded | Source snapshot |
| Type of license | Professional license type (design) | Source snapshot enum |
| License | License number | Source snapshot |
| Business type | Owner entity type | Source snapshot; links to `BusinessType` enum |

---

## 7. Notices and required supporting documents observed

Phrased as **observed TABS UI text** — not legal conclusions beyond what TABS displays.

| Notice / requirement | Observed where | FREDAsoft interpretation (candidate) |
|--------------------|----------------|--------------------------------------|
| **CAD number required** | Registration notices; Verify shows CAD field | Document/checklist gate; snapshot field |
| **CAD document upload required** | Site-wide banner on Manage Project; registration notices | Required **CAD copy** attachment metadata — not inline field |
| **Limited Liability Ownership (LLO) form** required for LLC/LLP/LP owners | Registration/Manage banner | Document checklist — **EAB247N** family |
| **Articles of Formation or Secretary of State document** required for LLC/LLP/LP | Registration/Manage banner; Owner modal `FOEUploadfile`, `SOSUploadfile` | Document checklist — conditional upload |
| **Owner name/address must match CAD records** | Observed registration guidance (CAD alignment) | Staff review flag when canonical Owner ≠ source owner text |
| **Owner designated agent form** (EAB243N) | Agent section + `WrittenConfirmation` upload | Document checklist when agent used |
| **False/misleading information warning** (Texas Administrative Code **68.12(e)**) | Registration attestation / site banner | Certification snapshot; not FREDAsoft operational field |

**Observed banner text (paraphrased):** TABS states that registered projects require **CAD number and CAD document upload**, **LLO form** for LLC/LLP/LP owners, and **AOF/SOS** documentation, and warns that **false or misleading information** is subject to enforcement under **TAC 68.12(e)**.

---

## 8. Candidate FREDAsoft crosswalk

| TABS source field/group | Candidate FREDAsoft canonical/operational area | Link behavior | Review requirement |
|-------------------------|-----------------------------------------------|---------------|-------------------|
| Project name | Project source snapshot → candidate **Project** display name | Suggest match to existing FREDAsoft Project or draft name | Staff approve link or create new Project shell |
| Building/facility name + address | Facility source snapshot → candidate **Facility** (`fldFacName`, address) | Suggest match/create Facility under Client | Staff approve; never silent merge |
| Owner block | **Owner** project party + canonical **stakeholder** | Candidate link + alias if spelling differs | Staff approve; **Client ≠ Owner** |
| Tenant block | **Tenant** project party | Candidate link or leave unmatched | Staff approve; "Not Assigned" common |
| Design firm / professional | **Design Firm** party + contact person | Candidate link | Staff approve; registrant may equal design firm |
| Owner agent | **Owner Agent** party | Candidate link | Staff approve; document gate for designation form |
| RAS name / RAS # | **RAS Firm** party + **assigned RAS** operational assignment | License # strong match key | Staff approve; RAS row read-only in TABS UI |
| CAD number / CAD doc notices | Document requirement / checklist (CAD copy) | Attach metadata only at first | Staff confirm uploaded on TABS |
| LLO / AOF / SOS notices | Document checklist items | Gate before operational milestones | Staff checklist — not auto-verified by FREDAsoft |
| Estimated dates / cost / scope / job class | Project source snapshot + optional schedule/economics metadata | Snapshot only by default | Optional draft promotion after review |
| Registrant contact phone | Registrant **source contact** row | Contact person candidate only | Staff decide link; not auto-stakeholder |
| Verify summary (entire page) | **TDLR project source snapshot** capture unit | One snapshot per registration verify | Immutable as-recorded; compare to later Manage Project scrape |

---

## 9. What this means for the PM prototype

The mock-only PM prototype (`index-pm-prototype.html`, `src/pm-prototype/`) Phase A exercised a **thin** source panel. This verification suggests **likely Phase B refinements** (still mock-only, no Firebase):

| Prototype area | Refinement implied by TABS evidence |
|----------------|-------------------------------------|
| **Source tab** | Show **full project information snapshot** (job class, owner class, tenant funds flag, CAD #, roadway/state/special flags, dates, cost, sq ft, scope) — not only TABS # and owner/registrant |
| **Parties tab** | **Two-column or dual-row** presentation: TABS as-recorded contact rows vs FREDAsoft canonical stakeholders; show **Business type**, **license** columns from contacts table |
| **Documents / checklist tab** (not in Phase A) | Represent **CAD document**, **LLO**, **AOF/SOS**, **owner agent designation**, **PRF**, **plans**, **request for inspection** as mock gates |
| **Intake** | Support **OCG project without TABS #** at day one; later **hydrate** source snapshot when TABS # exists (workflow discovery option C) |
| **Verify-style read-only page** | Optional mock **Registration Review** screen mirroring Verify summary before "submit" |

Prototype changes remain **disposable** and **not saved** — this section informs staff review only.

---

## 10. What this means for future schema refinement

Per `docs/FREDASOFT_PROJECT_TDLR_SCHEMA_SKETCH.md` (D4) — conceptual only:

| Implication | Detail |
|-------------|--------|
| **Do not collapse** TABS source into canonical Project/Facility fields | Preserve `asRecorded` text on source snapshots |
| **Source snapshot model** (or equivalent) | Project-level snapshot + party-level snapshot rows per capture |
| **Project-party link / review metadata** | Approved links separate from snapshot text (D2, D4 `tdlrApprovedLinks` sketch) |
| **Document requirement / checklist model** | CAD, LLO, AOF/SOS, agent form, plans — later phase; not registration input fields |
| **Service scope / status model** | OCG operational statuses (workflow discovery §6) are **not** TABS `lblProjectStatus` enums — map explicitly |
| **Correction workflow** | Wrong as-recorded TABS values are corrected in **TABS**, not by overwriting FREDAsoft snapshots; new capture supersedes |

---

## 11. Open questions

| # | Question |
|---|----------|
| 1 | Are there **additional TABS fields after payment** / project number assignment not yet captured? |
| 2 | Which fields appear on **existing project update** screens after registration (amendment, Edit Project Information)? |
| 3 | Which fields can **RAS update** after registration vs read-only (RAS modal is read-only in Manage capture)? |
| 4 | Which TABS fields appear in **open-records export** but not on registration/verify screens? |
| 5 | Which **dropdown option lists** (city, county, country, business type, job class, owner class) should be captured in a later pass? |
| 6 | Which fields should be displayed in **PM prototype Phase B** for Kathy/Jessica review vs deferred to D2 review UI? |
| 7 | Which fields are **required for OCG intake before TABS exists** (internal OCG # shell — workflow discovery scenario E)? |
| 8 | What are the **exact registration-wizard input ids** for Project Information (not yet committed to `TDLR_TABS_FORM_FIELD_DISCOVERY.md`)? |
| 9 | Does **payment step** expose fee line items that should map to OCG payment tracking (workflow discovery)? |
| 10 | How do **Plan Review By** / **Inspection By** (`lblProjectPlanReviewBy`, `lblProjectInspectionBy`) relate to registration-time RAS block? |

---

## 12. Related documentation

| Document | Relevance |
|----------|-----------|
| `docs/FREDASOFT_PROJECT_DAILY_WORKFLOW_DISCOVERY.md` | OCG operational statuses, intake scenarios, Client ≠ Owner |
| `docs/FREDASOFT_PROJECT_PM_WIREFRAME_PLAN.md` | Prototype screens and mock data shapes |
| `index-pm-prototype.html` / `src/pm-prototype/` | Phase A clickable prototype (mock only) |
| `docs/FREDASOFT_PROJECT_IMPLEMENTATION_READINESS_PLAN.md` | Sequencing; dual-track rule; first vertical slice |
| `docs/FREDASOFT_PROJECT_TDLR_SCHEMA_SKETCH.md` | D4 conceptual source vs canonical areas |
| `docs/FREDASOFT_PROJECT_FIELD_LEVEL_MAPPING.md` | D1 business-concept cross-layer mapping |
| `docs/FREDASOFT_PROJECT_TDLR_REVIEW_WORKFLOW.md` | D2 staff review screens and outcomes |
| `docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md` | D5 parties, Client vs Owner, dual-track |
| `docs/FREDASOFT_PROJECT_PORTAL_STAKEHOLDER_IMPLICATIONS.md` | D8 portal boundaries; registrant posture |
| `docs/reference/TDLR_TABS_FORM_FIELD_DISCOVERY.md` | Prior TABS HTML field inventory (Search, Manage) |
| `docs/reference/EAB205N_PROJECT_REGISTRATION_FIELD_INDEX.md` | EAB205N semantic anchor |

---

*End field verification draft — Archie #11.*
