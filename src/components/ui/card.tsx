import React from 'react';

export const Card = ({ children, className, ...props }: any) => {
  const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
  return (
    <div className={cn("bg-white border border-zinc-200 rounded-2xl shadow-sm", className)} {...props}>
      {children}
    </div>
  );
};
