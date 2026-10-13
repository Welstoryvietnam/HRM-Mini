import React, { useState, useMemo } from 'react';
import {
  StickyNote,
  Plus,
  Search,
  Pin,
  Trash2,
  Edit3,
  Calendar,
  Tag,
  Check,
  X,
  Copy,
  CheckCheck,
  Briefcase,
  Users,
  Bell,
  Lightbulb,
  User as UserIcon,
  Filter,
  ArrowUpRight,
  Share2,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { WorkNote, NoteCategory, Employee, Task } from '../types';
import { getGoogleCalendarWebUrl } from '../utils/googleCalendar';

interface NoteManagerProps {
  employees: Employee[];
  notes: WorkNote[];
  setNotes: (notes: WorkNote[]) => void;
  currentUser: Employee | null;
  onConvertNoteToTask?: (
    note: WorkNote,
    targetEmployeeId?: string,
    options?: { dueDate?: string; priority?: Task['priority'] }
  ) => void;
}

const CATEGORY_META: Record<
  NoteCategory,
  { label: string; icon: React.FC<{ className?: string }>; color: string }
> = {
  work: {
    label: 'Công việc',
    icon: Briefcase,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  meeting: {
    label: 'Cuộc họp',
    icon: Users,
    color: 'text-sky-700 bg-sky-50 border-sky-200',
  },
  reminder: {
    label: 'Nhắc nhở',
    icon: Bell,
    color: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  idea: {
    label: 'Ý tưởng / Đề xuất',
    icon: Lightbulb,
    color: 'text-purple-700 bg-purple-50 border-purple-200',
  },
  personal: {
    label: 'Cá nhân',
    icon: UserIcon,
    color: 'text-slate-700 bg-slate-100 border-slate-200',
  },
};

const COLOR_PALETTES: Record<
  NonNullable<WorkNote['color']>,
  { bg: string; border: string; header: string; ring: string }
> = {
  amber: {
    bg: 'bg-amber-50/60',
    border: 'border-amber-200',
    header: 'bg-amber-100/70 text-amber-900',
    ring: 'focus:ring-amber-400',
  },
  emerald: {
    bg: 'bg-emerald-50/60',
    border: 'border-emerald-200',
    header: 'bg-emerald-100/70 text-emerald-900',
    ring: 'focus:ring-emerald-400',
  },
  sky: {
    bg: 'bg-sky-50/60',
    border: 'border-sky-200',
    header: 'bg-sky-100/70 text-sky-900',
    ring: 'focus:ring-sky-400',
  },
  rose: {
    bg: 'bg-rose-50/60',
    border: 'border-rose-200',
    header: 'bg-rose-100/70 text-rose-900',
    ring: 'focus:ring-rose-400',
  },
  purple: {
    bg: 'bg-purple-50/60',
    border: 'border-purple-200',
    header: 'bg-purple-100/70 text-purple-900',
    ring: 'focus:ring-purple-400',
  },
  slate: {
    bg: 'bg-slate-50/80',
    border: 'border-slate-200',
    header: 'bg-slate-200/60 text-slate-900',
    ring: 'focus:ring-slate-400',
  },
};

export const NoteManager: React.FC<NoteManagerProps> = ({
  employees,
  notes,
  setNotes,
  currentUser,
  onConvertNoteToTask,
}) => {
  const isAdminOrManager =
    currentUser?.role === 'admin' || currentUser?.role === 'quan_ly_nhan_su';

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | NoteCategory>('all');
  const [selectedEmpFilter, setSelectedEmpFilter] = useState<string>(
    isAdminOrManager ? 'all' : currentUser?.id || 'all'
  );
  const [filterPinnedOnly, setFilterPinnedOnly] = useState(false);

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Convert Note to Task Modal state (Select target employee, due date, priority)
  const [convertingNote, setConvertingNote] = useState<WorkNote | null>(null);
  const [convertTargetEmployeeId, setConvertTargetEmployeeId] = useState<string>('');
  const [convertDueDate, setConvertDueDate] = useState<string>('');
  const [convertPriority, setConvertPriority] = useState<Task['priority']>('medium');

  // Form fields
  const [formEmployeeId, setFormEmployeeId] = useState<string>(currentUser?.id || '');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NoteCategory>('work');
  const [isPinned, setIsPinned] = useState(false);
  const [noteColor, setNoteColor] = useState<NonNullable<WorkNote['color']>>('emerald');
  const [noteDate, setNoteDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Copied state indicator
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  // Filtered notes
  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => {
        // Employee filter
        if (selectedEmpFilter !== 'all' && n.employeeId !== selectedEmpFilter) {
          return false;
        }
        // Category filter
        if (selectedCategory !== 'all' && n.category !== selectedCategory) {
          return false;
        }
        // Pinned only
        if (filterPinnedOnly && !n.isPinned) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const emp = employees.find((e) => e.id === n.employeeId);
          const empName = emp?.name.toLowerCase() || '';
          return (
            n.title.toLowerCase().includes(q) ||
            n.content.toLowerCase().includes(q) ||
            empName.includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        // Pinned first, then newest updated
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      });
  }, [notes, selectedEmpFilter, selectedCategory, filterPinnedOnly, searchQuery, employees]);

  const openAddModal = () => {
    setEditingNoteId(null);
    setFormEmployeeId(
      selectedEmpFilter !== 'all' ? selectedEmpFilter : (currentUser?.id || employees[0]?.id || '')
    );
    setTitle('');
    setContent('');
    setCategory('work');
    setIsPinned(false);
    setNoteColor('emerald');
    setNoteDate(new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const openEditModal = (note: WorkNote) => {
    setEditingNoteId(note.id);
    setFormEmployeeId(note.employeeId);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category);
    setIsPinned(Boolean(note.isPinned));
    setNoteColor(note.color || 'emerald');
    setNoteDate(note.date || note.createdAt.split('T')[0]);
    setIsModalOpen(true);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;

    const nowIso = new Date().toISOString();

    if (editingNoteId) {
      setNotes(
        notes.map((n) =>
          n.id === editingNoteId
            ? {
                ...n,
                employeeId: formEmployeeId,
                title: title.trim() || 'Ghi chú công việc',
                content: content.trim(),
                category,
                isPinned,
                color: noteColor,
                date: noteDate,
                updatedAt: nowIso,
              }
            : n
        )
      );
    } else {
      const newNote: WorkNote = {
        id: `note-${Date.now()}`,
        employeeId: formEmployeeId || currentUser?.id || 'unknown',
        title: title.trim() || 'Ghi chú công việc',
        content: content.trim(),
        category,
        isPinned,
        color: noteColor,
        date: noteDate,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      setNotes([newNote, ...notes]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteNote = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa ghi chú này?')) {
      setNotes(notes.filter((n) => n.id !== id));
    }
  };

  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotes(
      notes.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n))
    );
  };

  const handleCopyContent = (note: WorkNote, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `${note.title}\n${note.content}`;
    navigator.clipboard.writeText(text);
    setCopiedNoteId(note.id);
    setTimeout(() => setCopiedNoteId(null), 2000);
  };

  const getEmployeeName = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    return emp ? emp.name : `NV (${id})`;
  };

  // Convert note to task handlers
  const handleOpenConvertModal = (note: WorkNote, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConvertingNote(note);
    // Default to the note's owner or currentUser or first employee
    setConvertTargetEmployeeId(note.employeeId || currentUser?.id || employees[0]?.id || '');
    // Default dueDate: note's date or today
    setConvertDueDate(note.date || new Date().toISOString().slice(0, 10));
    setConvertPriority('medium');
  };

  const handleConfirmConvert = () => {
    if (!convertingNote || !onConvertNoteToTask) return;
    onConvertNoteToTask(convertingNote, convertTargetEmployeeId, {
      dueDate: convertDueDate,
      priority: convertPriority,
    });
    setConvertingNote(null);
  };

  // Preset quick note templates for HR
  const handleInsertQuickTemplate = (type: 'checklist' | 'meeting' | 'reminder') => {
    if (type === 'checklist') {
      setTitle('Checklist hồ sơ nhân sự mới tiếp nhận');
      setContent(
        '1. Thu thập CCCD gắn chip (2 bản photo công chứng)\n2. Giấy khám sức khỏe loại A (thời hạn < 6 tháng)\n3. Sơ yếu lý lịch tự thuật có xác nhận địa phương\n4. Bằng cấp/Chứng chỉ chuyên môn liên quan\n5. Đăng ký thông tin thẻ ngân hàng nhận lương'
      );
      setCategory('work');
      setNoteColor('emerald');
    } else if (type === 'meeting') {
      setTitle('Biên bản họp giao ban HR Group đầu tuần');
      setContent(
        '• Mục tiêu tuyển dụng tuần này: Tiếp tục tuyển đủ 20 phụ bếp KCN Yên Phong\n• Tình hình đối soát tiền ăn ngoài: Chu kỳ 26/09 - 25/10 cần hoàn tất trước ngày 28\n• Các vướng mắc: Cần bổ sung nguồn ứng viên phỏng vấn trực tiếp\n• Phân công: Nam phụ trách liên hệ trường nghề, Chung rà soát hợp đồng.'
      );
      setCategory('meeting');
      setNoteColor('sky');
    } else if (type === 'reminder') {
      setTitle('Nhắc việc: Đối soát bảng kê tiền ăn trước ngày 25');
      setContent(
        '• Nhắc nhở toàn bộ nhân viên cập nhật đầy đủ các bữa ăn ngoài phát sinh.\n• In bảng chấm ăn tổng hợp gửi Kế toán và Trưởng bộ phận ký duyệt.\n• Kiểm tra chữ ký và đối chiếu số suất ăn trên hệ thống.'
      );
      setCategory('reminder');
      setNoteColor('amber');
      setIsPinned(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-2xs">
                <StickyNote className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Sổ Tay Ghi Chú Công Việc (Work Notes / 업무 메모)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ghi chép nhanh công việc, biên bản họp, lưu ý tuyển dụng & tích hợp đồng bộ công việc sang Google Calendar
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tạo Ghi Chú Mới</span>
            </button>
          </div>
        </div>

        {/* 2. Filters & Categories Navigation Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm nội dung ghi chú..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Category filter dropdown */}
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="w-full pl-9 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none cursor-pointer"
            >
              <option value="all">Tất cả danh mục ({notes.length})</option>
              <option value="work">💼 Công việc</option>
              <option value="meeting">👥 Cuộc họp</option>
              <option value="reminder">⏰ Nhắc nhở</option>
              <option value="idea">💡 Ý tưởng / Đề xuất</option>
              <option value="personal">👤 Cá nhân</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Employee filter */}
          {isAdminOrManager ? (
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedEmpFilter}
                onChange={(e) => setSelectedEmpFilter(e.target.value)}
                className="w-full pl-9 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none cursor-pointer"
              >
                <option value="all">Tất cả nhân sự ({employees.length})</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.id})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          ) : (
            <div className="flex items-center px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium truncate">
              <span>Sổ tay của: <strong>{currentUser?.name}</strong></span>
            </div>
          )}

          {/* Quick Pinned filter toggle button */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterPinnedOnly(!filterPinnedOnly)}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                filterPinnedOnly
                  ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Pin className={`w-3.5 h-3.5 ${filterPinnedOnly ? 'fill-amber-600 text-amber-700' : ''}`} />
              <span>{filterPinnedOnly ? 'Đang lọc: Đã ghim' : 'Chỉ xem ghi chú ghim'}</span>
            </button>
          </div>
        </div>

        {/* 3. Notes Grid */}
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
            <StickyNote className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">
              Chưa có ghi chú nào trong sổ tay.
            </p>
            <p className="text-xs text-slate-400">
              Nhấn nút "+ Tạo Ghi Chú Mới" để lưu lại thông tin công việc, checklist hoặc nội dung cuộc họp.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                onClick={() => {
                  openAddModal();
                  handleInsertQuickTemplate('checklist');
                }}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                + Mẫu Checklist Hồ Sơ
              </button>
              <button
                onClick={() => {
                  openAddModal();
                  handleInsertQuickTemplate('meeting');
                }}
                className="px-3 py-1.5 bg-sky-50 text-sky-800 border border-sky-200 rounded-xl text-xs font-bold hover:bg-sky-100 transition-colors cursor-pointer"
              >
                + Mẫu Biên Bản Họp
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => {
              const pal = COLOR_PALETTES[note.color || 'emerald'];
              const catMeta = CATEGORY_META[note.category];
              const IconComp = catMeta.icon;
              const gCalUrl = getGoogleCalendarWebUrl(
                note.title,
                note.content,
                note.date || note.createdAt.split('T')[0]
              );

              return (
                <div
                  key={note.id}
                  className={`rounded-2xl border ${pal.border} ${pal.bg} shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between overflow-hidden group`}
                >
                  <div>
                    {/* Header bar of note card */}
                    <div className={`p-3.5 flex items-center justify-between border-b ${pal.border} ${pal.header}`}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${catMeta.color} bg-white/90`}>
                          <IconComp className="w-2.5 h-2.5" />
                          <span>{catMeta.label}</span>
                        </span>
                        {note.date && (
                          <span className="text-[10px] text-slate-500 font-mono truncate">
                            {note.date.split('-').reverse().join('/')}
                          </span>
                        )}
                      </div>

                      {/* Pin Button */}
                      <button
                        onClick={(e) => handleTogglePin(note.id, e)}
                        title={note.isPinned ? 'Bỏ ghim' : 'Ghim ghi chú lên đầu'}
                        className={`p-1 rounded-lg transition-colors cursor-pointer ${
                          note.isPinned
                            ? 'text-amber-600 bg-amber-100 hover:bg-amber-200'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-white/50'
                        }`}
                      >
                        <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-amber-500' : ''}`} />
                      </button>
                    </div>

                    {/* Body */}
                    <div className="p-4 space-y-2">
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">
                        {note.title}
                      </h4>
                      <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto pr-1">
                        {note.content}
                      </div>
                    </div>
                  </div>

                  {/* Footer & Actions */}
                  <div className={`p-3 border-t ${pal.border} bg-white/60 flex items-center justify-between text-xs`}>
                    <div className="text-[11px] text-slate-500 truncate max-w-[120px]">
                      {getEmployeeName(note.employeeId)}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Copy content button */}
                      <button
                        onClick={(e) => handleCopyContent(note, e)}
                        title="Sao chép nội dung"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                      >
                        {copiedNoteId === note.id ? (
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Convert to Task button */}
                      {onConvertNoteToTask && (
                        <button
                          onClick={(e) => handleOpenConvertModal(note, e)}
                          title="Chuyển ghi chú thành Task & chọn nhân viên phụ trách"
                          className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-bold text-[11px]"
                        >
                          <Briefcase className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Tạo Task</span>
                        </button>
                      )}

                      {/* Google Calendar sync link */}
                      <a
                        href={gCalUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Đăng ký ghi chú này vào Google Calendar"
                        className="p-1.5 text-sky-700 hover:text-sky-900 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-bold text-[11px]"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Lịch</span>
                      </a>

                      {/* Edit button */}
                      <button
                        onClick={() => openEditModal(note)}
                        title="Chỉnh sửa ghi chú"
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        title="Xóa ghi chú"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Form Modal / Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <StickyNote className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingNoteId ? 'Chỉnh Sửa Ghi Chú' : 'Tạo Ghi Chú Công Việc Mới'}
                  </h3>
                  <p className="text-xs text-slate-500">Ghi lại thông tin cần nhớ cho bản thân hoặc nhóm</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Template pills */}
            {!editingNoteId && (
              <div className="flex items-center gap-1.5 flex-wrap bg-slate-50 p-2 rounded-xl text-xs">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Mẫu nhanh:
                </span>
                <button
                  type="button"
                  onClick={() => handleInsertQuickTemplate('checklist')}
                  className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-emerald-50 rounded-md text-[11px] font-medium text-slate-700 transition-colors"
                >
                  Checklist Hồ Sơ
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertQuickTemplate('meeting')}
                  className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-sky-50 rounded-md text-[11px] font-medium text-slate-700 transition-colors"
                >
                  Họp Giao Ban
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertQuickTemplate('reminder')}
                  className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-amber-50 rounded-md text-[11px] font-medium text-slate-700 transition-colors"
                >
                  Nhắc Việc Tiền Ăn
                </button>
              </div>
            )}

            <form onSubmit={handleSaveNote} className="space-y-4 text-xs">
              {/* Employee selector (if admin) */}
              {isAdminOrManager && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Nhân sự phụ trách ghi chú:
                  </label>
                  <select
                    value={formEmployeeId}
                    onChange={(e) => setFormEmployeeId(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Tiêu đề ghi chú <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Họp phòng nhân sự, lưu ý hồ sơ ứng viên..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium text-slate-900"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Nội dung chi tiết <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Ghi lại các ý chính, danh sách cần làm, số điện thoại hoặc lưu ý quan trọng..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed text-slate-900"
                />
              </div>

              {/* Category & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Danh mục:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                  >
                    <option value="work">💼 Công việc</option>
                    <option value="meeting">👥 Cuộc họp</option>
                    <option value="reminder">⏰ Nhắc nhở</option>
                    <option value="idea">💡 Ý tưởng</option>
                    <option value="personal">👤 Cá nhân</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Ngày ghi chú:</label>
                  <input
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Color picker & Pin checkbox */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="block text-slate-700 font-bold mb-1 text-[11px]">Màu thẻ:</span>
                  <div className="flex items-center gap-1.5">
                    {(['amber', 'emerald', 'sky', 'rose', 'purple', 'slate'] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNoteColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                          c === 'amber'
                            ? 'bg-amber-300'
                            : c === 'emerald'
                            ? 'bg-emerald-300'
                            : c === 'sky'
                            ? 'bg-sky-300'
                            : c === 'rose'
                            ? 'bg-rose-300'
                            : c === 'purple'
                            ? 'bg-purple-300'
                            : 'bg-slate-300'
                        } ${
                          noteColor === c ? 'scale-115 border-slate-800' : 'border-white hover:scale-105'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-bold">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                  />
                  <Pin className="w-3.5 h-3.5 text-amber-600" />
                  <span>Ghim lên đầu</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  {editingNoteId ? 'Lưu Thay Đổi' : 'Tạo Ghi Chú'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Convert Note to Task Modal (Chọn nhân viên phụ trách & thiết lập Task) */}
      {convertingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Chuyển Ghi Chú Thành Task Công Việc
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chỉ định nhân viên thực hiện, thời hạn và độ ưu tiên
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConvertingNote(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Note Summary Preview */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Nội dung từ Ghi chú:
              </div>
              <div className="text-sm font-bold text-slate-900 line-clamp-1">
                {convertingNote.title}
              </div>
              {convertingNote.content && (
                <div className="text-xs text-slate-600 line-clamp-2 italic">
                  {convertingNote.content}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Target Employee Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Giao việc cho nhân viên nào? <span className="text-rose-500">*</span></span>
                </label>
                <select
                  value={convertTargetEmployeeId}
                  onChange={(e) => setConvertTargetEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.id}) — {emp.role === 'admin' ? 'Quản trị viên' : emp.role === 'quan_ly_nhan_su' ? 'Quản lý' : 'Nhân viên'}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Nhân viên được chọn sẽ nhận nhiệm vụ này trong danh sách Task và bảng lịch làm việc.
                </p>
              </div>

              {/* Due Date & Priority in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Due Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Hạn chót hoàn thành</span>
                  </label>
                  <input
                    type="date"
                    value={convertDueDate}
                    onChange={(e) => setConvertDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono transition-all"
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-slate-500" />
                    <span>Mức độ ưu tiên</span>
                  </label>
                  <select
                    value={convertPriority}
                    onChange={(e) => setConvertPriority(e.target.value as Task['priority'])}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold cursor-pointer"
                  >
                    <option value="urgent">Khẩn cấp (Urgent)</option>
                    <option value="high">Cao (High)</option>
                    <option value="medium">Trung bình (Normal)</option>
                    <option value="low">Thấp (Low)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConvertingNote(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium text-xs cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmConvert}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Xác Nhận Tạo Task & Chuyển Sang Lịch</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
