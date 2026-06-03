import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export function WebReportCollapseToggle({
  expanded,
  onToggle,
  label,
  subtitle,
  level
}: {
  expanded: boolean;
  onToggle: () => void;
  label: string;
  subtitle?: string;
  level: 'top' | 'mid' | 'item';
}) {
  const pad = level === 'top' ? 'pl-0' : level === 'mid' ? 'pl-4' : 'pl-8';
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg py-2 text-left transition-colors hover:bg-zinc-100',
        pad
      )}
    >
      {expanded ? (
        <ChevronDown size={16} className="shrink-0 text-zinc-500" />
      ) : (
        <ChevronRight size={16} className="shrink-0 text-zinc-500" />
      )}
      <span
        className={cn(
          'truncate',
          level === 'top' && 'text-sm font-bold uppercase tracking-wide text-zinc-900',
          level === 'mid' && 'text-sm font-semibold text-zinc-800',
          level === 'item' && 'text-xs font-semibold text-zinc-700'
        )}
      >
        {label}
      </span>
      {subtitle ? (
        <span className="ml-auto shrink-0 text-[10px] font-medium text-zinc-400">{subtitle}</span>
      ) : null}
    </button>
  );
}
