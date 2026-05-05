FREDAsoft Architecture & Design Decisions

This document is the single source of truth for architectural decisions in FREDAsoft.
It defines system behavior, data modeling philosophy, and development constraints.

All contributors (human or AI) must follow this document.

🧠 AI Operations Layer (Archie / Gabe / Francine)
🎭 Agent Roles

Archie (Architect)

Defines system-level structure and refactoring strategy
Breaks work into atomic, safe tasks
Focus: scalability, safety, clarity

Gabe (Sentry)

Reviews and hardens all prompts before execution
Enforces:
strict scope control
no unintended refactors
preservation of behavior
Converts ideas into deterministic instructions

Francine (Execution Agent)

Executes tasks in AI Studio
Must follow instructions exactly
Has NO authority to:
refactor beyond instructions
introduce new patterns
modify unrelated code
🛡️ Non-Negotiable Execution Rules
Only modify what is explicitly specified
Preserve all existing behavior unless explicitly changed
No implicit refactors or “cleanup”
Use explicit logic (no truthy/falsy shortcuts)
Use safe, targeted React state updates
Do not mix concerns (security, UI, data, performance)
If marked ANALYSIS ONLY → no code changes
Do not assume intent
🧪 Required Verification
App builds successfully
No console errors
No UI regression
Target behavior works
🚦 Current Work State
Phase: Data Integrity Stabilization
Active Task: 95 — Opening Force Fix
Target Version: v87.0
Status: Pending quota reset
Next Up
P1 — Firestore Security Hardening
P2 — Remove runtime debug logic
P3 — Extract Firestore subscriptions
⚠️ Known Risk Areas
Firestore security rules (overly permissive)
App.tsx (“God component”)
Large components (>800 LOC)
Heavy use of any
Firestore subscription lifecycle issues
Runtime debug/migration logic in production
Large bundle size (~1.5MB)
📦 Proven Code Patterns
Safe React State Update
setState(prev =>
  prev.map(item =>
    item.id === targetId
      ? { ...item, ...updates }
      : item
  )
);
🧱 Core System Architecture
1. System Identity

FREDAsoft is a:

Data-centric compliance platform

Supports:

inspections
plan reviews
assessments
2. Core Data Model
Project
  → Facilities / Locations
  → projectData (findings and recommendations)
  → Glossaries (context)
  → Standards (references)

Key collections:

projectData → findings and recommendations (primary operational data)
glossary → templates (context-specific)
master_standards → standards library
users → roles & identity
🧠 Libraries, Glossaries, and Data Records
3. Libraries Are the Foundation

Libraries define:

finding language
recommendation language
measurement types
units of measure
unit costs
default standards associations

Libraries are the origin of all structured content.

4. Snapshot Inheritance Model (Critical)
Library → Glossary → Data Record

Rules:

Data is copied downward
Each layer is independently editable
No automatic upstream propagation

This ensures:

historical accuracy
stable reporting
project-specific flexibility
5. Glossaries = Context (Not Standards)

Glossaries represent:

real-world workflows or use cases

Examples:

TAS Plan Review Glossary
ADA Assessment Glossary
Housing Assessment Glossary
6. Glossary Types
Standard-Focused
TAS Plan Review Glossary
  → TAS only
Multi-Standard
Housing Assessment Glossary
  → ADA + UFAS + FHA + TAS + IBC
7. Projects Enable Glossaries

Each project:

enables one or more glossaries
maintains one active glossary

The active glossary drives:

default findings
recommendations
standard associations
8. Data Records = Source of Truth

Each record:

inherits from glossary
is fully editable
may diverge

Supports:

multiple standards simultaneously
⚖️ Standards Model
9. Standards Are Layered

Projects may include:

ADA
TAS
UFAS
FHA / ANSI
IBC
10. Time-Based Compliance
Evaluation Standard ≠ Recommendation Standard

Example:

Built: 2008
Evaluation: TAS 1994
Recommendation: TAS 2012
11. Standard Record Model

Unified schema:

relation_type:
Standard
Advisory
Exception
Figure
Table

Optional:

imageUrl?
imageCaption?
🧬 Concept vs Version
12. Concept Layer (Deferred)

Future-ready:

conceptId (planned, not implemented)
13. Version Layer

