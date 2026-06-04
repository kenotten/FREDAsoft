# RAS Finding Authoring Style Guide

**Status:** Internal authoring convention (documentation only).  
**Last updated:** 2026-06-04  
**Audience:** RAS Plan Review content authors and reviewers

> **Disclaimer:** This guide records **internal spreadsheet/library wording conventions** for curated RAS Plan Review findings. It does **not** assert legal compliance, correct TAS citations for a specific project, or final TDLR/RAS deliverable wording. Qualified staff must review all batch content before any future import.

**Canonical first batch:** **`content/ras-findings/batches/RAS-PR-batch1-doors-maneuvering-clearance.xlsx`** (doors / maneuvering clearance, TAS 404.2.3.2).

---

## 1. Purpose and scope

This document governs **prose and phrasing** for RAS Plan Review **library** rows authored in spreadsheet batches (`rasFindShort`, `rasFindLong`, and how they pair with `findingType` and `tasRefs`).

| In scope | Out of scope |
|----------|----------------|
| Wording in **Findings** tab batches | App UI labels, report PDF layout, Data Entry behavior |
| Reusable **rasFindings** library text | Firestore import rules, dry-run implementation, schema |
| Plan Review **library** authoring | Inspection (field-observation) glossary wording |

**Column layout, enums, and dry-run CLI:** **`docs/RAS_FINDINGS_SPREADSHEET_TEMPLATE.md`**.  
**Import safety and Firestore field map:** **`docs/RAS_FINDINGS_IMPORT_FORMAT.md`**.  
**Product context (Plan Review vs Inspection):** **`docs/CONVERT_TO_RAS.md`**.

Syntax and terminology are **expected to evolve** as more batches are authored. Update this guide when durable conventions emerge from review.

---

## 2. Terminology

- **Finding (v1):** Keep the term **finding** in spreadsheet and import field names (`rasFindShort`, `rasFindLong`, `findingType`) for now. User-facing RAS deliverables may label the same text **Comment** per product planning; that label change does not require renaming import columns in this phase.
- **Batch:** A reviewed `.xlsx` (or export) under **`content/ras-findings/batches/`** or equivalent, validated with the offline dry-run CLI before any future write import.

---

## 3. Field roles

| Field | Role |
|-------|------|
| **`rasFindShort`** | Concise **library/search label** — picker navigation, deduplication review, internal QA. Not a substitute for the full report sentence. |
| **`rasFindLong`** | **Reusable report-facing prose** — the Comment body on RAS Plan Review deliverables (v1). Write so staff can reuse the row across projects with placeholders filled in later. |
| **`tasRefs`** | **Authoritative TAS 2012 citation(s)** for the row — semicolon-separated (e.g. `404.2.3.2`). |
| **`findingType`** | Classification that must **match** the prose pattern (see §7). |

---

## 4. Voice and tone

- **Plan Review library** — describe drawing/plan conditions, not observed field conditions (no “is mounted,” “lacks,” etc. unless intentionally authoring Inspection library content).
- **Concise and direct** — state the condition or information gap; avoid long narrative.
- **Not recommendation-like** — do **not** instruct the design team what to do. Avoid **Revise**, **Provide**, **Include**, **Clarify**, and similar imperatives in `rasFindLong`, except where the row is genuinely about **insufficient information** (and even then, describe what cannot be determined — not a fix list).
- **Banned phrase (library prose):** do **not** use **“on the submitted plans.”**
- **Prefer “determine” over “verify”** in insufficient-information findings.

**Relationship to `CONVERT_TO_RAS.md` §10:** Product planning still lists examples such as “Plans show…” and “The drawings indicate…” for Plan Review. **Curated library batches** may use tighter condition statements (Batch 1 pattern). When in doubt, follow this style guide for **`rasFindings`** library rows.

---

## 5. Placeholders

### `[LOCATION]`

Use **`[LOCATION]`** as the standard placeholder wherever a specific door, room, sheet reference, or similar locator will be supplied at report/Data Entry time — not in the library import row itself.

**Example:** `…on the pull side of the door [LOCATION]…`

### Bracketed choices

Use **pipe-separated choices** inside brackets when one library row covers variants the author or reporter selects later:

**Example:** `[forward | hinge | latch]`

- Be consistent with spacing around `|` within a batch.
- Prefer **one reusable row** with bracketed choices over multiple near-duplicate approved rows that differ only by hinge vs latch vs forward.

**Not in library `rasFindLong` (v1):** project-specific sheet numbers (e.g. `A4.2`) — those belong on report instances / Data Entry fields when implemented.

---

## 6. TAS citations

| Rule | Detail |
|------|--------|
| **Cite in `tasRefs` only** | e.g. `404.2.3.2`; multiple sections: `404.2.3;404.2.4` |
| **Do not repeat in `rasFindLong`** | No “per TAS…”, “section 404.2.3”, “compliance with TAS…”, or subsection numbers in prose |
| **Do not cite in `rasFindShort`** | Short label names the condition, not the code section |
| **TAS 2012 only** | No UFAS, ADA, or other standards in `tasRefs` for this library |

Exact matching and resolution rules: **`docs/RAS_FINDINGS_IMPORT_FORMAT.md` §8**.

---

