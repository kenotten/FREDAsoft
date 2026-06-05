# FREDAsoft Portal Stakeholder Implications

**Status:** Documentation-only conceptual implications (D8). **Not implemented.**  
**Last updated:** 2026-06-05  
**Branch context:** `d8-portal-stakeholder-implications`  
**Audience:** Product owner (Kenneth), architecture review (Archie), auth/security/D4/D6/implementation planning

> **Disclaimer:** This document clarifies **portal stakeholder visibility, submission, and review implications** for FREDAsoft RAS/TDLR workflows. It does **not** specify Firestore collections, security rules, Firebase Auth configuration, UI routes, invitation email flows, or legal compliance. It does **not** collapse TDLR/TABS source data into FREDAsoft canonical data or grant portal users operational authority by default.

---

## Purpose

D8 answers: *Who might use a future client/project portal, what might they see or submit, and what must **not** be assumed about automatic access, edits, or canonical promotion?*

This is a **D8 conceptual implications document**, not implementation, auth design, schema, or security rules. It builds on **D5** (stakeholder/contact/user model), **D2** (staff review workflow), **D3** (report instance boundaries), **D7** (correspondence boundaries), **D4** (source-track sketch), **D6** (extraction pipeline), and **D1** (field mapping)—so later auth, portal, and approval work can proceed without conflating:

- **Portal users** (Auth identities with scoped access)  
- **Canonical stakeholders**, **contacts**, and **project parties**  
- **Client** billing/portfolio anchor vs **Owner** TDLR party role  
- **TDLR/TABS source snapshots** vs **staff-approved operational summaries**  
- **Published report instances** vs **correspondence artifacts** vs **raw source evidence**  

**Outputs of D8:** terminology, crosswalks, visibility boundaries, recommended product posture, and open questions for auth/security/D4/D6/implementation—not final role enums, rule expressions, or portal UX.

---

## Scope and Non-Scope

### In scope

- Portal **stakeholder visibility** implications  
- What portal users might **see**, **submit**, or **request** in future phases  
- **Approval/review gates** for portal-submitted information  
- Relationship between portal users, stakeholders, contacts, project parties, **Client**, and TDLR source data  
- **Risks** and **open questions** before implementation  

### Out of scope

| Topic | Note |
|-------|------|
| **Firestore schema** | Deferred to **D4** and later implementation |
| **Security rules** | Deferred to auth/security design phase |
| **Auth implementation** | Firebase Auth, custom claims, session policy—not specified here |
| **UI routes / components** | Deferred to implementation |
| **Portal workflows implemented** | No feature delivery in D8 |
| **Email / notification implementation** | Invitation and alert delivery deferred |
| **Legal interpretation** | Portal copy and obligations require separate source review |
| **Automatic acceptance of portal-submitted data** | **Not assumed** — see Recommended Product Posture |

---

## Core Distinctions

| Concept | What it is | What it is not |
|---------|------------|----------------|
| **Portal user** | Firebase Auth (or equivalent) identity with **explicit** project/party-scoped portal access | Automatically every contact, stakeholder, or TDLR party on a registration |
| **Canonical stakeholder** | Staff-maintained operational organization or person record (**D5**) | Automatically created from TDLR scrape or portal signup |
| **Contact person** | Person affiliated with a stakeholder; correspondence/portal **candidate** | Automatically a portal user with edit rights |
| **Project party** | Role on a Project (Owner, Design Firm, RAS Firm, Tenant, Agent, …) | Automatically identical to **Client** or portal membership |
| **Client** | FREDAsoft portfolio/billing anchor (**D5** Option A default) | Automatically TDLR **Owner** |
| **Agent / Designated Agent** | TDLR project party role; may receive correspondence (**D7**) | Automatically **Owner** or default portal admin |
| **TDLR source party snapshot** | As-recorded party row on the **source track** | Canonical stakeholder or verified portal identity |
| **Portal-submitted change** | **Proposed** update, upload, or request pending staff review | Canonical truth or approved link until accepted |
| **Portal visibility** | What a scoped portal user may **read** or **download** | The same as **edit authority** or staff reviewer powers |

**Architecture rule (unchanged):** TDLR/TABS source data stays on the **source track**. FREDAsoft may **suggest** portal membership candidates from party/contact matches; **staff** (or future explicit invitation workflow) grants access. Portal submissions become **pending proposals**—not direct overwrites of source snapshots or canonical records (**D2**, **D5** §11).

---

## Portal User / Stakeholder Crosswalk

**Emphasis:** **Explicit invitation/permission** required. **No** automatic portal account creation from TDLR source data, export rows, or party snapshot ingest alone.

