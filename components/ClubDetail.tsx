
import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, UserPlus, ClipboardCheck, Search, Trash2, LayoutDashboard, 
  Plus, RotateCcw, CalendarCheck, Check, X, Clock, Edit3, Edit2, UserMinus
} from 'lucide-react';
import { AppState, Member, AttendanceStatus, User } from '../types';
import { getLocalDateString } from '../App';

interface ClubDetailProps {
  state: AppState;
  role: string;
  user?: User;
  addMember: (clubId: string, member: Member) => void;
  updateMember: (clubId: string, memberId: string, updatedData: Partial<Member>) => void;
  deleteMember: (clubId: string, memberId: string) => void;
  updateClub: (id: string, name: string, description: string) => void;
  deleteClub: (id: string) => void;
  cancelLeave?: (id: string) => void;
  deleteAttendanceRecord?: (clubId: string, date: string) => void;
}

const ClubDetail: React.FC<ClubDetailProps> = ({ state, role, user, addMember, updateMember, deleteMember, updateClub, deleteClub, cancelLeave }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const club = state.clubs.find(c => c.id === id);
  const todayStr = getLocalDateString();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showClubEditModal, setShowClubEditModal] = useState(false);
  const [showMemberEditModal, setShowMemberEditModal] = useState(false);
  
  const [newM, setNewM] = useState({ name: '', id: '', class: '' });
  const [clubEditForm, setClubEditForm] = useState({ name: club?.name || '', description: club?.description || '' });
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberEditForm, setMemberEditForm] = useState({ name: '', studentId: '', className: '' });

  if (!club) return <div className="p-12 text-center font-bold text-slate-400">找不到社團</div>;

  const todayRecord = useMemo(() => 
    state.attendanceRecords.find(r => r.clubId === club.id && r.date.startsWith(todayStr)),
  [state.attendanceRecords, club.id, todayStr]);

  const filteredMembers = club.members.filter(m => 
    m.name.includes(searchTerm) || m.className.includes(searchTerm) || m.studentId?.includes(searchTerm)
  );

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    addMember(club.id, { id: `m-manual-${Date.now()}`, name: newM.name, studentId: newM.id, className: newM.class });
    setNewM({ name: '', id: '', class: '' });
    setShowAddMemberModal(false);
  };

  const handleUpdateClub = (e: React.FormEvent) => {
    e.preventDefault();
    updateClub(club.id, clubEditForm.name, clubEditForm.description);
    setShowClubEditModal(false);
  };

  const handleOpenMemberEdit = (m: Member) => {
    setEditingMember(m);
    setMemberEditForm({ name: m.name, studentId: m.studentId || '', className: m.className });
    setShowMemberEditModal(true);
  };

  const handleUpdateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMember) {
      updateMember(club.id, editingMember.id, memberEditForm);
      setShowMemberEditModal(false);
      setEditingMember(null);
    }
  };

  const handleDeleteMember = (memberId: string, name: string) => {
    if (confirm(`確定要將學生「${name}」從 ${club.name} 中刪除嗎？`)) {
      deleteMember(club.id, memberId);
    }
  };

  const handleClubDeleteRequest = () => {
    if (club.members.length > 0) {
      alert(`此社團尚有 ${club.members.length} 名成員，請先清空名單後再刪除社團。`);
      return;
    }
    if (confirm(`確定要永久刪除社團「${club.name}」嗎？`)) {
      deleteClub(club.id);
      navigate('/');
    }
  };

  const executeRevoke = (leaveId: string) => {
    if (!cancelLeave) return;
    if (confirm('確定要撤銷此請假紀錄嗎？撤銷後該學生將恢復為「應出席」狀態。')) {
      cancelLeave(leaveId);
    }
  };

  const getStatusBadge = (member: Member) => {
    const leave = state.leaveRecords.find(l => l.memberId === member.id && l.date === todayStr);
    const isMyClass = role === 'class_teacher' && member.className === user?.assignedClassName;

    if (leave) {
      return (
        <div className="flex items-center gap-2">
          <span className="bg-orange-50 text-orange-600 px-3 py-1.5 rounded-xl text-[11px] font-black border border-orange-100 flex items-center gap-1.5">
            <CalendarCheck className="w-3.5 h-3.5" /> 已准假：{leave.reason}
          </span>
          {isMyClass && (
            <button 
              onClick={() => executeRevoke(leave.id)} 
              className="p-1.5 bg-white border border-orange-200 text-orange-500 hover:text-rose-600 hover:border-rose-200 rounded-lg transition-all shadow-sm active:scale-90 border-none bg-transparent cursor-pointer"
              title="撤銷請假"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      );
    }

    if (!todayRecord) return <span className="text-slate-300 text-[11px] font-bold italic bg-slate-50 px-3 py-1.5 rounded-xl">待點名</span>;
    
    const status = todayRecord.records[member.id];
    switch (status) {
      case AttendanceStatus.PRESENT: return <span className="text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl text-[11px] font-black border border-emerald-100 flex items-center gap-1"><Check className="w-3 h-3"/> 出席</span>;
      case AttendanceStatus.ABSENT: return <span className="text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl text-[11px] font-black border border-rose-100 flex items-center gap-1"><X className="w-3 h-3"/> 缺席</span>;
      case AttendanceStatus.LATE: return <span className="text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl text-[11px] font-black border border-amber-100 flex items-center gap-1"><Clock className="w-3 h-3"/> 遲到</span>;
      default: return <span className="text-slate-300 text-[11px] font-bold italic bg-slate-50 px-3 py-1.5 rounded-xl">待點名</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <Link to="/" className="p-2 -ml-2 text-slate-500 hover:bg-white rounded-full transition-all group">
          <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1" />
        </Link>
        {role === 'admin' && (
          <div className="flex items-center gap-2">
            <button onClick={() => { setClubEditForm({ name: club.name, description: club.description || '' }); setShowClubEditModal(true); }} className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border-none bg-transparent cursor-pointer" title="編輯社團"><Edit3 className="w-5 h-5" /></button>
            <button onClick={handleClubDeleteRequest} className={`p-2 transition-colors border-none bg-transparent cursor-pointer ${club.members.length > 0 ? 'text-slate-200' : 'text-slate-300 hover:text-rose-500'}`} title={club.members.length > 0 ? "需清空名單才可刪除" : "刪除社團"}><Trash2 className="w-5 h-5" /></button>
          </div>
        )}
      </div>

      <div className="bg-white border-2 border-slate-100 p-8 rounded-[3rem] shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">社團詳情</div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">{club.name}</h1>
            <p className="text-slate-400 font-medium max-w-lg">{club.description || '探索更多才藝，豐富校園生活。'}</p>
          </div>
          {(role === 'teacher' || role === 'admin') && (
            <Link to={`/roll-call/${club.id}`} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl hover:bg-indigo-700 transition-all active:scale-95 no-underline">
              <ClipboardCheck className="w-6 h-6" /> {todayRecord ? '修改點名資料' : '開始今日點名'}
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><LayoutDashboard className="w-5 h-5 text-indigo-500" /> 成員清單 ({club.members.length})</h3>
          {role === 'admin' && (
             <button onClick={() => setShowAddMemberModal(true)} className="w-full sm:w-auto text-white bg-indigo-600 px-6 py-3 rounded-xl text-sm font-black shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all active:scale-95 border-none cursor-pointer"><Plus className="w-4 h-4" /> 加入學生</button>
          )}
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input type="text" placeholder="搜尋學生姓名或學號..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm" />
        </div>

        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr><th className="px-8 py-5">學生姓名</th><th className="px-8 py-5">班級</th><th className="px-8 py-5 text-right">出勤狀態</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-all group">
                    <td className="px-8 py-5"><div><div className="font-bold text-slate-900">{m.name}</div><div className="text-[10px] text-slate-300 font-mono tracking-tighter">{m.studentId || '無學號紀錄'}</div></div></td>
                    <td className="px-8 py-5"><span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100/50">{m.className}</span></td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end items-center gap-4">
                        {getStatusBadge(m)}
                        {role === 'admin' && (
                          <div className="flex items-center gap-1 border-l pl-4 border-slate-100">
                            <button onClick={() => handleOpenMemberEdit(m)} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border-none bg-transparent cursor-pointer" title="編輯資料"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteMember(m.id, m.name)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all border-none bg-transparent cursor-pointer" title="移除學員"><UserMinus className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 彈窗區 */}
      {showClubEditModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[250] flex items-center justify-center p-4">
          <form onSubmit={handleUpdateClub} className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">修改社團基本資料</h3>
            <div className="space-y-4">
              <div><label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">名稱</label><input type="text" required value={clubEditForm.name} onChange={e => setClubEditForm({...clubEditForm, name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">描述</label><textarea value={clubEditForm.description} onChange={e => setClubEditForm({...clubEditForm, description: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold h-24" /></div>
            </div>
            <div className="flex gap-4"><button type="button" onClick={() => setShowClubEditModal(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl border-none outline-none">取消</button><button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg hover:bg-indigo-700 active:scale-95 border-none outline-none">確認修改</button></div>
          </form>
        </div>
      )}

      {showMemberEditModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[250] flex items-center justify-center p-4">
          <form onSubmit={handleUpdateMember} className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">修改學員資料</h3>
            <div className="space-y-4">
              <div><label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">班級</label><input type="text" required value={memberEditForm.className} onChange={e => setMemberEditForm({...memberEditForm, className: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">姓名</label><input type="text" required value={memberEditForm.name} onChange={e => setMemberEditForm({...memberEditForm, name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">學號</label><input type="text" value={memberEditForm.studentId} onChange={e => setMemberEditForm({...memberEditForm, studentId: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" /></div>
            </div>
            <div className="flex gap-4"><button type="button" onClick={() => setShowMemberEditModal(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl border-none">取消</button><button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg hover:bg-indigo-700 active:scale-95 border-none">確認更新</button></div>
          </form>
        </div>
      )}

      {showAddMemberModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[250] flex items-center justify-center p-4">
          <form onSubmit={handleAddMember} className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
            <div className="flex justify-between items-start"><h3 className="text-2xl font-black text-slate-900 tracking-tight">手動加入成員</h3><div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><UserPlus className="w-6 h-6" /></div></div>
            <div className="space-y-4">
              <div><label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">班級</label><input type="text" required value={newM.class} onChange={e => setNewM({...newM, class: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">學生姓名</label><input type="text" required value={newM.name} onChange={e => setNewM({...newM, name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">學號</label><input type="text" value={newM.id} onChange={e => setNewM({...newM, id: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none" /></div>
            </div>
            <div className="flex gap-4"><button type="button" onClick={() => setShowAddMemberModal(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl border-none">取消</button><button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg hover:bg-indigo-700 active:scale-95 border-none">確認加入</button></div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ClubDetail;