Each concept exists as:

ADA version
TAS version
UFAS version
Context-specific version
14. Controlled Duplication

Duplicate findings across standards are:

EXPECTED and CORRECT
🔁 Data Flow
15. Library → Glossary

Copy:

text
measurements
costs
standards
16. Glossary → Data Record

Copy all fields.

Records become fully independent.

17. Integrity Rule
Records NEVER update glossary
Glossary NEVER updates library automatically
🧰 Library Management (Future)
18. Library System Expansion

Future UI:

Library Explorer
Library Builder
19. Clone Workflow
Copy ADA → TAS

Rules:

copy text
reset standard context
require new citations
20. Library Sync (Explicit Only)

Allowed:

manual sync tools
compare vs source
update selected records

NOT allowed:

automatic updates

Must include:

backup protection before sync
🏗️ Project Types

Project Types are:

presets, NOT constraints

Define:

default glossaries
default standards
report behavior
🧪 UI Strategy
21. Dual Mode
Field (mobile) → fast input, access to mobile device camera
Office (desktop) → full management
📸 Image Architecture (Future)

Planned:

ordering
primary report images
appendices
metadata-based storage
🔐 Firebase Safety
no uncontrolled writes
no loops
explicit triggers only
scoped queries
use operation locks
🧠 User Mental Model
1. Choose a glossary
2. Select a finding
3. Adjust as needed
4. Add standards if needed

Users should NOT need to understand:

joins
normalization
schema complexity
🧭 Design Philosophy

System must balance:

Flexibility
Clarity
Traceability
Accuracy
Usability
🟢 Final Architecture Summary
Libraries → define language
Glossaries → define context
Projects → define scope
Records → define truth
Standards → define authority
🚀 Next Steps
Firestore schema design
UI workflow alignment
migration planning
✅ Architectural Decisions Locked
Concept layer → deferred, future-ready
Glossaries → context-driven
Standards handling → implicit multi-citation model
Library sync → explicit only, never automatic, with backup protection

---

## Future Phase 2: Custom Record Promotion and Glossary Governance

Phase 1 allows users to create **project-only custom data records** that are not linked to the glossary or library.

Phase 2 will define how high-quality custom records can be reviewed and promoted into reusable library/glossary content.

### Core Principle

Custom project records are allowed for one-off field conditions, but they do not automatically become part of the reusable library or glossary.

```text
Custom Project Record ≠ Library Record

glossaryRequests

Possible fields:

sourceProjectDataId
sourceProjectId
sourceFacilityId
proposedCategoryId
proposedItemId
proposedFindingShort
proposedFindingLong
proposedRecommendationShort
proposedRecommendationLong
proposedMeasurementType
proposedMeasurementUnit
proposedUnitCost
proposedCostUnit
proposedStandards
submittedBy
submittedAt
status
reviewedBy
reviewedAt
reviewNotes

Suggested statuses:

pending
approved
rejected
duplicate
needs_revision
Admin Review Workflow

Admins should eventually have a review queue for pending glossary requests.

Admin actions may include:

Approve as new glossary entry
Reject request
Mark as duplicate
Edit before approving
Link to an existing finding
Link to an existing recommendation
Create new finding and/or recommendation records
Create final glossary link row

Approval may create or update:

findings
recommendations
glossary

depending on whether reusable library records already exist.

Promotion Rules

Promotion should avoid creating duplicate or low-quality library records.

Before approval, the admin should be able to compare the requested custom record against existing:

Categories
Items
Findings
Recommendations
Glossary rows
Standards associations

The admin should decide whether to:

Use existing library records
Create new library records
Create only a new glossary link
Reject as project-specific only
Design Goal

The purpose of Phase 2 is to preserve flexibility without weakening library quality.

Users can document unusual field conditions.
Admins control what becomes reusable content.
Glossaries remain curated and intentional.

## Future Memo: Citation Inheritance, Drift, and Refresh Workflow

The citation model follows the broader snapshot inheritance architecture:

```text
Library → Glossary → Project Data Record

Citations may eventually exist at all three layers:

Finding / Recommendation Library Citations
        ↓ copied into
Glossary Citations
        ↓ copied into
Project Data Record Citations

