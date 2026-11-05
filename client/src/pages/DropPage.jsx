import React, { useState, useRef } from 'react';
import { api, ApiError } from '../lib/api';
import { compressImage } from '../lib/imageCompressor';
import Button from '../components/Button';
import Input from '../components/Input';

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

export default function DropPage() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [courier, setCourier] = useState('Amazon');
  const [note, setNote] = useState('');
  const [photoData, setPhotoData] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [honeypot, setHoneypot] = useState('');

  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const fileInputRef = useRef(null);

  // Handle file capture & client-side compression
  const handlePhotoCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCompressing(true);
      setError(null);
      // Client-side compression to max 1200px, JPEG 0.7
      const compressedBase64 = await compressImage(file, 1200, 0.7);
      setPhotoData(compressedBase64);
      setPhotoPreview(compressedBase64);
    } catch (err) {
      setError('Failed to process photo. Please try retaking.');
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone) {
      setError('Student phone number is required.');
      return;
    }
    if (!photoData) {
      setError('Please take a clear photo of the parcel.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        phone,
        name,
        courier,
        note,
        photo: photoData,
        captchaToken: 'dev-token',
        _hp: honeypot, // Honeypot
      };

      const res = await api.post('/drop', payload);
      setResult(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Submission failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPhone('');
    setName('');
    setCourier('Amazon');
    setNote('');
    setPhotoData(null);
    setPhotoPreview(null);
    setResult(null);
    setError(null);
  };

  // SUCCESS CONFIRMATION SCREEN
  if (result) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-paper-card border-2 border-ink shadow-ink p-6 rounded-sm text-center relative overflow-hidden animate-in fade-in duration-200">
          <div className="inline-block bg-signal text-white px-3 py-1 font-mono font-bold text-xs uppercase tracking-widest border-1.5 border-ink mb-4 -rotate-1 shadow-ink-sm">
            LOGGED AT GATE
          </div>

          <h1 className="text-2xl sm:text-3xl font-black font-sans text-ink uppercase tracking-tight">
            Hand It Over Now.
          </h1>

          <p className="text-base font-sans font-bold text-signal mt-2">
            &ldquo;Now hand this parcel to the guard at the desk.&rdquo;
          </p>

          <p className="text-xs font-mono text-ink-muted mt-2">
            Do not leave it unattended. The guard will confirm intake and notify the student.
          </p>

          <div className="my-6 p-4 bg-paper border-1.5 border-ink text-left space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-ink-muted">LOG ID:</span>
              <span className="font-bold">#{result.parcel?.id?.slice(-6).toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-ink-muted">COURIER:</span>
              <span className="font-bold">{result.parcel?.courier}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-ink-muted">STUDENT:</span>
              <span className="font-bold">
                {result.parcel?.studentMatched
                  ? `${result.parcel.matchedStudentName} (${result.parcel.hostel} ${result.parcel.room})`
                  : 'Unregistered Student'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-ink-muted">STATUS:</span>
              <span className="font-bold uppercase text-signal">
                {result.parcel?.status === 'awaiting_guard'
                  ? 'Awaiting Guard Intake'
                  : 'Unmatched (At Gate Desk)'}
              </span>
            </div>
          </div>

          <Button variant="secondary" size="lg" className="w-full" onClick={handleReset}>
            Drop Another Parcel
          </Button>
        </div>
      </div>
    );
  }

  // DROP FORM SCREEN
  return (
    <div className="w-full max-w-md mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Postal Header */}
      <div className="bg-paper-dark border-1.5 border-ink p-4 mb-4 shadow-ink rounded-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold tracking-widest text-ink uppercase">
            FORM // GATE-LOG-01
          </span>
          <span className="text-[10px] font-mono bg-signal text-white px-2 py-0.5 font-bold uppercase">
            STEP 1 OF 2
          </span>
        </div>
        <h1 className="text-xl font-black font-sans text-ink tracking-tight mt-1">
          Log Parcel Drop
        </h1>
        <p className="text-xs font-mono text-ink-muted mt-0.5">
          Take a photo, enter student phone, and hand package to the guard.
        </p>
      </div>

      {error && (
        <div className="bg-brick-light border-1.5 border-brick text-brick p-3 rounded-sm mb-4 text-xs font-mono font-bold">
          [ERROR] {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Honeypot field (hidden from real users) */}
        <div style={{ display: 'none' }} aria-hidden="true">
          <label htmlFor="website-hp">Leave this empty</label>
          <input
            id="website-hp"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        {/* 1. Phone number (Required) */}
        <div className="bg-paper-card border-1.5 border-ink p-4 rounded-sm shadow-ink">
          <Input
            label="Student Phone Number"
            type="tel"
            mono
            required
            placeholder="9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            helperText="10-digit number. We'll find their hostel & notify them."
            className="text-lg py-2.5 font-bold tracking-wider"
          />
        </div>

        {/* 2. Photo capture (Required) */}
        <div className="bg-paper-card border-1.5 border-ink p-4 rounded-sm shadow-ink space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-bold tracking-wider text-ink uppercase">
              Parcel Photo <span className="text-signal">*</span>
            </label>
            {compressing && (
              <span className="text-[11px] font-mono text-signal font-bold animate-pulse">
                Optimizing image...
              </span>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoCapture}
          />

          {photoPreview ? (
            <div className="space-y-2">
              <div className="relative border-1.5 border-ink bg-white p-2">
                <img
                  src={photoPreview}
                  alt="Captured Parcel"
                  className="w-full h-48 object-cover border border-ink/20"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-4 right-4 bg-paper-card border-1.5 border-ink text-xs font-mono font-bold px-3 py-1.5 shadow-ink-sm hover:bg-paper-dark"
                >
                  Retake Photo
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-ink/40 hover:border-signal bg-paper p-6 text-center cursor-pointer transition-colors rounded-sm flex flex-col items-center justify-center gap-2"
            >
              <div className="w-12 h-12 rounded-full border-1.5 border-ink bg-white flex items-center justify-center text-ink text-xl font-mono font-black shadow-ink-sm">
                📷
              </div>
              <div>
                <p className="text-sm font-bold font-sans text-ink">
                  Tap to Take Parcel Photo
                </p>
                <p className="text-[11px] font-mono text-ink-muted">
                  Snap the shipping label & package clearly
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 3. Courier selection */}
        <div className="bg-paper-card border-1.5 border-ink p-4 rounded-sm shadow-ink space-y-2">
          <label className="text-xs font-mono font-bold tracking-wider text-ink uppercase block">
            Courier Service
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COURIER_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCourier(c)}
                className={`py-2.5 px-2 text-xs font-mono font-bold border-1.5 border-ink rounded-sm transition-all ${
                  courier === c
                    ? 'bg-ink text-paper shadow-ink-sm scale-[1.02]'
                    : 'bg-paper text-ink hover:bg-paper-dark'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Optional recipient name & note */}
        <div className="bg-paper-card border-1.5 border-ink p-4 rounded-sm shadow-ink space-y-3">
          <Input
            label="Student Name (Optional)"
            placeholder="As written on package"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Drop Note (Optional)"
            placeholder="e.g. Fragile, heavy box, envelope"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading || compressing}
          disabled={!phone || !photoData}
          className="w-full text-base py-3.5 tracking-wide uppercase"
        >
          Confirm & Log Drop
        </Button>

        <p className="text-[11px] font-mono text-center text-ink-muted">
          After logging, you must hand the package to the guard. Do not leave at gate.
        </p>
      </form>
    </div>
  );
}
