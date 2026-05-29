# FREDAsoft AI Agent Protocol

## 1. Purpose
- This file is the mandatory protocol for AI-assisted work in FREDAsoft.
- Cursor/AI agents must read (or re-read) this file at the start of each new branch or task, before touching protected areas, and whenever context is uncertain.
- If chat instructions conflict with this file, stop and ask Archie/user for clarification before implementing.

## 2. Roles
- User: product owner / final decision maker.
- Archie: architectural authority / reviewer / mentor.
- Cursor: implementation assistant.
- Cursor implements only after Archie/user approval.
- User-observed UI behavior overrides plausible code summaries.

## 3. Git discipline
- Always start new implementation work with:
  - `git checkout main`
  - `git pull origin main`
  - `git status`
  - `git branch --show-current`
  - `git branch`
- Never implement on `main`.
- Create short-lived feature branches.
- If uncommitted changes exist on `main`, stop and branch or restore before proceeding.

## 4. Plan first
- Default workflow: investigate → report plan → Archie review → implement.
- Plans must include: files to touch, data behavior, UI state impact, risks, and a manual test plan.
- Exceptions only for explicitly trivial changes.

## 5. Scope control
- No broad refactors.
- No unrelated formatting.
- No drive-by cleanup.
- No mixing docs, implementation, migrations, and cleanup unless explicitly scoped.
- Preserve existing behavior unless explicitly changed.

## 6. Protected areas
Changes require explicit scope/approval:
- `src/components/ReportPreview.tsx` and PDF rendering behavior
- Web Report Viewer print/PDF integration (future integration)
- `ProjectDataEntry.tsx`
- `LibraryManager.tsx`
- `OrderManager` / Sequence Manager
- Firestore schema/rules/writes/migrations
- `auth/` client portal/security code
- data cleanup scripts/migrations

## 7. Data safety
- No Firestore writes/migrations without dry run and approval.
- No service account JSON committed.
- No generated reports, diagnostics, scratch files, or console logs committed.

## 8. Verification
Before commit:
- `git status`
- `git diff --stat`
- targeted diff review for complex changes
- `npm run lint`
- `npm run build`
- manual UI testing for UI work

After merge:
- run lint/build again when appropriate
- push only after clean status

## 9. Documentation
- Keep `docs/ARCHITECTURE_DESIGN.md` current with major architecture/product decisions.
- Use concise `✅ DECIDED` blocks for durable decisions.

## 10. Reporting back
Cursor should report:
- branch
- files changed
- summary
- diff stat
- lint/build results
- manual test results
- explicit confirmation of protected-file confirmations/not touched

## 11. Product Behavior Change Disclosure

AI agents must explicitly disclose any proposed or implemented change that alters **user-facing behavior**, even when the work is framed as a bug fix or is technically small.

- Behavior changes must **not** be buried in long implementation summaries.
- Use a clear heading: **Product behavior implications**.
- Pause for Archie/user approval **before implementing** behavior changes that are not strictly necessary to the requested bug fix.

### Examples (non-exhaustive)

Disclosure is required for changes such as:

- new or changed dropdown behavior
- local selection diverging from global app context
- changed fallback or default behavior
- changed persistence or reset behavior
- changed visibility of archived or deleted records
- changed validation or blocking rules
- changed report contents, ordering, grouping, numbering, filtering, or included records
- changed save behavior
- automatic correction, inference, or other “helpful” behavior

### Required report format

Before implementation (and again in the final report if behavior changed), include **Product behavior implications** with:

1. **What behavior changes** — describe what the user will see or experience differently.
2. **Intentional or incidental** — whether the change is deliberate or a side effect of the fix.
3. **Scope** — whether it affects only the current surface (e.g. one tab) or app-wide context (header, persistence, other tabs).
4. **Data impact** — whether it persists data or is view-only.
5. **Approval** — whether Archie/user approval is needed before implementation (required when the change is not strictly necessary for the requested bug fix).
