# FREDAsoft TDLR Schema Sketch

**Status:** Documentation-only conceptual schema sketch (D4). **Not implemented.**  
**Last updated:** 2026-06-05  
**Branch context:** `d4-tdlr-schema-sketch`  
**Audience:** Product owner (Kenneth), architecture review (Archie), D6/D8 implementation planning

> **Disclaimer:** This document sketches a **conceptual Firestore/document model** for TDLR/TABS intake, review, and linking. It does **not** specify final collection names, field names in code, security rules, migrations, indexes, scrapers, or UI. It does **not** collapse TDLR/TABS source data into FREDAsoft canonical data.

---

## Purpose

D4 translates prior discovery into a **draft document model** that can support:

| Prior doc | What D4 must accommodate |
|-----------|--------------------------|
| **`docs/FREDASOFT_PROJECT_FIELD_LEVEL_MAPPING.md`** (D1) | Field concepts, source layers, reviewer-action legend |
| **`docs/FREDASOFT_PROJECT_TDLR_REVIEW_WORKFLOW.md`** (D2) | Six-screen review flow, actions/outcomes, defer/reject states |
| **`docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md`** (D5) | Dual-track source vs canonical, parties, aliases, contacts |
| **`docs/FREDASOFT_PROJECT_TDLR_EXTRACTION_PIPELINE.md`** (D6) | Extraction stages, record families, source-vs-canonical rules |

This is a **conceptual schema sketch**, not implementation. Collection and field names below are **draft placeholders** for discussion—not commitments to Firestore structure, TypeScript types, or service APIs.

---

## Design Constraints

| # | Constraint |
|---|------------|
| **DC-1** | **Source snapshots are immutable/versioned** — append or supersede on re-extract; never in-place correction of as-recorded TDLR text in FREDAsoft. |
| **DC-2** | **Canonical records are separate** — existing **`clients`**, **`facilities`**, **`projects`**, and future **canonical stakeholder / contact / project party** records are operational truth; TDLR snapshots do not replace them. |
| **DC-3** | **Matching suggestions are not canonical links** — candidate records are assistive and discardable; they do not imply identity. |
| **DC-4** | **Reviewer actions create explicit approved records** — links, aliases, project parties, and draft promotions require auditable staff approval (D2). |
| **DC-5** | **TDLR source data is not corrected in FREDAsoft** — discrepancies remain visible; TDLR’s authorized TABS process owns government-record edits. |
| **DC-6** | **Export and live TABS snapshots can coexist** — same TABS number may have multiple source-layer captures; no silent merge. |
| **DC-7** | **Field provenance must be preserved** — each value traceable to source layer, extraction run, capture timestamp, and optional raw-capture ref. |
| **DC-8** | **PII/contact fields may require access controls later** — emails, phones, and registrant identity flagged for future rules (D8); sketch only notes the concern. |

---

## Conceptual Data Areas

Ten logical areas span the TDLR intake and review domain. Names are **conceptual**—implementation may embed, split, or subcollectionize later.

| # | Data area | Role |
|---|-----------|------|
| 1 | **TDLR source intake / extraction runs** | Orchestrates lookup, source discovery, retrieval, and run-level status |
| 2 | **TDLR project source snapshots** | As-recorded project/facility/site/status<br>fields per capture |
| 3 | **TDLR party source snapshots** | As-recorded Owner, Tenant, Design Firm,<br>RAS, Agent, registrant rows |
| 4 | **Parsed / normalized comparison values** | Machine-derived match keys; never replace raw snapshot text |
| 5 | **Candidate match suggestions** | Ranked Project / Facility / Stakeholder / Contact proposals |
| 6 | **Approved project/facility/stakeholder links** | Explicit associations after staff review |
| 7 | **Alias / observed-name records** | Text variants linked to canonical stakeholders after approval |
| 8 | **Draft canonical updates** | Proposed field changes to operational records; not live until promoted |
| 9 | **Review sessions / reviewer decisions** | D2 workflow state: per-row decisions, defer/reject, submit summary |
| 10 | **Audit / provenance records** | Who did what, when, against which snapshot and canonical ids |

---

## Proposed Collection Sketch

**All names below are draft conceptual labels**, prefixed `tdlr*` to distinguish the **source/review track** from existing FREDAsoft collections. Final naming, nesting, and indexes are **open** (§ Open Questions).

