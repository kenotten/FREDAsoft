# FREDA Reporting Specification

## Purpose

This document defines reporting structure, ordering rules, and future reporting interface direction for FREDA.

---

## Current PDF Report

The current PDF report should preserve the established record layout:

* Each report record uses the existing 5-row × 7-column table layout.
* This layout should not be redesigned without explicit approval.

### Default PDF Report Grouping / Sorting

Report records should be grouped and ordered as follows:

1. Category — by `fldOrder`
2. Location — alphabetically
3. Item — by `fldOrder`
4. Finding — by `fldOrder`

Notes:

* `fldOrder` may be null.
* When `fldOrder` is null or duplicated, use a stable fallback sort, preferably alphabetical by display name.
* Sorting should be deterministic and consistent across preview and PDF output.

---

## Alternate Report Sorting

FREDA should eventually support alternate report sort modes.

### Alternate Sort Mode: Category → Item → Location → Finding

Purpose:

Allow users to group records by Item within each Category, rather than primarily by Location.

Order:

1. Category — by `fldOrder`
2. Item — by `fldOrder`
3. Location — alphabetically
4. Finding — by `fldOrder`

Use case:

This is helpful when reviewing all findings for the same Item together, even if they occur in multiple Locations.

UI concept:

* Future toggle, dropdown, or option button
* Default mode remains Category → Location → Item → Finding unless changed by the user

---

## Future Client Portal Reporting

FREDA may eventually support a client portal where clients can review assessment, plan review, and inspection data interactively.

The client portal report view should use the same underlying reporting order rules but display records in an accordion-style interface.

### Proposed Accordion Structure

Default portal structure:

1. Category
2. Location
3. Records / Findings / Recommendations

Example:

Category
→ Location
→ Record details

Future alternate structure may support:

Category
→ Item
→ Location / Records

---

## Design Principles

* PDF reports remain formal, printable, and table-based.
* Client portal reports may be interactive, filterable, and accordion-based.
* Sorting logic should be reusable between PDF, portal, and future custom report views.
* Report output should be based on ProjectData snapshot values, not live library defaults.
* Historical report integrity must be preserved.
