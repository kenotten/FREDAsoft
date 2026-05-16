import React, { useEffect, useRef } from 'react';
import { releaseInactiveTabPanelFocus } from '../../lib/releaseInactiveTabPanelFocus';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen?: boolean; // Optional because we often use conditional rendering
  onClose: () => void;
  title?: string;
  subTitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
  /** Merged onto the fixed overlay (e.g. z-index above other full-screen UI). */
  overlayClassName?: string;
}

export function Modal({ 
  isOpen = true, 
  onClose, 
  title, 
  subTitle,
  children, 
  footer,
  onSubmit,
  maxWidth = 'md',
  overlayClassName
}: ModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    releaseInactiveTabPanelFocus('');
    closeButtonRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-full mx-4'
  };

  const ContentWrapper = onSubmit ? 'form' : 'div';
  const wrapperProps = onSubmit ? { onSubmit: (e: React.FormEvent) => { e.preventDefault(); onSubmit(e); } } : {};

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200',
        overlayClassName
      )}
    >
      <ContentWrapper 
        {...wrapperProps}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={cn(
          "bg-white rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200",
          maxWidthClasses[maxWidth]
        )}
      >
        {/* Fixed Header */}
        <div className="px-6 py-4 border-b border-zinc-100 shrink-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h2 id="modal-title" className="font-bold text-zinc-900">{title}</h2>
              {subTitle && <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{subTitle}</p>}
            </div>
            <button 
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-900"
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Sticky Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-zinc-100 shrink-0 bg-zinc-50/50 z-10">
            {footer}
          </div>
        )}
      </ContentWrapper>
    </div>
  );
}
