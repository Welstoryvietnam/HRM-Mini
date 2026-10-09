import React from 'react';
import { 
  FileSpreadsheet, 
  Settings as SettingsIcon, 
  TableProperties, 
  CalendarDays, 
  UserCheck, 
  Users, 
  LogIn, 
  LogOut, 
  BarChart3, 
  Printer,
  Shield, 
  User as UserIcon, 
  KeyRound, 
  RefreshCw,
  Sparkles,
  Target,
  Clock,
  Bell,
  StickyNote
} from 'lucide-react';
import { AuthUser, AppNotification, Employee } from '../types';
import { WelstoryLogo } from './WelstoryLogo';
import { NotificationDropdown } from './NotificationDropdown';

interface HeaderProps {
  activeTab: 'meal' | 'mbo' | 'tasks' | 'notes' | 'employees';
  setActiveTab: (tab: 'meal' | 'mbo' | 'tasks' | 'notes' | 'employees') => void;
  activeMealTab: 'summary' | 'matrix' | 'personal' | 'dashboard';
  setActiveMealTab: (tab: 'summary' | 'matrix' | 'personal' | 'dashboard') => void;
  currentUser: AuthUser | null;
  employees: Employee[];
  notifications: AppNotification[];
  onOpenLogin: () => void;
  onLogout: () => void;
  onExportExcel: () => void;
  onOpenPrint: () => void;
  onOpenSettings: () => void;
  onOpenChangePassword?: () => void;
  pendingRequestsCount?: number;
  approachingMBOCount?: number;
  isSyncing?: boolean;
  onSyncNow?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onMarkNotificationAsRead: (id: string) => void;
  onMarkAllNotificationsAsRead: () => void;
  onClearAllNotifications: () => void;
  onNavigateFromNotification?: (type: 'task' | 'mbo', targetId: string) => void;
  onOpenSendEmailModal?: (notification: AppNotification) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeMealTab,
  setActiveMealTab,
  currentUser,
  employees,
  notifications,
  onOpenLogin,
  onLogout,
  onExportExcel,
  onOpenPrint,
  onOpenSettings,
  onOpenChangePassword,
  pendingRequestsCount = 0,
  approachingMBOCount = 0,
  isSyncing = false,
  onSyncNow,
  isDarkMode,
  onToggleDarkMode,
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
  onClearAllNotifications,
  onNavigateFromNotification,
  onOpenSendEmailModal,
}) => {
  const isEmployeeOnly = currentUser && currentUser.role === 'nhan_vien_nhan_su';
  const [showNotifications, setShowNotifications] = React.useState(false);

  const currentUserId = currentUser?.id || '';
  const isAdminOrManager =
    currentUser?.role === 'admin' || currentUser?.role === 'quan_ly_nhan_su';

  // Calculate unread count for the current user
  const visibleNotifications = React.useMemo(() => {
    return notifications.filter((notif) => {
      if (isAdminOrManager) return true;
      return notif.employeeId === currentUserId;
    });
  }, [notifications, isAdminOrManager, currentUserId]);

  const unreadCount = visibleNotifications.filter(
    (n) => !n.readBy.includes(currentUserId)
  ).length;

  return (
    <header className="no-print bg-white dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 sticky top-0 z-30 shadow-2xs backdrop-blur-md">
      {/* Tier 1: Main Brand Bar */}
      <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14 sm:h-16">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <WelstoryLogo size="md" className="shadow-2xs hover:scale-105 transition-transform cursor-pointer" />
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm tracking-tight">
                WELSTORY
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-400">
                Hệ Thống Quản Lý
              </span>
            </div>
            
          </div>

          {/* Cloud Realtime sync status badge */}
          <button
            onClick={onSyncNow}
            disabled={isSyncing}
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[11px] font-semibold rounded-full border border-emerald-200/80 dark:border-emerald-800 transition-all cursor-pointer active:scale-95 shadow-2xs ml-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <RefreshCw className={`w-3 h-3 text-emerald-600 dark:text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">
              {isSyncing ? 'Đang đồng bộ...' : 'Cloud Trực Tuyến'}
            </span>
          </button>
        </div>

        {/* Right: Quick Tools & User Profile Capsule */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          
          {/* Quick Action: In phiếu (only in meal) */}
          {activeTab === 'meal' && (
            <button
              type="button"
              onClick={onOpenPrint}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 rounded-lg transition-all cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>In Phiếu</span>
            </button>
          )}

          {/* Quick Action: Xuất Excel (only in meal) */}
          {activeTab === 'meal' && (
            <button
              type="button"
              onClick={onExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isEmployeeOnly ? 'Tải Excel' : 'Xuất Excel'}</span>
            </button>
          )}

          {/* Settings button */}
          {!isEmployeeOnly && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          )}

          {/* Notification Bell Button with live unread badge */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications((prev) => !prev)}
              title="Thông báo tiến độ & kết quả từ nhân viên"
              className={`relative p-2 rounded-xl transition-all cursor-pointer ${
                showNotifications
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-400'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[9px] font-extrabold text-white animate-pulse shadow-2xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Menu */}
            <NotificationDropdown
              notifications={notifications}
              currentUser={currentUser}
              employees={employees}
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
              onMarkAsRead={onMarkNotificationAsRead}
              onMarkAllAsRead={onMarkAllNotificationsAsRead}
              onClearAll={onClearAllNotifications}
              onNavigateToTarget={onNavigateFromNotification}
              onOpenSendEmailModal={onOpenSendEmailModal}
            />
          </div>

          {/* User Account Capsule */}
          {currentUser ? (
            <div className="flex items-center gap-2 bg-slate-100/90 pl-2.5 pr-1.5 py-1 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-left hidden lg:block">
                <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[130px]">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                  <span>{currentUser.id}</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-semibold text-emerald-700 uppercase text-[9px]">
                    {currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'quan_ly_nhan_su' ? 'Quản lý' : 'Nhân viên'}
                  </span>
                </div>
              </div>

              {/* Avatar circle */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-2xs shrink-0 ${
                  currentUser.avatarColor || 'bg-emerald-600'
                }`}
              >
                {currentUser.name.split(' ').pop()?.charAt(0)}
              </div>

              {/* Change Password Button */}
              {onOpenChangePassword && (
                <button
                  type="button"
                  onClick={onOpenChangePassword}
                  className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Logout button */}
              <button
                type="button"
                onClick={onLogout}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng Nhập</span>
            </button>
          )}
        </div>
      </div>

      {/* Tier 2: Module Navigation Control Bar */}
      <div className="border-t border-slate-100 bg-slate-50/70">
        <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex flex-col gap-1.5">
          {/* Top-level Tabs */}
          <div className="flex items-center gap-1">
            <nav className="flex items-center gap-1 p-0.5 bg-slate-200/60 rounded-xl border border-slate-200/60 shadow-2xs">
              {/* Tab: Quản lý tiền ăn */}
              <button
                type="button"
                onClick={() => setActiveTab('meal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'meal'
                    ? 'bg-white text-emerald-950 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <FileSpreadsheet className={`w-3.5 h-3.5 ${activeTab === 'meal' ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>Quản lý Tiền ăn ngoài</span>
              </button>

              {/* Tab: MBO */}
              <button
                type="button"
                onClick={() => setActiveTab('mbo')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap relative ${
                  activeTab === 'mbo'
                    ? 'bg-white text-emerald-950 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Target className={`w-3.5 h-3.5 ${activeTab === 'mbo' ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>MBO</span>
                {approachingMBOCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 text-[9px] bg-amber-500 text-white font-bold rounded-full animate-pulse shadow-2xs">
                    {approachingMBOCount}
                  </span>
                )}
              </button>

              {/* Tab: Tasks */}
              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'tasks'
                    ? 'bg-white text-emerald-950 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Clock className={`w-3.5 h-3.5 ${activeTab === 'tasks' ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>Tasks</span>
              </button>

              {/* Tab: Ghi Chú (Notes) */}
              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'notes'
                    ? 'bg-white text-emerald-950 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <StickyNote className={`w-3.5 h-3.5 ${activeTab === 'notes' ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>Ghi Chú</span>
              </button>

              {/* Tab: Quản lý Tài khoản (Admin only) */}
              {!isEmployeeOnly && (
                <button
                  type="button"
                  onClick={() => setActiveTab('employees')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap relative ${
                    activeTab === 'employees'
                      ? 'bg-white text-emerald-950 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Users className={`w-3.5 h-3.5 ${activeTab === 'employees' ? 'text-emerald-600' : 'text-slate-500'}`} />
                  <span>Quản lý Tài khoản</span>
                  {pendingRequestsCount > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 text-[9px] bg-amber-500 text-white font-bold rounded-full animate-pulse shadow-2xs">
                      {pendingRequestsCount}
                    </span>
                  )}
                </button>
              )}
            </nav>
          </div>

          {/* Sub-nav for 'meal' module */}
          {activeTab === 'meal' && (
            <div className="flex items-center gap-1 border-t border-slate-200 dark:border-slate-800 pt-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveMealTab('personal')}
                className={`flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activeMealTab === 'personal'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-3 h-3 text-emerald-600" />
                <span>{isEmployeeOnly ? 'Chấm ăn của tôi' : 'Tự chấm cá nhân'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMealTab('summary')}
                className={`flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activeMealTab === 'summary'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <TableProperties className="w-3 h-3 text-emerald-600" />
                <span>{isEmployeeOnly ? 'Bảng kê cá nhân' : 'Bảng tổng hợp'}</span>
              </button>

              {!isEmployeeOnly && (
                <button
                  type="button"
                  onClick={() => setActiveMealTab('matrix')}
                  className={`flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    activeMealTab === 'matrix'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <CalendarDays className="w-3 h-3 text-emerald-600" />
                  <span>Ma trận tháng</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveMealTab('dashboard')}
                className={`flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activeMealTab === 'dashboard'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-3 h-3 text-emerald-600" />
                <span>Dashboard tiền ăn</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
