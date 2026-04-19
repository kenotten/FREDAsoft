# Full Project History & Decision Log (FREDAsoft)

This document provides a chronological history of the FREDAsoft application development, from initial conception to the current state.

## Phase 1: Foundation & Core Identity
- **Initial Request**: Build a specialized inspection and maintenance platform for accessibility compliance.
- **Decision**: Use React 18, Vite, and Tailwind CSS for the frontend.
- **Decision**: Use Firebase (Auth, Firestore, Storage) for the backend.
- **Decision**: Point to the `freda-enterprise` Firestore instance to leverage existing data.
- **Architecture**: Established the `Client -> Facility -> Project -> ProjectData` hierarchy.

## Phase 2: The Glossary & Standards System
- **Feature**: Implemented a "Glossary" template system to link Categories, Items, Findings, and Recommendations.
- **Feature**: Integrated a Master Standards library (TAS/ADA).
- **Decision (Forensic Integrity)**: Implemented "Snapshotting" logic. When a record is saved, the full text and citations of the standard are copied into the record. This ensures historical reports remain accurate even if the master library changes.

## Phase 3: Interface Specialization (Dual-Core)
- **Feature**: Developed "FREDA Field" (Mobile-First) for on-site data entry.
- **Feature**: Developed "FREDA Office" (Desktop-First) for QA, bulk management, and reporting.
- **UI/UX**: Implemented the "Context Tray" for rapid switching between Clients and Facilities.

## Phase 4: Advanced Data Management
- **Feature**: Implemented Soft-Deletes (`fldIsDeleted`) across all major entities.
- **Feature**: Added "Orphan Cleanup" utility to maintain referential integrity.
- **Feature**: Enabled multi-tab offline persistence using Firestore's `persistentMultipleTabManager`.

## Phase 5: The "Data Visibility" Debugging Marathon (Tasks 14-22)
- **Task 14-16**: Diagnosed stale browser cache issues. Implemented versioning (`package.json`) and cache-busting logs (`VERSION 4.0`, `5.0`).
- **Task 17-18**: Verified project connectivity and collection naming conventions.
- **Task 19-21**: Identified and resolved a critical "Database Instance Mismatch." The app was defaulting to an empty database instead of the named `freda-enterprise` instance.
- **Task 20**: Discovered that `orderBy` clauses on non-existent fields (like `fldOrder`) were causing Firestore to return zero results. Implemented "Naked Fetch" to bypass this.
- **Task 22**: Forced final deployment of the `databaseId` fix with `VERSION 7.0`.

## Current Status (Version 1.0.9)
- **Active Instance**: `freda-enterprise`
- **Fetch Strategy**: Raw (Naked) fetch enabled for debugging.
- **Admin**: `kenotten@statereview.com` hardcoded in rules.
