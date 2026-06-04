# RAS Finding Authoring Style Guide

**Status:** Internal authoring convention (documentation only).  
**Last updated:** 2026-06-04  
**Audience:** RAS Plan Review content authors and reviewers

> **Disclaimer:** This guide records **internal spreadsheet/library wording conventions** for curated RAS Plan Review findings. It does **not** assert legal compliance, correct TAS citations for a specific project, or final TDLR/RAS deliverable wording. Qualified staff must review all batch content before any future import.

**Canonical first batch (Family 1):** **`content/ras-findings/batches/RAS-PR-batch1-doors-maneuvering-clearance.xlsx`** (doors / maneuvering clearance, TAS 404.2.3.2).

---

## 1. Purpose and scope

This document governs **prose and phrasing** for RAS Plan Review **library** rows authored in spreadsheet batches (`rasFindShort`, `rasFindLong`, and how they pair with `findingType` and `tasRefs`).

| In scope | Out of scope |
|----------|----------------|
| Wording in **Findings** tab batches | App UI labels, report PDF layout, Data Entry behavior |
| Reusable **rasFindings** library text | Firestore import rules, dry-run implementation, schema |
| Plan Review **library** authoring | Inspection (field-observation) glossary wording |
| **Syntax families** — reusable `rasFindLong` patterns | Firebase/Firestore import behavior, app UI |

**Column layout, enums, and dry-run CLI:** **`docs/RAS_FINDINGS_SPREADSHEET_TEMPLATE.md`**.  
**Import safety and Firestore field map:** **`docs/RAS_FINDINGS_IMPORT_FORMAT.md`**.  
**Product context (Plan Review vs Inspection):** **`docs/CONVERT_TO_RAS.md`**.

Syntax and terminology are **expected to evolve** as more batches are authored. Update this guide when durable conventions emerge from review.

---

## 2. Terminology

- **Finding (v1):** Keep the term **finding** in spreadsheet and import field names (`rasFindShort`, `rasFindLong`, `findingType`) for now. User-facing RAS deliverables may label the same text **Comment** per product planning; that label change does not require renaming import columns in this phase.
- **Batch:** A reviewed `.xlsx` (or export) under **`content/ras-findings/batches/`** or equivalent, validated with the offline dry-run CLI before any future write import.
- **Syntax family:** A paired set of reusable `rasFindLong` templates (typically **noncompliance** + **insufficient_information**) for the same underlying criterion. See §7.

---

## 3. Field roles

| Field | Role |
|-------|------|
| **`rasFindShort`** | Concise **library/search label** — picker navigation, deduplication review, internal QA. Not a substitute for the full report sentence. |
| **`rasFindLong`** | **Reusable report-facing prose** — the Comment body on RAS Plan Review deliverables (v1). Follow a **syntax family** template (§7). |
| **`tasRefs`** | **Authoritative TAS 2012 citation(s)** for the row — semicolon-separated (e.g. `404.2.3.2`). |
| **`findingType`** | Classification that must **match** the syntax family variant (§8). |

---

## 4. Voice and tone

- **Plan Review library** — describe drawing/plan conditions, not observed field conditions (no “is mounted,” “lacks,” etc. unless intentionally authoring Inspection library content).
- **Concise and direct** — state the condition or information gap; avoid long narrative.
- **Not recommendation-like** — do **not** instruct the design team what to do. Avoid imperatives in `rasFindLong` (see §4.1).
- **Banned phrase (library prose):** do **not** use **“on the submitted plans.”**
- **Prefer “determine” over “verify”** in insufficient-information findings.

**Relationship to `CONVERT_TO_RAS.md` §10:** Product planning still lists examples such as “Plans show…” and “The drawings indicate…” for Plan Review. **Curated library batches** use **syntax family** templates (§7). When in doubt, follow this style guide for **`rasFindings`** library rows.

### 4.1 Terms and phrasing to avoid

| Avoid | Prefer / note |
|-------|----------------|
| **exceeds** | **greater than** or **less than** (Family 2) |
| **too high** / **too narrow** | **greater than** / **less than** + quantity |
| **not ADA compliant** (generic) | Specific condition or measurement (syntax family) |
| TAS / section numbers in **`rasFindLong`** | **`tasRefs` only** (§6) |
| **revise**, **provide**, **adjust**, **lower**, **widen** | Condition statement or insufficient-information pattern |
| **Revise**, **Provide**, **Include**, **Clarify** | Same — no recommendation verbs |
| **verify** | **determine** (insufficient-information variant) |

---

## 5. Placeholders

### `[LOCATION]`

Use **`[LOCATION]`** as the standard placeholder wherever a specific door, room, route segment, sheet reference, or similar locator will be supplied at report/Data Entry time — not in the library import row itself.

**Example:** `…on the pull side of the door [LOCATION]…` or `…at [LOCATION].`

### Bracketed choices

Use **pipe-separated choices** inside brackets when one library row covers variants the author or reporter selects later:

**Examples:** `[forward | hinge | latch]` · `[greater than | less than]`

