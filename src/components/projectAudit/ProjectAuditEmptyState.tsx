import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Card } from '../ui/core';
import { cn } from '../../lib/utils';

export function ProjectAuditNoProjectEmpty() {
  return (
    <div className="mx-auto max-w-4xl py-12 text-center text-zinc-500">
      <ClipboardCheck size={40} className="mx-auto mb-4 opacity-20" />
      <p className="text-sm font-medium">Select a project to open Project Audit.</p>
    </div>
  );
}

export function ProjectAuditResultsEmptyState({
  message,
  isSuccess,
}: {
  message: string;
  isSuccess: boolean;
}) {
  return (
    <Card
      className={cn(
        'p-12 text-center',
        isSuccess ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800' : 'text-zinc-500'
      )}
    >
      <p className={cn('text-sm', isSuccess && 'font-medium')}>{message}</p>
    </Card>
  );
}
