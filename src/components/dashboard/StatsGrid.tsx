import React from 'react';
import { Users, Briefcase, BookOpen, ClipboardList } from 'lucide-react';
import { Card } from '../ui/core';

interface StatsGridProps {
  stats: {
    clients: any[];
    projects: any[];
    glossary: any[];
    projectData: any[];
  };
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard 
        label="Total Clients" 
        value={stats.clients.length} 
        icon={<Users className="text-blue-500" />} 
      />
      <StatCard 
        label="Active Projects" 
        value={stats.projects.length} 
        icon={<Briefcase className="text-emerald-500" />} 
      />
      <StatCard 
        label="Glossary Items" 
        value={stats.glossary.length} 
        icon={<BookOpen className="text-orange-500" />} 
      />
      <StatCard 
        label="Data Records" 
        value={stats.projectData.length >= 100 ? "100+" : stats.projectData.length} 
        icon={<ClipboardList className="text-purple-500" />} 
      />
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 bg-zinc-50 rounded-lg">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-zinc-900">{value}</div>
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</div>
    </Card>
  );
}
