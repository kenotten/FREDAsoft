import React from 'react';
import { Book, FileText, Database } from 'lucide-react';
import { Button, Card } from '../ui/core';

interface SystemResourcesProps {
  onViewDocuments: () => void;
}

export function SystemResources({ onViewDocuments }: SystemResourcesProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">System Resources</h2>
          <Book size={20} className="text-zinc-400" />
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center justify-between group hover:bg-white hover:shadow-sm transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm">User Manual</h3>
                <p className="text-xs text-zinc-500">Guide for field inspectors and admins.</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={onViewDocuments}>
              View Repository
            </Button>
          </div>
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center justify-between group hover:bg-white hover:shadow-sm transition-all opacity-50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-zinc-200 rounded-xl flex items-center justify-center text-zinc-500">
                <Database size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm">System Backups</h3>
                <p className="text-xs text-zinc-500">Automated database snapshots.</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Coming Soon</span>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
        <div className="text-sm text-zinc-500 italic">Activity feed coming soon...</div>
      </Card>
    </div>
  );
}
