import { describe, expect, it } from 'vitest';
import type { AddendumEntry, StandardSnapshot } from '../reportPreviewShared';
import {
  ADDENDUM_TEXT_CHUNK_MAX_CHARS,
  ADDENDUM_TEXT_CHUNK_MAX_LINES,
  buildStandardTextPaginationParts,
  splitLongParagraphIntoChunks,
  splitStandardTextForAddendumPagination,
  splitStandardTextParagraphs
} from '../reportPreviewShared';
import {
  buildReferencedStandardNaturalBlocks,
  fragmentHeightKey,
  packReferencedStandardBlocks,
  REFERENCED_STANDARDS_PACK_SAFETY_MARGIN_PX,
  splitOversizedBlockText,
  wholeStandardHeightKey,
  type ReferencedStandardBlock
} from '../referencedStandardsPagination';

function para(
  partial: Partial<ReferencedStandardBlock> & { id: string; standardId: string; text: string }
): ReferencedStandardBlock {
  return {
    kind: 'paragraph',
    standardType: 'TAS',
    isStandardStart: true,
    isLastTextInStandard: true,
    isLastTextBeforeImage: false,
    ...partial
  };
}

function pack(args: {
  blocks: ReferencedStandardBlock[];
  remaining: number;
  fresh: number;
  heights: Record<string, number>;
  continuation?: number;
  safety?: number;
  getFragment?: (text: string) => number;
}) {
  return packReferencedStandardBlocks({
    blocks: args.blocks,
    firstPageRemainingHeight: args.remaining,
    subsequentPageHeight: args.fresh,
    measuredHeights: args.heights,
    continuationOverhead: args.continuation ?? 20,
    safetyMargin: args.safety ?? REFERENCED_STANDARDS_PACK_SAFETY_MARGIN_PX,
    getMeasuredFragmentHeight: args.getFragment
      ? ({ text }) => args.getFragment!(text)
      : undefined
  });
}

function pageTexts(pages: ReturnType<typeof pack>): string[][] {
  return pages.map((page) =>
    page.filter((i) => i.kind === 'paragraph' || i.kind === 'typeHeading').map((i) => i.text)
  );
}

describe('legacy 14-line / 1800 helpers (fallback)', () => {
  it('splitStandardTextParagraphs splits on blank lines only', () => {
    expect(splitStandardTextParagraphs('A\nB')).toEqual(['A\nB']);
    expect(splitStandardTextParagraphs('A\n\nB')).toEqual(['A', 'B']);
  });

  it('splitLongParagraphIntoChunks uses 14 source lines', () => {
    const lines = Array.from({ length: 20 }, (_, i) => `L${i + 1}`);
    const chunks = splitLongParagraphIntoChunks(lines.join('\n'));
    expect(ADDENDUM_TEXT_CHUNK_MAX_LINES).toBe(14);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]!.split('\n')).toHaveLength(14);
    expect(chunks[1]!.split('\n')).toHaveLength(6);
  });

  it('splitLongParagraphIntoChunks uses 1800 chars when there are no newlines', () => {
    const text = `${'a'.repeat(1200)} ${'b'.repeat(800)}`;
    const chunks = splitLongParagraphIntoChunks(text);
    expect(ADDENDUM_TEXT_CHUNK_MAX_CHARS).toBe(1800);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join(' ').replace(/\s+/g, ' ').trim().startsWith('a')).toBe(true);
  });

  it('buildStandardTextPaginationParts marks first/last', () => {
    const parts = buildStandardTextPaginationParts('s1', 'P1\n\nP2');
    expect(parts).toHaveLength(2);
    expect(parts[0]!.isFirst).toBe(true);
    expect(parts[1]!.isLastInStandard).toBe(true);
    expect(splitStandardTextForAddendumPagination('P1\n\nP2')).toEqual(['P1', 'P2']);
  });
});

describe('buildReferencedStandardNaturalBlocks', () => {
  it('uses blank-line paragraphs and does not 14-line pre-split', () => {
    const snap: StandardSnapshot = {
      fldStandardType: 'TAS',
      fldStandardVersion: '',
      fldCitationNum: '100',
      fldCitationName: 'Name',
      fldContentText: Array.from({ length: 20 }, (_, i) => `L${i}`).join('\n'),
      fldStandardId: 'std-1'
    };
    const entries: AddendumEntry[] = [
      { kind: 'header', standardType: 'TAS', key: '__addendum_header__TAS' },
      { kind: 'standard', standard: snap }
    ];
    const blocks = buildReferencedStandardNaturalBlocks(entries);
    expect(blocks.map((b) => b.kind)).toEqual(['typeHeading', 'paragraph']);
    expect(blocks[1]!.text.split('\n')).toHaveLength(20);
  });
});

