/**
 * Pure Referenced Standards PDF packer.
 * Accepts injected measured heights; does not touch the DOM.
 * DOM measurement stays in ReportPreview.
 */
import {
  splitStandardTextForAddendumPagination,
  splitStandardTextParagraphs,
  type AddendumEntry
} from './reportPreviewShared';

/**
 * Subsequent-page body budget. ~36px under the 696px PageContainer inner box
 * (816 page − 48pt − 72pb). Unchanged from the prior addendum constant.
 *
 * First-page content budget is this value minus the measured profile-specific
 * section title (single subtraction). Prior engine used 595 − title − 8, which
 * double-counted title space (595 already reserved ~65px).
 */
export const REFERENCED_STANDARDS_SUBSEQUENT_PAGE_BODY_PX = 660;

/**
 * Modest fit-check safety (px). Applied when comparing measured height to remaining budget.
 * Replaces per-unit +18px slack and the extra first-page fudge, not the 660-vs-696 page slack.
 */
export const REFERENCED_STANDARDS_PACK_SAFETY_MARGIN_PX = 8;

/** Conservative extra added only when falling back to 14-line / 1800 estimates. */
const LEGACY_FALLBACK_SLACK_PX = 18;
const LEGACY_IMAGE_FALLBACK_PX = 236;
const MIN_MEANINGFUL_BODY_PX = 12;

export type ReferencedStandardBlockKind = 'typeHeading' | 'paragraph' | 'image';

export type FragmentChrome = 'start' | 'continuation' | 'body';

export type ReferencedStandardBlock = {
  id: string;
  kind: ReferencedStandardBlockKind;
  standardId: string;
  standardType: string;
  text: string;
  isStandardStart: boolean;
  isLastTextInStandard: boolean;
  isLastTextBeforeImage: boolean;
};

export type PackedStandardsItem = {
  blockId: string;
  kind: ReferencedStandardBlockKind;
  standardId: string;
  standardType: string;
  text: string;
  showContinuation: boolean;
  isFirstOfStandard: boolean;
  isLastTextInStandard: boolean;
  isLastTextBeforeImage: boolean;
};

export type PackedStandardsPage = PackedStandardsItem[];

export type GetMeasuredFragmentHeight = (args: {
  blockId: string;
  text: string;
  chrome: FragmentChrome;
}) => number | undefined;

export type PackReferencedStandardBlocksInput = {
  blocks: ReferencedStandardBlock[];
  firstPageRemainingHeight: number;
  subsequentPageHeight: number;
  measuredHeights: Readonly<Record<string, number>>;
  continuationOverhead: number;
  safetyMargin: number;
  fragmentHeights?: Readonly<Record<string, number>>;
  getMeasuredFragmentHeight?: GetMeasuredFragmentHeight;
  /** Figure continuation line when an image starts a page without its text. */
  imageContinuationOverhead?: number;
};

export function wholeStandardHeightKey(standardId: string): string {
  return `whole:${standardId}`;
}

export function fragmentHeightKey(blockId: string, text: string, chrome: FragmentChrome): string {
  return `${blockId}::${chrome}::${text}`;
}

