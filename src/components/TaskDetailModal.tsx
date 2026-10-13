import React from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Mail,
  Edit,
  ExternalLink,
  CalendarPlus,
  Building2,
  FileText,
  CheckCheck,
  Send,
  Flag,
  Share2,
} from 'lucide-react';
import { Task, Employee } from '../types';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  assignee?: Employee;
  assigner?: Employee;
  onEdit?: (task: Task) => void;
  onProgressClick?: (task: Task) => void;
  onStatusChange?: (task: Task, newStatus: Task['status']) => void;
  onZaloClick?: (task: Task) => void;
  onEmailClick?: (task: Task) => void;
  onCalendarSync?: (task: Task) => void;
  getDueBadge: (dueDate: string, isCompleted: boolean) => React.ReactNode;
  getPriorityBadge: (priority?: Task['priority']) => React.ReactNode;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  assignee,
  assigner,
  onEdit,
  onProgressClick,
  onStatusChange,
  onZaloClick,
  onEmailClick,
  onCalendarSync,
  getDueBadge,
  getPriorityBadge,
}) => {
  if (!isOpen || !task) return null;

  const isCompleted = task.status === 'completed';
  const isInProgress = task.status === 'in-progress';
  const isPending = task.status === 'pending';

  const cleanPhoneForZalo = (phone?: string) => {
    if (!phone) return '';
    const clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) return '84' + clean.slice(1);
    return clean;
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Chưa ghi nhận';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* 1. Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/70">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-sm ${
                isCompleted
                  ? 'bg-emerald-600'
                  : isInProgress
                  ? 'bg-sky-600'
                  : 'bg-amber-600'
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : isInProgress ? (
                <Clock className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-1 text-[11px]">
                <span className="font-mono text-slate-400">ID: {task.id}</span>
                <span className="text-slate-300">•</span>
                <div>{getPriorityBadge(task.priority)}</div>
                <span className="text-slate-300">•</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                    isCompleted
                      ? 'bg-emerald-100 text-emerald-800'
                      : isInProgress
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isCompleted
                    ? 'Đã hoàn thành'
                    : isInProgress
                    ? 'Đang triển khai'
                    : 'Chưa triển khai'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {task.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Đóng chi tiết"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Scrollable Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* Progress bar */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Tiến độ thực hiện hiện tại:</span>
              </span>
              <span
                className={`font-mono font-extrabold text-sm ${
                  isCompleted
                    ? 'text-emerald-700'
                    : isInProgress
                    ? 'text-sky-700'
                    : 'text-amber-700'
                }`}
              >
                {task.progress ?? (isCompleted ? 100 : 0)}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  isCompleted
                    ? 'bg-emerald-500'
                    : isInProgress
                    ? 'bg-sky-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${task.progress ?? (isCompleted ? 100 : 0)}%` }}
              />
            </div>

            {/* Quick status change buttons */}
            {onStatusChange && (
              <div className="pt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-200/60 text-[11px]">
                <span className="text-slate-500 font-semibold mr-1">Chuyển trạng thái:</span>
                <button
                  type="button"
                  onClick={() => onStatusChange(task, 'pending')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    isPending
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Chưa làm
                </button>
                <button
                  type="button"
                  onClick={() => onStatusChange(task, 'in-progress')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    isInProgress
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Đang làm
                </button>
                <button
                  type="button"
                  onClick={() => onStatusChange(task, 'completed')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    isCompleted
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Hoàn thành 100%
                </button>
              </div>
            )}
          </div>

          {/* Detailed Description */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Nội dung chi tiết nhiệm vụ:</span>
            </h4>
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 text-slate-800 text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap select-text">
              {task.description ? task.description : (
                <span className="italic text-slate-400">Không có mô tả chi tiết kèm theo.</span>
              )}
            </div>
          </div>

          {/* Result Note if available */}
          {task.resultNote && (
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1.5">
              <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                <span>Báo Cáo Kết Quả Thực Hiện / Sản Phẩm Bàn Giao:</span>
              </div>
              <div className="text-xs sm:text-[13px] text-emerald-950 font-medium whitespace-pre-wrap leading-relaxed select-text">
                {task.resultNote}
              </div>
            </div>
          )}

          {/* People & Contact Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Assignee Card */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3 text-emerald-600" />
                <span>Nhân viên nhận việc (Assignee)</span>
              </div>

              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                    assignee?.avatarColor || 'bg-emerald-600'
                  }`}
                >
                  {assignee?.name.split(' ').pop()?.charAt(0) || 'NV'}
                </div>
                <div className="truncate">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                    {assignee?.name || task.employeeId}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Mã: {task.employeeId} • {assignee?.department || 'HR Group'}
                  </div>
                </div>
              </div>

              {/* Direct Communication Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                {assignee?.phone ? (
                  <a
                    href={`https://zalo.me/${cleanPhoneForZalo(assignee.phone)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-1.5 px-2 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors border border-sky-200"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Zalo: {assignee.phone}</span>
                  </a>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Chưa có số Zalo</span>
                )}

                {assignee?.email && (
                  <a
                    href={`mailto:${assignee.email}`}
                    className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors border border-emerald-200 truncate"
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Email</span>
                  </a>
                )}
              </div>
            </div>

            {/* Assigner & Timeline Card */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Send className="w-3 h-3 text-slate-500" />
                <span>Người giao việc & Mốc thời gian</span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Người giao:</span>
                  <span className="font-bold text-slate-800">
                    {assigner?.name || (task.assignedBy === 'admin' ? 'Quản trị viên (Admin)' : task.assignedBy)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Hạn chót:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold font-mono text-slate-900">
                      {task.dueDate.split('-').reverse().join('/')}
                    </span>
                    <div>{getDueBadge(task.dueDate, isCompleted)}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Thời điểm tạo:</span>
                  <span className="font-mono text-slate-600">{formatDate(task.createdAt)}</span>
                </div>

                {task.completedAt && (
                  <div className="flex items-center justify-between text-emerald-700">
                    <span className="font-semibold">Hoàn thành lúc:</span>
                    <span className="font-mono font-bold">{formatDate(task.completedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Google Calendar Link Card if synced */}
          {task.googleCalendarLink && (
            <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-sky-600" />
                <span className="font-semibold text-sky-900">
                  Đã đăng ký sự kiện nhắc việc trên Google Calendar
                </span>
              </div>
              <a
                href={task.googleCalendarLink}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 bg-white hover:bg-sky-100 text-sky-700 rounded-lg font-bold border border-sky-300 flex items-center gap-1 shrink-0"
              >
                <span>Xem trên Calendar</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* 3. Footer Action Buttons */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {onProgressClick && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onProgressClick(task);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Cập Nhật Tiến Độ & Kết Quả</span>
              </button>
            )}

            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(task);
                }}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Edit className="w-3.5 h-3.5 text-slate-500" />
                <span>Chỉnh Sửa</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onZaloClick && (
              <button
                type="button"
                onClick={() => onZaloClick(task)}
                className="px-3 py-2 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                <span>Zalo</span>
              </button>
            )}

            {onEmailClick && (
              <button
                type="button"
                onClick={() => onEmailClick(task)}
                className="px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                <span>Email</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
