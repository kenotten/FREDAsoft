import React from 'react';
import type { PmProjectListRow } from '../../lib/pmProjectSearch';
import { Card } from '../ui/core';

interface ProjectListProps {
  rows: PmProjectListRow[];
  query: string;
  onOpenProject: (projectId: string) => void;
}

export function ProjectList({ rows, query, onOpenProject }: ProjectListProps) {
  if (rows.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-zinc-500">
        {query.trim() ? 'No matching projects.' : 'No projects are available.'}
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-[10px] uppercase tracking-wider text-zinc-500">
              <th className="px-4 py-3 font-semibold">OCG #</th>
              <th className="px-4 py-3 font-semibold">Project Name</th>
              <th className="px-4 py-3 font-semibold">State Project ID</th>
              <th className="px-4 py-3 font-semibold">Client</th>
              <th className="px-4 py-3 font-semibold">Facility / Site</th>
              <th className="px-4 py-3 font-semibold">Plan Review RAS</th>
              <th className="px-4 py-3 font-semibold">Inspection RAS</th>
              <th className="px-4 py-3 font-semibold">Type</th>
            </tr>
          </thead>
          <tbody key={`${query}::${rows.map((row) => row.projectId).join('|')}`}>
            {rows.map((row) => (
              <tr
                key={row.projectId}
                onClick={() => onOpenProject(row.projectId)}
                className="border-b border-zinc-50 hover:bg-zinc-50 cursor-pointer"
              >
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{row.ocgNumberDisplay}</td>
                <td className="px-4 py-3 font-medium text-zinc-900">{row.projectNameDisplay}</td>
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{row.stateProjectIdDisplay}</td>
                <td className="px-4 py-3">{row.clientNameDisplay}</td>
                <td className="px-4 py-3">{row.facilityDisplay}</td>
                <td className="px-4 py-3">{row.planReviewRasDisplay}</td>
                <td className="px-4 py-3">{row.inspectionRasDisplay}</td>
                <td className="px-4 py-3 whitespace-nowrap">{row.projectTypeDisplay}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