Each layer inherits defaults from the layer above, but once copied, the citation set becomes an editable snapshot for that layer.

Core Rule

Changes to citations at an upstream layer should not automatically mutate downstream records.

For example, if a citation is later added to or changed on a library finding record:

finding.fldStandards

that should not automatically update:

glossary.fldStandards

and should not automatically update:

projectData.fldStandards

This protects historical work, avoids unexpected report changes, and preserves the principle that each layer is independently reviewable.

Current Direction

The intended long-term behavior is:

Library citation changes do not automatically mutate glossaries.
Glossaries may be manually refreshed from library defaults.
Project data records do not automatically mutate from glossary changes.

A glossary record may inherit citations from its underlying finding/recommendation library records when it is created, but later changes to those library records require explicit review before being applied to the glossary.

Likewise, a project data record may inherit citations from the glossary when it is created, but later changes to the glossary do not automatically update the already-saved project data record.

Why Automatic Sync Is Risky

Automatic downstream updates could unintentionally alter:

Existing glossary records
Previously completed project data
Report citations
Historical audit trails
Cost/recommendation documentation associated with a completed inspection or review

For example, if a finding library citation is corrected from one standard section to another, that may be appropriate for future glossaries, but not necessarily for every existing glossary or every completed project record.

Preferred Future Flow: Explicit Citation Review

A future workflow should allow users/admins to compare current library citation defaults against the citations currently stored on a glossary record.

Possible UI action:

Review Library Citation Updates

This action would compare:

Current Library Defaults
vs.
Current Glossary Citations

Example:

Current Glossary Citations
- TAS 302.1
- TAS 403.5.1

Current Library Defaults
- TAS 302.1
- TAS 403.5.2

The user/admin could then decide whether to:

Add a newly inherited citation
Remove an outdated citation
Replace a citation
Keep the glossary as-is
Apply all suggested changes
Ignore the difference for this glossary record
Option A: Per-Glossary Review

Add a review action directly in Glossary Builder.

Example:

Review Library Citation Updates

This would evaluate only the currently selected glossary record.

Benefits:

Simple mental model
Lower risk
Good for case-by-case review
Avoids accidental bulk changes

This is likely the best first implementation.

Option B: Admin Citation Drift Audit

Create a future admin/audit panel that identifies glossary records whose citations differ from their underlying library defaults.

Example:

Glossary Citation Drift Audit

The audit could list:

Glossary record
Associated category/item/finding/recommendation
Current glossary citations
Current library default citations
Added/removed/different citation IDs
Suggested action

Benefits:

Better for larger cleanup efforts
Helps identify outdated glossary records
Allows admins to review multiple records efficiently

This should still require explicit approval before changes are applied.

Option C: Bulk Refresh With Preview

A future advanced admin workflow could allow selected glossary records to be refreshed from library defaults in bulk.

This should only be allowed with:

Clear preview
Selective approval
Backup protection
Duplicate detection
Ability to skip records
Confirmation before write

Bulk refresh should never be silent or automatic.

Possible Metadata for Future Sync

To support better review workflows, future records may store citation inheritance metadata such as:

fldInheritedFindingStandardsSnapshot
fldInheritedRecommendationStandardsSnapshot
fldCitationLastSyncedAt
fldCitationSourceVersion

These fields are not required immediately, but may help distinguish:

Citations originally inherited from the library
Citations added directly to the glossary
Citations removed intentionally at the glossary level
Citations that differ because the library changed later

A simpler first implementation can compare live library citation values against current glossary citation values without additional metadata.

Project Data Records

Project data records should remain even more protected than glossary records.

Once a data record has inherited citations from the glossary, its citations are stored in:

projectData.fldStandards

That field represents the final citation set for that specific record.

Later changes to either:

glossary.fldStandards

or:

finding/recommendation.fldStandards

should not automatically update saved project data records.

If project-level citation refresh is ever needed, it should be treated as a separate explicit workflow with strong safeguards.

Design Principle
Defaults may flow downward.
Edits do not automatically propagate downward.
Refreshes must be explicit, reviewable, and reversible.

This preserves flexibility while protecting historical accuracy and user trust.

Users can update reusable defaults.
Admins can review drift.
Glossaries can be refreshed intentionally.
Project data remains stable unless directly edited.