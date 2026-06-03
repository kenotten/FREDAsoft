import React from 'react';
import { Card } from '../ui/core';
import { cn, formatCurrency, formatMeasurement } from '../../lib/utils';
import type { WebReportRecordView } from '../../lib/webReportTree';

/** Header record # width + category meta label width; body label column matches their sum so border-r aligns with the category value cell. */
const WR_CARD_RECORD_NUM_W = 'w-10';
const WR_CARD_HEADER_META_LABEL_W = 'w-20';
const WR_CARD_BODY_LABEL_W = 'w-[7.5rem]';

const WR_CARD_LABEL_CELL = cn(
  'flex shrink-0 items-center self-stretch border-r border-zinc-200 bg-zinc-50 px-2 py-2 text-[9px] font-bold uppercase text-zinc-500',
  WR_CARD_BODY_LABEL_W
);

export function WebReportFindingCard({
  view,
  reportNumber
}: {
  view: WebReportRecordView;
  reportNumber: number | null;
}) {
  const { record } = view;
  const images = Array.isArray(record.fldImages) ? record.fldImages.slice(0, 2) : [];

  return (
    <Card className="overflow-hidden border border-zinc-200">
      <div className="flex flex-col items-stretch md:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex items-stretch border-b border-zinc-200 bg-zinc-50 text-[10px] font-bold uppercase tracking-wider">
            <div
              className={cn(
                'flex shrink-0 items-center justify-center border-r border-zinc-200 text-lg font-black text-zinc-900',
                WR_CARD_RECORD_NUM_W
              )}
            >
              {reportNumber ?? '—'}
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-px bg-zinc-200">
              <div className="flex bg-white">
                <span
                  className={cn(
                    'shrink-0 border-r border-zinc-200 px-2 py-1.5 text-zinc-500',
                    WR_CARD_HEADER_META_LABEL_W
                  )}
                >
                  Category
                </span>
                <span className="min-w-0 flex-1 truncate bg-zinc-900 px-2 py-1.5 text-white">
                  {view.categoryName}
                </span>
              </div>
              <div className="flex bg-white">
                <span className="w-16 shrink-0 border-r border-zinc-200 px-2 py-1.5 text-zinc-500">Item</span>
                <span className="min-w-0 flex-1 truncate bg-zinc-900 px-2 py-1.5 text-white">
                  {view.itemName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-stretch border-b border-zinc-200 text-xs">
            <div className={WR_CARD_LABEL_CELL}>Location</div>
            <span className="flex min-w-0 flex-1 items-center truncate px-2 py-2 font-medium text-zinc-900">
              {view.locationName}
            </span>
            <span className="flex shrink-0 items-center px-3 py-2 text-xs font-bold text-blue-600">
              Est. {formatCurrency(record.totalCost ?? 0)}
            </span>
          </div>

          <div className="flex items-stretch border-b border-zinc-200">
            <div className={WR_CARD_LABEL_CELL}>Finding</div>
            <div className="flex min-h-0 min-w-0 flex-1 items-center px-2 py-2 text-[11px] leading-snug text-zinc-800 whitespace-pre-line">
              {record.fldFindLong || view.findingShort}
            </div>
            <div className="w-28 shrink-0 border-l border-zinc-200 bg-zinc-50 text-center">
              <div className="border-b border-zinc-200 px-1 py-1 text-[9px] font-bold uppercase text-zinc-500">
                Measurement
              </div>
              <div className="px-1 py-2 text-xs font-bold">
                {formatMeasurement(record.fldMeasurement, record.fldMeasurementUnit || record.fldUnitType)}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 items-stretch border-b border-zinc-200">
            <div className={WR_CARD_LABEL_CELL}>Recommendation</div>
            <div className="flex min-h-0 min-w-0 flex-1 items-center px-2 py-2 text-[11px] leading-snug text-zinc-800 whitespace-pre-line">
              {record.fldRecLong || record.fldRecShort}
            </div>
          </div>

          {view.citationsLabel ? (
            <div className="flex shrink-0 items-stretch">
              <div className={WR_CARD_LABEL_CELL}>Reference</div>
              <div className="flex min-h-0 min-w-0 flex-1 items-center px-2 py-2 text-xs font-semibold text-zinc-700">
                {view.citationsLabel}
              </div>
            </div>
          ) : null}
        </div>

        {images.length > 0 ? (
          <div
            className={cn(
              'flex w-full shrink-0 self-stretch border-l border-zinc-200 md:w-44',
              'min-h-0'
            )}
          >
            <div className="flex w-full flex-row gap-px self-start bg-zinc-200 md:flex-col">
              {images.map((url, i) => (
                <div key={i} className="h-28 flex-1 overflow-hidden bg-white p-1 md:h-32 md:flex-none">
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
