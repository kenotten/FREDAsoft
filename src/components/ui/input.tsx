import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm transition-all duration-200",
            "placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black",
            "disabled:opacity-50 disabled:cursor-not-allowed",
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

Input.displayName = 'Input';
