import React from 'react';
import type { Category, Glossary, Item, Location, MasterStandard, ProjectData } from '../../types';
import { cn } from '../../lib/utils';
import {
  buildRasFindingCardDisplay,
  buildRasFindingCardMetadataRows,
} from '../../lib/rasFindingCardDisplay';
import type { ReportProfile } from '../../lib/reportProfile';

const CARD_BORDER = 'border-zinc-900';
const OUTER = `border-2 ${CARD_BORDER}`;
const VERT_R = `border-r-2 ${CARD_BORDER}`;
const VERT_L = `border-l-2 ${CARD_BORDER}`;
const HORIZ_B = `border-b-2 ${CARD_BORDER}`;
const HORIZ_T = `border-t-2 ${CARD_BORDER}`;
const LABEL_COL = 'w-32';
const LABEL_CELL = cn(
  LABEL_COL,
  'shrink-0 bg-zinc-50 px-2 text-[9px] font-bold uppercase tracking-wide text-zinc-600'
);
const HEADER_VALUE = 'min-w-0 flex-1 bg-white px-2 py-1 text-xs font-medium text-zinc-900';

function FourColMetaRow({
  left,
  right,
}: {
  left: { label: string; value: string };
  right: { label: string; value: string };
}) {
  return (
    <div className={cn('flex shrink-0 items-center', HORIZ_B)}>
      <div className={cn(LABEL_CELL, 'py-1')}>{left.label}</div>
      <div className={cn(HEADER_VALUE, VERT_R)}>{left.value}</div>
      <div className={cn(LABEL_CELL, 'py-1', VERT_R)}>{right.label}</div>
      <div className={HEADER_VALUE}>{right.value}</div>
    </div>
  );
}

export function RasFindingCard({
  record,
  index,
  profile,
  glossary,
  standards,
  locations,
  categories,
  items,
}: {
  record: ProjectData;
  index: number;
  profile: ReportProfile;
  glossary: Glossary[];
  standards: MasterStandard[];
  locations: Location[];
  categories: Category[];
  items: Item[];
}) {
  const display = buildRasFindingCardDisplay(
    record,
    profile,
    glossary,
    standards,
    locations,
    categories,
    items
  );
  const metadataRows = buildRasFindingCardMetadataRows(display);
  const hasImages = display.imageUrls.length > 0;

  return (
    <div className={cn('flex items-stretch break-inside-avoid', OUTER)}>
      <div className={cn('flex w-12 shrink-0 flex-col items-center justify-start pt-2 font-black text-2xl', VERT_R)}>
        {index}
        <span className="mt-1 font-mono text-[8px] text-zinc-400 print:hidden">
          {record.fldPDataID?.slice(0, 8)}
        </span>
      </div>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div aria-hidden className={cn('pointer-events-none absolute bottom-0 left-32 top-0 z-10 w-0', VERT_R)} />

        {metadataRows.map((row, i) => {
          if (row.kind === 'pair') {
            return <FourColMetaRow key={`meta-${i}-${row.left.label}`} left={row.left} right={row.right} />;
          }
          return (
            <div key={`meta-${i}-location`} className={cn('flex min-w-0 shrink-0 items-center', HORIZ_B)}>
              <div className={cn(LABEL_CELL, 'py-1')}>{row.label}</div>
              <div className={HEADER_VALUE}>{row.value}</div>
            </div>
          );
        })}

        <div className={cn('flex shrink-0 items-stretch', HORIZ_B)}>
          <div className={cn(LABEL_CELL, 'py-2')}>Finding</div>
          <div className="flex min-h-0 flex-1 items-center whitespace-pre-line px-2 py-2 text-[11px] leading-snug">
            {display.findingText}
          </div>
          <div className={cn('flex shrink-0 flex-col self-stretch', LABEL_COL, VERT_L)}>
            <div className={cn('shrink-0 bg-zinc-50 px-2 py-1 text-center text-[9px] font-bold uppercase', HORIZ_B)}>
              Measurement
            </div>
            <div className="flex min-h-[2.5rem] flex-1 items-center justify-center p-2 text-xs font-bold">
              {display.measurementText}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center">
          <div className={cn(LABEL_CELL, 'py-2')}>Reference</div>
          <div className="flex min-h-0 flex-1 items-center px-2 py-2 text-xs font-bold">{display.referenceText}</div>
        </div>
      </div>

      <div className={cn('flex min-h-0 w-48 shrink-0 flex-col bg-zinc-900', VERT_L, !hasImages && 'hidden')}>
        {display.imageUrls.map((img, i) => (
          <div
            key={i}
            className={cn('h-32 shrink-0 overflow-hidden bg-white p-1', i === 0 && 'rounded-t-sm', i > 0 && HORIZ_T)}
          >
            <img
              src={img}
              className="h-full w-full rounded-sm object-cover"
              alt={display.imageAlts[i] || `${display.imageSingular} ${i + 1}`}
              referrerPolicy="no-referrer"
            />
          </div>
        ))}
        <div className={cn('min-h-0 flex-1 bg-zinc-50', HORIZ_T)} aria-hidden={true} />
      </div>
    </div>
  );
}
