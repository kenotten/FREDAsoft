import React from 'react';
import { Card } from '../../components/ui/core';
import type { MockProject } from '../types';

interface OverviewTabProps {
  project: MockProject;
}

/** Matches project header Client value styling (blue-800 + bold) for field labels only. */
const OVERVIEW_FIELD_LABEL = 'text-xs font-bold text-blue-800 uppercase';
const OVERVIEW_FIELD_VALUE = 'mt-1 text-zinc-900 font-normal';

export function OverviewTab({ project }: OverviewTabProps) {
  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">
          Project summary (mock)
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className={OVERVIEW_FIELD_LABEL}>Site / project name</dt>
            <dd className={OVERVIEW_FIELD_VALUE}>{project.siteName}</dd>
          </div>
          <div>
            <dt className={OVERVIEW_FIELD_LABEL}>OCG #</dt>
            <dd className={`${OVERVIEW_FIELD_VALUE} font-mono`}>{project.ocgProjectNumber}</dd>
          </div>
          <div>
            <dt className={OVERVIEW_FIELD_LABEL}>TABS #</dt>
            <dd className={`${OVERVIEW_FIELD_VALUE} font-mono`}>
              {project.tabsNumber ?? '— pending —'}
            </dd>
          </div>
          <div>
            <dt className={OVERVIEW_FIELD_LABEL}>Date received</dt>
            <dd className={OVERVIEW_FIELD_VALUE}>{project.dateReceived}</dd>
          </div>
          <div>
            <dt className={OVERVIEW_FIELD_LABEL}>Client</dt>
            <dd className={OVERVIEW_FIELD_VALUE}>{project.clientLabel}</dd>
          </div>
          <div>
            <dt className={OVERVIEW_FIELD_LABEL}>Owner (FREDA project role)</dt>
            <dd className={OVERVIEW_FIELD_VALUE}>{project.ownerLabel}</dd>
          </div>
          <div>
            <dt className={OVERVIEW_FIELD_LABEL}>Service scope</dt>
            <dd className={OVERVIEW_FIELD_VALUE}>{project.serviceScope}</dd>
          </div>
          <div>
            <dt className={OVERVIEW_FIELD_LABEL}>Current status</dt>
            <dd className="mt-1">
              <span className="inline-block px-2 py-1 rounded bg-zinc-100 text-xs font-normal text-zinc-900">
                {project.currentStatus}
              </span>
            </dd>
          </div>
          <div>
            <dt className={OVERVIEW_FIELD_LABEL}>Assigned RAS</dt>
            <dd className={OVERVIEW_FIELD_VALUE}>
              {project.assignedRas ?? 'Not assigned (mock)'}
            </dd>
          </div>
          <div>
            <dt className={OVERVIEW_FIELD_LABEL}>Next due date</dt>
            <dd className={OVERVIEW_FIELD_VALUE}>{project.nextDueDate ?? '—'}</dd>
          </div>
          <div>
            <dt className={OVERVIEW_FIELD_LABEL}>Payment</dt>
            <dd className={OVERVIEW_FIELD_VALUE}>
              {project.paymentPending
                ? 'Payment pending (mock)'
                : 'No pending fees (mock)'}
            </dd>
          </div>
        </dl>
      </Card>

      <p className="text-xs text-zinc-400">
        Use the Roles, TDLR data, Status, and Feedback tabs to continue the mock workflow review.
      </p>
    </div>
  );
}
