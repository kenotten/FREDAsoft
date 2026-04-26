# FREDA Maintenance Backlog
 
 ## Purpose
 
 This document tracks non-critical technical debt, cleanup tasks, and system improvements identified during development. These items are intentionally deferred to avoid disrupting active feature work or stabilization efforts.
 
 ---
 
 ## Current Backlog
 
 ### Dependency Hygiene Review (Post-Stabilization)
 
 **Summary:**
 Review and clean up Node dependencies to ensure long-term stability, security, and maintainability.
 
 **Tasks:**
 
 * Regenerate and standardize `package-lock.json`
 * Document Node version requirement (>=20)
 * Audit PDF generation pipeline (`html2pdf.js`, `html2canvas`) for safe usage
 * Remove unused dependencies (e.g., `is-thirteen`)
 * Verify necessity of `@google/genai`
 * Run `npm audit` and resolve actionable findings
 
 **Priority:** Low
 **Phase:** Post-UI Polish / Pre-Production Hardening
 
 ---
 
 ### Reference Data Manager for Controlled Dropdown Lists
 
 **Summary:**
 Create an admin-facing tool for managing controlled dropdown values used throughout FREDA, so values do not need to be hard-coded or updated directly in code.
 
 **Purpose:**
 Provide a centralized “one-stop shop” for managing app-wide reference lists such as Cost Unit Types, Measurement Units, and other controlled vocabularies.
 
 **Potential Lists:**
 
 * Cost Unit Types: EA, LF, SF, LS, etc.
 * Measurement Units / UOM: %, inches, degrees, seconds, etc.
 * Location / Area labels
 * Inspector roles or titles
 * Other future controlled dropdown values
 
 **Required Concepts:**
 
 * list name / category
 * code value
 * display label
 * description
 * sort order
 * active / inactive status
 * system-locked flag for protected values
 
 **Important Rules:**
 
 * Do not hard-delete values that may have been used in project records
 * Use active/inactive status instead
 * Preserve historical records and reports
 * Keep Cost Unit Types and Measurement Units conceptually separate
 * Avoid mixing physical measurement units with economic cost units
 
 **Priority:** Medium
 **Phase:** Future Admin / Platform Scalability
 **Status:** Deferred
 
 **Notes:**
 For now, dropdown value changes may be handled as one-off code/data updates. This feature should be implemented later when FREDA’s controlled vocabulary needs grow beyond manual maintenance.
 
 ---
 
 ## Guidelines
 
 * Only include non-blocking items
 * Do not include active sprint tasks
 * Do not include architectural changes (those belong in ARCHITECTURE_DESIGN.md)
 * Each entry should be actionable and clearly scoped
 * Update this document as new technical debt or cleanup opportunities are identified
 
 ---
 
 ## Future Sections (Optional)
 
 (Leave placeholders for future expansion)
 
 * Performance Optimization
 * Security Hardening
 * Codebase Refactoring
 * Tooling Improvements
 
 
