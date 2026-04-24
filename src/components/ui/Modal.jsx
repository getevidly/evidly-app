import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  const handleEscape = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy/40 modal-backdrop-enter"
        onClick={onClose}
      />

      {/* Content */}
      <div
        className={`relative w-full ${sizeMap[size] || sizeMap.md} max-h-[90vh] flex flex-col bg-white rounded-xl shadow-xl modal-content-enter`}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-navy/10 flex-shrink-0">
            <h2 className="text-base font-semibold text-navy">{title}</h2>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-navy/40 hover:text-navy hover:bg-navy/5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className={`flex-1 overflow-y-auto min-h-0 ${title ? 'p-5' : 'p-5 pt-4'}`}>
          {!title && (
            <button
              onClick={onClose}
              className="absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-lg text-navy/40 hover:text-navy hover:bg-navy/5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