### `tdlrExtractionRuns`

| Aspect | Sketch |
|--------|--------|
| **Purpose** | One document per intake attempt: TABS # lookup, URL paste, export row attach, or reverse lookup from FREDAsoft Project. |
| **Example fields** | `requestedTabsNumber`, `requestedUrl`, `legacyEabprjId`, `dataVersionId`, `exportRowKey`, `exportFileRef`, `entryPoint` (enum: tabs_number, url, export_row, fredasoft_project, facility, client, deferred_revisit), `initiatedByUid`, `initiatedAt`, `status` (pending, partial, complete, failed), `sourcesAttempted[]`, `sourcesSucceeded[]`, `rawCaptureRefs[]`, `errorCodes[]`, `priorRunId` |
| **Source/canonical boundary** | **Source track only** — no canonical writes. |
| **Reviewer workflow** | Screen 1 (D2): extraction status, freshness, export vs live warning. Spawns snapshots and review session. |
| **Open questions** | Subcollection vs top-level? Retention policy? Link to Cloud Storage for raw HTML vs metadata-only? |

### `tdlrProjectSnapshots`

| Aspect | Sketch |
|--------|--------|
| **Purpose** | Immutable (or versioned) **project-level** as-recorded capture: identity, site text, status, scope, schedule, milestones, document metadata refs. |
| **Example fields** | `extractionRunId`, `sourceLayer` (eab205n_semantics, tabs_details, tabs_manage, open_records_export), `tabsNumber`, `legacyProjectId`, `tabsInternalProjectGuid`, `versionNumber`, `supersedesSnapshotId`, `capturedAt`, `asRecorded` (map: businessConceptKey → `{ rawText, sourceLabel, htmlId? }`), `milestoneRows[]`, `documentMetadata[]`, `conflictWithSnapshotIds[]` |
| **Source/canonical boundary** | **Pure source** — never updated to “fix” TDLR values. |
| **Reviewer workflow** | Screen 2 summary; Screen 3 Project/Facility match; Screen 5 field diff left column. |
| **Open questions** | Embed party rows vs separate `tdlrPartySnapshots` only? Milestone rows inline vs child collection? City/county as text, id, or both? |

### `tdlrPartySnapshots`

| Aspect | Sketch |
|--------|--------|
| **Purpose** | As-recorded **party row** per role: Owner, Tenant, Design Firm, RAS Firm, Agent, Person Filing Form / registrant. |
| **Example fields** | `projectSnapshotId`, `extractionRunId`, `partyRole` (owner, tenant, design_firm, ras_firm, agent, registrant, misc), `sourceLayer`, `asRecorded` (name, address lines, phone, email, representative, businessType, licenseNumber, …), `displayOrder`, `isNotAssigned` (TABS tenant placeholder) |
| **Source/canonical boundary** | **Pure source** — legal/as-recorded party text. |
| **Reviewer workflow** | Screen 2 roster; Screen 4 party match rows. |
| **Open questions** | One doc per role vs one doc per contact modal scrape? Registrant separate from Owner representative? |

### `tdlrParsedFields`

| Aspect | Sketch |
|--------|--------|
| **Purpose** | Normalized values for **comparison and matching only** (D1 MP-3, D6 §4 stage 5). |
| **Example fields** | `parentType` (project_snapshot, party_snapshot), `parentId`, `businessConceptKey`, `rawSnapshotRef`, `normalizedName`, `normalizedPhone`, `normalizedEmail`, `normalizedAddress`, `parsedDate`, `parsedMoney`, `countyLookupKey`, `cityLookupKey`, `statusEnumCode`, `licenseMatchKey`, `rasNumberMatchKey`, `computedAt` |
| **Source/canonical boundary** | **Derived from source** — regeneratable; must not overwrite `asRecorded` text. |
| **Reviewer workflow** | Feeds candidate ranking; Screen 5 may show normalized compare keys alongside raw text. |
| **Open questions** | Separate collection vs embedded map on snapshot? Recompute on every re-parse? |

### `tdlrCandidateMatches`

