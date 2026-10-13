import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  User,
  Sliders,
  Edit,
  Trash2,
  ExternalLink,
  CalendarPlus,
  MessageSquare,
  Mail,
  Share2,
  Flag,
  ArrowRight,
  Check,
  Eye,
} from 'lucide-react';
import { Task, Employee } from '../types';

interface TaskCalendarViewProps {
  tasks: Task[];
  employees: Employee[];
  selectedMonth: string; // 'YYYY-MM' or 'all'
  onSelectMonth: (month: string) => void;
  onOpenAddModal: (status?: Task['status'], employeeId?: string, dueDate?: string) => void;
  onOpenEditModal: (task: Task) => void;
  onOpenProgressModal: (task: Task) => void;
  onQuickStatusChange: (task: Task, newStatus: Task['status']) => void;
  onDeleteTask: (id: string, title: string) => void;
  onOpenZaloChat: (task: Task) => void;
  onOpenEmail: (task: Task) => void;
  onSyncTaskToCalendar: (task: Task) => void;
  onOpenNotificationModal: (task: Task) => void;
  onViewDetail?: (task: Task) => void;
  getEmployee: (id: string) => Employee | undefined;
  getPriorityBadge: (p?: Task['priority']) => React.ReactNode;
  getDueBadge: (dueDate: string, isCompleted: boolean) => React.ReactNode;
}

// Vietnamese Day Names: Thứ 2 (Mon) -> Chủ nhật (Sun)
const WEEK_DAYS = [
  { key: 1, short: 'T2', name: 'Thứ Hai', en: 'Monday' },
  { key: 2, short: 'T3', name: 'Thứ Ba', en: 'Tuesday' },
  { key: 3, short: 'T4', name: 'Thứ Tư', en: 'Wednesday' },
  { key: 4, short: 'T5', name: 'Thứ Năm', en: 'Thursday' },
  { key: 5, short: 'T6', name: 'Thứ Sáu', en: 'Friday' },
  { key: 6, short: 'T7', name: 'Thứ Bảy', en: 'Saturday' },
  { key: 0, short: 'CN', name: 'Chủ Nhật', en: 'Sunday' },
];

