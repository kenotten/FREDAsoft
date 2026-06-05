# EAB205N — Project Registration Field Index

**Status:** Documentation-only field inventory (pre-D1). **Not implemented.**  
**Last updated:** 2026-06-05  
**Branch context:** `eab205n-field-index`  
**Audience:** Product owner (Kenneth), architecture review (Archie), D1 field-mapping work

> **Disclaimer:** This document indexes **visible form sections and fields** from the local EAB205N reference PDF for FREDAsoft discovery. It does **not** assert TDLR legal compliance, final FREDAsoft field names, Firestore schema, extraction code, or PDF parsing implementation. **No long PDF passages** are quoted. The source PDF remains **outside the repository**.

---

## Table of contents

1. [Purpose and scope](#1-purpose-and-scope)
2. [Source metadata](#2-source-metadata)
3. [Form section inventory](#3-form-section-inventory)
4. [Field inventory table](#4-field-inventory-table)
5. [Conditional logic / dependencies](#5-conditional-logic--dependencies)
6. [Comparison to TABS field discovery](#6-comparison-to-tabs-field-discovery)
7. [D1 mapping implications](#7-d1-mapping-implications)
8. [Open questions for Kenneth / Archie](#8-open-questions-for-kenneth--archie)
9. [Non-goals](#9-non-goals)
10. [Related docs](#10-related-docs)

---

## 1. Purpose and scope

### Purpose

**EAB205N** (*Architectural Barriers Project Registration Application*) is the **primary intended registration-field source** for FREDAsoft TDLR/TABS work (see **`docs/FREDASOFT_PROJECT_TDLR_EXTRACTION_PIPELINE.md` §2.1**). This index catalogs form sections and fields so **D1 field-level mapping** can reconcile EAB205N semantics with TABS UI captures and FREDAsoft operational candidates.

### In scope

- Form title, version, and section structure
- Per-field labels, inferred types, required/conditional posture
- TDLR concept grouping and FREDAsoft **candidate** grouping (not schema decisions)
- High-level crosswalk to **`docs/reference/TDLR_TABS_FORM_FIELD_DISCOVERY.md`**
- D1 mapping implications and open questions

### Out of scope

| Topic | Note |
|-------|------|
| Firestore schema / collection names | **D4** |
| Scraper / TABS extraction implementation | Future implementation |
| PDF parser code | Not in this task |
| Canonical matching / auto-merge | **D6** / D5 rules—staff review only |
| Committed PDF binary | Stays in `FREDAsoftReferenceMaterials` only |

### Indexing method

- Source read from local PDF metadata and text extraction (labels and instruction text only).
- **Pages 1–2:** instruction pages (conditionals, attachments, alternate-form routing).
- **Page 3:** fillable **form layout** (primary field inventory).
- Field labels recorded **as printed** on the form; minor OCR/encoding artifacts normalized in labels where obvious.

---

## 2. Source metadata

| Attribute | Value |
|-----------|-------|
| **Filename** | `eab205n-project-registration.pdf` |
| **Local source path** | `C:\dev\FREDAsoftReferenceMaterials\eab205n-project-registration.pdf` |
| **In FREDAsoft repo** | **No** — metadata only |
| **Form title** | EAB205N — Architectural Barriers Project Registration Application |
| **Form revision (footer)** | Rev. Sept. 2025 |
| **PDF metadata title** | EAB205N - Architectural Barriers Project Registration Application |
| **PDF author** | Texas Department of Licensing & Regulation (TDLR) |
| **Page count** | 3 (instructions pages 1–2; application form page 3) |
| **Submission channel (form notice)** | Online through TABS only; mailed forms returned |
| **Official public URL (compare for version)** | https://www.tdlr.texas.gov/ab/forms/eab205n-project-registration.pdf (and alternate path in source index §5) |
| **Review status** | `reviewed-2026-06-05` — field labels indexed from local PDF; not legal-reviewed |
| **Relationship to `TDLR_RAS_TABS_SOURCE_INDEX.md`** | Row for `eab205n-project-registration.pdf` §3 — this doc is the **field-level expansion** of that catalog entry |
| **Relationship to `TDLR_TABS_FORM_FIELD_DISCOVERY.md`** | TABS captures show **UI implementation** of many EAB205N fields; §6 crosswalks gaps |

---

## 3. Form section inventory

| # | Section heading (form page 3) | Instructions page | Required posture |
|---|--------------------------------|-------------------|------------------|
| — | Form header / submission notice | 3 | Online TABS submission required |
| **1** | RAS INFORMATION | 1 §1 | **Required** |
| **2** | PROJECT INFORMATION | 1 §2 | **Required** |
| **3** | BUILDING or FACILITY OWNER | 1 §3 | **Required** |
| **4** | DESIGNATED AGENT (if applicable) | 2 §4 | **Conditional** — entire section if agent used |
| **5** | DESIGNER INFORMATION (if applicable) | 2 §5 | **Conditional** — if design professional applies |
| **6** | TENANT INFORMATION (If other than owner) | 2 §6 | **Conditional** — if tenant occupies space |

**Instruction-only content (not separate numbered form sections on page 3):**

- General filing rules, fee disclaimers, alternate forms (state lease, special registration)
- CAD document upload requirement
- Cross-references to **EAB243N** (designated agent) and **EAB247N** (LLC/LP/LLP ownership)

---

## 4. Field inventory table

**Column key:**

- **TDLR concept group** — taxonomy for source snapshots (aligned with D6 §6).
- **FREDAsoft candidate group** — where a field may flow **after staff review** (not auto-promoted).

**Field count:** **41 indexed rows** (36 fillable/named inputs on form page 3 + 5 document/reference/notice rows from instructions).

| # | Section | Visible field label | Field type | Required / conditional | TDLR concept group | FREDAsoft candidate group | Notes / open questions |
|---|---------|---------------------|------------|------------------------|-------------------|---------------------------|------------------------|
| 1 | 1 — RAS INFORMATION | Name | text | Required | RAS | canonical stakeholder candidate; project party candidate (RAS Firm) | TABS Details shows RAS Name + address/phone not on EAB205N form |
| 2 | 1 — RAS INFORMATION | RAS # | text | Required | RAS | TDLR source snapshot only; canonical stakeholder candidate | License number; maps to `filter-ras-number`, Details **RAS #** |
| 3 | 2 — PROJECT INFORMATION | Project Name | text | Required | project/facility | Project candidate; TDLR source snapshot only | Details **Project Name** |
| 4 | 2 — PROJECT INFORMATION | Building or Facility Name | text | Conditional (if named building) | project/facility | Facility candidate; TDLR source snapshot only | Instructions: enter if building has a name |
| 5 | 2 — PROJECT INFORMATION | Address (Street Number, Street Name, Suite Number, City, State, Zip Code) | address | Required | project/facility | Facility candidate; TDLR source snapshot only | PO Box not accepted for **physical** project address |
| 6 | 2 — PROJECT INFORMATION | County | text/selection | Required (on form layout) | project/facility | Facility candidate; TDLR source snapshot only | TABS uses numeric city/county ids in modals; Details **Location County** |
| 7 | 2 — PROJECT INFORMATION | Estimated Start Date | date | Required | schedule/cost/scope | Project candidate; TDLR source snapshot only | Details **Start Date**; Manage `lblProjectEstStartdate` |
| 8 | 2 — PROJECT INFORMATION | Estimated Completion Date | date | Required | schedule/cost/scope | Project candidate; TDLR source snapshot only | Details **Completion Date** |
| 9 | 2 — PROJECT INFORMATION | Estimated Cost: $ | amount | Required | schedule/cost/scope | TDLR source snapshot only | Excludes site acquisition, A/E fees, furnishings per instructions |
| 10 | 2 — PROJECT INFORMATION | Type of Work (Select One) | selection | Required | schedule/cost/scope | TDLR source snapshot only | Options: New Construction; Renovation/Alteration; Additions to Existing Building |
| 11 | 2 — PROJECT INFORMATION | Type of Funding (Select One) | selection | Required | funding / ownership classification | TDLR source snapshot only | Public funds/lands/federal roadway vs private funds/lands |
| 12 | 2 — PROJECT INFORMATION | Renovations Only: Are the private funds provided by a tenant? | selection (Yes/No) | Conditional (renovation) | funding / ownership classification | TDLR source snapshot only | Details **Are the private funds provided by the tenant?** |
| 13 | 2 — PROJECT INFORMATION | CAD Account # (non-roadway) | text | Conditional | CAD / LLO / AOF / SOS | source document/attachment metadata; TDLR source snapshot only | N/A for right-of-way; CAD **copy required** at registration (instruction) |
| 14 | 2 — PROJECT INFORMATION | Scope of Work (including square footage) | text | Required | schedule/cost/scope | Project candidate; TDLR source snapshot only | Instructions also list square footage separately; TABS splits **Scope** and **Square Footage** |
| 15 | 3 — BUILDING or FACILITY OWNER | Building/Facility Owner | text | Required | owner | canonical stakeholder candidate; project party candidate (Owner) | Must match CAD owner name per instructions |
| 16 | 3 — BUILDING or FACILITY OWNER | Representative | text | Conditional | owner | contact person candidate | Required for trust/business/government owner per instructions |
| 17 | 3 — BUILDING or FACILITY OWNER | Address (Street Number, Street Name, Suite Number, City, State, Zip Code) | address | Required | owner | canonical stakeholder candidate; TDLR source snapshot only | Mailing address; PO Box allowed for owner |
| 18 | 3 — BUILDING or FACILITY OWNER | Email | email | Required | owner | contact person candidate; TDLR source snapshot only | Must be **unique** among project contacts (instruction) |
| 19 | 3 — BUILDING or FACILITY OWNER | Phone Number | phone | Required | owner | contact person candidate; TDLR source snapshot only | |
| 20 | 3 — BUILDING or FACILITY OWNER | Business Type (Select one) | selection | Required | funding / ownership classification | canonical stakeholder candidate (entity type); TDLR source snapshot only | Options: Individual; Sole Proprietorship; Corporation; Trust or Estate; Limited Partnership; Government; LLP; LLC; Other |
| 21 | 3 — BUILDING or FACILITY OWNER | TAC 68.12(e) false-information notice | certification/signature | Implicit attestation | certification/signature | TDLR source snapshot only | Printed on form; online signature behavior not visible in PDF |
| 22 | 4 — DESIGNATED AGENT | Designated Agent Name | text | Conditional (section) | designated agent | canonical stakeholder candidate; project party candidate (Agent) | Section optional |
| 23 | 4 — DESIGNATED AGENT | Representative | text | Conditional | designated agent | contact person candidate | If agent is a business |
| 24 | 4 — DESIGNATED AGENT | Address (Street Number, Street Name, Suite Number, City, State, Zip Code) | address | Conditional | designated agent | canonical stakeholder candidate; TDLR source snapshot only | PO Box allowed |
| 25 | 4 — DESIGNATED AGENT | Email | email | Conditional | designated agent | contact person candidate | |
| 26 | 4 — DESIGNATED AGENT | Phone Number | phone | Conditional | designated agent | contact person candidate | |
| 27 | 4 — DESIGNATED AGENT | Designated Agent Form attachment | upload/reference | Required if §4 completed | designated agent | source document/attachment metadata | Instruction: attach designated agent form (**EAB243N**) |
| 28 | 5 — DESIGNER INFORMATION | Design Firm Name | text | Conditional (section) | design professional / design firm | canonical stakeholder candidate; project party candidate (Design Firm) | Section marked if applicable |
| 29 | 5 — DESIGNER INFORMATION | Design Professional Name | text | Required if §5 completed | design professional / design firm | contact person candidate | Seal-bearing professional per instructions |
| 30 | 5 — DESIGNER INFORMATION | Address (Street Number, Street Name, Suite Number, City, State, Zip Code) | address | Conditional | design professional / design firm | canonical stakeholder candidate | |
| 31 | 5 — DESIGNER INFORMATION | Email | email | Conditional | design professional / design firm | contact person candidate | |
| 32 | 5 — DESIGNER INFORMATION | Phone number | phone | Conditional | design professional / design firm | contact person candidate | |
| 33 | 5 — DESIGNER INFORMATION | License Type (Select One) | selection | Conditional | design professional / design firm | TDLR source snapshot only | Architect; Engineer; Registered Interior Designer; Landscape Architect; Other (not licensed) |
| 34 | 5 — DESIGNER INFORMATION | License Number (if applicable) | text | Conditional | design professional / design firm | TDLR source snapshot only | Required when licensed type selected |
| 35 | 6 — TENANT INFORMATION | Contact Name | text | Conditional (section) | tenant | contact person candidate; project party candidate (Tenant) | If tenant other than owner |
| 36 | 6 — TENANT INFORMATION | Phone Number | phone | Conditional | tenant | contact person candidate | |
| 37 | 6 — TENANT INFORMATION | Email | email | Conditional | tenant | contact person candidate | |
| 38 | (instruction) | CAD record copy | upload/reference | Required at registration (non-roadway) | CAD / LLO / AOF / SOS | source document/attachment metadata | Not a labeled line on page 3; TABS Manage Documents |
| 39 | (instruction) | Form EAB247N (LLC/LP/LLP ownership) | upload/reference | Conditional | CAD / LLO / AOF / SOS | source document/attachment metadata | Required on file for LP, LLP, LLC per instructions §3 Business Type |
| 40 | (instruction) | Construction documents to RAS | upload/reference | Required (process) | other | source document/attachment metadata | Not uploaded to TDLR/TABS per instructions |
| 41 | (instruction) | Post-registration TABS project number | project identifier | Assigned after submit | project identifier | TDLR source snapshot only | Emailed to owner; not an input on EAB205N form |

---

## 5. Conditional logic / dependencies

Rules visible in the PDF instructions and form layout. **Do not treat as exhaustive TDLR policy** beyond what the form states.

| Trigger | Requirement / behavior | Source |
|---------|------------------------|--------|
| **Standard project** (this form) | Use EAB205N; one form per building/facility address | Instructions p.1 |
| **State lease project** | Use **State Lease Project Registration** form (not EAB205N) | Instructions p.1 |
| **Cost &lt; $50,000 or TAC 68 / TAS 203 exempt** | Use **Special Project Registration** form (EAB245N family) | Instructions p.1 |
| **Renovation/Alteration** selected | **Tenant private funds** Yes/No field applies | Form p.3 |
| **Right-of-way / not single location** | **CAD Account #** marked not applicable | Instructions §2 |
| **CAD Account # provided** | **Copy of CAD record** required at registration | Instructions §2 |
| **Owner Business Type = LP, LLP, or LLC** | **Form EAB247N** must be on file (LLO) | Instructions §3 |
| **Section 4 (Designated Agent) completed** | **Designated Agent Form** (EAB243N) must be attached | Form p.3 + instructions §4 |
| **Section 5 (Designer) completed** | **Design Professional Name** required; license type/number per selection | Instructions §5 |
| **Owner is trust, business, or government** | **Representative** name expected | Instructions §3 |
| **Section 6 (Tenant)** | Applies when occupant is **other than owner** | Form p.3 heading |
| **Owner email** | Cannot duplicate any other contact email on project | Instructions §3 |
| **Physical project address** | PO Box **not** accepted; mailing owner address **may** use PO Box | Instructions §2–3 |
| **Submission** | Online TABS only; mail returned | Form p.3 header |

**Not on EAB205N (routed to other forms / TABS-only):** state lease number, special category, inspection-only, roadway flag — seen in TABS Manage Project labels; likely from alternate registration paths or post-registration metadata.

---

## 6. Comparison to TABS field discovery

High-level crosswalk to **`docs/reference/TDLR_TABS_FORM_FIELD_DISCOVERY.md`**. Detail-level HTML ids remain in that doc.

### 6.1 Fields aligned — EAB205N and public Project Details

| EAB205N field | TABS Project Details display |
|---------------|------------------------------|
| Project Name | Project Name |
| Building or Facility Name | Facility Name |
| Project address + County | Location Address; Location County |
| Estimated Start / Completion Date | Start Date; Completion Date |
| Estimated Cost | Estimated Cost |
| Type of Work | Type of Work |
| Type of Funding | Type of Funds |
| Tenant private funds (renovation) | Are the private funds provided by the tenant? |
| Scope of Work | Scope of Work |
| Square footage (in scope text) | Square Footage (separate on TABS) |
| RAS Name / RAS # | RAS Name; RAS # |
| Owner name / address / phone | Owner Name; Owner Address; Owner Phone |
| Owner contact | Contact Name (owner section) |
| Design Firm Name / address / phone | Design Firm Name; Design Firm Address; Design Firm Phone |
| Tenant | TENANT section (may show Not Assigned) |
| *(post-submit)* | Project Number (TABS #); Current Status |

### 6.2 Fields aligned — EAB205N and Manage Project (additional)

| EAB205N field | TABS Manage Project |
|---------------|---------------------|
| Project Name | `lblProjectName` |
| Building or Facility Name | `lblBuildingorFacilityName` |
| Address | `lblProjectAddress` |
| Estimated dates / cost | `lblProjectEstStartdate`, `lblProjectEstEnddate`, `lblProjectEstCost` |
| Type of Work / Funding | `lblProjectJobClass`, `lblProjectOwnerClass` |
| Tenant funds flag | `lblProjectPrivateFunds` |
| CAD Account # | `lblProjectCADNumber` |
| Scope / square footage | `lblProjectScopeOfWork`, `lblProjectEstimateOfSquareFootage` |
| Owner / Tenant / RAS display | `lblProjectOwner`, `lblProjectTenant`, `lblProjectRAS` |
| Owner Business Type | `BusinessType` select in Owner modal |
| Design Firm / Agent modals | `ContactType` = `Design_Firm`, `Agent` |
| Design Professional / Representative names | `DesignProfessionalName` in modals |
| License Number (designer) | `LicenseNumber` in Design Firm modal |
| CAD / LLO / AOF uploads | Manage Documents; modal `WrittenConfirmation`, `FOEUploadfile`, `SOSUploadfile` |

### 6.3 In EAB205N — not observed in TABS UI captures (or post-registration only)

| EAB205N / instruction item | Notes |
|------------------------------|-------|
| Post-registration **TABS project number** | Output, not input |
| **Construction documents to RAS** (not TDLR upload) | Process rule only |
| Explicit **certification** line (TAC 68.12(e)) | May be TABS online step not in captures |
| **Designated Agent** as distinct section | TABS has Agent modal; public Details may omit Agent block |
| **Designer License Type** enum | TABS modal has `LicenseNumber`; license type enum not confirmed in captures |
| **Owner Representative** vs **Design Professional** on owner | TABS Owner modal `DesignProfessionalName` — label mismatch to EAB205N |

### 6.4 In TABS UI — not on EAB205N form page 3

| TABS field / concept | Notes |
|----------------------|-------|
| **Person Filing Form** / registrant contact | TABS Details §5.2; not a numbered EAB205N section on page 3 |
| **Project Number** (TABS #) / legacy **Project ID** | Assigned after registration |
| **DataVersionId** / EABPRJ era | TABS search metadata |
| **Current Status** / milestone history | Post-registration workflow |
| **Plan Review By** / **Inspection By** | Assigned professionals — Manage Project only |
| **RAS address / phone** on Details | Not on EAB205N form (name + # only) |
| **State lease**, **special category**, **roadway** flags | Alternate forms or TABS-only flags |
| **Payment / fees** | RAS fees separate; TDLR payment UI |
| **Notifications / Letters** | **D7** — post-registration |
| **Proof of submission / inspection** | Separate forms EAB242N / EAB244N |

---

## 7. D1 mapping implications

Suggested **D1 spreadsheet columns** (requirement candidates—not decisions):

| D1 category | EAB205N fields (row #s) | Mapping note |
|-------------|---------------------------|--------------|
| **Source-only (always)** | 2, 9–13, 20–21, 33–34, 41; status/milestone outputs | Preserve in TDLR snapshot; never auto-overwrite canonical |
| **Draft Project** | 3, 7–8, 14 | Hydrate Project metadata after review |
| **Draft Facility** | 4–6 | Site name + physical address + county |
| **Candidate Stakeholder + ProjectParty** | 1–2 (RAS); 15–20 (Owner); 22–26 (Agent); 28–32 (Design Firm); 35–37 (Tenant) | Staff-approved link only (D5/D6) |
| **Contact person candidate** | 16–19; 23–26; 29–32; 35–37 | Person lines distinct from org names |
| **Report instance candidate** | *(none on EAB205N)* | Plan review / inspection dates come post-registration (TABS) |
| **Document / attachment metadata** | 13, 27, 38–39, 40 | CAD, EAB243N, EAB247N, RAS-bound construction docs |
| **Correspondence / milestone** | 41 (project number email to owner) | Triggers **D7**; not on inspection PDF |

**Default posture:** All EAB205N values enter FREDAsoft as **TDLR source snapshot** first; **draft** and **canonical** promotion requires explicit staff review per **`docs/FREDASOFT_PROJECT_TDLR_EXTRACTION_PIPELINE.md` §7**.

---

## 8. Open questions for Kenneth / Archie

1. **Scope + square footage:** EAB205N combines on one line; TABS splits — should D1 map to one Project description field or two?
2. **County on project address:** Required on EAB205N layout — always stored on Facility draft, snapshot only, or both?
3. **Owner Representative** vs TABS Owner modal **Design Professional Name** — same contact person concept or different roles?
4. **RAS on EAB205N** is name + # only; TABS Details adds address/phone — should canonical RAS firm require address from TABS scrape not EAB205N?
5. **Designated Agent** section vs TABS Agent modal — always populated together or optional on public Details?
6. **Designer License Type** on EAB205N — store on snapshot only or map to canonical credential metadata?
7. **Person Filing Form** in TABS but absent on EAB205N page 3 — separate registrant track in D1?
8. **Owner vs Client:** EAB205N Owner fields map to **Owner project party**, not FREDAsoft **Client** — confirm default (D5 Option A)?
9. **RAS firm vs assigned RAS:** EAB205N "RAS Name and Number" — single party or split firm vs individual professional in D1?
10. Which fields may **auto-draft** Project/Facility vs **always** require review (D6 §12)?
11. **Business Type** enum — direct map to D5 stakeholder entity type or snapshot-only with separate canonical typing?
12. **Alternate forms** (state lease, special registration) — exclude from D1 EAB205N mapping scope entirely?
13. Local PDF **Rev. Sept. 2025** vs tdlr.texas.gov URL — which version is authoritative for production mapping?
14. Should **instruction-only** rows (38–40) appear in D1 as document workflow rows separate from field mapping?

---

## 9. Non-goals

- No application code, scraper, or PDF parser
- No Firestore schema, rules, or migrations
- No canonical matching or auto-merge logic
- No PDF copied into `C:\dev\fredasoft` or git
- No credentials, secrets, PII, tokens, or project-specific values in this doc
- No long verbatim excerpts from the PDF

---

## 10. Related docs

| Document | Relevance |
|----------|-----------|
| **`docs/reference/TDLR_RAS_TABS_SOURCE_INDEX.md`** | Catalog entry for this PDF; official URLs |
| **`docs/reference/TDLR_TABS_FORM_FIELD_DISCOVERY.md`** | TABS UI field crosswalk (D5.5) |
| **`docs/reference/TDLR_OPEN_RECORDS_EXPORT_FIELD_INDEX.md`** | TDLR open-records export column headers (pre-D1) |
| **`docs/FREDASOFT_PROJECT_TDLR_EXTRACTION_PIPELINE.md`** | D6 pipeline; EAB205N as primary registration source |
| **`docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md`** | Party roles, dual-track snapshots vs canonical |
| **`docs/FREDASOFT_PROJECT_APP_DISCOVERY.md`** | D1/D6 phased follow-ups |
| **`docs/CONVERT_TO_RAS.md`** | §11 header fields fed from approved operational links |
| **`docs/ARCHITECTURE_DESIGN.md`** | ✅ DECIDED blocks |

---

## Document control

| Item | Value |
|------|-------|
| Created | 2026-06-05 |
| Source PDF in repo | **No** |
| Fields indexed | **41** |
| Form sections on page 3 | **6** (+ header notice) |
| PII / credentials in doc | **None** |
| Legal compliance asserted | **No** |