| Aspect | Sketch |
|--------|--------|
| **Purpose** | Assistive match proposals before review approval. |
| **Example fields** | `reviewSessionId`, `sourceRef` ({ type, id }), `targetType` (project, facility, stakeholder, contact), `targetCanonicalId`, `rank`, `confidenceScore`, `reasonCodes[]` (exact_tabs_link, exact_license, fuzzy_name_address, prior_approved_alias, …), `matchEvidence` (map), `status` (pending, rejected, superseded, approved_through_link), `createdAt`, `supersededById` |
| **Source/canonical boundary** | **Neither source nor canonical** — ephemeral assistive layer. |
| **Reviewer workflow** | Screens 3–4 candidate lists; reject dismisses; approve creates `tdlrApprovedLinks` instead of mutating this row in place (or marks `approved_through_link`). |
| **Open questions** | Store rejected candidates for audit? TTL / prune on re-run? |

### `tdlrApprovedLinks`

| Aspect | Sketch |
|--------|--------|
| **Purpose** | **Explicit approved association** between source snapshot and FREDAsoft operational entity. |
| **Example fields** | `reviewSessionId`, `sourceRef` ({ type: project_snapshot \| party_snapshot \| field_group, id }), `canonicalRef` ({ type: project \| facility \| stakeholder \| contact \| client, id }), `linkType` (project_link, facility_link, party_link, client_owner_same_entity), `projectPartyRole` (owner, tenant, design_firm, ras_firm, agent, …), `approvedByUid`, `approvedAt`, `provenance` ({ extractionRunId, projectSnapshotId, partySnapshotId?, comparisonBaseline? }), `revokedAt`, `revokedByUid` |
| **Source/canonical boundary** | **Bridge record** — connects tracks without merging documents. |
| **Reviewer workflow** | Created on Screen 6 submit for approve-link actions (D2). |
| **Open questions** | One link doc per role vs composite? Revocation model? Unique constraint: one active project snapshot ↔ one Project? |

### `tdlrObservedAliases`

| Aspect | Sketch |
|--------|--------|
| **Purpose** | Observed name/address text variant **linked to canonical stakeholder** after approval (D5 §3.4). |
| **Example fields** | `canonicalStakeholderId`, `observedName`, `observedAddressFragment`, `sourcePartySnapshotId`, `approvedLinkId`, `firstSeenAt`, `lastSeenAt`, `approvedByUid` |
| **Source/canonical boundary** | **Canonical-side index of variants** — accumulates; does not replace canonical display name. |
| **Reviewer workflow** | Screen 4 “Create alias only”; Screen 6 alias summary. |
| **Open questions** | Merge with `tdlrApprovedLinks` or separate? Search index strategy? |

### `tdlrReviewSessions`

| Aspect | Sketch |
|--------|--------|
| **Purpose** | Persist D2 review state across screens and revisits (defer queue). |
| **Example fields** | `extractionRunId`, `primaryProjectSnapshotId`, `entryPoint`, `comparisonBaseline` (live_tabs, export, tabs_manage), `status` (in_progress, submitted, cancelled, deferred), `decisions` ({ project?, facility?, parties[], fields[] }), `deferredItems[]`, `rejectedCandidateIds[]`, `submittedAt`, `submittedByUid`, `summarySnapshot` (denormalized submit preview) |
| **Source/canonical boundary** | **Workflow metadata** — references both tracks; writes canonical only via linked approved/draft records on submit. |
| **Reviewer workflow** | Screens 1–6; deferred-match entry point reloads session. |
| **Open questions** | Subcollection under run vs top-level? Partial save granularity (per party row)? |

### `tdlrDraftUpdates`

| Aspect | Sketch |
|--------|--------|
| **Purpose** | Proposed changes to **canonical** Project, Facility, or stakeholder fields from TDLR comparison (D2 “Create draft update”). |
| **Example fields** | `reviewSessionId`, `targetType`, `targetCanonicalId`, `fieldKey`, `sourceValue` (as-recorded ref), `currentCanonicalValue`, `proposedValue`, `reviewerNote`, `status` (draft, accepted, rejected, superseded), `sourceSnapshotId`, `acceptedAt`, `acceptedByUid` |
| **Source/canonical boundary** | **Pre-promotion only** — accepting applies to canonical in a separate explicit step; no auto-overwrite. |
| **Reviewer workflow** | Screen 5 toggles; Screen 6 draft summary. |
| **Open questions** | Batch accept vs field-by-field? Portal proposed-change reuse (D8)? |

