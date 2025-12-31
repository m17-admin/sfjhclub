
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Trash2, Settings, Edit3, Save, AlertCircle, Users, Sparkles, ShieldAlert
} from 'lucide-react';
import { AppState, Club } from '../types';

interface ClubManagerProps {
  state: AppState;
  addClub: (club: Club) => void;
  updateClub: (id: string, name: string, description: string) => void;
  deleteClub: (id: string) => void;
  role: string;
}

const ClubManager: React.FC<ClubManagerProps> = ({ state, addClub, updateClub, deleteClub, role }) => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', description: '', isEdit: false });

  if (role !== 'admin') {
    return (
      <div className="p-12 text-center">
        <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-slate-900">權限不足</h2>
        <button onClick={() => navigate('/')} className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold border-none cursor-pointer">返回首頁</button>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.isEdit) {
      updateClub(formData.id, formData.name, formData.description);
    } else {
      addClub({
        id: `club-${Date.now()}`,
        name: formData.name,
        description: formData.description,
        createdAt: Date.now(),
        members: []
      });
    }
    setShowModal(false);
    setFormData({ id: '', name: '', description: '', isEdit: false });
  };

  const onConfirmDelete = (e: React.MouseEvent, club: Club) => {
    e.stopPropagation(); // 確保不觸發其他卡片事件
    
    if (club.members.length > 0) {
      alert(`「${club.name}」目前尚有 ${club.members.length} 名學生，請先至試算表清空名單後再進行刪除。`);
      return;
    }
    
    if (window.confirm(`確定要永久刪除社團「${club.name}」嗎？此操作不可還原。`)) {
      deleteClub(club.id);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-16">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 text-slate-500 hover:bg-white rounded-full transition-all border-none bg-transparent cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Settings className="w-6 h-6 text-indigo-600" /> 編輯社團項目
            </h2>
            <p className="text-slate-500 text-sm font-bold">管理全校社團清單與基本資訊</p>
          </div>
        </div>
        <button 
          onClick={() => { setFormData({ id: '', name: '', description: '', isEdit: false }); setShowModal(true); }}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all active:scale-95 border-none cursor-pointer"
        >
          <Plus className="w-5 h-5" /> 新增社團
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {state.clubs.map(club => (
          <div key={club.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm hover:shadow-md transition-all group relative">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 truncate">
                <h4 className="text-lg font-black text-slate-900 truncate">{club.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${club.members.length > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                    <Users className="w-3 h-3" /> {club.members.length} 人
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 relative z-10">
                <button 
                  onClick={() => { setFormData({ id: club.id, name: club.name, description: club.description || '', isEdit: true }); setShowModal(true); }}
                  className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border-none bg-transparent cursor-pointer"
                  title="編輯"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button 
                  onClick={(e) => onConfirmDelete(e, club)}
                  className={`p-3 transition-all border-none bg-transparent cursor-pointer flex items-center justify-center rounded-xl ${
                    club.members.length > 0 
                      ? 'text-slate-200 cursor-not-allowed opacity-50' 
                      : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                  }`}
                  title={club.members.length > 0 ? `尚有 ${club.members.length} 人，無法刪除` : "刪除社團"}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            <p className="text-slate-400 text-xs font-medium line-clamp-2 h-8">
              {club.description || '無描述資訊。'}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex items-start gap-4">
        <ShieldAlert className="w-6 h-6 text-blue-500 shrink-0 mt-1" />
        <div>
          <h4 className="font-black text-blue-900 text-sm">操作安全規範</h4>
          <p className="text-blue-700 text-xs mt-1 font-medium leading-relaxed">
            系統為了防止誤刪導致學生資料遺失，規定<b>僅限成員數為 0 的社團</b>可被刪除。若需刪除現有社團，請先利用「試算表」將學生名單分派至其他社團。
          </p>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-8 space-y-6 animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {formData.isEdit ? '編輯社團資料' : '新增社團項目'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2 ml-1">社團名稱</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2 ml-1">社團描述</label>
                <textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold h-24 resize-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl border-none bg-transparent cursor-pointer">取消</button>
              <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg hover:bg-indigo-700 transition-all border-none cursor-pointer">儲存設定</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ClubManager;
