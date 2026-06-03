import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../ui/core';
import { cn } from '../../lib/utils';
import {
  AUDIT_WARNING_CATEGORIES,
  AUDIT_WARNING_CATEGORY_ORDER,
  AUDIT_WARNING_LABELS,
  CONTENT_AUDIT_WARNING_CODES,
  isWarningTypeRecordFilterActive,
  type AuditWarningCategoryId,
  type AuditWarningCode,
} from '../../lib/projectAuditReport';

export function categoryCodes(categoryId: AuditWarningCategoryId): readonly AuditWarningCode[] {
  return AUDIT_WARNING_CATEGORIES[categoryId].codes;
}

export function categorySelectionState(
  categoryId: AuditWarningCategoryId,
  enabledCodes: ReadonlySet<AuditWarningCode>
): 'all' | 'none' | 'partial' {
  const codes = categoryCodes(categoryId);
  const enabled = codes.filter((c) => enabledCodes.has(c)).length;
  if (enabled === 0) return 'none';
  if (enabled === codes.length) return 'all';
  return 'partial';
}

export function ProjectAuditWarningFilterPanel({
  enabledCodes,
  hideCustomLinkageNoise,
  warningPanelOpen,
  warningCodesCleared,
  onTogglePanel,
  onSelectAll,
  onClearAll,
  onResetDefaults,
  onToggleCategory,
  onToggleCode,
  onHideCustomLinkageNoiseChange,
}: {
  enabledCodes: ReadonlySet<AuditWarningCode>;
  hideCustomLinkageNoise: boolean;
  warningPanelOpen: boolean;
  warningCodesCleared: boolean;
  onTogglePanel: () => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onResetDefaults: () => void;
  onToggleCategory: (categoryId: AuditWarningCategoryId) => void;
  onToggleCode: (code: AuditWarningCode) => void;
  onHideCustomLinkageNoiseChange: (checked: boolean) => void;
}) {
  return (
    <div className="border-t border-zinc-200 pt-4">
      <button
        type="button"
        onClick={onTogglePanel}
        className="flex w-full items-center gap-2 text-left text-xs font-bold uppercase tracking-wide text-zinc-500 hover:text-zinc-800"
      >
        {warningPanelOpen ? (
          <ChevronDown size={14} className="shrink-0" />
        ) : (
          <ChevronRight size={14} className="shrink-0" />
        )}
        Warning filters
        {isWarningTypeRecordFilterActive({ enabledCodes, hideCustomLinkageNoise: false }) ||
        hideCustomLinkageNoise ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black normal-case text-amber-900">
            Active
          </span>
        ) : warningCodesCleared ? (
          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[9px] font-black normal-case text-zinc-700">
            Badges hidden
          </span>
        ) : null}
      </button>

      {warningPanelOpen ? (
        <div className="mt-3 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onSelectAll}>
              Select all
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={onClearAll}>
              Clear all
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={onResetDefaults}>
              Reset defaults
            </Button>
          </div>

          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-800">
            <input
              type="checkbox"
              checked={hideCustomLinkageNoise}
              onChange={(e) => onHideCustomLinkageNoiseChange(e.target.checked)}
              className="mt-0.5 rounded border-zinc-300"
            />
            <span className="leading-snug">
              <span className="font-semibold">Hide expected custom/unassigned noise</span>
              <span className="mt-0.5 block text-[10px] text-zinc-500">
                Hides expected metadata badges on custom records with report snapshots (IDs, glossary row,
                missing masters), and group consistency badges on Unassigned groups. Report-content
                warnings are never hidden. Warnings are still generated.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            {AUDIT_WARNING_CATEGORY_ORDER.map((categoryId) => {
              const cat = AUDIT_WARNING_CATEGORIES[categoryId];
              const state = categorySelectionState(categoryId, enabledCodes);
              return (
                <button
                  key={categoryId}
                  type="button"
                  onClick={() => onToggleCategory(categoryId)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-[10px] font-bold transition-colors',
                    state === 'all'
                      ? categoryId === 'report_content'
                        ? 'border-rose-300 bg-rose-50 text-rose-950'
                        : 'border-amber-300 bg-amber-50 text-amber-950'
                      : state === 'partial'
                        ? 'border-zinc-300 bg-zinc-100 text-zinc-700'
                        : 'border-zinc-200 bg-white text-zinc-500'
                  )}
                  title={`Toggle all ${cat.label} warning types`}
                >
                  {cat.label}
                  {state === 'partial' ? ' (partial)' : ''}
                </button>
              );
            })}
          </div>

          {warningCodesCleared ? (
            <p className="text-[11px] leading-snug text-amber-900">
              All warning types are unchecked — warning badges are hidden. Records and groups are still
              shown. Use Select all or Reset defaults to restore badges.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AUDIT_WARNING_CATEGORY_ORDER.map((categoryId) => {
              const cat = AUDIT_WARNING_CATEGORIES[categoryId];
              return (
                <fieldset
                  key={categoryId}
                  className={cn(
                    'rounded-lg border p-3',
                    categoryId === 'report_content' ? 'border-rose-200 bg-rose-50/30' : 'border-zinc-200'
                  )}
                >
                  <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    {cat.label}
                  </legend>
                  <ul className="mt-2 space-y-1.5">
                    {cat.codes.map((code) => (
                      <li key={code}>
                        <label className="flex cursor-pointer items-start gap-2 text-xs text-zinc-800">
                          <input
                            type="checkbox"
                            checked={enabledCodes.has(code)}
                            onChange={() => onToggleCode(code)}
                            className={cn(
                              'mt-0.5 rounded',
                              CONTENT_AUDIT_WARNING_CODES.has(code)
                                ? 'border-rose-300 text-rose-700'
                                : 'border-zinc-300'
                            )}
                          />
                          <span className="leading-snug">{AUDIT_WARNING_LABELS[code] || code}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
