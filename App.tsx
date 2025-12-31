
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { 
  Users, ClipboardCheck, Home, LogOut, Sparkles, Lock, GraduationCap, Menu
} from 'lucide-react';
import { AppState, Club, Member, AttendanceRecord, User, LeaveRecord, AttendanceStatus } from './types';
import Dashboard from './components/Dashboard';
import ClubDetail from './components/ClubDetail';
import RollCall from './components/RollCall';
import Login from './components/Login';

const STORAGE_KEY = 'clubroll_data_v3';
const USER_KEY = 'clubroll_user_v3';

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
  [7, 8, 9].forEach(grade => {
    for (let i = 1; i <= 20; i++) {
      classes.push(`${grade}${i.toString().padStart(2, '0')}`);
    }
  });

  return Array.from({ length: count }, (_, i) => ({
    id: `m-${clubId}-${i}`,
    name: names[Math.floor(Math.random() * names.length)] + (i + 1),
    studentId: `S${clubId.padStart(2, '0')}${i.toString().padStart(3, '0')}`,
    className: classes[Math.floor(Math.random() * classes.length)]
  }));
};

const INITIAL_STATE: AppState = {
  clubs: [
    { id: '1', name: '熱舞社', description: '活力四射的街舞團隊', createdAt: Date.now(), members: generateMembers('1', 20) },
    { id: '2', name: '吉他社', description: '音樂與才華的聚集地', createdAt: Date.now(), members: generateMembers('2', 15) },
    { id: '3', name: '籃球社', description: '熱血揮灑汗水的球場', createdAt: Date.now(), members: generateMembers('3', 25) },
    { id: '4', name: '程式設計社', description: '探索數位世界的邏輯', createdAt: Date.now(), members: generateMembers('4', 12) },
    { id: '5', name: '羽球社', description: '速度與技巧的對決', createdAt: Date.now(), members: generateMembers('5', 18) }
  ],
  attendanceRecords: [],
  leaveRecords: []
};

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(USER_KEY);
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    try {
      return saved ? JSON.parse(saved) : INITIAL_STATE;
    } catch {
      return INITIAL_STATE;
    }
  });

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setState(JSON.parse(e.newValue));
        } catch (err) {
          console.error("Failed to sync storage data", err);
        }
      }
      if (e.key === USER_KEY) {
        try {
          setUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch (err) {
          setUser(null);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); 
  }, [state]);

  useEffect(() => { 
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user)); 
    else localStorage.removeItem(USER_KEY); 
  }, [user]);

  const bulkImportClubs = useCallback((newClubs: Club[]) => {
    setState(prev => ({
      ...prev,
      clubs: [...newClubs],
      attendanceRecords: [],
      leaveRecords: []
    }));
  }, []);

  const addClub = useCallback((newClub: Club) => {
    setState(prev => ({ ...prev, clubs: [...prev.clubs, newClub] }));
  }, []);

  const updateClub = useCallback((id: string, name: string, description: string) => {
    setState(prev => ({
      ...prev,
      clubs: prev.clubs.map(c => c.id === id ? { ...c, name, description } : c)
    }));
  }, []);

  const deleteClub = useCallback((id: string) => {
    setState(prev => ({ 
      ...prev, 
      clubs: prev.clubs.filter(c => c.id !== id),
      attendanceRecords: prev.attendanceRecords.filter(r => r.clubId !== id)
    }));
  }, []);

  const deleteAttendanceRecord = useCallback((clubId: string, date: string) => {
    setState(prev => ({
      ...prev,
      attendanceRecords: prev.attendanceRecords.filter(r => {
        const rDate = r.date.includes('T') ? r.date.split('T')[0] : r.date;
        return !(r.clubId === clubId && rDate === date);
      })
    }));
  }, []);

  const addMember = useCallback((clubId: string, member: Member) => {
    setState(prev => ({
      ...prev,
      clubs: prev.clubs.map(c => c.id === clubId ? { ...c, members: [...c.members, member] } : c)
    }));
  }, []);

  const updateMember = useCallback((clubId: string, memberId: string, updatedData: Partial<Member>) => {
    setState(prev => ({
      ...prev,
      clubs: prev.clubs.map(c => c.id === clubId ? {
        ...c,
        members: c.members.map(m => m.id === memberId ? { ...m, ...updatedData } : m)
      } : c)
    }));
  }, []);

  const deleteMember = useCallback((clubId: string, memberId: string) => {
    setState(prev => ({
      ...prev,
      clubs: prev.clubs.map(c => c.id === clubId ? {
        ...c,
        members: c.members.filter(m => m.id !== memberId)
      } : c)
    }));
  }, []);

  const saveAttendance = useCallback((record: AttendanceRecord) => {
    setState(prev => {
      const recordDate = record.date.includes('T') ? record.date.split('T')[0] : record.date;
      const otherRecords = prev.attendanceRecords.filter(r => {
        const rDate = r.date.includes('T') ? r.date.split('T')[0] : r.date;
        return !(r.clubId === record.clubId && rDate === recordDate);
      });
      return { ...prev, attendanceRecords: [record, ...otherRecords] };
    });
  }, []);

  const setLeave = useCallback((leave: LeaveRecord) => {
    setState(prev => ({
      ...prev,
      leaveRecords: [...prev.leaveRecords.filter(l => !(l.memberId === leave.memberId && l.date === leave.date)), leave]
    }));
  }, []);

  const cancelLeave = useCallback((leaveId: string) => {
    setState(prev => {
      const targetLeave = prev.leaveRecords.find(l => l.id === leaveId);
      if (!targetLeave) return prev;
      
      const newLeaveRecords = prev.leaveRecords.filter(l => l.id !== leaveId);
      
      const newAttendanceRecords = prev.attendanceRecords.map(record => {
        const recordDate = record.date.includes('T') ? record.date.split('T')[0] : record.date;
        if (recordDate === targetLeave.date && record.records[targetLeave.memberId] === AttendanceStatus.EXCUSED) {
          const updatedRecords = { ...record.records };
          updatedRecords[targetLeave.memberId] = AttendanceStatus.PRESENT;
          return { ...record, records: updatedRecords };
        }
        return record;
      });

      return { 
        ...prev, 
        leaveRecords: [...newLeaveRecords], 
        attendanceRecords: [...newAttendanceRecords] 
      };
    });
  }, []);

  const visibleClubsForSidebar = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin') return state.clubs;
    if (user.role === 'teacher') return state.clubs.filter(c => c.id === user.assignedClubId);
    return [];
  }, [state.clubs, user]);

  const getSidebarHomeLabel = useCallback(() => {
    if (!user) return '';
    if (user.role === 'admin') return '全校點名概況';
    if (user.role === 'class_teacher') return '班級社團動態';
    return '社團點名主頁';
  }, [user]);

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row h-screen overflow-hidden">
      {/* 桌面版側邊欄 */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-full sticky top-0 overflow-hidden shrink-0">
        <div className="p-6 border-b border-slate-100 bg-white text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 text-white rounded-2xl shadow-lg mb-3">
             <ClipboardCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">ClubRoll</h1>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-widest">
             {user.role === 'admin' ? '校級管理者' : user.role === 'class_teacher' ? `${user.assignedClassName} 導師` : '社團老師'}
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all font-bold">
            <Home className="w-5 h-5" /> {getSidebarHomeLabel()}
          </Link>
          {visibleClubsForSidebar.length > 0 && (
            <>
              <div className="pt-4 pb-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">負責項目</div>
              {visibleClubsForSidebar.map(club => (
                <Link key={club.id} to={`/club/${club.id}`} className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors text-sm font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> <span className="truncate">{club.name}</span>
                </Link>
              ))}
            </>
          )}
        </nav>
        <div className="p-4 mt-auto border-t border-slate-50">
          <div className="px-4 py-3 mb-3 bg-slate-50 rounded-xl">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">當前登入</p>
             <p className="text-sm font-bold text-slate-700 truncate">{user.name}</p>
          </div>
          <button onClick={() => setUser(null)} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-rose-500 hover:bg-rose-50 rounded-xl font-black transition-colors text-sm border-none bg-transparent cursor-pointer">
            <LogOut className="w-4 h-4" /> 登出系統
          </button>
        </div>
      </aside>

      {/* 主要內容區 */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* 行動版頂部列 */}
        <header className="md:hidden flex items-center justify-between px-5 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-[100]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
               <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
               <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none">ClubRoll</h1>
               <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{user.role === 'admin' ? '管理者' : user.role === 'class_teacher' ? `${user.assignedClassName} 導師` : '老師'}</p>
            </div>
          </div>
          <button 
            onClick={() => setUser(null)}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-500 rounded-xl font-black text-[11px] border-none active:scale-95 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> 登出
          </button>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard user={user} state={state} addClub={addClub} updateClub={updateClub} bulkImportClubs={bulkImportClubs} deleteClub={deleteClub} setLeave={setLeave} cancelLeave={cancelLeave} deleteAttendanceRecord={deleteAttendanceRecord} />} />
              <Route path="/club/:id" element={<ClubDetail role={user.role} user={user} state={state} addMember={addMember} updateMember={updateMember} deleteMember={deleteMember} updateClub={updateClub} deleteClub={deleteClub} cancelLeave={cancelLeave} deleteAttendanceRecord={deleteAttendanceRecord} />} />
              <Route path="/roll-call/:clubId" element={<RollCall state={state} onSave={saveAttendance} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
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
