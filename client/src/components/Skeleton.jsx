import React from 'react';

export default function Skeleton({ rows = 3, type = 'card' }) {
  if (type === 'table') {
    return (
      <div className="w-full space-y-2 py-4 animate-pulse">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-10 bg-paper-dark border-1.5 border-dashed border-ink/20 rounded-sm w-full"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="bg-paper-dark border-1.5 border-dashed border-ink/30 p-4 rounded-sm flex flex-col gap-2.5"
        >
          <div className="flex justify-between items-center">
            <div className="h-4 bg-ink/10 rounded w-28" />
            <div className="h-5 bg-ink/10 rounded w-16" />
          </div>
          <div className="h-3 bg-ink/10 rounded w-3/4" />
          <div className="h-3 bg-ink/10 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}