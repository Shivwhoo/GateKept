import React, { useEffect } from 'react';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-md',
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-xs animate-in fade-in duration-100">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative bg-paper-card border-2 border-ink shadow-ink w-full ${maxWidth} z-10 p-5 rounded-sm`}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b-1.5 border-ink pb-3 mb-4">
          <div>
            <h2 className="text-lg font-bold font-sans tracking-tight text-ink uppercase">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs font-mono text-ink-muted mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center border-1.5 border-ink bg-paper hover:bg-paper-dark font-mono font-bold text-sm select-none"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div>{children}</div>
      </div>
    </div>
  );
}