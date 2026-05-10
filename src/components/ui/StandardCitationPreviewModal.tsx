import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import type { MasterStandard } from '../../types';
import { formatStandardCitationLabel } from '../../lib/standardCitationLabel';
import { cn } from '../../lib/utils';

export interface StandardCitationPreviewModalProps {
  standard: MasterStandard | null;
  storedId?: string;
  onClose: () => void;
}

function field(value: string | undefined | null): string {
  const t = String(value ?? '').trim();
  return t;
}

/**
 * Read-only full citation preview. Close: X, Close button, Escape, backdrop.
 */
export function StandardCitationPreviewModal({
  standard,
  storedId,
  onClose
}: StandardCitationPreviewModalProps) {
  const idTrim = String(storedId ?? '').trim();
  if (!standard && !idTrim) return null;

  const label = standard ? formatStandardCitationLabel(standard) : undefined;
  const heading = label?.trim() || idTrim || 'Citation preview';

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const missing = !standard;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="citation-preview-title"
      className="fixed inset-0 z-[201] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cn(
          'relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl',
          'ring-1 ring-zinc-200'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id="citation-preview-title" className="text-lg font-bold text-zinc-900">
              {heading}
            </h2>
            {standard?.fldIsArchived ? (
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Archived
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            aria-label="Close citation preview"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {missing ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-600">
                This citation ID is not in the current standards library.
              </p>
              <p className="font-mono text-xs text-zinc-800 break-all">{idTrim}</p>
            </div>
          ) : (
            <div className="space-y-5">
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                {field(standard.citation_name) ? (
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Citation name</dt>
                    <dd className="mt-0.5 font-medium text-zinc-900">{field(standard.citation_name)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Relation type</dt>
                  <dd className="mt-0.5 text-zinc-800">{field(standard.relation_type) || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Standard type</dt>
                  <dd className="mt-0.5 text-zinc-800">{field(standard.fldStandardType) || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Standard version</dt>
                  <dd className="mt-0.5 text-zinc-800">{field(standard.fldStandardVersion) || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Chapter</dt>
                  <dd className="mt-0.5 text-zinc-800">{field(standard.chapter_name) || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Section</dt>
                  <dd className="mt-0.5 text-zinc-800">
                    {[field(standard.section_num), field(standard.section_name)].filter(Boolean).join(' · ') || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Citation #</dt>
                  <dd className="mt-0.5 font-mono text-zinc-800">{field(standard.citation_num) || '—'}</dd>
                </div>
              </dl>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Full text</div>
                <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm leading-relaxed text-zinc-900 whitespace-pre-wrap break-words">
                  {field(standard.content_text) ? standard.content_text : (
                    <span className="italic text-zinc-500">No body text for this citation.</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-zinc-100 bg-zinc-50/50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
