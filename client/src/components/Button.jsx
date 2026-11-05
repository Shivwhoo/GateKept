import React from 'react';

export default function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'danger'
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  ...props
}) {
  const baseClasses =
    'inline-flex items-center justify-center font-bold font-sans rounded-sm border-1.5 border-ink cursor-pointer select-none transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0';

  const variants = {
    primary:
      'bg-signal text-white shadow-ink hover:bg-signal-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-ink-sm',
    secondary:
      'bg-paper-card text-ink shadow-ink hover:bg-paper-dark active:translate-x-[2px] active:translate-y-[2px] active:shadow-ink-sm',
    outline:
      'bg-transparent text-ink hover:bg-paper-dark active:translate-x-[1px] active:translate-y-[1px]',
    danger:
      'bg-brick text-white shadow-ink hover:bg-brick-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-ink-sm',
    olive:
      'bg-olive text-white shadow-ink hover:bg-olive-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-ink-sm',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-6 py-3',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseClasses} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Processing...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}