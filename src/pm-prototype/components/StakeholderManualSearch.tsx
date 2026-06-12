import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import type { MockCanonicalStakeholder, MockStakeholderLinkReview } from '../types';

function stakeholderSearchHaystack(
  stakeholder: MockCanonicalStakeholder,
  review?: MockStakeholderLinkReview
): string {
  return [
    stakeholder.displayName,
    stakeholder.stakeholderType,
    stakeholder.entityKind,
    stakeholder.email,
    stakeholder.phone,
    stakeholder.address,
    stakeholder.directoryNotes,
    review?.matchReason,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function filterStakeholders(
  stakeholders: MockCanonicalStakeholder[],
  query: string,
  review?: MockStakeholderLinkReview
): MockCanonicalStakeholder[] {
  const q = query.trim().toLowerCase();
  if (!q) return stakeholders;
  return stakeholders.filter((s) => stakeholderSearchHaystack(s, review).includes(q));
}

interface StakeholderManualSearchProps {
  stakeholders: MockCanonicalStakeholder[];
  review: MockStakeholderLinkReview;
  selectedStakeholderId?: string;
  suggestedStakeholderId?: string;
  onSelect: (stakeholderId: string) => void;
  triggerLabel?: string;
}

export function StakeholderManualSearch({
  stakeholders,
  review,
  selectedStakeholderId,
  suggestedStakeholderId,
  onSelect,
  triggerLabel = 'Search canonical stakeholders',
}: StakeholderManualSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const results = useMemo(
    () => filterStakeholders(stakeholders, query, review),
    [stakeholders, query, review]
  );

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-indigo-300 bg-white text-indigo-800 hover:bg-indigo-50"
      >
        <Search size={14} />
        {triggerLabel}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="mt-2 p-3 rounded-lg bg-white border border-indigo-200 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              Mock canonical stakeholder search
            </p>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-200 text-zinc-600">
              In-memory only — not saved
            </span>
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, type, email, phone, address, notes…"
            className="w-full text-sm border border-zinc-200 rounded-md px-3 py-2 bg-white text-zinc-900"
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {results.length === 0 ? (
              <p className="text-xs text-zinc-500 py-2">No mock stakeholders match this search.</p>
            ) : (
              results.map((s) => {
                const isSelected = s.id === selectedStakeholderId;
                const isSuggested = s.id === suggestedStakeholderId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onSelect(s.id);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md border text-sm transition-colors ${
                      isSelected
                        ? 'border-green-400 bg-green-50'
                        : 'border-zinc-100 hover:border-indigo-200 hover:bg-indigo-50/50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-zinc-900">{s.displayName}</span>
                      {isSuggested && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                          Suggested
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-100 text-green-800">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {s.stakeholderType} · {s.entityKind === 'entity' ? 'Entity' : 'Person'}
                      {s.email ? ` · ${s.email}` : ''}
                    </p>
                  </button>
                );
              })
            )}
          </div>
          <p className="text-[10px] text-zinc-400">
            Selecting a row applies a manual staff selection for this TABS source row (mock session
            only).
          </p>
        </div>
      )}
    </div>
  );
}
