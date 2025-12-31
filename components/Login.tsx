
import React, { useState } from 'react';
import { ClipboardCheck, Lock, User, Cloud, ArrowRight } from 'lucide-react';
import { User as UserType } from '../types';

interface LoginProps {
  onLogin: (user: UserType) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [syncCode, setSyncCode] = useState('SFJH-2025'); // 預設代碼
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const userLower = username.toLowerCase();

    setTimeout(() => {
      let role: UserType['role'] = 'teacher';
      let name = '';
      let assignedClubId: string | undefined;

      if (userLower === 'admin' && password === 'admin123') {
        role = 'admin';
        name = '教務處管理員';
      } else {
        const clubMatch = userLower.match(/^t(\d+)$/);
        if (clubMatch && password === 'club123') {
          role = 'teacher';
          name = `社團老師 (T${clubMatch[1]})`;
          assignedClubId = clubMatch[1];
        } else {
          setIsLoading(false);
          setError('帳號或密碼錯誤');
          return;
        }
      }

      onLogin({ username: userLower, role, name, assignedClubId, syncCode });
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 text-white rounded-[2rem] shadow-xl mb-6">
            <ClipboardCheck className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">ClubRoll</h1>
          <p className="text-slate-500 mt-2 font-medium">新豐國中智能雲端點名系統</p>
        </div>

        <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">帳號名稱</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" placeholder="admin 或 t1~t45" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">登入密碼</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" placeholder="密碼" required />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-50">
              <label className="block text-sm font-bold text-indigo-600 mb-1.5 ml-1">學校同步代碼 (Sync Code)</label>
              <div className="relative">
                <Cloud className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
                <input type="text" value={syncCode} onChange={e => setSyncCode(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-indigo-50 border border-indigo-100 text-indigo-700 font-black rounded-2xl outline-none" placeholder="輸入共同代碼以同步裝置" required />
              </div>
              <p className="text-[10px] text-slate-400 mt-2 ml-1">註：不同裝置登入同一代碼即可即時同步資料。</p>
            </div>

            {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}

            <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-lg flex items-center justify-center gap-2 group transition-all active:scale-95">
              {isLoading ? '同步連線中...' : '開始使用雲端系統'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
