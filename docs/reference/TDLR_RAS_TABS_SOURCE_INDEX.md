# TDLR / RAS / TABS — Source Document Index

**Status:** Documentation-only reference index. **Not implementation.**  
**Last updated:** 2026-06-04  
**Branch context:** `tdlr-source-index`  
**Maintainers:** Product owner (Kenneth), architecture review (Archie)

> **Disclaimer:** This index records **where** reference materials live and **how** they may inform FREDAsoft discovery. It does **not** assert TDLR legal compliance, final field requirements, or current regulatory text. **Review each source** before relying on it for requirements. Do **not** treat this file as a substitute for reading primary sources.

---

## 1. Purpose

FREDAsoft Project, RAS, and TDLR-related work (D5–D8, Firestore sketches, correspondence, extraction pipeline) need traceable **source documents**. This index:

- Points to the **Google Drive library** as the authoritative file store for PDFs and internal procedure materials  
- Stores in the repo only **curated metadata**, extraction notes, and architecture decisions—**never** the binary PDFs  
- Records **official public URLs** when known (TDLR/TABS web and forms)  
- Tracks **review status** so unreviewed materials are not treated as requirements

**No PDFs are copied into this repository.** No credentials, PII, or long copyrighted excerpts belong here.

---

## 2. Google Drive source library

