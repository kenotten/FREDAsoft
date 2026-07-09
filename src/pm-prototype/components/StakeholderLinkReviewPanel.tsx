import React from 'react';
import { AlertCircle, Link2, UserPlus, Clock, Ban } from 'lucide-react';
import { Card } from '../../components/ui/core';
import { StakeholderManualSearch } from './StakeholderManualSearch';
import {
  STAKEHOLDER_REVIEW_DECISION_LABELS,
  type MockCanonicalStakeholder,
  type MockStakeholderLinkReview,
  type MockTabsContactRow,
  type StakeholderReviewDecision,
} from '../types';

const DECISION_BADGE_CLASS: Record<StakeholderReviewDecision, string> = {
  unreviewed: 'bg-amber-100 text-amber-900 border-amber-200',
  linked: 'bg-green-100 text-green-900 border-green-200',
  'linked-manually': 'bg-teal-100 text-teal-900 border-teal-200',
  'create-draft': 'bg-violet-100 text-violet-900 border-violet-200',
  deferred: 'bg-slate-100 text-slate-700 border-slate-200',
  rejected: 'bg-red-100 text-red-900 border-red-200',
};

const CONFIDENCE_LABEL: Record<MockStakeholderLinkReview['confidence'], string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
  none: 'No match',
};

