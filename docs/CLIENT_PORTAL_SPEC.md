# FREDA Client Portal Specification

## Purpose

This document captures the future client portal vision for FREDA.

The client portal is intended to provide clients with an interactive workspace for reviewing project results, report data, photos, costs, findings, recommendations, and standards references.

---

## Core Distinction

FREDA will support two reporting experiences:

### PDF Report

The PDF report is the formal static deliverable.

It should remain:

* printable
* structured
* fixed-layout
* suitable for official submission or client delivery

### Client Portal

The client portal is an interactive expanded report workspace.

It may show the same information as the PDF report, plus additional interactive content such as:

* expanded/collapsible sections
* all project photos
* alternate sorting options
* saved user view preferences
* multiple report types under a project
* future filtering or dashboard summaries

---

## Client Portal Entry Flow

A client logs into the website or app and is presented with a list of their projects.

Basic navigation concept:

Client
→ Projects
→ Project
→ Facility
→ Reports
→ Report Data

Navigation should prioritize a Facility-first interaction model, even when only one facility exists (such as in RAS projects), to maintain consistency across all project types.

---

## RAS Project Structure

For RAS projects, the structure should be:

Project
→ Facility
→ Reports
→ ReportData

ReportData represents the collection of individual inspection records (findings, recommendations, measurements, costs, and associated data) for a given report instance. Each report may also include associated metadata such as narrative, summaries, and financial totals.

RAS projects are expected to have one facility per project.

Under that facility, the project may include one or more report types/report instances, such as:

* Preliminary Plan Review
* Plan Review
* Special Inspection #1
* Special Inspection #2
* Additional Special Inspections as needed
* Final Inspection

Example structure:

Project
  Facility
    Reports
      Preliminary Plan Review
      Plan Review
      Special Inspection #1
      Special Inspection #2
      Final Inspection
        ReportData

---

## Future Project Types

The portal should be flexible enough to support project types beyond RAS, including:

* Accessibility Assessments
* Plan Reviews
* Inspections
* Other future project/report types

The exact hierarchy for non-RAS project types may differ and should remain flexible.

---

## Interactive Report Structure

Within a report, the portal should display report information using collapsible sections.

Possible top-level report sections:

* Project Information
* Narrative
* Findings / Report Data
* Financial Summary
* Standards / Citations
* Additional Photographs

Each section should be expandable/collapsible.

The user should be able to collapse sections they do not want to view at that moment.

---

## Findings / Report Data Accordion

The main report data should use an accordion-style interface.

Default structure:

Category
→ Location
→ Record Details

Record Details may include:

* Item
* Finding
* Recommendation
* Measurement
* Measurement Unit
* Quantity
* Unit Cost
* Cost Unit Type
* Total Cost
* Photos
* Standards/Citations

---

## Alternate Sorting

The portal should support alternate sort orders.

Default report order should align with the PDF report unless changed by the user:

Category
→ Location
→ Item
→ Finding

The portal should eventually allow alternate sorting such as:

Category
→ Item
→ Location
→ Finding

Location
→ Category
→ Item
→ Finding

Priority
→ Category
→ Location
→ Item
→ Finding

Priority
→ Location
→ Category
→ Item
→ Finding

The system should be flexible enough to support a user-defined sort hierarchy.

Initial implementation should support predefined sort configurations (e.g., Category-first, Location-first, Priority-first). Future enhancements may allow fully user-defined sort hierarchies.

---

## Saved Sort Preferences

Portal sort preferences should be saved:

per user + project/report type

This means a user’s preferred sort order for a particular project/report type should persist until changed.

---

## Priority Field

Future ProjectData records should include a priority field:

`fldPriority?: number`

Priority scale:

* 1 = highest priority
* 2 = high priority
* 3 = medium priority
* 4 = low priority
* 5 = lowest priority

Priority may be used for:

* sorting
* filtering
* client review
* future dashboards
* future risk or remediation planning

Priority should be stored on the data record, not merely computed in the UI.

---

## Photographs

The current PDF report may show a limited number of photos per record.

The client portal should eventually support access to all photos associated with a record.

Photo storage model is TBD.

Preferred future direction:

* use an array or child collection to support unlimited photos per record
* associate photos with specific report data records
* allow additional photos to be displayed in a dedicated section

This design intentionally defers final implementation details to allow flexibility. The system should evolve toward a structure that supports unlimited photos per record without impacting report performance or historical data integrity.

---

## Additional Photographs Section

The portal and/or future report output should support an Additional Photographs section.

Purpose:

Show photographs that are not included in the main PDF record layout.

Organization:

* grouped by report data record number
* connected back to the relevant finding/recommendation
* expandable/collapsible like other report sections

---

## Design Principles

* PDF report remains the formal static deliverable.
* Client portal is the interactive expanded report workspace.
* Portal should use ProjectData snapshot values, not live library defaults.
* Historical report integrity must be preserved.
* Sorting logic should be reusable where practical.
* Portal display should not alter underlying report data unless explicitly designed to do so.
* Measurement units and cost unit types must remain conceptually separate.
* Future portal architecture should support multiple report types under a project.
* Portal UI structure should remain consistent across project types, even when underlying data structures differ.
* Future enhancements should favor extensibility over hard-coded assumptions.
