import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function PrototypeBanner() {
  return (
    <div className="shrink-0 bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest border-b border-amber-600">
      <AlertTriangle size={14} className="shrink-0" />
      <span>PROTOTYPE — MOCK DATA — NOT SAVED — NO FIREBASE</span>
    </div>
  );
}
