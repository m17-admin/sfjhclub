
import React, { useState } from 'react';
import { ClipboardCheck, Lock, User, ShieldCheck, ArrowRight, GraduationCap } from 'lucide-react';
import { User as UserType } from '../types';

interface LoginProps {
  onLogin: (user: UserType) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const userLower = username.toLowerCase();

    setTimeout(() => {
      // 1. 管理者邏輯
      if (userLower === 'admin' && password === 'admin123') {
        onLogin({ username: 'admin', role: 'admin', name: '全校管理員' });
        return;
      }

      // 2. 社團老師邏輯 (t1 ~ t45)
      const clubMatch = userLower.match(/^t(\d+)$/);
      if (clubMatch) {
        const num = parseInt(clubMatch[1]);
        if (num >= 1 && num <= 45 && password === 'club123') {
          onLogin({ 
            username: userLower, 
            role: 'teacher', 
            name: `社團指導老師 (T${num})`, 
            assignedClubId: num.toString() 
          });
          return;
        }
      }

      // 3. 班級老師邏輯 (c1 ~ c60)
      const classMatch = userLower.match(/^c(\d+)$/);
      if (classMatch) {
        const num = parseInt(classMatch[1]);
        if (num >= 1 && num <= 60 && password === 'class123') {
          let grade = 7;
          let room = num;
          if (num > 20 && num <= 40) { grade = 8; room = num - 20; }
          else if (num > 40) { grade = 9; room = num - 40; }
          const className = `${grade}${room.toString().padStart(2, '0')}`;
          onLogin({ 
            username: userLower, 
            role: 'class_teacher', 
            name: `${className} 班導師`, 
            assignedClassName: className 
          });
          return;
        }
      }

      setIsLoading(false);
      setError('帳號或密碼錯誤，請檢查輸入');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full py-12">
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 text-white rounded-[2rem] shadow-xl shadow-indigo-200 mb-6">
            <ClipboardCheck className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">ClubRoll</h1>
          <p className="text-slate-500 mt-2 font-medium">湖口國中社團活動智能點名系統</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 transition-all">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">帳號名稱</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                  placeholder="t1~t45 或 c1~c60"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">登入密碼</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                  placeholder="請輸入密碼"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100 animate-bounce">
                {error}
              </p>
            )}

            <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 group transition-all active:scale-95">
              {isLoading ? '驗證中...' : '進入管理系統'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-slate-100 space-y-3">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">系統存取說明</h4>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-colors">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold">社團老師 (45位)</span>
                </div>
                <code className="text-[10px] bg-white px-2 py-0.5 rounded border text-slate-500">t1~t45 / club123</code>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-orange-200 transition-colors">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-bold">班導師 (60位)</span>
                </div>
                <code className="text-[10px] bg-white px-2 py-0.5 rounded border text-slate-500">c1~c60 / class123</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