export const TaskCalendarView: React.FC<TaskCalendarViewProps> = ({
  tasks,
  employees,
  selectedMonth,
  onSelectMonth,
  onOpenAddModal,
  onOpenEditModal,
  onOpenProgressModal,
  onQuickStatusChange,
  onDeleteTask,
  onOpenZaloChat,
  onOpenEmail,
  onSyncTaskToCalendar,
  onOpenNotificationModal,
  onViewDetail,
  getEmployee,
  getPriorityBadge,
  getDueBadge,
}) => {
  // Sub-mode: 'month' (lịch tháng Thứ 2 - CN) or 'week' (lịch tuần Thứ 2 - CN)
  const [calendarSubMode, setCalendarSubMode] = useState<'month' | 'week'>('month');

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Selected date for day drawer/modal or highlight
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Toggle viewing only selected date vs all tasks in the month
  const [showAllMonthTasks, setShowAllMonthTasks] = useState(false);

  // Reference date for navigation
  const [anchorDate, setAnchorDate] = useState<Date>(() => {
    if (selectedMonth && selectedMonth !== 'all') {
      const [y, m] = selectedMonth.split('-').map(Number);
      return new Date(y, m - 1, 7);
    }
    return new Date();
  });

  // Keep anchor in sync if user changes month outside
  React.useEffect(() => {
    if (selectedMonth && selectedMonth !== 'all') {
      const [y, m] = selectedMonth.split('-').map(Number);
      setAnchorDate(new Date(y, m - 1, 7));
    }
  }, [selectedMonth]);

  // If a new task was added or tasks changed, auto-select its date if it exists
  React.useEffect(() => {
    if (tasks.length > 0) {
      const latestTask = tasks[0];
      if (latestTask?.dueDate && latestTask.dueDate !== selectedDate) {
        setSelectedDate(latestTask.dueDate);
      }
    }
  }, [tasks.length]);

  // Format YYYY-MM-DD
  const formatYMD = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const currentYear = anchorDate.getFullYear();
  const currentMonthIdx = anchorDate.getMonth(); // 0 - 11
  const displayMonthStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;

  // Navigation handlers
  const handlePrev = () => {
    if (calendarSubMode === 'month') {
      const newD = new Date(currentYear, currentMonthIdx - 1, 1);
      setAnchorDate(newD);
      onSelectMonth(`${newD.getFullYear()}-${String(newD.getMonth() + 1).padStart(2, '0')}`);
    } else {
      const newD = new Date(anchorDate);
      newD.setDate(newD.getDate() - 7);
      setAnchorDate(newD);
    }
  };

  const handleNext = () => {
    if (calendarSubMode === 'month') {
      const newD = new Date(currentYear, currentMonthIdx + 1, 1);
      setAnchorDate(newD);
      onSelectMonth(`${newD.getFullYear()}-${String(newD.getMonth() + 1).padStart(2, '0')}`);
    } else {
      const newD = new Date(anchorDate);
      newD.setDate(newD.getDate() + 7);
      setAnchorDate(newD);
    }
  };

  const handleGoToday = () => {
    const t = new Date('2026-10-07');
    setAnchorDate(t);
    setSelectedDate(todayStr);
    onSelectMonth('2026-10');
  };

  // Build Month Calendar Matrix (Thứ 2 đến Chủ nhật)
  const monthDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonthIdx, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonthIdx + 1, 0);
    const totalDaysInMonth = lastDayOfMonth.getDate();

    // In JS: 0=Sun, 1=Mon, ..., 6=Sat
    // We want Monday (1) to be column 0, and Sunday (0) to be column 6
    const firstDayDayOfWeek = firstDayOfMonth.getDay();
    const leadingEmpty = (firstDayDayOfWeek + 6) % 7; // Monday -> 0, Sunday -> 6

    const cells: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      dayOfWeek: number; // 0=Sun, 1=Mon...
    }[] = [];

    // Previous month trailing days
    const prevMonthLastDate = new Date(currentYear, currentMonthIdx, 0).getDate();
    for (let i = leadingEmpty - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDate - i;
      const d = new Date(currentYear, currentMonthIdx - 1, dayNum);
      const str = formatYMD(d);
      cells.push({
        dateStr: str,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: str === todayStr,
        dayOfWeek: d.getDay(),
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const d = new Date(currentYear, currentMonthIdx, dayNum);
      const str = formatYMD(d);
      cells.push({
        dateStr: str,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: str === todayStr,
        dayOfWeek: d.getDay(),
      });
    }

    // Trailing days to fill 5 or 6 weeks (multiples of 7)
    const trailingCount = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= trailingCount; i++) {
      const d = new Date(currentYear, currentMonthIdx + 1, i);
      const str = formatYMD(d);
      cells.push({
        dateStr: str,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: str === todayStr,
        dayOfWeek: d.getDay(),
      });
    }

    return cells;
  }, [currentYear, currentMonthIdx]);

  // Build Week Calendar (Monday to Sunday)
  const weekDays = useMemo(() => {
    const current = new Date(anchorDate);
    const dayOfWeek = current.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(current);
    monday.setDate(current.getDate() - diffToMonday);

    const days: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      dayOfWeek: number;
      dayName: string;
      dateObj: Date;
    }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const str = formatYMD(d);
      const dow = d.getDay();
      const labelObj = WEEK_DAYS.find((w) => w.key === dow);
      days.push({
        dateStr: str,
        dayNumber: d.getDate(),
        isCurrentMonth: d.getMonth() === currentMonthIdx,
        isToday: str === todayStr,
        dayOfWeek: dow,
        dayName: labelObj?.name || `Thứ ${dow + 1}`,
        dateObj: d,
      });
    }
    return days;
  }, [anchorDate, currentMonthIdx]);

  // Group tasks by date string (YYYY-MM-DD)
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((t) => {
      const dateKey = t.dueDate ? t.dueDate.slice(0, 10) : '';
      if (dateKey) {
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(t);
      }
    });
    return map;
  }, [tasks]);

  // Tasks on selected date for preview panel
  const selectedDateTasks = useMemo(() => {
    return tasksByDate.get(selectedDate) || [];
  }, [tasksByDate, selectedDate]);

  // All tasks in the visible month
  const inMonthTasks = useMemo(() => {
    return tasks.filter((t) => t.dueDate && t.dueDate.startsWith(displayMonthStr));
  }, [tasks, displayMonthStr]);

  const displayedTasks = showAllMonthTasks ? inMonthTasks : selectedDateTasks;

  // Statistics for the currently visible month
  const visibleMonthStats = useMemo(() => {
    const total = inMonthTasks.length;
    const pending = inMonthTasks.filter((t) => t.status === 'pending').length;
    const inProgress = inMonthTasks.filter((t) => t.status === 'in-progress').length;
    const completed = inMonthTasks.filter((t) => t.status === 'completed').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, pending, inProgress, completed, rate };
  }, [inMonthTasks]);

  return (
    <div className="space-y-4">
      {/* 1. Header Toolbar of Calendar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-2xs shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {calendarSubMode === 'month'
                  ? `Lịch Công Việc Tháng ${String(currentMonthIdx + 1).padStart(2, '0')}/${currentYear}`
                  : `Lịch Tuần (${weekDays[0].dayNumber}/${weekDays[0].dateObj.getMonth() + 1} - ${weekDays[6].dayNumber}/${weekDays[6].dateObj.getMonth() + 1}/${currentYear})`}
              </h3>
              <span className="hidden sm:inline-block bg-emerald-50 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                {visibleMonthStats.total} việc trong tháng
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Bảng lịch làm việc từ Thứ 2 đến Chủ nhật, click vào ô ngày để giao việc hoặc xem chi tiết
            </p>
          </div>
        </div>

        {/* Calendar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Submode Switcher: Tháng vs Tuần */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setCalendarSubMode('month')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                calendarSubMode === 'month'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lịch Tháng
            </button>
            <button
              type="button"
              onClick={() => setCalendarSubMode('week')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                calendarSubMode === 'week'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lịch Tuần (T2 - CN)
            </button>
          </div>

          {/* Prev / Today / Next buttons */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={handlePrev}
              title="Khoảng thời gian trước"
              className="p-1.5 hover:bg-white text-slate-700 hover:text-emerald-700 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleGoToday}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
            >
              Hôm Nay
            </button>
            <button
              type="button"
              onClick={handleNext}
              title="Khoảng thời gian tiếp theo"
              className="p-1.5 hover:bg-white text-slate-700 hover:text-emerald-700 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Create Task button on current selected date */}
          <button
            type="button"
            onClick={() => onOpenAddModal('pending', undefined, selectedDate)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm việc ngày {selectedDate.split('-').reverse().join('/')}</span>
          </button>
        </div>
      </div>

      {/* Mini Summary of Statuses for the calendar view */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Tổng việc tháng</div>
            <div className="text-lg font-extrabold text-slate-900">{visibleMonthStats.total}</div>
          </div>
          <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
            📋
          </span>
        </div>
        <div className="bg-amber-50/60 border border-amber-200/90 rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-amber-800 font-medium">Chưa triển khai</div>
            <div className="text-lg font-extrabold text-amber-900">{visibleMonthStats.pending}</div>
          </div>
          <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">
            🟡
          </span>
        </div>
        <div className="bg-sky-50/60 border border-sky-200/90 rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-sky-800 font-medium">Đang triển khai</div>
            <div className="text-lg font-extrabold text-sky-900">{visibleMonthStats.inProgress}</div>
          </div>
          <span className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-xs">
            🔵
          </span>
        </div>
        <div className="bg-emerald-50/60 border border-emerald-200/90 rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-emerald-800 font-medium">Đã hoàn thành</div>
            <div className="text-lg font-extrabold text-emerald-900">{visibleMonthStats.completed}</div>
          </div>
          <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
            🟢
          </span>
        </div>
      </div>

      {/* 2. CALENDAR BOARD (Thứ 2 đến Chủ nhật) */}
      {calendarSubMode === 'month' ? (
        /* ==================== A. LỊCH THÁNG (MONTH CALENDAR) ==================== */
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          {/* Day of Week Header: Thứ Hai -> Chủ Nhật */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/90 text-center text-xs font-bold text-slate-700">
            {WEEK_DAYS.map((wd) => {
              const isSunday = wd.key === 0;
              const isSaturday = wd.key === 6;
              return (
                <div
                  key={wd.key}
                  className={`py-3 px-1 border-r last:border-r-0 border-slate-200 flex flex-col items-center ${
                    isSunday ? 'text-rose-600 bg-rose-50/30' : isSaturday ? 'text-sky-700 bg-sky-50/20' : ''
                  }`}
                >
                  <span className="font-extrabold text-xs uppercase tracking-wider">{wd.name}</span>
                  <span className="text-[10px] text-slate-400 font-normal">({wd.short})</span>
                </div>
              );
            })}
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200 bg-slate-200">
            {monthDays.map((cell) => {
              const dayTasks = tasksByDate.get(cell.dateStr) || [];
              const isSelected = selectedDate === cell.dateStr;
              const isSunday = cell.dayOfWeek === 0;
              const isSaturday = cell.dayOfWeek === 6;

              const pendingCount = dayTasks.filter((t) => t.status === 'pending').length;
              const inProgressCount = dayTasks.filter((t) => t.status === 'in-progress').length;
              const completedCount = dayTasks.filter((t) => t.status === 'completed').length;

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className={`min-h-[120px] sm:min-h-[140px] p-1.5 sm:p-2 bg-white flex flex-col justify-between transition-colors cursor-pointer group hover:bg-emerald-50/30 ${
                    !cell.isCurrentMonth ? 'bg-slate-50/70 text-slate-400 opacity-60' : ''
                  } ${
                    isSelected ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-50/20' : ''
                  } ${
                    cell.isToday ? 'bg-amber-50/30' : ''
                  }`}
                >
                  {/* Top Bar of Day Cell: Day Number & Add Task Quick Button */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-xs sm:text-sm font-extrabold w-6 h-6 rounded-full flex items-center justify-center ${
                          cell.isToday
                            ? 'bg-emerald-600 text-white font-black shadow-2xs'
                            : isSelected
                            ? 'bg-slate-900 text-white'
                            : isSunday
                            ? 'text-rose-600'
                            : isSaturday
                            ? 'text-sky-700'
                            : 'text-slate-800'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {cell.isToday && (
                        <span className="hidden sm:inline-block text-[9px] font-extrabold text-emerald-700 uppercase bg-emerald-100 px-1 rounded">
                          Hôm nay
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate(cell.dateStr);
                        onOpenAddModal('pending', undefined, cell.dateStr);
                      }}
                      title={`Thêm công việc vào ngày ${cell.dateStr}`}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-100 rounded-md transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Tasks List inside Day Cell */}
                  <div className="space-y-1 my-1.5 flex-1 overflow-hidden">
                    {dayTasks.slice(0, 3).map((task) => {
                      const assignee = getEmployee(task.employeeId);
                      const isCompleted = task.status === 'completed';
                      const isInProgress = task.status === 'in-progress';

                      const dotBg = isCompleted
                        ? 'bg-emerald-500'
                        : isInProgress
                        ? 'bg-sky-500'
                        : 'bg-amber-500';

                      const badgeBg = isCompleted
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : isInProgress
                        ? 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
                        : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100';

                      return (
                        <div
                          key={task.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(cell.dateStr);
                            if (onViewDetail) onViewDetail(task);
                            else onOpenProgressModal(task);
                          }}
                          title={`[${task.status === 'completed' ? 'Đã xong' : task.status === 'in-progress' ? 'Đang làm' : 'Chưa làm'}] ${task.title} - Phụ trách: ${assignee?.name || 'Nhân sự'} (Bấm để xem chi tiết)`}
                          className={`px-1.5 py-1 rounded text-[10px] font-semibold border truncate flex items-center justify-between gap-1 transition-all cursor-pointer ${badgeBg}`}
                        >
                          <div className="flex items-center gap-1 truncate">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotBg}`} />
                            <span className="truncate">{task.title}</span>
                          </div>
                          {task.progress !== undefined && (
                            <span className="text-[9px] font-mono shrink-0 opacity-70">
                              {task.progress}%
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {dayTasks.length > 3 && (
                      <div className="text-[10px] text-slate-500 font-bold px-1 hover:text-emerald-700">
                        + {dayTasks.length - 3} việc nữa...
                      </div>
                    )}
                  </div>

                  {/* Bottom Counter Pill */}
                  <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                    {dayTasks.length > 0 ? (
                      <div className="flex items-center gap-1 font-bold">
                        {completedCount > 0 && (
                          <span className="text-emerald-700">{completedCount} xong</span>
                        )}
                        {inProgressCount > 0 && (
                          <span className="text-sky-700">{inProgressCount} đang làm</span>
                        )}
                        {pendingCount > 0 && (
                          <span className="text-amber-700">{pendingCount} chờ</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300">Không có việc</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ==================== B. LỊCH TUẦN (WEEK CALENDAR T2 -> CN) ==================== */
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            {weekDays.map((col) => {
              const dayTasks = tasksByDate.get(col.dateStr) || [];
              const isSelected = selectedDate === col.dateStr;
              const isSunday = col.dayOfWeek === 0;
              const isSaturday = col.dayOfWeek === 6;

              return (
                <div
                  key={col.dateStr}
                  onClick={() => setSelectedDate(col.dateStr)}
                  className={`min-h-[420px] flex flex-col bg-white transition-all cursor-pointer ${
                    isSelected ? 'bg-emerald-50/20 ring-1 ring-emerald-500 ring-inset' : ''
                  }`}
                >
                  {/* Column Header */}
                  <div
                    className={`p-3 border-b border-slate-200 flex items-center justify-between ${
                      col.isToday
                        ? 'bg-amber-50 text-amber-900 font-black'
                        : isSunday
                        ? 'bg-rose-50/40 text-rose-800'
                        : isSaturday
                        ? 'bg-sky-50/40 text-sky-800'
                        : 'bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{col.dayName}</div>
                      <div className="text-xs font-extrabold flex items-center gap-1">
                        <span>{col.dayNumber}</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          / Thg {col.dateObj.getMonth() + 1}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200 font-mono">
                        {dayTasks.length}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(col.dateStr);
                          onOpenAddModal('pending', undefined, col.dateStr);
                        }}
                        title={`Thêm công việc vào ${col.dayName}`}
                        className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-white rounded-md cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Tasks in Day Column */}
                  <div className="p-2 space-y-2.5 flex-1 overflow-y-auto max-h-[620px]">
                    {dayTasks.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl my-2">
                        Không có việc
                      </div>
                    ) : (
                      dayTasks.map((task) => {
                        const assignee = getEmployee(task.employeeId);
                        const isCompleted = task.status === 'completed';
                        const isInProgress = task.status === 'in-progress';

                        return (
                          <div
                            key={task.id}
                            className={`p-2.5 rounded-xl border text-xs shadow-2xs space-y-2 transition-all hover:shadow-xs ${
                              isCompleted
                                ? 'bg-emerald-50/40 border-emerald-200'
                                : isInProgress
                                ? 'bg-sky-50/40 border-sky-200'
                                : 'bg-amber-50/40 border-amber-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div>{getPriorityBadge(task.priority)}</div>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                  isCompleted
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isInProgress
                                    ? 'bg-sky-100 text-sky-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {isCompleted ? '100%' : `${task.progress ?? 0}%`}
                              </span>
                            </div>

                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onViewDetail) onViewDetail(task);
                                else onOpenProgressModal(task);
                              }}
                              className="font-bold text-slate-900 text-xs leading-snug cursor-pointer hover:text-emerald-700"
                              title="Bấm để xem chi tiết công việc"
                            >
                              {task.title}
                            </div>

                            {task.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-2">
                                {task.description}
                              </p>
                            )}

                            {/* Assignee */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                              <div className="flex items-center gap-1">
                                <div
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${
                                    assignee?.avatarColor || 'bg-emerald-600'
                                  }`}
                                >
                                  {assignee?.name.split(' ').pop()?.charAt(0) || 'NV'}
                                </div>
                                <span className="font-semibold text-slate-700 truncate max-w-[80px]">
                                  {assignee?.name || task.employeeId}
                                </span>
                              </div>

                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenZaloChat(task);
                                  }}
                                  title="Gửi Zalo"
                                  className="p-1 text-sky-600 hover:bg-sky-100 rounded cursor-pointer"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenEmail(task);
                                  }}
                                  title="Gửi Email"
                                  className="p-1 text-emerald-600 hover:bg-emerald-100 rounded cursor-pointer"
                                >
                                  <Mail className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenEditModal(task);
                                  }}
                                  title="Sửa công việc"
                                  className="p-1 text-slate-500 hover:bg-slate-200 rounded cursor-pointer"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. SELECTED DAY DETAIL PANEL (Thanh Chi Tiết Ngày Đang Chọn / Toàn Tháng) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {showAllMonthTasks ? 'TH' : (selectedDate.split('-')[2] || '01')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm sm:text-base font-bold text-slate-900">
                  {showAllMonthTasks
                    ? `Toàn Bộ Công Việc Trong Tháng ${displayMonthStr.split('-')[1]}/${displayMonthStr.split('-')[0]}`
                    : `Danh Sách Công Việc Trong Ngày: ${selectedDate.split('-').reverse().join('/')}`}
                </h4>
                {!showAllMonthTasks && selectedDate === todayStr && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-amber-200">
                    Hôm nay
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Có tổng cộng <strong>{displayedTasks.length}</strong> công việc{' '}
                {showAllMonthTasks
                  ? `trong tháng ${displayMonthStr.split('-')[1]}/${displayMonthStr.split('-')[0]}`
                  : `có hạn hoàn thành hoặc lịch hẹn trong ngày này`}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* View Switcher: Day vs Full Month */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setShowAllMonthTasks(false)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  !showAllMonthTasks
                    ? 'bg-white text-slate-900 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ngày {selectedDate.split('-').reverse().join('/')} ({selectedDateTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setShowAllMonthTasks(true)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  showAllMonthTasks
                    ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cả tháng ({inMonthTasks.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => onOpenAddModal('pending', undefined, selectedDate)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Giao việc mới</span>
            </button>
          </div>
        </div>

        {displayedTasks.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-3">
            <Calendar className="w-8 h-8 mx-auto text-slate-300" />
            <div className="text-xs font-bold text-slate-600">
              {showAllMonthTasks
                ? `Chưa có công việc nào trong tháng ${displayMonthStr.split('-')[1]}/${displayMonthStr.split('-')[0]}`
                : `Chưa có công việc nào có hạn chót vào ngày ${selectedDate.split('-').reverse().join('/')}`}
            </div>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Bấm nút &quot;Giao việc mới&quot; để thêm nhiệm vụ cho nhân viên hoặc xem các ngày khác trên lịch.
            </p>
            {!showAllMonthTasks && inMonthTasks.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAllMonthTasks(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                👉 Xem toàn bộ {inMonthTasks.length} công việc trong tháng này
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedTasks.map((task) => {
              const assignee = getEmployee(task.employeeId);
              const isCompleted = task.status === 'completed';
              const isInProgress = task.status === 'in-progress';

              return (
                <div
                  key={task.id}
                  className={`p-3.5 rounded-xl border shadow-2xs space-y-3 flex flex-col justify-between ${
                    isCompleted
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : isInProgress
                      ? 'bg-sky-50/40 border-sky-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <div>{getPriorityBadge(task.priority)}</div>
                      <div>{getDueBadge(task.dueDate, isCompleted)}</div>
                    </div>

                    <h5
                      onClick={() => onViewDetail && onViewDetail(task)}
                      className="font-bold text-slate-900 text-xs leading-snug cursor-pointer hover:text-emerald-700 transition-colors"
                      title="Bấm để xem chi tiết công việc"
                    >
                      {task.title}
                    </h5>

                    {task.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {task.resultNote && (
                      <div className="p-2 bg-emerald-50 rounded-lg text-[10px] text-emerald-900 border border-emerald-200">
                        <strong>Báo cáo kết quả:</strong> {task.resultNote}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                    {/* Assignee & Contacts */}
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${
                            assignee?.avatarColor || 'bg-emerald-600'
                          }`}
                        >
                          {assignee?.name.split(' ').pop()?.charAt(0) || 'NV'}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block truncate max-w-[120px]">
                            {assignee?.name || task.employeeId}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-mono">
                            {assignee?.department || 'HR'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenZaloChat(task)}
                          title="Gửi Zalo"
                          className="p-1 text-sky-600 hover:bg-sky-50 rounded cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenEmail(task)}
                          title="Gửi Email"
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                        {task.googleCalendarLink ? (
                          <a
                            href={task.googleCalendarLink}
                            target="_blank"
                            rel="noreferrer"
                            title="Mở Google Calendar"
                            className="p-1 text-sky-700 hover:bg-sky-50 rounded cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSyncTaskToCalendar(task)}
                            title="Đồng bộ lên Google Calendar"
                            className="p-1 text-slate-400 hover:text-sky-700 rounded cursor-pointer"
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenNotificationModal(task)}
                          title="Menu thông báo"
                          className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Quick 3 Status Selector */}
                    <div className="grid grid-cols-3 gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => onQuickStatusChange(task, 'pending')}
                        className={`py-1 px-1 rounded text-[10px] font-bold text-center cursor-pointer ${
                          task.status === 'pending'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        🟡 Chưa làm
                      </button>
                      <button
                        type="button"
                        onClick={() => onQuickStatusChange(task, 'in-progress')}
                        className={`py-1 px-1 rounded text-[10px] font-bold text-center cursor-pointer ${
                          task.status === 'in-progress'
                            ? 'bg-sky-100 text-sky-900 border border-sky-300'
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        🔵 Đang làm
                      </button>
                      <button
                        type="button"
                        onClick={() => onQuickStatusChange(task, 'completed')}
                        className={`py-1 px-1 rounded text-[10px] font-bold text-center cursor-pointer ${
                          task.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        🟢 Đã xong
                      </button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        {onViewDetail && (
                          <button
                            type="button"
                            onClick={() => onViewDetail(task)}
                            className="text-slate-700 hover:text-emerald-700 font-bold flex items-center gap-1 text-[11px] cursor-pointer bg-slate-100 hover:bg-emerald-50 px-2 py-0.5 rounded transition-colors"
                            title="Xem đầy đủ chi tiết công việc"
                          >
                            <Eye className="w-3 h-3 text-emerald-600" />
                            <span>Chi tiết</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenProgressModal(task)}
                          className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>Điền kết quả</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenEditModal(task)}
                          title="Sửa"
                          className="p-1 text-slate-400 hover:text-slate-800 rounded cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTask(task.id, task.title)}
                          title="Xóa"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
