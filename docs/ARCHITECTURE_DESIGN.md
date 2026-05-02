# Architecture & Design Decisions (FREDAsoft)

This document serves as the single source of truth for all architectural decisions and is version-controlled alongside the codebase. Every AI session should read this before making changes.

---

## 🧠 AI Operations Layer (Archie / Gabe / Francine)

This section governs how AI agents interact with the codebase. It is REQUIRED reading before any automated or assisted code changes.

### 🎭 Agent Roles

**Archie (Architect)**
- Defines system-level structure and refactoring strategy
- Breaks work into atomic, safe tasks
- Focus: scalability, safety, clarity

**Gabe (Sentry)**
- Reviews and hardens all prompts before execution
- Enforces:
  - strict scope control
  - no unintended refactors
  - preservation of behavior
- Converts ideas into deterministic instructions

**Francine (Execution Agent)**
- Executes tasks in AI Studio
- Must follow instructions exactly
- Has NO authority to:
  - refactor beyond instructions
  - introduce new patterns
  - modify unrelated code

---

### 🛡️ Non-Negotiable Execution Rules

1. Only modify what is explicitly specified  
2. Preserve all existing behavior unless explicitly changed  
3. No implicit refactors or “cleanup”  
4. Use explicit logic (no truthy/falsy shortcuts)  
5. Use safe, targeted React state updates  
6. Do not mix concerns (security, UI, data, performance) 
7. If the prompt is marked ANALYSIS ONLY, no code may be written or modified under any circumstance.
8. Do not assume intent. If a prompt does not explicitly say "apply changes", only analyze and report. 

---

### 🔁 Standard Task Structure

Every task must include:
- Objective  
- File(s)  
- Target function  
- Explicit logic  
- Constraints  
- Verification steps  

---

### 🧪 Required Verification

- App builds successfully  
- No console errors  
- No UI regression  
- Target behavior works  

---

## 🚦 Current Work State

- **Phase**: Data Integrity Stabilization  
- **Active Task**: 95 — Opening Force Fix  
- **Target Version**: v87.0  
- **Status**: Pending quota reset  

### Next Up
- P1 — Firestore Security Hardening  
- P2 — Remove runtime debug logic  
- P3 — Extract Firestore subscriptions  

---

## ⚠️ Known Risk Areas

- Firestore security rules (overly permissive)  
- App.tsx (“God component”)  
- Large components (>800 LOC)  
- Heavy use of `any`  
- Firestore subscription lifecycle issues  
- Runtime debug/migration logic in production  
- Large bundle size (~1.5MB)  

---

## 📦 Proven Code Patterns

### Safe React State Update

```ts
setState(prev =>
  prev.map(item =>
    item.id === targetId
      ? { ...item, ...updates }
      : item
  )
);
```

### Array Sanitization Pattern

```ts
if ('field' in updates) {
  const value = updates.field;

  if (Array.isArray(value)) {
    updates.field = value;
  } else if (value === undefined || value === null || value === '') {
    updates.field = [];
  } else {
    updates.field = [value];
  }
}
```

---

## 1. Core Identity / Data Model

- User Identity: Firebase Auth (Google). Roles stored in `users`.  
- Project Hierarchy: Project → Client, Facility, DesignFirm, Inspector  
- Inspection Logic: `projectData` = inspection findings  
- Glossary System: Category → Item → Finding → Recommendation  
- Snapshots: Standards copied into `StandardSnapshot`  
- Multi-Tab Persistence: `persistentMultipleTabManager`  
- Database: `freda-enterprise` instance  
- Initialization Safety: try/catch + finally loading handling  
- Migration Logic: moved to `migrationService.ts` (must NOT run in normal runtime)  
- Schema Normalization: `fldSuggestedRecs` is Array-based  
- Standards Library: `master_standards`  

---

## 2. Permission & Role Model

| Role   | Scope            | Permissions         |
|--------|------------------|--------------------|
| Admin  | System-wide      | Full access        |
| User   | Project-wide     | Read + limited write |
| Public | Unauthenticated  | Read-only lookup   |

---

## 3. Data Sharing & Visibility

Public read access will be restricted in Phase P1.

- Global read access (temporary)  
- Authenticated writes required  
- PII protections planned  

---

## 4. Lifecycle Management

- Soft deletes via `fldIsDeleted`  
- Standards archived via `fldIsArchived`  
- Optimistic UI updates  

---

## 5. Interface Strategy

