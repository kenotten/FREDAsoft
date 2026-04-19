import React, { useState } from 'react';
import { 
  Users, 
  Briefcase, 
  Plus, 
  X, 
  Edit2, 
  Trash2 
} from 'lucide-react';
import { Button, Card } from './ui/core';
import { cn } from '../lib/utils';

export default function PortfolioManager({
  clients, 
  facilities, 
  projects, 
  projectData, 
  inspectors, 
  selectedClientId, 
  setSelectedClientId, 
  viewMode, 
  setViewMode,
  onDeleteClient,
  onDeleteFacility,
  onDeleteProject,
  isAddingClient,
  setIsAddingClient,
  editingClient,
  setEditingClient,
  isAddingFacility,
  setIsAddingFacility,
  editingFacility,
  setEditingFacility,
  isAddingProject,
  setIsAddingProject,
  editingProject,
  setEditingProject,
  saveClient,
  saveFacility,
  saveProject,
  selections
}: any) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const selectedClient = clients.find((c: any) => c.fldClientID === selectedClientId);
  const clientFacilities = facilities.filter((f: any) => f.fldClient === selectedClientId);
  const clientProjects = projects.filter((p: any) => p.fldClient === selectedClientId);

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-6 overflow-y-auto p-1">
      {/* Client Selection */}
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Active Client</label>
            <div className="flex items-center gap-2">
              <select 
                className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black/5 min-w-[200px]"
                value={selectedClientId || ''}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                <option value="">None / Show All Projects</option>
                {[...clients].filter(c => c.fldClientID).sort((a, b) => a.fldClientName.localeCompare(b.fldClientName)).map(c => (
                  <option key={c.fldClientID} value={c.fldClientID}>{c.fldClientName}</option>
                ))}
              </select>
              {selectedClientId && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setSelectedClientId('')} 
                  title="Clear Selection"
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  <X size={16} />
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setIsAddingClient(true)} title="Add Client">
                <Plus size={16} />
              </Button>
              {selectedClientId && (
                <Button variant="secondary" size="sm" onClick={() => setEditingClient(selectedClient)} title="Edit Client">
                  <Edit2 size={16} />
                </Button>
              )}
              {selectedClientId && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => {
                    if (window.confirm('Delete this client and all associated facilities, projects, and data?')) {
                      onDeleteClient(selectedClientId);
                    }
                  }}
                  title="Delete Client"
                  className="text-zinc-400 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {!selectedClientId ? (
        <div className="space-y-6">
          <Card className="flex flex-col items-center justify-center p-12 text-center space-y-4 border-dashed">
            <div className="p-4 bg-zinc-50 rounded-full">
              <Users size={48} className="text-zinc-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900">No Client Selected</h3>
              <p className="text-zinc-500 max-w-md">Please select a client from the dropdown above to manage their facilities and projects, or create a new client to get started.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsAddingClient(true)}>
                <Plus size={16} className="mr-2" /> Create First Client
              </Button>
              <Button variant="secondary" onClick={() => {
                const globalList = document.getElementById('global-project-list');
                if (globalList) globalList.scrollIntoView({ behavior: 'smooth' });
              }}>
                <Briefcase size={16} className="mr-2" /> Show All Projects
              </Button>
            </div>
          </Card>

          {projects.length > 0 && (
            <div id="global-project-list" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-900">Global Project List (Reassignment Tool)</h3>
                <p className="text-xs text-zinc-500">Showing all projects in the database</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {projects
  .filter((p: any) => p && p.fldProjID)
  .map((p: any) => {
    const client = clients.find((c: any) => c && c.fldClientID === p.fldClient);
    return (
      <Card key={`portfolio-proj-${p.fldProjID}`} className="p-4 flex flex-col justify-between hover:border-zinc-300 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-zinc-100 rounded-lg text-zinc-500">
                            <Briefcase size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-zinc-900 line-clamp-1">{p.fldProjName}</h4>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                              Client: {client?.fldClientName || 'Unknown/Orphaned'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-xs"
                        onClick={() => setEditingProject(p)}
                      >
                        <Edit2 size={12} className="mr-2" /> Reassign / Edit
                      </Button>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* View Toggle & Actions */}
          <div className="flex items-center justify-between bg-zinc-100/50 p-1 rounded-xl w-fit">
            <button 
              onClick={() => setViewMode('projects')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                viewMode === 'projects' ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              View by Project
            </button>
            <button 
              onClick={() => setViewMode('facilities')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                viewMode === 'facilities' ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              View by Facility
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900">
                {viewMode === 'projects' ? 'Projects' : 'Facilities'}
              </h2>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setIsAddingFacility(true)}>
                  <Plus size={14} className="mr-1" /> Add Facility
                </Button>
                <Button size="sm" onClick={() => setIsAddingProject(true)}>
                  <Plus size={14} className="mr-1" /> New Project
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {viewMode === 'projects' ? (
                clientProjects.length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-zinc-100 rounded-2xl text-zinc-400 italic">
                    No projects found for this client.
                  </div>
                ) : (
                  clientProjects.filter(p => p.fldProjID).map((p: any) => {
                    const associatedFacIds = [...new Set(projectData.filter((d: any) => d.fldPDataProject === p.fldProjID).map((d: any) => d.fldFacility))];
                    const associatedFacs = facilities.filter(f => associatedFacIds.includes(f.fldFacID));
                    const isExpanded = expandedId === p.fldProjID;

                    return (
                      <Card key={p.fldProjID} className="overflow-hidden">
                        <div 
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-50 transition-colors"
                          onClick={() => setExpandedId(isExpanded ? null : p.fldProjID)}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn("p-2 rounded-lg transition-colors", isExpanded ? "bg-black text-white" : "bg-zinc-100 text-zinc-500")}>
                              <Briefcase size={20} />
                            </div>
                            <div>
                              <h3 className="font-bold text-zinc-900">{p.fldProjName}</h3>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                  {p.fldPDDate || 'No Date'}
                                </span>
                                {p.fldProjNumber && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-zinc-300" />
                                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                                      #{p.fldProjNumber}
                                    </span>
                                  </>
                                )}
                                <span className="w-1 h-1 rounded-full bg-zinc-300" />
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                  {associatedFacs.length} Facilities
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingProject(p); }}>
                              <Edit2 size={14} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-zinc-400 hover:text-red-600"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                if (window.confirm('Delete this project and all associated data?')) {
                                  onDeleteProject(p.fldProjID);
                                }
                              }}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )
              ) : (
                clientFacilities.length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-zinc-100 rounded-2xl text-zinc-400 italic">
                    No facilities found for this client.
                  </div>
                ) : (
  clientFacilities
    .filter((f: any) => f && f.fldFacID)
    .map((f: any) => (
    <Card key={`portfolio-fac-${f.fldFacID}`} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-zinc-100 rounded-lg text-zinc-500">
                          <Users size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-zinc-900">{f.fldFacName}</h3>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            {f.fldFacAddress || 'No Address'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingFacility(f)}>
                          <Edit2 size={14} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-zinc-400 hover:text-red-600"
                          onClick={() => { 
                            if (window.confirm('Delete this facility and all associated projects and data?')) {
                              onDeleteFacility(f.fldFacID);
                            }
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </Card>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
