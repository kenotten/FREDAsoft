import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

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
      <div className="relative">
        <select
          className={cn(
            'w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all appearance-none pr-10',
            error && 'border-red-500 focus:ring-red-500/5 focus:border-red-500',
            highlight && (isPopulated ? 'bg-green-500/10' : 'border-orange-500'),
            selectClassName
          )}
          {...props}
        >
          <option key="default-null" value="">{placeholder || 'Select an option'}</option>
          {Array.isArray(options) && options.map((opt: any, idx: number) => (
            <option key={opt.key || `${opt.value || 'opt'}-${idx}`} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
          {children}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-zinc-400">
          <ChevronDown size={16} />
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};