| Item | Value |
|------|-------|
| **Role** | Primary **source-document library** for TDLR/RAS/TABS PDFs, internal RAS procedures, sample deliverables, and correspondence examples |
| **Folder URL** | [Google Drive folder](https://drive.google.com/drive/folders/1tsvdLroXe7w2B0PSw0tC63VTM55exUor) |
| **Folder ID** | `1tsvdLroXe7w2B0PSw0tC63VTM55exUor` |
| **Repo policy** | Metadata and notes only in git; binaries remain on Drive |
| **Access** | Requires Google account authorized by folder owner (not public/anonymous) |

### Inventory enumeration note

Automated listing of this folder **failed** (Google sign-in / 401 unauthorized from unauthenticated access). **Per-file rows below are incomplete until** a maintainer with Drive access exports filenames and file IDs (see §3.1).

---

## 3. Drive file inventory

### 3.1 How to complete or refresh the inventory

1. Open the [Drive folder](https://drive.google.com/drive/folders/1tsvdLroXe7w2B0PSw0tC63VTM55exUor) with an authorized account.  
2. For each file, copy **exact filename**, **file ID** (from share link or file URL), and optional subfolder path.  
3. Add a row to §3.2 using the column definitions below.  
4. Set **review status** to `unreviewed` until a qualified reviewer confirms relevance and extracts requirement notes elsewhere (not by quoting long passages here).  
5. Add **official public URL** in the notes column when the Drive file duplicates or supplements a TDLR.gov publication.

**File URL pattern:** `https://drive.google.com/file/d/{FILE_ID}/view`

### 3.2 Indexed Drive files

| Title / filename | Drive URL or file ID | Category | Likely workflow relevance | Review status | Notes / open questions |
|------------------|----------------------|----------|---------------------------|---------------|------------------------|
| *(Drive folder — container)* | [Folder `1tsvdLroXe7w2B0PSw0tC63VTM55exUor`](https://drive.google.com/drive/folders/1tsvdLroXe7w2B0PSw0tC63VTM55exUor) | Library root | All D5–D8 discovery | **unreviewed** | Per-file inventory pending authenticated export; do not infer requirements from folder existence alone |

**Row count (Drive files indexed):** 0 individual files + 1 folder container row (as of 2026-06-04).

> **Action for Kenneth:** Paste exported filenames and file IDs into §3.2 (or provide a CSV manifest out-of-band) so this index can list each Drive PDF/document without copying binaries into the repo.

### 3.3 Document categories (for new rows)

Use one primary category per file:

| Category code | Description |
|---------------|-------------|
| **TDLR-official** | TDLR-published form, rule excerpt, or bulletin (verify against tdlr.texas.gov when possible) |
| **TABS-system** | TABS registration UI help, field screenshots, or operational notes |
| **RAS-procedure** | Internal or RAS professional procedure / checklist |
| **Sample-deliverable** | Sample plan review, inspection report, or letter (redact PII before indexing notes) |
| **Correspondence** | Letter templates, merge-field examples, milestone correspondence |
| **TAS-standard** | Texas Accessibility Standards (2012) reference excerpts or indexes |
| **Stakeholder-registration** | Party/owner/agent/designer registration field definitions |
| **Legal-policy** | TDLR policy, FAQ, or administrative code summaries |
| **Other** | Uncategorized until reviewed |

---

## 4. Official public sources (not on Drive)

These URLs are **publicly reachable** without Drive credentials. They should be **cross-checked** against Drive copies when both exist. All listed as **unreviewed** for FREDAsoft requirement extraction until explicitly reviewed.

| Title | URL | Category | Likely workflow relevance | Review status | Notes / open questions |
|-------|-----|----------|---------------------------|---------------|------------------------|
| Architectural Barriers program hub | https://www.tdlr.texas.gov/ab/ab.htm | TDLR-official | Program overview; links to forms and TABS | unreviewed | Entry point for official form list |
| Architectural Barriers FAQ (incl. TABS FAQs) | https://www.tdlr.texas.gov/ab/abfaq.htm | Legal-policy | Registration rules; user types; upload constraints | unreviewed | D6 extraction constraints (PDF uploads, user types) |
| TABS — Register (account creation) | https://www.tdlr.texas.gov/TABS/Account/Register | TABS-system | Owner, Agent, Tenant, Designer user types; CAD/LLO upload requirements | unreviewed | D5 stakeholder roles; D6 required documents |
| TABS — Login | https://www.tdlr.texas.gov/TABS/Account/Login | TABS-system | System entry point (no credentials stored here) | unreviewed | D6 source page reference only |
| Project Registration form EAB205N (Aug 2023) | https://www.tdlr.texas.gov/ab/forms/Project-Registration-EAB205N.pdf | TDLR-official | Registration fields; RAS info; owner/agent sections | unreviewed | D6 parsed field candidates; compare to Drive copies |
| Project Registration form (alternate path) | https://www.tdlr.texas.gov/ab/forms/eab205n-project-registration.pdf | TDLR-official | Same form family — confirm version parity with above | unreviewed | Which URL is current canonical? |
| New EAB forms announcement (2023-09-08) | https://www.tdlr.texas.gov/news/2023/09/08/new-elimination-of-architectural-barriers-forms/ | Legal-policy | Form version effective dates; online-only registration | unreviewed | D6 versioning / reject old forms |
| TDLR Public Information Act policy | https://www.tdlr.texas.gov/disclaimer.htm#PublicInfoPolicy | Legal-policy | Data handling context for registration submissions | unreviewed | Portal / retention implications |

**Do not store** TABS login credentials, API keys, or customer PII in this index or the repo.

---

## 5. How this index will be used

| FREDAsoft workstream | Use of this index |
|----------------------|-------------------|
| **D5 — Stakeholder model** (`docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md` §18) | Confirm TDLR party types, registration vs canonical stakeholder rules before finalizing entity definitions |
| **D6 — TDLR extraction pipeline** | Identify **source pages/forms** for parsed fields, extraction logs, and review queues; map Drive + official PDF field labels to dual-track snapshots |
| **D7 — Correspondence requirements** | Locate letter templates and merge-field examples; separate from inspection report PDF specs |
| **RAS findings / TAS references** | Distinguish **TAS 2012** standard citations (library authoring) from **TDLR registration** forms (project metadata) |
| **Future Firestore schema sketches (D4)** | Cite which sources justify which field groups; no schema until sources reviewed |
| **`docs/CONVERT_TO_RAS.md`** | Close research backlog items (§16) against reviewed sources—not prototype or Drive filenames alone |

**Workflow:** Source (Drive or public URL) → **human review** → requirement note in architecture/discovery doc → optional ✅ DECIDED in `docs/ARCHITECTURE_DESIGN.md` when durable. This index stays a **catalog + review tracker**, not a requirements spec.

---

## 6. Review and maintenance rules

1. **Default status:** `unreviewed` for every new row until a named reviewer marks otherwise in a future edit (e.g. `reviewed-2026-06-XX — Kenneth`).  
2. **No long quotes:** Index notes summarize relevance in one or two sentences; full text stays on Drive or tdlr.texas.gov.  
3. **Versioning:** When TDLR publishes a new form version, add a **new row**; do not silently replace old URLs.  
4. **PII:** Sample deliverables on Drive may contain project-specific data; index notes must not reproduce PII.  
5. **Official precedence:** When Drive and tdlr.texas.gov disagree, **official public source** wins pending Kenneth/Archie confirmation.

---

## 7. Related FREDAsoft documentation

| Document | Relevance |
|----------|-----------|
| **`docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md`** | §18 — review TDLR/TABS materials before D6 |
| **`docs/FREDASOFT_PROJECT_APP_DISCOVERY.md`** | Project metadata and TDLR-oriented fields |
| **`docs/CONVERT_TO_RAS.md`** | RAS report structure; §16 research backlog |
| **`docs/RAS_FINDING_AUTHORING_STYLE.md`** | TAS-based library prose (distinct from TDLR registration forms) |
| **`docs/ARCHITECTURE_DESIGN.md`** | Durable ✅ DECIDED blocks when sources drive architecture |

---

## 8. Document control

| Item | Value |
|------|-------|
| Created | 2026-06-04 |
| Drive PDFs in repo | **None** |
| Secrets / credentials | **None** |
| PII quoted | **None** |
| Drive files individually indexed | **Pending** authenticated inventory export |
