# FREDAsoft Project Field-Level Mapping

**Status:** Documentation-only (D1). **Not implemented.**  
**Last updated:** 2026-06-05  
**Branch context:** `d1-field-level-mapping`  
**Audience:** Product owner (Kenneth), architecture review (Archie), D2/D4 planning

> **Disclaimer:** This document defines a **field-level mapping framework** across TDLR source layers and FREDAsoft operational candidates. It does **not** specify Firestore collections, field names in code, importers, scrapers, or UI. It does **not** collapse TDLR/TABS source data into FREDAsoft canonical data.

---

## Purpose

D1 reconciles **what each business concept means** across four naming layers so future design (D2 wireframes, D4 schema sketch, D6 implementation) can proceed without conflating government source records with FREDAsoft operational data.

| Layer | Reference |
|-------|-----------|
| **EAB205N** intended registration semantics | `docs/reference/EAB205N_PROJECT_REGISTRATION_FIELD_INDEX.md` |
| **TABS** web/UI implementation | `docs/reference/TDLR_TABS_FORM_FIELD_DISCOVERY.md` |
| **TDLR open-records export** column headers | `docs/reference/TDLR_OPEN_RECORDS_EXPORT_FIELD_INDEX.md` |
| **D6** extraction posture | `docs/FREDASOFT_PROJECT_TDLR_EXTRACTION_PIPELINE.md` |
| **D5** stakeholder / party model | `docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md` |

**Outputs of D1:** business-concept rows, source-of-truth roles, canonical/operational **targets** (conceptual), transformation notes, and reviewer actions—not final schema.

---

## Source Systems and Trust Boundaries

### Source systems

| System | What it represents | Trust for field *meaning* |
|--------|-------------------|---------------------------|
| **EAB205N** | Intended registration form fields at submit time | **Primary** for registration-field semantics |
| **TABS (live UI)** | How TDLR implements/displays registration and post-registration data | **Implementation shape**; reconcile with EAB205N |
| **TDLR open-records export** | Tabular project output from responsive/public-information release | **Bulk/reporting field names**; may be stale vs live TABS |
| **FREDAsoft canonical** | Staff-maintained operational directory and project context | **Internal truth after review**—never auto-overwritten from TDLR |

### Trust boundaries (mandatory)

```text
┌─────────────────────────────────────────────────────────────┐
│  TDLR / TABS SOURCE TRACK (legal / as-recorded)             │
│  EAB205N · TABS pages · open-records export rows            │
│  → preserved in source snapshots (append/version)           │
└──────────────────────────┬──────────────────────────────────┘
                           │ explicit match/link/alias
                           │ (staff-approved only)
                           v
┌─────────────────────────────────────────────────────────────┐
│  FREDAsoft CANONICAL / OPERATIONAL TRACK                    │
│  Project · Facility · Client · canonical stakeholder        │
│  · project party · contact person · draft candidates        │
└─────────────────────────────────────────────────────────────┘
```

- FREDAsoft **does not overwrite or correct** TDLR source data.
- TDLR corrections happen only through TDLR’s authorized TABS process.
- Hydration from any source produces **drafts** and **candidate links** for review—not silent promotion to canonical.

---

## Mapping Principles

| # | Principle |
|---|-----------|
| **MP-1** | **EAB205N anchors semantics** when layers disagree on meaning; TABS and export are cross-checks. |
| **MP-2** | Every ingested value is stored **as-recorded** on the source track before any canonical use. |
| **MP-3** | **Normalization for comparison** (trim, case-fold, id lookup) must not replace stored snapshot text. |
| **MP-4** | **Matching is assistive**—FREDAsoft may suggest candidates; **staff reviewer** approves, rejects, creates new, leaves unmatched, or defers. |
| **MP-5** | Only **approved** associations become explicit **match / link / alias** records (D5, D6). |
| **MP-6** | **Client ≠ Owner** by default (D5): Owner is a project party role; Client is portfolio/billing anchor. |
| **MP-7** | **Facility** holds site/building address for Data Entry; TDLR site text is parallel snapshot until staff links Facility. |
| **MP-8** | Fields absent from one layer are **gaps**, not auto-filled from another layer without review. |
| **MP-9** | Post-registration fields (status, created date, milestones) may exist only on TABS/export—not on EAB205N form inputs. |
| **MP-10** | Open-records export supports **bulk legacy compare**; live TABS extraction remains the primary per-project refresh path when available. |

