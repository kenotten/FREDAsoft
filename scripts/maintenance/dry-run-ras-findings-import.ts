/**
 * DRY RUN ONLY — offline RAS Plan Review findings import validation.
 *
 * Reads the Findings tab from .xlsx (primary) or a CSV export (secondary).
 * Emits JSON + Markdown reports under reports/ (gitignored). No Firestore
 * reads or writes. No credentials required or used. No --write mode.
 *
 * Usage:
 *   npx tsx scripts/maintenance/dry-run-ras-findings-import.ts --input path/to/batch.xlsx
 *
 * Optional:
 *   --output-dir reports
 */
import fs from 'fs';
import path from 'path';
import { buildDryRunMarkdown, buildDryRunReport, buildFatalReport } from './rasFindingsImport/buildReport.ts';
import { inferInputFormat, parseInputFile } from './rasFindingsImport/parseInput.ts';
import { validateAllRows } from './rasFindingsImport/validateRows.ts';

const DEFAULT_OUTPUT_DIR = 'reports';
const JSON_NAME = 'ras-findings-import-dry-run.json';
const MD_NAME = 'ras-findings-import-dry-run.md';

function parseArgs(argv: string[]): { input?: string; outputDir: string } {
  let input: string | undefined;
  let outputDir = DEFAULT_OUTPUT_DIR;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--input' && argv[i + 1]) {
      input = argv[++i];
    } else if (arg === '--output-dir' && argv[i + 1]) {
      outputDir = argv[++i]!;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: npx tsx scripts/maintenance/dry-run-ras-findings-import.ts --input <file.xlsx|file.csv> [--output-dir reports]`);
      process.exit(0);
    }
  }
  return { input, outputDir };
}

function writeReports(outputDir: string, report: ReturnType<typeof buildDryRunReport>): void {
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, JSON_NAME);
  const mdPath = path.join(outputDir, MD_NAME);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  fs.writeFileSync(mdPath, buildDryRunMarkdown(report), 'utf-8');
  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
}

function printSummary(report: ReturnType<typeof buildDryRunReport>): void {
  const s = report.summary;
  console.log(
    `Dry run: totalRows=${s.totalRows} approvedRows=${s.approvedRows} structurallyValidRows=${s.structurallyValidRows} blockedRows=${s.blockedRows} blockedPendingFirestoreResolution=${s.blockedPendingFirestoreResolution} skippedRows=${s.skippedRows} proposedCreatePreviews=${s.proposedCreatePreviews}`
  );
}

async function main(): Promise<void> {
  const { input, outputDir } = parseArgs(process.argv.slice(2));
  if (!input) {
    console.error('Missing required --input <path-to-xlsx-or-csv>');
    process.exit(1);
  }

  const resolvedInput = path.resolve(input);
  const format = inferInputFormat(resolvedInput);
  const parsed = await parseInputFile(resolvedInput);

  if (parsed.ok === false) {
    const fatal = buildFatalReport(
      resolvedInput,
      format ?? 'unknown',
      parsed.fatalError,
      parsed.forbiddenColumnsPopulated ?? []
    );
    writeReports(path.resolve(outputDir), fatal);
    printSummary(fatal);
    console.error(`Fatal: ${parsed.fatalError}`);
    process.exit(1);
  }

  const results = validateAllRows(parsed.rows);
  const report = buildDryRunReport(resolvedInput, parsed.format, results);
  writeReports(path.resolve(outputDir), report);
  printSummary(report);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
