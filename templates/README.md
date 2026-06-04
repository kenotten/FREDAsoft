# Templates

**`RAS_FINDINGS_TEMPLATE.xlsx`** — blank RAS Plan Review findings authoring workbook (v1). Layout and rules: **`docs/RAS_FINDINGS_SPREADSHEET_TEMPLATE.md`**. Import authority: **`docs/RAS_FINDINGS_IMPORT_FORMAT.md`**.

Offline dry-run (no credentials): `npx tsx scripts/maintenance/dry-run-ras-findings-import.ts --input templates/RAS_FINDINGS_TEMPLATE.xlsx` — writes gitignored reports under **`reports/`**.
