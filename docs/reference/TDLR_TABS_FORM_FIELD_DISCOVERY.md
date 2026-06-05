# TDLR / TABS — Form Field Discovery (Page Captures)

**Status:** Documentation-only discovery (pre-D6). **Not implemented.**  
**Last updated:** 2026-06-05  
**Branch context:** `tabs-form-field-discovery`  
**Capture source:** `C:\dev\FREDAsoftReferenceMaterials\TABS_Page_Captures\` (outside repo)

> **Disclaimer:** Field inventory from **local saved HTML captures** only. No live TABS access, no credentials, no network requests. **No PII, project-specific values, emails, phone numbers, addresses, session tokens, or anti-forgery token values** are reproduced below. This doc does **not** specify Firestore schema or extraction implementation.

---

## 1. Purpose and scope

Identify **visible labels**, **HTML field names/ids**, **control types**, **dropdown patterns**, **workflow steps**, and **FREDAsoft mapping candidates** from saved TABS UI pages—input for **D6 TDLR extraction pipeline** design and cross-check with **`docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md`**.

| In scope | Out of scope |
|----------|--------------|
| Local `.txt` HTML saves (+ companion `.jpg` screenshots, not parsed) | Copying captures into git |
| Sanitized URL **paths** only | Query strings with `userid`, tokens, or secrets |
| Field **structure** and **enum patterns** | Full city/county/country option lists (noted as enumerated lookups) |
| Requirement **candidates** | Schema / Firestore decisions |

**Related:** `docs/reference/TDLR_RAS_TABS_SOURCE_INDEX.md`, `docs/reference/EAB205N_PROJECT_REGISTRATION_FIELD_INDEX.md`, `docs/reference/TDLR_OPEN_RECORDS_EXPORT_FIELD_INDEX.md`, `docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md`, `docs/FREDASOFT_PROJECT_TDLR_EXTRACTION_PIPELINE.md`

---

## 2. Capture inventory

| Capture file(s) | Format | Page / workflow | Sanitized URL path (from capture) | HTML analyzed? |
|-----------------|--------|-----------------|-----------------------------------|----------------|
| `ProjectSearchBlank.txt` (+ `.jpg`) | Saved HTML | **Project Search** (empty filters) | `/TABS/Search` | Yes |
| `ProjectSearch.txt` (+ `.jpg`) | Saved HTML | **Project Details** (public/search result view) | `/TABS/Search/Details` (inferred); print: `/TABS/Search/Print/{projectNumber}` | Yes |
| `manageprojectPS.txt` (+ `manageproject1–3.jpg`) | Saved HTML | **Manage Project** (authenticated RAS/staff project hub) | `/TABS/Project/…` (manage view; companion screenshots for scroll sections) | Yes |

**Capture count:** 3 workflows, 5 HTML/text files, 5 companion images (images not field-parsed).

**Stripped from this document:** account emails, registrant/RAS/owner names, street addresses, phone numbers, project numbers, internal GUIDs, `__RequestVerificationToken` values, and navbar `userid` query parameters present in raw captures.

---

## 3. Global TABS UI patterns (all captures)

### 3.1 Navigation / workflow entry points

| Nav label | Sanitized path | TDLR concept | FREDAsoft candidate |
|-----------|----------------|--------------|---------------------|
| My Dashboard | `/TABS/Home/Dashboard` | account | Internal staff / portal shell |
| Search Projects | `/TABS/Search` | project search | Project portfolio list |
| Register New Project | `/TABS/Project/ProjectRegistration` | registration | D6 — not in current captures |
| My Projects | `/TABS/Project/AllRecords` | project list | Project hub |
| Unpaid Projects | `POST /TABS/Project/UnpaidProject` | payment | Milestone / fee workflow |
| Request For Transfer | `/TABS/Project/Transfersearch` | transfer | Out of scope v1 |
| TABS Help | `https://www.tdlr.texas.gov/ab/abfaq.htm` | policy | Source index |

### 3.2 Common hidden / system fields (observed)

