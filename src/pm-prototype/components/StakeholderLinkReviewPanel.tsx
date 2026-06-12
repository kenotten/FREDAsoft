import React from 'react';
import { AlertCircle, Link2, UserPlus, Clock, Ban } from 'lucide-react';
import { Card } from '../../components/ui/core';
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

interface StakeholderLinkReviewPanelProps {
  contactRow: MockTabsContactRow;
  review: MockStakeholderLinkReview | undefined;
  candidate: MockCanonicalStakeholder | undefined;
  onSetDecision: (reviewId: string, decision: StakeholderReviewDecision) => void;
  onUpdateNote: (reviewId: string, note: string) => void;
}

export function StakeholderLinkReviewPanel({
  contactRow,
  review,
  candidate,
  onSetDecision,
  onUpdateNote,
}: StakeholderLinkReviewPanelProps) {
  return (
    <Card className="p-4 border border-indigo-100 bg-indigo-50/30">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-amber-100 text-amber-900 border border-amber-200">
          TABS source row
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
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Contact Type</p>
          <p className="font-medium text-zinc-900 mt-0.5">{contactRow.contactType}</p>
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
          No mock stakeholder review configured for this source row.
        </p>
      ) : (
        <>
          {candidate ? (
            <div className="mb-4 p-3 rounded-lg bg-white border border-indigo-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 mb-2">
                Canonical stakeholder candidate
              </p>
              <p className="font-semibold text-zinc-900">{candidate.displayName}</p>
              <p className="text-xs text-zinc-600 mt-1">
                Type: {candidate.stakeholderType} ·{' '}
                {candidate.entityKind === 'entity' ? 'Entity' : 'Person'}
              </p>
              {(candidate.email || candidate.phone) && (
                <p className="text-xs text-zinc-500 mt-1">
                  {[candidate.email, candidate.phone].filter(Boolean).join(' · ')}
                </p>
              )}
              {candidate.address && (
                <p className="text-xs text-zinc-500 mt-0.5">{candidate.address}</p>
              )}
              <p className="text-xs text-indigo-800 mt-2">
                {CONFIDENCE_LABEL[review.confidence]} — {review.matchReason}
              </p>
            </div>
          ) : (
            <div className="mb-4 p-3 rounded-lg bg-white border border-violet-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 mb-1">
                Canonical stakeholder candidate
              </p>
              <p className="text-sm text-zinc-600">No directory candidate — staff may create draft.</p>
              <p className="text-xs text-violet-800 mt-2">
                {CONFIDENCE_LABEL[review.confidence]} — {review.matchReason}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              disabled={!candidate}
              onClick={() => onSetDecision(review.id, 'linked')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Link2 size={14} />
              Link to candidate
            </button>
            <button
              type="button"
              onClick={() => onSetDecision(review.id, 'create-draft')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-violet-600 text-white hover:bg-violet-700"
            >
              <UserPlus size={14} />
              Create new stakeholder draft
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
              Reject source match
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
