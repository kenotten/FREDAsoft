import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import {
  FINDINGS_HEADERS,
  FINDINGS_SHEET_NAME,
  FORBIDDEN_COLUMN_NAMES,
} from './constants.ts';
import type { FindingsHeader } from './constants.ts';
import type { InputFormat, ParseResult, ParsedRow } from './types.ts';

function normalizeCell(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object' && value !== null && 'text' in value) {
    return String((value as { text?: string }).text ?? '').trim();
  }
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function isRowWhollyEmpty(values: string[]): boolean {
  return values.every((v) => v === '');
}

export function validateHeaderRow(headers: string[]): ParseResult {
  const normalized = headers.map((h) => h.trim());
  const forbiddenPresent = normalized.filter((h) =>
    (FORBIDDEN_COLUMN_NAMES as readonly string[]).includes(h)
  );
  if (forbiddenPresent.length > 0) {
    return {
      ok: false,
      fatalError: `Forbidden column(s) in header: ${forbiddenPresent.join(', ')}`,
      forbiddenColumnsPopulated: [{ columns: forbiddenPresent }],
    };
  }
  if (normalized.length !== FINDINGS_HEADERS.length) {
    return {
      ok: false,
      fatalError: `Findings header must have exactly ${FINDINGS_HEADERS.length} columns; found ${normalized.length}.`,
    };
  }
  for (let i = 0; i < FINDINGS_HEADERS.length; i++) {
    if (normalized[i] !== FINDINGS_HEADERS[i]) {
      return {
        ok: false,
        fatalError: `Header column ${i + 1} must be "${FINDINGS_HEADERS[i]}"; found "${normalized[i] ?? ''}".`,
      };
    }
  }
  return { ok: true, rows: [], format: 'csv' };
}

/** Minimal RFC4180-style CSV row parser (quoted fields, commas). */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

export function parseCsvContent(content: string): ParseResult {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/);
  const nonEmptyLines = lines.filter((l) => l.trim() !== '');
  if (nonEmptyLines.length === 0) {
    return { ok: false, fatalError: 'CSV file is empty.' };
  }
  const headerFields = parseCsvLine(nonEmptyLines[0]!);
  const headerCheck = validateHeaderRow(headerFields);
  if (!headerCheck.ok) return headerCheck;

  const rows: ParsedRow[] = [];
  for (let i = 1; i < nonEmptyLines.length; i++) {
    const fields = parseCsvLine(nonEmptyLines[i]!);
    const values = FINDINGS_HEADERS.map((_, idx) => normalizeCell(fields[idx]));
    if (isRowWhollyEmpty(values)) continue;
    const rowNumber = i + 1;
    const record = { rowNumber } as ParsedRow;
    FINDINGS_HEADERS.forEach((key, idx) => {
      record[key] = values[idx] ?? '';
    });
    rows.push(record);
  }
  return { ok: true, rows, format: 'csv' };
}

export async function parseXlsxFile(filePath: string): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.getWorksheet(FINDINGS_SHEET_NAME);
  if (!sheet) {
    return { ok: false, fatalError: `Worksheet "${FINDINGS_SHEET_NAME}" not found.` };
  }

  const headerRow = sheet.getRow(1);
  const headers = FINDINGS_HEADERS.map((_, i) => normalizeCell(headerRow.getCell(i + 1).value));
  const headerCheck = validateHeaderRow(headers);
  if (!headerCheck.ok) return headerCheck;

  const rows: ParsedRow[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const values = FINDINGS_HEADERS.map((_, i) => normalizeCell(row.getCell(i + 1).value));
    if (isRowWhollyEmpty(values)) continue;
    const record = { rowNumber: r } as ParsedRow;
    FINDINGS_HEADERS.forEach((key, idx) => {
      record[key] = values[idx] ?? '';
    });
    rows.push(record);
  }
  return { ok: true, rows, format: 'xlsx' };
}

export function parseCsvFile(filePath: string): ParseResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseCsvContent(content);
}

export function inferInputFormat(filePath: string): InputFormat | null {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.xlsx') return 'xlsx';
  if (ext === '.csv') return 'csv';
  return null;
}

export async function parseInputFile(filePath: string): Promise<ParseResult> {
  const format = inferInputFormat(filePath);
  if (!format) {
    return { ok: false, fatalError: 'Unsupported input format. Use .xlsx or .csv.' };
  }
  if (!fs.existsSync(filePath)) {
    return { ok: false, fatalError: `Input file not found: ${filePath}` };
  }
  if (format === 'xlsx') return parseXlsxFile(filePath);
  return parseCsvFile(filePath);
}

export function rowToRecord(row: ParsedRow): Record<FindingsHeader, string> {
  const out = {} as Record<FindingsHeader, string>;
  for (const key of FINDINGS_HEADERS) {
    out[key] = row[key] ?? '';
  }
  return out;
}