| HTML name/id | Type | Notes |
|--------------|------|-------|
| `__RequestVerificationToken` | hidden | Anti-forgery — **never store/log values** |
| `ProjectId` | hidden | Internal project GUID — snapshot metadata only |
| `CreatedBy` | hidden | User GUID |
| `LoginId` / `LoginEmailId` | hidden | Session account — **portal user**, not stakeholder |
| `DataVersionId` | hidden | Legacy vs new numbering scheme |
| `documentsid` / `docregistrationid` | hidden | Document upload context |
| `projectid` | hidden | Duplicate project key on transfer menu |

### 3.3 Site-wide notice (read-only banner)

All captures show CAD number + CAD document upload requirement, LLO form for LLC/LLP/LP, AOF/SOS upload, and TAC 68.12(e) false-information warning — aligns with `TDLR_RAS_TABS_SOURCE_INDEX.md` help sheets.

---

## 4. Project Search (`ProjectSearchBlank.txt`)

**Workflow:** Staff search across registered projects.  
**Form id:** `project-search-form`  
**AJAX endpoints (data-request-url):** `/TABS/Search/SearchProjects`, `/TABS/Search/Details`, `/TABS/Search/Project`  
**Link expire:** `project-search-link-expire-days` = 7 days

### 4.1 Server-side filter parameters (HTML comment — authoritative names)

```text
ProjectName       → filter-project-name
ProjectNumber     → filter-project-number
DataVersionId     → filter-project-version
ProjectStatus     → filter-project-status
OwnerName         → filter-owner-name
FacilityName      → filter-facility-name
ArchitectName     → filter-architect-name
LocationAddress   → filter-location-address
LocationCity      → filter-location-city
LocationCounty    → filter-location-county
DateBegin         → filter-date-begin (registration range)
DateEnd           → filter-date-end
```

### 4.2 Search filter fields

| Visible label | HTML id / name | Type | Options / validation | Required? | TDLR concept | FREDAsoft candidate |
|---------------|----------------|------|--------------------|-----------|--------------|---------------------|
| Project Number | `filter-project-number` | text | Version dropdown: **All**, **TABS**, **EABPRJ** (`filter-project-number-version`) | No | project id | TDLR snapshot `tabs_number` / legacy `ocg` pattern |
| Project Name | `filter-project-name` | text | — | No | project | **Project** name |
| Project Status | `filter-project-status` | select | `3001` Inspection Complete; `3007` Project Closed; `3008` Project Registered; `3009` Review Complete | No | project status | Snapshot status enum |
| RAS Number | `filter-ras-number` | text | — | No | RAS | **RAS Firm** / assigned RAS license # |
| Facility Name | `filter-facility-name` | text | — | No | facility | **Facility** |
| Owner Name | `filter-owner-name` | text | — | No | owner | **Owner** project party / canonical stakeholder |
| Design Firm Name | `filter-architect-name` | text | Label says "Design Firm"; param `ArchitectName` | No | design professional | **Design Firm** party |
| Estimated Start Date | `filter-estimated-date-begin` | text (datepicker) | `MM/DD/YYYY` | No | project dates | Project metadata |
| Estimated End Date | `filter-estimated-date-end` | text (datepicker) | `MM/DD/YYYY` | No | project dates | Project metadata |
| Location Address | `filter-location-address` | text | — | No | facility/site | **Facility** address |
| Location City | `filter-location-city` | select | Texas cities — numeric ids (`1`…`n`) | No | facility | City lookup table |
| Location County | `filter-location-county` | select | Texas counties — numeric ids | No | facility | County lookup table |
| Registration Start Date | `filter-registration-date-begin` | text (datepicker) | `MM/DD/YYYY` | No | registration | TDLR snapshot date |
| Registration End Date | `filter-registration-date-end` | text (datepicker) | `MM/DD/YYYY` | No | registration | TDLR snapshot date |
| Clear Fields | `clear-fields-link` | button | — | — | — | UI only |
| Search | `btn-project-search` | submit | — | — | — | UI only |

**Notes:** City/county dropdowns are **large enumerated lists** in TABS (not reproduced here). D6 may map ids → labels via separate lookup capture or official list.

---

## 5. Project Details (`ProjectSearch.txt`)

**Workflow:** Read-only **Architectural Barriers Project Details Page** (search/print view).  
**Display sections** — labels are `<dt>` / heading text, not editable inputs.

### 5.1 PROJECT section