- Be consistent with spacing around `|` within a batch.
- Prefer **one reusable row** with bracketed choices over multiple near-duplicate approved rows.

**Family 2 template slots:** `[measured feature]` · `[threshold]` · `[unit/context]` (see §7.2).

**Not in library `rasFindLong` (v1):** project-specific sheet numbers (e.g. `A4.2`) — those belong on report instances / Data Entry fields when implemented.

---

## 6. TAS citations

| Rule | Detail |
|------|--------|
| **Cite in `tasRefs` only** | e.g. `404.2.3.2`; multiple sections: `404.2.3;404.2.4` |
| **Do not repeat in `rasFindLong`** | No “per TAS…”, “section 404.2.3”, “compliance with TAS…”, or subsection numbers in prose |
| **Do not cite in `rasFindShort`** | Short label names the condition, not the code section |
| **TAS 2012 only** | No UFAS, ADA, or other standards in `tasRefs` for this library |

Thresholds stated in Family 2 prose (e.g. 8.33%, 36 inches) are **library constants for that finding row**; legal/technical authority remains staff review and **`tasRefs`**, not this style guide.

Exact matching and resolution rules: **`docs/RAS_FINDINGS_IMPORT_FORMAT.md` §8**.

---

## 7. Syntax families

Syntax families are the **primary organizing framework** for reusable library findings. Each family defines:

1. A **noncompliance** `rasFindLong` pattern — use when drawings **show or imply** the criterion is **not met**.
2. An **insufficient_information** companion — use when drawings **do not provide enough information** to determine whether the criterion is met.

Authors pick the family, fill template slots and placeholders, set **`tasRefs`**, and pair **`findingType`** with the variant (§8). Do **not** mix family templates on one row.

| Family | Name | Implemented in batch |
|--------|------|----------------------|
| **1** | Condition not provided | **`RAS-PR-batch1-doors-maneuvering-clearance.xlsx`** |
| **2** | Measurable / dimensional criteria | Documentation only (no workbook on this branch) |
| *(future)* | e.g. coordination, other patterns | TBD as batches are authored |

### 7.1 Family 1 — Condition not provided (Batch 1)

**Topic:** Door maneuvering clearance, pull side. **`tasRefs`:** `404.2.3.2` for both rows below.

#### Noncompliance — not provided

| Field | Text |
|-------|------|
| **`rasFindShort`** | Accessible maneuvering clearance not provided |
| **`rasFindLong`** | Accessible maneuvering clearance is not provided on the pull side of the door [LOCATION] for a [forward \| hinge \| latch] approach. |
| **`findingType`** | `noncompliance` |

#### Insufficient information — cannot determine

| Field | Text |
|-------|------|
| **`rasFindShort`** | Door maneuvering clearance cannot be determined |
| **`rasFindLong`** | Insufficient information is provided to determine whether accessible maneuvering clearance is provided on the pull side of the door [LOCATION] for a [forward \| hinge \| latch] approach. |
| **`findingType`** | `insufficient_information` |

**Reusable finding rule:** Do not add separate approved rows for minor variant wording (e.g. hinge-only vs latch-only) when bracketed choices already cover the library intent.

### 7.2 Family 2 — Measurable / dimensional criteria

Use when the finding is expressed as a **comparison to a numeric threshold** (dimension, slope, force, height, etc.).

#### Templates

| Variant | `findingType` | `rasFindLong` template |
|---------|---------------|-------------------------|
| Threshold not met | `noncompliance` | The [measured feature] is [greater than \| less than] [threshold] [unit/context] at [LOCATION]. |
| Cannot determine measurement | `insufficient_information` | Insufficient information is provided to determine the [measured feature] at [LOCATION]. |

#### Preferred terminology (Family 2)

Use these terms in library prose where applicable:

- **greater than** · **less than**
- **clear width** · **accessible route**
- **operable part**
- **above the finished floor or ground**
- **opening force**
- **slope** · **cross slope**

#### Illustrative noncompliance examples

*(Not compliance determinations. Set **`tasRefs`** per row when authoring batches.)*

| Example `rasFindLong` |
|-----------------------|
| The ramp slope is greater than 8.33% at [LOCATION]. |
| The clear width of the accessible route is less than 36 inches at [LOCATION]. |
| The operable part of controls and operating mechanisms is greater than 48 inches above the finished floor or ground at [LOCATION]. |
| The door opening force is greater than 5 pounds at [LOCATION]. |

#### Illustrative insufficient-information companions

| Example `rasFindLong` |
|-----------------------|
| Insufficient information is provided to determine the ramp slope at [LOCATION]. |
| Insufficient information is provided to determine the clear width of the accessible route at [LOCATION]. |
| Insufficient information is provided to determine the height of the operable part of controls and operating mechanisms at [LOCATION]. |
| Insufficient information is provided to determine the door opening force at [LOCATION]. |

**`rasFindShort` (suggested):** Name the measurement, e.g. “Ramp slope greater than 8.33%”, “Accessible route clear width less than 36 inches” — not Family 1 “not provided” wording.

### 7.3 Future families

