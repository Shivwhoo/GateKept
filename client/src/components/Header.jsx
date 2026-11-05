import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import Button from './Button';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="border-b-1.5 border-ink bg-paper-card sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" onClick={closeMenu} className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-ink text-paper flex items-center justify-center font-mono font-black text-lg border-1.5 border-ink shadow-[2px_2px_0_#FF5B1F]">
            G
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-sans font-black text-lg tracking-tight text-ink group-hover:text-signal transition-colors">
                GATEKEPT
              </span>
              <span className="text-[10px] font-mono uppercase bg-paper-dark px-1.5 py-0.2 border-1.5 border-ink font-bold">
                IIIT-DWD
              </span>
            </div>
            <p className="text-[10px] font-mono text-ink-muted -mt-0.5 uppercase tracking-wider">
              Gate Parcel Desk
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-3 text-xs font-mono">
          <Link
            to="/drop"
            className={`px-3 py-1.5 border-1.5 border-ink font-bold transition-all ${
              location.pathname === '/drop'
                ? 'bg-signal text-white shadow-ink-sm'
                : 'bg-paper hover:bg-paper-dark'
            }`}
          >
            [QR] DROP PARCEL
          </Link>

          {user && (
            <>
              {user.role === 'student' && (
                <Link
                  to="/student"
                  className={`px-3 py-1.5 border-1.5 border-ink font-bold transition-all ${
                    location.pathname === '/student'
                      ? 'bg-paper-dark shadow-ink-sm'
                      : 'hover:bg-paper'
                  }`}
                >
                  MY PARCELS
                </Link>
              )}
              {(user.role === 'guard' || user.role === 'admin') && (
                <Link
                  to="/guard"
                  className={`px-3 py-1.5 border-1.5 border-ink font-bold transition-all ${
                    location.pathname === '/guard'
                      ? 'bg-paper-dark shadow-ink-sm'
                      : 'hover:bg-paper'
                  }`}
                >
                  GUARD DESK
                </Link>
              )}
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`px-3 py-1.5 border-1.5 border-ink font-bold transition-all ${
                    location.pathname === '/admin'
                      ? 'bg-paper-dark shadow-ink-sm'
                      : 'hover:bg-paper'
                  }`}
                >
                  ADMIN LOG
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Desktop Right Actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              <div className="text-right">
                <div className="text-xs font-bold font-sans text-ink leading-tight">{user.name}</div>
                <div className="text-[10px] font-mono text-ink-muted uppercase">
                  {user.role} &bull; {user.hostel} {user.room ? `#${user.room}` : ''}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="secondary" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger / Quick Bar Button */}
        <div className="flex md:hidden items-center gap-2">
          <Link to="/drop" className="bg-signal text-white px-2 py-1 border-1.5 border-ink font-mono font-bold text-[11px] shadow-ink-sm">
            DROP
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 border-1.5 border-ink bg-paper-card active:bg-paper-dark shadow-ink-sm text-ink font-mono font-black text-sm"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t-1.5 border-ink bg-paper-card p-4 space-y-3 animate-in slide-in-from-top-2">
          {user && (
            <div className="p-2.5 bg-paper border-1.5 border-ink text-xs font-mono mb-2">
              <div className="font-bold text-ink">{user.name}</div>
              <div className="text-ink-muted text-[11px]">
                {user.email} &bull; {user.role.toUpperCase()}
              </div>
              <div className="text-[10px] text-ink-muted">
                {user.hostel} {user.room ? `- Room ${user.room}` : ''}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 font-mono text-xs">
            <Link
              to="/drop"
              onClick={closeMenu}
              className={`p-2.5 border-1.5 border-ink font-bold flex justify-between items-center ${
                location.pathname === '/drop' ? 'bg-signal text-white' : 'bg-paper'
              }`}
            >
              <span>[QR] DROP PARCEL FORM</span>
              <span>&rarr;</span>
            </Link>

            {user?.role === 'student' && (
              <Link
                to="/student"
                onClick={closeMenu}
                className={`p-2.5 border-1.5 border-ink font-bold flex justify-between items-center ${
                  location.pathname === '/student' ? 'bg-paper-dark' : 'bg-paper'
                }`}
              >
                <span>MY PARCELS &amp; CODES</span>
                <span>&rarr;</span>
              </Link>
            )}

            {(user?.role === 'guard' || user?.role === 'admin') && (
              <Link
                to="/guard"
                onClick={closeMenu}
                className={`p-2.5 border-1.5 border-ink font-bold flex justify-between items-center ${
                  location.pathname === '/guard' ? 'bg-paper-dark' : 'bg-paper'
                }`}
              >
                <span>GUARD DESK TERMINAL</span>
                <span>&rarr;</span>
              </Link>
            )}

            {user?.role === 'admin' && (
              <Link
                to="/admin"
                onClick={closeMenu}
                className={`p-2.5 border-1.5 border-ink font-bold flex justify-between items-center ${
                  location.pathname === '/admin' ? 'bg-paper-dark' : 'bg-paper'
                }`}
              >
                <span>ADMIN STATION &amp; LOGBOOK</span>
                <span>&rarr;</span>
              </Link>
            )}

            {!user ? (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link to="/login" onClick={closeMenu}>
                  <Button variant="secondary" size="md" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" onClick={closeMenu}>
                  <Button variant="primary" size="md" className="w-full">
                    Register
                  </Button>
                </Link>
              </div>
            ) : (
              <Button
                variant="outline"
                size="md"
                onClick={handleLogout}
                className="w-full mt-2 font-mono text-xs uppercase"
              >
                Sign Out
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}