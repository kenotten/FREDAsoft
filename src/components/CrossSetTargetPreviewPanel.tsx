import { ShieldCheck } from 'lucide-react';
import {
  formatCrossSetMasterActionLabel,
  type CrossSetTargetPreviewResult,
} from '../lib/crossSetTargetPreview';

type Props = {
  preview: CrossSetTargetPreviewResult;
};

export function CrossSetTargetPreviewPanel({ preview }: Props) {
  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-3 text-[11px] leading-snug text-indigo-950 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck size={14} className="shrink-0 text-indigo-600" />
        <p className="font-bold uppercase tracking-wider text-[10px] text-indigo-800">
          Cross-Set Preview — Dry Run (no records created)
        </p>
      </div>

      {preview.kind === 'inactive' ? (
        <p className="text-indigo-900">{preview.reason}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-md border border-indigo-100 bg-white/70 p-2 space-y-1">
              <p className="font-bold text-[10px] uppercase text-indigo-700">Source</p>
              <p>
                <span className="text-indigo-600">Set:</span> {preview.source.glossarySetLabel}
              </p>
              <p>
                <span className="text-indigo-600">Category / Item:</span>{' '}
                {preview.source.categoryName} / {preview.source.itemName}
              </p>
              <p>
                <span className="text-indigo-600">Finding:</span> {preview.source.findingShort}{' '}
                <span className="font-mono text-[9px] text-indigo-500">
                  ({preview.source.findingId})
                </span>
              </p>
              <p>
                <span className="text-indigo-600">Recommendation:</span>{' '}
                {preview.source.recommendationShort}{' '}
                <span className="font-mono text-[9px] text-indigo-500">
                  ({preview.source.recommendationId})
                </span>
              </p>
              <p>
                <span className="text-indigo-600">Glossary row:</span>{' '}
                <span className="font-mono text-[9px]">{preview.source.glossaryRowId}</span>
              </p>
            </div>

            <div className="rounded-md border border-indigo-100 bg-white/70 p-2 space-y-1">
              <p className="font-bold text-[10px] uppercase text-indigo-700">Target</p>
              <p>
                <span className="text-indigo-600">Set:</span> {preview.target.glossarySetLabel}
              </p>
              <p>
                <span className="text-indigo-600">Category / Item:</span>{' '}
                {preview.target.categoryName} / {preview.target.itemName}
              </p>
              <p>
                <span className="text-indigo-600">Finding:</span>{' '}
                {formatCrossSetMasterActionLabel(preview.target.finding)}
              </p>
              <p>
                <span className="text-indigo-600">Recommendation:</span>{' '}
                {formatCrossSetMasterActionLabel(preview.target.recommendation)}
              </p>
              <p>
                <span className="text-indigo-600">Five-tuple:</span> {preview.target.fiveTuple.message}
                {preview.target.fiveTuple.existingGlosId ? (
                  <span className="font-mono text-[9px]">
                    {' '}
                    ({preview.target.fiveTuple.existingGlosId})
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="rounded-md border border-indigo-100 bg-white/60 p-2 space-y-1">
            <p className="font-bold text-[10px] uppercase text-indigo-700">Standards & images</p>
            <p>{preview.standards.proposedGlossaryStandardsSummary}</p>
            <p>
              No cross-set citation copy. Source glossary row has{' '}
              {preview.source.glossaryRowStandardCount} citation(s) — not copied. New target masters:{' '}
              {preview.standards.newMasterFindingStandards} / {preview.standards.newMasterRecStandards}.
            </p>
            <p>{preview.images.summary}</p>
          </div>

          {preview.blockingErrors.length > 0 ? (
            <ul className="list-disc pl-4 text-red-800 space-y-0.5">
              {preview.blockingErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          ) : (
            <p className="text-emerald-800 font-medium">
              No blocking conflicts detected for Prepare Target Set Records (preview only).
            </p>
          )}

          <p className="text-[10px] text-indigo-700 italic">
            Prepare Target Set Records still performs real writes. This panel does not save anything.
            Create Related Record → Cross-set Continue remains info-only.
          </p>
        </>
      )}
    </div>
  );
}