### Source-of-truth role (column legend)

| Role | Meaning |
|------|---------|
| **Registration intent (EAB205N)** | Field defined on registration form |
| **Live display (TABS)** | Authoritative for what TDLR shows today on a given page |
| **Export/reporting** | Column name in open-records extract |
| **Post-registration only** | Not on EAB205N; appears after TABS registration |
| **FREDAsoft operational** | Maintained internally after review |
| **Snapshot only** | Stays on TDLR source track; no default canonical promotion |

---

## Field Mapping Table

**Reviewer action legend:** `Match` = suggest/link canonical; `Create` = new canonical/party; `Snapshot` = source-only; `Defer` = queue; `N/A` = not applicable on that source.

| Business Concept | EAB205N Intended Field | TABS UI Field | TDLR Export Field | Source-of-Truth Role | FREDAsoft Canonical / Operational Target | Transformation / Parsing | Reviewer Action Needed | Notes |
|------------------|------------------------|---------------|-------------------|----------------------|----------------------------------------|---------------------------|------------------------|-------|
| **TABS / project number** | *(post-submit output; not form input)* | Details **Project Number**; `filter-project-number`; Manage `lblProjectId` (legacy cross-ref) | `Project Number` | Post-registration · Live display · Export | TDLR project source snapshot **primary id**; optional link to FREDAsoft **Project** metadata | Normalize TABS vs EABPRJ era (`DataVersionId`, version filter); do not merge ids silently | **Match** Project link; **Snapshot** always | Assigned after registration; export may mix numbering eras |
| **Project name** | Project Name (§2) | Details **Project Name**; `lblProjectName` | `Project Name` | Registration intent · All layers | TDLR snapshot + **draft Project** name candidate | Trim for compare only | **Match** or draft Project; **Snapshot** | |
| **Project status** | *(not on EAB205N form)* | Details **Current Status**; `lblProjectStatus`; search enums `3001`–`3009` | `Current Status` | Post-registration · Live display · Export | TDLR **milestone/status snapshot**; not canonical Project status without review | Map enum codes ↔ display text when scraping | **Snapshot**; optional draft milestone | Workflow state; changes over time |
| **Project created / registered date** | *(not on EAB205N form)* | Registration date filters; Project Status Updates **Registration** row | `ProjectCreatedOn` | Post-registration · Export | TDLR **milestone snapshot**; not FREDAsoft extraction timestamp | Date parse; timezone TBD | **Snapshot**; **Defer** semantic binding | Registration date vs system created-on TBD |
| **Facility / site name** | Building or Facility Name (§2) | Details **Facility Name**; `lblBuildingorFacilityName` | `Facility Name` | Registration intent · All layers | TDLR snapshot + **draft Facility** name (`fldFacName` candidate) | | **Match** Facility or **Create**; **Snapshot** | Conditional on EAB205N if building named |
| **Project / facility address** | Address (Street… City, State, Zip) (§2) | Details **Location Address**; `lblProjectAddress`; modals `Street1`/`Street2` | `Address`, `Address2`, `City`, `Zip` | Registration intent · Live display · Export | TDLR snapshot + **draft Facility** address candidate | Split composite (EAB205N/TABS) vs export decomposed lines; city id ↔ label on TABS | **Match** Facility; **Snapshot** | Physical site; PO Box not allowed on EAB205N project address |
| **County** | County (§2) | Details **Location County**; `filter-location-county`; `USCounty` | `County` | Registration intent · All layers | TDLR snapshot + Facility county candidate | Numeric county id resolution (TABS) vs text (export) | **Match** Facility; **Snapshot** | |
| **Estimated construction cost** | Estimated Cost: $ (§2) | Details **Estimated Cost**; `lblProjectEstCost` | `Estimated Cost` | Registration intent · All layers | TDLR snapshot **only** (not inspection/finding cost) | Money parse; exclude A/E fees per EAB205N instructions | **Snapshot** | Not `projectData` cost fields |
| **Square footage** | Scope of Work *(includes sq ft)* (§2) | Details **Square Footage**; `lblProjectEstimateOfSquareFootage` | `SquareFootage` | Registration intent · Live display · Export | TDLR snapshot; optional Project metadata draft | Split from combined EAB205N scope line; number parse | **Snapshot**; **Defer** split from scope | EAB205N combines; TABS/export separate |
| **Construction / project type (work)** | Type of Work (§2) | Details **Type of Work**; `lblProjectJobClass` | `Type Of Work` | Registration intent · All layers | TDLR snapshot | Enum map: New Construction / Renovation-Alteration / Additions | **Snapshot** | Export capitalizes **Of** |
| **Funding / owner class** | Type of Funding (§2); Renovations: tenant private funds Yes/No | Details **Type of Funds**; tenant funds flag; `lblProjectOwnerClass`, `lblProjectPrivateFunds` | `Type Of Funds` | Registration intent · Live display | TDLR snapshot | Enum + conditional renovation flag | **Snapshot** | Export lacks tenant-funds flag column |
| **Scope of work / description** | Scope of Work (including square footage) (§2) | Details **Scope of Work**; `lblProjectScopeOfWork` | `Scope of Work` | Registration intent · All layers | TDLR snapshot + **draft Project** description | May need sq ft stripped for canonical description | **Match** draft Project; **Snapshot** | CONVERT_TO_RAS §11 **Project Description** candidate |
| **Start date** | Estimated Start Date (§2) | Details **Start Date**; `lblProjectEstStartdate` | `Start Date` | Registration intent · All layers | TDLR snapshot + Project schedule metadata draft | Date parse | **Snapshot** + optional draft | |
| **Completion date** | Estimated Completion Date (§2) | Details **Completion Date**; `lblProjectEstEnddate` | `Completion Date` | Registration intent · All layers | TDLR snapshot + Project schedule metadata draft | Date parse | **Snapshot** + optional draft | |
| **CAD account number** | CAD Account # (§2) | `lblProjectCADNumber` | `ProjectCADNumber` | Registration intent · Live display · Export | TDLR snapshot + **document attachment metadata** | camelCase export header | **Snapshot**; document workflow | CAD copy required at registration |
| **Owner name** | Building/Facility Owner (§3) | Details **Owner Name**; `lblProjectOwner`; Owner modal `Name` | `OwnerName` | Registration intent · All layers | TDLR **party source snapshot** + **canonical stakeholder** candidate + **Owner project party** | CAD name alignment per EAB205N | **Match** / **Create** / **Defer**; never auto-merge | ≠ FREDAsoft **Client** by default |
| **Owner address** | Owner Address (§3) | Details **Owner Address**; Owner modal address block | `OwnerAddress` | Registration intent · All layers | Party snapshot + canonical stakeholder address candidate | Mailing vs physical; PO Box allowed for owner | **Match** canonical; **Snapshot** | |
| **Owner representative** | Representative (§3) | Owner modal `DesignProfessionalName`; Details **Contact Name** (owner) | *(not in export)* | Registration intent · TABS | **Contact person** candidate | Label mismatch: representative vs design professional name | **Match** / **Create** contact; **Defer** | Export omits |
| **Owner email** | Email (§3) | Owner modal `Email` | *(not in export)* | Registration intent · TABS | Contact person candidate; snapshot | Unique among project contacts (EAB205N) | **Snapshot**; PII access control | Export omits |
| **Owner phone** | Phone Number (§3) | Details **Owner Phone**; Owner modal `Phone` | `OwnerPhone` | Registration intent · All layers | Contact person candidate; snapshot | Phone normalize for compare | **Snapshot** + contact link | |
| **Owner business type** | Business Type (§3) | Owner modal `BusinessType` | *(not in export)* | Registration intent · TABS | Snapshot + stakeholder **entity type** candidate | Enum map to D5 entity types; LP/LLP/LLC → EAB247N | **Match** entity type; **Defer** | Export omits |
| **Tenant name** | Contact Name (§6) | Details TENANT section; Tenant modal `Name` | `Tenant` | Registration intent · Live display · Export | Party snapshot + **Tenant project party** + contact candidate | Export **Tenant** vs EAB205N **Contact Name** | **Match** / **Create** / leave unmatched | May show "Not Assigned" on TABS |
| **Tenant address** | *(not on EAB205N tenant block)* | Sparse in Details | `TenantAddress` | Export · TABS (partial) | Party snapshot only | | **Snapshot**; **Defer** | Export-only vs EAB205N gap |
| **Tenant phone** | Phone Number (§6) | Tenant modal `Phone` | `TenantPhone` | Registration intent · All layers | Contact person candidate; snapshot | | **Snapshot** + contact link | |
| **Tenant email** | Email (§6) | Tenant modal `Email` | *(not in export)* | Registration intent · TABS | Contact person candidate; snapshot | | **Snapshot** | Export omits |
| **Design firm name** | Design Firm Name (§5) | Details **Design Firm Name**; Design Firm modal `Name` | `DesignFirm` | Registration intent · All layers | Party snapshot + **Design Firm project party** + canonical stakeholder | Short export label | **Match** / **Create** | |
| **Design professional name** | Design Professional Name (§5) | Design Firm modal `DesignProfessionalName` | *(not in export)* | Registration intent · TABS | **Contact person** candidate (seal-bearing pro) | | **Match** contact; **Snapshot** | Export omits |
| **Design firm address** | Designer Address (§5) | Details **Design Firm Address**; modal address block | `DesignFirmAddress` | Registration intent · All layers | Party snapshot + canonical address candidate | | **Match** canonical; **Snapshot** | |
| **Design firm phone** | Phone number (§5) | Details **Design Firm Phone**; modal `Phone` | `DesignFirmPhone` | Registration intent · All layers | Contact person candidate; snapshot | | **Snapshot** + contact link | |
| **Design firm email** | Email (§5) | Design Firm modal `Email` | *(not in export)* | Registration intent · TABS | Contact person candidate; snapshot | | **Snapshot** | Export omits |
| **Designer license type / number** | License Type; License Number (§5) | Design Firm modal `LicenseNumber` | *(not in export)* | Registration intent · TABS | Snapshot only | Enum + conditional number | **Snapshot** | Export omits |
| **RAS name** | Name (§1) | Details **RAS Name**; `lblProjectRAS` | `RASName` | Registration intent · All layers | Party snapshot + **RAS Firm** party + assigned RAS display | camelCase `RASName` | **Match** / **Create**; split firm vs individual TBD | EAB205N name+# only |
| **RAS license / registration number** | RAS # (§1) | Details **RAS #**; `filter-ras-number`; RAS modal `LicenseNumber` | `RAS#` | Registration intent · All layers | Snapshot + canonical credential candidate | `#` in export header | **Match** by license #; **Snapshot** | Strong match signal |
| **RAS address** | *(not on EAB205N form)* | Details **RAS Address** | `RASAddress` | Live display · Export | Party snapshot + canonical stakeholder address | | **Match** canonical; **Snapshot** | EAB205N omits; export includes |
| **RAS phone** | *(not on EAB205N form)* | Details **RAS Phone** | *(not in export)* | TABS only | Contact person candidate; snapshot | | **Snapshot** | |
| **Designated agent name** | Designated Agent Name (§4) | Agent modal `Name`; `ContactType` = `Agent` | *(not in export)* | Registration intent · TABS | Party snapshot + **Agent project party** + canonical stakeholder | Requires EAB243N if section used | **Match** / **Create** / unmatched | Entire party absent from export |
| **Agent representative** | Representative (§4) | Agent modal `DesignProfessionalName` | *(not in export)* | Registration intent · TABS | Contact person candidate | | **Match** contact; **Snapshot** | |
| **Agent address** | Agent Address (§4) | Agent modal address block | *(not in export)* | Registration intent · TABS | Party snapshot + canonical address | | **Match**; **Snapshot** | |
| **Agent email / phone** | Email; Phone Number (§4) | Agent modal `Email`, `Phone` | *(not in export)* | Registration intent · TABS | Contact person candidates; snapshot | | **Snapshot** | |
| **Person filing form / registrant** | *(not a numbered EAB205N section on form p.3)* | Details **PERSON FILING FORM** Contact Name | *(not in export)* | TABS only | **Contact person** (registrant)—not necessarily Owner | | **Defer** separate track vs owner rep | Distinct from Owner representative |
| **Tenant private funds (renovation)** | Renovations Only: private funds by tenant? (§2) | Details tenant funds question; `lblProjectPrivateFunds` | *(not in export)* | Registration intent · TABS | TDLR snapshot flag | Yes/No | **Snapshot** | Conditional on renovation work type |

