import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import Header from './components/Header';
import DropPage from './pages/DropPage';
import StudentDashboard from './pages/StudentDashboard';
import GuardDashboard from './pages/GuardDashboard';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Button from './components/Button';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-12 text-center font-mono text-sm text-ink-muted">
        Checking credentials at checkpoint...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-md mx-auto p-8 text-center space-y-4">
        <div className="bg-brick-light border-2 border-brick p-6 rounded-sm text-brick">
          <h2 className="text-xl font-bold font-sans uppercase">Access Restricted</h2>
          <p className="text-xs font-mono mt-2">
            Your role ({user.role}) does not have clearance for this checkpoint.
          </p>
        </div>
        <Link to="/">
          <Button variant="secondary" size="sm">
            Return to Gate
          </Button>
        </Link>
      </div>
    );
  }

  return children;
}

function HomePage() {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-12 space-y-6 sm:space-y-8">
      {/* Customs Gate Banner */}
      <div className="bg-paper-card border-2 border-ink shadow-ink p-5 sm:p-8 rounded-sm text-center relative overflow-hidden">
        <div className="inline-block bg-ink text-paper font-mono font-bold text-xs uppercase px-3 py-1 border-1.5 border-ink mb-3 shadow-[2px_2px_0_#FF5B1F]">
          CAMPUS SECURITY DESK // GATEKEPT
        </div>

        <h1 className="text-2xl sm:text-5xl font-black font-sans uppercase tracking-tight text-ink">
          Never Leave Parcels At The Gate.
        </h1>

        <p className="max-w-xl mx-auto font-mono text-xs sm:text-sm text-ink-muted mt-2 sm:mt-3">
          Delivery agents log the drop with a photo and hand it to the guard. Students get an instant code. The guard releases only against a verified college ID and code.
        </p>

        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Link to="/drop" className="w-full sm:w-auto">
            <Button variant="primary" size="lg" className="w-full sm:w-auto font-mono text-sm sm:text-base tracking-wide uppercase py-3 sm:py-3.5 px-6">
              [QR] Delivery Drop Form &rarr;
            </Button>
          </Link>

          {!user ? (
            <Link to="/login" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto font-mono text-sm sm:text-base py-3 sm:py-3.5 px-6">
                Sign In to Portal
              </Button>
            </Link>
          ) : user.role === 'student' ? (
            <Link to="/student" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto font-mono text-sm sm:text-base py-3 sm:py-3.5 px-6">
                Open My Parcels &rarr;
              </Button>
            </Link>
          ) : user.role === 'guard' ? (
            <Link to="/guard" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto font-mono text-sm sm:text-base py-3 sm:py-3.5 px-6">
                Open Guard Desk &rarr;
              </Button>
            </Link>
          ) : (
            <Link to="/admin" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto font-mono text-sm sm:text-base py-3 sm:py-3.5 px-6">
                Open Admin Station &rarr;
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* 3 Portal Role Entry Points (Customs Counter Design) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Delivery */}
        <div className="bg-paper-card border-1.5 border-ink p-5 rounded-sm shadow-ink flex flex-col justify-between">
          <div>
            <span className="font-mono text-[10px] bg-paper-dark px-2 py-0.5 border border-ink font-bold uppercase">
              DELIVERY AGENTS
            </span>
            <h3 className="font-sans font-black text-lg text-ink mt-2">
              Public Drop Page
            </h3>
            <p className="font-mono text-xs text-ink-muted mt-1">
              No login required. Snap photo of parcel, enter student phone, and hand to desk.
            </p>
          </div>
          <Link to="/drop" className="mt-4">
            <Button variant="outline" size="sm" className="w-full font-mono">
              Open /drop &rarr;
            </Button>
          </Link>
        </div>

        {/* Students */}
        <div className="bg-paper-card border-1.5 border-ink p-5 rounded-sm shadow-ink flex flex-col justify-between">
          <div>
            <span className="font-mono text-[10px] bg-olive-light text-olive px-2 py-0.5 border border-olive font-bold uppercase">
              STUDENT RESIDENTS
            </span>
            <h3 className="font-sans font-black text-lg text-ink mt-2">
              Collection Codes
            </h3>
            <p className="font-mono text-xs text-ink-muted mt-1">
              Verify with college email. View arrived parcels, 4-digit stamped pickup codes, and history.
            </p>
          </div>
          <Link to="/student" className="mt-4">
            <Button variant="outline" size="sm" className="w-full font-mono">
              Student Ledger &rarr;
            </Button>
          </Link>
        </div>

        {/* Guards & Admins */}
        <div className="bg-paper-card border-1.5 border-ink p-5 rounded-sm shadow-ink flex flex-col justify-between">
          <div>
            <span className="font-mono text-[10px] bg-amber-light text-amber px-2 py-0.5 border border-amber font-bold uppercase">
              HOSTEL SECURITY
            </span>
            <h3 className="font-sans font-black text-lg text-ink mt-2">
              Guard &amp; Admin Desk
            </h3>
            <p className="font-mono text-xs text-ink-muted mt-1">
              Receive incoming packages, verify 4-digit codes, manage lockouts, and audit logs.
            </p>
          </div>
          <Link to="/guard" className="mt-4">
            <Button variant="outline" size="sm" className="w-full font-mono">
              Desk Terminal &rarr;
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/drop" element={<DropPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/student"
                element={
                  <ProtectedRoute allowedRoles={['student', 'admin']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/guard"
                element={
                  <ProtectedRoute allowedRoles={['guard', 'admin']}>
                    <GuardDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

