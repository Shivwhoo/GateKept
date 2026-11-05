import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';
import Button from '../components/Button';
import Input from '../components/Input';

export default function RegisterPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { register, verifyOtp, bypassVerify, resendOtp } = useAuth();

  // Registration Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState(location.state?.email || '');
  const [phone, setPhone] = useState('');
  const [hostel, setHostel] = useState('Hostel Block 1');
  const [room, setRoom] = useState('');
  const [password, setPassword] = useState('');

  // Step state: 'form' | 'verify'
  const [step, setStep] = useState(location.state?.step || 'form');
  const [otp, setOtp] = useState('');
  const [toastOtp, setToastOtp] = useState(location.state?.otp || null);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [bypassing, setBypassing] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // If email was passed in state, set it
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
    if (location.state?.otp) {
      setToastOtp(location.state.otp);
    }
  }, [location.state]);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const res = await register({
        name,
        email,
        phone,
        hostel,
        room,
        password,
      });

      setStep('verify');
      if (res.otp) {
        setToastOtp(res.otp);
      }
      setSuccessMsg(`Verification code generated for ${email}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Registration failed. Please check your inputs.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const res = await verifyOtp(email, otp);
      navigate('/student', {
        state: { welcome: true, claimedCount: res.claimedParcelsCount },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Invalid or expired verification code.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Instant 1-click bypass handler
  const handleBypass = async () => {
    try {
      setBypassing(true);
      setError(null);
      const res = await bypassVerify(email);
      navigate('/student', {
        state: { welcome: true, claimedCount: res.claimedParcelsCount },
      });
    } catch (err) {
      setError(err.message || 'Bypass verification failed.');
    } finally {
      setBypassing(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setResending(true);
      setError(null);
      const res = await resendOtp(email);
      if (res.otp) {
        setToastOtp(res.otp);
      }
      setSuccessMsg(`New verification code generated for ${email}`);
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  const handleAutoFillAndVerify = async (codeToUse) => {
    setOtp(codeToUse);
    try {
      setLoading(true);
      setError(null);
      const res = await verifyOtp(email, codeToUse);
      navigate('/student', {
        state: { welcome: true, claimedCount: res.claimedParcelsCount },
      });
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-3 sm:px-4 py-4 sm:py-8">
      {/* ON-SCREEN OTP TOAST BANNER */}
      {toastOtp && (
        <div className="mb-4 bg-paper-card border-2 border-signal shadow-ink p-3.5 rounded-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase bg-signal text-white px-2 py-0.5">
              OTP NOTIFICATION TOAST
            </span>
            <button
              onClick={() => setToastOtp(null)}
              className="text-xs font-mono font-bold text-ink-muted hover:text-ink px-1"
            >
              ✕
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-mono text-ink-muted">Your One-Time Code:</p>
              <p className="text-2xl font-mono font-black text-signal tracking-[6px]">{toastOtp}</p>
            </div>
            <Button
              variant="olive"
              size="sm"
              onClick={() => handleAutoFillAndVerify(toastOtp)}
              className="font-mono text-xs uppercase"
            >
              Auto-Fill &amp; Verify &rarr;
            </Button>
          </div>
        </div>
      )}

      <div className="bg-paper-card border-2 border-ink shadow-ink p-5 sm:p-6 rounded-sm space-y-5">
        {/* Header */}
        <div className="border-b-1.5 border-ink pb-3 sm:pb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[11px] font-bold text-ink uppercase tracking-widest">
              RESIDENT ENROLLMENT
            </span>
            <span className="font-mono text-[10px] bg-signal text-white px-2 py-0.5 border-1.5 border-ink font-bold uppercase">
              {step === 'form' ? 'STEP 1: DETAILS' : 'STEP 2: OTP'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-sans text-ink uppercase tracking-tight">
            {step === 'form' ? 'Student Registration' : 'Verify Account'}
          </h1>
          <p className="text-xs font-mono text-ink-muted mt-0.5">
            {step === 'form'
              ? 'Enter your campus details to receive arrival codes for your packages.'
              : `Verification for ${email}`}
          </p>
        </div>

        {error && (
          <div className="bg-brick-light border-1.5 border-brick text-brick p-2.5 sm:p-3 rounded-sm text-xs font-mono font-bold">
            [ERROR] {error}
          </div>
        )}

        {successMsg && !error && (
          <div className="bg-olive-light border-1.5 border-olive text-olive p-2.5 sm:p-3 rounded-sm text-xs font-mono font-bold">
            [INFO] {successMsg}
          </div>
        )}

        {/* STEP 1: Registration Form */}
        {step === 'form' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3 sm:space-y-4">
            <Input
              label="Full Name"
              required
              placeholder="e.g. Shiv"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Input
              label="College Email"
              type="email"
              mono
              required
              placeholder="24bcs140@iiitdwd.ac.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              helperText="Must belong to @iiitdwd.ac.in (or allowed campus domain)."
            />

            <Input
              label="Mobile Phone"
              type="tel"
              mono
              required
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              helperText="10-digit number used by couriers on parcel labels."
            />

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="text-xs font-mono font-bold tracking-wider text-ink uppercase block mb-1">
                  Hostel <span className="text-signal">*</span>
                </label>
                <select
                  value={hostel}
                  onChange={(e) => setHostel(e.target.value)}
                  className="w-full px-2.5 py-2 bg-paper-card border-1.5 border-ink rounded-sm text-xs font-mono font-bold text-ink focus:bg-white"
                >
                  <option value="Hostel Block 1">Hostel Block 1</option>
                  <option value="Hostel Block 2">Hostel Block 2</option>
                  <option value="Girls Hostel">Girls Hostel</option>
                  <option value="Hostel A">Hostel A</option>
                  <option value="Hostel B">Hostel B</option>
                  <option value="Hostel C">Hostel C</option>
                  <option value="Hostel D">Hostel D</option>
                </select>
              </div>

              <Input
                label="Room Number"
                mono
                required
                placeholder="e.g. 140"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>

            <Input
              label="Create Password"
              type="password"
              required
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full font-mono uppercase text-xs sm:text-sm tracking-wide py-3"
              loading={loading}
            >
              Continue &rarr;
            </Button>
          </form>
        )}

        {/* STEP 2: OTP Verification & Bypass */}
        {step === 'verify' && (
          <div className="space-y-4">
            <form onSubmit={handleVerifySubmit} className="space-y-3.5">
              <div className="text-center py-1">
                <label
                  htmlFor="otp-input"
                  className="text-xs font-mono font-bold uppercase tracking-wider block mb-1.5 text-ink"
                >
                  6-Digit Verification Code
                </label>
                <input
                  id="otp-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center text-2xl sm:text-3xl font-mono font-black tracking-[8px] sm:tracking-[10px] py-2.5 sm:py-3 bg-paper-card border-2 border-ink rounded-sm focus:bg-white focus:border-signal"
                />
                <p className="text-[11px] font-mono text-ink-muted mt-1.5">
                  Check toast notification above or console mock.
                </p>
              </div>

              <Button
                type="submit"
                variant="olive"
                size="lg"
                className="w-full font-mono uppercase text-xs sm:text-sm tracking-wide py-3"
                loading={loading}
                disabled={otp.length !== 6}
              >
                Verify &amp; Activate &rarr;
              </Button>
            </form>

            {/* DIRECT 1-CLICK BYPASS BUTTON */}
            <div className="bg-paper p-3 border-1.5 border-dashed border-ink/40 rounded-sm text-center space-y-2">
              <p className="text-[11px] font-mono text-ink-muted">
                Email server slow or not working?
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBypass}
                loading={bypassing}
                className="w-full font-mono text-xs uppercase"
              >
                ⚡ Bypass Verification &amp; Activate Now
              </Button>
            </div>

            <div className="flex items-center justify-between text-xs font-mono pt-1">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="text-ink-muted hover:text-ink underline"
              >
                &larr; Edit Details
              </button>
              <button
                type="button"
                disabled={resending}
                onClick={handleResendOtp}
                className="text-signal font-bold hover:underline disabled:opacity-50"
              >
                {resending ? 'Generating...' : 'Resend Code'}
              </button>
            </div>
          </div>
        )}

        <div className="border-t-1.5 border-dashed border-ink/40 pt-3 text-center">
          <p className="text-xs font-mono text-ink-muted">
            Already registered?{' '}
            <Link to="/login" className="text-signal font-bold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
