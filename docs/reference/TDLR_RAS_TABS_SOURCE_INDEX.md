# TDLR / RAS / TABS — Source Document Index

**Status:** Documentation-only reference index. **Not implementation.**  
**Last updated:** 2026-06-04  
**Branch context:** `tdlr-source-index-manifest`  
**Maintainers:** Product owner (Kenneth), architecture review (Archie)

> **Disclaimer:** This index records **where** reference materials live and **how** they may inform FREDAsoft discovery. It does **not** assert TDLR legal compliance, final field requirements, or current regulatory text. **Review each source** before relying on it for requirements. Do **not** treat this file as a substitute for reading primary sources.

---

## 1. Purpose

FREDAsoft Project, RAS, and TDLR-related work (D5–D8, Firestore sketches, correspondence, extraction pipeline) need traceable **source documents**. This index:

- Points to **Google Drive** and a **local reference folder** (outside the repo) as source-document libraries for PDFs and procedure materials  
- Stores in the repo only **curated metadata**, extraction notes, and architecture decisions—**never** the binary PDFs  
- Records **official public URLs** when known (TDLR/TABS web and forms)  
- Tracks **review status** so unreviewed materials are not treated as requirements

**No PDFs are copied into this repository.** No credentials, PII, or long copyrighted excerpts belong here.

