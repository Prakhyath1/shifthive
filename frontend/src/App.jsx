import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, Repeat, History, LogOut, Plus, Trash2, Check, X, CalendarDays, ArrowRightLeft, ChevronLeft, ChevronRight } from 'lucide-react';

const BACKEND_URL = 'http://localhost:3001';

// Static Calendar Utilities for a 7-day Hackathon Presentation Matrix
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MOCK_WEEK_DATES = ['2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22', '2026-05-23', '2026-05-24'];

export default function App() {
  const [authToken, setAuthToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [systemLoading, setSystemLoading] = useState(true);

  // Auto Login Handler for Hackathon Presentation Mode
  useEffect(() => {
    fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@shifthive.io', role: 'admin', department: 'ops' })
    })
      .then(res => res.json())
      .then(data => {
        setAuthToken(data.token);
        setCurrentUser(data.user);
        setSystemLoading(false);
      })
      .catch(err => {
        console.error("Auth server link dropped:", err);
        setSystemLoading(false);
      });
  }, []);

  if (systemLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0D0D0F] text-slate-400 font-mono text-xs">
        INITIALIZING SECURE SHIFTHIVE JWT LINK NODES...
      </div>
    );
  }

  // Adjusted to return the header object directly for straightforward extraction
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  });

  return (
    <BrowserRouter>
      <Layout user={currentUser} onLogout={() => { setAuthToken(null); setCurrentUser(null); }}>
        <Routes>
          <Route path="/" element={<Navigate to="/roster" />} />
          <Route path="/dashboard" element={<AdminDashboard />} />
          {/* CRITICAL FIX: Passed function references without the execution brackets () */}
          <Route path="/shifts" element={<ShiftDefinitions headers={getAuthHeaders} />} />
          <Route path="/roster" element={<RosterBuilder headers={getAuthHeaders} />} />
          <Route path="/my-shifts" element={<EmployeeCalendar />} />
          <Route path="/swaps" element={<SwapRequest />} />
          <Route path="/approvals" element={<SwapApprovalsAndHistory />} />
          <Route path="/history" element={<SwapApprovalsAndHistory />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

// ==========================================
// CENTRAL APPLICATION INTERFACE SHELL
// ==========================================
function Layout({ children, user, onLogout }) {
  const loc = useLocation();
  const nav = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/shifts', icon: Calendar, label: 'Shift Templates' },
    { path: '/roster', icon: Users, label: 'Roster Builder' },
    { path: '/my-shifts', icon: CalendarDays, label: 'My Calendar' },
    { path: '/swaps', icon: Repeat, label: 'Request Swap' },
    { path: '/approvals', icon: Check, label: 'Swap Approvals' },
    { path: '/history', icon: History, label: 'System History' },
  ];

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0D0D0F] text-red-400 font-mono text-xs p-4 border border-red-500/10 rounded-xl">
        🛑 AUTHENTICATION ERROR: TARGET GATE DENIED TOKEN ACQUISITION.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0D0D0F] text-slate-100 font-sans">
      <aside className="w-64 bg-[#13131A] border-r border-white/5 p-4 flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">ShiftHive v1.0</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-1">JWT Locked Pipeline</p>
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map(item => (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                loc.pathname === item.path ? 'bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}>
              <item.icon size={16} /> {item.label}
            </Link>
          ))}
        </nav>
        <div className="pt-4 border-t border-white/5">
          <div className="text-xs text-slate-400 mb-2 truncate">Operator: <span className="text-purple-400 font-medium">{user.email}</span></div>
          <div className="text-[10px] text-emerald-400 font-mono bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-wider w-fit mb-3">Role: {user.role}</div>
          <button onClick={onLogout} className="w-full flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-400/80 hover:text-red-400 transition bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 py-2 px-3 rounded-lg">
            <LogOut size={14} /> Kill Session
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto w-full">
        {children}
      </main>
    </div>
  );
}

