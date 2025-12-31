
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppState, Club, User, AttendanceStatus, LeaveRecord } from '../types';
import { getLocalDateString } from '../App';
import { 
  Users, CalendarCheck, AlertCircle, ChevronRight, Clock, ShieldCheck, 
  GraduationCap, School, CheckCircle2, Search, Activity, Plus, Edit3, RotateCcw,
  XCircle, Filter, Check, MoreVertical, ClipboardCheck, Info
} from 'lucide-react';

interface DashboardProps {
  state: AppState;
  user: User;
  addClub: (club: Club) => void;
  updateClub: (id: string, name: string, description: string) => void;
  bulkImportClubs: (clubs: Club[]) => void;
  deleteClub: (id: string) => void;
  setLeave?: (leave: LeaveRecord) => void;
  cancelLeave?: (id: string) => void;
  deleteAttendanceRecord?: (clubId: string, date: string) => void;
}

const LEAVE_REASONS = ['事假', '病假', '公假', '喪假', '生理假', '其他'];

const Dashboard: React.FC<DashboardProps> = ({ state, user, addClub, updateClub, setLeave, cancelLeave }) => {
  const [showClubModal, setShowClubModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');
  const [clubForm, setClubForm] = useState({ id: '', name: '', description: '', isEdit: false });
  const [leaveForm, setLeaveForm] = useState({ memberId: '', reason: LEAVE_REASONS[0] });
  const [cancelForm, setCancelForm] = useState({ leaveId: '' });

  const role = user.role;
  const todayStr = getLocalDateString();
  const navigate = useNavigate();

  // 今日點名紀錄篩選
  const todayRecords = useMemo(() => 
    state.attendanceRecords.filter(r => {
      const rDate = r.date.includes('T') ? r.date.split('T')[0] : r.date;
      return rDate === todayStr;
    }),
  [state.attendanceRecords, todayStr]);

  // 權限範圍內的成員名單
  const targetMembers = useMemo(() => {
    const allMembers = state.clubs.flatMap(c => c.members.map(m => ({ ...m, clubName: c.name, clubId: c.id })));
    const filtered = role === 'class_teacher' 
      ? allMembers.filter(m => m.className === user.assignedClassName)
      : role === 'teacher'
        ? allMembers.filter(m => m.clubId === user.assignedClubId)
        : allMembers;

    return [...filtered].sort((a, b) => a.className.localeCompare(b.className));
  }, [state.clubs, role, user.assignedClassName, user.assignedClubId]);

  // 權限範圍內的今日請假名單
  const classLeaves = useMemo(() => {
    const memberIds = new Set(targetMembers.map(m => m.id));
    return state.leaveRecords.filter(l => l.date === todayStr && memberIds.has(l.memberId));
  }, [targetMembers, state.leaveRecords, todayStr]);

  // 確保彈窗選單始終同步
  useEffect(() => {
    if (classLeaves.length > 0) {
      if (!cancelForm.leaveId || !classLeaves.some(l => l.id === cancelForm.leaveId)) {
        setCancelForm({ leaveId: classLeaves[0].id });
      }
    } else {
      setCancelForm({ leaveId: '' });
      if (showCancelModal) setShowCancelModal(false);
    }
  }, [classLeaves, showCancelModal, cancelForm.leaveId]);

  // 全域統計計算
  const stats = useMemo(() => {
    const total = targetMembers.length;
    const leavesCount = classLeaves.length;
    let absent = 0, late = 0;
    const hasAnyRecord = todayRecords.length > 0;
    
    targetMembers.forEach(m => {
      const isOnLeave = state.leaveRecords.some(l => l.memberId === m.id && l.date === todayStr);
      if (isOnLeave) return; 
      const clubRecord = todayRecords.find(r => r.clubId === m.clubId);
      if (clubRecord) {
        const status = clubRecord.records[m.id];
        if (status === AttendanceStatus.ABSENT || status === AttendanceStatus.EXCUSED) absent++;
        else if (status === AttendanceStatus.LATE) late++;
      }
    });
    return { total, leaves: leavesCount, absent, late, hasRecord: hasAnyRecord };
  }, [targetMembers, state.leaveRecords, todayRecords, todayStr, classLeaves.length]);

  // 管理者：社團監控列表數據
  const clubsStats = useMemo(() => {
    if (role !== 'admin') return [];
    return state.clubs.map(club => {
      const record = todayRecords.find(r => r.clubId === club.id);
      let p = 0, a = 0, l = 0, e = 0;
      club.members.forEach(m => {
        const isOnLeave = state.leaveRecords.some(lv => lv.memberId === m.id && lv.date === todayStr);
        if (isOnLeave) e++;
        else if (record) {
          const status = record.records[m.id];
          if (status === AttendanceStatus.PRESENT) p++;
          else if (status === AttendanceStatus.ABSENT || status === AttendanceStatus.EXCUSED) a++;
          else if (status === AttendanceStatus.LATE) l++;
        }
      });
      return { id: club.id, name: club.name, description: club.description, total: club.members.length, isCompleted: !!record, present: p, absent: a, late: l, excused: e };
    }).filter(c => c.name.toLowerCase().includes(adminSearch.toLowerCase()));
  }, [role, state.clubs, todayRecords, state.leaveRecords, todayStr, adminSearch]);

  const handleClubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (clubForm.isEdit) {
      updateClub(clubForm.id, clubForm.name, clubForm.description);
    } else {
      addClub({ id: `club-${Date.now()}`, name: clubForm.name, description: clubForm.description, createdAt: Date.now(), members: [] });
    }
    setShowClubModal(false);
  };

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setLeave || !leaveForm.memberId) return;
    const member = targetMembers.find(m => m.id === leaveForm.memberId);
    if (!member) return;
    setLeave({ id: `leave-${Date.now()}`, memberId: member.id, studentName: member.name, date: todayStr, reason: leaveForm.reason });
    setShowLeaveModal(false);
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelLeave || !cancelForm.leaveId) return;
    cancelLeave(cancelForm.leaveId);
    setShowCancelModal(false);
  };

  const handleQuickRevoke = (leaveId: string, name: string) => {
    if (!cancelLeave) return;
    if (window.confirm(`確定要立即撤銷「${name}」的請假紀錄嗎？`)) {
      cancelLeave(leaveId);
    }
  };

  const isClubTeacherCompleted = useMemo(() => {
    if (role !== 'teacher') return false;
    return todayRecords.some(r => r.clubId === user.assignedClubId);
  }, [role, todayRecords, user.assignedClubId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-16">
      {/* 標題與操作區 */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase mb-2 tracking-widest">
            {role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : role === 'class_teacher' ? <GraduationCap className="w-3 h-3" /> : <School className="w-3 h-3" />}
            {role === 'admin' ? '全校管理者模式' : role === 'class_teacher' ? `${user.assignedClassName} 班導師` : '社團指導老師'}
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
             {role === 'admin' ? '校務點名大數據' : role === 'teacher' ? '社團出缺席狀況' : '儀表板總覽'}
          </h2>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          {role === 'admin' && (
            <button 
              onClick={() => { setClubForm({ id: '', name: '', description: '', isEdit: false }); setShowClubModal(true); }} 
              className="flex-1 lg:flex-none bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl hover:bg-indigo-700 active:scale-95 transition-all text-sm border-none cursor-pointer"
            >
              <Plus className="w-5 h-5" /> 新增社團
            </button>
          )}
          {role === 'class_teacher' && (
            <div className="flex gap-2 w-full">
              <button 
                onClick={() => { 
                  if (targetMembers.length > 0) { 
                    setLeaveForm({ memberId: targetMembers[0].id, reason: LEAVE_REASONS[0] }); 
                    setShowLeaveModal(true); 
                  } else {
                    alert('目前班級尚無學生資料，無法登記請假。');
                  }
                }} 
                className="flex-1 bg-orange-600 text-white px-6 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl hover:bg-orange-700 active:scale-95 transition-all text-sm border-none cursor-pointer"
              >
                <Plus className="w-5 h-5" /> 登記請假
              </button>
              <button 
                disabled={classLeaves.length === 0}
                onClick={() => setShowCancelModal(true)} 
                className="flex-1 bg-white text-orange-600 border-2 border-orange-600 px-6 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 shadow-sm hover:bg-orange-50 active:scale-95 transition-all text-sm border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-5 h-5" /> 撤銷管理
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 社團老師專屬：手機版置頂點名按鈕 */}
      {role === 'teacher' && user.assignedClubId && (
        <div className="animate-in slide-in-from-top-4 duration-500">
          <button 
            onClick={() => navigate(`/roll-call/${user.assignedClubId}`)}
            className={`w-full py-5 rounded-[2.5rem] font-black text-lg flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 border-none cursor-pointer ${
              isClubTeacherCompleted 
                ? 'bg-white text-indigo-600 border-2 border-indigo-600 shadow-indigo-100' 
                : 'bg-indigo-600 text-white shadow-indigo-200'
            }`}
          >
            <ClipboardCheck className="w-6 h-6" />
            {isClubTeacherCompleted ? '修改今日點名' : '今日開始點名'}
          </button>
          {isClubTeacherCompleted && (
            <p className="text-center text-[11px] font-bold text-emerald-600 mt-3 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 您已完成今日點名回傳
            </p>
          )}
        </div>
      )}

      {/* 統計數值區 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-3 md:gap-5">
          <div className="w-10 h-10 md:w-14 md:h-14 bg-indigo-50 text-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0"><Users className="w-5 h-5 md:w-8 md:h-8" /></div>
          <div className="min-w-0"><p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest truncate">總人數</p><h4 className="text-xl md:text-2xl font-black text-slate-800">{stats.total}</h4></div>
        </div>
        <div className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-3 md:gap-5">
          <div className="w-10 h-10 md:w-14 md:h-14 bg-orange-50 text-orange-600 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0"><CalendarCheck className="w-5 h-5 md:w-8 md:h-8" /></div>
          <div className="min-w-0"><p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest truncate">已請假</p><h4 className="text-xl md:text-2xl font-black text-slate-800">{stats.leaves}</h4></div>
        </div>
        <div className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-3 md:gap-5">
          <div className="w-10 h-10 md:w-14 md:h-14 bg-rose-50 text-rose-600 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0"><AlertCircle className="w-5 h-5 md:w-8 md:h-8" /></div>
          <div className="min-w-0"><p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest truncate">缺席</p><h4 className="text-xl md:text-2xl font-black text-slate-800">{role === 'admin' || stats.hasRecord ? stats.absent : '--'}</h4></div>
        </div>
        <div className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-3 md:gap-5">
          <div className="w-10 h-10 md:w-14 md:h-14 bg-amber-50 text-amber-600 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0"><Clock className="w-5 h-5 md:w-8 md:h-8" /></div>
          <div className="min-w-0"><p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest truncate">遲到</p><h4 className="text-xl md:text-2xl font-black text-slate-800">{role === 'admin' || stats.hasRecord ? stats.late : '--'}</h4></div>
        </div>
      </div>

      {/* 內容區：管理者與導師/老師分流 */}
      {role === 'admin' ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Activity className="w-6 h-6 text-indigo-500" /> 全校社團監控列表</h3>
            <div className="relative w-full sm:w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input type="text" placeholder="搜尋社團..." value={adminSearch} onChange={e => setAdminSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none shadow-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubsStats.map(club => (
              <div key={club.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 truncate">
                       <div className="flex items-center gap-2">
                         <h4 className="text-lg font-black text-slate-900 truncate">{club.name}</h4>
                         <button onClick={() => { setClubForm({ id: club.id, name: club.name, description: club.description || '', isEdit: true }); setShowClubModal(true); }} className="p-1.5 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer"><Edit3 className="w-4 h-4" /></button>
                       </div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">成員 {club.total} 人</p>
                    </div>
                    {club.isCompleted ? <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black border border-emerald-100"><CheckCircle2 className="w-3 h-3" /> 已回傳</span> : <span className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black border border-rose-100"><AlertCircle className="w-3 h-3" /> 未點名</span>}
                 </div>
                 <div className="grid grid-cols-4 gap-1 mb-6 text-center">
                    <div><p className="text-[9px] font-black text-slate-400 uppercase">出席</p><p className="text-sm font-black">{club.isCompleted ? club.present : '--'}</p></div>
                    <div><p className="text-[9px] font-black text-slate-400 uppercase">缺席</p><p className="text-sm font-black text-rose-600">{club.isCompleted ? club.absent : '--'}</p></div>
                    <div><p className="text-[9px] font-black text-slate-400 uppercase">遲到</p><p className="text-sm font-black text-amber-600">{club.isCompleted ? club.late : '--'}</p></div>
                    <div><p className="text-[9px] font-black text-slate-400 uppercase">請假</p><p className="text-sm font-black text-orange-600">{club.excused}</p></div>
                 </div>
                 <Link to={`/club/${club.id}`} className="w-full py-3 bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-500 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all no-underline shadow-sm">進入管理詳情 <ChevronRight className="w-4 h-4" /></Link>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] md:rounded-[3rem] shadow-sm overflow-hidden">
          <div className="p-5 md:p-7 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-black text-slate-800 flex items-center gap-2 tracking-tight text-sm md:text-base">
              <GraduationCap className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" /> {role === 'teacher' ? '社團成員出勤表' : '今日班級學生動態'}
            </h3>
            <div className="hidden md:block text-[10px] font-black text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 uppercase">
              自動同步：{new Date().toLocaleTimeString()}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-5 md:px-8 py-4 md:py-5">學生姓名</th>
                  <th className="px-5 md:px-8 py-4 md:py-5">{role === 'teacher' ? '班級' : '所屬社團'}</th>
                  <th className="px-5 md:px-8 py-4 md:py-5 text-right">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {targetMembers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-8 py-12 text-center text-slate-400 font-bold italic">
                       目前班級尚無學生資料
                    </td>
                  </tr>
                ) : (
                  targetMembers.map(m => {
                    const hasLeave = state.leaveRecords.find(l => l.memberId === m.id && l.date === todayStr);
                    const record = todayRecords.find(r => r.clubId === m.clubId);
                    const status = record ? record.records[m.id] : null;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 md:px-8 py-4 md:py-5 font-black text-slate-900 text-sm">{m.name}</td>
                        <td className="px-5 md:px-8 py-4 md:py-5 text-slate-500 text-[11px] font-bold">{role === 'teacher' ? m.className : m.clubName}</td>
                        <td className="px-5 md:px-8 py-4 md:py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {hasLeave ? (
                              <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded-lg text-[10px] font-black border border-orange-100">
                                准假
                              </span>
                            ) : status === AttendanceStatus.PRESENT ? (
                              <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg text-[10px] font-black border border-emerald-100">
                                出席
                              </span>
                            ) : status === AttendanceStatus.ABSENT ? (
                              <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded-lg text-[10px] font-black border border-rose-100">
                                缺席
                              </span>
                            ) : status === AttendanceStatus.LATE ? (
                              <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded-lg text-[10px] font-black border border-amber-100">
                                遲到
                              </span>
                            ) : (
                              <span className="text-slate-300 text-[10px] font-black italic">待點名</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 彈窗：新增/編輯社團 */}
      {showClubModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <form onSubmit={handleClubSubmit} className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{clubForm.isEdit ? '編輯社團資料' : '新增全新社團'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2 ml-1">社團名稱</label>
                <input type="text" required value={clubForm.name} onChange={e => setClubForm({...clubForm, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2 ml-1">社團描述</label>
                <textarea value={clubForm.description} onChange={e => setClubForm({...clubForm, description: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold h-24 resize-none" />
              </div>
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => setShowClubModal(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl border-none outline-none">取消</button>
              <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg hover:bg-indigo-700 border-none outline-none">儲存設定</button>
            </div>
          </form>
        </div>
      )}

      {/* 彈窗：登記請假 */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <form onSubmit={handleLeaveSubmit} className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2"><CalendarCheck className="w-6 h-6 text-orange-500" /> 登記學生請假</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2 ml-1">選擇學生</label>
                <select value={leaveForm.memberId} onChange={e => setLeaveForm({...leaveForm, memberId: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold shadow-sm">
                  {targetMembers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.clubName})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2 ml-1">請假假別</label>
                <select value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold shadow-sm">
                  {LEAVE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => setShowLeaveModal(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl border-none outline-none">取消</button>
              <button type="submit" className="flex-1 py-4 bg-orange-600 text-white font-black rounded-2xl shadow-lg hover:bg-orange-700 active:scale-95 border-none outline-none">確認登記</button>
            </div>
          </form>
        </div>
      )}

      {/* 彈窗：撤銷請假 */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <form onSubmit={handleCancelSubmit} className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2"><RotateCcw className="w-6 h-6 text-orange-600" /> 撤銷管理</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2 ml-1">選擇欲撤銷之請假人員</label>
                <select 
                  value={cancelForm.leaveId} 
                  onChange={e => setCancelForm({ leaveId: e.target.value })} 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold shadow-sm"
                >
                  {classLeaves.map(l => <option key={l.id} value={l.id}>{l.studentName} ({l.reason})</option>)}
                </select>
              </div>
              <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-3">
                 <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                 <p className="text-xs text-orange-700 font-medium">撤銷後，資料將自動同步至對應社團的點名表中，學生將恢復為出席狀態。</p>
              </div>
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => setShowCancelModal(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl border-none outline-none">取消</button>
              <button type="submit" className="flex-1 py-4 bg-orange-600 text-white font-black rounded-2xl shadow-lg hover:bg-orange-700 active:scale-95 border-none outline-none">確認撤銷</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
