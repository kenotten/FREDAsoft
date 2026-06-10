import React from 'react';
import { Card, Select } from '../../components/ui/core';
import { useMockPm } from '../state/MockPmContext';
import { PROJECT_STATUSES, SERVICE_SCOPES, type MockProject, type ProjectStatus, type ServiceScope } from '../types';

interface StatusTabProps {
  project: MockProject;
}

export function StatusTab({ project }: StatusTabProps) {
  const { updateProjectStatus, updateProjectScope } = useMockPm();

  const statusOptions = PROJECT_STATUSES.map((s) => ({ value: s, label: s }));
  const scopeOptions = SERVICE_SCOPES.map((s) => ({ value: s, label: s }));

  return (
    <div className="space-y-6">
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">
          Service scope &amp; status (local mock only)
        </h3>

        <Select
          label="Service scope"
          value={project.serviceScope}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            updateProjectScope(project.id, e.target.value as ServiceScope)
          }
          options={scopeOptions}
        />

        <Select
          label="Current status"
          value={project.currentStatus}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            updateProjectStatus(project.id, e.target.value as ProjectStatus)
          }
          options={statusOptions}
        />

        <p className="text-xs text-zinc-400">
          Changes update in-memory state only. Status history is appended locally.
        </p>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/80">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
            Status history (mock)
          </h4>
        </div>
        <ul className="divide-y divide-zinc-50">
          {project.statusHistory.map((entry, idx) => (
            <li key={`${entry.at}-${idx}`} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-zinc-400">
                  {new Date(entry.at).toLocaleString()}
                </span>
                <span className="text-zinc-600">by {entry.by}</span>
              </div>
              <p className="mt-1 text-zinc-900">
                {entry.fromStatus ? (
                  <>
                    <span className="text-zinc-500">{entry.fromStatus}</span>
                    <span className="mx-2">→</span>
                    <span className="font-medium">{entry.toStatus}</span>
                  </>
                ) : (
                  <span className="font-medium">{entry.toStatus}</span>
                )}
              </p>
              {entry.note && <p className="text-xs text-zinc-500 mt-1">{entry.note}</p>}
            </li>
          ))}
          {project.statusHistory.length === 0 && (
            <li className="px-4 py-6 text-center text-zinc-400 text-sm">No history yet.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
