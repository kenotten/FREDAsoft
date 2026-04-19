import React from 'react';
import { Loader2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

export const Button = ({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  children, 
  ...props 
}: any) => {
  const variants = {
    primary: 'bg-black text-white hover:bg-zinc-800',
    secondary: 'bg-white text-black border border-zinc-200 hover:bg-zinc-50',
    ghost: 'bg-transparent text-zinc-600 hover:bg-zinc-100',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    success: 'bg-green-600 text-white hover:bg-green-700',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant as keyof typeof variants],
        sizes[size as keyof typeof sizes],
        className
      )}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
      {children}
    </button>
  );
};

export const Input = ({ label, error, className, labelClassName, inputClassName, highlight, ...props }: any) => {
  const isPopulated = props.value !== undefined && props.value !== null && props.value.toString().length > 0;
  return (
    <div className={cn('space-y-1', className)}>
      {label && <label className={cn("text-xs font-semibold text-zinc-500 uppercase tracking-wider", labelClassName)}>{label}</label>}
      <input
        className={cn(
          'w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all',
          error && 'border-red-500 focus:ring-red-500/5 focus:border-red-500',
          highlight && (isPopulated ? 'bg-green-500/10' : 'border-orange-500'),
          inputClassName
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

export const Select = ({ 
  label, 
  options = [], 
  error, 
  className, 
  labelClassName, 
  selectClassName, 
  highlight, 
  placeholder,
  children,
  ...props 
}: any) => {
  const isPopulated = props.value !== undefined && props.value !== null && props.value.toString().length > 0;
  return (
    <div className={cn('space-y-1', className)}>
      {label && <label className={cn("text-xs font-semibold text-zinc-500 uppercase tracking-wider", labelClassName)}>{label}</label>}
      <select
        className={cn(
          'w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all appearance-none',
          error && 'border-red-500 focus:ring-red-500/5 focus:border-red-500',
          highlight && (isPopulated ? 'bg-green-500/10' : 'border-orange-500'),
          selectClassName
        )}
        {...props}
      >
        <option key="default-null" value="">{placeholder || 'Select an option'}</option>
        {options.map((opt: any, idx: number) => (
          <option key={opt.key || `${opt.value || 'opt'}-${idx}`} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

export const Card = ({ children, className, ...props }: any) => (
  <div className={cn('bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm', className)} {...props}>
    {children}
  </div>
);

export function Modal({ title, subTitle, children, footer, onClose, onSubmit }: any) {
  const content = (
    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      {/* Fixed Header */}
      <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
          <button onClick={onClose} type="button" className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
            <X size={18} className="text-zinc-500" />
          </button>
        </div>
        {subTitle && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Parent:</span>
            <span className="text-xs font-bold text-zinc-600">{subTitle}</span>
          </div>
        )}
      </div>
      
      {/* Scrollable Body */}
      <div className="p-6 overflow-y-auto flex-1">
        {children}
      </div>

      {/* Sticky Footer */}
      {footer && (
        <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 shrink-0">
          {footer}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg"
      >
        {onSubmit ? (
          <form onSubmit={onSubmit}>{content}</form>
        ) : content}
      </motion.div>
    </div>
  );
}