| Library | Location | In git? |
|---------|----------|---------|
| **Local reference** | `C:\dev\FREDAsoftReferenceMaterials\` | **No** — metadata only in this index |
| **Google Drive** | [Folder `1tsvdLroXe7w2B0PSw0tC63VTM55exUor`](https://drive.google.com/drive/folders/1tsvdLroXe7w2B0PSw0tC63VTM55exUor) | **No** — metadata only; file IDs pending export |

---

## 2. Document categories

Use one primary category per file:

| Category code | Description |
|---------------|-------------|
| **TDLR-official** | TDLR-published form, rule excerpt, or bulletin (verify against tdlr.texas.gov when possible) |
| **TABS-system** | TABS registration help sheets, field guidance, operational notes |
| **RAS-procedure** | RAS professional procedure, bulletin, or checklist |
| **Sample-deliverable** | Sample plan review, inspection report, or letter (redact PII before indexing notes) |
| **Correspondence** | Letter templates, merge-field examples, milestone correspondence |
| **TAS-standard** | Texas Accessibility Standards reference (1994, 2012, etc.) |
| **Stakeholder-registration** | Party/owner/agent/designer/ownership field definitions |
| **Legal-policy** | Texas Administrative Code, Government Code, Occupations Code excerpts |
| **Other** | Uncategorized until reviewed |

---

## 3. Local reference file inventory

**Root path (outside repo):** `C:\dev\FREDAsoftReferenceMaterials\`  
**Indexed:** 2026-06-04 — filenames only; **no PDF content review** in this pass.  
**Relative path** column is from the root above.

| Filename | Relative path | Category | Likely workflow relevance | Review status | Notes / open questions |
|----------|---------------|----------|---------------------------|---------------|------------------------|
| `1994tas.pdf` | `1994tas.pdf` | TAS-standard | Historical TAS reference; distinguish from TAS 2012 RAS scope | unreviewed | Confirm whether FREDAsoft RAS work needs 1994 TAS citations or archive-only |
| `2012 TAS.pdf` | `2012 TAS.pdf` | TAS-standard | **RAS findings / TAS references**; `rasFindings` citation authority for RAS projects | unreviewed | Primary TAS 2012 standard doc for CONVERT_TO_RAS; map to glossary enforcement |
| `CHAPTER 68. ELIMINATION OF ARCHITECTURAL BARRIERS.pdf` | `CHAPTER 68. ELIMINATION OF ARCHITECTURAL BARRIERS.pdf` | Legal-policy | EAB program rules; form acceptance; registration obligations | unreviewed | Cross-check form version and completeness requirements vs TABS help sheets |
| `EAB Ownership Help Sheet.pdf` | `EAB Ownership Help Sheet.pdf` | Stakeholder-registration | **D5** owner entity types; LLC/LP ownership uploads | unreviewed | D6: which ownership types require LLO / AOF uploads? |
| `EAB-CAD-Numbers-Help-Sheet.pdf` | `EAB-CAD-Numbers-Help-Sheet.pdf` | TABS-system | **D6** CAD number field; registration required document | unreviewed | Map CAD fields to TDLR snapshot vs Facility link |
| `eab-form-requirement-guide.pdf` | `eab-form-requirement-guide.pdf` | TDLR-official | Overview of required EAB forms and completion rules | unreviewed | Index for which forms apply to standard vs special registration |
| `EAB-Help-Sheet-for-Sub-Contractors.pdf` | `EAB-Help-Sheet-for-Sub-Contractors.pdf` | TABS-system | Sub-contractor party context on projects | unreviewed | **D5:** map to Misc role or separate party type? |
| `EAB-Request-for-Inspection-Form-Help-Sheet.pdf` | `EAB-Request-for-Inspection-Form-Help-Sheet.pdf` | TABS-system | Inspection request workflow; milestone dates | unreviewed | Relates to `Request-for-Inspection-EAB241N.pdf` |
| `eab205n-project-registration.pdf` | `eab205n-project-registration.pdf` | TDLR-official | **High priority** **D6** primary registration field source (intended fields; supports D1/D4 schema candidate derivation); **D5** party fields (owner, agent, RAS, design) | reviewed-2026-06-05 — field index | Field inventory: **`docs/reference/EAB205N_PROJECT_REGISTRATION_FIELD_INDEX.md`**. Compare to https://www.tdlr.texas.gov/ab/forms/eab205n-project-registration.pdf for version parity. |
| `eab213n-variance-application.pdf` | `eab213n-variance-application.pdf` | TDLR-official | Variance workflow (likely out of v1 FREDAsoft scope) | unreviewed | Confirm if in scope for Project app or future phase |
| `eab243n-designated-agent-form.pdf` | `eab243n-designated-agent-form.pdf` | TDLR-official | **D5** Agent stakeholder; designated agent attachment to registration | unreviewed | Link to project party role **Agent** and correspondence recipients |
| `eab245n-special-registration.pdf` | `eab245n-special-registration.pdf` | TDLR-official | Special registration path; project classification flags | unreviewed | Map `fldspecialcategory` / inspection-only prototype fields |
| `eab247n-limited-liability-ownership-form.pdf` | `eab247n-limited-liability-ownership-form.pdf` | TDLR-official | **D5/D6** LLC/LP/LLO ownership; TABS upload requirement | unreviewed | Stakeholder entity type **organization** vs ownership form |
| `GV.469.pdf` | `GV.469.pdf` | Legal-policy | Texas Government Code Ch. 469 (EAB statutory basis) | unreviewed | Confirm chapter scope; no legal interpretation in index |
| `Inspection-Response-EAB229N.pdf` | `Inspection-Response-EAB229N.pdf` | TDLR-official | Post-inspection response form | unreviewed | **D7** correspondence vs inspection report deliverable boundary |
| `Notice-of-Substantial-Compliance-EAB246N.pdf` | `Notice-of-Substantial-Compliance-EAB246N.pdf` | TDLR-official / Correspondence | Substantial compliance notice; milestone letter candidate | unreviewed | **D7** merge fields and project milestone triggers |
| `OC.51.pdf` | `OC.51.pdf` | Legal-policy | Texas Occupations Code reference (RAS licensing context) | unreviewed | Confirm section/chapter; RAS credential fields |
| `Proof-of-Inspection-EAB244N.pdf` | `Proof-of-Inspection-EAB244N.pdf` | TDLR-official | Proof-of-inspection filing; inspection milestone metadata | unreviewed | **D6** date fields; link to RAS report instance (inspection kind) |
| `Proof-of-Submission-EAB242N.pdf` | `Proof-of-Submission-EAB242N.pdf` | TDLR-official | Proof-of-submission filing; plan review milestone | unreviewed | **D6** date fields; link to plan review report instance |
| `RAS 2012 - 01.pdf` | `RAS 2012 - 01.pdf` | RAS-procedure | RAS bulletin / guidance (2012 series) | unreviewed | Identify bulletin topic before requirement use |
| `RAS 2012 - 02.pdf` | `RAS 2012 - 02.pdf` | RAS-procedure | RAS bulletin / guidance (2012 series) | unreviewed | Identify bulletin topic before requirement use |
| `RAS 2014 - 03 Equivalent Faciliation.pdf` | `RAS 2014 - 03 Equivalent Faciliation.pdf` | RAS-procedure | Equivalent facilitation guidance (filename spelling: Faciliation) | unreviewed | May inform comment terminology; not registration metadata |
| `RAS Bulletin 2014 -04.pdf` | `RAS Bulletin 2014 -04.pdf` | RAS-procedure | RAS bulletin (2014 series) | unreviewed | Identify bulletin topic before requirement use |
| `RAS-Bulletin-2023-06-owner-response-need.pdf` | `RAS-Bulletin-2023-06-owner-response-need.pdf` | RAS-procedure / Correspondence | Owner response requirements | unreviewed | **D5/D7** owner correspondence; portal submission implications |
| `RAS-Notification-Help.pdf` | `RAS-Notification-Help.pdf` | RAS-procedure / TABS-system | RAS notification procedures in TABS | unreviewed | **D7** notification vs correspondence templates |
| `rasprocedures2018.pdf` | `rasprocedures2018.pdf` | RAS-procedure | **Primary RAS procedures** reference for plan review / inspection workflow | unreviewed | High priority for D6/D7 review; do not infer fields until read |
| `registration-help-sheet.pdf` | `registration-help-sheet.pdf` | TABS-system | TABS project registration step guidance | unreviewed | **D6** extraction UX and required-field checklist |
| `Request-for-Inspection-EAB241N.pdf` | `Request-for-Inspection-EAB241N.pdf` | TDLR-official | Formal inspection request form | unreviewed | Inspection scheduling milestone; **D7** letter triggers |
| `Responsive_Information.xlsx` | `Responsive_Information.xlsx` | TABS-system / Other | **Pre-D1** TDLR open-records export field names (30 columns; ~337k rows) | reviewed-2026-06-05 — header index only | Field inventory: **`docs/reference/TDLR_OPEN_RECORDS_EXPORT_FIELD_INDEX.md`**. **No row data** in repo; workbook not committed. |

**Row count (local reference files):** 29 (flat folder; no subdirectories as of 2026-06-05).

---

## 4. Google Drive source library

| Item | Value |
|------|-------|
| **Role** | Shared **source-document library** (may mirror local reference folder) |
| **Folder URL** | [Google Drive folder](https://drive.google.com/drive/folders/1tsvdLroXe7w2B0PSw0tC63VTM55exUor) |
| **Folder ID** | `1tsvdLroXe7w2B0PSw0tC63VTM55exUor` |
| **Repo policy** | Metadata and notes only in git; binaries remain on Drive |
| **Access** | Requires Google account authorized by folder owner (not public/anonymous) |

### 4.1 Drive file inventory

Automated Drive listing **failed** (sign-in required). Local inventory (§3) may match Drive contents; **file IDs** still needed for Drive URLs.

| Title / filename | Drive URL or file ID | Category | Likely workflow relevance | Review status | Notes / open questions |
|------------------|----------------------|----------|---------------------------|---------------|------------------------|
| *(Drive folder — container)* | [Folder `1tsvdLroXe7w2B0PSw0tC63VTM55exUor`](https://drive.google.com/drive/folders/1tsvdLroXe7w2B0PSw0tC63VTM55exUor) | Library root | All D5–D8 discovery | unreviewed | Add per-file Drive IDs when exported; cross-check against §3 filenames |

**Row count (Drive files individually indexed):** 0 files + 1 folder row. **Local mirror:** 28 files in §3.

---

## 5. Official public sources (web)

These URLs are **publicly reachable** without Drive or local folder access. Cross-check against §3 local copies when both exist. All **unreviewed** for requirement extraction.

| Title | URL | Category | Likely workflow relevance | Review status | Notes / open questions |
|-------|-----|----------|---------------------------|---------------|------------------------|
| Architectural Barriers program hub | https://www.tdlr.texas.gov/ab/ab.htm | TDLR-official | Program overview; links to forms and TABS | unreviewed | Entry point for official form list |
| Architectural Barriers FAQ (incl. TABS FAQs) | https://www.tdlr.texas.gov/ab/abfaq.htm | Legal-policy | Registration rules; user types; upload constraints | unreviewed | D6 extraction constraints (PDF uploads, user types) |
| TABS — Register (account creation) | https://www.tdlr.texas.gov/TABS/Account/Register | TABS-system | Owner, Agent, Tenant, Designer user types; CAD/LLO upload requirements | unreviewed | D5 stakeholder roles; D6 required documents |
| TABS — Login | https://www.tdlr.texas.gov/TABS/Account/Login | TABS-system | System entry point (no credentials stored here) | unreviewed | D6 source page reference only |
| Project Registration form EAB205N (Aug 2023) | https://www.tdlr.texas.gov/ab/forms/Project-Registration-EAB205N.pdf | TDLR-official | Registration fields; RAS info; owner/agent sections | unreviewed | Compare to local `eab205n-project-registration.pdf` |
| Project Registration form (alternate path) | https://www.tdlr.texas.gov/ab/forms/eab205n-project-registration.pdf | TDLR-official | Same form family — confirm version parity | unreviewed | Which URL matches local copy revision? |
| New EAB forms announcement (2023-09-08) | https://www.tdlr.texas.gov/news/2023/09/08/new-elimination-of-architectural-barriers-forms/ | Legal-policy | Form version effective dates; online-only registration | unreviewed | D6 versioning / reject old forms |
| TDLR Public Information Act policy | https://www.tdlr.texas.gov/disclaimer.htm#PublicInfoPolicy | Legal-policy | Data handling context for registration submissions | unreviewed | Portal / retention implications |

**Do not store** TABS login credentials, API keys, or customer PII in this index or the repo.

---

## 6. How this index will be used

| FREDAsoft workstream | Use of this index |
|----------------------|-------------------|
| **D5 — Stakeholder model** (`docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md` §18) | Owner/agent/design forms and help sheets (§3) before finalizing entity definitions |
| **D6 — TDLR extraction pipeline** | EAB205N, help sheets, registration guide for parsed fields, logs, and review queues |
| **D7 — Correspondence requirements** | Proof/notice/request forms and RAS bulletins for letter templates and merge fields |
| **RAS findings / TAS references** | `2012 TAS.pdf` vs registration forms—separate standard citations from project metadata |
| **Future Firestore schema sketches (D4)** | Cite reviewed sources per field group; no schema until sources reviewed |
| **`docs/CONVERT_TO_RAS.md`** | Close §16 research backlog against reviewed §3/§5 sources |

**Workflow:** Source (local, Drive, or public URL) → **human review** → requirement note in architecture/discovery doc → optional ✅ DECIDED in `docs/ARCHITECTURE_DESIGN.md` when durable. This index is a **catalog + review tracker**, not a requirements spec.

---

## 7. Review and maintenance rules

1. **Default status:** `unreviewed` until a named reviewer updates status (e.g. `reviewed-2026-06-XX — Kenneth`).  
2. **No long quotes:** Summarize relevance briefly; full text stays in `FREDAsoftReferenceMaterials`, Drive, or tdlr.texas.gov.  
3. **Versioning:** New form revision → **new row**; do not silently replace filenames or URLs.  
4. **PII:** Forms and samples may contain example project data; index must not reproduce PII.  
5. **Official precedence:** When local/Drive and tdlr.texas.gov disagree, **official public source** wins pending confirmation.  
6. **Local folder sync:** When files are added/removed under `C:\dev\FREDAsoftReferenceMaterials\`, refresh §3 on a docs-only branch—still **no PDFs in git**.

---

## 8. Related FREDAsoft documentation

| Document | Relevance |
|----------|-----------|
| **`docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md`** | §18 — review materials before D6 |
| **`docs/FREDASOFT_PROJECT_TDLR_EXTRACTION_PIPELINE.md`** | D6 extraction pipeline sketch (source hierarchy, stages, matching rules) |
| **`docs/reference/EAB205N_PROJECT_REGISTRATION_FIELD_INDEX.md`** | EAB205N field inventory (pre-D1; primary registration-field source) |
| **`docs/reference/TDLR_OPEN_RECORDS_EXPORT_FIELD_INDEX.md`** | TDLR open-records export column headers (pre-D1; third mapping layer) |
| **`docs/FREDASOFT_PROJECT_FIELD_LEVEL_MAPPING.md`** | D1 cross-layer field mapping (EAB205N + TABS + export) |
| **`docs/FREDASOFT_PROJECT_APP_DISCOVERY.md`** | Project metadata and TDLR-oriented fields |
| **`docs/CONVERT_TO_RAS.md`** | RAS report structure; §16 research backlog |
| **`docs/RAS_FINDING_AUTHORING_STYLE.md`** | TAS-based library prose (distinct from registration forms) |
| **`docs/ARCHITECTURE_DESIGN.md`** | Durable ✅ DECIDED blocks when sources drive architecture |

---

## 9. Document control

| Item | Value |
|------|-------|
| Created | 2026-06-04 |
| Updated | 2026-06-05 (§8 D1 mapping link; §3 Responsive_Information.xlsx row) |
| Local reference path | `C:\dev\FREDAsoftReferenceMaterials\` (outside repo) |
| PDFs in FREDAsoft repo | **None** |
| Secrets / credentials | **None** |
| PII quoted | **None** |
| PDF content reviewed in this pass | **No** — filenames and categories only |
