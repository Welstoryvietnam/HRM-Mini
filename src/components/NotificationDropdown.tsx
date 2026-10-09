import React from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Target,
  User,
  ExternalLink,
  Mail,
  Trash2,
  Check,
  X,
  AlertCircle,
  Building2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { AppNotification, AuthUser, Employee } from '../types';

interface NotificationDropdownProps {
  notifications: AppNotification[];
  currentUser: AuthUser | null;
  employees: Employee[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onNavigateToTarget?: (type: 'task' | 'mbo', targetId: string) => void;
  onOpenSendEmailModal?: (notification: AppNotification) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  currentUser,
  employees,
  isOpen,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onNavigateToTarget,
  onOpenSendEmailModal,
}) => {
  if (!isOpen) return null;

  const currentUserId = currentUser?.id || '';
  const isAdminOrManager =
    currentUser?.role === 'admin' || currentUser?.role === 'quan_ly_nhan_su';

  // Filter notifications visible to this user
  const visibleNotifications = notifications.filter((notif) => {
    // If Admin/Manager, they see all updates from employees
    if (isAdminOrManager) return true;
    // If regular employee, they see notifications targeted to them or system updates
    return notif.employeeId === currentUserId;
  });

  const unreadCount = visibleNotifications.filter(
    (n) => !n.readBy.includes(currentUserId)
  ).length;

  const getNotificationIcon = (type: AppNotification['type'], newStatus?: string) => {
    if (type === 'task_result' || newStatus === 'completed') {
      return (
        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4 h-4" />
        </div>
      );
    }
    if (type === 'task_progress' || newStatus === 'in-progress') {
      return (
        <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4" />
        </div>
      );
    }
    if (type.startsWith('mbo')) {
      return (
        <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
          <Target className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
        <Bell className="w-4 h-4" />
      </div>
    );
  };

  const formatTimeAgo = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      const now = new Date('2026-10-08T14:30:00Z');
      const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

      if (diffMinutes < 1) return 'Vừa xong';
      if (diffMinutes < 60) return `${diffMinutes} phút trước`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays <= 7) return `${diffDays} ngày trước`;
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed sm:absolute right-3 sm:right-0 top-16 sm:top-full mt-2 w-[calc(100vw-24px)] sm:w-[460px] max-w-[480px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="p-3.5 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/10 rounded-xl backdrop-blur-xs">
            <Bell className="w-4 h-4 text-emerald-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-tight">Thông Báo Cập Nhật</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 text-[10px] font-extrabold rounded-full">
                  {unreadCount} mới
                </span>
              )}
            </div>
            <p className="text-[11px] text-emerald-100/90 leading-none mt-0.5">
              Cảnh báo tiến độ & kết quả từ nhân viên gửi Ban quản lý
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              title="Đánh dấu tất cả đã đọc"
              className="p-1.5 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Action Sub-bar */}
      <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
        <span className="font-semibold text-[11px]">
          {visibleNotifications.length} thông báo trong hệ thống
        </span>
        <div className="flex items-center gap-3">
          {visibleNotifications.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[11px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Xóa tất cả</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-[440px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        {visibleNotifications.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Bell className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Chưa có thông báo nào
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Khi nhân viên cập nhật tiến độ công việc hoặc báo cáo kết quả, thông báo tự động sẽ hiển thị ngay tại đây.
            </p>
          </div>
        ) : (
          visibleNotifications.map((notif) => {
            const isRead = notif.readBy.includes(currentUserId);
            const isCompleted = notif.newStatus === 'completed' || (notif.progress ?? 0) >= 100;

            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (!isRead) onMarkAsRead(notif.id);
                }}
                className={`p-3.5 transition-all text-xs flex gap-3 cursor-pointer ${
                  isRead
                    ? 'bg-white dark:bg-slate-900 opacity-80 hover:opacity-100 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    : 'bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-l-4 border-l-emerald-600'
                }`}
              >
                {getNotificationIcon(notif.type, notif.newStatus)}

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                          {notif.employeeName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({notif.employeeId})
                        </span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.2 rounded font-medium">
                          {notif.department}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        {notif.title}
                      </h4>
                    </div>

                    <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">
                      {formatTimeAgo(notif.createdAt)}
                    </span>
                  </div>

                  {/* Task / MBO title */}
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium truncate max-w-[240px]">
                        🎯 {notif.targetTitle}
                      </span>
                      {notif.progress !== undefined && (
                        <span
                          className={`font-mono font-bold text-[10px] px-1.5 py-0.2 rounded-md ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                              : 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200'
                          }`}
                        >
                          {notif.progress}%
                        </span>
                      )}
                    </div>

                    {/* Result Note if available */}
                    {notif.resultNote && (
                      <div className="text-[11px] text-emerald-900 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 p-1.5 rounded-lg border border-emerald-200/80 dark:border-emerald-800/60 leading-snug">
                        <strong>Kết quả:</strong> {notif.resultNote}
                      </div>
                    )}
                  </div>

                  {/* Quick Action Buttons on Notification item */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      {onOpenSendEmailModal && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSendEmailModal(notif);
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer shadow-2xs"
                        >
                          <Mail className="w-3 h-3 text-emerald-600" />
                          <span>Chuyển tiếp Email</span>
                        </button>
                      )}

                      {onNavigateToTarget && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToTarget(
                              notif.type.startsWith('mbo') ? 'mbo' : 'task',
                              notif.targetId
                            );
                            onClose();
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer shadow-2xs"
                        >
                          <span>Xem chi tiết</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {!isRead && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
        <span className="text-slate-500 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          <span>Tự động đẩy thông báo thời gian thực & email</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
        >
          Đóng
        </button>
      </div>
    </div>
  );
};
