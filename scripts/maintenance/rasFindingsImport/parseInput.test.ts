import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCsvContent, parseCsvLine, validateHeaderRow } from './parseInput.ts';
import { FINDINGS_HEADERS } from './constants.ts';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

describe('parseCsvLine', () => {
  it('parses quoted commas', () => {
    expect(parseCsvLine('"a,b",c')).toEqual(['a,b', 'c']);
  });
});

describe('validateHeaderRow', () => {
  it('accepts canonical headers', () => {
    const result = validateHeaderRow([...FINDINGS_HEADERS]);
    expect(result.ok).toBe(true);
  });

  it('rejects forbidden header columns', () => {
    const result = validateHeaderRow([...FINDINGS_HEADERS, 'recommendation']);
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.fatalError).toContain('Forbidden');
    }
  });

  it('rejects wrong column count', () => {
    const result = validateHeaderRow(['importKey']);
    expect(result.ok).toBe(false);
  });
});

describe('parseCsvContent', () => {
  it('parses valid minimal fixture', () => {
    const content = fs.readFileSync(path.join(fixturesDir, 'findings-valid-minimal.csv'), 'utf-8');
    const result = parseCsvContent(content);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]?.rasFindShort).toBe('Short label');
    }
  });

  it('fails on forbidden column header', () => {
    const content = fs.readFileSync(
      path.join(fixturesDir, 'findings-forbidden-column.csv'),
      'utf-8'
    );
    const result = parseCsvContent(content);
    expect(result.ok).toBe(false);
  });
});
