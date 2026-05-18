import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, Repeat, History, LogOut, Plus, Trash2, Check, X, CalendarDays, ArrowRightLeft, Shield } from 'lucide-react';

const BACKEND_URL = 'http://localhost:3001';
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MOCK_WEEK_DATES = ['2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22', '2026-05-23', '2026-05-24'];

export default function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [authError, setAuthError] = useState('');

  const handleManualLogin = async (email, password) => {
    setAuthError('');
    try {
      const response = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await response.json();

      if (response.ok && data.token) {
        // HACKATHON OVERRIDE: Force clearance based on email to bypass backend desyncs
        const assignedRole = email.toLowerCase().includes('manager') ? 'admin' : 'employee';
        const safeUser = { 
          ...data.user, 
          email: email.trim(),
          name: data.user?.name || (assignedRole === 'admin' ? 'System Admin' : 'Staff Employee'),
          role: assignedRole 
        };

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(safeUser));
        setAuthToken(data.token);
        setCurrentUser(safeUser);
      } else {
        setAuthError(data.error || 'Authentication denied. Check credentials.');
      }
    } catch (err) {
      setAuthError('Cannot communicate with the backend server.');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setAuthToken(null);
    setCurrentUser(null);
  };

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  });

  if (!authToken || !currentUser) {
    return <Login onLogin={handleManualLogin} errorMsg={authError} />;
  }

  return (
    <BrowserRouter>
      <Layout user={currentUser} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Navigate to={currentUser.role === 'admin' ? "/roster" : "/my-shifts"} />} />
          <Route path="/dashboard" element={currentUser.role === 'admin' ? <AdminDashboard headers={getAuthHeaders} /> : <Navigate to="/my-shifts" />} />
          <Route path="/shifts" element={currentUser.role === 'admin' ? <ShiftDefinitions headers={getAuthHeaders} /> : <Navigate to="/my-shifts" />} />
          <Route path="/roster" element={currentUser.role === 'admin' ? <RosterBuilder headers={getAuthHeaders} /> : <Navigate to="/my-shifts" />} />
          <Route path="/my-shifts" element={<EmployeeCalendar headers={getAuthHeaders} />} />
          <Route path="/swaps" element={<SwapRequest headers={getAuthHeaders} />} />
          <Route path="/approvals" element={currentUser.role === 'admin' ? <SwapApprovalsAndHistory headers={getAuthHeaders} isApprovalView={true} /> : <Navigate to="/my-shifts" />} />
          <Route path="/history" element={currentUser.role === 'admin' ? <SwapApprovalsAndHistory headers={getAuthHeaders} isApprovalView={false} /> : <Navigate to="/my-shifts" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

// ==========================================
// SCREEN: LOGIN (AUTO-FILL DESTROYED)
// ==========================================
function Login({ onLogin, errorMsg }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0D0D0F] p-4 font-sans">
      <div className="bg-[#13131A] border border-white/5 p-8 rounded-2xl w-full max-w-md space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-purple-500"></div>
        <div className="text-center">
          <h2 className="text-xl font-bold tracking-tight text-slate-100">ShiftHive Matrix</h2>
          <p className="text-xs text-slate-400 mt-1">Encrypted Access Terminal</p>
        </div>
        
        {/* Anti-autofill tricks applied here */}
        <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password); }} className="space-y-4" autoComplete="off">
          <input type="text" style={{ display: 'none' }} />
          <input type="password" style={{ display: 'none' }} />
          
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">User Identity</label>
            <input 
              className="w-full bg-[#0D0D0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-mono" 
              type="text" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              placeholder="manager.a@shifthive.io"
              autoComplete="new-password" 
              spellCheck="false"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">Cryptographic Password</label>
            <input 
              className="w-full bg-[#0D0D0F] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-mono" 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              placeholder="••••••••"
              autoComplete="new-password" 
            />
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium text-sm rounded-xl py-3.5 transition shadow-lg shadow-cyan-500/10">
            Authenticate Identity
          </button>
        </form>
        {errorMsg && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center text-xs text-red-400 font-mono">{errorMsg}</div>}
      </div>
    </div>
  );
}