### `tdlrAuditEvents`

| Aspect | Sketch |
|--------|--------|
| **Purpose** | Append-only audit trail for extraction, review, link, alias, draft, and revocation events. |
| **Example fields** | `eventType`, `actorUid`, `timestamp`, `extractionRunId`, `reviewSessionId`, `entityRefs[]`, `beforeState`, `afterState`, `notes` |
| **Source/canonical boundary** | **Cross-cutting** — references ids on both tracks. |
| **Reviewer workflow** | Screen 6 provenance summary; admin investigation. |
| **Open questions** | Dedicated collection vs Cloud Logging? Immutable retention period? |

---

## Relationship Model

```text
                         ┌─────────────────────┐
                         │  tdlrExtractionRun   │
                         └──────────┬──────────┘
                                    │ 1:N
              ┌─────────────────────┼─────────────────────┐
              v                     v                     v
   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
   │ tdlrProject      │  │ tdlrParty        │  │ tdlrReview       │
   │ Snapshot(s)      │  │ Snapshot(s)      │  │ Session          │
   └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
            │                     │                     │
            │ 1:N                 │ N:1 project         │
            v                     v                     v
   ┌──────────────────┐           │            ┌──────────────────┐
   │ tdlrParsedFields │◄──────────┘            │ tdlrCandidate    │
   └──────────────────┘                        │ Matches          │
            │                                  └────────┬─────────┘
            │ (feeds ranking)                           │ staff approve
            v                                           v
   ┌──────────────────────────────────────────────────────────────┐
   │              FREDAsoft CANONICAL (existing / future)            │
   │  clients ── facilities ── projects                              │
   │  canonicalStakeholders ── contactPersons ── projectParties      │
   └───────────────────────────────▲───────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
           ┌────────┴────────┐           ┌────────┴────────┐
           │ tdlrApproved    │           │ tdlrObserved    │
           │ Links           │           │ Aliases         │
           └─────────────────┘           └─────────────────┘
                    │
           ┌────────┴────────┐
           │ tdlrDraft       │
           │ Updates         │
           └─────────────────┘
```

### Relationship notes

| Relationship | Cardinality (after approval) | Rule |
|--------------|------------------------------|------|
| **TDLR project snapshot ↔ FREDAsoft Project** | 1 snapshot context → 0..1 active Project link | Snapshots remain separate documents; link is explicit |
| **TDLR site fields ↔ FREDAsoft Facility** | N snapshots → 0..1 Facility link per review context | Site text on snapshot; Facility is operational |
| **TDLR party snapshot ↔ canonical stakeholder** | N party snapshots → 0..1 stakeholder link per role row | Multiple snapshots may alias to one stakeholder |
| **TDLR contact text ↔ contact person** | 0..N contact persons per stakeholder | Registrant, representative, design professional may be distinct contacts |
| **RAS Firm vs assigned RAS** | Separate concepts | TDLR **RAS Firm** party ≠ FREDAsoft **assigned RAS** professional until explicitly linked (D3 open) |
| **Client vs Owner** | No default equality | **Client** = portfolio/billing; **Owner** = project party role; optional explicit Client link record |

---

## Source Snapshot Shape

Logical structure shared by `tdlrProjectSnapshots` and `tdlrPartySnapshots` (project-level vs party-level field sets differ).

| Group | Contents |
|-------|----------|
| **Source layer** | `eab205n_semantics`, `tabs_details`, `tabs_manage`, `open_records_export` — multiple layers may exist for same TABS # |
| **Source identifiers** | `tabsNumber`, `legacyEabprjId`, `exportRowKey` (e.g. workbook + row index), `tabsInternalProjectGuid` (provenance only) |
| **Capture timestamp** | `capturedAt`, `extractionRunId` |
| **Raw / as-recorded values** | Map keyed by D1 **business concept** → `{ rawText, sourceLabel?, htmlId?, exportColumn? }` — display and legal traceability |
| **Extraction metadata** | `sourceUrlPath`, `captureType`, `rawCaptureRef`, `dataVersionId`, `parserVersion` |
| **Versioning / supersession** | `versionNumber`, `supersedesSnapshotId`, `isSuperseded`, `conflictWithSnapshotIds[]` when export ≠ live TABS |