| Display label | TDLR concept | FREDAsoft candidate |
|---------------|--------------|---------------------|
| Project Name | project | **Project** + snapshot |
| Project Number | project (TABS #) | TDLR snapshot primary id |
| Facility Name | facility | **Facility** |
| Location Address | site address | **Facility** + snapshot |
| Location County | county | Snapshot / Facility |
| Start Date | schedule | Project metadata |
| Completion Date | schedule | Project metadata |
| Estimated Cost | cost estimate | Snapshot (not inspection cost) |
| Type of Work | classification | Snapshot (e.g. Renovation/Alteration) |
| Type of Funds | funding class | Snapshot / owner class |
| Scope of Work | scope | **Project** description |
| Square Footage | scale | Snapshot |
| Are the private funds provided by the tenant? | tenant funding | Snapshot flag |
| Current Status | status | Snapshot status |

### 5.2 PERSON FILING FORM

| Display label | TDLR concept | FREDAsoft candidate |
|---------------|--------------|---------------------|
| Contact Name | registrant | **Contact person** (not necessarily Owner) |

### 5.3 RAS

| Display label | TDLR concept | FREDAsoft candidate |
|---------------|--------------|---------------------|
| RAS Name | RAS | **RAS Firm** party + **assigned RAS** |
| RAS # | RAS license | Snapshot + canonical |
| RAS Address | RAS firm address | Canonical stakeholder |
| RAS Phone | contact | Contact person |

### 5.4 OWNER

| Display label | TDLR concept | FREDAsoft candidate |
|---------------|--------------|---------------------|
| Owner Name | owner | **Owner** project party |
| Owner Address | owner address | Snapshot + canonical |
| Owner Phone | contact | Contact person |
| Contact Name | owner contact | Contact person |

### 5.5 TENANT

| Display | TDLR concept | FREDAsoft candidate |
|---------|--------------|---------------------|
| *(party section)* | tenant | **Tenant** project party; may show "Not Assigned" |

### 5.6 DESIGN FIRM

| Display label | TDLR concept | FREDAsoft candidate |
|---------------|--------------|---------------------|
| Design Firm Name | design firm | **Design Firm** party |
| Design Firm Address | address | Canonical stakeholder |
| Design Firm Phone | contact | Contact person |

**D6 note:** Details page is a strong **extraction target shape** for TDLR registration snapshot rows (read-only HTML, sectioned parties).

**D6 rule (source vs canonical):** TABS HTML extraction should treat each registration save as an **as-recorded source snapshot** and produce **candidate FREDAsoft links/aliases** (and/or **draft operational records**) for staff review—never overwrite or correct the preserved TDLR source snapshot.

**Source reconciliation:** `eab205n-project-registration.pdf` / EAB205N is the **primary intended registration field source**; TABS HTML captures reflect the **UI/implementation field structure** and must be reconciled against EAB205N before finalizing D6 field assumptions.

**Open question:** Public details URL pattern `/TABS/Projects/{projectNumber}` vs internal GUID — which key does D6 use?

---

## 6. Manage Project (`manageprojectPS.txt`)

**Workflow:** Authenticated project hub for RAS/staff — read-only summary panels, editable contact modals, status history, documents, notifications, letters.

### 6.1 Vertical workflow menu (sidebar)

| Menu label | Action / path | TDLR concept | FREDAsoft candidate |
|------------|---------------|--------------|---------------------|
| Dashboard | `/TABS/Home/Dashboard` | navigation | — |
| Add/Update Contact | modals | stakeholders | Project party edit |
| View / Upload Documents | `POST /TABS/Project/ManageDocuments` | documents | D6 attachments / CAD/LLO |
| Plan Review/Revisions | *(in-page)* | plan review | **RAS report instance** (plan review) |
| Inspection | *(in-page)* | inspection | **RAS report instance** (inspection) |
| Corrective Modifications | *(in-page)* | corrections | Future workflow |
| Request for Closure | *(in-page)* | closure | Milestone / correspondence |
| Share/Transfer | transfer APIs | admin | Deferred |
| Payment | `/TABS/Payment/CreateFeeDetail/{projectId}` | payment | Fee milestone snapshot |
| Notifications | `POST /TABS/Notification/Product` | correspondence | **D7** notifications |
| Letters | `POST /TABS/Letters/Product` | correspondence | **D7** PDF letters |
| Legacy Documents | `/TABS/LegacyDocuments/LegacyDocuments/{projectId}` | archive | Read-only reference |

**Header badges (read-only):** `PROJECT ID`, `PROJECT STATUS` — legacy id + status text.

### 6.2 Project identification panel (`#proj_ident`) — read-only labels

| Label text | Label id | TDLR concept | FREDAsoft candidate |
|------------|----------|--------------|---------------------|
| Project ID | `lblProjectId` | project (legacy EABPRJ-style) | Snapshot + cross-ref TABS # |
| Project Name | `lblProjectName` | project | **Project** |
| Building or FacilityName | `lblBuildingorFacilityName` | facility | **Facility** |
| Address | `lblProjectAddress` | site | **Facility** + snapshot |
| Last Action | `lblProjectAction` | workflow | Milestone / status |
| Scope of Work | `lblProjectScopeOfWork` | scope | **Project** |
| Estimate of square footage | `lblProjectEstimateOfSquareFootage` | scale | Snapshot |
| Status | `lblProjectStatus` | status | Snapshot |
| Est. Start Date | `lblProjectEstStartdate` | schedule | Project metadata |
| Est. End Date | `lblProjectEstEnddate` | schedule | Project metadata |
| Estimated Cost | `lblProjectEstCost` | cost estimate | Snapshot |
| Job Class | `lblProjectJobClass` | work type | Snapshot |
| Owner Class | `lblProjectOwnerClass` | funding | Snapshot |
| Private Funds Provided By Tenant? | `lblProjectPrivateFunds` | tenant funds | Snapshot flag |
| Owner | `lblProjectOwner` | owner | **Owner** party |
| Tenant | `lblProjectTenant` | tenant | **Tenant** party |
| RAS | `lblProjectRAS` | RAS | **Assigned RAS** display name |
| State Project? | `lblProjectStateLease` | state lease flag | Snapshot |
| State Lease Number | `lblProjectStateLeaseNumber` | state lease | Snapshot |
| Special Category Project? | `lblSpecialProjectCategory` | special reg | Snapshot |
| Plan Review By | `lblProjectPlanReviewBy` | plan review | **Assigned RAS** / professional |
| Inspection By | `lblProjectInspectionBy` | inspection | **Assigned RAS** / professional |
| Project Created By | `lblProjectCreatedBy` | registration | Snapshot provenance |
| Registrant Contact Phone # | `lblProjectContact` | registrant | Contact person |
| Is Roadway Construction? | `lblIsRoadwayConstruction` | classification | Snapshot flag |
| Project CAD Number | `lblProjectCADNumber` | CAD | Snapshot + upload link |

### 6.3 Contacts table (`#tblContacts`)

**Columns:** Contact Type, Name, Contact or Professional Name, Address, Phone, E-mail, Type of License, License, Is Current, (actions)

**Contact Type display values observed:**

| TABS display type | Maps to `ContactType` (hidden, modals) | FREDAsoft project role |
|-------------------|----------------------------------------|-------------------------|
| Building Or Facility Owner | `Owner` | Owner |
| Design Firm | `Design_Firm` | Design Firm |
| Registered Accessibility Specialists | *(RAS modal — read-only edit)* | RAS Firm / assigned RAS |
| *(Tenant / Agent via add menus)* | `Tenant`, `Agent` | Tenant, Agent |

**API:** `POST /TABS/Project/EditContact` (`Contact-url`)

### 6.4 Project Status Updates (`#psu_info`)

Read-only history table:

| Column | Example row types | TDLR concept | FREDAsoft candidate |
|--------|-------------------|--------------|---------------------|
| Description | Registration, Plan Review, Inspection | milestones | TDLR snapshot timeline |
| Report Date | date | report instance date | **RAS report instance** |
| Submitted On | date | filing date | Correspondence / submission log |
| Status | text | workflow status | Snapshot |

### 6.5 Contact edit modals — shared field patterns

#### Owner modal (`ContactType` = `Owner`)

| Visible label | HTML name/id | Type | Required | Options / notes |
|---------------|--------------|------|----------|-----------------|
| Owner Name / entity | `Name` / `ContactName` | text | Yes | max 150 |
| Business Type | `BusinessType` | select | Yes | See §6.6 |
| Address 1 | `Street1` | text | Yes | max 50 |
| Address 2 | `Street2` | text | No | optional |
| Country | `Country` | select | Yes | Numeric country codes `8000xxx` (full list in TABS; not reproduced) |
| City (US) | `USCity` | text | Yes* | Shown for US |
| State (US) | `USState` | select | Yes* | US states — numeric codes (e.g. Texas `160043`) |
| Zip (US) | `USZip` | text | Yes* | max 5 |
| County (US) | `USCounty` | text | Yes* | |
| City / State / Zip / County (intl) | `City`, `State`, `Zip`, `County` | text | Yes* | Non-US path |
| Design Professional / representative | `DesignProfessionalName` | text | Yes | Owner's direct employee per tooltip |
| Phone | `Phone` | text | Yes | `bfh-phone`, max 25 |
| Email | `Email` | text | Yes | max 50 |
| Written Confirmation | `WrittenConfirmation` | file | No | PDF |
| Articles of Formation | `FOEUploadfile` | file | Conditional | PDF — LLC/LP |
| SOS document | `SOSUploadfile` | file | Conditional | PDF — LLC/LP |
| ContactId | `ContactId` | hidden | — | |
| EffectiveDate | `EffectiveDate` | hidden | — | Address history |
| Address change history | table | read-only | — | Change Date, Address, Written Confirmation |

#### Tenant modal (`ContactType` = `Tenant`)

| Visible label | HTML name/id | Type | Required |
|---------------|--------------|------|----------|
| Tenant Name | `Name` / `ContactName` | text | Yes |
| Phone | `Phone` | text | Yes |
| Email | `Email` | text | Yes |

#### Design Firm modal (`ContactType` = `Design_Firm`)

| Visible label | HTML name/id | Type | Required |
|---------------|--------------|------|----------|
| Design Firm Name | `Name` / `ContactName` | text | Yes |
| Address 1 / 2 | `Street1`, `Street2` | text | Yes / No |
| Country | `Country` | select | Yes |
| US / intl city-state-zip | `USCity`, `USState`, … or `City`, `State`, … | text/select | Yes |
| Design Professional Name | `DesignProfessionalName` | text | Yes |
| License Number | `LicenseNumber` | text | Yes (label: if applicable) |
| Phone | `Phone` | text | Yes |
| Written Confirmation | `WrittenConfirmation` | file | PDF upload |

#### Agent modal (`ContactType` = `Agent`) — title: Owner Agent Designation

| Visible label | HTML name/id | Type | Required |
|---------------|--------------|------|----------|
| Designated Agent or Company Name | `Name` / `ContactName` | text | Yes |
| Address 1 / 2 | `Street1`, `Street2` | text | Yes / No |
| Country | `Country` | select | Yes |
| US / intl address fields | *(same pattern as Owner)* | | |
| Representative Name | `DesignProfessionalName` | text | Yes |
| Written Confirmation | `WrittenConfirmation` | file | PDF |

#### RAS modal — read-only

| Visible label | HTML id | Type | Notes |
|---------------|---------|------|-------|
| RAS Number | `LicenseNumber` | display | **Cannot be modified in TABS UI** (per modal notice — IT staff only) |

### 6.6 Enumerations

**BusinessType (`BusinessType` select):**

| Value | Label |
|-------|-------|
| 27001 | Corporation |
| 27002 | Government |
| 27003 | Individual |
| 27004 | Limited Liability Corporation |
| 27005 | Limited Liability Partnership |
| 27006 | Limited Partnership |
| 27007 | Sole Proprietorship |
| 27008 | Trust or Estate |
| 27009 | Non-Profit |
| 27010 | Other |

**Project Status (search filter):** see §4.2 (`3001`, `3007`, `3008`, `3009`).

**Project number era (`filter-project-number-version`):** All | TABS | EABPRJ.

**ContactType (hidden):** `Owner`, `Tenant`, `Design_Firm`, `Agent` (+ RAS via separate read-only flow).

**Country / City / County:** TABS uses **numeric foreign keys** in `<select>` elements; full enumerations are embedded in page HTML (thousands of options — store as lookup tables in D6, not in this doc).

---

## 7. Summary

### 7.1 Repeated field patterns

| Pattern | Examples | D6 implication |
|---------|----------|----------------|
| Address block | `Street1`, `Street2`, `City`/`USCity`, `State`/`USState`, `Zip`, `County` | Normalize to snapshot + canonical |
| Party name + professional name | `Name` + `DesignProfessionalName` | Org vs contact person (D5) |
| Phone + email pair | `Phone`, `Email` | Contact person |
| PDF uploads | `WrittenConfirmation`, `FOEUploadfile`, `SOSUploadfile` | Attachment pipeline — not inline fields |
| Hidden workflow keys | `ProjectId`, `ContactId`, `ContactType` | Extraction metadata |
| Read-only `lbl*` labels | Manage Project summary | Scrape display text → snapshot |
| Date ranges | `filter-*-date-begin/end`, datepickers | Milestone filtering |

### 7.2 Stakeholder-related fields

- **Search:** `filter-owner-name`, `filter-architect-name`, `filter-ras-number`  
- **Details page sections:** OWNER, RAS, TENANT, DESIGN FIRM, PERSON FILING FORM  
- **Manage contacts:** `ContactType` modals + `#tblContacts`  
- **BusinessType** on Owner aligns with D5 entity types (individual, LLC, sole prop, etc.)  
- **Agent** is separate modal — maps to D5 **Agent** project role  
- **RAS** on project is **not editable** in captured UI — extraction may be read-only from TABS

### 7.3 Project / facility fields

- **Identifiers:** Project Number (TABS / EABPRJ), Project ID (legacy display), `DataVersionId`  
- **Site:** Facility Name, Location Address, City, County, CAD Number  
- **Scope/economics:** Scope of Work, Square Footage, Estimated Cost, Job Class, Owner Class, funding/tenant flags, roadway/special category/state lease

### 7.4 Inspection / plan-review milestone fields

- **Project Status Updates** table: Registration, Plan Review, Inspection rows with Report Date / Submitted On  
- **Manage menu:** Plan Review/Revisions, Inspection, Corrective Modifications, Request for Closure  
- **Assigned professionals:** Plan Review By, Inspection By (display labels)  
- Maps to CONVERT_TO_RAS **report instances** — binding TBD

### 7.5 Fields that should remain TDLR snapshot only

- All **read-only** `lbl*` values as rendered at capture time  
- **Project Status Updates** history rows  
- **TABS status** text and legacy **Project ID** display  
- **Contact address history** rows (Change Date, Address, Written Confirmation)  
- Raw **party names/addresses** from Details page `<dd>` elements  
- **Payment / notification / letter** submission records (D7 — separate from canonical)

### 7.6 Fields that may map to canonical FREDAsoft data (after review)

- Owner / Design Firm / Tenant / Agent modal **editable** fields (post staff review)  
- Normalized **organization** names and **contact person** phone/email  
- **Facility** site address when linked to FREDAsoft Facility  
- **RAS license #** → canonical RAS firm / assigned professional link  
- **BusinessType** → stakeholder entity type enum (D5)

### 7.7 Open questions for Kenneth

1. Is **Project Search Details** the authoritative shape for D6 **public** scrape, or **Manage Project** for authenticated extract?  
2. Should FREDAsoft store **legacy EABPRJ** and **TABS** numbers as separate snapshot fields?  
3. How should **Plan Review By** / **Inspection By** relate to **assigned RAS** vs **RAS Firm** on the registration?  
4. Are **Notification** vs **Letters** (`/TABS/Notification/Product`, `/TABS/Letters/Product`) both in scope for D7?  
5. Should city/county **numeric ids** be resolved at extract time or stored as ids in snapshot?  
6. **Registration** capture not in folder — prioritize saving `/TABS/Project/ProjectRegistration` steps?  
7. Confirm **Design Firm** search param is `ArchitectName` in API — label vs field name mismatch for D6 mapping.

---

## 8. Document control

| Item | Value |
|------|-------|
| Updated | 2026-06-05 (3 workflows analyzed) |
| Captures in repo | **None** |
| PII / tokens in repo doc | **None** (stripped from captures) |
| Live TABS network access | **None** |
| Schema / extraction code | **None** |

**Not yet captured:** Account Register, Project Registration wizard, Payment detail, Inspection request forms — see `TDLR_RAS_TABS_SOURCE_INDEX.md` PDFs for form fields until UI captures exist.