---

## Stakeholder-Related Mapping Notes

Per **`docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md`** (D5):

### Party roles vs canonical directory

| TDLR party (source snapshot) | FREDAsoft project role | Canonical target (after review) |
|------------------------------|------------------------|----------------------------------|
| Building/Facility Owner | **Owner** | Canonical **stakeholder** (org or individual) |
| Design Firm + Design Professional | **Design Firm** + contact | Stakeholder + **contact person** |
| RAS Name / RAS # | **RAS Firm** / **assigned RAS** | Stakeholder; license # as match signal |
| Tenant Contact Name | **Tenant** | Stakeholder or contact-only party TBD |
| Designated Agent | **Agent** | Stakeholder + contact |
| Person Filing Form | *(no project party)* | **Contact person** / registrant track |

### Snapshot vs canonical (never collapse)

1. **TDLR party source snapshot** stores name, address, phone, email **as recorded** on that extraction/export row.
2. **Canonical stakeholder** is a reusable directory entry—staff-maintained, may differ spelling from TDLR.
3. **Project party** links **Project + canonical stakeholder + role**—created only after reviewer approval.
4. **Contact person** is a person affiliated with a stakeholder (or delegate)—not the same as Auth user or assigned RAS.
5. **Alias / observed name** accumulates TDLR text variants linked to one canonical record—approved only.

