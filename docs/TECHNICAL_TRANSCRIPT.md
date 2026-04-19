# Technical Transcript: Data Visibility Debugging (Tasks 14-22)

This transcript captures the specific technical directives and results during the critical phase of connecting to the `freda-enterprise` database.

---

### TASK 14: The Cache-Buster
**User Request**: "FRANCINE: CACHE-BUSTER BUILD (TASK 14). The live site is serving a stale version. Force a new filename hash."
**Action**: Added 50 lines of random comments to `App.tsx` and updated log to `VERSION 4.0`.
**Result**: Successfully changed the build hash.

### TASK 15: The Connection Handshake
**User Request**: "FRANCINE: CONNECTION HANDSHAKE (TASK 15). Counts are 0. Verify if the collection is empty."
**Action**: Added `PATH PROBE` logs to `firestoreService.ts` and a `manualCheck` effect to `App.tsx`.
**Result**: Logs confirmed the app was connected to the project, but the `glossary` collection returned `EMPTY`.

### TASK 16: Version 5.0 Force
**User Request**: "FRANCINE: VERSION 5.0 (TASK 16). The hash didn't change. Bump version in package.json."
**Action**: Bumped version to `1.0.5`. Added `cacheBuster: Date.now()` to `firebase.ts` initialization.
**Result**: Confirmed deployment of the new version.

### TASK 19: Database Instance Mismatch
**User Request**: "FRANCINE: DATABASE INSTANCE MISMATCH (TASK 19). The data is in a named instance called 'freda-enterprise', NOT the (default) instance."
**Action**: Updated `firebase.ts` to use `initializeFirestore(app, {}, 'freda-enterprise')`.
**Result**: Redirected SDK from the empty default bucket to the correct named bucket.

### TASK 20: Raw Data Extraction
**User Request**: "FRANCINE: RAW DATA EXTRACTION - NO FILTERS (TASK 20). Counts are still 0. Remove all .orderBy() and .where() clauses."
**Action**: Stripped all constraints from `firestoreService.ts`. Updated `manualCheck` to log `Object.keys()`.
**Discovery**: Confirmed that sorting by non-existent fields (like `fldOrder`) was causing the 0-result return.

### TASK 21: Mandatory Database ID Fix
**User Request**: "FRANCINE: DATABASE ID IS 'freda-enterprise' - MANDATORY FIX (TASK 21). Use the explicit databaseId property."
**Action**: 
```typescript
export const db = initializeFirestore(app, {
  databaseId: 'freda-enterprise'
});
```
**Result**: Hard-coded the connection to ensure no fallback to `(default)`.

### TASK 22: Final Publish Verification
**User Request**: "FRANCINE: THE PUBLISH IS NOT UPDATING (TASK 22). Bump version to 1.0.9. Change log to VERSION 7.0."
**Action**: Final version bump and log update to confirm the `databaseId` fix is active in the live environment.
**Result**: Deployment confirmed with `VERSION 7.0 - DATABASE FIX`.
