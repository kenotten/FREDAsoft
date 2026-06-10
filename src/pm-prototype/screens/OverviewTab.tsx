import React from 'react';
import { Card } from '../../components/ui/core';
import type { MockProject } from '../types';

interface OverviewTabProps {
  project: MockProject;
}

export function OverviewTab({ project }: OverviewTabProps) {
  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">
          Project summary (mock)
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs font-semibold text-zinc-500 uppercase">Site / project name</dt>
            <dd className="mt-1 text-zinc-900">{project.siteName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-zinc-500 uppercase">OCG #</dt>
            <dd className="mt-1 font-mono">{project.ocgProjectNumber}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-zinc-500 uppercase">TABS #</dt>
            <dd className="mt-1 font-mono">{project.tabsNumber ?? '— pending —'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-zinc-500 uppercase">Date received</dt>
            <dd className="mt-1">{project.dateReceived}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-zinc-500 uppercase">Client</dt>
            <dd className="mt-1 text-blue-800 font-medium">{project.clientLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-zinc-500 uppercase">Owner (canonical)</dt>
            <dd className="mt-1 text-emerald-800 font-medium">{project.ownerLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-zinc-500 uppercase">Service scope</dt>
            <dd className="mt-1">{project.serviceScope}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-zinc-500 uppercase">Current status</dt>
            <dd className="mt-1">
              <span className="inline-block px-2 py-1 rounded bg-zinc-100 text-xs font-medium">
                {project.currentStatus}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-zinc-500 uppercase">Assigned RAS</dt>
            <dd className="mt-1">{project.assignedRas ?? 'Not assigned (mock)'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-zinc-500 uppercase">Next due date</dt>
            <dd className="mt-1">{project.nextDueDate ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-zinc-500 uppercase">Payment</dt>
            <dd className="mt-1">
              {project.paymentPending ? (
                <span className="text-amber-700 font-medium">Payment pending (mock)</span>
              ) : (
                <span className="text-zinc-600">No pending fees (mock)</span>
              )}
            </dd>
          </div>
        </dl>
      </Card>

      <p className="text-xs text-zinc-400">
        Use the Parties, Source, Status, and Feedback tabs to continue the mock workflow review.
      </p>
    </div>
  );
}