| Concept | Source / Origin | Possible FREDAsoft Meaning | Can Log In? | Can Edit? | Reviewer Gate? | Notes |
|---------|-----------------|----------------------------|-------------|-----------|----------------|-------|
| **Client organization** | FREDAsoft **Client** entity; contract context | Portfolio/billing anchor; primary portal scope **candidate** | **If invited** | **Proposed changes only** — not canonical direct write | **Yes** — membership and scope | **Client ≠ Owner** by default (**D5**) |
| **Client contact** | Client-linked contact person | Portal user **candidate** for Client-scoped projects | **If invited** | Proposed contact/address updates | **Yes** | May see multiple projects under Client |
| **Owner** | EAB205N §3; TABS Owner modal; export Owner columns | **Owner** project party → canonical stakeholder | **If invited** | Proposed party/contact updates; uploads **proposals** | **Yes** | TDLR Owner text ≠ portal identity without link |
| **Owner representative** | EAB205N Representative; Owner modal | **Contact person** under Owner stakeholder | **If invited** | Proposed delegate/contact updates | **Yes** | May act for trust/business/government owner |
| **Tenant** | EAB205N §5; `lblProjectTenant` | **Tenant** project party | **If invited** | Limited—scope **open** | **Yes** | TABS **Not Assigned** → usually no portal user |
| **Agent / Designated Agent** | EAB205N §4; EAB243N; Agent modal | **Agent** project party | **If invited** | Proposed contact/recipient updates | **Yes** | **Agent ≠ Owner**; often absent from export |
| **Design Firm / Design Professional** | EAB205N §5; Design modal | **Design Firm** party + contact | **If invited** | Proposed contact updates; response uploads **candidate** | **Yes** | Design Professional may be contact under firm |
| **RAS Firm** | EAB205N §1; TABS RAS block | **RAS Firm** project party | **Internal staff typical** — external portal **open** | Operational edits via staff tools—not portal canonical write | **Yes** if external portal ever offered | Registration RAS ≠ assigned individual (**D3**) |
| **Assigned RAS user** | FREDAsoft operational assignment | Auth **user** (internal staff) | **Yes** (staff) | Staff operational edit paths | Staff workflow—not portal proposal queue | Distinct from RAS Firm party row |
| **Person Filing Form / registrant** | TABS Details registrant; `lblProjectContact` | Registrant **contact snapshot** | **If invited** — uncommon default | Proposed contact corrections | **Yes** | **Not** automatically canonical stakeholder |
| **TDLR source party snapshot** | `tdlrPartySnapshots` / extraction ingest (**D4**) | Source-track as-recorded row | **No** by default | **No** | N/A for portal | Raw source **internal** unless deliberately exposed |
| **FREDAsoft internal staff reviewer** | D2 workflow actor; Auth staff account | Reviewer of matches, drafts, portal proposals | **Yes** (staff) | Approve/reject/defer links and canonical drafts | N/A | Distinct from portal **external** user |
| **Inspector / reviewer user** | Operational role on report instance | Staff Auth user on inspection/plan review work | **Yes** (staff) | Report instance authoring—not portal canonical master data | Staff only | May overlap assigned RAS—separate links (**D3**) |

---

## Candidate Portal Capabilities

**Default posture:** Portal shows **approved operational summaries** before **raw TDLR/TABS source snapshots**. Raw source snapshots are **internal by default** unless deliberately exposed later. Portal submissions require **staff review** before affecting canonical records, approved links, or published deliverables.

