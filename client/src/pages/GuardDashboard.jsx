import React, { useState, useEffect, useRef } from 'react';
import { api, ApiError } from '../lib/api';
import { usePolling } from '../hooks/usePolling';
import ShippingTag from '../components/ShippingTag';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import Stamp from '../components/Stamp';

const COURIER_OPTIONS = [
  'Amazon',
  'Flipkart',
  'Swiggy',
  'Zomato',
  'Blinkit',
  'Myntra',
  'Meesho',
  'Other',
];

export default function GuardDashboard() {
  const [incoming, setIncoming] = useState([]);
  const [atGate, setAtGate] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [mobileTab, setMobileTab] = useState('incoming');

  // Release Modal State
  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [activeParcel, setActiveParcel] = useState(null);
  const [releaseCode, setReleaseCode] = useState('');
  const [releaseError, setReleaseError] = useState(null);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const codeInputRef = useRef(null);

  // Manual Entry Modal State
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualPhone, setManualPhone] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualCourier, setManualCourier] = useState('Amazon');
  const [manualNote, setManualNote] = useState('');
  const [manualError, setManualError] = useState(null);
  const [manualLoading, setManualLoading] = useState(false);

  // Status message
  const [bannerMessage, setBannerMessage] = useState(null);

  const fetchParcels = async () => {
    try {
      const [incomingRes, atGateRes] = await Promise.all([
        api.get('/parcels/incoming'),
        api.get(`/parcels/at-gate?search=${encodeURIComponent(search)}`),
      ]);
      setIncoming(incomingRes.parcels || []);
      setAtGate(atGateRes.parcels || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to fetch guard parcels:', err);
    } finally {
      setLoading(false);
    }
  };

  // Poll every 5s
  usePolling(fetchParcels, 5000);

  // Search input change triggers immediate fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchParcels();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Handle Mark Received
  const handleReceive = async (parcelId) => {
    try {
      const res = await api.post(`/parcels/${parcelId}/receive`);
      setBannerMessage({
        type: 'success',
        text: `Parcel #${parcelId.slice(-6).toUpperCase()} marked received at gate! Student notified.`,
      });
      fetchParcels();
    } catch (err) {
      setBannerMessage({
        type: 'error',
        text: err.message || 'Failed to mark parcel received.',
      });
    }
  };

  // Open Release Modal
  const openReleaseModal = (parcel) => {
    setActiveParcel(parcel);
    setReleaseCode('');
    setReleaseError(null);
    setReleaseModalOpen(true);
    setTimeout(() => {
      codeInputRef.current?.focus();
    }, 100);
  };

  // Submit Release Code
  const handleReleaseSubmit = async (e) => {
    e.preventDefault();
    if (!activeParcel || !releaseCode) return;

    try {
      setReleaseLoading(true);
      setReleaseError(null);

      await api.post(`/parcels/${activeParcel._id}/release`, {
        code: releaseCode.trim(),
      });

      setReleaseModalOpen(false);
      setBannerMessage({
        type: 'success',
        text: `Released parcel #${activeParcel._id.slice(-6).toUpperCase()} to ${
          activeParcel.student?.name || activeParcel.rawName || 'student'
        }!`,
      });
      fetchParcels();
    } catch (err) {
      setReleaseError(err.message);
      // Refresh to update attempt count or lock status
      fetchParcels();
    } finally {
      setReleaseLoading(false);
    }
  };

  // Submit Manual Entry
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      setManualLoading(true);
      setManualError(null);

      await api.post('/parcels', {
        phone: manualPhone,
        name: manualName,
        courier: manualCourier,
        note: manualNote,
      });

      setManualModalOpen(false);
      setManualPhone('');
      setManualName('');
      setManualCourier('Amazon');
      setManualNote('');
      setBannerMessage({
        type: 'success',
        text: 'Parcel logged manually and registered at desk!',
      });
      fetchParcels();
    } catch (err) {
      setManualError(err.message);
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Desk Banner */}
      <div className="bg-paper-dark border-2 border-ink shadow-ink p-4 rounded-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-signal text-white font-mono font-bold text-xs px-2 py-0.5 border-1.5 border-ink uppercase">
              DESK STATION
            </span>
            <h1 className="text-xl sm:text-2xl font-black font-sans text-ink uppercase tracking-tight">
              Hostel Gate Security Desk
            </h1>
          </div>
          <p className="text-xs font-mono text-ink-muted mt-0.5">
            Incoming courier drops &bull; Code verification &bull; Live sync every 5s ({lastRefreshed.toLocaleTimeString()})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setManualModalOpen(true)}
            className="flex items-center gap-1.5 font-mono"
          >
            + Manual Parcel Log
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchParcels}
            className="font-mono text-xs"
          >
            ↻ Refresh
          </Button>
        </div>
      </div>

      {/* Banner alert message */}
      {bannerMessage && (
        <div
          className={`p-3 border-1.5 font-mono text-xs font-bold rounded-sm flex justify-between items-center ${
            bannerMessage.type === 'success'
              ? 'bg-olive-light border-olive text-olive'
              : 'bg-brick-light border-brick text-brick'
          }`}
        >
          <span>{bannerMessage.text}</span>
          <button
            onClick={() => setBannerMessage(null)}
            className="font-mono font-bold px-2 py-0.5 border border-current text-xs ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden gap-2 border-b-1.5 border-ink pb-2">
        <button
          type="button"
          onClick={() => setMobileTab('incoming')}
          className={`flex-1 py-2 font-mono text-xs font-bold border-1.5 border-ink rounded-sm transition-all ${
            mobileTab === 'incoming' ? 'bg-ink text-paper shadow-ink-sm' : 'bg-paper hover:bg-paper-dark'
          }`}
        >
          Incoming Drops ({incoming.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('atgate')}
          className={`flex-1 py-2 font-mono text-xs font-bold border-1.5 border-ink rounded-sm transition-all ${
            mobileTab === 'atgate' ? 'bg-ink text-paper shadow-ink-sm' : 'bg-paper hover:bg-paper-dark'
          }`}
        >
          At Gate Desk ({atGate.length})
        </button>
      </div>

      {/* Two-Column Grid: Left Incoming / Right At Gate */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Incoming (5 cols) */}
        <div className={`lg:col-span-5 space-y-4 ${mobileTab === 'incoming' ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-paper-card border-1.5 border-ink p-3 shadow-ink rounded-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-signal rounded-full animate-ping" />
              <h2 className="font-sans font-black text-base uppercase text-ink">
                Incoming Drops
              </h2>
            </div>
            <span className="font-mono text-xs font-bold bg-ink text-paper px-2 py-0.5 border-1.5 border-ink">
              {incoming.length} PENDING
            </span>
          </div>

          <p className="text-xs font-mono text-ink-muted px-1">
            Parcels logged via QR form. Verify delivery agent is handing it to you, then tap &ldquo;Received at Desk&rdquo;.
          </p>

          {loading ? (
            <Skeleton rows={3} />
          ) : incoming.length === 0 ? (
            <div className="bg-paper border-1.5 border-dashed border-ink/40 p-8 text-center rounded-sm">
              <p className="font-mono text-sm text-ink-muted font-bold">
                Nothing waiting. Suspiciously quiet.
              </p>
              <p className="font-mono text-xs text-ink-subtle mt-1">
                New delivery QR drops will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {incoming.map((parcel) => (
                <ShippingTag
                  key={parcel._id}
                  parcel={parcel}
                  highlight={parcel.status === 'awaiting_guard'}
                  actions={
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleReceive(parcel._id)}
                      className="w-full sm:w-auto font-mono text-xs uppercase"
                    >
                      ✓ Received at Desk
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: At Gate (7 cols) */}
        <div className={`lg:col-span-7 space-y-4 ${mobileTab === 'atgate' ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-paper-card border-1.5 border-ink p-3 shadow-ink rounded-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-sans font-black text-base uppercase text-ink">
                  At Gate Desk
                </h2>
                <span className="text-xs font-mono text-ink-muted">
                  (Ready for pickup)
                </span>
              </div>
              <span className="font-mono text-xs font-bold bg-olive text-white px-2 py-0.5 border-1.5 border-ink">
                {atGate.length} STORED
              </span>
            </div>

            {/* Prominent Search Bar */}
            <div className="relative">
              <Input
                placeholder="Search by student name, phone, room, courier, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                mono
                className="text-sm py-2 pl-3 pr-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 text-xs font-mono font-bold text-ink-muted hover:text-ink"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <Skeleton rows={4} />
          ) : atGate.length === 0 ? (
            <div className="bg-paper border-1.5 border-dashed border-ink/40 p-8 text-center rounded-sm">
              <p className="font-mono text-sm text-ink-muted font-bold">
                No parcels matching search at the desk.
              </p>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="mt-2 text-xs font-mono text-signal font-bold underline"
                >
                  Clear search query
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {atGate.map((parcel) => (
                <ShippingTag
                  key={parcel._id}
                  parcel={parcel}
                  actions={
                    parcel.status === 'locked' ? (
                      <span className="text-xs font-mono text-brick font-bold">
                        Locked. Awaiting admin override.
                      </span>
                    ) : (
                      <Button
                        variant="olive"
                        size="sm"
                        onClick={() => openReleaseModal(parcel)}
                        className="w-full sm:w-auto font-mono text-xs uppercase"
                      >
                        Enter 4-Digit Code &amp; Release &rarr;
                      </Button>
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Release Code Verification */}
      <Modal
        isOpen={releaseModalOpen}
        onClose={() => setReleaseModalOpen(false)}
        title="Verify Collection Code"
        subtitle={
          activeParcel
            ? `Parcel #${activeParcel._id.slice(-6).toUpperCase()} for ${
                activeParcel.student?.name || activeParcel.rawName
              }`
            : ''
        }
      >
        {activeParcel && (
          <form onSubmit={handleReleaseSubmit} className="space-y-4">
            <div className="bg-paper p-3 border-1.5 border-ink text-xs font-mono space-y-1">
              <div>
                <span className="text-ink-muted">RECIPIENT: </span>
                <span className="font-bold">
                  {activeParcel.student?.name || activeParcel.rawName}
                </span>
                {activeParcel.student?.room && (
                  <span className="text-ink-muted">
                    {' '}
                    ({activeParcel.student.hostel} - {activeParcel.student.room})
                  </span>
                )}
              </div>
              <div>
                <span className="text-ink-muted">PHONE: </span>
                <span className="font-bold">{activeParcel.rawPhone}</span>
              </div>
              <div>
                <span className="text-ink-muted">COURIER: </span>
                <span className="font-bold">{activeParcel.courier}</span>
              </div>
              {activeParcel.codeAttempts > 0 && (
                <div className="text-brick font-bold">
                  Failed Attempts: {activeParcel.codeAttempts} / 5 (Locks on 5)
                </div>
              )}
            </div>

            {releaseError && (
              <div className="bg-brick-light border-1.5 border-brick text-brick p-2.5 rounded-sm text-xs font-mono font-bold">
                {releaseError}
              </div>
            )}

            <div>
              <label
                htmlFor="release-code-input"
                className="text-xs font-mono font-bold uppercase tracking-wider block mb-1.5 text-ink"
              >
                Enter 4-Digit Code from Student:
              </label>
              <input
                id="release-code-input"
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                required
                autoComplete="off"
                placeholder="••••"
                value={releaseCode}
                onChange={(e) => setReleaseCode(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center text-4xl font-mono font-black tracking-[12px] py-3 bg-paper-card border-2 border-ink rounded-sm focus:bg-white focus:border-signal"
              />
              <p className="text-[11px] font-mono text-ink-muted mt-1 text-center">
                Check student College ID before releasing. Press Enter to confirm.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="md"
                className="w-1/2"
                onClick={() => setReleaseModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="olive"
                size="md"
                className="w-1/2 uppercase font-mono"
                loading={releaseLoading}
                disabled={releaseCode.length !== 4}
              >
                Release Parcel
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 2: Guard Manual Parcel Entry */}
      <Modal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        title="Manual Parcel Intake"
        subtitle="When delivery agent dropped without scanning the QR code"
      >
        <form onSubmit={handleManualSubmit} className="space-y-3">
          {manualError && (
            <div className="bg-brick-light border-1.5 border-brick text-brick p-2.5 rounded-sm text-xs font-mono font-bold">
              {manualError}
            </div>
          )}

          <Input
            label="Student Phone"
            type="tel"
            mono
            required
            placeholder="9876543210"
            value={manualPhone}
            onChange={(e) => setManualPhone(e.target.value)}
          />

          <Input
            label="Student Name (Optional)"
            placeholder="Name from label"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
          />

          <div>
            <label className="text-xs font-mono font-bold tracking-wider text-ink uppercase block mb-1">
              Courier
            </label>
            <div className="grid grid-cols-4 gap-1">
              {COURIER_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setManualCourier(c)}
                  className={`py-1.5 text-xs font-mono font-bold border-1.5 border-ink rounded-sm transition-all ${
                    manualCourier === c
                      ? 'bg-ink text-paper'
                      : 'bg-paper text-ink hover:bg-paper-dark'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Note (Optional)"
            placeholder="e.g. envelope, damaged box"
            value={manualNote}
            onChange={(e) => setManualNote(e.target.value)}
          />

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="md"
              className="w-1/2"
              onClick={() => setManualModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-1/2 uppercase font-mono"
              loading={manualLoading}
              disabled={!manualPhone}
            >
              Log &amp; Intake
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