Other `findingType` values (e.g. **`coordination_issue`**, **`caution`**) may get syntax families when batches and review agree on reusable templates. Until then, do not force Plan Review library rows into Family 1 or 2 patterns.

---

## 8. `findingType` pairing across syntax families

Pair **`findingType`** with the correct **family variant**. **Do not mix** patterns on a single row.

| `findingType` | When to use (Plan Review library) |
|---------------|-----------------------------------|
| **`noncompliance`** | Drawings **show or imply** the criterion **is not met** (not provided, or measurement fails threshold) |
| **`insufficient_information`** | Drawings **do not provide enough information** to determine whether the criterion is met |

| Family | Noncompliance signal | Insufficient-information signal |
|--------|----------------------|----------------------------------|
| **1 — Not provided** | …**is not provided**… | **determine whether** … **is provided** |
| **2 — Measurable** | …**is greater than** / **is less than** … | **determine the** [measured feature] |

**Do not** use “cannot be determined” on a **noncompliance** row, or assert “is not provided” on an **insufficient_information** row unless the deficiency is actually shown.

Enum definitions: **`docs/RAS_FINDINGS_IMPORT_FORMAT.md` §6**.

---

## 9. Good vs bad wording (illustrative)

| Situation | Good (`rasFindLong`) | Bad |
|-----------|----------------------|-----|
| Family 1 — condition | Accessible maneuvering clearance is not provided on the pull side of the door [LOCATION] for a [forward \| hinge \| latch] approach. | Plans show insufficient maneuvering clearance per TAS 404.2.3.2. Provide dimensioned plan graphics on the submitted plans. |
| Family 1 — insufficient info | Insufficient information is provided to determine whether accessible maneuvering clearance is provided on the pull side of the door [LOCATION] for a [forward \| hinge \| latch] approach. | Insufficient information is provided to verify maneuvering clearance. Include details on sheet A4.2. |
| Family 2 — measurable | The clear width of the accessible route is less than 36 inches at [LOCATION]. | The accessible walkway is too narrow and exceeds 36 inches clearance. |
| Family 2 — insufficient info | Insufficient information is provided to determine the ramp slope at [LOCATION]. | Provide ramp slope on the submitted plans to verify compliance. |
| TAS in prose | *(none — use `tasRefs`)* | …compliance with TAS 404.2.3.2 maneuvering clearance requirements. |
| Duplication | One row per family variant with bracketed choices | Six approved rows differing only by latch vs hinge |

---

## 10. Deferred topics

The following are **intentionally deferred** until separate findings are drafted and reviewed:

| Topic | Notes |
|-------|--------|
| **Recessed door** maneuvering clearance | Distinct from Family 1 pull-side pair; needs its own templates |
| **Push side** (vs Batch 1 pull-side pair) | Add only when a reviewed template is agreed |
| **Door swing vs clearance** (`coordination_issue`) | Future syntax family TBD |
| **Broader parent `404.2.3` without `404.2.3.2`** | Use only when subsection-level citation is inappropriate |
| **Category/item names** (e.g. `Doors` / `Interior Doors`) | Placeholders until Library Manager / Firestore resolution is approved |
| **Measurable batch workbook** | Family 2 examples are documentation-only until a batch is scoped |

---

## 11. Pre-authoring checklist (prose)

Before marking a row **`approved`**:

- [ ] Syntax family identified (§7) and template variant correct
- [ ] `rasFindLong` is reusable and concise — no terms in §4.1
- [ ] TAS citations appear only in **`tasRefs`**
- [ ] **`findingType`** matches family variant (§8)
- [ ] **`[LOCATION]`** and bracketed choices used consistently
- [ ] No duplicate approved row where one reusable finding with brackets suffices
- [ ] Plan Review tone — not field-inspection observation language
- [ ] Layout/columns validated per **`docs/RAS_FINDINGS_SPREADSHEET_TEMPLATE.md`**

---

## 12. Syntax family checklist (new rows)

- [ ] Family **1** or **2** (or future family) explicitly chosen
- [ ] **Noncompliance** and **insufficient_information** pair considered — companion row exists or is intentionally N/A
- [ ] Family 2: **greater than** / **less than** (not “exceeds”); **clear width** / **accessible route** (not vague “walkway”)
- [ ] **`rasFindShort`** matches family (measurement label for Family 2; “not provided” / “cannot be determined” for Family 1)
- [ ] Threshold in prose matches intended library constant; **`tasRefs`** set separately

---

## Related documentation

- **`content/ras-findings/batches/RAS-PR-batch1-doors-maneuvering-clearance.xlsx`** — Family 1 implemented batch  
- **`docs/RAS_FINDINGS_SPREADSHEET_TEMPLATE.md`** — spreadsheet layout and column spec  
- **`docs/RAS_FINDINGS_IMPORT_FORMAT.md`** — import format and `findingType` enums  
- **`docs/CONVERT_TO_RAS.md`** — RAS product planning  
- **`docs/ARCHITECTURE_DESIGN.md`** — durable ✅ DECIDED blocks  
- **`AGENTS.md`** — data safety before Firestore import  