**Rule:** Re-extract creates **new snapshot version** (or new doc with supersession pointer)—never silent in-place edit of `asRecorded` maps.

---

## Parsed / Normalized Comparison Shape

Stored in `tdlrParsedFields` (embedded or separate—open).

| Normalization type | Example use | Does **not** replace |
|--------------------|-------------|----------------------|
| **Normalized names** | Trim, case-fold, suffix strip for fuzzy match | Raw owner/firm name on snapshot |
| **Normalized phone/email** | E.164-ish / lowercase email match keys | As-recorded phone/email text |
| **Normalized address** | Parsed street/city/zip tokens | Composite TABS address string |
| **Parsed dates** | ISO date for schedule/milestone compare | Display date text |
| **Money / cost** | Numeric estimated construction cost | Raw currency string |
| **County / city lookup** | Text label and/or TABS numeric id | Either representation alone |
| **Status enum mapping** | TABS `3001`–`3009` ↔ display label | Status text as shown |
| **License / RAS number match key** | Digits-only RAS # | Formatted `RAS #` display |

**Rule:** Parsed fields are **regeneratable derivatives** for matching and diff UI only (D1 MP-3, D6 SV-11).

---

## Candidate Match Shape

Documents in `tdlrCandidateMatches`.

| Field group | Description |
|-------------|-------------|
| **Candidate target type** | `project`, `facility`, `stakeholder`, `contact` |
| **Candidate target id** | FREDAsoft canonical document id (existing **`projects`**, **`facilities`**, future stakeholder collection) |
| **Source reference** | `projectSnapshotId` and/or `partySnapshotId` |
| **Confidence / reason codes** | Rank, score, enumerated reasons (exact license, prior link, fuzzy address, …) |
| **Match evidence** | Structured signals used for UI explanation (D2 Screen 3–4 “candidate reason”) |
| **Status** | `pending`, `rejected`, `superseded`, `approved_through_link` |
| **No canonical write** | Approval creates **`tdlrApprovedLinks`** (and optionally project party / alias)—never silent merge into canonical doc |

**Current assumption:** No auto-approve; all links require review session submit (D2, D6 §8).

---

## Approved Link / Alias Shape

### Approved link (`tdlrApprovedLinks`)

| Field group | Description |
|-------------|-------------|
| **Source snapshot reference** | Project and/or party snapshot id |
| **Canonical target reference** | Project, Facility, stakeholder, contact, or explicit Client (Owner same-entity) |
| **Link type** | `project_link`, `facility_link`, `party_link`, `client_owner_link` |
| **Role** | Project party role when applicable: Owner, Tenant, Design Firm, RAS Firm, Agent |
| **Reviewer** | `approvedByUid`, `approvedAt` |
| **Provenance** | Extraction run, review session, comparison baseline, optional field-level source keys |
| **Revocation** | Optional `revokedAt` / `revokedByUid` for audit without deleting history |

### Alias (`tdlrObservedAliases`)

| Field group | Description |
|-------------|-------------|
| **Observed text** | Name (and optional address fragment) exactly as seen on TDLR source |
| **Canonical stakeholder id** | Target directory record |
| **Provenance** | Source party snapshot + approved link id |
| **Accumulation** | New aliases add; do not replace prior variants |

---

## Draft Update Shape

Documents in `tdlrDraftUpdates`.

| Field group | Description |
|-------------|-------------|
| **Proposed canonical target** | Project, Facility, or stakeholder id + `fieldKey` |
| **Proposed field changes** | `proposedValue` vs `currentCanonicalValue` |
| **Source value** | Pointer to snapshot `asRecorded` entry |
| **Reviewer note** | Optional free text |
| **Status** | `draft`, `accepted`, `rejected`, `superseded` |
| **No automatic overwrite** | `accepted` triggers explicit canonical write path—never on candidate generation or snapshot ingest |

Aligns with D2 Screen 5 field-diff toggles and D5 portal **proposed change** pattern (portal deferred to D8).

---

## Review Session Shape

Documents in `tdlrReviewSessions` — maps to **D2** screens.