| Portal Capability | Possible Users | Source/Operational Data Shown | Can Submit Data? | Staff Review Required? | Notes |
|-------------------|----------------|------------------------------|------------------|------------------------|-------|
| **View project summary** | Client contact; Owner; Agent; Design contact | Staff-approved **Project** / **Facility** summary; optional milestone-derived **progress label** | **No** | N/A for read | Not raw TDLR snapshot by default |
| **View TDLR milestone-derived progress** | Client; Owner; Agent (**open**) | Derived phase label from approved milestone mapping—not full PSU table | **No** | **Yes** — mapping/staff config | **D3** — status alone ≠ deliverable availability |
| **View approved reports** | Client; Owner; Design (**open**) | **Published** report instance / Web Report access | **No** | **Yes** — publication gate | TDLR status does not imply report exists |
| **Download correspondence / notices** | Owner; Agent; Client (**open**) | Staff-approved or staff-sent correspondence artifacts (**D7**) | **No** | **Yes** — what is portal-visible | Not auto from TDLR document metadata |
| **Upload response documents** | Owner; Design; Agent (**open**) | N/A (inbound upload) | **Yes** — proposal | **Yes** | Inspection response / corrective mod **candidate** (**D7**) |
| **Submit owner/contact updates** | Client contact; Owner; Agent | Canonical/contact **diff proposal** | **Yes** | **Yes** | **D5** §11 proposed-change pattern |
| **Confirm recipient information** | Owner; Agent | Display staff-approved recipient summary | **Yes** — confirm/correct proposal | **Yes** | Correspondence **To/CC** not auto-bound (**D7**) |
| **Request inspection / scheduling help** | Owner; Agent; Client (**open**) | Project summary + milestone context | **Yes** — request ticket/message | **Yes** | Does not create TDLR filing or report instance |
| **Comment on corrective modifications** | Owner; Design (**open**) | Staff-approved inspection context | **Yes** — comment proposal | **Yes** | Internal reviewer notes remain staff-only |
| **View source snapshots** | Any portal user | Full TDLR as-recorded snapshot | **No** | **Defer** — default **internal only** | Sensitivity / PII / legal display **open** |
| **View raw TDLR data** | Any portal user | Export-style or live TABS capture text | **No** | **Defer** — default **no** | Staff compare UI may show side-by-side |
| **Invite additional users** | Client admin; Owner (**open**) | Project roster (approved parties only) | **Yes** — invitation request | **Yes** | Admin-only vs delegated invite **open** |

---

## Visibility Boundaries

| Boundary | Internal (staff default) | Portal default | Notes |
|----------|-------------------------|----------------|-------|
| **Source snapshots vs canonical summaries** | Both visible in review UI | **Canonical/operational summary** only | TDLR `asRecorded` text internal unless policy changes |
| **Raw TDLR values vs staff-approved project data** | Side-by-side in D2 Screen 5 | Approved operational fields only | Stale export vs live TABS warnings staff-only |
| **Report instances vs correspondence artifacts** | Full operational track | **Published reports**; correspondence **if staff released** | Proof forms ≠ report PDF (**D3**, **D7**) |
| **Internal reviewer notes vs portal-visible comments** | Review memos, defer reasons, match evidence | User-submitted comments **after moderation** (**open**) | Audit trail not editable from portal |
| **Audit history vs user-facing activity history** | Full provenance (extraction run ids, reviewer uid) | Redacted activity feed (**open**) | Who approved what—staff only |
| **PII / contact data** | Full contact fields for operations | **Minimized** display; need-to-know per role (**open**) | Registrant, phone, email sensitivity (**D4** DC-8) |
| **Role-based access** | Staff roles + assignment | Project-scoped + party-scoped (**future**) | Final role matrix deferred |

---

## Portal Submission / Review Workflow

Portal flows reuse **D2** dual-track language—external submitters never write canonical or source tracks directly.

```text
Portal user action (form, upload, comment, invite request)
        │
        v
┌──────────────────────────┐
│ Pending proposal record   │  (portal submission — untrusted)
│ + attachment refs         │
└────────────┬─────────────┘
             │
             v
┌──────────────────────────┐
│ Staff review queue        │  (D2-adjacent — may reuse Screen 5 diff pattern)
└────────────┬─────────────┘
             │
     ┌───────┼───────┐
     v       v       v
 Approve  Reject  Defer
     │       │       │
     v       │       └──► auditable queue; no canonical change
 Canonical   │
 draft or    └──► notify submitter; proposal closed
 accepted
 update
 (explicit)
     │
     v
 Optional: new alias, project party link, correspondence
 attachment, invitation issued — each via approved action
```

**Examples (all require staff review before canonical/source impact):**

| Submission type | Proposal content | Staff outcome options |
|-----------------|------------------|------------------------|
| **Contact update request** | New phone/email/address for Owner or Client contact | Accept to canonical; reject; partial accept; defer |
| **Owner/agent correction request** | “Our displayed Owner name is wrong” | Alias or canonical draft—**not** TDLR snapshot edit |
| **Upload inspection response document** | PDF/image attachment | Link as correspondence **candidate** (**D7**); reject; defer |
| **Request to change recipient** | Preferred correspondence **To** line | Approved party/contact link or template rule input—no auto bind |
| **Comment on report / corrective modification** | Text comment on published inspection context | Moderate; attach to internal workflow; reject |
| **Request access for another user** | Email + intended role/party | Invitation issued after approval; or reject |

**No direct overwrite:** Portal submissions do **not** mutate `tdlrProjectSnapshots`, `tdlrPartySnapshots`, or canonical Project/Facility/stakeholder fields without an explicit staff **accept** step (**D4** `tdlrDraftUpdates` / future portal proposal reuse **open**).

