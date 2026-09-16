import React, { useState } from 'react';
import { Search } from 'lucide-react';
import type { Client, Facility, Inspector, Project } from '../../types';
import {
  selectPmProjectListRows,
  type PmProjectTypeFilter,
} from '../../lib/pmProjectSearch';
import { ProjectList } from './ProjectList';
import { ProjectOverview } from './ProjectOverview';

interface ProjectManagementViewProps {
  projects: Project[];
  clients: Client[];
  facilities: Facility[];
  inspectors: Inspector[];
}

export function ProjectManagementView({
  projects,
  clients,
  facilities,
  inspectors,
}: ProjectManagementViewProps) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<PmProjectTypeFilter>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const rows = selectPmProjectListRows(projects, clients, facilities, inspectors, query, typeFilter);

  const selectedProject = selectedProjectId
    ? projects.find((project) => project.fldProjID === selectedProjectId) || null
    : null;

  if (selectedProject) {
    return (
      <ProjectOverview
        project={selectedProject}
        clients={clients}
        facilities={facilities}
        inspectors={inspectors}
        onBack={() => setSelectedProjectId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Project Management</p>
        <h1 className="text-2xl font-bold text-zinc-900 mt-1">Projects</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Browse existing FREDAsoft Projects. This view is read-only and does not change Data Entry or
          report context.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-end">
        <label className="flex-1 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Search</span>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Project name, OCG #, State Project ID, Client, Facility"
              className="w-full bg-white border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>
        </label>
        <label className="space-y-1 md:w-48">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Project Type</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as PmProjectTypeFilter)}
            className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
          >
            <option value="all">All types</option>
            <option value="TAS/RAS">TAS/RAS</option>
            <option value="Assessment">Assessment</option>
          </select>
        </label>
      </div>

      <p className="text-xs text-zinc-400">
        {rows.length} of {projects.length} projects
      </p>

      <ProjectList
        key={`${query}::${typeFilter}`}
        rows={rows}
        query={query}
        onOpenProject={setSelectedProjectId}
      />
    </div>
  );
}
