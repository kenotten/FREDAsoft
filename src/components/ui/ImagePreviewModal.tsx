import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ImagePreviewModalProps {
  src: string | null;
  alt?: string;
  title?: string;
  onClose: () => void;
}

/**
 * Full-screen lightbox for a single image. Close: X, Escape, backdrop (not image).
 */
export function ImagePreviewModal({ src, alt = '', title, onClose }: ImagePreviewModalProps) {
  const [loadError, setLoadError] = useState(false);
  const trimmed = String(src ?? '').trim();

  useEffect(() => {
    setLoadError(false);
  }, [trimmed]);

  useEffect(() => {
    if (!trimmed) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [trimmed, onClose]);

  if (!trimmed) return null;

  const ariaLabel = title?.trim() || 'Image preview';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] max-w-[95vw] flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-1 -top-1 z-10 rounded-full bg-zinc-900 p-2 text-white shadow-lg ring-1 ring-white/20 transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label="Close preview"
        >
          <X size={20} />
        </button>
        {loadError ? (
          <div className="rounded-xl border border-zinc-600 bg-zinc-900 px-6 py-8 text-center text-sm text-zinc-300">
            Image could not be loaded.
          </div>
        ) : (
          <img
            src={trimmed}
            alt={alt}
            title={title}
            referrerPolicy="no-referrer"
            className={cn(
              'max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl',
              'ring-1 ring-white/10'
            )}
            onError={() => setLoadError(true)}
          />
        )}
      </div>
    </div>
  );
}