---

## Relationship to D5 Stakeholder Model

| D5 concept | D8 portal implication |
|------------|-------------------------|
| **Stakeholder / contact / user / assignment separate** | Portal **user** links to contact and/or project party through **approved association**—not automatic on ingest |
| **Portal user identity** | Likely binds to **contact person** + **project membership** + optional **Client** org scope |
| **One person, multiple stakeholders/projects** | Same Auth user may hold separate memberships; audit per project |
| **One stakeholder, multiple contacts/users** | Multiple portal users under one firm/org—invitation scoped per contact |
| **Client vs Owner (Option A default)** | Portal anchored on **Client** for consultant workflows; **Owner** party may get separate scoped access |
| **Proposed changes (§11)** | Portal submissions = **proposed change** records; staff approve before canonical promotion |
| **Aliases from portal** | Observed name variants may create **alias candidates**—still require review |

---

## Relationship to D2 Review Workflow

| D2 screen | D8 portal implication |
|-----------|----------------------|
| **Screen 4 — Party Match Review** | Approved party/contact links define **who is eligible** for future portal invitation; unmatched TDLR parties do not imply portal accounts |
| **Screen 5 — Field-Level Differences** | Portal-submitted field changes appear as **draft suggestions** alongside TDLR diffs—unchecked by default; same no-overwrite rules |
| **Screen 6 — Approval Summary** | May later include approved portal membership links and accepted proposal batches—not assumed in D8 |
| **Deferred / rejected items** | Portal proposals remain **auditable** when rejected or deferred—submitter may be notified (**open**) |

---

## Relationship to D3 Report Instance Crosswalk

| D3 rule | D8 portal implication |
|---------|----------------------|
| **Report instance = authored deliverable** | Portal may show **published** plan review / inspection reports only after staff publication workflow |
| **TDLR status ≠ report availability** | Milestone-derived **progress labels** may appear; raw status enums and PSU rows **internal by default** |
| **Proof forms ≠ report body** | Portal must not treat proof-of-submission/inspection metadata as downloadable RAS comment report |
| **No auto-created report instances** | Portal cannot “release” a report because TDLR shows Review Complete—staff publication required |

---

## Relationship to D7 Correspondence Crosswalk

| D7 rule | D8 portal implication |
|---------|----------------------|
| **Correspondence ≠ report instance** | Portal downloads/notices are **correspondence artifacts**—separate from Web Report / PDF deliverable |
| **Uploaded proof/response docs** | Portal uploads are **proposals** or **source attachments** until staff review— not operational correspondence records |
| **Recipients reviewer-confirmed** | Portal “confirm recipient” submissions feed review queue—no auto **To/CC** binding |
| **Sent-letter / merge snapshots** | Outbound staff letters and immutable `merged_data`—portal read-only if exposed; design **deferred** |

---

## Security / Access Considerations

**No rules written here**—considerations for future auth/security design only.

| Consideration | Intent |
|---------------|--------|
| **Least privilege** | Grant minimum project/party scope needed; no org-wide leakage by default |
| **Project-scoped access** | Membership tied to explicit **Project** (and published artifact subset) |
| **Party-scoped access** | Owner vs Client vs Agent may see different fields and actions on same project |
| **PII minimization** | Limit phone/email/registrant exposure; redact in activity feeds |
| **Source snapshot sensitivity** | TDLR as-recorded text may include PII and legal context—**internal default** |
| **Report / correspondence publication states** | Draft vs published vs revoked—portal sees **published** only unless staff exception |
| **Audit history protected** | Portal users cannot edit or delete staff audit events |
| **Invitation and revocation** | Admin-only vs delegated invite; revoke on ownership change—**open** |
| **No public unauthenticated access** | Private project data requires Auth + approved membership—no anonymous project URLs |

---

## Recommended Product Posture

| # | Posture |
|---|---------|
| **PP-1** | **Internal review-first** for TDLR-derived data exposed to external users—map milestones to approved summaries before display. |
| **PP-2** | Portal displays **approved operational summaries** first; defer **raw source snapshot** exposure. |
| **PP-3** | Portal submissions become **pending proposals**—never silent canonical or source writes. |
| **PP-4** | **No source/canonical overwrite from portal**—corrections to TDLR remain TDLR’s authorized process; FREDAsoft accepts portal input only into operational track after review. |
| **PP-5** | **Explicit invitation and role assignment**—no portal account from TDLR ingest alone. |
| **PP-6** | Clear distinction among **viewer**, **submitter**, **recipient**, and **project party**—one Auth user may hold multiple hats via separate links. |
| **PP-7** | Keep portal copy **neutral and non-legal**—no compliance assertions until sources and product owner confirm wording. |
| **PP-8** | **No auto-approve** of portal-submitted data; **current assumption: no** (**D2** carry-forward). |