- Field (Mobile): fast, minimal input  
- Office (Desktop): complex management + reporting  

---

## 6. Open Questions

### Standards
- Multi-code support  
- Snapshot hashing  

### User Management
- Admin dashboard  
- Project ownership transfer  

### Performance
- PDF generation strategy  
- Image compression  

---

## 7. Process Rules

1. Strict scope  
2. Clarify before big changes  
3. Update decisions immediately  
4. Log open questions  
5. Prefer simple solutions  
6. Treat this as institutional memory  
7. Snapshot data for legal integrity  

---

## 8. Product Direction: FREDA Platform Evolution

**FREDA (Facility Reporting and Data Analytics)** is designed as a platform for managing compliance-related data across facilities.

While the current system focuses on structured report generation, it is intentionally architected to support multiple workflows, including:

* inspections
* plan reviews
* assessments

Future development will expand FREDA into a client-facing platform that enables interaction with project data beyond static reports. This includes:

* client access to project data via a secure portal
* tracking and responding to findings or review comments
* communication between clients and professionals
* filtered views across facilities and projects
* generation of dynamic, data-driven reports

This direction establishes FREDA as a **data-centric compliance platform**, not limited to static reporting.

No implementation of these features is part of the current phase. This section defines long-term direction only and should guide future architectural decisions.

---

## Appendix: Schema Notes

- `projectData` → inspection findings  
- `glossary` → templates  
- `master_standards` → standards library  
- `userPreferences` → UI state  
- `documents` → reports  

## Firebase Storage Configuration Notes

FREDAsoft uses Firebase Storage with the bucket:

path-recovery.firebasestorage.app

Important:
- This must match the value in firebase-applet-config.json
- Do not use the legacy .appspot.com bucket unless explicitly configured

CORS must be configured on the active bucket for local development:
- Allows http://localhost:3000

Storage rules must use:
service firebase.storage

NOT:
service cloud.firestore

Common failure symptoms:
- Upload fails with "CORS" error
- Preflight request fails
- net::ERR_FAILED

These usually indicate:
- Wrong bucket
- Missing CORS
- Incorrect rules type


## Future Enhancement: Data Record Image Management

The restored Project Data Entry image upload feature is stable enough for beta testing in its current form. Future enhancements should be deferred until the current data-entry flow has been tested more thoroughly.

Planned future capabilities:

### 1. Image Ordering

Allow users to manually reorder images attached to a project data record.

Potential implementation:
- Store image metadata as objects instead of raw URL strings.
- Add an `order` field.
- Support drag-and-drop or move up/down controls.
- Preserve order when rendering thumbnails and reports.

Example future structure:

```ts
fldImages: [
  {
    url: string;
    storagePath: string;
    order: number;
    uploadedAt: string;
    isDeleted: boolean;
  }
]
2. Select Primary Report Images

Allow users to mark up to two images per data record for inclusion in the main report body.

Expected behavior:

User may upload many images to a data record.
User can select up to 2 as “primary” or “include in report body.”
Remaining images should be included later in a report addendum/appendix.
UI should prevent selecting more than 2 primary images.

Potential metadata fields:

includeInReport
reportImageSlot
reportOrder
3. Image Addendum / Appendix

Images not selected as primary report images should still be retained and available.

Expected behavior:

Non-primary images remain attached to the data record.
Report generator places them in an image addendum/appendix.
Images should retain association with their project, facility, location, and data record.
4. Drag-and-Drop Upload

Add drag-and-drop support to the Project Data Entry image card.

Expected behavior:

User can drag image files onto the Images card.
Existing “Add Image” button remains available.
Same validation, resize, upload, and fldImages save flow should be reused.
Avoid introducing a separate upload pathway.
5. Soft Delete / Archive Policy

Image removal from a data record should follow FREDAsoft’s data retention policy.

Expected behavior:

Removing an image from a record should not immediately delete the underlying Firebase Storage object.
Future image metadata should support isDeleted, deletedAt, and possibly deletedBy.
A separate controlled purge/admin feature may be added later for permanent cleanup.
Implementation Note

Current implementation stores fldImages as an array of image URL strings. This is acceptable for beta testing.

Future enhancements will likely require migrating fldImages from string[] to image metadata objects, or introducing a compatible normalization layer that supports both legacy string URLs and newer image objects.

## Firebase Usage Safety Guidelines

FREDAsoft must prevent accidental Firebase overuse caused by render loops, repeated listeners, or uncontrolled retries.

Guidelines:
- Firebase writes should be triggered by explicit user actions whenever possible.
- Avoid Firebase writes inside `useEffect` unless the effect is tightly guarded.
- Use operation locks such as `isUploading`, `isSaving`, or `isLoading` to prevent duplicate actions.
- Long-running operations must fail fast and surface errors to the user.
- Avoid unbounded retry loops.
- Prefer localStorage for draft autosave rather than Firestore autosave.
- Scope all project data reads and views by active `projectId` and `facilityId`.
- Use Firestore queries with project/facility constraints where practical.
- Avoid broad realtime listeners unless the screen truly needs live updates.
- Add Firebase budget alerts in Google Cloud/Firebase.
- During beta, set practical limits on uploads and batch operations.

## Glossary Link Integrity

Project data records rely on `fldData` as the authoritative reference to the glossary hierarchy.

When editing records:
- `fldData` must always reflect the current selection (`selections.glosId`)
- UI text fields alone are not sufficient to define structure

Failure to update `fldData` results in:
- incorrect category/item display in explorer
- incorrect hydration when reopening records

## Future Enhancement: Inspector Assignment Model

Current behavior:
- A project may currently resolve to a single active inspector.
- Project data records store the inspector responsible for the record in `fldInspID`.

Future need:
- Projects may have multiple inspectors.
- Large assessments may involve multiple inspectors across buildings, facilities, or locations.
- The active inspector should be selectable during the session and associated with each data record they create or edit.

Design direction:
- Do not hard-code a single inspector as the only valid project inspector.
- Treat inspector as active session context, similar to active client/facility/project.
- Continue storing `fldInspID` on each projectData record.
- Future UI should allow selecting the active inspector for data entry.
- Future project setup may support assigning one or more inspectors to a project.
- Existing records should preserve their original `fldInspID` unless intentionally reassigned.

Near-term guidance:
- Do not block the current beta workflow to redesign inspector assignment.
- Ensure new Data Entry session-state work does not assume only one inspector can ever exist per project.

## Library Management Expansion (Future)

Current State:
- Findings and Recommendations are primarily created and managed through the Glossary Builder.
- Certain associated attributes (e.g., citations/standards, unit cost, unit type) are used in application workflows but are not consistently visible or editable within a dedicated library interface.

Observation:
- This creates a disconnect between:
  - where records are defined (Glossary Builder)
  - and how they are used (Data Entry, Reports)

Future Direction:
- Move full lifecycle management of Findings and Recommendations into the Library domain.
- Users should be able to:
  - Create
  - Edit
  - Delete
  - Copy / duplicate (for rapid creation of similar records)

Key Principles:
- Findings:
  - Contain descriptive content and classification (e.g., finding type / default type)
  - May reference standards/citations
  - Do NOT contain measurement values (those belong to data records)

- Recommendations:
  - Contain corrective action content
  - May include default cost-related fields (unit cost, unit type)

Proposed Structure:
- Introduce a dedicated Library interface, potentially including:
  - Library Explorer (browse/search/filter records)
  - Library Builder (create/edit structured records)

- Align this structure conceptually with the Glossary system, but with clearer separation of concerns and improved usability.

Note:
- This is a planned architectural evolution and should not be implemented until current data entry and reporting workflows are fully stabilized.

### Standards Model Enhancement (Future)

Current State:
- All standards (Standard, Advisory, Exception, Figure, Table) share a consistent record structure.
- Distinction between types is handled via `relation_type` (e.g., "Standard", "Advisory", "Exception", "Figure", "Table").
- Content is primarily text-based (`content_text`).

Observation:
- Real-world standards (e.g., TAS, ADA, UFAS) include **figures and tables** that are not independent entities, but **citation variants** associated with standard sections.
- Figures and tables often:
  - share the same citation numbering system
  - appear sequentially with text standards
  - include visual content (images) in addition to or instead of text

Future Direction:
- Maintain a **single unified standards schema** for all record types.
- Extend the schema to support **optional image references** for any standard record.

Key Principles:
- No separate "figure" or "table" entity types — all remain standard records.
- `relation_type` continues to define:
  - Standard
  - Advisory
  - Exception
  - Figure
  - Table
- Images are **supplemental to text**, not replacements.
- Any standard record may include:
  - text only
  - image only
  - or both

Proposed Additions to Standard Record:

```ts
imageId?: string | null;
imageUrl?: string | null;     // optional denormalized field
imageCaption?: string;