## 7. “Not provided” vs “insufficient information”

Pair **`findingType`** with the correct prose pattern. **Do not mix** patterns on a single row.

| `findingType` | When to use | `rasFindLong` pattern |
|---------------|-------------|------------------------|
| **`noncompliance`** | Plans/drawings show or imply the accessible condition **is not met** | State that clearance or feature **is not provided** (or equivalent direct condition) |
| **`insufficient_information`** | Plans/drawings **do not support a determination** | **Insufficient information is provided to determine whether…** |

**Do not** use “cannot be determined” language on a **noncompliance** row, or assert “is not provided” on an **insufficient_information** row unless the deficiency is actually shown.

### Suggested `rasFindShort` labels (Batch 1 pattern)

| Pattern | Example `rasFindShort` |
|---------|-------------------------|
| Not provided | Accessible maneuvering clearance not provided |
| Cannot determine | Door maneuvering clearance cannot be determined |

Enum definitions: **`docs/RAS_FINDINGS_IMPORT_FORMAT.md` §6**.

---

## 8. Canonical examples (Batch 1 — doors / maneuvering clearance)

These two approved rows are the **first canonical** library pair for pull-side maneuvering clearance at doors. **`tasRefs`:** `404.2.3.2` for both.

### 8.1 Noncompliance — not provided

| Field | Text |
|-------|------|
| **`rasFindShort`** | Accessible maneuvering clearance not provided |
| **`rasFindLong`** | Accessible maneuvering clearance is not provided on the pull side of the door [LOCATION] for a [forward \| hinge \| latch] approach. |
| **`findingType`** | `noncompliance` |

### 8.2 Insufficient information — cannot determine

| Field | Text |
|-------|------|
| **`rasFindShort`** | Door maneuvering clearance cannot be determined |
| **`rasFindLong`** | Insufficient information is provided to determine whether accessible maneuvering clearance is provided on the pull side of the door [LOCATION] for a [forward \| hinge \| latch] approach. |
| **`findingType`** | `insufficient_information` |

**Reusable finding rule:** Do not add separate approved rows for minor variant wording (e.g. hinge-only vs latch-only) when bracketed choices already cover the library intent.

---

## 9. Good vs bad wording (illustrative)

| Situation | Good (`rasFindLong`) | Bad |
|-----------|----------------------|-----|
| Condition | Accessible maneuvering clearance is not provided on the pull side of the door [LOCATION] for a [forward \| hinge \| latch] approach. | Plans show insufficient maneuvering clearance per TAS 404.2.3.2. Provide dimensioned plan graphics on the submitted plans. |
| Insufficient info | Insufficient information is provided to determine whether accessible maneuvering clearance is provided on the pull side of the door [LOCATION] for a [forward \| hinge \| latch] approach. | Insufficient information is provided to verify maneuvering clearance. Include details on sheet A4.2. |
| TAS in prose | *(none — use `tasRefs`)* | …compliance with TAS 404.2.3.2 maneuvering clearance requirements. |
| Duplication | Two standard rows (§8) | Six approved rows differing only by approach side or latch vs hinge |

---

## 10. Deferred topics

The following are **intentionally deferred** from Batch 1 until separate findings are drafted and reviewed:

| Topic | Notes |
|-------|--------|
| **Recessed door** maneuvering clearance | Distinct condition from pull-side clearance at a standard door; needs its own short/long templates when added. |
| **Push side** (vs Batch 1 pull-side pair) | Add only when a reviewed template is agreed; avoid near-duplicate rows. |
| **Door swing vs clearance** (`coordination_issue`) | Removed from Batch 1 as redundant with the two standard findings; revisit if coordination wording is standardized. |
| **Broader parent `404.2.3` without `404.2.3.2`** | Use only when subsection-level citation is inappropriate; do not duplicate insufficient-information rows. |
| **Category/item names** (e.g. `Doors` / `Interior Doors`) | Placeholders in draft batches until Library Manager / Firestore resolution is approved. |

---

## 11. Pre-authoring checklist (prose)

Before marking a row **`approved`**:

- [ ] `rasFindLong` is reusable and concise — no recommendation imperatives, no “on the submitted plans”
- [ ] TAS citations appear only in **`tasRefs`**
- [ ] **`findingType`** matches the not-provided vs insufficient-information pattern (§7)
- [ ] **`[LOCATION]`** and bracketed choices used consistently
- [ ] No duplicate approved row where one reusable finding with brackets suffices
- [ ] Plan Review tone — not field-inspection observation language
- [ ] Layout/columns validated per **`docs/RAS_FINDINGS_SPREADSHEET_TEMPLATE.md`**

---

## Related documentation

- **`content/ras-findings/batches/RAS-PR-batch1-doors-maneuvering-clearance.xlsx`** — first canonical batch  
- **`docs/RAS_FINDINGS_SPREADSHEET_TEMPLATE.md`** — spreadsheet layout and column spec  
- **`docs/RAS_FINDINGS_IMPORT_FORMAT.md`** — import format and `findingType` enums  
- **`docs/CONVERT_TO_RAS.md`** — RAS product planning  
- **`docs/ARCHITECTURE_DESIGN.md`** — durable ✅ DECIDED blocks  
- **`AGENTS.md`** — data safety before Firestore import  
