import React, { useMemo, useRef, useState, useLayoutEffect } from 'react';
import metadata from '../../metadata.json';
// @ts-ignore
import ocgLogoNew from '../Assets/ocglogonew.jpg';
import { 
  Project, 
  Client, 
  ProjectData, 
  Inspector, 
  Facility, 
  MasterStandard,
  Glossary,
  Category,
  Item,
  Finding,
  Location,
  Recommendation
} from '../types';
import { cn, formatMeasurement, formatCurrency } from '../lib/utils';
import { compareStandardCitations, formatStandardCitationLabel } from '../lib/standardCitationLabel';
import { Printer, Download, X, ChevronLeft, ChevronRight, FileText, Menu, ExternalLink, FlaskConical, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import {
  buildReferencedAddendumEntries,
  filterReportProjectForPreview,
  resolveFacilityReportNarrative,
  buildReportPdfSuggestedFilename,
  formatGroupedStandardCitations,
  getRecordStandardIds,
  getReportRecordSortKeys,
  compareReportRecordSortKeysLocationFirst,
  buildStandardTextPaginationParts,
  standardTypeKey,
  type AddendumEntry,
  type FinancialTableRow,
  type ReportRecordSortOrder,
  type StandardSnapshot,
  getFinancialLocationGroupPresentation,
  financialRecordCellBorderStyle,
  financialRecordDataCellClassName,
  FINANCIAL_DATA_ROW_CLASS,
  FINANCIAL_TABLE_CLASS,
  FINANCIAL_SUBTOTAL_CELL_CLASS,
  FINANCIAL_SUBTOTAL_BORDER_STYLE,
  FINANCIAL_CATEGORY_HEADER_CELL_CLASS
} from '../lib/reportPreviewShared';
import type { ReportSectionSelection } from './ReportSectionSelectionDialog';

interface ReportPreviewProps {
  project: Project;
  client: Client;
  facility: Facility;
  inspector: Inspector;
  projectData: ProjectData[];
  standards: MasterStandard[];
  glossary: Glossary[];
  categories: Category[];
  items: Item[];
  locations: Location[];
  recommendations: Recommendation[];
  findings: Finding[];
  onClose: () => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  /** When omitted, all sections render (legacy full report). */
  sectionSelection?: ReportSectionSelection;
}

// Helper functions for pagination
const toRoman = (num: number, uppercase = false) => {
  if (num <= 0) return '';
  const lookup: [string, number][] = [
    ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
    ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
    ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
  ];
  let roman = '';
  let n = num;
  for (const [letter, value] of lookup) {
    while (n >= value) {
      roman += letter;
      n -= value;
    }
  }
  return uppercase ? roman : roman.toLowerCase();
};

/** Referenced Standards addendum: vertical budget for row stacking (content area inside PageContainer). */
const ADDENDUM_SUBSEQUENT_PAGE_BODY_PX = 660;
const ADDENDUM_FIRST_PAGE_BODY_BASE_PX = 595;
/** Buffer after subtracting measured first-page section title. */
const ADDENDUM_FIRST_PAGE_LAYOUT_FUDGE_PX = 8;
/** Slack per entry when summing measured heights (borders / subpixel). */
const ADDENDUM_ROW_PAGINATION_SLACK_PX = 18;
/** Tighter slack for image rows (measured box is more predictable). */
const ADDENDUM_IMAGE_ROW_SLACK_PX = 12;
/** Fallback body padding when `__img` height is missing (image + chrome, not continuation). */
const ADDENDUM_IMAGE_DEFAULT_EXTRA_PX = 36;
/** Fallback if section title probe has not laid out yet. */
const ADDENDUM_SECTION_TITLE_FALLBACK_PX = 104;
/** Standards figure: max height within 180–220px guidance; width capped for predictable pagination. */
const ADDENDUM_STANDARD_IMAGE_MAX_HEIGHT_PX = 200;

/** Pagination/measurement slice: image-bearing standards split into text + image units. */
type AddendumPaginateUnit =
  | { kind: 'header'; key: string; standardType: string }
  | {
      kind: 'standardText';
      standard: StandardSnapshot;
      text: string;
      partKey: string;
      isFirst: boolean;
      isLastInStandard: boolean;
      isLastTextBeforeImage: boolean;
    }
  | { kind: 'standardImage'; standard: StandardSnapshot };

function expandAddendumForPagination(entries: AddendumEntry[]): AddendumPaginateUnit[] {
  const out: AddendumPaginateUnit[] = [];
  for (const e of entries) {
    if (e.kind === 'header') {
      out.push({ kind: 'header', key: e.key, standardType: e.standardType });
      continue;
    }
    const s = e.standard;
    const img = s.fldImageUrl && String(s.fldImageUrl).trim();
    const textParts = buildStandardTextPaginationParts(s.fldStandardId, s.fldContentText);
    textParts.forEach((part, idx) => {
      out.push({
        kind: 'standardText',
        standard: s,
        text: part.text,
        partKey: part.partKey,
        isFirst: part.isFirst,
        isLastInStandard: part.isLastInStandard,
        isLastTextBeforeImage: Boolean(img) && idx === textParts.length - 1
      });
    });
    if (img) out.push({ kind: 'standardImage', standard: s });
  }
  return out;
}

function addendumPaginateMeasureId(unit: AddendumPaginateUnit): string {
  if (unit.kind === 'header') return unit.key;
  if (unit.kind === 'standardText') return unit.partKey;
  return `${unit.standard.fldStandardId}::__img`;
}

function estimateAddendumTextPartHeight(text: string, isFirst: boolean): number {
  const lines = Math.max(1, String(text ?? '').split('\n').length);
  const chrome = isFirst ? 40 : 8;
  return chrome + lines * 15;
}

/** Visible addendum page: heading once per standard; body-only between chunks on the same page. */
function addendumTextPartDisplayFlags(
  units: AddendumPaginateUnit[],
  idx: number
): { showHeading: boolean; showPageContinuation: boolean; continuesOnSamePage: boolean } {
  const unit = units[idx];
  if (!unit || unit.kind !== 'standardText') {
    return { showHeading: false, showPageContinuation: false, continuesOnSamePage: false };
  }
  if (unit.isFirst) {
    return { showHeading: true, showPageContinuation: false, continuesOnSamePage: false };
  }
  const prev = units[idx - 1];
  const continuesOnSamePage =
    prev?.kind === 'standardText' && prev.standard.fldStandardId === unit.standard.fldStandardId;
  return {
    showHeading: false,
    showPageContinuation: !continuesOnSamePage,
    continuesOnSamePage
  };
}

function addendumSnapshotCiteLabels(standard: StandardSnapshot): { citeLabel: string; citeTitle: string } {
  const prefix = standard.fldStandardType || 'Unknown';
  const citeLabel =
    formatStandardCitationLabel({
      id: standard.fldStandardId,
      fldStandardType: standard.fldStandardType,
      citation_num: standard.fldCitationNum,
      relation_type: standard.fldRelationType
    }) ?? `${prefix} ${standard.fldCitationNum}`.trim();
  const citeTitle = `${citeLabel}${standard.fldCitationName ? ` ${standard.fldCitationName}` : ''}`.trim();
  return { citeLabel, citeTitle };
}

function addendumIsTextImagePair(
  u: AddendumPaginateUnit | undefined,
  v: AddendumPaginateUnit | undefined
): boolean {
  if (!u || !v) return false;
  return (
    u.kind === 'standardText' &&
    Boolean(u.standard.fldImageUrl && String(u.standard.fldImageUrl).trim()) &&
    v.kind === 'standardImage' &&
    v.standard.fldStandardId === u.standard.fldStandardId
  );
}

function addendumImageIsOrphanOnPage(page: AddendumPaginateUnit[], idx: number): boolean {
  const unit = page[idx];
  if (!unit || unit.kind !== 'standardImage') return false;
  if (idx === 0) return true;
  const prev = page[idx - 1];
  return !(
    prev.kind === 'standardText' &&
    prev.standard.fldStandardId === unit.standard.fldStandardId
  );
}

function AddendumPaginateRow({
  unit,
  forMeasurement,
  showImageContinuation,
  showHeading,
  showPageContinuation,
  continuesOnSamePage
}: {
  unit: AddendumPaginateUnit;
  forMeasurement?: boolean;
  /** When the figure starts a page without its citation/text block above it. */
  showImageContinuation?: boolean;
  showHeading?: boolean;
  showPageContinuation?: boolean;
  continuesOnSamePage?: boolean;
}) {
  const wrapMeasured = (measureId: string, className: string, children: React.ReactNode) =>
    forMeasurement ? (
      <div data-measure-type="addendum" data-id={measureId} className={className}>
        {children}
      </div>
    ) : (
      <div className={className}>{children}</div>
    );

  if (unit.kind === 'header') {
    return wrapMeasured(
      unit.key,
      'mb-4',
      <h2 className="text-lg font-black text-zinc-900 border-b-2 border-zinc-900 pb-2 tracking-tight">
        {unit.standardType}
      </h2>
    );
  }

  if (unit.kind === 'standardText') {
    const s = unit.standard;
    const { citeLabel, citeTitle } = addendumSnapshotCiteLabels(s);
    const renderHeading = forMeasurement ? unit.isFirst : Boolean(showHeading);
    const renderPageCont = !forMeasurement && Boolean(showPageContinuation);
    const samePageFlow = Boolean(continuesOnSamePage);
    const marginClass = unit.isLastTextBeforeImage
      ? 'mb-2'
      : unit.isLastInStandard
        ? 'mb-6'
        : samePageFlow
          ? 'mb-0'
          : 'mb-3';
    const contLabel = `${citeLabel}${s.fldCitationName ? ` ${s.fldCitationName}` : ''} (cont.)`;
    return wrapMeasured(
      unit.partKey,
      cn(marginClass, samePageFlow && 'mt-2'),
      <div className={cn(renderHeading && 'space-y-2 break-inside-avoid')}>
        {renderHeading ? (
          <h3 className="font-bold text-zinc-900 text-sm" title={citeTitle}>
            {citeLabel}
            {s.fldCitationName ? ` ${s.fldCitationName}` : ''}
          </h3>
        ) : null}
        {renderPageCont ? (
          <p className="mb-1 text-[10px] font-bold uppercase tracking-tight text-zinc-800 leading-tight">
            {contLabel}
          </p>
        ) : null}
        {unit.text ? (
          <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-line">{unit.text}</p>
        ) : null}
      </div>
    );
  }

  const s = unit.standard;
  const { citeLabel, citeTitle } = addendumSnapshotCiteLabels(s);
  const url = s.fldImageUrl && String(s.fldImageUrl).trim();
  if (!url) return null;
  const measureId = `${s.fldStandardId}::__img`;
  const rel = String(s.fldRelationType || '').trim();
  const contLine =
    rel.toLowerCase() === 'figure'
      ? `${citeLabel}${s.fldCitationName ? ` ${s.fldCitationName}` : ''} — Figure`
      : `${citeLabel}${s.fldCitationName ? ` ${s.fldCitationName}` : ''} (continued figure)`;
  return wrapMeasured(
    measureId,
    'mb-6',
    <>
      {showImageContinuation ? (
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-tight text-zinc-800 leading-tight">
          {contLine}
        </p>
      ) : null}
      <div className="flex justify-center">
        <div className="w-full max-w-2xl mx-auto">
          <img
            src={url}
            alt={citeTitle}
            className="mx-auto block max-w-full border border-zinc-200 rounded-lg object-contain"
            style={{ maxHeight: ADDENDUM_STANDARD_IMAGE_MAX_HEIGHT_PX }}
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </>
  );
}

function AddendumPaginatedContent({
  units,
  forMeasurement,
  imageContinuationFlags
}: {
  units: AddendumPaginateUnit[];
  forMeasurement?: boolean;
  imageContinuationFlags?: boolean[];
}) {
  return (
    <>
      {units.map((unit, idx) => {
        const textFlags =
          unit.kind === 'standardText' && !forMeasurement
            ? addendumTextPartDisplayFlags(units, idx)
            : null;
        return (
          <AddendumPaginateRow
            key={`${addendumPaginateMeasureId(unit)}-${idx}`}
            unit={unit}
            forMeasurement={forMeasurement}
            showImageContinuation={Boolean(imageContinuationFlags?.[idx])}
            showHeading={textFlags?.showHeading}
            showPageContinuation={textFlags?.showPageContinuation}
            continuesOnSamePage={textFlags?.continuesOnSamePage}
          />
        );
      })}
    </>
  );
}

/** Supplemental project-data photos (fldImages index >= 2); chunked for fixed-height PageContainer pages. */
const PHOTO_ADDENDUM_IMAGES_PER_PAGE = 8;

/** Financial pagination: tbody heights are measured; each printed page adds thead (py-2 + text-[10px] row). */
const FIN_PAGINATION_THEAD_OVERHEAD_PX = 32;
/** Small slack per row for divide-y / subpixel layout — keep low so budgets stay close to measured sums. */
const FIN_PAGINATION_ROW_GAP_PX = 2;
/** Reserve space on the last financial page(s) for Grand Total tfoot (py-4 row + border). */
const FIN_PAGINATION_GRAND_TOTAL_RESERVE_PX = 42;

function financialTableGlobalRowIndex(
  financialPages: FinancialTableRow[][],
  pageIndex: number,
  rowIndexOnPage: number
): number {
  let idx = 0;
  for (let p = 0; p < pageIndex; p++) idx += financialPages[p].length;
  return idx + rowIndexOnPage;
}

/** Financial Summary tbody row — shared by measurement mirror and printed pages. */
function FinancialTableBodyRow({
  row,
  rowIndex,
  allRows,
  recordSortOrder,
  forMeasurement
}: {
  row: FinancialTableRow;
  rowIndex: number;
  allRows: FinancialTableRow[];
  recordSortOrder: ReportRecordSortOrder;
  forMeasurement?: boolean;
}) {
  const measureAttr = forMeasurement ? { 'data-measure-type': 'fin' as const } : {};

  if (row.type === 'header') {
    return (
      <tr {...measureAttr} className="break-inside-avoid">
        <td colSpan={5} className={FINANCIAL_CATEGORY_HEADER_CELL_CLASS}>
          {row.content}
        </td>
      </tr>
    );
  }
  if (row.type === 'record') {
    const rec = row.content;
    const presentation = getFinancialLocationGroupPresentation(allRows, rowIndex);
    if (!presentation) return null;
    const cellBorderStyle = financialRecordCellBorderStyle();
    const recordCell = (variant: 'body' | 'location' | 'total', alignRight = false) => ({
      className: financialRecordDataCellClassName(presentation, variant, alignRight),
      style: cellBorderStyle
    });
    if (recordSortOrder === 'location_category_item') {
      return (
        <tr {...measureAttr} className={FINANCIAL_DATA_ROW_CLASS}>
          <td {...recordCell('body')}>{rec.categoryName ?? ''}</td>
          <td {...recordCell('body')}>{rec.itemName ?? ''}</td>
          <td {...recordCell('body', true)}>
            {rec.fldQTY ?? 0} {rec.displayUnitType ?? ''}
          </td>
          <td {...recordCell('body', true)}>{formatCurrency(rec.displayUnitCost ?? 0)}</td>
          <td {...recordCell('total', true)}>{formatCurrency(rec.totalCost ?? 0)}</td>
        </tr>
      );
    }
    return (
      <tr {...measureAttr} className={FINANCIAL_DATA_ROW_CLASS}>
        <td {...recordCell('body')}>{rec.itemName ?? ''}</td>
        <td {...recordCell('location')}>{rec.locationName ?? ''}</td>
        <td {...recordCell('body', true)}>
          {rec.fldQTY ?? 0} {rec.displayUnitType ?? ''}
        </td>
        <td {...recordCell('body', true)}>{formatCurrency(rec.displayUnitCost ?? 0)}</td>
        <td {...recordCell('total', true)}>{formatCurrency(rec.totalCost ?? 0)}</td>
      </tr>
    );
  }
  if (row.type === 'subtotal') {
    return (
      <tr {...measureAttr} className="break-inside-avoid text-xs">
        <td
          colSpan={4}
          className={cn(
            FINANCIAL_SUBTOTAL_CELL_CLASS,
            'text-right text-[10px] font-bold text-zinc-600 uppercase tracking-widest'
          )}
          style={FINANCIAL_SUBTOTAL_BORDER_STYLE}
        >
          Subtotal {row.groupHeading}:
        </td>
        <td
          className={cn(FINANCIAL_SUBTOTAL_CELL_CLASS, 'text-right font-black text-zinc-900')}
          style={FINANCIAL_SUBTOTAL_BORDER_STYLE}
        >
          {formatCurrency(row.subtotal)}
        </td>
      </tr>
    );
  }
  return null;
}

/** Padding below group header text (inside measured box so `getBoundingClientRect` includes it). */
const DOC_HEADER_SPACE_AFTER_PX = 14;
/** Margin below each DocumentationCard wrapper (outside border box; added in pagination after measured card height). */
const DOC_CARD_GAP_PX = 22;

/**
 * Documentation record card borders — one owner per line, whole-pixel widths only.
 * Outer, verticals, and horizontals all use 2px for reliable print-to-PDF output.
 */
const DOC_CARD_BORDER_COLOR = 'border-zinc-900';
const DOC_CARD_OUTER_BORDER = `border-2 ${DOC_CARD_BORDER_COLOR}`;
const DOC_CARD_VERT_BORDER_R = `border-r-2 ${DOC_CARD_BORDER_COLOR}`;
const DOC_CARD_VERT_BORDER_L = `border-l-2 ${DOC_CARD_BORDER_COLOR}`;
const DOC_CARD_HORIZ_BORDER_B = `border-b-2 ${DOC_CARD_BORDER_COLOR}`;
const DOC_CARD_HORIZ_BORDER_T = `border-t-2 ${DOC_CARD_BORDER_COLOR}`;
/** @deprecated alias */
const DOC_CARD_VERT_BORDER = DOC_CARD_VERT_BORDER_R;
/** @deprecated alias */
const DOC_CARD_HORIZ_BORDER = DOC_CARD_HORIZ_BORDER_B;
/** @deprecated alias */
const DOC_CARD_IMG_ROW_BORDER = DOC_CARD_HORIZ_BORDER_T;

const DOC_CARD_LABEL_COL_W = 'w-32';
const DOC_CARD_LABEL_CELL = cn(
  'flex shrink-0 items-center self-stretch bg-zinc-50 px-2 text-[9px] font-bold uppercase',
  DOC_CARD_LABEL_COL_W
);
/** Header row value cells (Category name, Item name) — black band, white text. */
const DOC_CARD_HEADER_VALUE_CELL =
  'flex min-h-0 flex-1 items-center truncate bg-black px-2 py-1 text-[10px] font-bold uppercase text-white';

type DocumentationPageItem =
  | { kind: 'groupHeader'; groupKey: string; label: string; continued: boolean }
  | { kind: 'record'; record: ProjectData };

function resolveDocumentationGroup(
  record: ProjectData,
  recordSortOrder: ReportRecordSortOrder,
  glossary: Glossary[],
  categories: Category[],
  locations: Location[]
): { groupKey: string; label: string } {
  const cleanKey = (record.fldData || '').trim().toLowerCase();
  const glos = glossary.find((g) => (g.fldGlosId || '').trim().toLowerCase() === cleanKey);
  const isCustom = record?.fldRecordSource === 'custom' && !glos;
  const catId = glos?.fldCat || (isCustom ? record?.fldPDataCategoryID || '' : '');
  const cat = categories.find((c) => c.fldCategoryID === catId);

  if (recordSortOrder === 'location_category_item') {
    const loc = locations.find((l) => l.fldLocID === record.fldLocation);
    const id = (loc?.fldLocID || record.fldLocation || '__none__').trim();
    const name = (loc?.fldLocName || '').trim();
    const label = name !== '' ? name : 'Unknown location';
    return { groupKey: `loc:${id}`, label };
  }

  const label = (cat?.fldCategoryName || '').trim() !== '' ? cat!.fldCategoryName!.trim() : 'Uncategorized';
  return { groupKey: `cat:${catId || '__none__'}`, label };
}

function buildDocumentationFlatStream(
  filteredData: ProjectData[],
  recordSortOrder: ReportRecordSortOrder,
  glossary: Glossary[],
  categories: Category[],
  locations: Location[]
): DocumentationPageItem[] {
  const order = recordSortOrder ?? 'category_location_item';
  const out: DocumentationPageItem[] = [];
  let prevKey: string | null = null;
  for (const record of filteredData) {
    const { groupKey, label } = resolveDocumentationGroup(record, order, glossary, categories, locations);
    if (groupKey !== prevKey) {
      out.push({ kind: 'groupHeader', groupKey, label, continued: false });
      prevKey = groupKey;
    }
    out.push({ kind: 'record', record });
  }
  return out;
}

function getLastRecordFromDocumentationPage(page: DocumentationPageItem[]): ProjectData | null {
  for (let j = page.length - 1; j >= 0; j--) {
    const it = page[j];
    if (it.kind === 'record') return it.record;
  }
  return null;
}

function DocumentationGroupHeader({ label, continued }: { label: string; continued: boolean }) {
  const display = continued ? `${label} (cont.)` : label;
  return (
    <div
      className="shrink-0 border-b border-zinc-200 text-base font-bold leading-tight text-zinc-900"
      style={{ paddingBottom: DOC_HEADER_SPACE_AFTER_PX }}
      title={display}
    >
      <span className="block truncate">{display}</span>
    </div>
  );
}

interface PhotoAddendumRow {
  url: string;
  recordId: string;
  imageIndex: number;
  locationLabel: string;
  categoryLabel: string;
  itemLabel: string;
  recordSortIndex: number;
}

function resolveRecordLocationLabelForPhotoAddendum(record: ProjectData, locations: Location[]): string {
  const loc = locations.find(l => l.fldLocID === record.fldLocation);
  const name = loc?.fldLocName?.trim();
  return name || 'Unknown location';
}

/** Same glossary/custom → category/item resolution as DocumentationCard. */
function resolveRecordCategoryItemLabelsForPhotoAddendum(
  record: ProjectData,
  glossary: Glossary[],
  categories: Category[],
  items: Item[]
): { categoryLabel: string; itemLabel: string } {
  const cleanKey = (record.fldData || '').trim().toLowerCase();
  const glos = glossary.find(g => (g.fldGlosId || '').trim().toLowerCase() === cleanKey);
  const isCustom = record?.fldRecordSource === 'custom' && !glos;
  const catId = glos?.fldCat || (isCustom ? (record?.fldPDataCategoryID || '') : '');
  const itemId = glos?.fldItem || (isCustom ? (record?.fldPDataItemID || '') : '');
  const cat = categories.find(c => c.fldCategoryID === catId);
  const item = items.find(i => i.fldItemID === itemId);
  const categoryName = cat?.fldCategoryName?.trim();
  const itemName = item?.fldItemName?.trim();
  return {
    categoryLabel: categoryName || '—',
    itemLabel: itemName || '—',
  };
}

function buildSupplementalPhotoRows(
  filteredData: ProjectData[],
  locations: Location[],
  glossary: Glossary[],
  categories: Category[],
  items: Item[]
): PhotoAddendumRow[] {
  const rows: PhotoAddendumRow[] = [];
  filteredData.forEach((record, recordSortIndex) => {
    const imgs = record.fldImages;
    if (!Array.isArray(imgs) || imgs.length <= 2) return;
    const locationLabel = resolveRecordLocationLabelForPhotoAddendum(record, locations);
    const { categoryLabel, itemLabel } = resolveRecordCategoryItemLabelsForPhotoAddendum(
      record,
      glossary,
      categories,
      items
    );
    for (let i = 2; i < imgs.length; i++) {
      const url = imgs[i];
      if (url === undefined || url === null || String(url).trim() === '') continue;
      rows.push({
        url: String(url).trim(),
        recordId: record.fldPDataID,
        imageIndex: i,
        locationLabel,
        categoryLabel,
        itemLabel,
        recordSortIndex,
      });
    }
  });
  rows.sort((a, b) => {
    const loc = a.locationLabel.localeCompare(b.locationLabel, undefined, { sensitivity: 'base' });
    if (loc !== 0) return loc;
    if (a.recordSortIndex !== b.recordSortIndex) return a.recordSortIndex - b.recordSortIndex;
    return a.imageIndex - b.imageIndex;
  });
  return rows;
}

function chunkPhotoAddendumRows(rows: PhotoAddendumRow[]): PhotoAddendumRow[][] {
  if (rows.length === 0) return [];
  const chunks: PhotoAddendumRow[][] = [];
  for (let i = 0; i < rows.length; i += PHOTO_ADDENDUM_IMAGES_PER_PAGE) {
    chunks.push(rows.slice(i, i + PHOTO_ADDENDUM_IMAGES_PER_PAGE));
  }
  return chunks;
}

function PhotoAddendumCell({ row }: { row: PhotoAddendumRow }) {
  const [broken, setBroken] = useState(false);
  const caption = `${row.categoryLabel} | ${row.itemLabel}`;
  return (
    <div className="flex min-w-0 flex-col break-inside-avoid">
      <div className="aspect-square w-full max-h-[132px] overflow-hidden rounded border border-zinc-200 bg-white">
        {broken ? (
          <div className="flex h-full min-h-[100px] w-full items-center justify-center bg-zinc-100 px-1">
            <span className="text-center text-[9px] leading-tight text-zinc-500">Image unavailable</span>
          </div>
        ) : (
          <img
            src={row.url}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
          />
        )}
      </div>
      <p
        className="mt-0.5 w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-0.5 text-center text-[10px] font-medium leading-snug text-zinc-700"
        title={caption}
      >
        {caption}
      </p>
    </div>
  );
}

function PhotoAddendumPageBody({
  rows,
  showSectionTitle,
}: {
  rows: PhotoAddendumRow[];
  showSectionTitle: boolean;
}) {
  const sections: { label: string; items: PhotoAddendumRow[] }[] = [];
  for (const row of rows) {
    const last = sections[sections.length - 1];
    if (last && last.label === row.locationLabel) {
      last.items.push(row);
    } else {
      sections.push({ label: row.locationLabel, items: [row] });
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      {showSectionTitle ? (
        <h2 className="shrink-0 border-b-2 border-zinc-900 pb-2 text-xl font-bold text-zinc-900">
          <span className="uppercase tracking-widest">Photo Addendum</span>
          <span className="font-bold normal-case tracking-normal"> (extra photos)</span>
        </h2>
      ) : null}
      <div className="min-h-0 flex-1 space-y-5 overflow-hidden">
        {sections.map((sec, si) => (
          <div key={`${sec.label}-${si}`} className="space-y-1.5 break-inside-avoid">
            <h3 className="border-b border-zinc-200 pb-0.5 text-xs font-black uppercase tracking-wide text-zinc-600">
              {sec.label}
            </h3>
            <div className="grid grid-cols-4 gap-x-2 gap-y-2">
              {sec.items.map((row) => (
                <PhotoAddendumCell key={`${row.recordId}-${row.imageIndex}`} row={row} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportPreview({
  project,
  client,
  facility,
  inspector,
  projectData,
  standards,
  glossary,
  categories,
  items,
  locations,
  recommendations,
  findings,
  onClose,
  isSidebarOpen,
  toggleSidebar,
  sectionSelection
}: ReportPreviewProps) {
  
  const reportRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  
  // State for measured heights
  const [measuredDocHeights, setMeasuredDocHeights] = useState<Record<string, number>>({});
  /** Measured height of `DocumentationGroupHeader` probe in measurementRef (single-line). */
  const [measuredDocHeaderHeight, setMeasuredDocHeaderHeight] = useState(32);
  const [measuredFinHeights, setMeasuredFinHeights] = useState<number[]>([]);
  const [measuredAddendumHeights, setMeasuredAddendumHeights] = useState<Record<string, number>>({});
  /** Height of first-page “Addendum: Referenced Standards” block (measured in measurementRef). */
  const [measuredAddendumSectionTitleHeight, setMeasuredAddendumSectionTitleHeight] = useState(
    ADDENDUM_SECTION_TITLE_FALLBACK_PX
  );
  /** Measured height of compact “continued figure” line above orphan addendum images. */
  const [measuredAddendumImageContinuationLinePx, setMeasuredAddendumImageContinuationLinePx] =
    useState(26);
  const [isMeasuring, setIsMeasuring] = useState(true);

  const sectionSel = useMemo<ReportSectionSelection>(
    () => ({
      cover: true,
      narrative: sectionSelection?.narrative ?? true,
      documentation: sectionSelection?.documentation ?? true,
      financial: sectionSelection?.financial ?? true,
      referencedStandards: sectionSelection?.referencedStandards ?? true,
      photoAddendum: sectionSelection?.photoAddendum ?? true,
      recordSortOrder: sectionSelection?.recordSortOrder ?? 'category_location_item'
    }),
    [sectionSelection]
  );

  const filteredData = useMemo(
    () =>
      filterReportProjectForPreview(
        projectData,
        project,
        facility,
        glossary,
        categories,
        items,
        locations,
        findings,
        sectionSel.recordSortOrder
      ),
    [
      projectData,
      project,
      facility,
      glossary,
      categories,
      items,
      locations,
      findings,
      sectionSel.recordSortOrder
    ]
  );

  const referencedStandards = useMemo(() => {
    if (!sectionSel.referencedStandards) return [];
    return buildReferencedAddendumEntries(filteredData, glossary, standards);
  }, [sectionSel.referencedStandards, filteredData, glossary, standards]);

  const addendumLayoutUnits = useMemo(
    () => expandAddendumForPagination(referencedStandards),
    [referencedStandards]
  );

  const supplementalPhotoRows = useMemo(() => {
    if (!sectionSel.photoAddendum) return [];
    return buildSupplementalPhotoRows(filteredData, locations, glossary, categories, items);
  }, [sectionSel.photoAddendum, filteredData, locations, glossary, categories, items]);

  const photoAddendumPages = useMemo(
    () => chunkPhotoAddendumRows(supplementalPhotoRows),
    [supplementalPhotoRows]
  );

  const financialData = useMemo(() => {
    if (!sectionSel.financial) return [];

    const enrichFinancialRecord = (record: ProjectData) => {
      const cleanKey = (record.fldData || '').trim().toLowerCase();
      const glos = glossary.find((g) => (g.fldGlosId || '').trim().toLowerCase() === cleanKey);
      const isCustom = record?.fldRecordSource === 'custom' && !glos;
      const catId = glos?.fldCat || (isCustom ? record?.fldPDataCategoryID || '' : '');
      const itemId = glos?.fldItem || (isCustom ? record?.fldPDataItemID || '' : '');
      const cat = categories.find((c) => c.fldCategoryID === catId);
      const catName = cat?.fldCategoryName || 'Uncategorized';
      const location = locations.find((l) => l.fldLocID === record.fldLocation);
      const locationName = location?.fldLocName || 'N/A';
      return {
        ...record,
        itemName: items.find((i) => i.fldItemID === itemId)?.fldItemName || 'N/A',
        locationName,
        categoryName: catName
      };
    };

    if (sectionSel.recordSortOrder !== 'location_category_item') {
      const groups: Record<string, { heading: string; records: any[]; subtotal: number }> = {};
      filteredData.forEach((record) => {
        const cleanKey = (record.fldData || '').trim().toLowerCase();
        const glos = glossary.find((g) => (g.fldGlosId || '').trim().toLowerCase() === cleanKey);
        const isCustom = record?.fldRecordSource === 'custom' && !glos;
        const catId = glos?.fldCat || (isCustom ? record?.fldPDataCategoryID || '' : '');
        const cat = categories.find((c) => c.fldCategoryID === catId);
        const catName = cat?.fldCategoryName || 'Uncategorized';
        if (!groups[catName]) {
          groups[catName] = { heading: catName, records: [], subtotal: 0 };
        }
        groups[catName].records.push(enrichFinancialRecord(record));
        groups[catName].subtotal += (record as any).totalCost;
      });
      return Object.values(groups).sort((a, b) => {
        const catA = categories.find((c) => c.fldCategoryName === a.heading);
        const catB = categories.find((c) => c.fldCategoryName === b.heading);
        const orderA = catA?.fldOrder ?? 999;
        const orderB = catB?.fldOrder ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.heading.localeCompare(b.heading);
      });
    }

    const groups: Record<string, { heading: string; records: any[]; subtotal: number }> = {};
    filteredData.forEach((record) => {
      const location = locations.find((l) => l.fldLocID === record.fldLocation);
      const locationKey =
        (location?.fldLocName || '').trim() !== ''
          ? (location?.fldLocName || '').trim()
          : 'Unknown location';
      if (!groups[locationKey]) {
        groups[locationKey] = { heading: locationKey, records: [], subtotal: 0 };
      }
      groups[locationKey].records.push(enrichFinancialRecord(record));
      groups[locationKey].subtotal += (record as any).totalCost;
    });

    const list = Object.values(groups);
    list.forEach((g) => {
      g.records.sort((a, b) =>
        compareReportRecordSortKeysLocationFirst(
          getReportRecordSortKeys(a, glossary, categories, items, locations, findings),
          getReportRecordSortKeys(b, glossary, categories, items, locations, findings)
        )
      );
    });
    list.sort((a, b) => a.heading.localeCompare(b.heading, undefined, { sensitivity: 'base' }));
    return list;
  }, [
    sectionSel.financial,
    sectionSel.recordSortOrder,
    filteredData,
    glossary,
    categories,
    items,
    locations,
    findings,
    project.fldCostMultiplier
  ]);

  const financialRows = useMemo(() => {
    if (!sectionSel.financial) return [];
    const rows: FinancialTableRow[] = [];
    financialData.forEach((group) => {
      rows.push({ type: 'header', content: group.heading });
      group.records.forEach((rec) => {
        rows.push({ type: 'record', content: rec });
      });
      rows.push({ type: 'subtotal', groupHeading: group.heading, subtotal: group.subtotal });
    });
    return rows;
  }, [sectionSel.financial, financialData]);

  // Measurement Pass
  useLayoutEffect(() => {
    if (!measurementRef.current) return;

    const measure = async () => {
      setIsMeasuring(true);
      
      // Wait for fonts to load
      await document.fonts.ready;

      // Wait for all images in the measurement container to load
      const images = measurementRef.current?.querySelectorAll('img');
      if (images && images.length > 0) {
        const imagePromises = Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        });
        await Promise.all(imagePromises);
      }

      // Small delay to ensure layout has settled after images load
      await new Promise(resolve => setTimeout(resolve, 300));

      const docHeights: Record<string, number> = {};
      const finHeights: number[] = [];
      const addendumHeights: Record<string, number> = {};

      const docElements = measurementRef.current?.querySelectorAll('[data-measure-type="doc"]');
      docElements?.forEach(el => {
        const id = el.getAttribute('data-id');
        if (id) docHeights[id] = el.getBoundingClientRect().height;
      });

      const docHeaderProbe = measurementRef.current?.querySelector('[data-measure-type="doc-header"]');
      let docHeaderH = 32;
      if (docHeaderProbe) {
        docHeaderH = Math.ceil(docHeaderProbe.getBoundingClientRect().height);
        if (docHeaderH < 24) docHeaderH = 24;
      }

      const finElements = measurementRef.current?.querySelectorAll('[data-measure-type="fin"]');
      finElements?.forEach(el => {
        finHeights.push(el.getBoundingClientRect().height);
      });

      const addendumElements = measurementRef.current?.querySelectorAll('[data-measure-type="addendum"]');
      addendumElements?.forEach(el => {
        const id = el.getAttribute('data-id');
        if (id) addendumHeights[id] = el.getBoundingClientRect().height;
      });

      const addendumTitleProbe = measurementRef.current?.querySelector(
        '[data-measure-type="addendum-section-title"]'
      );
      let addendumTitleH = ADDENDUM_SECTION_TITLE_FALLBACK_PX;
      if (addendumTitleProbe) {
        addendumTitleH = Math.ceil(addendumTitleProbe.getBoundingClientRect().height);
        if (addendumTitleH < 48) addendumTitleH = ADDENDUM_SECTION_TITLE_FALLBACK_PX;
      }

      const contProbe = measurementRef.current?.querySelector(
        '[data-measure-type="addendum-image-continuation-probe"]'
      );
      let contLineH = 26;
      if (contProbe) {
        contLineH = Math.ceil(contProbe.getBoundingClientRect().height);
        if (contLineH < 10) contLineH = 26;
      }

      setMeasuredDocHeights(docHeights);
      setMeasuredDocHeaderHeight(docHeaderH);
      setMeasuredFinHeights(finHeights);
      setMeasuredAddendumHeights(addendumHeights);
      setMeasuredAddendumSectionTitleHeight(addendumTitleH);
      setMeasuredAddendumImageContinuationLinePx(contLineH);
      setIsMeasuring(false);
    };

    measure();
  }, [
    filteredData,
    financialRows,
    addendumLayoutUnits,
    sectionSel.documentation,
    sectionSel.financial,
    sectionSel.referencedStandards,
    sectionSel.recordSortOrder
  ]);

  // Pagination Chunks using measured heights
  const narrativePages = useMemo(() => {
    const narrative = resolveFacilityReportNarrative(project, facility.fldFacID);
    return [narrative];
  }, [project.fldFacilityNarratives, project.fldNarrative, facility.fldFacID]);

  const documentationPages = useMemo(() => {
    if (!sectionSel.documentation) return [];
    if (isMeasuring) return [];

    const flat = buildDocumentationFlatStream(
      filteredData,
      sectionSel.recordSortOrder,
      glossary,
      categories,
      locations
    );

    /** Includes `DocumentationGroupHeader` padding below title (see `DOC_HEADER_SPACE_AFTER_PX`). */
    const headerUnitCost = measuredDocHeaderHeight;
    const recordHeight = (r: ProjectData) => (measuredDocHeights[r.fldPDataID] || 200) + DOC_CARD_GAP_PX;

    // Body-height budget per doc page (section title only on first printed doc page). Values are
    // heuristic; group headers consume space that was not in the original 660 / (660−65) split.
    const standardLimit = 682;
    const firstPageLimit = 628;
    const limit = () => (pages.length === 0 ? firstPageLimit : standardLimit);

    const pages: DocumentationPageItem[][] = [];
    let current: DocumentationPageItem[] = [];
    let currentHeight = 0;

    let i = 0;
    while (i < flat.length) {
      const item = flat[i];

      if (current.length === 0 && pages.length > 0 && item.kind === 'record') {
        const prevLast = getLastRecordFromDocumentationPage(pages[pages.length - 1]!);
        if (prevLast) {
          const gPrev = resolveDocumentationGroup(
            prevLast,
            sectionSel.recordSortOrder,
            glossary,
            categories,
            locations
          );
          const gCur = resolveDocumentationGroup(
            item.record,
            sectionSel.recordSortOrder,
            glossary,
            categories,
            locations
          );
          if (gPrev.groupKey === gCur.groupKey) {
            const cont: DocumentationPageItem = {
              kind: 'groupHeader',
              groupKey: gCur.groupKey,
              label: gCur.label,
              continued: true
            };
            if (currentHeight + headerUnitCost <= limit()) {
              current.push(cont);
              currentHeight += headerUnitCost;
            }
          }
        }
      }

      if (item.kind === 'groupHeader') {
        const next = flat[i + 1];
        const hCost = headerUnitCost;
        const pairCost =
          next?.kind === 'record' ? hCost + recordHeight(next.record) : hCost;

        if (current.length > 0 && currentHeight + pairCost > limit()) {
          pages.push(current);
          current = [];
          currentHeight = 0;
          continue;
        }
        if (current.length > 0 && currentHeight + hCost > limit()) {
          pages.push(current);
          current = [];
          currentHeight = 0;
          continue;
        }

        current.push(item);
        currentHeight += hCost;
        i += 1;
        continue;
      }

      const rec = item.record;
      const h = recordHeight(rec);
      if (current.length > 0 && currentHeight + h > limit()) {
        pages.push(current);
        current = [];
        currentHeight = 0;
        continue;
      }

      current.push(item);
      currentHeight += h;
      i += 1;
    }

    if (current.length > 0) pages.push(current);
    return pages;
  }, [
    sectionSel.documentation,
    sectionSel.recordSortOrder,
    filteredData,
    measuredDocHeights,
    measuredDocHeaderHeight,
    glossary,
    categories,
    locations,
    isMeasuring
  ]);

  const financialPages = useMemo(() => {
    if (!sectionSel.financial) return [];
    if (isMeasuring) return [];

    // Match legacy body budgets (630 / 565 minus title slack on first page), minus thead only.
    const baseFirstLimit = 565 - FIN_PAGINATION_THEAD_OVERHEAD_PX;
    const baseStdLimit = 630 - FIN_PAGINATION_THEAD_OVERHEAD_PX;

    const chunks: any[][] = [];
    let currentChunk: any[] = [];
    let currentHeight = 0;

    for (let i = 0; i < financialRows.length; i++) {
      const row = financialRows[i];
      const height = (measuredFinHeights[i] || 32) + FIN_PAGINATION_ROW_GAP_PX;

      let limit = chunks.length === 0 ? baseFirstLimit : baseStdLimit;
      if (i > financialRows.length - 3) limit -= FIN_PAGINATION_GRAND_TOTAL_RESERVE_PX;

      if (
        row.type === 'header' &&
        currentChunk.length > 0 &&
        i + 1 < financialRows.length
      ) {
        const next = financialRows[i + 1];
        if (next.type === 'record' || next.type === 'subtotal') {
          const nextH = (measuredFinHeights[i + 1] || 32) + FIN_PAGINATION_ROW_GAP_PX;
          if (
            currentHeight + height + nextH > limit &&
            currentHeight + height <= limit
          ) {
            chunks.push(currentChunk);
            currentChunk = [];
            currentHeight = 0;
          }
        }
      }

      limit = chunks.length === 0 ? baseFirstLimit : baseStdLimit;
      if (i > financialRows.length - 3) limit -= FIN_PAGINATION_GRAND_TOTAL_RESERVE_PX;

      if (currentHeight + height > limit && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [row];
        currentHeight = height;
      } else {
        currentChunk.push(row);
        currentHeight += height;
      }
    }
    if (currentChunk.length > 0) chunks.push(currentChunk);
    return chunks;
  }, [sectionSel.financial, financialRows, measuredFinHeights, isMeasuring]);

  const addendumPages = useMemo(() => {
    if (!sectionSel.referencedStandards) return [];
    if (isMeasuring) return [];
    const units = addendumLayoutUnits;
    const chunks: AddendumPaginateUnit[][] = [];
    let currentChunk: AddendumPaginateUnit[] = [];
    let currentHeight = 0;
    const titleReserve =
      measuredAddendumSectionTitleHeight > 0
        ? measuredAddendumSectionTitleHeight
        : ADDENDUM_SECTION_TITLE_FALLBACK_PX;
    const firstPageRowBudget =
      ADDENDUM_FIRST_PAGE_BODY_BASE_PX -
      titleReserve -
      ADDENDUM_FIRST_PAGE_LAYOUT_FUDGE_PX;

    const contLineReserve =
      measuredAddendumImageContinuationLinePx > 0
        ? measuredAddendumImageContinuationLinePx
        : 26;

    const pageLimit = () =>
      chunks.length === 0 ? firstPageRowBudget : ADDENDUM_SUBSEQUENT_PAGE_BODY_PX;

    const defaultUnitH = (unit: AddendumPaginateUnit) => {
      if (unit.kind === 'header') return 56;
      if (unit.kind === 'standardImage')
        return ADDENDUM_STANDARD_IMAGE_MAX_HEIGHT_PX + ADDENDUM_IMAGE_DEFAULT_EXTRA_PX;
      if (unit.kind === 'standardText')
        return estimateAddendumTextPartHeight(unit.text, unit.isFirst);
      return 100;
    };

    const heightFor = (unit: AddendumPaginateUnit, opts?: { imageOrphan?: boolean }) => {
      const key = addendumPaginateMeasureId(unit);
      const slack =
        unit.kind === 'standardImage' ? ADDENDUM_IMAGE_ROW_SLACK_PX : ADDENDUM_ROW_PAGINATION_SLACK_PX;
      let h = (measuredAddendumHeights[key] || defaultUnitH(unit)) + slack;
      if (unit.kind === 'standardImage' && opts?.imageOrphan) h += contLineReserve;
      return h;
    };

    let i = 0;
    while (i < units.length) {
      const u = units[i];
      const next = units[i + 1];

      if (u.kind === 'header' && next?.kind === 'standardText' && currentChunk.length > 0) {
        const hHeader = heightFor(u);
        const hNext = heightFor(next);
        const lim = pageLimit();
        if (currentHeight + hHeader + hNext > lim && currentHeight + hHeader <= lim) {
          chunks.push(currentChunk);
          currentChunk = [];
          currentHeight = 0;
        }
      }

      if (addendumIsTextImagePair(u, next)) {
        const h1 = heightFor(u);
        const h2 = heightFor(next!, {});
        const pairH = h1 + h2;

        while (currentChunk.length > 0 && currentHeight + pairH > pageLimit()) {
          chunks.push(currentChunk);
          currentChunk = [];
          currentHeight = 0;
        }

        if (currentHeight + pairH <= pageLimit()) {
          currentChunk.push(u, next!);
          currentHeight += pairH;
          i += 2;
          continue;
        }

        if (currentChunk.length === 0 && pairH > pageLimit()) {
          if (h1 <= pageLimit()) {
            currentChunk.push(u);
            currentHeight += h1;
            i += 1;
            continue;
          }
          currentChunk.push(u);
          currentHeight += h1;
          i += 1;
          continue;
        }
      }

      const lim = pageLimit();
      let h = heightFor(u);
      if (u.kind === 'standardImage') {
        const prev = currentChunk[currentChunk.length - 1];
        const orphan =
          !prev ||
          prev.kind !== 'standardText' ||
          prev.standard.fldStandardId !== u.standard.fldStandardId;
        if (orphan) h = heightFor(u, { imageOrphan: true });
      }

      if (currentHeight + h > lim && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [u];
        currentHeight = h;
        i += 1;
        continue;
      }

      currentChunk.push(u);
      currentHeight += h;
      i += 1;
    }

    if (currentChunk.length > 0) chunks.push(currentChunk);
    return chunks;
  }, [
    sectionSel.referencedStandards,
    addendumLayoutUnits,
    measuredAddendumHeights,
    measuredAddendumSectionTitleHeight,
    measuredAddendumImageContinuationLinePx,
    isMeasuring
  ]);

  const handlePrint = () => {
    // Browser Print / Save as PDF uses document.title as the default filename (adds .pdf).
    const previousTitle = document.title;
    const printTitle = buildReportPdfSuggestedFilename(project.fldProjName, facility.fldFacName);
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };
    window.addEventListener('afterprint', restoreTitle);
    document.title = printTitle;
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'TBD';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    let year = date.getUTCFullYear();
    if (year < 100) year += 2000;
    const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
    const day = date.getUTCDate();
    return `${month} ${day}, ${year}`;
  };

  return (
    <div className={cn(
      "fixed inset-0 bg-zinc-900 z-50 flex flex-col transition-all duration-300",
      "print:bg-white print:absolute print:top-0 print:left-0 print:z-0 print:h-auto print:w-full print:block print:overflow-visible",
      isSidebarOpen && "left-64 print:left-0"
    )}>
      {/* Measurement Pass (Hidden) */}
      <div 
        ref={measurementRef}
        className="absolute top-0 left-0 w-[1056px] opacity-0 pointer-events-none overflow-hidden h-0"
        style={{ paddingLeft: '48px', paddingRight: '48px' }}
      >
        {sectionSel.documentation && (
          <>
            <div data-measure-type="doc-header" className="w-full">
              <DocumentationGroupHeader label="Category / Location header probe" continued={false} />
            </div>
            {filteredData.map(record => (
              <div
                key={record.fldPDataID}
                data-measure-type="doc"
                data-id={record.fldPDataID}
                style={{ marginBottom: DOC_CARD_GAP_PX }}
              >
                <DocumentationCard 
                  record={record} 
                  index={0} 
                  glossary={glossary} 
                  standards={standards} 
                  locations={locations}
                  categories={categories}
                  items={items}
                />
              </div>
            ))}
          </>
        )}
        {sectionSel.financial && financialRows.length > 0 ? (
          <table className={FINANCIAL_TABLE_CLASS}>
            <thead>
              <tr className="bg-zinc-100 border-y border-zinc-200">
                {sectionSel.recordSortOrder === 'location_category_item' ? (
                  <>
                    <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Category</th>
                    <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Item</th>
                    <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">QTY</th>
                    <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">UNIT COST</th>
                    <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">TOTAL</th>
                  </>
                ) : (
                  <>
                    <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Item</th>
                    <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Location</th>
                    <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">QTY</th>
                    <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">UNIT COST</th>
                    <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">TOTAL</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {financialRows.map((row, idx) => (
                <FinancialTableBodyRow
                  key={idx}
                  row={row}
                  rowIndex={idx}
                  allRows={financialRows}
                  recordSortOrder={sectionSel.recordSortOrder}
                  forMeasurement
                />
              ))}
            </tbody>
          </table>
        ) : null}
        {sectionSel.referencedStandards && referencedStandards.length > 0 ? (
          <div className="flex w-full flex-col">
            <div data-measure-type="addendum-section-title">
              <h2 className="mb-8 border-b-2 border-zinc-900 pb-2 text-xl font-bold uppercase tracking-widest text-zinc-900">
                Addendum: Referenced Standards
              </h2>
            </div>
            <p
              data-measure-type="addendum-image-continuation-probe"
              className="mb-1.5 text-[10px] font-bold uppercase tracking-tight text-zinc-800 leading-tight"
            >
              TAS 502.2 Vehicle Spaces (continued figure)
            </p>
            <AddendumPaginatedContent units={addendumLayoutUnits} forMeasurement />
          </div>
        ) : null}
      </div>

      {/* Header / Controls */}
      <div className="h-16 bg-zinc-800 border-b border-zinc-700 flex items-center justify-between px-6 shrink-0 print:hidden no-print">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={toggleSidebar} className="text-zinc-400 hover:text-white hover:bg-zinc-700">
            {isSidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
          </Button>
          <div className="bg-blue-600 p-2 rounded-lg">
            <FileText className="text-white" size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold leading-tight">Report Preview</h2>
            </div>
            <p className="text-zinc-400 text-xs uppercase tracking-widest font-bold">{project.fldProjName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isMeasuring && (
            <div className="flex items-center gap-2 text-blue-500 text-xs font-bold animate-pulse mr-4">
              <AlertCircle size={14} />
              CALCULATING PIXEL-PERFECT LAYOUT...
            </div>
          )}
          <Button 
            variant="primary" 
            onClick={handlePrint} 
            className="bg-blue-600 border-blue-500 text-white hover:bg-blue-500"
            disabled={isMeasuring}
          >
            <Printer size={16} className="mr-2" /> 
            Print / Save as PDF
          </Button>
          
          <div className="w-px h-6 bg-zinc-700 mx-2" />
          <Button variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-white hover:bg-zinc-700 gap-2">
            <X size={18} />
            <span className="font-bold">Close Preview</span>
          </Button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 overflow-auto p-12 flex flex-col items-center gap-12 bg-zinc-900 print:bg-white print:p-0 print:gap-0 print:overflow-visible print:block print:h-auto no-scrollbar">
        {isMeasuring ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
            <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            <p className="font-bold tracking-widest text-sm uppercase">Analyzing Content Geometry...</p>
          </div>
        ) : (
          <div className="report-container-wrapper print:bg-white print:w-full print:h-auto print:overflow-visible print:block">
            <div ref={reportRef} className="flex flex-col items-center gap-12 print:gap-0 bg-transparent py-12 print:py-0 print:block print:h-auto print:overflow-visible">
              {/* Cover Page */}
              <PageContainer>
                <div className="absolute top-[203px] left-0 right-0 flex justify-center pointer-events-none z-10">
                  <div className="text-[18.6px] font-semibold text-zinc-900 uppercase tracking-tight text-center max-w-[80%]">
                    {facility.fldFacName}
                  </div>
                </div>
                <div className="h-full flex flex-col">
                  <div className="flex justify-between items-start mb-16">
                    <div className="flex gap-6">
                      <div className="w-32 h-32 bg-blue-900 flex items-center justify-center overflow-hidden">
                        <img src={ocgLogoNew} alt="OCG Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                      <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-zinc-900">Otten Consulting Group, Inc.</h1>
                        <p className="text-sm text-zinc-600">7171 Highway 6 N., Suite 285</p>
                        <p className="text-sm text-zinc-600">Houston, Texas 77095</p>
                        <p className="text-sm text-zinc-600">Tele (713) 975-1029</p>
                        <p className="text-sm text-zinc-600">Fax (713) 785-7769</p>
                        <p className="text-xs text-blue-600 underline">www.statereview.com</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Accessibility Assessment</h2>
                      <p className="text-sm font-bold text-zinc-700 mt-2">Americans with Disabilities Act</p>
                      <p className="text-sm font-bold text-zinc-700">Texas Accessibility Standards</p>
                      <p className="text-sm font-bold text-zinc-700">Fair Housing Act</p>
                      <p className="text-sm font-bold text-zinc-700">Rehabilitation Act (504)</p>
                    </div>
                  </div>
                  <div className="space-y-7">
                    <ReportSection title="OCG INFORMATION">
                      <InfoRow label="Inspector:" value={inspector.fldInspName + (inspector.fldTitle ? `, ${inspector.fldTitle}` : '')} />
                      <InfoRow label="Inspection Date:" value={formatDate(facility.fldInspectionDate || project.fldPDDate || '')} />
                      <InfoRow label="OCG Project #:" value={project.fldProjNumber || 'TBD'} />
                    </ReportSection>
                    <ReportSection title="PROJECT INFORMATION">
                      <InfoRow label="Project Name:" value={project.fldProjName} />
                      <InfoRow label="Facility Name:" value={facility.fldFacName} />
                      <InfoRow label="Project Address:" value={facility.fldFacAddress || 'TBD'} />
                      <InfoRow label="City, State Zip:" value={`${facility.fldFacCity || ''}, ${facility.fldFacState || ''} ${facility.fldFacZip || ''}`} />
                    </ReportSection>
                    <ReportSection title="OWNER INFORMATION">
                      <InfoRow label="Name:" value={client.fldClientName} />
                      <InfoRow label="Address:" value={client.fldClientAddress || 'TBD'} />
                      <div className="grid grid-cols-3 gap-4">
                        <InfoRow label="City:" value={client.fldClientCity || 'TBD'} />
                        <InfoRow label="State:" value={client.fldClientState || 'TBD'} />
                        <InfoRow label="ZIP:" value={client.fldClientZIP || 'TBD'} />
                      </div>
                    </ReportSection>
                  </div>
                </div>
              </PageContainer>

              {/* Narrative Pages */}
              {sectionSel.narrative &&
                narrativePages.map((content, pIdx) => (
                  <PageContainer key={`narrative-${pIdx}`} pageNumber={toRoman(pIdx + 1, false)} facilityName={facility.fldFacName}>
                    <div className="flex flex-col">
                      <h2 className="text-xl font-bold text-zinc-900 mb-8 uppercase tracking-widest border-b-2 border-zinc-900 pb-2">Narrative:</h2>
                      <div className="text-sm text-zinc-800 leading-relaxed space-y-6 whitespace-pre-wrap">
                        {content}
                      </div>
                    </div>
                  </PageContainer>
                ))}

              {/* Documentation Section */}
              {sectionSel.documentation ? (
                documentationPages.length > 0 ? (
                  documentationPages.map((pageItems, pIdx) => (
                    <PageContainer key={`doc-${pIdx}`} pageNumber={(pIdx + 1).toString()} facilityName={facility.fldFacName}>
                      <div className="flex flex-col">
                        {pIdx === 0 && (
                          <h2 className="text-xl font-bold text-zinc-900 mb-8 uppercase tracking-widest border-b-2 border-zinc-900 pb-2">
                            Documentation Section
                          </h2>
                        )}
                        <div className="flex flex-col">
                          {pageItems.map((entry, ii) => {
                            if (entry.kind === 'groupHeader') {
                              return (
                                <DocumentationGroupHeader
                                  key={`doc-${pIdx}-gh-${entry.groupKey}-${ii}-${entry.continued ? 'c' : 'n'}`}
                                  label={entry.label}
                                  continued={entry.continued}
                                />
                              );
                            }
                            const priorRecordsOnPage = pageItems
                              .slice(0, ii)
                              .filter((e): e is { kind: 'record'; record: ProjectData } => e.kind === 'record').length;
                            const priorRecordsOnPriorPages = documentationPages
                              .slice(0, pIdx)
                              .reduce((sum, p) => sum + p.filter((e) => e.kind === 'record').length, 0);
                            const globalIndex = priorRecordsOnPriorPages + priorRecordsOnPage + 1;
                            return (
                              <div
                                key={entry.record.fldPDataID}
                                style={{ marginBottom: DOC_CARD_GAP_PX }}
                              >
                                <DocumentationCard
                                  record={entry.record}
                                  index={globalIndex}
                                  glossary={glossary}
                                  standards={standards}
                                  locations={locations}
                                  categories={categories}
                                  items={items}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </PageContainer>
                  ))
                ) : (
                  <PageContainer facilityName={facility.fldFacName} pageNumber="1">
                    <div className="flex flex-col">
                      <h2 className="text-xl font-bold text-zinc-900 mb-8 uppercase tracking-widest border-b-2 border-zinc-900 pb-2">
                        Documentation Section
                      </h2>
                      <p className="text-sm text-zinc-500 italic">No documentation records found for this project.</p>
                    </div>
                  </PageContainer>
                )
              ) : null}

              {/* Financial Section */}
              {sectionSel.financial &&
                financialPages.map((pageRows, pIdx) => (
                <PageContainer key={`fin-${pIdx}`} pageNumber={`A${pIdx + 1}`} facilityName={facility.fldFacName}>
                  <div className="flex flex-col h-full">
                    {pIdx === 0 && (
                      <h2 className="text-xl font-bold text-zinc-900 mb-8 uppercase tracking-widest border-b-2 border-zinc-900 pb-2">
                        Financial Summary
                      </h2>
                    )}
                    <div className="flex-1 flex flex-col">
                      <table className={FINANCIAL_TABLE_CLASS}>
                        <thead>
                          <tr className="bg-zinc-100 border-y border-zinc-200">
                            {sectionSel.recordSortOrder === 'location_category_item' ? (
                              <>
                                <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Category</th>
                                <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Item</th>
                                <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">QTY</th>
                                <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">UNIT COST</th>
                                <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">TOTAL</th>
                              </>
                            ) : (
                              <>
                                <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Item</th>
                                <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Location</th>
                                <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">QTY</th>
                                <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">UNIT COST</th>
                                <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">TOTAL</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {pageRows.map((row, rIdx) => (
                            <FinancialTableBodyRow
                              key={rIdx}
                              row={row}
                              rowIndex={financialTableGlobalRowIndex(financialPages, pIdx, rIdx)}
                              allRows={financialRows}
                              recordSortOrder={sectionSel.recordSortOrder}
                            />
                          ))}
                        </tbody>
                        {pIdx === financialPages.length - 1 && (
                          <tfoot>
                            <tr className="border-t-2 border-zinc-900 break-inside-avoid">
                              <td colSpan={4} className="py-4 px-3 text-right text-sm font-black text-zinc-900 uppercase tracking-widest">
                                Grand Total:
                              </td>
                              <td className="py-4 px-3 text-right text-lg font-black text-blue-600">
                                {formatCurrency(financialData.reduce((sum, g) => sum + g.subtotal, 0))}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </PageContainer>
              ))}

              {/* Addendum Section */}
              {sectionSel.referencedStandards ? (
                addendumPages.length > 0 ? (
                  addendumPages.map((pageRecords, pIdx) => (
                    <PageContainer key={`add-${pIdx}`} pageNumber={`B${pIdx + 1}`} facilityName={facility.fldFacName}>
                      <div className="flex flex-col">
                        {pIdx === 0 && (
                          <h2 className="mb-8 border-b-2 border-zinc-900 pb-2 text-xl font-bold uppercase tracking-widest text-zinc-900">
                            Addendum: Referenced Standards
                          </h2>
                        )}
                        <AddendumPaginatedContent
                          units={pageRecords}
                          imageContinuationFlags={pageRecords.map((_, idx) =>
                            addendumImageIsOrphanOnPage(pageRecords, idx)
                          )}
                        />
                      </div>
                    </PageContainer>
                  ))
                ) : (
                  <PageContainer facilityName={facility.fldFacName} pageNumber="C1">
                    <div className="flex flex-col">
                      <h2 className="text-xl font-bold text-zinc-900 mb-8 uppercase tracking-widest border-b-2 border-zinc-900 pb-2">
                        Addendum: Referenced Standards
                      </h2>
                      <p className="text-sm text-zinc-500 italic">No standards citations referenced in this report.</p>
                    </div>
                  </PageContainer>
                )
              ) : null}

              {/* Photo Addendum (fldImages index 2+ only; main cards unchanged at slice(0,2)) */}
              {sectionSel.photoAddendum && photoAddendumPages.length > 0
                ? photoAddendumPages.map((photoPageRows, phIdx) => (
                    <PageContainer
                      key={`photo-add-${phIdx}`}
                      pageNumber={`D${phIdx + 1}`}
                      facilityName={facility.fldFacName}
                    >
                      <PhotoAddendumPageBody
                        rows={photoPageRows}
                        showSectionTitle={phIdx === 0}
                      />
                    </PageContainer>
                  ))
                : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Helper Components (Simplified for Sandbox) ---

function PageContainer({ children, className, pageNumber, facilityName }: any) {
  return (
    <div className={cn("report-page w-[1056px] h-[816px] bg-white shadow-2xl shrink-0 relative print:shadow-none flex flex-col overflow-hidden", className)}>
      <div className="flex-1 px-[48px] pt-[48px] pb-[72px] relative overflow-hidden">
        <div className="h-full overflow-hidden">{children}</div>
      </div>
      {/* Footer Area at exactly 0.5" (48px) from bottom */}
      <div className="absolute bottom-[48px] left-[48px] right-[48px] pointer-events-none z-20 bg-white">
        {/* Thin black line 8 points (~10.6px) above the text */}
        <div className="w-full h-[0.5px] bg-black mb-[8pt]" />
        <div className="flex justify-between items-end">
          <div className="text-[10px] font-semibold text-zinc-900 uppercase tracking-tight">{facilityName}</div>
          <div className="text-[10px] font-semibold text-zinc-900 tracking-tight">
            {pageNumber ? `PAGE ${pageNumber}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportSection({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="bg-black text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest">
        {title}
      </div>
      <div className="border border-zinc-200 divide-y divide-zinc-100">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center text-xs py-1.5 px-3">
      <span className="w-40 font-bold text-zinc-900">{label}</span>
      <span className="text-zinc-700">{value}</span>
    </div>
  );
}

function DocumentationCard({ record, index, glossary, standards, locations, categories, items }: { record: any, index: number, glossary: Glossary[], standards: MasterStandard[], locations: Location[], categories: Category[], items: Item[] }) {
  const cleanKey = (record.fldData || "").trim().toLowerCase();
  const glos = glossary.find(g => (g.fldGlosId || "").trim().toLowerCase() === cleanKey);
  const isCustom = record?.fldRecordSource === 'custom' && !glos;
  const catId = glos?.fldCat || (isCustom ? (record?.fldPDataCategoryID || '') : '');
  const itemId = glos?.fldItem || (isCustom ? (record?.fldPDataItemID || '') : '');
  const cat = categories.find(c => c.fldCategoryID === catId);
  const item = items.find(i => i.fldItemID === itemId);
  const location = locations.find(l => l.fldLocID === record.fldLocation);
  const refs = useMemo(() => {
    const ids = getRecordStandardIds(record, glos);
    if (ids.length === 0) return '';
    return formatGroupedStandardCitations(ids, standards);
  }, [record.fldStandards, record.fldData, glos, standards]);

  const hasReportImages = Array.isArray(record.fldImages) && record.fldImages.length > 0;

  return (
    <div className={cn('flex items-stretch break-inside-avoid', DOC_CARD_OUTER_BORDER)}>
      {/* Number Column */}
      <div className={cn('flex w-12 shrink-0 flex-col items-center justify-start pt-2 font-black text-2xl', DOC_CARD_VERT_BORDER_R)}>
        {index}
        <span className="text-[8px] font-mono text-zinc-400 mt-1 print:hidden">{record.fldPDataID?.slice(0, 8)}</span>
      </div>

      {/* Content column: recommendation flex-1 absorbs height when image column is taller */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Continuous label | value separator (one owner, full column height) */}
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute bottom-0 left-32 top-0 z-10 w-0',
            DOC_CARD_VERT_BORDER_R
          )}
        />

        {/* Header Row */}
        <div className={cn('flex shrink-0 items-center', DOC_CARD_HORIZ_BORDER_B)}>
          <div className={cn(DOC_CARD_LABEL_CELL, 'py-1')}>Category</div>
          <div className={cn(DOC_CARD_HEADER_VALUE_CELL, DOC_CARD_VERT_BORDER_R)}>
            {cat?.fldCategoryName || 'N/A'}
          </div>
          <div className={cn(DOC_CARD_LABEL_CELL, 'py-1', DOC_CARD_VERT_BORDER_R)}>Item</div>
          <div className={DOC_CARD_HEADER_VALUE_CELL}>{item?.fldItemName || 'N/A'}</div>
        </div>
        
        {/* Location row: single continuous value band; cost right-aligned */}
        <div className={cn('flex min-w-0 shrink-0 items-center', DOC_CARD_HORIZ_BORDER_B)}>
          <div className={cn(DOC_CARD_LABEL_CELL, 'py-2')}>Location</div>
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3 bg-white px-2 py-2">
            <span
              className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-900"
              title={location?.fldLocName || 'N/A'}
            >
              {location?.fldLocName || 'N/A'}
            </span>
            <span className="shrink-0 whitespace-nowrap text-xs font-bold text-blue-600">
              Estimated Cost: ${record.totalCost?.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Finding Row */}
        <div className={cn('flex shrink-0 items-stretch', DOC_CARD_HORIZ_BORDER_B)}>
          <div className={cn(DOC_CARD_LABEL_CELL, 'py-2')}>Finding</div>
          {/* Glossary images are intentionally not rendered in formal report finding text (record.fldImages only in column / addendum). */}
          <div className="flex min-h-0 flex-1 items-center px-2 py-2 text-[11px] leading-snug whitespace-pre-line">
            {record.fldFindLong}
          </div>
          <div className={cn('flex shrink-0 flex-col self-stretch', DOC_CARD_LABEL_COL_W, DOC_CARD_VERT_BORDER_L)}>
            <div className={cn('shrink-0 bg-zinc-50 px-2 py-1 text-center text-[9px] font-bold uppercase', DOC_CARD_HORIZ_BORDER_B)}>
              Measurement
            </div>
            <div className="flex min-h-[2.5rem] flex-1 items-center justify-center p-2 text-xs font-bold">
              {formatMeasurement(record.fldMeasurement, record.fldMeasurementUnit || record.fldUnitType)}
            </div>
          </div>
        </div>

        {/* Recommendation Row — grows when image column sets card height */}
        <div className={cn('flex min-h-0 flex-1', DOC_CARD_HORIZ_BORDER_B)}>
          <div className={cn(DOC_CARD_LABEL_CELL, 'py-2')}>Recommendation</div>
          <div className="flex min-h-0 flex-1 items-center px-2 py-2 text-[11px] leading-snug whitespace-pre-line">
            {record.fldRecLong}
          </div>
        </div>

        {/* Reference Row — anchored at bottom of content column */}
        <div className="flex shrink-0 items-center">
          <div className={cn(DOC_CARD_LABEL_CELL, 'py-2')}>Reference</div>
          <div className="flex min-h-0 flex-1 items-center px-2 py-2 text-xs font-bold">{refs}</div>
        </div>
      </div>

      {/* Images column: one continuous border-l-2 for full-height content/image separator */}
      <div
        className={cn(
          'flex min-h-0 w-48 shrink-0 flex-col bg-zinc-900',
          DOC_CARD_VERT_BORDER_L,
          !hasReportImages && 'hidden'
        )}
      >
        {Array.isArray(record.fldImages) &&
          record.fldImages.slice(0, 2).map((img: string, i: number) => (
            <div
              key={i}
              className={cn(
                'h-32 shrink-0 overflow-hidden bg-white p-1',
                i === 0 && 'rounded-t-sm',
                i > 0 && DOC_CARD_IMG_ROW_BORDER
              )}
            >
              <img
                src={img}
                className="h-full w-full rounded-sm object-cover"
                alt={`Finding ${i + 1}`}
                referrerPolicy="no-referrer"
              />
            </div>
          ))}
        <div className={cn('min-h-0 flex-1 bg-zinc-50', DOC_CARD_IMG_ROW_BORDER)} aria-hidden={true} />
      </div>
    </div>
  );
}
