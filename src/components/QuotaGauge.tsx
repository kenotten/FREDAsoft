import React from 'react';
import { cn } from '../lib/utils';

interface QuotaGaugeProps {
  reads: number;
  writes: number;
  limit?: number;
}

export const QuotaGauge: React.FC<QuotaGaugeProps> = ({ reads, writes, limit = 50000 }) => {
  const total = reads + writes;
  const percentage = (total / limit) * 100;
  const displayPercentage = percentage.toFixed(2);

  let barColor = 'bg-zinc-900'; // Default black/zinc
  if (percentage > 90) {
    barColor = 'bg-red-500';
  } else if (percentage > 70) {
    barColor = 'bg-orange-500';
  } else if (percentage < 70) {
    barColor = 'bg-emerald-600';
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Firestore Reads/Writes</span>
        <span className="text-[10px] font-mono font-bold text-zinc-900">{total.toLocaleString()} / {limit.toLocaleString()}</span>
      </div>
      <div className="relative w-[200px] h-4 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
        <div 
          className={cn("h-full transition-all duration-500 ease-out", barColor)}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(
            "text-[9px] font-black tracking-tighter",
            percentage > 50 ? "text-white" : "text-zinc-900"
          )}>
            {displayPercentage}%
          </span>
        </div>
      </div>
      <div className="flex gap-4 text-[9px] text-zinc-400 italic">
        <span>Reads: {reads.toLocaleString()}</span>
        <span>Writes: {writes.toLocaleString()}</span>
      </div>
      <p className="text-[9px] text-zinc-400 italic">Daily limit resets at 00:00 UTC</p>
    </div>
  );
};
