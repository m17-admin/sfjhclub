
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import { AppState, Club, User, AttendanceStatus, LeaveRecord } from '../types';
import { getLocalDateString } from '../App';
import { 
  Users, CalendarCheck, AlertCircle, Clock, ShieldCheck, 
  School, CheckCircle2, Search, Activity, Plus, Sparkles, 
  RefreshCw, Cloud, FileText
} from 'lucide-react';

interface DashboardProps {
  state: AppState;
  user: User;
  addClub: (club: Club) => void;
  updateClub: (id: string, name: string, description: string) => void;
  setLeave?: (leave: LeaveRecord) => void;
  cancelLeave?: (id: string) => void;
  isSyncing?: boolean;
  onRefresh?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, user, isSyncing, onRefresh }) => {
  const role = user.role;
  const todayStr = getLocalDateString();
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  const todayRecords = useMemo(() => state.attendanceRecords.filter(r => r.date === todayStr), [state.attendanceRecords, todayStr]);

  const stats = useMemo(() => {
    const clubsCount = state.clubs.length;
    const completedCount = todayRecords.length;
    const totalMembers = state.clubs.reduce((acc, c) => acc + c.members.length, 0);
    let absent = 0;
    todayRecords.forEach(r => Object.values(r.records).forEach(s => { if (s === AttendanceStatus.ABSENT) absent++; }));
    return { clubsCount, completedCount, totalMembers, absent };
  }, [state.clubs, todayRecords]);

  // AI 智能分析報告 (Gemini 驅動)
  const generateAiReport = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `你是一個專業的學校教務主任。以下是今天的社團點名數據：
      今日日期：${todayStr}
      社團總數：${stats.clubsCount}
      已完成點名：${stats.completedCount}
      全校社團總人數：${stats.totalMembers}
      目前缺席總人數：${stats.absent}
      請根據這些數據，寫一份簡短且口語化的出勤分析報告給校長。包含：
      1. 今日出勤總結
      2. 是否有異常情況需要注意
      3. 給予各社團指導老師的鼓勵或提醒。
      請用繁體中文撰寫，字數約 150 字內。`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setAiReport(response.text);
    } catch (e) {
      console.error(e);
      setAiReport("AI 分析暫時不可用，請稍後再試。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <Cloud className={`w-4 h-4 ${isSyncing ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {isSyncing ? '雲端資料同步中...' : `資料已同步 (${new Date(state.lastSyncedAt || Date.now()).toLocaleTimeString()})`}
            </span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            {role === 'admin' ? '校務點名管理儀表板' : '社團回傳狀態'}
          </h2>
        </div>
        
        {role === 'admin' && (
          <div className="flex gap-2">
            <button onClick={generateAiReport} disabled={isAnalyzing} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg hover:bg-emerald-700 transition-all border-none cursor-pointer">
              {isAnalyzing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} AI 智能分析
            </button>
            <button onClick={onRefresh} className="p-3 bg-white text-slate-400 border border-slate-200 rounded-2xl hover:text-indigo-600 transition-all cursor-pointer">
              <RefreshCw className={`w-6 h-6 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {aiReport && (
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden animate-in zoom-in-95">
          <div className="absolute top-0 right-0 p-8 opacity-10"><FileText className="w-32 h-32" /></div>
          <div className="relative z-10">
            <h3 className="text-xl font-black mb-4 flex items-center gap-2"><Sparkles className="w-6 h-6" /> Gemini AI 今日出勤洞察</h3>
            <p className="text-indigo-100 font-medium leading-relaxed mb-6">{aiReport}</p>
            <button onClick={() => setAiReport(null)} className="text-indigo-200 text-xs font-bold hover:text-white border-none bg-transparent cursor-pointer">關閉分析報告</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0"><Users className="w-6 h-6" /></div>
          <div><p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">社團總數</p><h4 className="text-2xl font-black text-slate-800">{stats.clubsCount}</h4></div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0"><CheckCircle2 className="w-6 h-6" /></div>
          <div><p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">已完成回傳</p><h4 className="text-2xl font-black text-slate-800">{stats.completedCount}</h4></div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0"><AlertCircle className="w-6 h-6" /></div>
          <div><p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">今日缺席</p><h4 className="text-2xl font-black text-slate-800">{stats.absent}</h4></div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0"><Activity className="w-6 h-6" /></div>
          <div><p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">回傳進度</p><h4 className="text-2xl font-black text-slate-800">{Math.round((stats.completedCount/stats.clubsCount)*100)}%</h4></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {state.clubs.map(club => {
          const isDone = todayRecords.some(r => r.clubId === club.id);
          const canView = role === 'admin' || (role === 'teacher' && user.assignedClubId === club.id);
          if (!canView) return null;

          return (
            <div key={club.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm group">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-lg font-black text-slate-900">{club.name}</h4>
                {isDone ? <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-[10px] font-black border border-emerald-100">已回傳</span> : <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded-full text-[10px] font-black border border-rose-100">尚未回傳</span>}
              </div>
              <p className="text-slate-400 text-xs mb-6 line-clamp-1">{club.description}</p>
              <Link to={`/club/${club.id}`} className="w-full py-3 bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-500 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all no-underline">管理點名資料</Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
