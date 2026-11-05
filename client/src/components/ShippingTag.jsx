import React, { useState } from 'react';
import Stamp from './Stamp';

export default function ShippingTag({
  parcel,
  showCode = false,
  actions = null,
  highlight = false,
}) {
  const [photoOpen, setPhotoOpen] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
      ', ' +
      d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div
      className={`relative bg-paper-card border-1.5 border-ink rounded-sm transition-all duration-150 ${
        highlight
          ? 'shadow-ink border-signal ring-1 ring-signal'
          : 'shadow-ink hover:shadow-ink-lg'
      }`}
    >
      {/* Perforated receipt header */}
      <div className="bg-paper-dark px-3 py-2 border-b-1.5 border-ink flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-black tracking-widest text-ink">
            #{parcel._id ? parcel._id.slice(-6).toUpperCase() : 'PARCEL'}
          </span>
          <span className="text-[11px] font-sans font-bold bg-white px-2 py-0.5 border-1.5 border-ink rounded-sm">
            {parcel.courier}
          </span>
        </div>
        <Stamp status={parcel.status} size="sm" />
      </div>

      <div className="p-4 flex flex-col sm:flex-row gap-4 items-start">
        {/* Polaroid Style Thumbnail */}
        {parcel.photoUrl && (
          <div className="flex-shrink-0">
            <div
              onClick={() => setPhotoOpen(true)}
              className="bg-white p-1.5 border-1.5 border-ink shadow-ink-sm cursor-pointer hover:rotate-1 transition-transform"
              title="Click to expand parcel photo"
            >
              <img
                src={parcel.photoUrl}
                alt="Parcel at gate"
                loading="lazy"
                className="w-24 h-24 object-cover bg-paper-dark border border-ink/20"
              />
              <div className="text-[9px] font-mono text-center text-ink-muted mt-1 uppercase">
                Drop Photo
              </div>
            </div>
          </div>
        )}

        {/* Parcel Details */}
        <div className="flex-grow min-w-0 space-y-2">
          {/* Collection Code (If visible for student) */}
          {showCode && parcel.collectionCode && (
            <div className="bg-paper border-1.5 border-ink p-2.5 rounded-sm flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted block">
                  Collection Code
                </span>
                <span className="font-mono text-2xl sm:text-3xl font-black tracking-widest text-signal">
                  {parcel.collectionCode}
                </span>
              </div>
              <div className="text-right text-[10px] sm:text-[11px] font-mono text-ink-muted">
                Show to guard with College ID
              </div>
            </div>
          )}

          {/* Student / Contact Info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] font-mono uppercase text-ink-muted block">
                Recipient
              </span>
              <span className="font-bold text-ink truncate block">
                {parcel.student?.name || parcel.rawName || 'Unregistered'}
              </span>
              {(parcel.student?.hostel || parcel.student?.room) && (
                <span className="text-[11px] font-mono text-ink-muted">
                  {parcel.student.hostel} - {parcel.student.room}
                </span>
              )}
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-ink-muted block">
                Phone
              </span>
              <span className="font-mono font-bold text-ink">
                {parcel.rawPhone}
              </span>
            </div>
          </div>

          {/* Timestamps */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-ink-muted pt-1 border-t border-dashed border-ink/20">
            <span>Dropped: {formatDate(parcel.droppedAt)}</span>
            {parcel.receivedAt && (
              <span>Received: {formatDate(parcel.receivedAt)}</span>
            )}
            {parcel.collectedAt && (
              <span className="text-olive font-bold">Collected: {formatDate(parcel.collectedAt)}</span>
            )}
          </div>

          {/* Note */}
          {parcel.note && (
            <p className="text-xs bg-paper p-1.5 border border-dashed border-ink/40 font-mono text-ink italic">
              &ldquo;{parcel.note}&rdquo;
            </p>
          )}

          {/* Locked warning */}
          {parcel.status === 'locked' && (
            <div className="text-xs bg-brick-light text-brick border border-brick p-2 font-mono font-bold">
              [LOCKED] 5 failed collection attempts. Requires hostel admin override.
            </div>
          )}
        </div>
      </div>

      {/* Action Footer (if actions provided) */}
      {actions && (
        <div className="bg-paper border-t-1.5 border-ink px-3 py-2 flex items-center justify-end gap-2">
          {actions}
        </div>
      )}

      {/* Photo Modal Preview */}
      {photoOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPhotoOpen(false)}
        >
          <div
            className="bg-paper-card p-4 border-2 border-ink shadow-ink max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3 border-b-1.5 border-ink pb-2">
              <span className="font-mono text-xs font-bold uppercase">
                Parcel Photo — {parcel.courier} #{parcel._id?.slice(-6)}
              </span>
              <button
                type="button"
                onClick={() => setPhotoOpen(false)}
                className="font-mono font-bold text-sm px-2 py-0.5 border-1.5 border-ink bg-paper hover:bg-paper-dark"
              >
                ✕
              </button>
            </div>
            <img
              src={parcel.photoUrl}
              alt="Parcel Full View"
              className="w-full max-h-[70vh] object-contain border-1.5 border-ink bg-white"
            />
            <div className="mt-3 text-right">
              <button
                type="button"
                onClick={() => setPhotoOpen(false)}
                className="font-sans font-bold text-xs px-3 py-1.5 bg-paper border-1.5 border-ink hover:bg-paper-dark"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}