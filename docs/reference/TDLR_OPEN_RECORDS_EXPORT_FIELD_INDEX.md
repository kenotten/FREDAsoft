# TDLR Open-Records Export — Field Index

**Status:** Documentation-only field inventory (pre-D1). **Not implemented.**  
**Last updated:** 2026-06-05  
**Branch context:** `tdlr-open-records-export-field-index`  
**Audience:** Product owner (Kenneth), architecture review (Archie), D1 field-mapping work

> **Disclaimer:** This document indexes **column headers and workbook structure** from a local TDLR open-records / public-information Excel export. It does **not** import row data, assert underlying database column names, or specify Firestore schema or import implementation. **No project rows, PII, or cell values** are reproduced. The source workbook remains **outside the repository**.

---

## Table of contents

1. [Purpose and scope](#1-purpose-and-scope)
2. [Source metadata](#2-source-metadata)
3. [Workbook structure](#3-workbook-structure)
4. [Export field inventory table](#4-export-field-inventory-table)
5. [Field list (exact headers)](#5-field-list-exact-headers)
6. [Comparison to EAB205N and TABS field discovery](#6-comparison-to-eab205n-and-tabs-field-discovery)
7. [D1 mapping implications](#7-d1-mapping-implications)
8. [Source-vs-canonical warning](#8-source-vs-canonical-warning)
9. [Open questions for Kenneth / Archie](#9-open-questions-for-kenneth--archie)
10. [Non-goals](#10-non-goals)
11. [Related docs](#11-related-docs)

---

## 1. Purpose and scope

### Purpose

Provide a **third field-name layer** for pre-**D1** mapping alongside:

| Layer | Doc |
|-------|-----|
| **EAB205N** intended registration fields | **`docs/reference/EAB205N_PROJECT_REGISTRATION_FIELD_INDEX.md`** |
| **TABS** web/display/form fields | **`docs/reference/TDLR_TABS_FORM_FIELD_DISCOVERY.md`** |
| **TDLR open-records export** column headers | **This document** |

The export represents **TDLR-released project output** (tabular), useful for legacy bulk reference, cross-checking TABS/TDLR field naming, and matching suggestions—not as authoritative over EAB205N registration semantics or live TABS pages.

### In scope

- Workbook/sheet/table metadata (structure only)
- Per-column export field names, inferred types, concept groups
- Crosswalk notes to EAB205N and TABS where obvious
- D1 mapping column guidance and source-vs-canonical posture

### Out of scope

| Topic | Note |
|-------|------|
| Row data import / migration | Not in this phase |
| Parser or ETL implementation | Future branch |
| Confirmation of TDLR internal DB schema | Export headers only |
| Firestore schema | **D4** |
| Committed Excel binary | Stays in `FREDAsoftReferenceMaterials` |

### Indexing method

- Opened workbook in **read-only** mode; read **row 1 headers** and dimension metadata only.
- **No data rows** read for content indexing.
- Excel **table** name/ref taken from workbook XML metadata.

---

## 2. Source metadata

| Attribute | Value |
|-----------|-------|
| **Filename** | `Responsive_Information.xlsx` |
| **Local source path** | `C:\dev\FREDAsoftReferenceMaterials\Responsive_Information.xlsx` |
| **In FREDAsoft repo** | **No** — metadata only |
| **Source type** | TDLR open-records / public-information responsive export (tabular project listing) |
| **Date received** | **Unknown** — not visible in workbook metadata indexed |
| **File size (approx.)** | ~88.6 MB |
| **Review status** | `reviewed-2026-06-05` — headers and structure indexed; row content not reviewed |
| **Relationship to `TDLR_RAS_TABS_SOURCE_INDEX.md`** | Catalog entry added §3 — field-level expansion here |
| **Relationship to D6 pipeline** | Supplemental **source snapshot** shape for bulk/legacy compare; does not replace TABS live extraction (**`docs/FREDASOFT_PROJECT_TDLR_EXTRACTION_PIPELINE.md`**) |

---

## 3. Workbook structure

| Item | Value |
|------|-------|
| **Sheets found** | 1: `architectural barriers ALL proj` |
| **Active sheet** | `architectural barriers ALL proj` |
| **Excel table name** | `architectural_barriers_ALL_projects_results` |
| **Table range** | `A1:AD337236` |
| **Total rows (incl. header)** | 337,236 |
| **Data rows (excl. header)** | 337,235 |
| **Column count** | 30 (columns A–AD) |
| **Headers clean/unique** | **Yes** — 30 distinct non-empty header strings, row 1 only |
| **Formatting notes** | Single flat table; no additional metadata sheets observed; camelCase/PascalCase mixed headers (`ProjectCADNumber`, `SquareFootage`, `RASName`, `RAS#`) |

**Structure summary:** One worksheet containing one Excel table of architectural-barriers projects with a header row and large row volume suitable for **bulk reference**, not for committing row content to git.

---

## 4. Export field inventory table

**Field count:** **30** (all columns indexed below).

| Col # | Export field name | Inferred type | TDLR concept group | FREDAsoft candidate group | Related EAB205N field(s) | Related TABS field(s) | Notes / open questions |
|-------|-------------------|---------------|------------------|---------------------------|--------------------------|-------------------------|------------------------|
| 1 | Project Number | text | project identifier | TDLR source snapshot only; Project candidate | Post-registration output (instruction §41) | Details **Project Number**; `filter-project-number`; `lblProjectId` cross-ref | TABS vs EABPRJ era — see §9 |
| 2 | ProjectCADNumber | text | CAD | TDLR source snapshot only; source document/attachment metadata | CAD Account # (row 13) | `lblProjectCADNumber` | Naming: no space; differs from form label **CAD Account #** |
| 3 | Project Name | text | project/facility | Project candidate; TDLR source snapshot only | Project Name (row 3) | Details **Project Name**; `lblProjectName` | |
| 4 | Facility Name | text | project/facility | Facility candidate; TDLR source snapshot only | Building or Facility Name (row 4) | Details **Facility Name**; `lblBuildingorFacilityName` | |
| 5 | Address | text | project/facility | Facility candidate; TDLR source snapshot only | Project address composite (row 5) | Details **Location Address**; `lblProjectAddress` | Site physical address |
| 6 | Address2 | text | project/facility | Facility candidate; TDLR source snapshot only | Suite in project address line (row 5) | Often embedded in TABS address string | Export splits suite/line2; TABS may not |
| 7 | City | text | project/facility | Facility candidate; TDLR source snapshot only | City in project address (row 5) | `filter-location-city`; `USCity` (numeric ids in TABS) | Export uses text city; TABS may use lookup id |
| 8 | Zip | text | project/facility | Facility candidate; TDLR source snapshot only | Zip in project address (row 5) | `USZip` | |
| 9 | County | text | project/facility | Facility candidate; TDLR source snapshot only | County (row 6) | Details **Location County** | |
| 10 | Start Date | date | schedule/cost/scope | Project candidate; TDLR source snapshot only | Estimated Start Date (row 7) | Details **Start Date**; `lblProjectEstStartdate` | |
| 11 | Completion Date | date | schedule/cost/scope | Project candidate; TDLR source snapshot only | Estimated Completion Date (row 8) | Details **Completion Date**; `lblProjectEstEnddate` | |
| 12 | Estimated Cost | money | schedule/cost/scope | TDLR source snapshot only | Estimated Cost (row 9) | Details **Estimated Cost**; `lblProjectEstCost` | |
| 13 | Type Of Work | text/enum | schedule/cost/scope | TDLR source snapshot only | Type of Work (row 10) | Details **Type of Work**; `lblProjectJobClass` | Spacing: **Of** capitalized in export |
| 14 | Type Of Funds | text/enum | schedule/cost/scope | TDLR source snapshot only | Type of Funding (row 11) | Details **Type of Funds**; `lblProjectOwnerClass` | |
| 15 | Current Status | enum/status | status/milestone | milestone/status candidate; TDLR source snapshot only | *(not on EAB205N form)* | Details **Current Status**; `lblProjectStatus`; search status codes | Post-registration workflow field |
| 16 | Scope of Work | text | schedule/cost/scope | Project candidate; TDLR source snapshot only | Scope of Work (row 14) | Details **Scope of Work**; `lblProjectScopeOfWork` | EAB205N combines sq ft in one field |
| 17 | SquareFootage | number | schedule/cost/scope | TDLR source snapshot only | Embedded in scope on form (row 14) | Details **Square Footage**; `lblProjectEstimateOfSquareFootage` | camelCase; separate column in export/TABS |
| 18 | ProjectCreatedOn | date | status/milestone | milestone/status candidate; TDLR source snapshot only | *(not on EAB205N form)* | `filter-registration-date-*`; registration timeline | Registration vs extraction timestamp — §9 |
| 19 | RASName | text | RAS | project party source snapshot; canonical stakeholder candidate | RAS Name (row 1) | Details **RAS Name**; `lblProjectRAS` | camelCase concatenation |
| 20 | RAS# | text | RAS | TDLR source snapshot only; canonical stakeholder candidate | RAS # (row 2) | Details **RAS #**; `filter-ras-number` | Special char `#` in header |
| 21 | RASAddress | text/address | RAS | project party source snapshot; canonical stakeholder candidate | *(not on EAB205N form)* | Details **RAS Address** | Export includes address EAB205N omits |
| 22 | OwnerName | text | owner | project party source snapshot; canonical stakeholder candidate | Building/Facility Owner (row 15) | Details **Owner Name**; `lblProjectOwner` | camelCase |
| 23 | OwnerAddress | text/address | owner | project party source snapshot; canonical stakeholder candidate | Owner address (row 17) | Details **Owner Address** | |
| 24 | OwnerPhone | phone | owner | contact person candidate; TDLR source snapshot only | Phone Number (row 19) | Details **Owner Phone** | |
| 25 | DesignFirm | text | design firm | project party source snapshot; canonical stakeholder candidate | Design Firm Name (row 28) | Details **Design Firm Name** | Short label vs **Design Firm Name** |
| 26 | DesignFirmAddress | text/address | design firm | project party source snapshot; canonical stakeholder candidate | Designer address (row 30) | Details **Design Firm Address** | |
| 27 | DesignFirmPhone | phone | design firm | contact person candidate; TDLR source snapshot only | Phone number (row 32) | Details **Design Firm Phone** | |
| 28 | Tenant | text | tenant | project party source snapshot; canonical stakeholder candidate | Contact Name (row 35) | Details TENANT section | Export label **Tenant** vs EAB205N **Contact Name** |
| 29 | TenantAddress | text/address | tenant | project party source snapshot; canonical stakeholder candidate | *(not on EAB205N tenant section)* | May be sparse in TABS Details | Export has address EAB205N tenant block lacks |
| 30 | TenantPhone | phone | tenant | contact person candidate; TDLR source snapshot only | Phone Number (row 36) | Details / tenant modal `Phone` | |

---

## 5. Field list (exact headers)

Exact **30** export column headers as shown in row 1 (column order A→AD):

1. Project Number  
2. ProjectCADNumber  
3. Project Name  
4. Facility Name  
5. Address  
6. Address2  
7. City  
8. Zip  
9. County  
10. Start Date  
11. Completion Date  
12. Estimated Cost  
13. Type Of Work  
14. Type Of Funds  
15. Current Status  
16. Scope of Work  
17. SquareFootage  
18. ProjectCreatedOn  
19. RASName  
20. RAS#  
21. RASAddress  
22. OwnerName  
23. OwnerAddress  
24. OwnerPhone  
25. DesignFirm  
26. DesignFirmAddress  
27. DesignFirmPhone  
28. Tenant  
29. TenantAddress  
30. TenantPhone  

---

## 6. Comparison to EAB205N and TABS field discovery

### 6.1 Present in all three layers (EAB205N + TABS + export)

| Concept | EAB205N | TABS | Export header |
|---------|---------|------|---------------|
| Project name | Project Name | Project Name | Project Name |
| Facility name | Building or Facility Name | Facility Name | Facility Name |
| Site address | Address (+ county on form) | Location Address / County | Address, Address2, City, Zip, County |
| Schedule | Estimated Start/Completion Date | Start/Completion Date | Start Date, Completion Date |
| Cost | Estimated Cost | Estimated Cost | Estimated Cost |
| Work type | Type of Work | Type of Work | Type Of Work |
| Funding | Type of Funding | Type of Funds | Type Of Funds |
| Scope | Scope of Work (+ sq ft in text) | Scope of Work | Scope of Work |
| Square footage | In scope line | Square Footage | SquareFootage |
| RAS identity | Name, RAS # | RAS Name, RAS # | RASName, RAS# |
| Owner | Owner, address, phone | OWNER section | OwnerName, OwnerAddress, OwnerPhone |
| Design firm | Firm, address, phone | DESIGN FIRM section | DesignFirm, DesignFirmAddress, DesignFirmPhone |
| Tenant contact | Contact Name, phone | TENANT section | Tenant, TenantPhone |

### 6.2 Present in EAB205N and export (TABS may differ or be richer)

| Concept | Notes |
|---------|-------|
| CAD number | EAB205N **CAD Account #** ↔ export **ProjectCADNumber** ↔ TABS `lblProjectCADNumber` |
| Tenant private funds (renovation) | EAB205N Yes/No — **not** an export column |
| Designated Agent | EAB205N §4 — **not** in export |
| Designer license type/number | EAB205N §5 — **not** in export |
| Owner email, Business Type, Representative | EAB205N — **not** in export |

### 6.3 Present in TABS UI and export (not on EAB205N form page 3)

| Concept | Export | TABS |
|---------|--------|------|
| Current status | Current Status | Details + `lblProjectStatus` |
| Registration/created date | ProjectCreatedOn | Registration date filters / status table |
| RAS address | RASAddress | Details **RAS Address** |
| Tenant address | TenantAddress | May be partial in Details |

### 6.4 Present in EAB205N / TABS but **not** in export (30 columns)

| Missing from export | Where it appears |
|---------------------|------------------|
| Designated Agent (entire party) | EAB205N §4; TABS Agent modal |
| Owner email | EAB205N; TABS Owner modal |
| Owner representative / contact name | EAB205N; TABS Owner **Contact Name** / `DesignProfessionalName` |
| Owner Business Type | EAB205N; TABS `BusinessType` |
| Design professional name (separate from firm) | EAB205N; TABS modal |
| Designer email, license type/number | EAB205N §5 |
| Tenant email | EAB205N; TABS tenant modal |
| Person Filing Form / registrant | TABS Details §5.2 |
| Renovation tenant-funds flag | EAB205N; TABS Details |
| Plan Review By / Inspection By | TABS Manage Project |
| State lease / special / roadway flags | TABS Manage labels |
| Milestone history, documents, fees | TABS Manage Project |

### 6.5 Present in export but **not** obvious on EAB205N form

| Export field | Note |
|--------------|------|
| **Current Status** | Post-registration lifecycle |
| **ProjectCreatedOn** | System registration timestamp |
| **Address2** | Decomposed address line |
| **RASAddress** | RAS location on export/TABS; EAB205N has name+# only |
| **TenantAddress** | Export column; EAB205N tenant block has no address |
| **Project Number** as data column | Assigned after submit on EAB205N |

### 6.6 Naming differences (mapping attention for D1)

| Export header | Typical EAB205N / TABS label |
|---------------|------------------------------|
| `ProjectCADNumber` | CAD Account # / Project CAD Number |
| `SquareFootage` | Square Footage / combined in Scope line |
| `ProjectCreatedOn` | Registration date / Project Registered |
| `RASName`, `RAS#`, `RASAddress` | RAS Name, RAS #, RAS Address (spacing/punctuation) |
| `OwnerName`, `DesignFirm` | Owner Name, Design Firm Name (concatenated) |
| `Type Of Work`, `Type Of Funds` | Type of Work, Type of Funds (capital **Of**) |
| `Tenant` | Contact Name / Tenant |

---

## 7. D1 mapping implications

D1 field-mapping spreadsheet (or doc) should include **separate source columns** for each naming layer:

| D1 column (requirement candidate) | Purpose |
|-----------------------------------|---------|
| **EAB205N field label** | Intended registration semantics |
| **TABS observed web field name/id** | Live UI / HTML implementation |
| **TDLR open-records export field name** | This export’s exact header string |
| **FREDAsoft source snapshot candidate** | Target snapshot field/key (conceptual) |
| **FREDAsoft canonical/operational candidate** | Draft Project/Facility/Party/Contact target |
| **Review / notes** | Gaps, conditional rules, open questions |

**Suggested D1 rows:** Start from **EAB205N** as semantic anchor; add export and TABS columns for each concept; mark export-only or form-only fields explicitly.

**Bulk legacy path (optional future):** Export may support **matching/hydration hints** for historical projects without live TABS scrape—still subject to staff review (**D6**). Not a substitute for per-project TABS snapshots when live data is available.

---

## 8. Source-vs-canonical warning

Per **`docs/FREDASOFT_PROJECT_TDLR_EXTRACTION_PIPELINE.md`** and **`docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md` §9**:

| Rule | Application to this export |
|------|----------------------------|
| Export rows are **TDLR source/output records** | Treat as **as-recorded** snapshot input, not canonical truth |
| **Do not overwrite** FREDAsoft canonical records from export | Matching is assistive; staff approves links |
| Export may inform **source snapshots**, **matching suggestions**, and **D1 mapping** | Header inventory only in this doc phase |
| **No row import** in this docs-only task | No migration script, no Firestore writes |
| Export may be **stale** vs live TABS | Re-check policy TBD (§9) |
| PII in file | **Do not commit** workbook or quote row values in repo docs |

---

## 9. Open questions for Kenneth / Archie

1. Is this export **representative** of the fields TDLR can provide today, or a subset from a specific open-records request?
2. Does TDLR provide **additional columns** on request (agent, email, milestones, fees)?
3. Are export headers **stable across years** and export batches?
4. Should FREDAsoft support importing **legacy TDLR export files** separately from **live TABS lookup** (D6)?
5. When export and TABS page values **disagree**, which source wins for **source snapshot** vs **draft** hydration?
6. Should **`ProjectCreatedOn`** map to registration date, TDLR system created timestamp, or FREDAsoft extraction metadata?
7. Is **`Project Number`** always **TABS-number** compatible, or does it include **EABPRJ** legacy values in the same column?
8. Is **`Tenant`** always a person name, org name, or either—same mapping as EAB205N **Contact Name**?
9. Should **`Address2`** merge into FREDAsoft Facility address fields or stay a separate snapshot field?
10. Is bulk export matching **in scope** for v1 Project app, or TABS-only extraction first?
11. Should this file be added to a **controlled reference library** with version/date received tracking?
12. Any **retention/redistribution** limits on the open-records file affecting FREDAsoft storage policy?

---

## 10. Non-goals

- No row-data import or preview in repo
- No migration script or Excel parser implementation
- No Firestore schema or rules
- No committed Excel file
- No PII, project-specific rows, addresses, phones, or emails from the workbook
- No assertion of TDLR internal database column names

---

## 11. Related docs

| Document | Relevance |
|----------|-----------|
| **`docs/reference/EAB205N_PROJECT_REGISTRATION_FIELD_INDEX.md`** | Registration-field anchor for D1 |
| **`docs/reference/TDLR_TABS_FORM_FIELD_DISCOVERY.md`** | TABS UI field crosswalk |
| **`docs/reference/TDLR_RAS_TABS_SOURCE_INDEX.md`** | Reference materials catalog |
| **`docs/FREDASOFT_PROJECT_TDLR_EXTRACTION_PIPELINE.md`** | Extraction and snapshot rules (D6) |
| **`docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md`** | Party roles; dual-track data |
| **`docs/FREDASOFT_PROJECT_APP_DISCOVERY.md`** | D1 phased follow-up |
| **`docs/CONVERT_TO_RAS.md`** | §11 header fields from approved links |
| **`docs/ARCHITECTURE_DESIGN.md`** | ✅ DECIDED blocks |

---

## Document control

| Item | Value |
|------|-------|
| Created | 2026-06-05 |
| Source workbook in repo | **No** |
| Columns indexed | **30** |
| Data rows in source (excl. header) | 337,235 (count only; no row content indexed) |
| PII / row values in doc | **None** |