describe('splitOversizedBlockText', () => {
  it('prefers newline/clause splits and does not split mid-word', () => {
    const text = 'alpha beta\ngamma delta\nepsilon';
    const getHeight = (fragment: string) => fragment.split('\n').length * 100;
    const frags = splitOversizedBlockText(text, 150, getHeight, 0);
    expect(frags[0]).toBe('alpha beta');
    expect(frags.join('\n')).toBe(text);
    expect(frags.every((f) => !f.endsWith('alp'))).toBe(true);
  });
});

describe('packReferencedStandardBlocks', () => {
  it('A: remaining=500, standard=400 → stays on current page', () => {
    const blocks = [para({ id: 's1p0', standardId: 's1', text: 'Rule 68.104' })];
    const pages = pack({
      blocks,
      remaining: 500,
      fresh: 650,
      heights: { s1p0: 400, [wholeStandardHeightKey('s1')]: 400 }
    });
    expect(pages).toHaveLength(1);
    expect(pages[0]![0]!.showContinuation).toBe(false);
    expect(pages[0]![0]!.text).toBe('Rule 68.104');
  });

  it('B: remaining=150, standard=500, fresh=650 → whole standard next page', () => {
    const blocks = [
      para({ id: 'a0', standardId: 'a', text: 'Filler', isStandardStart: true, isLastTextInStandard: true }),
      para({ id: 'b0', standardId: 'b', text: 'Long', isStandardStart: true, isLastTextInStandard: true })
    ];
    const pages = pack({
      blocks,
      remaining: 500,
      fresh: 650,
      heights: {
        a0: 350,
        [wholeStandardHeightKey('a')]: 350,
        b0: 500,
        [wholeStandardHeightKey('b')]: 500
      }
    });
    expect(pageTexts(pages)).toEqual([['Filler'], ['Long']]);
    expect(pages[1]![0]!.showContinuation).toBe(false);
  });

  it('C: blocks 250+250+250, fresh=600 → first two together, third next', () => {
    const blocks = [
      para({
        id: 's1p0',
        standardId: 's1',
        text: 'P1',
        isStandardStart: true,
        isLastTextInStandard: false
      }),
      para({
        id: 's1p1',
        standardId: 's1',
        text: 'P2',
        isStandardStart: false,
        isLastTextInStandard: false
      }),
      para({
        id: 's1p2',
        standardId: 's1',
        text: 'P3',
        isStandardStart: false,
        isLastTextInStandard: true
      })
    ];
    const pages = pack({
      blocks,
      remaining: 600,
      fresh: 600,
      heights: {
        s1p0: 250,
        s1p1: 250,
        's1p1::body': 250,
        s1p2: 250,
        's1p2::body': 250,
        [wholeStandardHeightKey('s1')]: 750
      }
    });
    expect(pageTexts(pages)).toEqual([['P1', 'P2'], ['P3']]);
  });

  it('D: remaining=300, blocks 250+40 stay when whole+margin fits (screenshot class)', () => {
    const blocks = [
      para({
        id: 's1p0',
        standardId: 's1',
        text: 'Most of the rule',
        isStandardStart: true,
        isLastTextInStandard: false
      }),
      para({
        id: 's1p1',
        standardId: 's1',
        text: 'Tiny leftover',
        isStandardStart: false,
        isLastTextInStandard: true
      })
    ];
    const pages = pack({
      blocks,
      remaining: 300,
      fresh: 650,
      heights: {
        s1p0: 250,
        s1p1: 80,
        's1p1::body': 80,
        [wholeStandardHeightKey('s1')]: 280
      }
    });
    expect(pages).toHaveLength(1);
    expect(pageTexts(pages)).toEqual([['Most of the rule', 'Tiny leftover']]);
    expect(pages[0]!.some((i) => i.showContinuation)).toBe(false);
  });

  it('E: single block taller than a page splits into measured fragments', () => {
    const text = 'AAAA\nBBBB\nCCCC\nDDDD';
    const blocks = [para({ id: 'tall', standardId: 's1', text })];
    const pages = pack({
      blocks,
      remaining: 600,
      fresh: 600,
      heights: { tall: 800, [wholeStandardHeightKey('s1')]: 800 },
      getFragment: (fragment) => fragment.split('\n').filter(Boolean).length * 200
    });
    const texts = pages.flatMap((p) => p.map((i) => i.text));
    expect(texts.join('\n')).toBe(text);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.every((p) => p.some((i) => String(i.text).trim()))).toBe(true);
  });

  it('F: continuation overhead is included in the continuation-page budget', () => {
    const blocks = [
      para({
        id: 's1p0',
        standardId: 's1',
        text: 'First',
        isStandardStart: true,
        isLastTextInStandard: false
      }),
      para({
        id: 's1p1',
        standardId: 's1',
        text: 'Second',
        isStandardStart: false,
        isLastTextInStandard: true
      })
    ];
    const pages = pack({
      blocks,
      remaining: 500,
      fresh: 500,
      continuation: 40,
      heights: {
        s1p0: 480,
        s1p1: 480,
        's1p1::body': 480,
        [wholeStandardHeightKey('s1')]: 960
      }
    });
    expect(pages.length).toBeGreaterThan(1);
    const contPage = pages.find((p) => p.some((i) => i.showContinuation));
    expect(contPage).toBeTruthy();
    expect(contPage!.some((i) => i.kind === 'paragraph' && String(i.text).trim())).toBe(true);
  });

  it('G: exact-boundary safety never intentionally exceeds the budget', () => {
    const filler = para({ id: 'a0', standardId: 'a', text: 'A' });
    const edge = para({ id: 'b0', standardId: 'b', text: 'B' });
    const pages = pack({
      blocks: [filler, edge],
      remaining: 400,
      fresh: 400,
      safety: 8,
      heights: {
        a0: 100,
        [wholeStandardHeightKey('a')]: 100,
        b0: 300,
        [wholeStandardHeightKey('b')]: 300
      }
    });
    expect(pageTexts(pages)[0]).toEqual(['A']);
    expect(pageTexts(pages)[1]).toEqual(['B']);

    const exact = pack({
      blocks: [para({ id: 'c0', standardId: 'c', text: 'C' })],
      remaining: 400,
      fresh: 400,
      safety: 8,
      heights: { c0: 392, [wholeStandardHeightKey('c')]: 392 }
    });
    expect(exact).toHaveLength(1);

    const tooBig = pack({
      blocks: [para({ id: 'd0', standardId: 'd', text: 'D' }), para({ id: 'e0', standardId: 'e', text: 'E' })],
      remaining: 400,
      fresh: 400,
      safety: 8,
      heights: {
        d0: 50,
        [wholeStandardHeightKey('d')]: 50,
        e0: 393,
        [wholeStandardHeightKey('e')]: 393
      }
    });
    expect(pageTexts(tooBig)[0]).toEqual(['D']);
    expect(pageTexts(tooBig)[1]).toEqual(['E']);
  });

  it('does not leave a type heading without following content', () => {
    const heading: ReferencedStandardBlock = {
      id: 'h-tas',
      kind: 'typeHeading',
      standardId: 's1',
      standardType: 'TAS',
      text: 'TAS',
      isStandardStart: false,
      isLastTextInStandard: false,
      isLastTextBeforeImage: false
    };
    const filler = para({
      id: 'a0',
      standardId: 'a',
      text: 'Filler',
      isStandardStart: true,
      isLastTextInStandard: true
    });
    const body = para({
      id: 's1p0',
      standardId: 's1',
      text: 'Citation body',
      isStandardStart: true,
      isLastTextInStandard: true
    });
    const pages = pack({
      blocks: [filler, heading, body],
      remaining: 500,
      fresh: 650,
      heights: {
        a0: 450,
        [wholeStandardHeightKey('a')]: 450,
        'h-tas': 40,
        s1p0: 500,
        [wholeStandardHeightKey('s1')]: 500
      }
    });
    const headingPage = pages.find((p) => p.some((i) => i.kind === 'typeHeading'));
    expect(headingPage).toBeTruthy();
    expect(headingPage!.some((i) => i.text === 'Filler')).toBe(false);
    expect(headingPage!.some((i) => i.kind === 'paragraph' && String(i.text).trim())).toBe(true);
  });

  it('pulls a trailing fragment back when measured body fits the prior page', () => {
    const blocks = [
      para({
        id: 's1p0',
        standardId: 's1',
        text: 'Most of the rule',
        isStandardStart: true,
        isLastTextInStandard: false
      }),
      para({
        id: 's1p1',
        standardId: 's1',
        text: 'Tiny leftover',
        isStandardStart: false,
        isLastTextInStandard: true
      })
    ];
    const pages = pack({
      blocks,
      remaining: 300,
      fresh: 650,
      continuation: 20,
      heights: {
        s1p0: 250,
        s1p1: 90,
        's1p1::body': 40,
        [wholeStandardHeightKey('s1')]: 320
      }
    });
    expect(pages).toHaveLength(1);
    expect(pageTexts(pages)).toEqual([['Most of the rule', 'Tiny leftover']]);
    expect(pages[0]!.some((i) => i.showContinuation)).toBe(false);
  });

  it('falls back to legacy 14-line split when measurement is missing or zero', () => {
    const lines = Array.from({ length: 20 }, (_, i) => `Line ${i + 1}`).join('\n');
    const blocks = [para({ id: 'missing', standardId: 's1', text: lines })];
    const pages = pack({
      blocks,
      remaining: 660,
      fresh: 660,
      heights: {}
    });
    expect(pages.length).toBeGreaterThanOrEqual(1);
    const packedText = pages
      .flatMap((p) => p.filter((i) => i.kind === 'paragraph').map((i) => i.text))
      .join('\n');
    expect(packedText).toContain('Line 1');
    expect(packedText).toContain('Line 20');
    expect(pages.some((p) => p.some((i) => i.blockId.includes('__legacy')))).toBe(true);
  });
});

describe('fragmentHeightKey', () => {
  it('is stable for lookups', () => {
    expect(fragmentHeightKey('p1', 'Hello', 'body')).toBe('p1::body::Hello');
  });
});
