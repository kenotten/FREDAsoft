/**
 * Shared Plan Review / Inspection RAS cover (Slice B).
 * Compact paired OCG table. Consumes Slice A view-model display strings.
 */

import React from 'react';
// @ts-ignore
import ocgLogoNew from '../../Assets/ocglogonew.jpg';
import type { ReportViewModel } from '../../lib/reportAdapter';
import {
  buildRasCoverDisplayModel,
  buildRasCoverLayout,
  type RasCoverLabeledValue,
} from '../../lib/rasReportCoverDisplay';

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="bg-black text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest">
        {title}
      </div>
      <div className="border border-zinc-200 divide-y divide-zinc-100">{children}</div>
    </div>
  );
}

function FieldCell({ label, value, wrap }: RasCoverLabeledValue & { wrap?: boolean }) {
  return (
    <div className="flex items-start text-xs py-1 px-3 min-w-0">
      <span className="w-[7.25rem] shrink-0 font-bold text-zinc-900">{label}</span>
      <span className={`text-zinc-700 min-w-0 ${wrap ? 'whitespace-pre-wrap' : ''}`}>{value}</span>
    </div>
  );
}

function PairRow({ left, right }: { left: RasCoverLabeledValue; right: RasCoverLabeledValue }) {
  return (
    <div className="grid grid-cols-2 divide-x divide-zinc-100">
      <FieldCell label={left.label} value={left.value} />
      <FieldCell label={right.label} value={right.value} />
    </div>
  );
}

function SpanRow({ label, value, wrap }: RasCoverLabeledValue & { wrap?: boolean }) {
  return <FieldCell label={label} value={value} wrap={wrap} />;
}

function LayoutRows({
  rows,
  rowKey,
}: {
  rows: ReturnType<typeof buildRasCoverLayout>['projectInformation'];
  rowKey: string;
}) {
  return (
    <>
      {rows.map((row, i) => {
        if (row.kind === 'pair') {
          return <PairRow key={`${rowKey}-${i}`} left={row.left} right={row.right} />;
        }
        return (
          <SpanRow
            key={`${rowKey}-${i}`}
            label={row.label}
            value={row.value}
            wrap={row.wrap}
          />
        );
      })}
    </>
  );
}

export function RasReportCover({ viewModel }: { viewModel: ReportViewModel }) {
  const display = buildRasCoverDisplayModel(viewModel);
  if (!display) return null;
  const layout = buildRasCoverLayout(display);

  return (
    <>
      <div className="absolute top-[203px] left-0 right-0 flex justify-center pointer-events-none z-10">
        <div className="text-[18.6px] font-semibold text-zinc-900 uppercase tracking-tight text-center max-w-[80%]">
          {display.heroProjectName}
        </div>
      </div>
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-start mb-14">
          <div className="flex gap-6">
            <div className="w-32 h-32 bg-blue-900 flex items-center justify-center overflow-hidden">
              <img
                src={ocgLogoNew}
                alt="OCG Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
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
            <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">{display.title}</h2>
            <p className="text-sm font-bold text-zinc-700 mt-2">{display.standardsLine}</p>
          </div>
        </div>
        <div className="space-y-5">
          <ReportSection title="OCG INFORMATION">
            {layout.ocgInformation.map((row, i) => (
              <PairRow key={`ocg-${i}`} left={row.left} right={row.right} />
            ))}
          </ReportSection>
          <ReportSection title="PROJECT INFORMATION">
            <LayoutRows rows={layout.projectInformation} rowKey="proj" />
          </ReportSection>
          <ReportSection title="OWNER INFORMATION">
            <LayoutRows rows={layout.ownerInformation} rowKey="own" />
          </ReportSection>
        </div>
      </div>
    </>
  );
}
