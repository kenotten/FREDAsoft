import React from 'react';
import { cn } from '../../lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            "w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm transition-all duration-200 min-h-[100px]",
            "placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black",
            "disabled:opacity-50 disabled:cursor-not-allowed resize-none",
            error ? "border-red-500 focus:ring-red-500/10 focus:border-red-500" : "",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