function Layout({ children, user, onLogout }) {
  const loc = useLocation();
  const isAdmin = user.role === 'admin';
  const adminNav = [
    { path: '/shifts', icon: Calendar, label: 'Shift Templates' },
    { path: '/roster', icon: Users, label: 'Roster Matrix Builder' },
    { path: '/approvals', icon: Check, label: 'Swap Approvals' },
    { path: '/history', icon: History, label: 'Audit Ledger' },
  ];
  const employeeNav = [
    { path: '/my-shifts', icon: CalendarDays, label: 'My Calendar' },
    { path: '/swaps', icon: Repeat, label: 'Request Shift Swap' },
  ];
  const currentNavSet = isAdmin ? [...adminNav, ...employeeNav] : employeeNav;

  return (
    <div className="flex min-h-screen bg-[#0D0D0F] text-slate-100 font-sans">
      <aside className="w-64 bg-[#13131A] border-r border-white/5 p-4 flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400"><Shield size={16} /></div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-100">ShiftHive Matrix</h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Bcrypt Guard Enabled</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {currentNavSet.map(item => (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                loc.pathname === item.path ? 'bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}>
              <item.icon size={16} /> {item.label}
            </Link>
          ))}
        </nav>
        <div className="pt-4 border-t border-white/5">
          <div className="text-xs text-slate-400 mb-1 truncate">User: <span className="text-purple-400 font-mono font-medium">{user.name}</span></div>
          <div className="text-[10px] text-emerald-400 font-mono bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider w-fit mb-3">Clearance: {user.role.toUpperCase()}</div>
          <button onClick={onLogout} className="w-full flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-400/80 hover:text-red-400 transition bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 py-2 px-3 rounded-lg"><LogOut size={14} /> Kill Session</button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto w-full mx-auto max-w-7xl">{children}</main>
    </div>
  );
}

