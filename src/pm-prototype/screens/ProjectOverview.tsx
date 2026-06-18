import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useMockPm } from '../state/MockPmContext';
import type { ProjectTab } from '../types';
import { FeedbackTab } from './FeedbackTab';
import { OverviewTab } from './OverviewTab';
import { PartiesTab } from './PartiesTab';
import { SourceTab } from './SourceTab';
import { StatusTab } from './StatusTab';

const TABS: { id: ProjectTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'parties', label: 'Roles' },
  { id: 'source', label: 'TDLR data' },
  { id: 'status', label: 'Status' },
  { id: 'feedback', label: 'Feedback' },
];

export function ProjectOverview() {
  const {
    activeProjectId,
    activeTab,
    setActiveTab,
    goToDashboard,
    getProject,
    getProjectParties,
    getProjectSnapshot,
  } = useMockPm();

  const project = activeProjectId ? getProject(activeProjectId) : undefined;

  if (!project) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <p>Mock project not found.</p>
        <button
          type="button"
          onClick={goToDashboard}
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  const parties = getProjectParties(project.id);
  const snapshot = getProjectSnapshot(project.id);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={goToDashboard}
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800"
      >
        <ArrowLeft size={16} />
        Back to dashboard
      </button>

      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Mock project
            </p>
            <h1 className="text-xl font-bold text-zinc-900">{project.siteName}</h1>
            <p className="text-sm text-zinc-500 mt-1">
              <span className="font-mono">{project.ocgProjectNumber}</span>
              {project.tabsNumber && (
                <>
                  <span className="mx-2">·</span>
                  <span className="font-mono">{project.tabsNumber}</span>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {project.validationSampleLabel && (
              <span className="px-2 py-1 rounded bg-violet-100 text-violet-800 font-medium">
                {project.validationSampleLabel}
              </span>
            )}
            <span className="px-2 py-1 rounded bg-zinc-100 font-medium">{project.currentStatus}</span>
            <span className="px-2 py-1 rounded bg-blue-50 text-blue-800">{project.serviceScope}</span>
            {project.paymentPending && (
              <span className="px-2 py-1 rounded bg-amber-100 text-amber-800">Payment pending</span>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-zinc-100 text-sm">
          <div>
            <dt className="text-[10px] font-bold uppercase text-zinc-400">Client</dt>
            <dd className="text-blue-800 font-medium">{project.clientLabel}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase text-zinc-400">Owner</dt>
            <dd className="text-emerald-800 font-medium">{project.ownerLabel}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase text-zinc-400">Assigned RAS</dt>
            <dd>{project.assignedRas ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase text-zinc-400">Next due</dt>
            <dd>{project.nextDueDate ?? '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="border-b border-zinc-200 flex flex-wrap gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-white border border-b-0 border-zinc-200 text-zinc-900 -mb-px'
                : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-zinc-200 rounded-b-xl rounded-tr-xl p-5 min-h-[320px]">
        {activeTab === 'overview' && <OverviewTab project={project} />}
        {activeTab === 'parties' && <PartiesTab project={project} parties={parties} />}
        {activeTab === 'source' && <SourceTab projectId={project.id} snapshot={snapshot} />}
        {activeTab === 'status' && <StatusTab project={project} />}
        {activeTab === 'feedback' && <FeedbackTab projectId={project.id} />}
      </div>
    </div>
  );
}