---

## Open Questions for Auth / Security / D6 / Implementation

### Roles and invitation

1. **Exact portal roles** — viewer, submitter, org admin, party delegate, report-only?  
2. **Invitation workflow** — staff-initiated only, or Client/Owner delegated invite?  
3. Can **Owner**, **Agent**, or **Client** invite others without staff pre-approval?  
4. How is access **revoked** on ownership change, contract end, or party unlink?

### Visibility

5. Can portal users ever see **raw TDLR snapshots** or export-equivalent fields? **Current assumption: internal default, no.**  
6. How to expose **TDLR milestone-derived progress** safely without implying deliverable completion (**D3**)?  
7. Separate **activity history** redaction rules vs staff audit log?

### Submissions and correspondence

8. Can portal **upload response/proof documents** (**D7**)? Into proposal queue only, or also source attachment track?  
9. Do portal submissions create **correspondence records**, **pending proposals**, or both?  
10. Can portal comments on corrective modifications become **correspondence artifacts**?

### Identity model

11. Can one **contact** belong to **multiple stakeholders** with one Auth user?  
12. Portal identity: log in as **Client org**, **Owner party**, or **contact email** primary? (**D5** §17 Q2)  
13. **Person Filing Form** registrant—ever a portal user default?

### Operations and compliance

14. **Ownership changes** — migrate portal membership, revoke, or require re-invite?  
15. **Audit and retention** requirements for portal proposals vs accepted changes?  
16. Can any portal-submitted data **auto-approve** under low-risk rules? **Current assumption: no.**  
17. Reuse **D4** `tdlrDraftUpdates` / review session pattern for portal proposals?

---

## Related Documentation

| Document | Relevance |
|----------|-----------|
| `docs/FREDASOFT_PROJECT_STAKEHOLDER_MODEL.md` | D5 — stakeholder/contact/user; Client ≠ Owner; proposed changes §11 |
| `docs/FREDASOFT_PROJECT_TDLR_REVIEW_WORKFLOW.md` | D2 — staff review screens; portal deferred; proposal/draft language |
| `docs/FREDASOFT_PROJECT_RAS_REPORT_INSTANCE_CROSSWALK.md` | D3 — report vs milestone; publication boundary |
| `docs/FREDASOFT_PROJECT_CORRESPONDENCE_REQUIREMENTS_CROSSWALK.md` | D7 — correspondence uploads and recipients |
| `docs/FREDASOFT_PROJECT_TDLR_SCHEMA_SKETCH.md` | D4 — draft updates; portal proposal reuse open |
| `docs/FREDASOFT_PROJECT_TDLR_EXTRACTION_PIPELINE.md` | D6 — source vs canonical; portal must not overwrite TDLR track |
| `docs/FREDASOFT_PROJECT_FIELD_LEVEL_MAPPING.md` | D1 — party fields and reviewer actions |
| `docs/FREDASOFT_PROJECT_APP_DISCOVERY.md` | Portal direction §15; discovery phase map §16 |
| `docs/CONVERT_TO_RAS.md` | RAS report instances; published deliverable context |
| `docs/reference/TDLR_RAS_TABS_SOURCE_INDEX.md` | Source catalog; PII sensitivity notes |
| `docs/reference/TDLR_TABS_FORM_FIELD_DISCOVERY.md` | TABS party modals; registrant fields |
| `docs/reference/EAB205N_PROJECT_REGISTRATION_FIELD_INDEX.md` | Registration party semantics |
| `docs/reference/TDLR_OPEN_RECORDS_EXPORT_FIELD_INDEX.md` | Export party columns (Agent often absent) |
| `docs/CLIENT_PORTAL_SPEC.md` | Existing portal hierarchy and report workspace (extends separately) |
| `docs/ARCHITECTURE_DESIGN.md` | Durable architecture decisions |

---

## Non-goals (D8)

- Implemented Firestore schema, security rules, or Auth configuration  
- Portal UI routes, components, or invitation email flows  
- Automatic portal account provisioning from TDLR extraction  
- Direct portal writes to canonical stakeholders, projects, or TDLR snapshots  
- Automatic acceptance of portal-submitted master data or uploads  
- Legal/compliance assertions about owner/agent obligations or TDLR filing  
- Public unauthenticated access to project or report data  
