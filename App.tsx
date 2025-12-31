
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { 
  ClipboardCheck, Home, LogOut, Table, FileDown, Download, RefreshCw, Cloud, Settings
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AppState, Club, Member, AttendanceRecord, User, LeaveRecord, AttendanceStatus } from './types';
import Dashboard from './components/Dashboard';
import ClubDetail from './components/ClubDetail';
import RollCall from './components/RollCall';
import Login from './components/Login';
import SpreadsheetEditor from './components/SpreadsheetEditor';
import ClubManager from './components/ClubManager';

const STORAGE_KEY = 'clubroll_data_cloud_v1';
const USER_KEY = 'clubroll_user_cloud_v1';

const SYNC_API_BASE = "https://api.npoint.io/";

export const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const generateMembers = (clubId: string, count: number) => {
  const names = ['王小明', '李小華', '張大同', '陳美美', '周杰', '林書豪', '蔡依林', '張學友', '劉德華', '郭富城'];
  const classes: string[] = [];
  for (let g = 7; g <= 9; g++) for (let i = 1; i <= 20; i++) classes.push(`${g}${i.toString().padStart(2, '0')}`);
  return Array.from({ length: count }, (_, i) => ({
    id: `m-${clubId}-${i}-${Math.random().toString(36).substr(2, 5)}`,
    name: names[Math.floor(Math.random() * names.length)] + (i + 1),
    studentId: `S${clubId.padStart(2, '0')}${i.toString().padStart(3, '0')}`,
    className: classes[Math.floor(Math.random() * classes.length)]
  }));
};