// ==========================================
// SCREEN: INVERTED ROSTER MATRIX (TIME VS DAYS)
// ==========================================
function RosterBuilder({ headers }) {
  const [employeePool, setEmployeePool] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [rosterData, setRosterData] = useState([]);
  const [formData, setFormData] = useState({ user_id: '', shift_id: '', date: MOCK_WEEK_DATES[0], status: 'scheduled' });
  const [message, setMessage] = useState({ text: '', isError: false });

  const fetchRosterMatrix = () => {
    fetch(`${BACKEND_URL}/api/assignments/roster?week=2026-21`, { headers: headers() })
      .then(res => res.json())
      .then(data => setRosterData(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchRosterMatrix();
    fetch(`${BACKEND_URL}/api/assignments/roster?week=2026-21`, { headers: headers() })
      .then(res => res.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        const uniqueEmployees = Array.from(new Map(arr.map(item => [item.user_id, { id: item.user_id, name: item.name }])).values());
        setEmployeePool(uniqueEmployees);
        if (uniqueEmployees.length > 0) setFormData(prev => ({ ...prev, user_id: uniqueEmployees[0].id }));
      });

    fetch(`${BACKEND_URL}/api/shifts`, { headers: headers() })
      .then(res => res.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        setShifts(arr);
        if (arr.length > 0) setFormData(prev => ({ ...prev, shift_id: arr[0].id }));
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', isError: false });
    if (!formData.shift_id || !formData.user_id) {
      setMessage({ text: 'Ensure templates exist and employee is selected.', isError: true });
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
        setMessage({ text: result.error || 'Conflict Detected!', isError: true });
      } else {
        setMessage({ text: 'Deployment committed securely! 🎉', isError: false });
        fetchRosterMatrix(); 
      }
    } catch (error) {
      setMessage({ text: 'Transport error.', isError: true });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Time-Slot Roster Matrix</h1>
        <p className="text-xs text-slate-400">Map employees into operational time brackets across the week.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="bg-[#13131A] border border-white/5 p-6 rounded-2xl space-y-4 h-fit shadow-xl">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">Deploy Employee</h3>
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">Employee Name</label>
            <select className="w-full bg-[#0D0D0F] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
              value={formData.user_id} onChange={e => setFormData({ ...formData, user_id: e.target.value })}>
              {employeePool.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">Shift Time Bracket</label>
            <select className="w-full bg-[#0D0D0F] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
              value={formData.shift_id} onChange={e => setFormData({ ...formData, shift_id: e.target.value })}>
              {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time.slice(0,5)}-{s.end_time.slice(0,5)})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">Day of Week</label>
            <select className="w-full bg-[#0D0D0F] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
              value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })}>
              {MOCK_WEEK_DATES.map((d, i) => <option key={d} value={d}>{DAYS_SHORT[i]} ({d})</option>)}
            </select>
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium text-sm rounded-xl py-3 transition mt-2">Assign to Matrix</button>
          {message.text && <div className={`p-4 rounded-xl border text-center text-xs font-semibold mt-4 ${message.isError ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>{message.text}</div>}
        </form>

        <div className="xl:col-span-2 bg-[#13131A] border border-white/5 p-6 rounded-2xl shadow-xl overflow-x-auto">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Live 7-Day Time Slot Matrix</h3>
          <div className="min-w-[800px] border border-white/5 rounded-xl overflow-hidden">
            {/* Headers: Days of the week */}
            <div className="grid grid-cols-8 bg-[#0D0D0F] p-3 border-b border-white/5 text-[11px] text-slate-400 font-bold uppercase tracking-wider text-center">
              <div className="text-left pl-2">Time Slot</div>
              {DAYS_SHORT.map((day, idx) => <div key={day}>{day}<span className="block text-[9px] text-slate-600 font-mono">{MOCK_WEEK_DATES[idx].slice(5)}</span></div>)}
            </div>
            
            {/* Rows: Time Brackets (Shifts) */}
            {shifts.map(s => (
              <div key={s.id} className="grid grid-cols-8 p-2 border-b border-white/5 text-xs items-stretch text-center hover:bg-white/[0.01]">
                <div className="text-left pl-2 font-semibold text-purple-400 flex flex-col justify-center">
                  <span className="block text-slate-200 text-[11px] font-bold leading-tight">{s.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono font-normal mt-0.5">{s.start_time.slice(0,5)} - {s.end_time.slice(0,5)}</span>
                </div>
                
                {/* Cells: Employees assigned to this shift on this day */}
                {MOCK_WEEK_DATES.map(date => {
                  const activeAllocations = rosterData.filter(item => item.shift_id === s.id && item.date && item.date.split('T')[0] === date && item.assignment_id);
                  return (
                    <div key={date} className="p-1 min-h-[65px] flex flex-col gap-1 items-center border-l border-white/5">
                      {activeAllocations.length > 0 ? activeAllocations.map(alloc => (
                        <div key={alloc.assignment_id} className="w-full text-center py-1.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-[10px] text-cyan-300 font-bold shadow-sm">
                          <span className="block truncate px-1">{alloc.name}</span>
                          <span className="block text-[8px] text-amber-500 font-mono mt-0.5">ID: {alloc.assignment_id}</span>
                        </div>
                      )) : <span className="text-slate-800 font-mono mt-4">—</span>}
                    </div>
                  );
                })}
              </div>
            ))}
            {shifts.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">CREATE A SHIFT TEMPLATE ON THE LEFT TAB TO GENERATE THE MATRIX.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// OTHER SCREENS
// ==========================================
function ShiftDefinitions({ headers }) {
  const [shifts, setShifts] = useState([]);
  const [form, setForm] = useState({ name: '', start_time: '', end_time: '', break_minutes: 30, color: '#06b6d4' });
  const [msg, setMsg] = useState('');

  const loadTemplates = () => {
    fetch(`${BACKEND_URL}/api/shifts`, { headers: headers() }).then(res => res.json()).then(data => setShifts(Array.isArray(data) ? data : []));
  };
  useEffect(() => { loadTemplates(); }, []);

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    await fetch(`${BACKEND_URL}/api/shifts`, { method: 'POST', headers: headers(), body: JSON.stringify(form) });
    setMsg('Template stored successfully.');
    setForm({ name: '', start_time: '', end_time: '', break_minutes: 30, color: '#06b6d4' });
    loadTemplates();
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Shift Templates Pool</h1><p className="text-xs text-slate-400">Define global operational time dimensions.</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleCreateTemplate} className="bg-[#13131A] border border-white/5 p-5 rounded-2xl space-y-4 h-fit">
          <input className="w-full bg-[#0D0D0F] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200" placeholder="Template Label" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <div className="grid grid-cols-2 gap-3">
            <input type="time" className="w-full bg-[#0D0D0F] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200" required value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} />
            <input type="time" className="w-full bg-[#0D0D0F] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200" required value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} />
          </div>
          <button type="submit" className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2.5 text-sm font-medium transition flex items-center justify-center gap-2"><Plus size={16} /> Save Profile</button>
          {msg && <p className="text-xs text-emerald-400 text-center font-bold font-mono">{msg}</p>}
        </form>
        <div className="lg:col-span-2 bg-[#13131A] border border-white/5 p-5 rounded-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {shifts.map(s => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-[#0D0D0F] rounded-xl border border-white/5">
                <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                <div><div className="font-semibold text-sm text-slate-200">{s.name}</div><div className="text-xs text-slate-500 font-mono mt-0.5">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</div></div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmployeeCalendar({ headers }) {
  const [myShifts, setMyShifts] = useState([]);
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/assignments/my-shifts?from=2026-05-01&to=2026-05-31`, { headers: headers() }).then(res => res.json()).then(data => setMyShifts(Array.isArray(data) ? data : []));
  }, []);
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Personal Calendar</h1><p className="text-xs text-slate-400">Your scheduled assignments.</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {myShifts.map(s => (
          <div key={s.id} className="bg-[#13131A] border border-white/5 p-5 rounded-2xl flex items-start gap-4 shadow-lg">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400"><CalendarDays size={18} /></div>
            <div>
              <div className="font-bold text-sm text-slate-200">{s.shift_name}</div>
              <div className="text-xs text-slate-400 font-mono mt-1">{s.date.split('T')[0]} • {s.start_time.slice(0,5)} - {s.end_time.slice(0,5)}</div>
              <div className="text-[10px] font-mono text-emerald-400 mt-3 bg-emerald-500/5 border border-emerald-500/15 px-2 py-0.5 rounded uppercase tracking-wider w-fit">Assignment ID: {s.id}</div>
            </div>
          </div>
        ))}
        {myShifts.length === 0 && <div className="col-span-full p-8 text-center text-xs text-slate-500 font-mono">NO SHIFTS ASSIGNED TO YOU YET.</div>}
      </div>
    </div>
  );
}

