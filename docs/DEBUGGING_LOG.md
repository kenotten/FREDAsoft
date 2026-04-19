# Debugging & Task History (Tasks 14-22)

This log documents the critical path taken to resolve the data visibility issues in the FREDAsoft application.

## Task 14: Cache-Busting Build
- **Problem**: Live site was serving stale JavaScript bundles.
- **Action**: Added a 50-line random comment block to `App.tsx` and updated the global log to `VERSION 4.0`.
- **Result**: Forced a change in the file hash.

## Task 15: Connection Verification
- **Problem**: Connection was successful but returning 0 records.
- **Action**: Added `PATH PROBE` logs to `firestoreService.ts` and a `manualCheck` hook in `App.tsx` to fetch a single `glossary` document.
- **Goal**: Verify if the collection was physically empty.

## Task 16: Deployment Verification (Version 5.0)
- **Problem**: Hash did not change on re-publish.
- **Action**: Bumped version to `1.0.5` in `package.json` and added a `cacheBuster` timestamp to the Firebase initialization in `firebase.ts`.
- **Result**: Confirmed deployment success via new filename hash.

## Task 19: Database Instance Mismatch
- **Problem**: App was looking at the `(default)` database, but data was in a named instance.
- **Action**: Explicitly pointed the SDK to the `freda-enterprise` database instance in `firebase.ts`.
- **Code**: `initializeFirestore(app, {}, 'freda-enterprise')`.

## Task 20: Raw Data Extraction (Naked Fetch)
- **Problem**: Data was still not appearing, suggesting code-level filtering.
- **Action**: Stripped all `where()` and `orderBy()` clauses from `firestoreService.ts`.
- **Discovery**: Records lacked the `fldOrder` field, causing sorted queries to return 0 results.

## Task 21: Mandatory Database ID Fix
- **Problem**: The previous initialization method was not reliably targeting the named instance.
- **Action**: Used the explicit `databaseId` property in `initializeFirestore`.
- **Code**: 
  ```typescript
  export const db = initializeFirestore(app, {
    databaseId: 'freda-enterprise'
  });
  ```

## Task 22: Final Cache-Bust (Version 7.0)
- **Problem**: Live site was still serving a stale version (BesaHcis).
- **Action**: Bumped version to `1.0.9` and updated log to `VERSION 7.0 - DATABASE FIX`.
- **Goal**: Ensure the hard-coded database ID fix is live.