const INITIAL_STATE: AppState = {
  clubs: [
    { id: '1', name: '熱舞社', description: '活力四射的街舞團隊', createdAt: Date.now(), members: generateMembers('1', 20) },
    { id: '2', name: '吉他社', description: '音樂與才華的聚集地', createdAt: Date.now(), members: generateMembers('2', 15) },
    { id: '3', name: '籃球社', description: '熱血揮灑汗水的球場', createdAt: Date.now(), members: generateMembers('3', 25) }
  ],
  attendanceRecords: [],
  leaveRecords: []
};

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  const [isSyncing, setIsSyncing] = useState(false);

  const pullFromCloud = useCallback(async (code: string) => {
    if (!code) return;
    setIsSyncing(true);
    try {
      const resp = await fetch(`${SYNC_API_BASE}${code}`);
      if (resp.ok) {
        const cloudState = await resp.json();
        setState(prev => {
          const mergedRecords = [...prev.attendanceRecords];
          cloudState.attendanceRecords.forEach((cloudRec: AttendanceRecord) => {
            const idx = mergedRecords.findIndex(r => r.clubId === cloudRec.clubId && r.date === cloudRec.date);
            if (idx === -1) {
              mergedRecords.push(cloudRec);
            } else if ((cloudRec.updatedAt || 0) > (mergedRecords[idx].updatedAt || 0)) {
              mergedRecords[idx] = cloudRec;
            }
          });
          return {
            ...prev,
            clubs: cloudState.clubs || prev.clubs,
            attendanceRecords: mergedRecords,
            leaveRecords: cloudState.leaveRecords || prev.leaveRecords,
            lastSyncedAt: Date.now()
          };
        });
      }
    } catch (e) {
      console.error("Sync Pull Failed", e);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const pushToCloud = useCallback(async (code: string, currentState: AppState) => {
    if (!code) return;
    setIsSyncing(true);
    try {
      await fetch(`${SYNC_API_BASE}${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentState)
      });
      setState(prev => ({ ...prev, lastSyncedAt: Date.now() }));
    } catch (e) {
      console.error("Sync Push Failed", e);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (user?.syncCode && user.role === 'admin') {
      const timer = setInterval(() => pullFromCloud(user.syncCode!), 30000);
      return () => clearInterval(timer);
    }
  }, [user, pullFromCloud]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => { if (user) localStorage.setItem(USER_KEY, JSON.stringify(user)); else localStorage.removeItem(USER_KEY); }, [user]);

  const addClub = useCallback((newClub: Club) => {
    setState(prev => {
      const newState = { ...prev, clubs: [...prev.clubs, newClub] };
      if (user?.syncCode) pushToCloud(user.syncCode, newState);
      return newState;
    });
  }, [user, pushToCloud]);

  const updateClub = useCallback((id: string, name: string, description: string) => {
    setState(prev => {
      const newState = {
        ...prev,
        clubs: prev.clubs.map(c => c.id === id ? { ...c, name, description } : c)
      };
      if (user?.syncCode) pushToCloud(user.syncCode, newState);
      return newState;
    });
  }, [user, pushToCloud]);

  // 修復：將檢查邏輯移出 setState
  const deleteClub = useCallback((id: string) => {
    const clubToDelete = state.clubs.find(c => c.id === id);
    if (!clubToDelete) return;

    if (clubToDelete.members.length > 0) {
      alert(`無法刪除社團「${clubToDelete.name}」。\n請先將該社團內的 ${clubToDelete.members.length} 名學生移出名單。`);
      return;
    }

    setState(prev => {
      const newState = { 
        ...prev, 
        clubs: prev.clubs.filter(c => c.id !== id),
        attendanceRecords: prev.attendanceRecords.filter(r => r.clubId !== id)
      };
      if (user?.syncCode) pushToCloud(user.syncCode, newState);
      return newState;
    });
  }, [state.clubs, user, pushToCloud]);

  const saveAttendance = useCallback((record: AttendanceRecord) => {
    const updatedRecord = { ...record, updatedAt: Date.now() };
    setState(prev => {
      const otherRecords = prev.attendanceRecords.filter(r => !(r.clubId === record.clubId && r.date === record.date));
      const newState = { ...prev, attendanceRecords: [updatedRecord, ...otherRecords] };
      if (user?.syncCode) pushToCloud(user.syncCode, newState);
      return newState;
    });
  }, [user, pushToCloud]);

  const setLeave = useCallback((leave: LeaveRecord) => {
    setState(prev => {
      const newState = { ...prev, leaveRecords: [...prev.leaveRecords.filter(l => !(l.memberId === leave.memberId && l.date === leave.date)), leave] };
      if (user?.syncCode) pushToCloud(user.syncCode, newState);
      return newState;
    });
  }, [user, pushToCloud]);

  const cancelLeave = useCallback((leaveId: string) => {
    setState(prev => {
      const newState = { ...prev, leaveRecords: prev.leaveRecords.filter(l => l.id !== leaveId) };
      if (user?.syncCode) pushToCloud(user.syncCode, newState);
      return newState;
    });
  }, [user, pushToCloud]);

  if (!user) return <Login onLogin={(u) => { setUser(u); if (u.syncCode) pullFromCloud(u.syncCode); }} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row h-screen overflow-hidden">
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-full sticky top-0 shrink-0">
        <div className="p-6 border-b border-slate-100 text-center relative">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 text-white rounded-2xl shadow-lg mb-3">
             <ClipboardCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">ClubRoll</h1>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-widest">{user.role}</span>
            {isSyncing && <RefreshCw className="w-3 h-3 text-indigo-500 animate-spin" />}
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all font-bold no-underline"><Home className="w-5 h-5" /> 主畫面</Link>
          {user.role === 'admin' && (
            <>
              <Link to="/club-manager" className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all font-bold no-underline">
                <Settings className="w-5 h-5" /> 編輯社團項目
              </Link>
              <Link to="/spreadsheet-editor" className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-all font-bold no-underline"><Table className="w-5 h-5" /> 名單即時試算表</Link>
              <button onClick={() => pullFromCloud(user.syncCode!)} className="w-full flex items-center gap-3 px-4 py-3 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl font-black transition-all text-sm border-none cursor-pointer"><RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} /> 立即同步雲端</button>
            </>
          )}
        </nav>
        <div className="p-4 mt-auto border-t border-slate-50 space-y-2">
          <div className="px-4 py-3 bg-slate-50 rounded-xl">
             <p className="text-[9px] font-black text-slate-400 uppercase">同步代碼: {user.syncCode || '本地存儲'}</p>
             <p className="text-sm font-bold text-slate-700 truncate">{user.name}</p>
          </div>
          <button onClick={() => setUser(null)} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-rose-500 hover:bg-rose-50 rounded-xl font-black text-sm border-none bg-transparent cursor-pointer"><LogOut className="w-4 h-4" /> 登出</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-indigo-600" />
            <span className="font-black text-slate-900">ClubRoll</span>
            {isSyncing && <RefreshCw className="w-3 h-3 text-indigo-500 animate-spin" />}
          </div>
          <div className="flex gap-2">
            {user.role === 'admin' && (
              <Link to="/club-manager" className="p-2 text-indigo-600 bg-indigo-50 rounded-lg"><Settings className="w-5 h-5" /></Link>
            )}
            <button onClick={() => setUser(null)} className="p-2 text-rose-500 bg-rose-50 rounded-lg border-none"><LogOut className="w-5 h-5" /></button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<div className="p-4 md:p-8 max-w-5xl mx-auto"><Dashboard user={user} state={state} addClub={addClub} updateClub={updateClub} setLeave={setLeave} cancelLeave={cancelLeave} isSyncing={isSyncing} onRefresh={() => pullFromCloud(user.syncCode!)} /></div>} />
            <Route path="/club/:id" element={<div className="p-4 md:p-8 max-w-5xl mx-auto"><ClubDetail role={user.role} user={user} state={state} addMember={(cid, m) => setState(p => ({...p, clubs: p.clubs.map(c => c.id === cid ? {...c, members: [...c.members, m]} : c)}))} updateMember={(cid, mid, ud) => setState(p => ({...p, clubs: p.clubs.map(c => c.id === cid ? {...c, members: c.members.map(m => m.id === mid ? {...m, ...ud} : m)} : c)}))} deleteMember={(cid, mid) => setState(p => ({...p, clubs: p.clubs.map(c => c.id === cid ? {...c, members: c.members.filter(m => m.id !== mid)} : c)}))} updateClub={updateClub} deleteClub={deleteClub} cancelLeave={cancelLeave} /></div>} />
            <Route path="/roll-call/:clubId" element={<div className="p-4 md:p-8 max-w-3xl mx-auto"><RollCall state={state} onSave={saveAttendance} /></div>} />
            <Route path="/spreadsheet-editor" element={<SpreadsheetEditor state={state} onSave={(s) => { setState(s); if (user.syncCode) pushToCloud(user.syncCode, s); }} role={user.role} />} />
            <Route path="/club-manager" element={<div className="p-4 md:p-8 max-w-5xl mx-auto"><ClubManager state={state} addClub={addClub} updateClub={updateClub} deleteClub={deleteClub} role={user.role} /></div>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <HashRouter>
    <AppContent />
  </HashRouter>
);

export default App;
