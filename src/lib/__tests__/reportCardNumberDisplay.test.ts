import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { REPORT_CARD_NUMBER_CELL_CLASS } from '../reportCardNumberDisplay';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function source(rel: string): string {
  return readFileSync(join(repoRoot, rel), 'utf8');
}

describe('PDF/View Report card number cell', () => {
  it('vertically centers the sequence number in the full-height number block', () => {
    expect(REPORT_CARD_NUMBER_CELL_CLASS).toContain('items-center');
    expect(REPORT_CARD_NUMBER_CELL_CLASS).toContain('justify-center');
    expect(REPORT_CARD_NUMBER_CELL_CLASS).not.toContain('justify-start');
    expect(REPORT_CARD_NUMBER_CELL_CLASS).not.toContain('pt-2');
    expect(REPORT_CARD_NUMBER_CELL_CLASS).not.toContain('flex-col');
  });

  it('does not render a truncated internal record id under the sequence number', () => {
    const ras = source('src/components/report/RasFindingCard.tsx');
    const assessment = source('src/components/ReportPreview.tsx');
    for (const src of [ras, assessment]) {
      expect(src).not.toMatch(/fldPDataID\?\.slice\(0,\s*8\)/);
      expect(src).toContain('REPORT_CARD_NUMBER_CELL_CLASS');
    }
  });
});