export function isValidMeasuredHeight(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function estimateLegacyAddendumTextHeight(text: string, isFirst: boolean): number {
  const lines = Math.max(1, String(text ?? '').split('\n').length);
  const chrome = isFirst ? 40 : 8;
  return chrome + lines * 15;
}

/** Natural blocks: blank-line paragraphs only (no 14-line / 1800 pre-split). */
export function buildReferencedStandardNaturalBlocks(entries: AddendumEntry[]): ReferencedStandardBlock[] {
  const out: ReferencedStandardBlock[] = [];
  let pendingHeading: ReferencedStandardBlock | null = null;

  for (const entry of entries) {
    if (entry.kind === 'header') {
      const heading: ReferencedStandardBlock = {
        id: entry.key,
        kind: 'typeHeading',
        standardId: '',
        standardType: entry.standardType,
        text: entry.standardType,
        isStandardStart: false,
        isLastTextInStandard: false,
        isLastTextBeforeImage: false
      };
      out.push(heading);
      pendingHeading = heading;
      continue;
    }

    const s = entry.standard;
    const standardId = s.fldStandardId;
    const standardType = s.fldStandardType || 'Unknown';
    if (pendingHeading && !pendingHeading.standardId) {
      pendingHeading.standardId = standardId;
      pendingHeading = null;
    }

    const paragraphs = splitStandardTextParagraphs(s.fldContentText);
    const parts = paragraphs.length > 0 ? paragraphs : [''];
    const img = s.fldImageUrl && String(s.fldImageUrl).trim();

    parts.forEach((text, idx) => {
      out.push({
        id: `${standardId}::__p${idx}`,
        kind: 'paragraph',
        standardId,
        standardType,
        text,
        isStandardStart: idx === 0,
        isLastTextInStandard: idx === parts.length - 1,
        isLastTextBeforeImage: Boolean(img) && idx === parts.length - 1
      });
    });

    if (img) {
      out.push({
        id: `${standardId}::__img`,
        kind: 'image',
        standardId,
        standardType,
        text: '',
        isStandardStart: false,
        isLastTextInStandard: false,
        isLastTextBeforeImage: false
      });
    }
  }

  return out;
}

function lookupHeight(map: Readonly<Record<string, number>> | undefined, key: string): number {
  if (!map) return 0;
  const h = map[key];
  return isValidMeasuredHeight(h) ? h : 0;
}

function snapEndToWordBoundary(text: string, end: number): number {
  if (end <= 0) return 0;
  if (end >= text.length) return text.length;
  if (/\s/.test(text[end]!) || /\s/.test(text[end - 1]!)) return end;
  const prevSpace = text.lastIndexOf(' ', end);
  const prevNl = text.lastIndexOf('\n', end);
  const prev = Math.max(prevSpace, prevNl);
  return prev > 0 ? prev : end;
}

function preferPunctuationOrNewline(text: string, end: number): number {
  if (end <= 0 || end >= text.length) return end;
  const windowStart = Math.max(0, end - 48);
  const slice = text.slice(windowStart, end);
  let best = -1;
  for (let i = slice.length - 1; i >= 0; i--) {
    const ch = slice[i];
    if (ch === '\n' || ch === '.' || ch === ';' || ch === ':') {
      best = windowStart + i + 1;
      break;
    }
  }
  if (best > windowStart + 8) return best;
  return end;
}

function largestFittingPrefix(text: string, fits: (candidate: string) => boolean): string {
  if (!text) return '';
  if (fits(text)) return text;

  const bounds: number[] = [];
  const re = /\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    bounds.push(m.index);
  }
  bounds.push(text.length);

  let lo = 0;
  let hi = bounds.length - 1;
  let bestEnd = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    let end = snapEndToWordBoundary(text, bounds[mid]!);
    end = preferPunctuationOrNewline(text, end);
    const candidate = text.slice(0, end).trimEnd();
    if (candidate && fits(candidate)) {
      bestEnd = end;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (bestEnd <= 0) return '';
  return text.slice(0, bestEnd).trimEnd();
}

function firstUnbreakableToken(text: string): string {
  const trimmed = text.trimStart();
  const nl = trimmed.indexOf('\n');
  const sp = trimmed.search(/\s/);
  let end = trimmed.length;
  if (nl >= 0) end = Math.min(end, nl);
  if (sp >= 0) end = Math.min(end, sp);
  if (end <= 0) return trimmed.slice(0, 1) || trimmed;
  return trimmed.slice(0, end);
}

/**
 * Split one oversized text block. Newline/clause first, then word-boundary binary search.
 * Never splits mid-word. Prefers punctuation/newline endings.
 */
export function splitOversizedBlockText(
  text: string,
  fitHeight: number,
  getHeight: (fragment: string) => number,
  safetyMargin: number = 0
): string[] {
  const normalized = String(text ?? '');
  if (!normalized) return [];

  const fits = (candidate: string): boolean => {
    if (!candidate) return false;
    const h = getHeight(candidate);
    if (!isValidMeasuredHeight(h)) return false;
    return h + safetyMargin <= fitHeight;
  };

  if (fits(normalized)) return [normalized];
  if (!isValidMeasuredHeight(getHeight(normalized))) return [normalized];

  const fragments: string[] = [];
  let rest = normalized;
  let guard = 0;
  const maxFrags = Math.max(8, normalized.length);

  while (rest.length > 0 && guard++ < maxFrags) {
    if (fits(rest)) {
      fragments.push(rest);
      break;
    }

    const lines = rest.split('\n');
    if (lines.length > 1) {
      let bestK = 0;
      for (let k = 1; k < lines.length; k++) {
        const candidate = lines.slice(0, k).join('\n');
        if (fits(candidate)) bestK = k;
        else break;
      }
      if (bestK > 0) {
        fragments.push(lines.slice(0, bestK).join('\n'));
        rest = lines.slice(bestK).join('\n');
        continue;
      }
    }

    const prefix = largestFittingPrefix(rest, fits);
    if (prefix) {
      fragments.push(prefix);
      rest = rest.slice(prefix.length).replace(/^\s+/, '');
      continue;
    }

    const token = firstUnbreakableToken(rest);
    fragments.push(token);
    rest = rest.slice(token.length).replace(/^\s+/, '');
  }

  return fragments.length > 0 ? fragments : [normalized];
}

type StandardGroup = {
  heading?: ReferencedStandardBlock;
  standardId: string;
  standardType: string;
  blocks: ReferencedStandardBlock[];
};

type PageState = { items: PackedStandardsItem[]; used: number };

function groupBlocks(blocks: ReferencedStandardBlock[]): StandardGroup[] {
  const groups: StandardGroup[] = [];
  let pendingHeading: ReferencedStandardBlock | undefined;
  let current: StandardGroup | null = null;

  for (const block of blocks) {
    if (block.kind === 'typeHeading') {
      if (current) {
        groups.push(current);
        current = null;
      }
      pendingHeading = block;
      continue;
    }
    if (!current || current.standardId !== block.standardId) {
      if (current) groups.push(current);
      current = {
        heading: pendingHeading,
        standardId: block.standardId,
        standardType: block.standardType,
        blocks: [block]
      };
      pendingHeading = undefined;
    } else {
      current.blocks.push(block);
    }
  }
  if (current) groups.push(current);
  return groups;
}

function makeItem(
  block: ReferencedStandardBlock,
  text: string,
  flags: {
    showContinuation: boolean;
    isFirstOfStandard: boolean;
    isLastTextInStandard: boolean;
    isLastTextBeforeImage: boolean;
  }
): PackedStandardsItem {
  return {
    blockId: block.id,
    kind: block.kind,
    standardId: block.standardId,
    standardType: block.standardType,
    text,
    showContinuation: flags.showContinuation,
    isFirstOfStandard: flags.isFirstOfStandard,
    isLastTextInStandard: flags.isLastTextInStandard,
    isLastTextBeforeImage: flags.isLastTextBeforeImage
  };
}

function pageHasMeaningfulBody(page: PackedStandardsItem[]): boolean {
  return page.some(
    (item) => item.kind === 'image' || (item.kind === 'paragraph' && String(item.text ?? '').trim().length > 0)
  );
}

export function packReferencedStandardBlocks(
  input: PackReferencedStandardBlocksInput
): PackedStandardsPage[] {
  const {
    blocks,
    firstPageRemainingHeight,
    subsequentPageHeight,
    continuationOverhead,
    safetyMargin,
    fragmentHeights,
    getMeasuredFragmentHeight,
    imageContinuationOverhead = 0
  } = input;

  const measuredHeights: Record<string, number> = { ...input.measuredHeights };
  const safety = Math.max(0, safetyMargin);
  const firstBudget = Math.max(0, firstPageRemainingHeight);
  const nextBudget = Math.max(0, subsequentPageHeight);
  const maxPages = Math.max(8, blocks.length * 12 + 4);

  const heightOfBlock = (block: ReferencedStandardBlock, variant: 'default' | 'body' = 'default'): number => {
    if (variant === 'body') {
      const body = lookupHeight(measuredHeights, `${block.id}::body`);
      if (body) return body;
    }
    return lookupHeight(measuredHeights, block.id);
  };

  const fragmentH = (blockId: string, text: string, chrome: FragmentChrome): number => {
    if (getMeasuredFragmentHeight) {
      const h = getMeasuredFragmentHeight({ blockId, text, chrome });
      if (isValidMeasuredHeight(h)) return h;
    }
    return lookupHeight(fragmentHeights, fragmentHeightKey(blockId, text, chrome));
  };

  const wholeHeight = (group: StandardGroup): number => {
    const headingH = group.heading ? heightOfBlock(group.heading) : 0;
    const whole = lookupHeight(measuredHeights, wholeStandardHeightKey(group.standardId));
    if (whole) return headingH + whole;
    let sum = headingH;
    for (const block of group.blocks) {
      const h = heightOfBlock(block);
      if (!h) return 0;
      sum += h;
    }
    return sum;
  };

  const groupMeasurementValid = (group: StandardGroup): boolean => {
    if (group.heading && !heightOfBlock(group.heading)) return false;
    return group.blocks.every(
      (block) =>
        heightOfBlock(block) > 0 || (block.kind === 'paragraph' && !String(block.text ?? '').trim())
    );
  };

  const paragraphPieceHeight = (
    block: ReferencedStandardBlock,
    text: string,
    chrome: FragmentChrome
  ): number => {
    if (chrome === 'continuation') {
      const body = paragraphPieceHeight(block, text, 'body');
      return body > 0 ? continuationOverhead + body : 0;
    }
    const keyed = fragmentH(block.id, text, chrome);
    if (keyed) return keyed;
    if (chrome === 'start' && text === block.text) return heightOfBlock(block);
    if (chrome === 'body') {
      if (text === block.text) return heightOfBlock(block, 'body') || heightOfBlock(block);
      return fragmentH(block.id, text, 'body');
    }
    return 0;
  };

  const imageHeight = (block: ReferencedStandardBlock, orphan: boolean): number => {
    const h = heightOfBlock(block);
    return orphan ? h + imageContinuationOverhead : h;
  };

  const budgetFor = (pageIndex: number) => (pageIndex === 0 ? firstBudget : nextBudget);

  const canPack = (height: number, remaining: number, pageEmpty: boolean): boolean => {
    if (height <= 0) return false;
    if (height > remaining) return false;
    if (height + safety <= remaining) return true;
    return pageEmpty;
  };

  const pages: PageState[] = [];
  let current: PageState = { items: [], used: 0 };
  let loopGuard = 0;

  const pageIndex = () => pages.length;
  const remaining = () => budgetFor(pageIndex()) - current.used;
  const isEmpty = () => current.items.length === 0;

  const flush = () => {
    if (current.items.length === 0) return;
    if (!pageHasMeaningfulBody(current.items)) return;
    if (pages.length >= maxPages) return;
    pages.push(current);
    current = { items: [], used: 0 };
  };

  const place = (item: PackedStandardsItem, height: number) => {
    current.items.push(item);
    current.used += Math.max(0, height);
  };

  const expandGroupForLegacy = (group: StandardGroup): StandardGroup => {
    const paragraphs = group.blocks.filter((b) => b.kind === 'paragraph');
    const images = group.blocks.filter((b) => b.kind === 'image');
    const joined = paragraphs.map((p) => p.text).join('\n\n');
    const chunks = splitStandardTextForAddendumPagination(joined);
    const parts = chunks.length > 0 ? chunks : paragraphs.length > 0 ? paragraphs.map((p) => p.text) : [''];
    const newBlocks: ReferencedStandardBlock[] = parts.map((text, idx) => ({
      id: `${group.standardId}::__legacy${idx}`,
      kind: 'paragraph' as const,
      standardId: group.standardId,
      standardType: group.standardType,
      text,
      isStandardStart: idx === 0,
      isLastTextInStandard: idx === parts.length - 1,
      isLastTextBeforeImage: images.length > 0 && idx === parts.length - 1
    }));
    newBlocks.forEach((block, idx) => {
      measuredHeights[block.id] = estimateLegacyAddendumTextHeight(block.text, idx === 0) + LEGACY_FALLBACK_SLACK_PX;
    });
    images.forEach((img) => {
      if (!heightOfBlock(img)) measuredHeights[img.id] = LEGACY_IMAGE_FALLBACK_PX;
      newBlocks.push(img);
    });
    return { ...group, blocks: newBlocks };
  };

  const resolveChrome = (block: ReferencedStandardBlock, standardStarted: boolean): FragmentChrome => {
    if (!standardStarted && block.isStandardStart) return 'start';
    if (standardStarted && isEmpty()) return 'continuation';
    if (standardStarted) return 'body';
    return 'start';
  };

  const splitParagraph = (block: ReferencedStandardBlock, fitHeight: number): string[] => {
    const getH = (fragment: string) => {
      const body = paragraphPieceHeight(block, fragment, 'body');
      if (body) return body;
      const start = paragraphPieceHeight(block, fragment, 'start');
      if (start) return start;
      if (getMeasuredFragmentHeight) {
        return (
          getMeasuredFragmentHeight({ blockId: block.id, text: fragment, chrome: 'body' }) ??
          getMeasuredFragmentHeight({ blockId: block.id, text: fragment, chrome: 'start' }) ??
          0
        );
      }
      return 0;
    };
    return splitOversizedBlockText(block.text, fitHeight, getH, safety);
  };

  const emitHeading = (heading: ReferencedStandardBlock, firstContentH: number) => {
    const headH = heightOfBlock(heading);
    const pair = headH + Math.max(firstContentH, MIN_MEANINGFUL_BODY_PX);
    if (!isEmpty() && !canPack(pair, remaining(), false)) flush();
    if (!isEmpty() && !canPack(headH + MIN_MEANINGFUL_BODY_PX, remaining(), false)) flush();
    place(
      makeItem(heading, heading.text, {
        showContinuation: false,
        isFirstOfStandard: false,
        isLastTextInStandard: false,
        isLastTextBeforeImage: false
      }),
      headH
    );
  };

  const emitPiece = (
    block: ReferencedStandardBlock,
    text: string,
    flags: {
      isLastTextInStandard: boolean;
      isLastTextBeforeImage: boolean;
    },
    startedRef: { value: boolean }
  ): void => {
    if (++loopGuard > maxPages * 16) return;

    const chrome = resolveChrome(block, startedRef.value);
    const showContinuation = chrome === 'continuation';
    const isFirstOfStandard = chrome === 'start' && block.isStandardStart;
    const item = makeItem(block, text, {
      showContinuation,
      isFirstOfStandard,
      isLastTextInStandard: flags.isLastTextInStandard,
      isLastTextBeforeImage: flags.isLastTextBeforeImage
    });

    let h =
      block.kind === 'image'
        ? imageHeight(
            block,
            isEmpty() ||
              current.items[current.items.length - 1]?.kind !== 'paragraph' ||
              current.items[current.items.length - 1]?.standardId !== block.standardId
          )
        : paragraphPieceHeight(block, text, chrome);

    if (!h && block.kind === 'paragraph') {
      h = paragraphPieceHeight(block, text, 'body');
      if (!h && text === block.text) h = heightOfBlock(block);
      if (showContinuation && h) h += continuationOverhead;
    }

    if (showContinuation && String(text).trim() === '') return;

    if (showContinuation && isEmpty() && continuationOverhead + MIN_MEANINGFUL_BODY_PX > remaining() && pages.length > 0) {
      current.used = 0;
    }

    const headingOnlyPage = !isEmpty() && current.items.every((i) => i.kind === 'typeHeading');

    if (!canPack(h, remaining(), isEmpty()) && !isEmpty() && !headingOnlyPage) {
      flush();
      return emitPiece(block, text, flags, startedRef);
    }

    if (!canPack(h, remaining(), isEmpty()) && block.kind === 'paragraph') {
      const fit = Math.max(1, remaining() - (showContinuation ? continuationOverhead : 0));
      const frags = splitParagraph({ ...block, text }, fit);
      const splitHappened = frags.length > 1 || (frags[0] != null && frags[0] !== text);
      if (splitHappened) {
        frags.forEach((frag, idx) => {
          if (idx > 0 && !isEmpty()) flush();
          emitPiece(block, frag, {
            isLastTextInStandard: flags.isLastTextInStandard && idx === frags.length - 1,
            isLastTextBeforeImage: flags.isLastTextBeforeImage && idx === frags.length - 1
          }, startedRef);
        });
        return;
      }
      const legacyParts = splitStandardTextForAddendumPagination(text);
      if (legacyParts.length > 1) {
        legacyParts.forEach((frag, idx) => {
          if (idx > 0 && !isEmpty()) flush();
          emitPiece(block, frag, {
            isLastTextInStandard: flags.isLastTextInStandard && idx === legacyParts.length - 1,
            isLastTextBeforeImage: flags.isLastTextBeforeImage && idx === legacyParts.length - 1
          }, startedRef);
        });
        return;
      }
    }

    if (!canPack(h, remaining(), isEmpty()) && !isEmpty()) {
      const lenBefore = current.items.length;
      const usedBefore = current.used;
      flush();
      if (current.items.length === lenBefore && current.used === usedBefore) {
        place(item, h);
        if (block.kind === 'paragraph') startedRef.value = true;
        return;
      }
      return emitPiece(block, text, flags, startedRef);
    }

    place(item, h);
    if (block.kind === 'paragraph') startedRef.value = true;
  };

  const placeWholeGroup = (group: StandardGroup, whole: number) => {
    const usedBefore = current.used;
    if (group.heading) {
      current.items.push(
        makeItem(group.heading, group.heading.text, {
          showContinuation: false,
          isFirstOfStandard: false,
          isLastTextInStandard: false,
          isLastTextBeforeImage: false
        })
      );
    }
    for (const block of group.blocks) {
      current.items.push(
        makeItem(block, block.text, {
          showContinuation: false,
          isFirstOfStandard: block.kind === 'paragraph' && block.isStandardStart,
          isLastTextInStandard: block.isLastTextInStandard,
          isLastTextBeforeImage: block.isLastTextBeforeImage
        })
      );
    }
    current.used = usedBefore + whole;
  };

  const packGroup = (group: StandardGroup) => {
    const working = groupMeasurementValid(group) ? group : expandGroupForLegacy(group);
    const whole = wholeHeight(working);

    if (whole > 0 && canPack(whole, remaining(), isEmpty())) {
      placeWholeGroup(working, whole);
      return;
    }

    if (!isEmpty() && whole > 0 && canPack(whole, nextBudget, true)) {
      flush();
      placeWholeGroup(working, whole);
      return;
    }

    const started = { value: false };
    const first = working.blocks[0];
    const firstH = first
      ? first.kind === 'image'
        ? imageHeight(first, false)
        : paragraphPieceHeight(first, first.text, 'start') || heightOfBlock(first)
      : 0;

    if (working.heading) emitHeading(working.heading, firstH);

    for (let i = 0; i < working.blocks.length; i++) {
      if (pages.length >= maxPages) break;
      const block = working.blocks[i]!;
      const next = working.blocks[i + 1];
      const pairedImage =
        block.kind === 'paragraph' &&
        block.isLastTextBeforeImage &&
        next?.kind === 'image' &&
        next.standardId === block.standardId
          ? next
          : undefined;

      if (pairedImage) {
        const chrome = resolveChrome(block, started.value);
        const textH = paragraphPieceHeight(block, block.text, chrome) || heightOfBlock(block);
        const imgH = imageHeight(pairedImage, false);
        const pairH = textH + imgH;
        if (!isEmpty() && !canPack(pairH, remaining(), false) && canPack(pairH, nextBudget, true)) {
          flush();
        }
        if (canPack(pairH, remaining(), isEmpty())) {
          emitPiece(block, block.text, {
            isLastTextInStandard: block.isLastTextInStandard,
            isLastTextBeforeImage: true
          }, started);
          emitPiece(pairedImage, '', {
            isLastTextInStandard: false,
            isLastTextBeforeImage: false
          }, started);
          i += 1;
          continue;
        }
      }

      if (block.kind === 'paragraph') {
        const chrome = resolveChrome(block, started.value);
        const h = paragraphPieceHeight(block, block.text, chrome) || heightOfBlock(block);
        if (!canPack(h, remaining(), isEmpty())) {
          if (!isEmpty() && canPack(h, nextBudget, true)) {
            flush();
            emitPiece(block, block.text, {
              isLastTextInStandard: block.isLastTextInStandard,
              isLastTextBeforeImage: block.isLastTextBeforeImage
            }, started);
            continue;
          }
          if (!isEmpty()) flush();
          const fit = Math.max(1, remaining() - (started.value ? continuationOverhead : 0));
          const frags = splitParagraph(block, fit);
          const needFreshSplit =
            frags.length <= 1 && frags[0] === block.text && h > remaining();
          const use = needFreshSplit
            ? splitParagraph(block, Math.max(1, nextBudget - continuationOverhead))
            : frags;
          use.forEach((frag, idx) => {
            if (idx > 0 && !isEmpty() && !canPack(
              paragraphPieceHeight(block, frag, started.value ? 'continuation' : 'body') || 1,
              remaining(),
              false
            )) {
              flush();
            }
            emitPiece(block, frag, {
              isLastTextInStandard: block.isLastTextInStandard && idx === use.length - 1,
              isLastTextBeforeImage: block.isLastTextBeforeImage && idx === use.length - 1
            }, started);
          });
          continue;
        }
      }

      emitPiece(block, block.text, {
        isLastTextInStandard: block.isLastTextInStandard,
        isLastTextBeforeImage: block.isLastTextBeforeImage
      }, started);
    }
  };

  for (const group of groupBlocks(blocks)) {
    if (pages.length >= maxPages) break;
    if (++loopGuard > maxPages * 16) break;
    packGroup(group);
  }

  if (current.items.length > 0 && pageHasMeaningfulBody(current.items)) {
    pages.push(current);
  }

  pullBackTrailingFragments(
    pages,
    (item) => {
      if (item.kind !== 'paragraph') return 0;
      const body =
        fragmentH(item.blockId, item.text, 'body') ||
        lookupHeight(measuredHeights, `${item.blockId}::body`) ||
        lookupHeight(measuredHeights, item.blockId);
      return body;
    },
    budgetFor,
    safety
  );

  return pages
    .map((p) =>
      p.items.filter(
        (item) =>
          !(item.kind === 'paragraph' && item.showContinuation && !String(item.text ?? '').trim())
      )
    )
    .filter((items) => items.length > 0 && pageHasMeaningfulBody(items));
}

function pullBackTrailingFragments(
  pages: PageState[],
  bodyHeightFor: (item: PackedStandardsItem) => number,
  budgetFor: (pageIndex: number) => number,
  safety: number
): void {
  let guard = 0;
  let changed = true;
  while (changed && guard++ < 16) {
    changed = false;
    for (let i = 1; i < pages.length; i++) {
      const prev = pages[i - 1]!;
      const cur = pages[i]!;
      if (!prev.items.length || !cur.items.length) continue;
      const first = cur.items[0]!;
      if (first.kind !== 'paragraph') continue;
      const lastPrev = prev.items[prev.items.length - 1]!;
      if (lastPrev.standardId !== first.standardId) continue;

      const bodyH = bodyHeightFor(first);
      if (!isValidMeasuredHeight(bodyH)) continue;
      const remainingPx = budgetFor(i - 1) - prev.used;
      if (bodyH > remainingPx) continue;
      if (bodyH + safety > remainingPx && prev.items.length > 0 && bodyH !== remainingPx) continue;

      first.showContinuation = false;
      prev.items.push(first);
      prev.used += bodyH;
      cur.items.shift();
      cur.used = Math.max(0, cur.used - bodyH);
      if (cur.items.length === 0) {
        pages.splice(i, 1);
      } else if (cur.items[0]?.kind === 'paragraph' && cur.items[0].standardId === first.standardId) {
        cur.items[0].showContinuation = true;
        cur.items[0].isFirstOfStandard = false;
      }
      changed = true;
      break;
    }
  }
}
