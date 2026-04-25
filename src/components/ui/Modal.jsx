import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export function Modal({
  isOpen,
  onClose,
  children,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  className = '',
  overlayClassName = '',
}) {
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, closeOnEscape, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClass = {
    sm:   'max-w-sm',
    md:   'max-w-md',
    lg:   'max-w-2xl',
    xl:   'max-w-4xl',
    full: 'max-w-[95vw]',
  }[size] || 'max-w-md';

  const overlay = (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 overflow-y-auto ${overlayClassName}`}
      onClick={(e) => { if (closeOnBackdrop && e.target === e.currentTarget) onClose?.(); }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-white rounded-xl shadow-2xl w-full ${sizeClass} my-auto max-h-[calc(100vh-2rem)] flex flex-col ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-y-auto min-h-0 flex-1">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

export default Modal;