function StakeholderCard({
  stakeholder,
  label,
  badge,
  muted = false,
  matchLine,
}: {
  stakeholder: MockCanonicalStakeholder;
  label: string;
  badge?: string;
  muted?: boolean;
  matchLine?: string;
}) {
  return (
    <div
      className={`p-3 rounded-lg border ${
        muted ? 'bg-zinc-50 border-zinc-200' : 'bg-white border-indigo-200'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">{label}</p>
        {badge && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
            {badge}
          </span>
        )}
      </div>
      <p className={`font-semibold ${muted ? 'text-zinc-700' : 'text-zinc-900'}`}>
        {stakeholder.displayName}
      </p>
      <p className="text-xs text-zinc-600 mt-1">
        Type: {stakeholder.stakeholderType} ·{' '}
        {stakeholder.entityKind === 'entity' ? 'Entity' : 'Person'}
      </p>
      {(stakeholder.email || stakeholder.phone) && (
        <p className="text-xs text-zinc-500 mt-1">
          {[stakeholder.email, stakeholder.phone].filter(Boolean).join(' · ')}
        </p>
      )}
      {stakeholder.address && (
        <p className="text-xs text-zinc-500 mt-0.5">{stakeholder.address}</p>
      )}
      {matchLine && <p className="text-xs text-indigo-800 mt-2">{matchLine}</p>}
    </div>
  );
}

interface StakeholderLinkReviewPanelProps {
  contactRow: MockTabsContactRow;
  review: MockStakeholderLinkReview | undefined;
  suggestedStakeholder: MockCanonicalStakeholder | undefined;
  selectedStakeholder: MockCanonicalStakeholder | undefined;
  allStakeholders: MockCanonicalStakeholder[];
  onSetDecision: (reviewId: string, decision: StakeholderReviewDecision) => void;
  onUpdateNote: (reviewId: string, note: string) => void;
  onSelectStakeholderManually: (reviewId: string, stakeholderId: string) => void;
}

export function StakeholderLinkReviewPanel({
  contactRow,
  review,
  suggestedStakeholder,
  selectedStakeholder,
  allStakeholders,
  onSetDecision,
  onUpdateNote,
  onSelectStakeholderManually,
}: StakeholderLinkReviewPanelProps) {
  const hasSuggestion = Boolean(review?.suggestedStakeholderId && suggestedStakeholder);
  const hasSelection = Boolean(review?.candidateStakeholderId && selectedStakeholder);
  const overrideActive =
    hasSuggestion &&
    hasSelection &&
    review!.suggestedStakeholderId !== review!.candidateStakeholderId;
  const isManualLink = review?.reviewDecision === 'linked-manually';
  const linkedToSuggested =
    review?.reviewDecision === 'linked' && hasSuggestion && !overrideActive;
  const showSelectedCard = hasSelection && (isManualLink || overrideActive);
  const showSuggestedCard = hasSuggestion && !showSelectedCard;
  const suggestedBadge = linkedToSuggested
    ? 'Linked to suggested FREDA stakeholder'
    : 'Suggested FREDA stakeholder';

  return (
    <Card className="p-4 border border-indigo-100 bg-indigo-50/30">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-amber-100 text-amber-900 border border-amber-200">
          TDLR data row
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-zinc-200 text-zinc-600">
          Mock only — not saved
        </span>
        {review && (
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ml-auto ${DECISION_BADGE_CLASS[review.reviewDecision]}`}
          >
            Staff review decision: {STAKEHOLDER_REVIEW_DECISION_LABELS[review.reviewDecision]}
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3 text-sm mb-4 p-3 rounded-lg bg-white border border-amber-100">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">TDLR role</p>
          <p className="font-medium text-zinc-900 mt-0.5">{contactRow.contactType}</p>
          <p className="text-[10px] text-zinc-500 mt-1">
            Role shown in TDLR data — not the FREDA project role.
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Name</p>
          <p className="font-medium text-zinc-900 mt-0.5">{contactRow.name}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Contact or Professional Name
          </p>
          <p className="font-medium text-zinc-900 mt-0.5">
            {contactRow.contactOrProfessionalName || '—'}
          </p>
        </div>
      </div>

      {!review ? (
        <p className="text-sm text-zinc-500 flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          No mock stakeholder review configured for this TDLR data row.
        </p>
      ) : (
        <>
          {showSelectedCard ? (
            <div className="mb-3">
              <StakeholderCard
                stakeholder={selectedStakeholder!}
                label="Selected FREDA stakeholder"
                badge="Manual staff selection"
              />
            </div>
          ) : null}

          {showSuggestedCard ? (
            <div className="mb-4">
              <StakeholderCard
                stakeholder={suggestedStakeholder!}
                label="Suggested FREDA stakeholder"
                badge={suggestedBadge}
                matchLine={`${CONFIDENCE_LABEL[review.confidence]} — ${review.matchReason}`}
              />
            </div>
          ) : null}

          {overrideActive && hasSuggestion ? (
            <div className="mb-4">
              <StakeholderCard
                stakeholder={suggestedStakeholder!}
                label="Suggested FREDA stakeholder"
                badge="Suggested FREDA stakeholder — overridden"
                muted
                matchLine={`${CONFIDENCE_LABEL[review.confidence]} — ${review.matchReason}`}
              />
              <p className="text-xs text-amber-800 mt-2">
                Staff overrode the suggested FREDA stakeholder — original suggestion shown for
                reference.
              </p>
            </div>
          ) : null}

          {!hasSuggestion && !showSelectedCard ? (
            <div className="mb-4 p-3 rounded-lg bg-white border border-violet-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 mb-1">
                Suggested FREDA stakeholder
              </p>
              <p className="text-sm text-zinc-600">
                No suggested FREDA stakeholder. Search FREDA stakeholders or create a FREDA
                stakeholder draft.
              </p>
              <p className="text-xs text-violet-800 mt-2">
                {CONFIDENCE_LABEL[review.confidence]} — {review.matchReason}
              </p>
            </div>
          ) : null}

          <StakeholderManualSearch
            stakeholders={allStakeholders}
            review={review}
            tdlrRole={contactRow.contactType}
            selectedStakeholderId={review.candidateStakeholderId}
            suggestedStakeholderId={review.suggestedStakeholderId}
            onSelect={(id) => onSelectStakeholderManually(review.id, id)}
            triggerLabel={
              hasSuggestion || hasSelection
                ? 'Find different FREDA stakeholder'
                : 'Search FREDA stakeholders'
            }
          />

          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              disabled={!hasSuggestion}
              onClick={() => onSetDecision(review.id, 'linked')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Link2 size={14} />
              Link to suggested FREDA stakeholder
            </button>
            <button
              type="button"
              onClick={() => onSetDecision(review.id, 'create-draft')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-violet-600 text-white hover:bg-violet-700"
            >
              <UserPlus size={14} />
              Create FREDA stakeholder draft
            </button>
            <button
              type="button"
              onClick={() => onSetDecision(review.id, 'deferred')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-600 text-white hover:bg-slate-700"
            >
              <Clock size={14} />
              Defer
            </button>
            <button
              type="button"
              onClick={() => onSetDecision(review.id, 'rejected')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-red-600 text-white hover:bg-red-700"
            >
              <Ban size={14} />
              Reject TDLR data match
            </button>
          </div>

          <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
            Review note (mock)
          </label>
          <textarea
            className="w-full text-sm border border-zinc-200 rounded-md px-3 py-2 bg-white text-zinc-900 resize-y min-h-[60px]"
            value={review.reviewNote}
            onChange={(e) => onUpdateNote(review.id, e.target.value)}
            placeholder="Staff review note — session only"
          />
        </>
      )}
    </Card>
  );
}