### Matching posture (D6 + D5)

- FREDAsoft may **suggest** matches (exact name, RAS #, license #, address, prior link).
- Reviewer may: **approve link**, **reject**, **create new** canonical stakeholder, **leave unmatched**, or **defer**.
- **No auto-merge** of TDLR parties into canonical stakeholders.
- Multiple TDLR raw variants may link to **one** canonical stakeholder—each link explicit and auditable.

### Export gap impact

Open-records export includes **Owner, Design, RAS, Tenant** name/address/phone columns but omits **Agent**, **owner email**, **business type**, **designer license**, **tenant email**, and **registrant**. Bulk export matching must not assume export completeness—supplement from TABS scrape or EAB205N semantics when needed.

---

## Project / Facility / Registration Mapping Notes

### FREDAsoft hierarchy today

```text
Client
  └── Facility(ies)
        └── Project
              └── projectData (assessment / RAS inspection records)
```

### TDLR registration vs FREDAsoft entities

| TDLR concept | FREDAsoft mapping (conceptual) |
|--------------|--------------------------------|
| **TDLR project registration record** | **TDLR project source snapshot**—not the FREDAsoft Project document |
| **TABS / project number** | Snapshot primary identifier; optional **approved link** to FREDAsoft Project |
| **Project name, scope, dates, cost, classification** | Snapshot always; may **draft** FREDAsoft Project metadata after review |
| **Building / facility name + site address** | Snapshot always; may **draft** or **link** FREDAsoft **Facility** |
| **Owner on registration** | **Owner project party**—not FREDAsoft **Client** unless explicit same-as link |
| **Post-registration status / milestones** | Snapshot timeline; may inform RAS **report instance** hints (CONVERT_TO_RAS)—binding deferred |

### As-recorded rule

- A row from open-records export, a TABS Details scrape, or an EAB205N-derived parse is **source data**.
- Source rows remain **immutable per extraction run** (append/version on re-fetch)—they are not corrected in FREDAsoft.
- FREDAsoft **Project** and **Facility** documents are **operational**—updated by staff (and future portal-approved changes per D8), not silently replaced when TDLR text changes.

### One-to-one links (after approval)

- **One TDLR project snapshot** → **one FREDAsoft Project** context (approved link).
- Snapshots and Project document remain **separate tracks**.
- Site snapshot may **suggest** Facility link; multiple projects may share a Facility in FREDAsoft hierarchy.

---

## Unmatched or Ambiguous Fields

### Present in EAB205N and/or TABS but **not** in open-records export (30 columns)

| Field / party | Layers | D1 note |
|---------------|--------|---------|
| Designated Agent (entire §4) | EAB205N, TABS | Agent party source-only from live sources |
| Owner email, representative, Business Type | EAB205N, TABS | Contact + entity typing |
| Designer license type/number, email | EAB205N, TABS | Snapshot + credential metadata |
| Tenant email | EAB205N, TABS | Contact person |
| Renovation tenant-funds flag | EAB205N, TABS | Snapshot flag |
| Person Filing Form / registrant | TABS | Separate from Owner rep |
| RAS phone | TABS | Contact |
| Plan Review By / Inspection By | TABS Manage | Assigned professional—report instance (D3) |
| State lease, special category, roadway | TABS Manage | Alternate registration paths |
| Milestone history, documents, fees | TABS Manage | D6/D7 tracks |

### Present in **export** but not on EAB205N form page 3

| Export field | Note |
|--------------|------|
| `Current Status` | Post-registration lifecycle |
| `ProjectCreatedOn` | System/registration timestamp—semantic TBD |
| `Address2` | Decomposed address; merge policy TBD |
| `RASAddress` | RAS location; EAB205N has name+# only |
| `TenantAddress` | EAB205N tenant block has no address |
| `Project Number` | Output field, not registration input |

### Naming / shape differences (mapping attention)

| Topic | Layers |
|-------|--------|
| `ProjectCADNumber` vs **CAD Account #** | Export camelCase vs form label |
| `SquareFootage` vs combined scope line | EAB205N one field; TABS/export separate |
| `RASName`, `RAS#`, `OwnerName`, `DesignFirm` | Concatenated export headers vs spaced labels |
| `Type Of Work` / `Type Of Funds` | Capital **Of** in export |
| `Tenant` vs **Contact Name** | Export vs EAB205N label |
| City/county | Export text; TABS numeric lookup ids |
| Owner modal `DesignProfessionalName` vs EAB205N **Representative** | Role ambiguity |

---

## D6 Extraction Pipeline Implications

Each mapped field participates in the D6 flow (**`docs/FREDASOFT_PROJECT_TDLR_EXTRACTION_PIPELINE.md`**) as follows:

```text
User input (TABS # / URL / optional export row key)
        │
        v
   EXTRACT ──► live TABS page(s) and/or export row reference
        │
        v
   SOURCE SNAPSHOT ──► as-recorded project + party + status fields
        │
        v
   PARSE / NORMALIZE-FOR-COMPARISON ──► typed values for diff/match only
        │
        v
   CANDIDATE MATCH ──► suggest canonical Project / Facility / stakeholder
        │
        v
   STAFF REVIEW ──► side-by-side TDLR vs FREDAsoft
        │
        v
   APPROVED LINK / ALIAS / DRAFT ──► explicit records only
```

| Mapping column | D6 stage |
|----------------|----------|
| EAB205N Intended Field | Semantic validation of parsed snapshot keys |
| TABS UI Field | Primary live extraction key/label map |
| TDLR Export Field | Bulk ingest / legacy compare column map |
| Transformation / Parsing | Stage 5 normalization rules |
| Reviewer Action Needed | Stage 9–11 gate—no stage skips review for canonical promotion |
| FREDAsoft Canonical / Operational Target | Stage 8 hydration preview → stage 11 approved drafts/links |

**Per-source ingestion:** A single project may have snapshots from **EAB205N semantics**, **TABS public Details**, **TABS Manage Project**, and **export row**—stored as separate source artifacts or versions, not merged silently.

---

## Open Questions

*Deferred to later slices—not resolved in D1.*

### D1 / mapping refinement

1. Should **scope** and **square footage** remain one FREDAsoft Project description field or two?
2. How should **Address2** / export decomposed address map to FREDAsoft Facility address fields?
3. Is **Owner Representative** the same concept as TABS Owner modal **DesignProfessionalName**?
4. **RAS firm vs assigned RAS individual**—single party row or split on canonical model?
5. Should **Person Filing Form** be a first-class source party or registrant metadata only?

### D2 (workflow wireframes)

6. UI for side-by-side **TDLR-as-recorded** vs **canonical** per field group?
7. Default reviewer path when **export row** and **live TABS** disagree?
8. Entry points: TABS # only, URL paste, export file row pick?

### D3 (RAS report instance crosswalk)

9. Do **Current Status**, **ProjectCreatedOn**, or TABS Status Updates rows map to specific **report instance** kinds?
10. **Plan Review By** / **Inspection By** → assigned RAS vs RAS Firm party?

### D4 (Firestore schema sketch)

11. Collection/field names for **project snapshot**, **party snapshot**, **parsed field map**, **candidate suggestion**, **approved link**?
12. Versioning: immutable per run vs superseded flag?
13. Store city/county as **text**, **lookup id**, or both on snapshot?

### D6 implementation

14. First implementation source: public Details only, Manage Project only, or both?
15. Re-check frequency; diff presentation when TDLR changes?
16. Should legacy **export file import** be a separate pipeline from live TABS?

### D5 / product

17. **Client vs Owner** same-as link UX when contract customer owns the building?
18. Which fields may **auto-draft** on Project/Facility vs always require field-by-field review?
19. Any match ever **auto-approved**? (Current assumption: **no**.)

### Export / open records

20. Is `Responsive_Information.xlsx` representative of all fields TDLR can release today?
21. Are export headers **stable** across years and requests?
22. Does **`Project Number`** column always mean TABS number, or mixed EABPRJ?

---

## Related documentation

| Document | Relevance |
|----------|-----------|
| `docs/reference/EAB205N_PROJECT_REGISTRATION_FIELD_INDEX.md` | EAB205N column source |
| `docs/reference/TDLR_TABS_FORM_FIELD_DISCOVERY.md` | TABS UI column source |
| `docs/reference/TDLR_OPEN_RECORDS_EXPORT_FIELD_INDEX.md` | Export column source |
| `docs/FREDASOFT_PROJECT_TDLR_EXTRACTION_PIPELINE.md` | D6 pipeline |
| `docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md` | D5 parties and dual-track |
| `docs/FREDASOFT_PROJECT_APP_DISCOVERY.md` | Discovery phases D1–D8 |
| `docs/CONVERT_TO_RAS.md` | §11 header metadata targets |
| `docs/ARCHITECTURE_DESIGN.md` | ✅ DECIDED blocks |
| `docs/reference/TDLR_RAS_TABS_SOURCE_INDEX.md` | Source materials catalog |

---

## Document control

| Item | Value |
|------|-------|
| Created | 2026-06-05 |
| Phase | D1 field-level mapping |
| Mapping rows (initial) | **35** business concepts |
| Implementation | **None** |
| Schema decisions | **None** |
| PII / row data | **None** |
