import React from 'react';

export default function Input({
  label,
  error,
  helperText,
  mono = false,
  className = '',
  id,
  type = 'text',
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-mono font-bold tracking-wider text-ink uppercase flex items-center justify-between"
        >
          <span>{label}</span>
          {props.required && <span className="text-signal">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={`w-full px-3 py-2 bg-paper-card border-1.5 border-ink rounded-sm text-ink text-sm placeholder:text-ink-subtle focus:bg-white transition-colors disabled:bg-paper-dark disabled:cursor-not-allowed ${
          mono ? 'font-mono' : 'font-sans'
        } ${error ? 'border-brick' : 'border-ink'} ${className}`}
        {...props}
      />
      {error && <span className="text-xs font-mono text-brick font-medium">{error}</span>}
      {helperText && !error && (
        <span className="text-xs font-mono text-ink-muted">{helperText}</span>
      )}
    </div>
  );
}