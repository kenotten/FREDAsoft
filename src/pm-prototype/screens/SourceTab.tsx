import React from 'react';
import { AlertTriangle, Link2 } from 'lucide-react';
import { Button, Card } from '../../components/ui/core';
import { useMockPm } from '../state/MockPmContext';
import { PARTY_ROLE_LABELS, type MockTdlrSourceSnapshot } from '../types';

interface SourceTabProps {
  projectId: string;
  snapshot: MockTdlrSourceSnapshot | undefined;
}

export function SourceTab({ projectId, snapshot }: SourceTabProps) {
  const { approveCandidateLink } = useMockPm();

  if (!snapshot) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 text-sm text-zinc-600">
          No TDLR/TABS source snapshot for this mock project yet. Add a TABS # at intake or use a
          fixture project that includes source data (e.g. Riverside Medical Annex).
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-300 flex gap-3 text-sm text-amber-950">
        <AlertTriangle size={20} className="shrink-0 mt-0.5" />
        <p>
          <strong>Source values are as-recorded TDLR/TABS data.</strong> They do not overwrite
          FREDAsoft canonical parties. Review candidate links separately.
        </p>
      </div>

      <Card className="p-5 bg-amber-50/40 border-amber-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-amber-950 uppercase tracking-wider">
            TDLR Source Snapshot (read-only mock)
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-amber-200 text-amber-900">
            SOURCE ONLY
          </span>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs font-semibold text-amber-800 uppercase">TABS #</dt>
            <dd className="mt-1 font-mono font-medium">{snapshot.tabsNumber}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-amber-800 uppercase">Captured at</dt>
            <dd className="mt-1">{new Date(snapshot.capturedAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-amber-800 uppercase">Registrant</dt>
            <dd className="mt-1">{snapshot.asRecorded.registrantName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-amber-800 uppercase">
              Owner (as recorded)
            </dt>
            <dd className="mt-1 font-medium">{snapshot.asRecorded.ownerName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-amber-800 uppercase">Project status</dt>
            <dd className="mt-1">{snapshot.asRecorded.statusLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-amber-800 uppercase">Registration date</dt>
            <dd className="mt-1">{snapshot.asRecorded.registrationDate}</dd>
          </div>
        </dl>
      </Card>

      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
          <Link2 size={14} />
          Candidate link badges (assistive only)
        </h4>
        {snapshot.candidateLinks.map((link) => (
          <Card key={link.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-900">
                {PARTY_ROLE_LABELS[link.partyRole]} — {link.matchReason}
              </p>
              {link.approved && (
                <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-green-100 text-green-800">
                  Link approved (mock badge only)
                </span>
              )}
            </div>
            <Button
              variant={link.approved ? 'secondary' : 'primary'}
              size="sm"
              type="button"
              onClick={() => approveCandidateLink(projectId, link.id)}
            >
              {link.approved ? 'Revoke mock link' : 'Approve link (mock)'}
            </Button>
          </Card>
        ))}
        {snapshot.candidateLinks.length === 0 && (
          <p className="text-sm text-zinc-400">No candidate links in this mock snapshot.</p>
        )}
      </div>
    </div>
  );
}
