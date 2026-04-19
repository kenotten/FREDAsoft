import React from 'react';
import { Trash2, RotateCcw } from 'lucide-react';
import { Button, Card } from '../ui/core';

interface TrashBinProps {
  deletedRecords: {
    clients: any[];
    facilities: any[];
    projects: any[];
  };
  onRestoreClient: (id: string) => void;
  onRestoreFacility: (id: string) => void;
  onRestoreProject: (id: string) => void;
}

export function TrashBin({ 
  deletedRecords, 
  onRestoreClient, 
  onRestoreFacility, 
  onRestoreProject 
}: TrashBinProps) {
  return (
    <Card className="p-6 border-red-100 bg-red-50/10 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg text-red-600">
            <Trash2 size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-red-900">Trash Bin (Soft-Deleted Records)</h2>
            <p className="text-xs text-red-600">These records are hidden from the app but can be restored.</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Deleted Clients */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Clients ({deletedRecords.clients.length})</h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
            {deletedRecords.clients
              .filter((c: any) => c && c.fldClientID) 
              .map((c: any) => (
              <div key={c.fldClientID} className="p-3 bg-white border border-red-100 rounded-xl flex items-center justify-between shadow-sm">
                <span className="text-xs font-medium truncate mr-2">{c.fldClientName}</span>
                <button onClick={() => onRestoreClient(c.fldClientID)} className="flex items-center text-blue-600 hover:bg-blue-50 h-7 text-[10px] px-2 rounded font-medium">
                  <RotateCcw size={12} className="mr-1" /> Restore
                </button>
              </div>
            ))}
            {deletedRecords.clients.length === 0 && <p className="text-xs text-zinc-400 italic">No deleted clients.</p>}
          </div>
        </div>

        {/* Deleted Facilities */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Facilities ({deletedRecords.facilities.length})</h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
            {deletedRecords.facilities
              .filter((f: any) => f && f.fldFacID)
              .map((f: any) => (
              <div key={f.fldFacID} className="p-3 bg-white border border-red-100 rounded-xl flex items-center justify-between shadow-sm">
                <span className="text-xs font-medium truncate mr-2">{f.fldFacName}</span>
                <button onClick={() => onRestoreFacility(f.fldFacID)} className="flex items-center text-blue-600 hover:bg-blue-50 h-7 text-[10px] px-2 rounded font-medium">
                  <RotateCcw size={12} className="mr-1" /> Restore
                </button>
              </div>
            ))}
            {deletedRecords.facilities.length === 0 && <p className="text-xs text-zinc-400 italic">No deleted facilities.</p>}
          </div>
        </div>

        {/* Deleted Projects */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Projects ({deletedRecords.projects.length})</h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
            {deletedRecords.projects
              .filter((p: any) => p && p.fldProjID)
              .map((p: any) => (
              <div key={p.fldProjID} className="p-3 bg-white border border-red-100 rounded-xl flex items-center justify-between shadow-sm">
                <span className="text-xs font-medium truncate mr-2">{p.fldProjName}</span>
                <button onClick={() => onRestoreProject(p.fldProjID)} className="flex items-center text-blue-600 hover:bg-blue-50 h-7 text-[10px] px-2 rounded font-medium">
                  <RotateCcw size={12} className="mr-1" /> Restore
                </button>
              </div>
            ))}
            {deletedRecords.projects.length === 0 && <p className="text-xs text-zinc-400 italic">No deleted projects.</p>}
          </div>
        </div>
      </div>
    </Card>
  );
}
