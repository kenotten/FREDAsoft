import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import {
  formatTypicalRolesLabel,
  stakeholderMatchesTypicalRoles,
  tdlrContactTypeToTypicalRoles,
} from '../lib/tdlrTypicalRoleMapping';
import type { MockCanonicalStakeholder, MockStakeholderLinkReview } from '../types';

function stakeholderSearchHaystack(
  stakeholder: MockCanonicalStakeholder,
  review?: MockStakeholderLinkReview
): string {
  return [
    stakeholder.displayName,
    stakeholder.stakeholderType,
    stakeholder.typicalRoles?.join(' '),
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

function filterStakeholdersByQuery(
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
  /** TDLR #tblContacts Contact Type for the row under review. */
  tdlrRole: string;
  selectedStakeholderId?: string;
  suggestedStakeholderId?: string;
  onSelect: (stakeholderId: string) => void;
  triggerLabel?: string;
}

export function StakeholderManualSearch({
  stakeholders,
  review,
  tdlrRole,
  selectedStakeholderId,
  suggestedStakeholderId,
  onSelect,
  triggerLabel = 'Search FREDA stakeholders',
}: StakeholderManualSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [includeAllTypicalRoles, setIncludeAllTypicalRoles] = useState(false);

  const likelyTypicalRoles = useMemo(
    () => tdlrContactTypeToTypicalRoles(tdlrRole),
    [tdlrRole]
  );

  const roleFilteredStakeholders = useMemo(() => {
    if (includeAllTypicalRoles || !likelyTypicalRoles) {
      return stakeholders;
    }
    return stakeholders.filter((s) =>
      stakeholderMatchesTypicalRoles(s.typicalRoles, likelyTypicalRoles)
    );
  }, [stakeholders, includeAllTypicalRoles, likelyTypicalRoles]);

  const results = useMemo(
    () => filterStakeholdersByQuery(roleFilteredStakeholders, query, review),
    [roleFilteredStakeholders, query, review]
  );

  const helperCopy = includeAllTypicalRoles
    ? 'Showing all FREDA stakeholders for atypical role assignments.'
    : likelyTypicalRoles
      ? 'Showing FREDA stakeholders usually associated with this TDLR role.'
      : 'No typical-role mapping for this TDLR role — showing all FREDA stakeholders.';

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
              Mock FREDA stakeholder search
            </p>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-200 text-zinc-600">
              In-memory only — not saved
            </span>
          </div>

          <p className="text-xs text-zinc-600">
            TDLR role under review: <span className="font-medium text-zinc-900">{tdlrRole}</span>
          </p>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAllTypicalRoles}
              onChange={(e) => setIncludeAllTypicalRoles(e.target.checked)}
              className="mt-0.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-zinc-800">Include all typical roles</span>
          </label>

          <p className="text-xs text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-md px-2 py-1.5">
            {helperCopy}
          </p>

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, typical role, type, email, phone, address, notes…"
            className="w-full text-sm border border-zinc-200 rounded-md px-3 py-2 bg-white text-zinc-900"
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {results.length === 0 ? (
              <p className="text-xs text-zinc-500 py-2">
                No mock stakeholders match this search
                {!includeAllTypicalRoles && likelyTypicalRoles
                  ? ' within the likely typical roles.'
                  : '.'}{' '}
                {!includeAllTypicalRoles && (
                  <span className="text-indigo-700">
                    Turn on &ldquo;Include all typical roles&rdquo; for atypical assignments.
                  </span>
                )}
              </p>
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
                          Suggested FREDA stakeholder
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-100 text-green-800">
                          Selected FREDA stakeholder
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      Typical role(s): {formatTypicalRolesLabel(s.typicalRoles)} ·{' '}
                      {s.stakeholderType} · {s.entityKind === 'entity' ? 'Entity' : 'Person'}
                      {s.email ? ` · ${s.email}` : ''}
                    </p>
                  </button>
                );
              })
            )}
          </div>
          <p className="text-[10px] text-zinc-400">
            Selecting a row applies a manual staff selection for this TDLR data row (mock session
            only). FREDA project role is assigned separately on this project.
          </p>
        </div>
      )}
    </div>
  );
}
