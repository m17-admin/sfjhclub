
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, Search, Table, 
  AlertCircle, Users, UserPlus, HelpCircle, MousePointer2
} from 'lucide-react';
import { AppState, Club, Member } from '../types';

interface SpreadsheetEditorProps {
  state: AppState;
  onSave: (state: AppState) => void;
  role: string;
}

interface FlatMember extends Member {
  clubId: string;
}

const COLUMN_MAP = ['clubId', 'name', 'className', 'studentId'] as const;

const SpreadsheetEditor: React.FC<SpreadsheetEditorProps> = ({ state, onSave, role }) => {
  const navigate = useNavigate();
  
  if (role !== 'admin') {
    return (
      <div className="p-12 text-center h-full flex flex-col items-center justify-center">
        <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-slate-900">權限不足</h2>
        <p className="text-slate-500">僅限全校管理者可使用此功能。</p>
        <button onClick={() => navigate('/')} className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold">返回首頁</button>
      </div>
    );
  }

  const [flatMembers, setFlatMembers] = useState<FlatMember[]>(() => {
    return state.clubs.flatMap(club => 
      club.members.map(m => ({ ...m, clubId: club.id }))
    );
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // 追蹤當前聚焦的儲存格，用於貼上定位
  const [focusedCell, setFocusedCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);

  const filteredMembers = useMemo(() => {
    if (!searchTerm) return flatMembers;
    const lowerSearch = searchTerm.toLowerCase();
    return flatMembers.filter(m => 
      m.name.toLowerCase().includes(lowerSearch) || 
      m.className.toLowerCase().includes(lowerSearch) ||
      (m.studentId || '').toLowerCase().includes(lowerSearch)
    );
  }, [flatMembers, searchTerm]);

  const handleUpdate = (id: string, field: keyof FlatMember, value: string) => {
    setFlatMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    setHasChanges(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('確定要永久刪除此學員嗎？')) {
      setFlatMembers(prev => prev.filter(m => m.id !== id));
      setHasChanges(true);
    }
  };

  const handleAddRow = useCallback(() => {
    const newMember: FlatMember = {
      id: `m-new-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: '',
      studentId: '',
      className: '',
      clubId: state.clubs[0]?.id || ''
    };
    setFlatMembers(prev => [newMember, ...prev]);
    setHasChanges(true);
    return newMember;
  }, [state.clubs]);

  // 處理 Excel 貼上邏輯
  const handlePaste = (e: React.ClipboardEvent) => {
    if (!focusedCell) return;
    
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text/plain');
    const rows = pasteData.split(/\r?\n/).filter(row => row.length > 0);
    
    if (rows.length === 0) return;

    setFlatMembers(prev => {
      const newData = [...prev];
      const startRow = focusedCell.rowIndex;
      const startCol = focusedCell.colIndex;

      rows.forEach((rowStr, rIdx) => {
        const targetRowIdx = startRow + rIdx;
        const cells = rowStr.split('\t');

        // 如果貼上的行數超過現有行數，自動新增行
        if (targetRowIdx >= newData.length) {
          newData.push({
            id: `m-paste-${Date.now()}-${rIdx}-${Math.random().toString(36).substr(2, 5)}`,
            name: '',
            studentId: '',
            className: '',
            clubId: state.clubs[0]?.id || ''
          });
        }

        cells.forEach((cellContent, cIdx) => {
          const targetColIdx = startCol + cIdx;
          if (targetColIdx < COLUMN_MAP.length) {
            const field = COLUMN_MAP[targetColIdx];
            let value = cellContent.trim();

            // 特殊處理社團欄位：如果貼上的是社團名稱，嘗試轉換為 ID
            if (field === 'clubId') {
              const matchedClub = state.clubs.find(c => c.name === value || c.id === value);
              if (matchedClub) {
                value = matchedClub.id;
              } else if (value && !state.clubs.some(c => c.id === value)) {
                // 如果找不到對應社團且不是現有 ID，預設為第一個社團
                value = newData[targetRowIdx].clubId || state.clubs[0]?.id || '';
              }
            }

            newData[targetRowIdx] = {
              ...newData[targetRowIdx],
              [field]: value
            };
          }
        });
      });

      return newData;
    });

    setHasChanges(true);
  };

  const handleSaveAll = () => {
    setIsSaving(true);
    const newClubs: Club[] = state.clubs.map(club => {
      const clubMembers = flatMembers
        .filter(m => m.clubId === club.id)
        .map(({ clubId, ...m }) => m);
      return { ...club, members: clubMembers };
    });

    setTimeout(() => {
      onSave({ ...state, clubs: newClubs });
      setIsSaving(false);
      setHasChanges(false);
      alert('✅ 試算表資料已成功儲存並同步全校名單。');
    }, 800);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-100 animate-in fade-in duration-500">
      {/* 工具列 */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Table className="w-6 h-6 text-emerald-600" /> 
              全校名單試算表 
              {hasChanges && <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-600 text-[10px] rounded-full animate-pulse">未儲存變更</span>}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="搜尋學生..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white text-sm"
            />
          </div>
          <button onClick={handleAddRow} className="px-4 py-2 bg-white text-slate-600 border border-slate-300 rounded-lg text-sm font-bold hover:bg-slate-50 flex items-center gap-2 transition-all">
            <UserPlus className="w-4 h-4" /> 插入行
          </button>
          <button 
            onClick={handleSaveAll} 
            disabled={isSaving || !hasChanges}
            className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-black flex items-center gap-2 shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-all"
          >
            {isSaving ? '同步中...' : <><Save className="w-4 h-4" /> 儲存變更</>}
          </button>
        </div>
      </div>

      {/* 試算表內容 */}
      <div className="flex-1 overflow-auto bg-slate-200 p-1 custom-scrollbar">
        <div className="inline-block min-w-full bg-white shadow-xl rounded-sm">
          <table className="border-collapse table-fixed min-w-full" onPaste={handlePaste}>
            <thead>
              <tr className="bg-slate-50">
                <th className="w-12 border border-slate-300 px-2 py-1 bg-slate-200 text-center text-[10px] font-black text-slate-500 uppercase">
                  #
                </th>
                <th className="w-48 border border-slate-300 px-4 py-2 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-50 z-10">
                  <span>A | 所屬社團</span>
                </th>
                <th className="w-48 border border-slate-300 px-4 py-2 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-50 z-10">
                  <span>B | 學生姓名</span>
                </th>
                <th className="w-32 border border-slate-300 px-4 py-2 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-50 z-10">
                  <span>C | 班級</span>
                </th>
                <th className="w-48 border border-slate-300 px-4 py-2 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-50 z-10">
                  <span>D | 學號</span>
                </th>
                <th className="w-20 border border-slate-300 px-2 py-2 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-50 z-10">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m, index) => (
                <tr key={m.id} className="hover:bg-blue-50/30 group transition-colors">
                  <td className="border border-slate-200 bg-slate-100 text-center text-[10px] font-bold text-slate-400">
                    {index + 1}
                  </td>
                  
                  {/* 社團選單 A */}
                  <td 
                    className={`border border-slate-200 p-0 relative transition-all ${focusedCell?.rowIndex === index && focusedCell?.colIndex === 0 ? 'ring-2 ring-emerald-500 z-20 shadow-sm' : ''}`}
                    onClick={() => setFocusedCell({ rowIndex: index, colIndex: 0 })}
                  >
                    <select 
                      value={m.clubId}
                      onChange={e => handleUpdate(m.id, 'clubId', e.target.value)}
                      onFocus={() => setFocusedCell({ rowIndex: index, colIndex: 0 })}
                      className="w-full h-full px-4 py-2 bg-transparent outline-none font-bold text-sm text-indigo-700 cursor-pointer appearance-none"
                    >
                      {state.clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </td>

                  {/* 姓名 B */}
                  <td 
                    className={`border border-slate-200 p-0 relative transition-all ${focusedCell?.rowIndex === index && focusedCell?.colIndex === 1 ? 'ring-2 ring-emerald-500 z-20 shadow-sm' : ''} ${!m.name && 'bg-rose-50/50'}`}
                    onClick={() => setFocusedCell({ rowIndex: index, colIndex: 1 })}
                  >
                    <input 
                      type="text" 
                      value={m.name}
                      placeholder="..."
                      onFocus={() => setFocusedCell({ rowIndex: index, colIndex: 1 })}
                      onChange={e => handleUpdate(m.id, 'name', e.target.value)}
                      className="w-full h-full px-4 py-2 bg-transparent outline-none font-black text-slate-900 text-sm"
                    />
                  </td>

                  {/* 班級 C */}
                  <td 
                    className={`border border-slate-200 p-0 relative transition-all ${focusedCell?.rowIndex === index && focusedCell?.colIndex === 2 ? 'ring-2 ring-emerald-500 z-20 shadow-sm' : ''} ${!m.className && 'bg-rose-50/50'}`}
                    onClick={() => setFocusedCell({ rowIndex: index, colIndex: 2 })}
                  >
                    <input 
                      type="text" 
                      value={m.className}
                      placeholder="..."
                      onFocus={() => setFocusedCell({ rowIndex: index, colIndex: 2 })}
                      onChange={e => handleUpdate(m.id, 'className', e.target.value)}
                      className="w-full h-full px-4 py-2 bg-transparent outline-none font-bold text-slate-700 text-sm"
                    />
                  </td>

                  {/* 學號 D */}
                  <td 
                    className={`border border-slate-200 p-0 relative transition-all ${focusedCell?.rowIndex === index && focusedCell?.colIndex === 3 ? 'ring-2 ring-emerald-500 z-20 shadow-sm' : ''}`}
                    onClick={() => setFocusedCell({ rowIndex: index, colIndex: 3 })}
                  >
                    <input 
                      type="text" 
                      value={m.studentId || ''}
                      placeholder="..."
                      onFocus={() => setFocusedCell({ rowIndex: index, colIndex: 3 })}
                      onChange={e => handleUpdate(m.id, 'studentId', e.target.value)}
                      className="w-full h-full px-4 py-2 bg-transparent outline-none font-mono text-slate-500 text-sm"
                    />
                  </td>

                  <td className="border border-slate-200 text-center p-0">
                    <button 
                      onClick={() => handleDelete(m.id)}
                      className="w-full h-full py-2 flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all border-none bg-transparent cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr onClick={handleAddRow} className="cursor-pointer hover:bg-emerald-50 transition-colors">
                <td className="border border-slate-200 bg-slate-100 text-center text-slate-400">+</td>
                <td colSpan={5} className="border border-slate-200 px-4 py-3 text-slate-400 text-sm italic font-medium">
                  點擊此處新增一行，或直接在上方選中格點後貼上 Excel 資料...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 底部摘要 */}
      <div className="bg-white border-t border-slate-200 px-6 py-2 flex items-center justify-between shrink-0">
        <div className="flex gap-6 items-center">
          <div className="text-[10px] font-black text-slate-400 flex items-center gap-1.5">
            <Users className="w-3 h-3" /> 當前總計: <span className="text-slate-900">{flatMembers.length} 名學生</span>
          </div>
          <div className="text-[10px] font-black text-slate-400 flex items-center gap-1.5">
            <MousePointer2 className="w-3 h-3" /> 
            {focusedCell ? `選取中: 行 ${focusedCell.rowIndex + 1}, 欄 ${String.fromCharCode(65 + focusedCell.colIndex)}` : '未選取儲存格'}
          </div>
          <div className="text-[10px] font-black text-emerald-500 flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded">
            <HelpCircle className="w-3 h-3" /> 支援 Excel 大量貼上 (Ctrl+V)
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase">
           SmartSync v2.5 (Excel Support)
        </div>
      </div>
    </div>
  );
};

export default SpreadsheetEditor;
