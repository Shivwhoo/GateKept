import React from 'react';

const STATUS_CONFIGS = {
  awaiting_guard: {
    label: 'AWAITING',
    bg: 'bg-amber-light',
    text: 'text-amber',
    border: 'border-amber',
    rotation: '-rotate-2',
  },
  at_gate: {
    label: 'AT GATE',
    bg: 'bg-signal-light',
    text: 'text-signal',
    border: 'border-signal',
    rotation: 'rotate-1',
  },
  collected: {
    label: 'COLLECTED',
    bg: 'bg-olive-light',
    text: 'text-olive',
    border: 'border-olive',
    rotation: '-rotate-1',
  },
  unmatched: {
    label: 'UNMATCHED',
    bg: 'bg-paper-dark',
    text: 'text-ink-muted',
    border: 'border-ink-muted',
    rotation: '-rotate-3',
  },
  locked: {
    label: 'LOCKED',
    bg: 'bg-brick-light',
    text: 'text-brick',
    border: 'border-brick',
    rotation: 'rotate-2',
  },
};

export default function Stamp({ status, size = 'md', className = '' }) {
  const config = STATUS_CONFIGS[status] || {
    label: (status || 'UNKNOWN').toUpperCase(),
    bg: 'bg-paper-dark',
    text: 'text-ink',
    border: 'border-ink',
    rotation: '-rotate-2',
  };

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 tracking-wider',
    md: 'text-xs px-2.5 py-1 tracking-widest',
    lg: 'text-sm px-3.5 py-1.5 tracking-widest',
  }[size] || 'text-xs px-2.5 py-1 tracking-widest';

  return (
    <span
      className={`inline-flex items-center justify-center font-mono font-bold uppercase border-1.5 rounded-sm select-none transition-transform shadow-[1px_1px_0_rgba(22,21,15,0.25)] ${config.bg} ${config.text} ${config.border} ${config.rotation} ${sizeClasses} ${className}`}
    >
      {config.label}
    </span>
  );
}