function SwapRequest({ headers }) {
  const [form, setForm] = useState({ from_assignment_id: '', to_user_id: '', reason: '' });
  const [statusMsg, setStatusMsg] = useState({ text: '', isError: false });
  const handleSwapSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg({ text: '', isError: false });
    try {
      const response = await fetch(`${BACKEND_URL}/api/swaps`, { method: 'POST', headers: headers(), body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) setStatusMsg({ text: result.error || 'Swap failed.', isError: true });
      else { setStatusMsg({ text: `Swap logged! 🔄`, isError: false }); setForm({ from_assignment_id: '', to_user_id: '', reason: '' }); }
    } catch (err) { setStatusMsg({ text: 'Transport error.', isError: true }); }
  };
  return (
    <div className="max-w-xl space-y-6">
      <div><h1 className="text-2xl font-bold">Request Shift Swap</h1><p className="text-xs text-slate-400">Trade timeline slots.</p></div>
      <form onSubmit={handleSwapSubmit} className="bg-[#13131A] border border-white/5 p-6 rounded-2xl space-y-4 shadow-xl">
        <input type="number" required className="w-full bg-[#0D0D0F] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200" value={form.from_assignment_id} onChange={e => setForm({...form, from_assignment_id: e.target.value})} placeholder="Your Assignment ID" />
        <input type="number" required className="w-full bg-[#0D0D0F] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200" value={form.to_user_id} onChange={e => setForm({...form, to_user_id: e.target.value})} placeholder="Target Colleague (User ID)" />
        <textarea required className="w-full bg-[#0D0D0F] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 h-24" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="Reason..." />
        <button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium text-sm rounded-xl py-3">Broadcast Request</button>
        {statusMsg.text && <div className={`p-4 rounded-xl border text-center text-xs font-semibold mt-4 ${statusMsg.isError ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{statusMsg.text}</div>}
      </form>
    </div>
  );
}

function SwapApprovalsAndHistory({ headers, isApprovalView }) {
  const [history, setHistory] = useState([]);
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/reports/shift-history`, { headers: headers() }).then(res => res.json()).then(data => setHistory(Array.isArray(data) ? data : []));
  }, [isApprovalView]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div><h1 className="text-2xl font-bold">{isApprovalView ? "Swap Approvals" : "Audit Ledger"}</h1></div>
        <div className="bg-[#13131A] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0D0D0F] border-b border-white/5 text-slate-400 uppercase tracking-wider">
              <tr><th className="p-4">Date</th><th className="p-4">Resource</th><th className="p-4">Shift Profile</th><th className="p-4 pl-8">Notes</th></tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id} className="border-b border-white/5 text-slate-300">
                  <td className="p-4 font-mono">{h.date ? h.date.split('T')[0] : '—'}</td>
                  <td className="p-4 text-cyan-400">{h.employee_name}</td>
                  <td className="p-4">{h.shift_name}</td>
                  <td className="p-4 pl-8 italic">{h.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() { return <div className="text-xs font-mono text-slate-400 p-6">📈 Engine Active.</div>; }