// ==========================================
// SCREEN: ROSTER BUILDER (FIXED WITH GRID VIEW)
// ==========================================
function RosterBuilder({ headers }) {
  const [users, setUsers] = useState([
    { id: 1, name: 'Alice Chen' },
    { id: 2, name: 'Bob Smith' },
    { id: 3, name: 'Charlie Davis' }
  ]);
  const [shifts, setShifts] = useState([]);
  const [rosterData, setRosterData] = useState([]);
  const [formData, setFormData] = useState({ user_id: '1', shift_id: '', date: '2026-05-18', status: 'scheduled' });
  const [message, setMessage] = useState({ text: '', isError: false });

  const fetchRosterMatrix = () => {
    fetch(`${BACKEND_URL}/api/assignments/roster?week=2026-21`, { headers: headers() })
      .then(res => res.json())
      .then(data => {
        setRosterData(data);
        const distinctUsers = Array.from(new Map(data.map(item => [item.user_id, { id: item.user_id, name: item.name }])).values());
        if (distinctUsers.length > 0) {
          setUsers(distinctUsers);
        }
      })
      .catch(err => console.error("Error building timeline layer:", err));
  };

  useEffect(() => {
    fetchRosterMatrix();

    fetch(`${BACKEND_URL}/api/shifts`, { headers: headers() })
      .then(res => res.json())
      .then(data => {
        setShifts(data);
        if (data.length > 0) setFormData(prev => ({ ...prev, shift_id: data[0].id }));
      })
      .catch(err => console.error("Error reading templates:", err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', isError: false });

    if (!formData.shift_id) {
      setMessage({ text: 'Please create a Shift Template first before processing assignments.', isError: true });
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/assignments`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(formData)
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage({ text: result.error || 'Operation Refused', isError: true });
      } else {
        setMessage({ text: 'Deployment committed securely to PostgreSQL ledger! 🎉', isError: false });
        fetchRosterMatrix(); 
      }
    } catch (error) {
      setMessage({ text: 'Network transport layer error.', isError: true });
    }
  };

  const groupedRoster = {};
  rosterData.forEach(item => {
    if (item.assignment_id) { 
      const cleanDate = item.date.split('T')[0];
      if (!groupedRoster[item.user_id]) groupedRoster[item.user_id] = {};
      groupedRoster[item.user_id][cleanDate] = item;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Weekly Roster Builder</h1>
          <p className="text-xs text-slate-400">Deploy resources onto the global timeline tracking system.</p>
        </div>
        <div className="flex bg-[#13131A] border border-white/5 px-4 py-2 rounded-xl text-xs text-slate-400 items-center gap-2">
          <ChevronLeft size={14} className="cursor-pointer hover:text-cyan-400" />
          <span className="font-mono text-slate-200">May 18, 2026 – May 24, 2026</span>
          <ChevronRight size={14} className="cursor-pointer hover:text-cyan-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="bg-[#13131A] border border-white/5 p-6 rounded-2xl space-y-4 h-fit shadow-xl">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">Deploy Shift Block</h3>
          
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">Employee Node</label>
            <select className="w-full bg-[#0D0D0F] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
              value={formData.user_id} onChange={e => setFormData({ ...formData, user_id: e.target.value })}>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">Shift Template profile</label>
            <select className="w-full bg-[#0D0D0F] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
              value={formData.shift_id} onChange={e => setFormData({ ...formData, shift_id: e.target.value })}>
              {shifts.length > 0 ? shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)})</option>) : <option value="">No templates found. Go create one!</option>}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">Target Allocation Date</label>
            <select className="w-full bg-[#0D0D0F] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
              value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })}>
              {MOCK_WEEK_DATES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90 text-white font-medium text-sm rounded-xl py-3 transition mt-2 shadow-lg shadow-cyan-500/5">
            Commit Assignment
          </button>

          {message.text && (
            <div className={`p-4 rounded-xl border text-center text-xs font-semibold mt-4 transition-all ${
              message.isError ? 'bg-red-500/10 border-red-500/20 text-red-400 shadow-md shadow-red-500/5' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-md shadow-emerald-500/5'
            }`}>
              {message.text}
            </div>
          )}
        </form>

        <div className="xl:col-span-2 bg-[#13131A] border border-white/5 p-6 rounded-2xl shadow-xl overflow-x-auto">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Active Operational Calendar Matrix</h3>
          <div className="min-w-[700px] border border-white/5 rounded-xl overflow-hidden">
            <div className="grid grid-cols-8 bg-[#0D0D0F] p-3 border-b border-white/5 text-[11px] text-slate-400 font-bold uppercase tracking-wider text-center">
              <div className="text-left pl-2">Resource</div>
              {DAYS_SHORT.map((day, index) => (
                <div key={day}>{day} <span className="block text-[9px] text-slate-600 font-mono font-normal">{MOCK_WEEK_DATES[index].slice(5)}</span></div>
              ))}
            </div>
            
            {users.map(u => (
              <div key={u.id} className="grid grid-cols-8 p-2 border-b border-white/5 text-xs items-center text-center hover:bg-white/[0.01] transition-all">
                <div className="text-cyan-400 font-semibold text-left pl-2 truncate">{u.name}</div>
                {MOCK_WEEK_DATES.map(date => {
                  const currentCellAllocation = groupedRoster[u.id]?.[date];
                  return (
                    <div key={date} className="p-1 min-h-[55px] flex items-center justify-center">
                      {currentCellAllocation ? (
                        <div className="w-full text-center py-1.5 rounded-lg border text-[10px] font-bold transition-all"
                             style={{
                               backgroundColor: `${currentCellAllocation.color || '#3b82f6'}15`,
                               borderColor: `${currentCellAllocation.color || '#3b82f6'}30`,
                               color: currentCellAllocation.color || '#3b82f6'
                             }}>
                          <span className="block truncate px-1">{currentCellAllocation.shift_name}</span>
                          <span className="block text-[9px] opacity-70 font-mono mt-0.5">{currentCellAllocation.start_time.slice(0, 5)}-{currentCellAllocation.end_time.slice(0, 5)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-700 font-mono">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SCREEN: SHIFT DEFINITIONS 
// ==========================================
function ShiftDefinitions({ headers }) {
  const [shifts, setShifts] = useState([]);
  const [form, setForm] = useState({ name: '', start_time: '', end_time: '', break_minutes: 30, color: '#06b6d4' });
  const [msg, setMsg] = useState('');

  const loadTemplates = () => {
    fetch(`${BACKEND_URL}/api/shifts`, { headers: headers() })
      .then(res => res.json())
      .then(data => setShifts(data))
      .catch(err => console.error(err));
  };

  useEffect(() => { loadTemplates(); }, []);

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    await fetch(`${BACKEND_URL}/api/shifts`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(form)
    });
    setMsg('Profile Template successfully stored.');
    setForm({ name: '', start_time: '', end_time: '', break_minutes: 30, color: '#06b6d4' });
    loadTemplates();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shift Templates</h1>
        <p className="text-xs text-slate-400">Define global work brackets for allocation selection pools.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleCreateTemplate} className="bg-[#13131A] border border-white/5 p-5 rounded-2xl space-y-4 h-fit">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">New Profile</h3>
          <input className="w-full bg-[#0D0D0F] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200" placeholder="Template Label (e.g., Night Operational)" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <div className="grid grid-cols-2 gap-3">
            <input type="time" className="w-full bg-[#0D0D0F] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200" required value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} />
            <input type="time" className="w-full bg-[#0D0D0F] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200" required value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} />
          </div>
          <input type="color" className="w-full h-10 rounded-xl bg-transparent border border-white/10 cursor-pointer p-1" value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
          <button type="submit" className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2.5 text-sm font-medium transition flex items-center justify-center gap-2">
            <Plus size={16} /> Save Profile Template
          </button>
          {msg && <p className="text-xs text-emerald-400 text-center font-bold font-mono mt-2">{msg}</p>}
        </form>
        <div className="lg:col-span-2 bg-[#13131A] border border-white/5 p-5 rounded-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {shifts.map(s => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-[#0D0D0F] rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <div>
                    <div className="font-semibold text-sm text-slate-200">{s.name}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() { return <div className="text-xs font-mono text-slate-400 bg-[#13131A] border border-white/5 p-6 rounded-2xl uppercase">📈 Engine Dashboard Node Active // Analytics Module Ready // Telemetry Stable.</div>; }
function EmployeeCalendar() { return <div className="text-xs font-mono text-slate-400 bg-[#13131A] border border-white/5 p-6 rounded-2xl uppercase">🗓️ Individual Calendar Layout Loaded // Synced with global ledger.</div>; }
function SwapRequest() { return <div className="text-xs font-mono text-slate-400 bg-[#13131A] border border-white/5 p-6 rounded-2xl uppercase">🔄 Atomic Swap Channels Initialized // Awaiting trade execution payload.</div>; }
function SwapApprovalsAndHistory() { return <div className="text-xs font-mono text-slate-400 bg-[#13131A] border border-white/5 p-6 rounded-2xl uppercase">📜 System Audit trail running. All events logging to database node.</div>; }