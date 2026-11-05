import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';
import Button from '../components/Button';
import Input from '../components/Input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await login(email, password);

      // Redirect according to role
      if (res.user.role === 'guard') {
        navigate('/guard');
      } else if (res.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'EMAIL_NOT_VERIFIED') {
          // Redirect to verify with OTP toast
          navigate('/register', { state: { email, step: 'verify', otp: err.data?.otp } });
          return;
        }
        setError(err.message);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-paper-card border-2 border-ink shadow-ink p-6 rounded-sm space-y-6">
        {/* Header */}
        <div className="border-b-1.5 border-ink pb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-xs font-bold text-ink uppercase tracking-widest">
              CHECKPOINT // AUTH
            </span>
            <span className="font-mono text-[10px] bg-paper-dark px-2 py-0.5 border-1.5 border-ink uppercase">
              SECURE SESSION
            </span>
          </div>
          <h1 className="text-2xl font-black font-sans text-ink uppercase tracking-tight">
            Sign In to Gatekept
          </h1>
          <p className="text-xs font-mono text-ink-muted mt-1">
            Students, guards, and hostel administrators.
          </p>
        </div>

        {error && (
          <div className="bg-brick-light border-1.5 border-brick text-brick p-3 rounded-sm text-xs font-mono font-bold">
            [ERROR] {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="College Email"
            type="email"
            required
            mono
            placeholder="24bcs140@iiitdwd.ac.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Password"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full font-mono uppercase text-sm tracking-wide"
            loading={loading}
          >
            Authenticate &rarr;
          </Button>
        </form>

        <div className="border-t-1.5 border-dashed border-ink/40 pt-4 text-center space-y-2">
          <p className="text-xs font-mono text-ink-muted">
            New student on campus?
          </p>
          <Link to="/register">
            <Button variant="secondary" size="sm" className="w-full font-mono">
              Register Student Account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
