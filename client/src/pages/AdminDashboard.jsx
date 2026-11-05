import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../lib/api';
import Button from '../components/Button';
import Input from '../components/Input';
import Stamp from '../components/Stamp';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';

const STATUS_FILTERS = [
  'ALL',
  'at_gate',
  'awaiting_guard',
  'collected',
  'unmatched',
  'locked',
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('parcels'); // 'parcels' | 'users'
  const [stats, setStats] = useState(null);
  const [parcels, setParcels] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState(null);

  // Form states for Create Guard
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('guard');
  const [userError, setUserError] = useState(null);
  const [userLoading, setUserLoading] = useState(false);

  // Banner
  const [banner, setBanner] = useState(null);

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.stats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const fetchParcels = async () => {
    try {
      let query = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      if (search) {
        query += `${query ? '&' : '?'}search=${encodeURIComponent(search)}`;
      }
      const res = await api.get(`/admin/parcels${query}`);
      setParcels(res.parcels || []);
    } catch (err) {
      console.error('Failed to load parcels:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchParcels(), fetchUsers()]);
      setLoading(false);
    };
    init();
  }, [statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchParcels();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // CSV Export
  const handleExportCsv = async () => {
    try {
      const blob = await api.get('/admin/export.csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gatekept_parcel_log_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setBanner({ type: 'error', text: 'CSV export failed.' });
    }
  };

  // Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setUserLoading(true);
      setUserError(null);
      await api.post('/admin/users', {
        name: newUserName,
        email: newUserEmail,
        phone: newUserPhone,
        password: newUserPassword,
        role: newUserRole,
      });

      setCreateUserOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setNewUserPassword('');
      setBanner({ type: 'success', text: `Created ${newUserRole} account successfully!` });
      fetchUsers();
    } catch (err) {
      setUserError(err.message);
    } finally {
      setUserLoading(false);
    }
  };

  // Toggle User Active Status
  const handleToggleUserActive = async (user) => {
    try {
      await api.patch(`/admin/users/${user._id}`, {
        isActive: !user.isActive,
      });
      fetchUsers();
      setBanner({
        type: 'success',
        text: `User ${user.name} ${user.isActive ? 'deactivated' : 'activated'}.`,
      });
    } catch (err) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  // Handle Admin Override on Locked Parcel
  const handleAdminOverride = async (action) => {
    if (!selectedParcel) return;
    try {
      await api.post(`/admin/parcels/${selectedParcel._id}/override`, { action });
      setOverrideModalOpen(false);
      setBanner({
        type: 'success',
        text: `Parcel #${selectedParcel._id.slice(-6).toUpperCase()} ${
          action === 'release' ? 'released' : 'unlocked'
        } successfully.`,
      });
      fetchParcels();
      fetchStats();
    } catch (err) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  // Filter out escalated parcels for top alert banner
  const escalatedParcels = parcels.filter((p) => p.escalatedAt && p.status === 'at_gate');

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Admin Station Header */}
      <div className="bg-paper-dark border-2 border-ink shadow-ink p-4 rounded-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-ink text-paper font-mono font-bold text-xs px-2 py-0.5 border-1.5 border-ink uppercase">
              SUPERINTENDENT
            </span>
            <h1 className="text-xl sm:text-2xl font-black font-sans text-ink uppercase tracking-tight">
              Hostel Parcel Administration
            </h1>
          </div>
          <p className="text-xs font-mono text-ink-muted mt-0.5">
            Full audit logbook &bull; Security personnel management &bull; CSV reporting
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            className="font-mono text-xs"
          >
            ↓ Export CSV Log
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateUserOpen(true)}
            className="font-mono text-xs"
          >
            + Create Guard
          </Button>
        </div>
      </div>

      {/* Banner */}
      {banner && (
        <div
          className={`p-3 border-1.5 font-mono text-xs font-bold rounded-sm flex justify-between items-center ${
            banner.type === 'success'
              ? 'bg-olive-light border-olive text-olive'
              : 'bg-brick-light border-brick text-brick'
          }`}
        >
          <span>{banner.text}</span>
          <button
            onClick={() => setBanner(null)}
            className="font-mono text-xs px-2 py-0.5 border border-current"
          >
            ✕
          </button>
        </div>
      )}

      {/* ESCALATED PARCEL NOTICE (Section 5: "if more than 24 hours, show at top of admin dashboard") */}
      {escalatedParcels.length > 0 && (
        <div className="bg-brick-light border-2 border-brick p-4 rounded-sm shadow-ink space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-xs uppercase bg-brick text-white px-2 py-0.5">
                URGENT // ESCALATED
              </span>
              <h3 className="font-sans font-black text-sm uppercase text-brick">
                {escalatedParcels.length} Parcel(s) Unclaimed for Over 24 Hours!
              </h3>
            </div>
            <span className="font-mono text-xs font-bold text-brick">
              Gate Storage Clutter Warning
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            {escalatedParcels.slice(0, 4).map((p) => (
              <div
                key={p._id}
                className="bg-white p-2.5 border-1.5 border-brick rounded-sm flex justify-between items-center text-xs font-mono"
              >
                <div>
                  <span className="font-bold">
                    #{p._id.slice(-6).toUpperCase()} &bull; {p.courier}
                  </span>
                  <div className="text-ink-muted">
                    {p.student?.name || p.rawName} ({p.student?.hostel} {p.student?.room})
                  </div>
                </div>
                <span className="text-[10px] bg-brick text-white px-1.5 py-0.5 font-bold uppercase">
                  &gt;24H AT GATE
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMPACT STATS STRIP */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-paper-card border-1.5 border-ink p-3 rounded-sm shadow-ink">
            <span className="text-[10px] font-mono text-ink-muted uppercase block">
              Today&apos;s Drops
            </span>
            <span className="text-2xl font-mono font-black text-ink">
              {stats.todayDrops}
            </span>
          </div>

          <div className="bg-paper-card border-1.5 border-ink p-3 rounded-sm shadow-ink">
            <span className="text-[10px] font-mono text-ink-muted uppercase block">
              Pending at Gate
            </span>
            <span className="text-2xl font-mono font-black text-signal">
              {stats.pendingAtGate}
            </span>
          </div>

          <div className="bg-paper-card border-1.5 border-ink p-3 rounded-sm shadow-ink">
            <span className="text-[10px] font-mono text-ink-muted uppercase block">
              Avg Pickup Time
            </span>
            <span className="text-2xl font-mono font-black text-ink">
              {stats.avgTimeToCollectMinutes} <span className="text-xs font-normal">min</span>
            </span>
          </div>

          <div className="bg-paper-card border-1.5 border-ink p-3 rounded-sm shadow-ink">
            <span className="text-[10px] font-mono text-ink-muted uppercase block">
              Total Collected
            </span>
            <span className="text-2xl font-mono font-black text-olive">
              {stats.totalCollected}
            </span>
          </div>

          <div className="bg-paper-card border-1.5 border-ink p-3 rounded-sm shadow-ink">
            <span className="text-[10px] font-mono text-ink-muted uppercase block">
              Unmatched Phone
            </span>
            <span className="text-2xl font-mono font-black text-amber">
              {stats.unmatchedCount}
            </span>
          </div>

          <div className="bg-paper-card border-1.5 border-ink p-3 rounded-sm shadow-ink">
            <span className="text-[10px] font-mono text-ink-muted uppercase block">
              Locked Parcels
            </span>
            <span className="text-2xl font-mono font-black text-brick">
              {stats.lockedCount}
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b-1.5 border-ink gap-2 text-xs font-mono">
        <button
          onClick={() => setActiveTab('parcels')}
          className={`px-4 py-2 font-bold uppercase border-t-1.5 border-x-1.5 border-ink rounded-t-sm transition-colors ${
            activeTab === 'parcels'
              ? 'bg-paper-card -mb-[1.5px] border-b-1.5 border-b-paper-card'
              : 'bg-paper-dark hover:bg-paper'
          }`}
        >
          All Parcels Ledger ({parcels.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-bold uppercase border-t-1.5 border-x-1.5 border-ink rounded-t-sm transition-colors ${
            activeTab === 'users'
              ? 'bg-paper-card -mb-[1.5px] border-b-1.5 border-b-paper-card'
              : 'bg-paper-dark hover:bg-paper'
          }`}
        >
          User Accounts ({users.length})
        </button>
      </div>

      {/* TAB 1: ALL PARCELS LEDGER */}
      {activeTab === 'parcels' && (
        <div className="space-y-4">
          {/* Filter Chips & Search Bar */}
          <div className="bg-paper-card border-1.5 border-ink p-3 rounded-sm shadow-ink flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-mono font-bold uppercase text-ink-muted mr-1">
                Status:
              </span>
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs font-mono font-bold uppercase px-2.5 py-1 border-1.5 border-ink rounded-sm transition-all ${
                    statusFilter === s
                      ? 'bg-ink text-paper shadow-ink-sm'
                      : 'bg-paper hover:bg-paper-dark'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="w-full sm:w-64">
              <Input
                placeholder="Search recipient, phone, room..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                mono
                className="text-xs py-1.5"
              />
            </div>
          </div>

          {/* Sticky Header Data Table */}
          <div className="bg-paper-card border-2 border-ink shadow-ink rounded-sm overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse min-w-[700px]">
              <thead className="bg-paper-dark border-b-2 border-ink sticky top-0 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3 border-r-1.5 border-ink">ID / Courier</th>
                  <th className="p-3 border-r-1.5 border-ink">Recipient</th>
                  <th className="p-3 border-r-1.5 border-ink">Phone</th>
                  <th className="p-3 border-r-1.5 border-ink">Hostel / Room</th>
                  <th className="p-3 border-r-1.5 border-ink">Dropped At</th>
                  <th className="p-3 border-r-1.5 border-ink">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y-1.5 divide-ink/20">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center">
                      <Skeleton rows={4} type="table" />
                    </td>
                  </tr>
                ) : parcels.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-ink-muted">
                      No parcels found matching current filters.
                    </td>
                  </tr>
                ) : (
                  parcels.map((parcel) => (
                    <tr
                      key={parcel._id}
                      className="hover:bg-paper transition-colors"
                    >
                      <td className="p-3 border-r-1.5 border-ink font-bold">
                        <div>#{parcel._id.slice(-6).toUpperCase()}</div>
                        <span className="text-[10px] bg-paper px-1.5 py-0.5 border border-ink">
                          {parcel.courier}
                        </span>
                      </td>

                      <td className="p-3 border-r-1.5 border-ink">
                        <div className="font-bold text-ink">
                          {parcel.student?.name || parcel.rawName || 'Unregistered'}
                        </div>
                        {parcel.student?.email && (
                          <div className="text-[10px] text-ink-muted">
                            {parcel.student.email}
                          </div>
                        )}
                      </td>

                      <td className="p-3 border-r-1.5 border-ink font-bold">
                        {parcel.rawPhone}
                      </td>

                      <td className="p-3 border-r-1.5 border-ink">
                        {parcel.student ? (
                          <span>
                            {parcel.student.hostel} - {parcel.student.room}
                          </span>
                        ) : (
                          <span className="text-ink-muted italic">—</span>
                        )}
                      </td>

                      <td className="p-3 border-r-1.5 border-ink text-ink-muted">
                        {new Date(parcel.droppedAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        {new Date(parcel.droppedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="p-3 border-r-1.5 border-ink">
                        <Stamp status={parcel.status} size="sm" />
                      </td>

                      <td className="p-3 text-right">
                        {parcel.status === 'locked' ? (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              setSelectedParcel(parcel);
                              setOverrideModalOpen(true);
                            }}
                            className="font-mono text-[10px] py-1"
                          >
                            ⚡ Override
                          </Button>
                        ) : (
                          <span className="text-[11px] text-ink-muted">Normal</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-paper-card border-2 border-ink shadow-ink rounded-sm overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse min-w-[600px]">
            <thead className="bg-paper-dark border-b-2 border-ink sticky top-0 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3 border-r-1.5 border-ink">Name</th>
                <th className="p-3 border-r-1.5 border-ink">Email</th>
                <th className="p-3 border-r-1.5 border-ink">Phone</th>
                <th className="p-3 border-r-1.5 border-ink">Role</th>
                <th className="p-3 border-r-1.5 border-ink">Location</th>
                <th className="p-3 border-r-1.5 border-ink">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y-1.5 divide-ink/20">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-paper transition-colors">
                  <td className="p-3 border-r-1.5 border-ink font-bold">{u.name}</td>
                  <td className="p-3 border-r-1.5 border-ink">{u.email}</td>
                  <td className="p-3 border-r-1.5 border-ink">{u.phone}</td>
                  <td className="p-3 border-r-1.5 border-ink uppercase">
                    <span
                      className={`px-2 py-0.5 border border-ink text-[10px] font-bold ${
                        u.role === 'admin'
                          ? 'bg-ink text-paper'
                          : u.role === 'guard'
                          ? 'bg-amber-light text-amber'
                          : 'bg-paper'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 border-r-1.5 border-ink">
                    {u.hostel} {u.room ? `- ${u.room}` : ''}
                  </td>
                  <td className="p-3 border-r-1.5 border-ink">
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 border ${
                        u.isActive
                          ? 'bg-olive-light border-olive text-olive'
                          : 'bg-brick-light border-brick text-brick'
                      }`}
                    >
                      {u.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleToggleUserActive(u)}
                      className="text-xs font-mono font-bold underline hover:text-signal"
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: Create Guard Account */}
      <Modal
        isOpen={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        title="Add Personnel Account"
        subtitle="Create security guard or gate staff login"
      >
        <form onSubmit={handleCreateUser} className="space-y-3">
          {userError && (
            <div className="bg-brick-light border-1.5 border-brick text-brick p-2.5 rounded-sm text-xs font-mono font-bold">
              {userError}
            </div>
          )}

          <Input
            label="Staff Name"
            required
            placeholder="e.g. Guard Baldev"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
          />

          <Input
            label="Staff Email"
            type="email"
            mono
            required
            placeholder="guard@iiitdwd.ac.in"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
          />

          <Input
            label="Phone"
            type="tel"
            mono
            required
            placeholder="9876543210"
            value={newUserPhone}
            onChange={(e) => setNewUserPhone(e.target.value)}
          />

          <Input
            label="Temporary Password"
            type="password"
            required
            placeholder="••••••••"
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
          />

          <div>
            <label className="text-xs font-mono font-bold tracking-wider text-ink uppercase block mb-1">
              Role
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNewUserRole('guard')}
                className={`w-1/2 py-2 border-1.5 border-ink text-xs font-mono font-bold ${
                  newUserRole === 'guard' ? 'bg-ink text-paper' : 'bg-paper hover:bg-paper-dark'
                }`}
              >
                SECURITY GUARD
              </button>
              <button
                type="button"
                onClick={() => setNewUserRole('admin')}
                className={`w-1/2 py-2 border-1.5 border-ink text-xs font-mono font-bold ${
                  newUserRole === 'admin' ? 'bg-ink text-paper' : 'bg-paper hover:bg-paper-dark'
                }`}
              >
                ADMINISTRATOR
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="md"
              className="w-1/2"
              onClick={() => setCreateUserOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-1/2 uppercase font-mono"
              loading={userLoading}
            >
              Create Staff
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Override Locked Parcel */}
      <Modal
        isOpen={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        title="Admin Parcel Override"
        subtitle={
          selectedParcel
            ? `Parcel #${selectedParcel._id.slice(-6).toUpperCase()} for ${
                selectedParcel.student?.name || selectedParcel.rawName
              }`
            : ''
        }
      >
        <div className="space-y-4">
          <p className="text-xs font-mono text-ink">
            This parcel is currently locked after 5 failed code verification attempts. As hostel
            admin, you can either unlock it with a fresh code or immediately authorize release.
          </p>

          <div className="space-y-2">
            <Button
              variant="primary"
              size="md"
              className="w-full font-mono text-xs uppercase"
              onClick={() => handleAdminOverride('unlock')}
            >
              Unlock &amp; Generate New Code
            </Button>

            <Button
              variant="olive"
              size="md"
              className="w-full font-mono text-xs uppercase"
              onClick={() => handleAdminOverride('release')}
            >
              Verify ID &amp; Directly Release
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setOverrideModalOpen(false)}
          >
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
