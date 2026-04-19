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

## Appendix: Schema Notes

- `projectData` → inspection findings  
- `glossary` → templates  
- `master_standards` → standards library  
- `userPreferences` → UI state  
- `documents` → reports  
