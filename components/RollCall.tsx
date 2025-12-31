
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Save, 
  CalendarCheck,
  Edit3,
  Send,
  Info,
  Check,
  AlertCircle
} from 'lucide-react';
import { AppState, AttendanceStatus, AttendanceRecord } from '../types';
import { getLocalDateString } from '../App';

interface RollCallProps {
  state: AppState;
  onSave: (record: AttendanceRecord) => void;
}

const RollCall: React.FC<RollCallProps> = ({ state, onSave }) => {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const club = state.clubs.find(c => c.id === clubId);
  
  // 使用全系統統一日期基準
  const todayStr = getLocalDateString();
  
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>(() => {
    const initial: Record<string, AttendanceStatus> = {};
    club?.members.forEach(m => {
      const hasLeave = state.leaveRecords.some(l => l.memberId === m.id && l.date === todayStr);
      initial[m.id] = hasLeave ? AttendanceStatus.EXCUSED : AttendanceStatus.PRESENT;
    });
    return initial;
  });

  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false); 

  if (!club) return <div className="p-20 text-center font-bold text-slate-400">找不到社團資訊</div>;

  const toggleStatus = (memberId: string, status: AttendanceStatus) => {
    const currentLeave = state.leaveRecords.find(l => l.memberId === memberId && l.date === todayStr);
    if (currentLeave) return; // 請假鎖定，不可手動修改
    setRecords(prev => ({ ...prev, [memberId]: status }));
  };

  const handleReview = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsReviewing(true);
  };

  const handleFinalSubmit = () => {
    setIsSubmitting(true);
    
    const finalRecords = { ...records };
    club.members.forEach(m => {
      const hasLeave = state.leaveRecords.some(l => l.memberId === m.id && l.date === todayStr);
      if (hasLeave) {
        finalRecords[m.id] = AttendanceStatus.EXCUSED;
      }
    });

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      clubId: club.id,
      // 這裡改用在地日期 YYYY-MM-DD，確保資料庫勾稽一致
      date: todayStr, 
      records: finalRecords,
      notes
    };
    
    setTimeout(() => {
      onSave(newRecord);
      navigate('/'); 
    }, 600);
  };

  const getReviewStats = () => {
    let p = 0, a = 0, l = 0, e = 0;
    club.members.forEach(m => {
      const hasLeave = state.leaveRecords.some(lv => lv.memberId === m.id && lv.date === todayStr);
      if (hasLeave) {
        e++;
      } else {
        const s = records[m.id];
        if (s === AttendanceStatus.PRESENT) p++;
        else if (s === AttendanceStatus.ABSENT) a++;
        else if (s === AttendanceStatus.LATE) l++;
      }
    });
    return { p, a, l, e };
  };

  const reviewStats = getReviewStats();

  const absentStudents = club.members.filter(m => {
    const hasLeave = state.leaveRecords.some(lv => lv.memberId === m.id && lv.date === todayStr);
    return !hasLeave && (records[m.id] === AttendanceStatus.ABSENT);
  });

  const lateStudents = club.members.filter(m => {
    const hasLeave = state.leaveRecords.some(lv => lv.memberId === m.id && lv.date === todayStr);
    return !hasLeave && records[m.id] === AttendanceStatus.LATE;
  });

  const leaveStudents = club.members.filter(m => 
    state.leaveRecords.some(lv => lv.memberId === m.id && lv.date === todayStr)
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 md:pb-12 animate-in slide-in-from-bottom-8 duration-500">
      <div className="flex items-center justify-between sticky top-0 md:static bg-slate-50/90 backdrop-blur-md py-4 z-40 border-b md:border-none border-slate-200">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => isReviewing ? setIsReviewing(false) : navigate(`/club/${club.id}`)} 
            className="p-2 -ml-2 text-slate-500 hover:bg-white hover:shadow-sm rounded-full transition-all"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-900">{isReviewing ? '確認點名結果' : '今日點名'}</h2>
            <p className="text-slate-500 text-sm font-bold">{club.name} • {new Date().toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {isReviewing ? (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-400">
          <div className="bg-white border-2 border-indigo-100 rounded-[2.5rem] p-8 shadow-xl space-y-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">出席</p>
                <p className="text-2xl font-black text-emerald-700">{reviewStats.p}</p>
              </div>
              <div className="text-center p-4 bg-rose-50 rounded-2xl border border-rose-100">
                <p className="text-[10px] font-black text-rose-600 uppercase mb-1">缺席</p>
                <p className="text-2xl font-black text-rose-700">{reviewStats.a}</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <p className="text-[10px] font-black text-amber-600 uppercase mb-1">遲到</p>
                <p className="text-2xl font-black text-amber-700">{reviewStats.l}</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <p className="text-[10px] font-black text-orange-600 uppercase mb-1">請假</p>
                <p className="text-2xl font-black text-orange-700">{reviewStats.e}</p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="font-black text-slate-800 flex items-center gap-2 px-1 text-sm uppercase tracking-wider">
                <Info className="w-4 h-4 text-indigo-500" /> 出勤明細
              </h3>
              
              <div className="space-y-4">
                {absentStudents.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-rose-500 uppercase ml-2">缺席</p>
                    {absentStudents.map(s => (
                      <div key={s.id} className="flex justify-between items-center p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                        <span className="font-bold text-slate-900">{s.name}</span>
                        <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100">{s.className} 班</span>
                      </div>
                    ))}
                  </div>
                )}

                {lateStudents.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-amber-500 uppercase ml-2">遲到</p>
                    {lateStudents.map(s => (
                      <div key={s.id} className="flex justify-between items-center p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                        <span className="font-bold text-slate-900">{s.name}</span>
                        <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100">{s.className} 班</span>
                      </div>
                    ))}
                  </div>
                )}

                {leaveStudents.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-orange-500 uppercase ml-2">請假</p>
                    {leaveStudents.map(s => {
                      const leave = state.leaveRecords.find(l => l.memberId === s.id && l.date === todayStr);
                      return (
                        <div key={s.id} className="flex justify-between items-center p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                          <span className="font-bold text-slate-900">{s.name} <span className="text-[10px] text-orange-400 ml-1">({leave?.reason})</span></span>
                          <span className="text-[10px] font-black text-orange-400 bg-white px-2 py-1 rounded-lg border border-orange-100">{s.className} 班</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-100">
              <button 
                onClick={() => setIsReviewing(false)}
                className="flex-1 py-4 text-slate-500 font-black flex items-center justify-center gap-2 hover:bg-slate-50 rounded-2xl transition-all border border-slate-200"
              >
                <Edit3 className="w-5 h-5" /> 返回修改
              </button>
              <button 
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="flex-[1.5] bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? "傳送中..." : "確認無誤回傳"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm divide-y divide-slate-100">
            {club.members.map(member => {
              const leave = state.leaveRecords.find(l => l.memberId === member.id && l.date === todayStr);
              const isLocked = !!leave;
              const currentStatus = isLocked ? AttendanceStatus.EXCUSED : records[member.id];

              return (
                <div key={member.id} className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group transition-colors ${isLocked ? 'bg-orange-50/40' : 'hover:bg-slate-50/50'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all ${
                      currentStatus === AttendanceStatus.PRESENT ? 'bg-emerald-50 text-emerald-600' : 
                      currentStatus === AttendanceStatus.ABSENT ? 'bg-rose-50 text-rose-600' : 
                      currentStatus === AttendanceStatus.LATE ? 'bg-amber-50 text-amber-600' : 
                      'bg-orange-100 text-orange-600'
                    }`}>
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900">{member.name}</h4>
                        {isLocked && <span className="bg-orange-600 text-white text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase">已請假</span>}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{member.className} 班 • {member.studentId || '無學號'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center bg-slate-100 p-1 rounded-2xl gap-1 self-end sm:self-auto">
                    {isLocked ? (
                      <div className="flex items-center gap-2 px-6 py-2 text-orange-600 font-black text-xs">
                        假別：{leave.reason}
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => toggleStatus(member.id, AttendanceStatus.PRESENT)}
                          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black transition-all ${
                            currentStatus === AttendanceStatus.PRESENT ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'
                          }`}
                        >
                          出席
                        </button>
                        <button 
                          onClick={() => toggleStatus(member.id, AttendanceStatus.ABSENT)}
                          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black transition-all ${
                            currentStatus === AttendanceStatus.ABSENT ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'
                          }`}
                        >
                          缺席
                        </button>
                        <button 
                          onClick={() => toggleStatus(member.id, AttendanceStatus.LATE)}
                          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black transition-all ${
                            currentStatus === AttendanceStatus.LATE ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400'
                          }`}
                        >
                          遲到
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3 ml-1">備註</label>
            <textarea 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="輸入備註..."
              className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all resize-none text-sm"
            />
          </div>

          <div className="fixed bottom-24 md:static left-4 right-4 z-50">
            <button 
              onClick={handleReview}
              className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-lg shadow-2xl flex items-center justify-center gap-3 active:scale-95"
            >
              進入複核並回傳
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default RollCall;
