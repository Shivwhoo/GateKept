import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { usePolling } from '../hooks/usePolling';
import ShippingTag from '../components/ShippingTag';
import Stamp from '../components/Stamp';
import Skeleton from '../components/Skeleton';
import Button from '../components/Button';

export default function StudentDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchMyParcels = async () => {
    try {
      const res = await api.get('/parcels/mine');
      setParcels(res.parcels || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load student parcels:', err);
    } finally {
      setLoading(false);
    }
  };

  usePolling(fetchMyParcels, 6000);

  const activeAtGate = parcels.filter(
    (p) => p.status === 'at_gate' || p.status === 'awaiting_guard' || p.status === 'locked'
  );
  const collectedHistory = parcels.filter((p) => p.status === 'collected');

  return (
    <div className="w-full max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-5">
      {/* Welcome Banner */}
      <div className="bg-paper-dark border-1.5 border-ink shadow-ink p-4 rounded-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink-muted">
              STUDENT LOGBOOK
            </span>
            <span className="font-mono text-[10px] bg-ink text-paper px-2 py-0.5 border-1.5 border-ink font-bold">
              {user?.hostel} #{user?.room}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-sans text-ink uppercase tracking-tight mt-0.5">
            {user?.name}
          </h1>
          <p className="text-xs font-mono text-ink-muted">
            Phone: {user?.phone} &bull; Updated {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchMyParcels}
          className="font-mono text-xs"
        >
          ↻ Refresh
        </Button>
      </div>

      {location.state?.welcome && (
        <div className="bg-olive-light border-1.5 border-olive text-olive p-3 rounded-sm font-mono text-xs font-bold animate-in fade-in">
          [VERIFIED] Account activated!{' '}
          {location.state?.claimedCount > 0
            ? `Claimed ${location.state.claimedCount} previously dropped parcel(s)!`
            : 'Ready to receive parcels.'}
        </div>
      )}

      {/* SECTION 1: Active Waiting at Gate (Top Priority) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b-1.5 border-ink pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-signal rounded-full animate-pulse" />
            <h2 className="text-base font-black font-sans uppercase tracking-tight text-ink">
              Ready for Collection at Desk
            </h2>
          </div>
          <span className="font-mono text-xs font-bold bg-signal text-white px-2 py-0.5 border-1.5 border-ink">
            {activeAtGate.length} WAITING
          </span>
        </div>

        {loading ? (
          <Skeleton rows={2} />
        ) : activeAtGate.length === 0 ? (
          <div className="bg-paper-card border-1.5 border-dashed border-ink/40 p-6 text-center rounded-sm">
            <p className="font-mono text-sm text-ink-muted font-bold">
              No parcels currently waiting at the gate.
            </p>
            <p className="font-mono text-xs text-ink-subtle mt-1">
              When a courier drops a package and the guard receives it, your collection code will show right here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeAtGate.map((parcel) => (
              <ShippingTag
                key={parcel._id}
                parcel={parcel}
                showCode={true} // Student sees their collection code!
                highlight={parcel.status === 'at_gate'}
              />
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: Ledger History (Collected) */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between border-b-1.5 border-ink pb-2">
          <h2 className="text-base font-black font-sans uppercase tracking-tight text-ink">
            Collection Ledger &amp; History
          </h2>
          <span className="font-mono text-xs font-bold bg-paper-dark px-2 py-0.5 border-1.5 border-ink text-ink-muted">
            {collectedHistory.length} ARCHIVED
          </span>
        </div>

        {loading ? (
          <Skeleton rows={3} type="table" />
        ) : collectedHistory.length === 0 ? (
          <div className="bg-paper border border-dashed border-ink/30 p-6 text-center rounded-sm">
            <p className="font-mono text-xs text-ink-muted">
              No collected parcel history yet.
            </p>
          </div>
        ) : (
          <div className="bg-paper-card border-1.5 border-ink rounded-sm shadow-ink divide-y-1.5 divide-dashed divide-ink/20">
            {collectedHistory.map((item) => (
              <div
                key={item._id}
                className="p-3.5 flex items-center justify-between gap-3 text-xs font-mono hover:bg-paper transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink">
                      #{item._id.slice(-6).toUpperCase()}
                    </span>
                    <span className="bg-paper-dark px-1.5 py-0.5 border border-ink text-[10px] font-bold">
                      {item.courier}
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    Collected on{' '}
                    {new Date(item.collectedAt || item.updatedAt).toLocaleDateString()}{' '}
                    at{' '}
                    {new Date(item.collectedAt || item.updatedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Stamp status="collected" size="sm" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
