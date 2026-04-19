import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

export function BrandingSection() {
  return (
    <div className="mt-12 pt-8 border-t border-zinc-100">
      <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest mb-6">Firm Branding</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Firm Name</label>
          <div className="p-4 bg-zinc-50 border border-dashed border-zinc-200 rounded-xl text-center">
            <span className="text-xs text-zinc-400 italic">Firm Name Placeholder</span>
          </div>
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Firm Logo</label>
          <div className="aspect-video bg-zinc-50 border border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center gap-2 text-zinc-400">
            <ImageIcon size={24} />
            <span className="text-[10px] font-bold uppercase">Upload Logo</span>
          </div>
        </div>
      </div>
      <p className="mt-4 text-[10px] text-zinc-400 italic">Note: Branding logic is currently in development.</p>
    </div>
  );
}
