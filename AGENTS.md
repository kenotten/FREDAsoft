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
