import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Modal — portaled overlay that renders into document.body.
 *
 * Because it portals out of the React tree, the overlay anchors to the
 * viewport regardless of any containing-block ancestors (transform,
 * filter, isolate, contain, etc.) in the component tree above.
 *
 * Props:
 *   isOpen        boolean  — controls render
 *   onClose       function — called on Escape, backdrop click, or close button
 *   children      ReactNode
 *   size          'sm' | 'md' | 'lg' | 'xl' | 'full'  (default 'md')
 *   closeOnBackdrop  boolean (default true)
 *   closeOnEscape    boolean (default true)
 *   className     string — applied to the content card
 *   overlayClassName string — applied to the backdrop
 */
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
  // Escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, closeOnEscape, onClose]);

  // Body scroll lock
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
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 ${overlayClassName}`}
      onClick={(e) => { if (closeOnBackdrop && e.target === e.currentTarget) onClose?.(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className={`bg-white rounded-xl shadow-2xl w-full ${sizeClass} max-h-[90vh] overflow-y-auto ${className}`}>
        {children}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

export default Modal;