| Field group | D2 alignment |
|-------------|--------------|
| **Entry point** | Screen 1: tabs_number, url, export_row, fredasoft_project, facility, client, deferred_revisit |
| **Extraction run** | Links to `tdlrExtractionRuns` and primary `tdlrProjectSnapshots` |
| **Selected comparison baseline** | When export ≠ live TABS — which layer drives draft suggestions (not snapshot mutation) |
| **Decisions per entity** | Project (Screen 3), Facility (Screen 3), parties (Screen 4), fields (Screen 5) |
| **Deferred / rejected items** | Queue state for unmatched or deferred rows |
| **Final submit summary** | Denormalized preview of links, aliases, drafts to create |
| **Audit trail** | Submit/cancel actor and timestamp; spawns `tdlrAuditEvents` |

**Submit rule:** Canonical-side records created/updated only on successful submit—not during candidate suggestion or snapshot ingest.

---

## Security / Access Notes

**No security rules in this doc.** Future implementation should consider:

| Topic | Note |
|-------|------|
| **PII** | Emails, phones, registrant names on source snapshots and party rows |
| **Source vs canonical visibility** | Staff may need read access to both tracks; portal users likely canonical + published project context only (D8) |
| **Admin-only decisions** | Policy TBD: create Client, revoke links, bulk export ingest, PII-unmasked view |
| **Audit history** | `tdlrAuditEvents` and approved links should be tamper-evident; restrict delete |
| **Portal access** | Deferred to D8 — portal must not write TDLR source snapshots or auto-promote matches |

Current Firestore rules are **not** a security boundary for cross-project reads (see **`docs/ARCHITECTURE_DESIGN.md`**); TDLR collections will inherit the same risk until membership/role rules exist.

---

## Non-goals

- No implemented Firestore schema, indexes, or composite queries
- No security rules or role enums
- No import/scraper/ETL code
- No UI components or routes
- No migration plan from prototype or export files
- No auto-approval policy change (current assumption: **no** auto-approve)

---

## Open Questions for D6 / D8 / Implementation

### Naming and structure

1. **Exact collection names** — keep `tdlr*` prefix vs nested under `projects/{id}/tdlr/…`?
2. **Subcollections vs top-level** — e.g. party snapshots under project snapshot vs flat with indexes?
3. **Versioning strategy** — immutable doc per version vs superseded flag on same id?
4. **Parsed fields** — embedded map on snapshot vs `tdlrParsedFields` collection?

### Retention and export

5. **Snapshot retention** — how long to keep raw captures and superseded snapshots?
6. **Export file references** — store hash/path only vs register export corpus in Firestore?

### Review and permissions

7. **Reviewer permission model** — any staff vs admin-only for link creation, PII view, Client create?
8. **Partial review persistence** — defer per party row across sessions (D2 open Q7)?
9. **Whether any matching can ever auto-approve** — **current assumption: no**

### Canonical integration

10. **Canonical stakeholder collection name** and relationship to future **projectParties** / **contactPersons**
11. **RAS Firm vs assigned RAS** — separate link types or single row with role ambiguity (D3)
12. **Milestone / report instance** — inline on project snapshot vs separate records tied to CONVERT_TO_RAS instances
13. **City/county** — store text, TABS lookup id, or both on snapshot and Facility draft

### Portal (D8)

14. Reuse `tdlrDraftUpdates` / review session pattern for portal **proposed changes**?
15. Portal-initiated TDLR lookup — same extraction run model or restricted subset?

---

## Related documentation

| Document | Relevance |
|----------|-----------|
| `docs/FREDASOFT_PROJECT_FIELD_LEVEL_MAPPING.md` | D1 business concepts and reviewer actions |
| `docs/FREDASOFT_PROJECT_TDLR_REVIEW_WORKFLOW.md` | D2 screens, actions, review session behavior |
| `docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md` | D5 parties, aliases, Client vs Owner |
| `docs/FREDASOFT_PROJECT_TDLR_EXTRACTION_PIPELINE.md` | D6 stages and record families |
| `docs/FREDASOFT_PROJECT_APP_DISCOVERY.md` | Discovery phase map |
| `docs/ARCHITECTURE_DESIGN.md` | Existing Client/Facility/Project, Firestore boundaries |
| `docs/CONVERT_TO_RAS.md` | RAS project type, report instances |
| `docs/reference/*` | EAB205N, TABS, export field indexes |
