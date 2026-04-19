import React from 'react';
import { Database, Trash2, ShieldAlert, Download } from 'lucide-react';
import { Button } from '../ui/core';
import { cn } from '../../lib/utils';

interface DashboardHeaderProps {
  isAdmin: boolean;
  showTrash: boolean;
  setShowTrash: (show: boolean) => void;
  downloadFullBackup: () => void;
  exportMasterGlossary: () => void;
  onCleanupOrphans: () => void;
}

export function DashboardHeader({
  isAdmin,
  showTrash,
  setShowTrash,
  downloadFullBackup,
  exportMasterGlossary,
  onCleanupOrphans
}: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Dashboard</h1>
        <p className="text-zinc-500 mt-1">Overview of your inspection portfolio</p>
      </div>
      <div className="flex items-center gap-2">
        {isAdmin && (
          <>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={downloadFullBackup}
              className="text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-50 border-dashed"
            >
              <Database size={14} className="mr-2" /> Download Full Backup
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setShowTrash(!showTrash)}
              className={cn("text-zinc-500 border-dashed", showTrash && "bg-red-50 text-red-600 border-red-200")}
            >
              <Trash2 size={14} className="mr-2" /> {showTrash ? 'Hide Trash' : 'Trash Bin'}
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => {
                if (window.confirm('This will delete all facilities, projects, and data records that are missing a parent client. Are you sure?')) {
                  onCleanupOrphans();
                }
              }}
              className="text-zinc-500 hover:text-red-600 border-dashed"
            >
              <ShieldAlert size={14} className="mr-2" /> Cleanup Orphans
            </Button>
          </>
        )}
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={exportMasterGlossary}
          className="text-zinc-500 border-dashed"
        >
          <Download size={14} className="mr-2" /> Export Glossary
        </Button>
      </div>
    </div>
  );
}
