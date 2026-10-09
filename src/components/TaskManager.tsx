import React, { useState, useMemo } from 'react';
import {
  Plus,
  Check,
  X,
  Edit,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Search,
  Filter,
  User,
  UserCheck,
  Send,
  Sliders,
  ChevronDown,
  LayoutGrid,
  List,
  ArrowRight,
  TrendingUp,
  FileText,
  Sparkles,
  Flag,
  Phone,
  Mail,
  Copy,
  ExternalLink,
  MessageSquare,
  Building2,
  Share2,
  Info,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarCheck,
  CalendarPlus,
} from 'lucide-react';
import { Task, Employee, AppNotification } from '../types';
import {
  initCalendarAuth,
  signInGoogleCalendar,
  createGoogleCalendarEvent,
  getGoogleCalendarWebUrl,
  getCalendarAccessToken,
  getCalendarUser,
} from '../utils/googleCalendar';

interface TaskManagerProps {
  employees: Employee[];
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  currentUser: Employee | null;
  onNotifyUpdate?: (notification: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'>) => void;
  onOpenSendEmailModal?: (notification: AppNotification) => void;
}

export const TaskManager: React.FC<TaskManagerProps> = ({
  employees,
  tasks,
  setTasks,
  currentUser,
  onNotifyUpdate,
  onOpenSendEmailModal,
}) => {
  const isAdminOrManager =
    currentUser?.role === 'admin' || currentUser?.role === 'quan_ly_nhan_su';

  // View mode: 'kanban' | 'list' | 'departments'
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'departments'>('kanban');

  // Form modal (Giao việc mới / Chỉnh sửa)
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form input states
  const [formDepartment, setFormDepartment] = useState<string>('all');
  const [formAssigneeId, setFormAssigneeId] = useState<string>(
    employees[0]?.id || currentUser?.id || ''
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<string>('2026-10-15');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [status, setStatus] = useState<Task['status']>('pending');
  const [progress, setProgress] = useState<number>(0);
  const [resultNote, setResultNote] = useState<string>('');
  const [notifyViaZalo, setNotifyViaZalo] = useState<boolean>(true);
  const [notifyViaEmail, setNotifyViaEmail] = useState<boolean>(true);

  // Google Calendar integration states
  const [syncToGoogleCalendar, setSyncToGoogleCalendar] = useState<boolean>(true);
  const [isAllDay, setIsAllDay] = useState<boolean>(true);
  const [calendarStartTime, setCalendarStartTime] = useState<string>('08:30');
  const [calendarEndTime, setCalendarEndTime] = useState<string>('17:00');
  const [googleCalendarUser, setGoogleCalendarUser] = useState<any>(() => getCalendarUser());
  const [isCalendarConnecting, setIsCalendarConnecting] = useState<boolean>(false);

  React.useEffect(() => {
    const unsub = initCalendarAuth(
      (u) => setGoogleCalendarUser(u),
      () => setGoogleCalendarUser(null)
    );
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Quick progress & result modal
  const [progressModalTask, setProgressModalTask] = useState<Task | null>(null);
  const [quickStatus, setQuickStatus] = useState<Task['status']>('pending');
  const [quickProgress, setQuickProgress] = useState<number>(0);
  const [quickResultNote, setQuickResultNote] = useState<string>('');

  // Zalo & Email Notification Modal
  const [notificationTask, setNotificationTask] = useState<{
    task: Task;
    channel: 'all' | 'zalo' | 'email';
  } | null>(null);

  // Global Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | Task['status']>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | Task['priority']>('all');
  const [myTasksOnly, setMyTasksOnly] = useState<boolean>(false);

  // Month-based Task Management: 'all' | 'YYYY-MM'
  const currentMonthStr = '2026-10';
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');

  // Month navigation helpers
  const handlePrevMonth = () => {
    const base = selectedMonth === 'all' ? currentMonthStr : selectedMonth;
    const [y, m] = base.split('-').map(Number);
    const date = new Date(y, m - 2, 1);
    const prevY = date.getFullYear();
    const prevM = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${prevY}-${prevM}`);
  };

  const handleNextMonth = () => {
    const base = selectedMonth === 'all' ? currentMonthStr : selectedMonth;
    const [y, m] = base.split('-').map(Number);
    const date = new Date(y, m, 1);
    const nextY = date.getFullYear();
    const nextM = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${nextY}-${nextM}`);
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(currentMonthStr);
  };

  // Helper: Find employee by ID
  const getEmployee = (id: string) => {
    return employees.find((e) => e.id === id);
  };

  // Distinct departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [employees]);

  // Clean phone number for Zalo
  const cleanPhoneForZalo = (phone?: string) => {
    if (!phone) return '';
    return phone.replace(/[^0-9]/g, '');
  };

  // Tasks scoped to selected month for metrics & statistics
  const monthScopedTasks = useMemo(() => {
    if (selectedMonth === 'all') return tasks;
    return tasks.filter((t) => {
      const taskMonth = t.dueDate ? t.dueDate.slice(0, 7) : t.createdAt?.slice(0, 7);
      return taskMonth === selectedMonth;
    });
  }, [tasks, selectedMonth]);

  // KPI Calculations reflecting selected month
  const stats = useMemo(() => {
    const total = monthScopedTasks.length;
    const pending = monthScopedTasks.filter((t) => t.status === 'pending').length;
    const inProgress = monthScopedTasks.filter((t) => t.status === 'in-progress').length;
    const completed = monthScopedTasks.filter((t) => t.status === 'completed').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      pending,
      inProgress,
      completed,
      completionRate,
      pendingRate: total > 0 ? Math.round((pending / total) * 100) : 0,
      inProgressRate: total > 0 ? Math.round((inProgress / total) * 100) : 0,
    };
  }, [monthScopedTasks]);

  // Department / Employee Workload Stats
  const employeeWorkloadList = useMemo(() => {
    return employees.map((emp) => {
      const empTasks = monthScopedTasks.filter((t) => t.employeeId === emp.id);
      const total = empTasks.length;
      const pending = empTasks.filter((t) => t.status === 'pending').length;
      const inProgress = empTasks.filter((t) => t.status === 'in-progress').length;
      const completed = empTasks.filter((t) => t.status === 'completed').length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        employee: emp,
        total,
        pending,
        inProgress,
        completed,
        rate,
      };
    });
  }, [employees, monthScopedTasks]);

  // Filtered task list (including month filter)
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const emp = getEmployee(task.employeeId);

      // Month filter
      if (selectedMonth !== 'all') {
        const taskMonth = task.dueDate ? task.dueDate.slice(0, 7) : task.createdAt?.slice(0, 7);
        if (taskMonth !== selectedMonth) {
          return false;
        }
      }

      // My tasks toggle
      if (myTasksOnly && currentUser && task.employeeId !== currentUser.id) {
        return false;
      }
      // Department filter
      if (filterDepartment !== 'all' && emp?.department !== filterDepartment) {
        return false;
      }
      // Employee filter
      if (filterEmployeeId !== 'all' && task.employeeId !== filterEmployeeId) {
        return false;
      }
      // Status filter
      if (filterStatus !== 'all' && task.status !== filterStatus) {
        return false;
      }
      // Priority filter
      if (filterPriority !== 'all' && task.priority !== filterPriority) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const empName = emp?.name.toLowerCase() || '';
        return (
          task.title.toLowerCase().includes(q) ||
          task.description.toLowerCase().includes(q) ||
          empName.includes(q) ||
          (task.resultNote && task.resultNote.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [
    tasks,
    selectedMonth,
    myTasksOnly,
    currentUser,
    filterDepartment,
    filterEmployeeId,
    filterStatus,
    filterPriority,
    searchQuery,
    employees,
  ]);

  // Tasks partitioned for Kanban
  const kanbanPending = useMemo(
    () => filteredTasks.filter((t) => t.status === 'pending'),
    [filteredTasks]
  );
  const kanbanInProgress = useMemo(
    () => filteredTasks.filter((t) => t.status === 'in-progress'),
    [filteredTasks]
  );
  const kanbanCompleted = useMemo(
    () => filteredTasks.filter((t) => t.status === 'completed'),
    [filteredTasks]
  );

  // Open Add modal with optional pre-selected employee or status
  const openAddModal = (
    defaultStatus: Task['status'] = 'pending',
    targetEmployeeId?: string
  ) => {
    setIsAdding(true);
    setEditingId(null);
    const selectedEmp = targetEmployeeId
      ? employees.find((e) => e.id === targetEmployeeId)
      : currentUser && !isAdminOrManager
      ? currentUser
      : employees[0];

    setFormAssigneeId(selectedEmp?.id || employees[0]?.id || '');
    setFormDepartment(selectedEmp?.department || 'all');
    setTitle('');
    setDescription('');
    // Default due date: if specific month is chosen, place deadline in that month
    const defaultDue =
      selectedMonth !== 'all' ? `${selectedMonth}-15` : '2026-10-15';
    setDueDate(defaultDue);
    setPriority('medium');
    setStatus(defaultStatus);
    setProgress(defaultStatus === 'in-progress' ? 30 : defaultStatus === 'completed' ? 100 : 0);
    setResultNote('');
    setNotifyViaZalo(true);
    setNotifyViaEmail(true);
    setSyncToGoogleCalendar(true);
    setIsAllDay(true);
  };

  // Open Edit modal
  const openEditModal = (task: Task) => {
    setIsAdding(true);
    setEditingId(task.id);
    const emp = getEmployee(task.employeeId);
    setFormDepartment(emp?.department || 'all');
    setFormAssigneeId(task.employeeId);
    setTitle(task.title);
    setDescription(task.description);
    setDueDate(task.dueDate);
    setPriority(task.priority || 'medium');
    setStatus(task.status);
    setProgress(task.progress ?? (task.status === 'completed' ? 100 : task.status === 'in-progress' ? 50 : 0));
    setResultNote(task.resultNote || '');
    setNotifyViaZalo(false);
    setNotifyViaEmail(false);
    setSyncToGoogleCalendar(Boolean(task.googleCalendarLink || task.googleCalendarEventId));
    setIsAllDay(true);
  };

  // Quick connect to Google Calendar
  const handleConnectGoogleCalendar = async () => {
    setIsCalendarConnecting(true);
    try {
      const res = await signInGoogleCalendar();
      setGoogleCalendarUser(res.user);
      showToast(`Đã kết nối tài khoản Google: ${res.user.email || res.user.displayName}`);
    } catch (err: any) {
      console.warn('Google connect warning:', err);
      showToast('Không thể kết nối Google Calendar: Vui lòng cho phép quyền truy cập.');
    } finally {
      setIsCalendarConnecting(false);
    }
  };

  // Standalone action to sync any task to Google Calendar
  const handleSyncTaskToCalendar = async (task: Task) => {
    try {
      let token = getCalendarAccessToken();
      if (!token) {
        const res = await signInGoogleCalendar();
        token = res.accessToken;
        setGoogleCalendarUser(res.user);
      }
      if (token) {
        const assigneeObj = getEmployee(task.employeeId);
        const res = await createGoogleCalendarEvent(
          {
            title: task.title,
            description: `[Welstory Nhiệm Vụ]\nNgười phụ trách: ${assigneeObj?.name || 'Nhân sự'}\nHạn chót: ${task.dueDate}\nMô tả: ${task.description || 'Không có mô tả'}\nTrạng thái: ${task.status === 'completed' ? 'Đã hoàn thành' : task.status === 'in-progress' ? 'Đang thực hiện' : 'Chưa thực hiện'}`,
            date: task.dueDate,
            attendees: assigneeObj?.email ? [assigneeObj.email] : undefined,
          },
          token
        );
        setTasks(
          tasks.map((t) =>
            t.id === task.id
              ? { ...t, googleCalendarEventId: res.id, googleCalendarLink: res.htmlLink }
              : t
          )
        );
        showToast('Đã đồng bộ công việc lên Google Calendar thành công!');
      }
    } catch (e: any) {
      console.warn('Sync task to Google Calendar fallback:', e);
      const webUrl = getGoogleCalendarWebUrl(
        task.title,
        task.description || '',
        task.dueDate
      );
      window.open(webUrl, '_blank', 'noopener,noreferrer');
      showToast('Đã mở trang đăng ký sự kiện trên Google Calendar!');
    }
  };

  // Save Add/Edit
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !formAssigneeId) return;

    let calEventId: string | undefined = undefined;
    let calLink: string | undefined = undefined;

    // Process Google Calendar sync if enabled
    if (syncToGoogleCalendar) {
      try {
        let token = getCalendarAccessToken();
        if (!token) {
          const res = await signInGoogleCalendar();
          token = res.accessToken;
          setGoogleCalendarUser(res.user);
        }
        if (token) {
          const assigneeObj = getEmployee(formAssigneeId);
          const priorityText =
            priority === 'urgent'
              ? 'Gấp / Khẩn cấp'
              : priority === 'high'
              ? 'Ưu tiên cao'
              : 'Tiêu chuẩn';
          const calResult = await createGoogleCalendarEvent(
            {
              title: title.trim(),
              description: `Nhiệm vụ: ${title.trim()}\nNhân sự phụ trách: ${assigneeObj?.name || 'Nhân sự'}\nĐộ ưu tiên: ${priorityText}\nChi tiết: ${description.trim()}`,
              date: dueDate,
              startTime: isAllDay ? undefined : calendarStartTime,
              endTime: isAllDay ? undefined : calendarEndTime,
              attendees: assigneeObj?.email ? [assigneeObj.email] : undefined,
            },
            token
          );
          calEventId = calResult.id;
          calLink = calResult.htmlLink;
          showToast('Đã đăng ký sự kiện lên Google Calendar!');
        }
      } catch (err: any) {
        console.warn('Google Calendar auto-sync notice:', err);
        calLink = getGoogleCalendarWebUrl(
          title.trim(),
          description.trim(),
          dueDate,
          isAllDay ? undefined : calendarStartTime,
          isAllDay ? undefined : calendarEndTime
        );
      }
    }

    let savedTask: Task;

    if (editingId) {
      const existingTask = tasks.find((t) => t.id === editingId);
      savedTask = {
        id: editingId,
        employeeId: formAssigneeId,
        title: title.trim(),
        description: description.trim(),
        dueDate,
        priority,
        status,
        progress: status === 'completed' ? 100 : progress,
        resultNote: resultNote.trim(),
        assignedBy: currentUser?.id || 'admin',
        googleCalendarEventId: calEventId || existingTask?.googleCalendarEventId,
        googleCalendarLink: calLink || existingTask?.googleCalendarLink,
        completedAt:
          status === 'completed'
            ? new Date().toISOString()
            : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setTasks(
        tasks.map((t) =>
          t.id === editingId
            ? {
                ...t,
                ...savedTask,
                completedAt:
                  status === 'completed'
                    ? t.completedAt || new Date().toISOString()
                    : undefined,
                createdAt: t.createdAt,
              }
            : t
        )
      );
      setEditingId(null);
      showToast('Đã cập nhật thông tin công việc thành công!');
    } else {
      savedTask = {
        id: `task-${Date.now()}`,
        employeeId: formAssigneeId,
        title: title.trim(),
        description: description.trim(),
        dueDate,
        priority,
        status,
        progress: status === 'completed' ? 100 : progress,
        resultNote: resultNote.trim(),
        assignedBy: currentUser?.id || 'admin',
        googleCalendarEventId: calEventId,
        googleCalendarLink: calLink,
        completedAt: status === 'completed' ? new Date().toISOString() : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTasks([savedTask, ...tasks]);
      showToast(`Đã giao công việc mới cho ${getEmployee(formAssigneeId)?.name || 'nhân viên'}!`);

      // Trigger notification modal if enabled
      if (notifyViaZalo || notifyViaEmail) {
        setNotificationTask({
          task: savedTask,
          channel: 'all',
        });
      }
    }

    setIsAdding(false);
  };

  // Delete task
  const handleDeleteTask = (id: string, taskTitle: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa công việc "${taskTitle}"?`)) {
      setTasks(tasks.filter((t) => t.id !== id));
      showToast('Đã xóa công việc khỏi danh sách!');
    }
  };

  // Quick move status (from Kanban or list button)
  const handleQuickStatusChange = (task: Task, newStatus: Task['status']) => {
    const isCompleted = newStatus === 'completed';
    const newProgress = isCompleted
      ? 100
      : newStatus === 'in-progress'
      ? Math.max(task.progress || 30, 20)
      : 0;

    setTasks(
      tasks.map((t) => {
        if (t.id === task.id) {
          return {
            ...t,
            status: newStatus,
            progress: newProgress,
            completedAt: isCompleted ? t.completedAt || new Date().toISOString() : undefined,
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );

    const statusLabel =
      newStatus === 'completed'
        ? 'Hoàn thành'
        : newStatus === 'in-progress'
        ? 'Đang triển khai'
        : 'Chưa triển khai';

    showToast(`Đã chuyển trạng thái: ${statusLabel}`);

    // Trigger notification alert to Admin & Manager
    if (onNotifyUpdate) {
      const emp = getEmployee(task.employeeId);
      const isResult = isCompleted && Boolean(task.resultNote);
      onNotifyUpdate({
        type: isResult ? 'task_result' : 'task_progress',
        title: isCompleted
          ? `Hoàn thành công việc: ${task.title}`
          : `Cập nhật trạng thái: ${statusLabel}`,
        message: `Nhân viên ${emp?.name || 'Nhân sự'} (${emp?.id || task.employeeId}) đã chuyển trạng thái sang "${statusLabel}" (${newProgress}%) cho công việc "${task.title}".`,
        employeeId: task.employeeId,
        employeeName: emp?.name || 'Nhân sự',
        department: emp?.department || 'HR Group',
        targetId: task.id,
        targetTitle: task.title,
        oldStatus: task.status,
        newStatus,
        progress: newProgress,
        resultNote: task.resultNote,
        recipientRoles: ['admin', 'quan_ly_nhan_su'],
      });
    }

    // If marked completed and has no resultNote yet, open progress modal so user can fill result
    if (isCompleted && !task.resultNote) {
      openProgressModal({ ...task, status: 'completed', progress: 100 });
    }
  };

  // Open Quick Progress & Result Modal
  const openProgressModal = (task: Task) => {
    setProgressModalTask(task);
    setQuickStatus(task.status);
    setQuickProgress(task.progress ?? (task.status === 'completed' ? 100 : task.status === 'in-progress' ? 50 : 0));
    setQuickResultNote(task.resultNote || '');
  };

  // Save Quick Progress Modal
  const handleSaveQuickProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressModalTask) return;

    const isComp = quickStatus === 'completed' || quickProgress >= 100;
    const finalStatus = isComp ? 'completed' : quickStatus;
    const finalProgress = isComp ? 100 : quickProgress;

    setTasks(
      tasks.map((t) => {
        if (t.id === progressModalTask.id) {
          return {
            ...t,
            status: finalStatus,
            progress: finalProgress,
            resultNote: quickResultNote.trim(),
            completedAt: isComp ? t.completedAt || new Date().toISOString() : undefined,
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );

    const emp = getEmployee(progressModalTask.employeeId);
    showToast('Đã cập nhật tiến độ & kết quả công việc!');

    // Trigger notification to Admin & Department Manager
    if (onNotifyUpdate) {
      const isResult = Boolean(quickResultNote.trim());
      onNotifyUpdate({
        type: isResult ? 'task_result' : 'task_progress',
        title: isComp
          ? `Báo cáo hoàn thành: ${progressModalTask.title}`
          : `Báo cáo tiến độ (${finalProgress}%): ${progressModalTask.title}`,
        message: `Nhân viên ${emp?.name || 'Nhân sự'} (${emp?.id || progressModalTask.employeeId}) vừa cập nhật tiến độ ${finalProgress}% và gửi kết quả thực tế cho công việc "${progressModalTask.title}".`,
        employeeId: progressModalTask.employeeId,
        employeeName: emp?.name || 'Nhân sự',
        department: emp?.department || 'HR Group',
        targetId: progressModalTask.id,
        targetTitle: progressModalTask.title,
        oldStatus: progressModalTask.status,
        newStatus: finalStatus,
        progress: finalProgress,
        resultNote: quickResultNote.trim(),
        recipientRoles: ['admin', 'quan_ly_nhan_su'],
      });
    }

    setProgressModalTask(null);
  };

  // Generate notification message text for Zalo & Email
  const generateNotificationContent = (task: Task) => {
    const assignee = getEmployee(task.employeeId);
    const assigner = getEmployee(task.assignedBy) || currentUser;
    const formattedDue = task.dueDate.split('-').reverse().join('/');
    const priorityLabel =
      task.priority === 'urgent'
        ? 'Khẩn cấp (Gấp)'
        : task.priority === 'high'
        ? 'Ưu tiên cao'
        : task.priority === 'medium'
        ? 'Trung bình'
        : 'Tiêu chuẩn';

    const subject = `[WELSTORY HR] Giao nhiệm vụ: ${task.title}`;
    const bodyText = `[THÔNG BÁO GIAO NHIỆM VỤ - WELSTORY HR]
Kính gửi: ${assignee?.name || 'Nhân sự'} (Mã NV: ${task.employeeId})
Bộ phận: ${assignee?.department || 'HR Group'}

Nhiệm vụ: ${task.title}
Hạn chót hoàn thành: ${formattedDue}
Mức độ ưu tiên: ${priorityLabel}
${task.description ? `Yêu cầu chi tiết:\n${task.description}\n` : ''}
Người giao việc: ${assigner?.name || 'Quản lý nhân sự'}

Hướng dẫn thực hiện:
Vui lòng truy cập hệ thống để tiếp nhận công việc, lựa chọn trạng thái tiến độ:
- Chưa triển khai -> Đang triển khai -> Hoàn thành
- Cập nhật % tiến độ và điền báo cáo kết quả sau khi hoàn tất.

Trân trọng,
Welstory HR Management System`;

    return { subject, bodyText };
  };

  // Copy notification text to clipboard
  const copyToClipboard = (text: string, label: string = 'Nội dung') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(`Đã sao chép ${label} vào bộ nhớ tạm!`);
    }
  };

  // Send Zalo action
  const handleOpenZaloChat = (task: Task) => {
    const assignee = getEmployee(task.employeeId);
    const phone = cleanPhoneForZalo(assignee?.phone);
    const { bodyText } = generateNotificationContent(task);

    // Copy text first
    if (navigator.clipboard) {
      navigator.clipboard.writeText(bodyText);
    }

    if (phone) {
      window.open(`https://zalo.me/${phone}`, '_blank', 'noopener,noreferrer');
      showToast(`Đang mở Zalo của ${assignee?.name} (${phone}). Nội dung đã được sao chép sẵn!`);
    } else {
      showToast('Nhân viên chưa cập nhật số điện thoại Zalo. Đã sao chép nội dung tin nhắn!');
    }
  };

  // Send Email action
  const handleOpenEmail = (task: Task) => {
    const assignee = getEmployee(task.employeeId);
    const { subject, bodyText } = generateNotificationContent(task);
    const email = assignee?.email || '';

    const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(bodyText)}`;

    window.location.href = mailtoUrl;
    showToast(`Đang mở ứng dụng email gửi tới ${email || 'nhân viên'}!`);
  };

  // Due Date calculation helper
  const getDueBadge = (dueDateStr: string, isCompleted: boolean) => {
    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Đã hoàn thành</span>
        </span>
      );
    }

    const today = new Date('2026-10-07');
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-300">
          <AlertCircle className="w-3 h-3 text-rose-600" />
          <span>Quá hạn {Math.abs(diffDays)} ngày</span>
        </span>
      );
    }
    if (diffDays === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300 animate-pulse">
          <Clock className="w-3 h-3 text-amber-700" />
          <span>Hạn hôm nay!</span>
        </span>
      );
    }
    if (diffDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>Còn {diffDays} ngày</span>
        </span>
      );
    }
    const formatted = dueDateStr.split('-').reverse().join('/');
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
        <Calendar className="w-3 h-3 text-slate-500" />
        <span>Hạn: {formatted}</span>
      </span>
    );
  };

  const getPriorityBadge = (p?: Task['priority']) => {
    switch (p) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 uppercase">
            <Flag className="w-2.5 h-2.5 text-rose-600 fill-rose-600" />
            Khẩn cấp
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">
            <Flag className="w-2.5 h-2.5 text-amber-600" />
            Ưu tiên cao
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
            Trung bình
          </span>
        );
      case 'low':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            Tiêu chuẩn
          </span>
        );
    }
  };

  const getStatusBadge = (st: Task['status']) => {
    switch (st) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Đã hoàn thành</span>
          </span>
        );
      case 'in-progress':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-300">
            <Clock className="w-3 h-3 text-sky-600" />
            <span>Đang triển khai</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            <span>Chưa triển khai</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 text-xs font-semibold rounded-xl shadow-2xl bg-slate-900 text-white border border-slate-700 animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Top Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-2xs shrink-0">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Quản Lý & Giao Công Việc Theo Bộ Phận & Nhân Sự
              </h2>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                HR Work Management
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Giao việc đến từng cá nhân từ danh sách nhân viên, thông báo qua Zalo/Email, theo dõi 3 trạng thái tiến độ và báo cáo kết quả
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* View Mode Toggle: Kanban | List | Departments */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Bảng Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Danh sách</span>
            </button>
            <button
              onClick={() => setViewMode('departments')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'departments'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bộ phận & Nhân sự ({employees.length})</span>
            </button>
          </div>

          <button
            onClick={() => openAddModal('pending')}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Giao Việc Mới</span>
          </button>
        </div>
      </div>

      {/* 2. Month Management Bar (Quản Lý Task Theo Tháng) */}
      <div className="bg-linear-to-r from-emerald-50 via-teal-50/50 to-white border border-emerald-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-2xs shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Quản Lý Công Việc Theo Tháng
              </h3>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-emerald-200 font-mono">
                {selectedMonth === 'all'
                  ? 'Toàn bộ chu kỳ'
                  : `Tháng ${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}`}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Lọc theo tháng hạn hoàn thành, theo dõi tiến độ công việc và phân công nhiệm vụ cụ thể cho từng tháng
            </p>
          </div>
        </div>

        {/* Month Selector Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick previous month */}
          <button
            type="button"
            onClick={handlePrevMonth}
            title="Tháng trước"
            className="p-1.5 bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Tháng trước</span>
          </button>

          {/* Month quick pills */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setSelectedMonth('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedMonth === 'all'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả các tháng
            </button>
            <button
              type="button"
              onClick={() => setSelectedMonth('2026-09')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedMonth === '2026-09'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              T09/2026
            </button>
            <button
              type="button"
              onClick={handleCurrentMonth}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedMonth === currentMonthStr
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              T10/2026 (Hiện tại)
            </button>
            <button
              type="button"
              onClick={() => setSelectedMonth('2026-11')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedMonth === '2026-11'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              T11/2026
            </button>
            <button
              type="button"
              onClick={() => setSelectedMonth('2026-12')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                selectedMonth === '2026-12'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              T12/2026
            </button>
          </div>

          {/* Quick next month */}
          <button
            type="button"
            onClick={handleNextMonth}
            title="Tháng sau"
            className="p-1.5 bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
          >
            <span className="hidden sm:inline">Tháng sau</span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>

          {/* Native Month Picker for any other month */}
          <div className="relative flex items-center">
            <input
              type="month"
              value={selectedMonth === 'all' ? currentMonthStr : selectedMonth}
              onChange={(e) => {
                if (e.target.value) setSelectedMonth(e.target.value);
              }}
              title="Chọn tháng bất kỳ"
              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-emerald-500 rounded-xl text-xs font-mono font-bold text-slate-800 shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>
      </div>

      {/* 3. KPI Metrics Bar: Theo Dõi 3 Trạng Thái Tiến Độ (Theo Tháng) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Tasks */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-600 font-semibold mb-1.5">
            <span>
              {selectedMonth === 'all'
                ? 'Tổng việc toàn hệ thống'
                : `Tổng việc Tháng ${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}`}
            </span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {stats.total}
            </span>
            <span className="text-xs text-slate-500 font-medium">công việc</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Tỷ lệ hoàn thành:</span>
            <span className="font-bold text-emerald-700 font-mono">{stats.completionRate}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>

        {/* Chưa triển khai (Pending) */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'pending' ? 'all' : 'pending')}
          className={`bg-amber-50/60 border rounded-2xl p-4 shadow-xs cursor-pointer transition-all hover:bg-amber-50 ${
            filterStatus === 'pending'
              ? 'border-amber-400 ring-2 ring-amber-200'
              : 'border-amber-200/80'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-900 font-bold mb-1.5">
            <span>Chưa triển khai</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-950 font-mono">
              {stats.pending}
            </span>
            <span className="text-xs text-amber-800 font-semibold">
              ({stats.pendingRate}%)
            </span>
          </div>
          <p className="mt-2 text-[11px] text-amber-700">
            {selectedMonth === 'all'
              ? 'Chờ nhân sự bắt đầu triển khai'
              : `Chưa triển khai trong Tháng ${selectedMonth.split('-')[1]}`}
          </p>
        </div>

        {/* Đang triển khai (In Progress) */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'in-progress' ? 'all' : 'in-progress')}
          className={`bg-sky-50/60 border rounded-2xl p-4 shadow-xs cursor-pointer transition-all hover:bg-sky-50 ${
            filterStatus === 'in-progress'
              ? 'border-sky-400 ring-2 ring-sky-200'
              : 'border-sky-200/80'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-sky-900 font-bold mb-1.5">
            <span>Đang triển khai</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-sky-950 font-mono">
              {stats.inProgress}
            </span>
            <span className="text-xs text-sky-800 font-semibold">
              ({stats.inProgressRate}%)
            </span>
          </div>
          <p className="mt-2 text-[11px] text-sky-700">
            {selectedMonth === 'all'
              ? 'Đang thực hiện, cập nhật tiến độ liên tục'
              : `Đang thực hiện trong Tháng ${selectedMonth.split('-')[1]}`}
          </p>
        </div>

        {/* Đã hoàn thành (Completed) */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'completed' ? 'all' : 'completed')}
          className={`bg-emerald-50/60 border rounded-2xl p-4 shadow-xs cursor-pointer transition-all hover:bg-emerald-50 ${
            filterStatus === 'completed'
              ? 'border-emerald-400 ring-2 ring-emerald-200'
              : 'border-emerald-200/80'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-900 font-bold mb-1.5">
            <span>Đã hoàn thành</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-950 font-mono">
              {stats.completed}
            </span>
            <span className="text-xs text-emerald-800 font-semibold">
              ({stats.completionRate}%)
            </span>
          </div>
          <p className="mt-2 text-[11px] text-emerald-700">
            {selectedMonth === 'all'
              ? 'Đã nghiệm thu kết quả công việc'
              : `Đã hoàn thành trong Tháng ${selectedMonth.split('-')[1]}`}
          </p>
        </div>
      </div>

      {/* 3. Filter & Controls Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search bar */}
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm việc, mô tả, tên NV..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Department filter */}
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterDepartment}
              onChange={(e) => {
                setFilterDepartment(e.target.value);
                setFilterEmployeeId('all');
              }}
              className="w-full pl-9 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none cursor-pointer"
            >
              <option value="all">Tất cả bộ phận</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Employee filter dropdown */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterEmployeeId}
              onChange={(e) => {
                setFilterEmployeeId(e.target.value);
                setMyTasksOnly(false);
              }}
              className="w-full pl-9 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none cursor-pointer"
            >
              <option value="all">
                {filterDepartment === 'all'
                  ? `Tất cả nhân sự (${employees.length})`
                  : `Nhân sự thuộc ${filterDepartment}`}
              </option>
              {employees
                .filter((emp) => filterDepartment === 'all' || emp.department === filterDepartment)
                .map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.id})
                  </option>
                ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Status filter chips */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full pl-9 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none cursor-pointer"
            >
              <option value="all">Tất cả tiến độ</option>
              <option value="pending">🟡 Chưa triển khai</option>
              <option value="in-progress">🔵 Đang triển khai</option>
              <option value="completed">🟢 Đã hoàn thành</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Priority filter */}
          <div className="relative">
            <Flag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as any)}
              className="w-full pl-9 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none cursor-pointer"
            >
              <option value="all">Mọi mức độ ưu tiên</option>
              <option value="urgent">🔴 Khẩn cấp (Gấp)</option>
              <option value="high">🟠 Ưu tiên cao</option>
              <option value="medium">🔵 Trung bình</option>
              <option value="low">⚪ Tiêu chuẩn</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Quick action buttons & status summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5">
            {currentUser && (
              <button
                onClick={() => setMyTasksOnly((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  myTasksOnly
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Việc giao cho tôi ({tasks.filter((t) => t.employeeId === currentUser.id).length})</span>
              </button>
            )}

            {(filterDepartment !== 'all' || filterEmployeeId !== 'all' || filterStatus !== 'all' || filterPriority !== 'all' || searchQuery || myTasksOnly) && (
              <button
                onClick={() => {
                  setFilterDepartment('all');
                  setFilterEmployeeId('all');
                  setFilterStatus('all');
                  setFilterPriority('all');
                  setSearchQuery('');
                  setMyTasksOnly(false);
                }}
                className="text-slate-500 hover:text-rose-600 font-medium px-2 py-1 underline"
              >
                Xóa tất cả bộ lọc
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-slate-500 text-[11px]">
            <span>
              Đang hiển thị <strong>{filteredTasks.length}</strong> / {tasks.length} công việc
            </span>
          </div>
        </div>
      </div>

      {/* 4. MAIN VIEWS */}

      {/* VIEW A: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="space-y-4">
          {filteredTasks.length === 0 && (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div className="font-bold text-slate-800 text-sm">
                {selectedMonth === 'all'
                  ? 'Chưa có công việc nào trong danh sách'
                  : `Chưa có công việc nào trong Tháng ${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}`}
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {selectedMonth === 'all'
                  ? 'Bắt đầu bằng cách giao việc mới đến từng cá nhân từ danh sách nhân viên.'
                  : `Bạn có thể bấm giao việc mới để tạo công việc có hạn chót trong Tháng ${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}.`}
              </p>
              <button
                onClick={() => openAddModal('pending')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Giao Việc Mới Cho Tháng Này</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
          {/* Column 1: Chưa triển khai */}
          <div className="bg-slate-100/70 border border-slate-200/90 rounded-2xl p-4 flex flex-col space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                  Chưa Triển Khai
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 font-mono">
                  {kanbanPending.length}
                </span>
              </div>
              <button
                onClick={() => openAddModal('pending')}
                className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-slate-200 rounded-lg cursor-pointer"
                title="Giao việc mới vào Chưa triển khai"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[720px] pr-0.5">
              {kanbanPending.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                  Không có việc nào chưa triển khai
                </div>
              ) : (
                kanbanPending.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    assignee={getEmployee(task.employeeId)}
                    assigner={getEmployee(task.assignedBy)}
                    onEdit={() => openEditModal(task)}
                    onDelete={() => handleDeleteTask(task.id, task.title)}
                    onProgressClick={() => openProgressModal(task)}
                    onStatusChange={(newSt) => handleQuickStatusChange(task, newSt)}
                    onNotifyClick={() => setNotificationTask({ task, channel: 'all' })}
                    onZaloClick={() => handleOpenZaloChat(task)}
                    onEmailClick={() => handleOpenEmail(task)}
                    onCalendarSync={() => handleSyncTaskToCalendar(task)}
                    getDueBadge={getDueBadge}
                    getPriorityBadge={getPriorityBadge}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 2: Đang triển khai */}
          <div className="bg-sky-50/50 border border-sky-200/90 rounded-2xl p-4 flex flex-col space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-sky-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-500" />
                <h3 className="text-xs sm:text-sm font-bold text-sky-950">
                  Đang Triển Khai
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 font-mono">
                  {kanbanInProgress.length}
                </span>
              </div>
              <button
                onClick={() => openAddModal('in-progress')}
                className="p-1 text-sky-600 hover:text-sky-800 hover:bg-sky-100 rounded-lg cursor-pointer"
                title="Giao việc mới vào Đang triển khai"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[720px] pr-0.5">
              {kanbanInProgress.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs border border-dashed border-sky-200 rounded-xl">
                  Không có việc nào đang triển khai
                </div>
              ) : (
                kanbanInProgress.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    assignee={getEmployee(task.employeeId)}
                    assigner={getEmployee(task.assignedBy)}
                    onEdit={() => openEditModal(task)}
                    onDelete={() => handleDeleteTask(task.id, task.title)}
                    onProgressClick={() => openProgressModal(task)}
                    onStatusChange={(newSt) => handleQuickStatusChange(task, newSt)}
                    onNotifyClick={() => setNotificationTask({ task, channel: 'all' })}
                    onZaloClick={() => handleOpenZaloChat(task)}
                    onEmailClick={() => handleOpenEmail(task)}
                    onCalendarSync={() => handleSyncTaskToCalendar(task)}
                    getDueBadge={getDueBadge}
                    getPriorityBadge={getPriorityBadge}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 3: Đã hoàn thành */}
          <div className="bg-emerald-50/40 border border-emerald-200/90 rounded-2xl p-4 flex flex-col space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <h3 className="text-xs sm:text-sm font-bold text-emerald-950">
                  Đã Hoàn Thành
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 font-mono">
                  {kanbanCompleted.length}
                </span>
              </div>
              <button
                onClick={() => openAddModal('completed')}
                className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-lg cursor-pointer"
                title="Thêm việc đã hoàn thành"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[720px] pr-0.5">
              {kanbanCompleted.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs border border-dashed border-emerald-200 rounded-xl">
                  Chưa có việc nào hoàn thành
                </div>
              ) : (
                kanbanCompleted.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    assignee={getEmployee(task.employeeId)}
                    assigner={getEmployee(task.assignedBy)}
                    onEdit={() => openEditModal(task)}
                    onDelete={() => handleDeleteTask(task.id, task.title)}
                    onProgressClick={() => openProgressModal(task)}
                    onStatusChange={(newSt) => handleQuickStatusChange(task, newSt)}
                    onNotifyClick={() => setNotificationTask({ task, channel: 'all' })}
                    onZaloClick={() => handleOpenZaloChat(task)}
                    onEmailClick={() => handleOpenEmail(task)}
                    onCalendarSync={() => handleSyncTaskToCalendar(task)}
                    getDueBadge={getDueBadge}
                    getPriorityBadge={getPriorityBadge}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* VIEW B: LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div className="font-bold text-slate-800 text-sm">
                {selectedMonth === 'all'
                  ? 'Chưa có công việc nào trong danh sách'
                  : `Không có công việc nào trong Tháng ${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}`}
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {selectedMonth === 'all'
                  ? 'Bấm nút "Giao Việc Mới" để tạo và phân công nhiệm vụ cho nhân viên.'
                  : `Bấm nút bên dưới để tạo công việc mới có hạn chót thực hiện trong Tháng ${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}.`}
              </p>
              <button
                onClick={() => openAddModal('pending')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Giao Việc Mới Cho Tháng Này</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 w-10 text-center">STT</th>
                    <th className="py-3 px-4 min-w-[240px]">Tên công việc / Yêu cầu</th>
                    <th className="py-3 px-4 min-w-[190px]">Người nhận việc</th>
                    <th className="py-3 px-4 min-w-[140px]">Trạng thái</th>
                    <th className="py-3 px-4 min-w-[140px]">Tiến độ</th>
                    <th className="py-3 px-4 min-w-[120px]">Hạn chót</th>
                    <th className="py-3 px-4 min-w-[100px]">Độ ưu tiên</th>
                    <th className="py-3 px-4 min-w-[120px] text-center">Thông báo</th>
                    <th className="py-3 px-4 text-center min-w-[140px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredTasks.map((task, idx) => {
                    const assignee = getEmployee(task.employeeId);
                    const isCompleted = task.status === 'completed';

                    return (
                      <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-xs">
                            {task.title}
                          </div>
                          {task.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                              {task.description}
                            </p>
                          )}
                          {task.resultNote && (
                            <div className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded mt-1 border border-emerald-200 inline-block">
                              <strong>Kết quả:</strong> {task.resultNote}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${
                                assignee?.avatarColor || 'bg-emerald-600'
                              }`}
                            >
                              {assignee?.name.split(' ').pop()?.charAt(0) || 'NV'}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">
                                {assignee ? assignee.name : task.employeeId}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                <span>{assignee?.department || 'HR Group'}</span>
                                {assignee?.phone && (
                                  <span className="font-mono text-slate-500">
                                    • {assignee.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => openProgressModal(task)}
                            className="cursor-pointer"
                            title="Bấm để đổi trạng thái"
                          >
                            {getStatusBadge(task.status)}
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <div
                            onClick={() => openProgressModal(task)}
                            className="w-28 space-y-1 cursor-pointer hover:opacity-80"
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-slate-500">Tiến độ</span>
                              <span className="font-bold text-slate-800">{task.progress ?? 0}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isCompleted
                                    ? 'bg-emerald-500'
                                    : task.status === 'in-progress'
                                    ? 'bg-sky-500'
                                    : 'bg-amber-400'
                                }`}
                                style={{ width: `${task.progress ?? 0}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {getDueBadge(task.dueDate, isCompleted)}
                        </td>
                        <td className="py-3.5 px-4">
                          {getPriorityBadge(task.priority)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Zalo Button */}
                            <button
                              onClick={() => handleOpenZaloChat(task)}
                              title={`Gửi tin nhắn Zalo cho ${assignee?.name || 'nhân viên'}`}
                              className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <MessageSquare className="w-3 h-3 text-sky-600" />
                              <span>Zalo</span>
                            </button>

                            {/* Email Button */}
                            <button
                              onClick={() => handleOpenEmail(task)}
                              title={`Gửi email nhiệm vụ cho ${assignee?.email || 'nhân viên'}`}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Mail className="w-3 h-3 text-emerald-600" />
                              <span>Email</span>
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openProgressModal(task)}
                              title="Cập nhật tiến độ & Điền kết quả"
                              className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(task)}
                              title="Sửa chi tiết"
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id, task.title)}
                              title="Xóa việc"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW C: QUẢN LÝ BỘ PHẬN & PHÂN BỔ NHÂN SỰ */}
      {viewMode === 'departments' && (
        <div className="space-y-5">
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Công Cụ Quản Lý Bộ Phận Giao Việc Đến Cá Nhân
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Theo dõi khối lượng công việc, tỷ lệ hoàn thành theo từng nhân viên và phân công việc nhanh kèm thông báo Zalo / Email
                </p>
              </div>
            </div>

            <button
              onClick={() => openAddModal('pending')}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Giao Việc Cho Cá Nhân</span>
            </button>
          </div>

          {/* Employee Workload Table */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 w-12 text-center">STT</th>
                    <th className="py-3 px-4 min-w-[200px]">Nhân viên phụ trách</th>
                    <th className="py-3 px-4 min-w-[140px]">Bộ phận</th>
                    <th className="py-3 px-4 min-w-[180px]">Liên hệ (Zalo / Email)</th>
                    <th className="py-3 px-4 text-center min-w-[80px]">Tổng việc</th>
                    <th className="py-3 px-4 text-center min-w-[100px]">Chưa làm</th>
                    <th className="py-3 px-4 text-center min-w-[100px]">Đang làm</th>
                    <th className="py-3 px-4 text-center min-w-[100px]">Đã xong</th>
                    <th className="py-3 px-4 min-w-[130px]">Tỷ lệ hoàn thành</th>
                    <th className="py-3 px-4 text-center min-w-[140px]">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {employeeWorkloadList.map(({ employee, total, pending, inProgress, completed, rate }, idx) => (
                    <tr key={employee.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                              employee.avatarColor || 'bg-emerald-600'
                            }`}
                          >
                            {employee.name.split(' ').pop()?.charAt(0) || 'NV'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {employee.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Mã NV: {employee.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {employee.department || 'HR Group'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 text-[11px]">
                          {employee.phone ? (
                            <a
                              href={`https://zalo.me/${cleanPhoneForZalo(employee.phone)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-700 hover:underline flex items-center gap-1 font-mono"
                            >
                              <Phone className="w-3 h-3 text-sky-600" />
                              <span>{employee.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 text-[10px] italic">Chưa có SĐT</span>
                          )}
                          {employee.email && (
                            <a
                              href={`mailto:${employee.email}`}
                              className="text-slate-600 hover:text-emerald-700 hover:underline flex items-center gap-1 text-[10px]"
                            >
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[150px]">{employee.email}</span>
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold font-mono text-slate-900">
                        {total}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200">
                          {pending}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-sky-800 bg-sky-50 border border-sky-200">
                          {inProgress}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                          {completed}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between font-mono text-[10px]">
                            <span className="text-slate-500">{completed}/{total} xong</span>
                            <span className="font-bold text-emerald-700">{rate}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openAddModal('pending', employee.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                            title={`Giao việc trực tiếp cho ${employee.name}`}
                          >
                            <Send className="w-3 h-3" />
                            <span>Giao việc</span>
                          </button>
                          <button
                            onClick={() => {
                              setFilterEmployeeId(employee.id);
                              setViewMode('kanban');
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                            title="Xem các công việc của nhân sự này"
                          >
                            Xem việc
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. GIAO VIỆC MỚI / CHỈNH SỬA MODAL */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  {editingId ? <Edit className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingId ? 'Chỉnh Sửa Công Việc Đã Giao' : 'Giao Việc Mới Cho Nhân Sự'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chỉ định cá nhân phụ trách từ danh sách và gửi thông báo qua Zalo/Email
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdding(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4 pt-4 text-xs">
              {/* Filter by department & select employee */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Bộ phận phụ trách:
                    </label>
                    <select
                      value={formDepartment}
                      onChange={(e) => {
                        const newDept = e.target.value;
                        setFormDepartment(newDept);
                        const firstInDept = employees.find(
                          (emp) => newDept === 'all' || emp.department === newDept
                        );
                        if (firstInDept) setFormAssigneeId(firstInDept.id);
                      }}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="all">Tất cả bộ phận</option>
                      {departments.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Nhân viên nhận việc <span className="text-rose-500">*</span>:
                    </label>
                    <select
                      required
                      value={formAssigneeId}
                      onChange={(e) => setFormAssigneeId(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      {employees
                        .filter(
                          (emp) => formDepartment === 'all' || emp.department === formDepartment
                        )
                        .map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.id})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Selected Employee Preview Info Card */}
                {(() => {
                  const emp = getEmployee(formAssigneeId);
                  if (!emp) return null;
                  return (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                            emp.avatarColor || 'bg-emerald-600'
                          }`}
                        >
                          {emp.name.split(' ').pop()?.charAt(0) || 'NV'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{emp.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Mã: {emp.id} • {emp.department || 'HR Group'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right text-[10px]">
                        {emp.phone && (
                          <div className="text-sky-700 font-mono flex items-center gap-1 justify-end">
                            <MessageSquare className="w-3 h-3 text-sky-600" />
                            <span>Zalo: {emp.phone}</span>
                          </div>
                        )}
                        {emp.email && (
                          <div className="text-slate-500 truncate max-w-[150px]">
                            {emp.email}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Task Title */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Tiêu đề công việc <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Đối soát bảng kê tiền ăn ngoài chu kỳ 26/09 - 25/10"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Yêu cầu công việc / Mô tả chi tiết:
                </label>
                <textarea
                  rows={3}
                  placeholder="Yêu cầu cụ thể, danh sách nhà ăn/bếp cần kiểm tra, tiêu chí kết quả..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
                />
              </div>

              {/* Grid: DueDate & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Hạn chót hoàn thành:
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Mức độ ưu tiên:
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
                  >
                    <option value="urgent">🔴 Khẩn cấp (Gấp)</option>
                    <option value="high">🟠 Ưu tiên cao</option>
                    <option value="medium">🔵 Trung bình</option>
                    <option value="low">⚪ Tiêu chuẩn</option>
                  </select>
                </div>
              </div>

              {/* Grid: Initial Status & Progress */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Trạng thái ban đầu:
                  </label>
                  <select
                    value={status}
                    onChange={(e) => {
                      const newSt = e.target.value as Task['status'];
                      setStatus(newSt);
                      if (newSt === 'completed') setProgress(100);
                      else if (newSt === 'in-progress' && progress === 0) setProgress(30);
                    }}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
                  >
                    <option value="pending">🟡 Chưa triển khai</option>
                    <option value="in-progress">🔵 Đang triển khai</option>
                    <option value="completed">🟢 Đã hoàn thành</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Tiến độ: <span className="font-mono text-emerald-700 font-bold">{progress}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={progress}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setProgress(val);
                      if (val >= 100) setStatus('completed');
                      else if (val > 0 && status === 'pending') setStatus('in-progress');
                    }}
                    className="w-full accent-emerald-600 mt-2 cursor-pointer"
                  />
                </div>
              </div>

              {/* Result Note if completed */}
              {status === 'completed' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Báo cáo kết quả hoàn thành:
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Đã hoàn tất đối soát 100% hồ sơ tiền ăn..."
                    value={resultNote}
                    onChange={(e) => setResultNote(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
                  />
                </div>
              )}

              {/* Notification options upon save */}
              {!editingId && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                    <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tùy chọn thông báo nhiệm vụ ngay sau khi giao:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={notifyViaZalo}
                        onChange={(e) => setNotifyViaZalo(e.target.checked)}
                        className="rounded accent-emerald-600 w-3.5 h-3.5"
                      />
                      <span className="text-sky-900 font-medium">💬 Gửi qua Zalo</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={notifyViaEmail}
                        onChange={(e) => setNotifyViaEmail(e.target.checked)}
                        className="rounded accent-emerald-600 w-3.5 h-3.5"
                      />
                      <span className="text-emerald-900 font-medium">✉️ Gửi qua Email</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Google Calendar Sync Option */}
              <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                    <CalendarDays className="w-3.5 h-3.5 text-sky-600" />
                    <span>Đồng bộ lên Google Calendar (Google 캘린더):</span>
                  </div>
                  {googleCalendarUser ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      <span className="truncate max-w-[130px]">{googleCalendarUser.displayName || googleCalendarUser.email || 'Đã kết nối'}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isCalendarConnecting}
                      onClick={handleConnectGoogleCalendar}
                      className="text-[10px] text-sky-700 bg-white border border-sky-300 hover:bg-sky-50 font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                      <span>{isCalendarConnecting ? 'Đang kết nối...' : 'Kết nối Google'}</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2 text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={syncToGoogleCalendar}
                      onChange={(e) => setSyncToGoogleCalendar(e.target.checked)}
                      className="rounded accent-sky-600 w-3.5 h-3.5"
                    />
                    <span className="text-slate-800 font-semibold">
                      Tự động tạo sự kiện nhắc lịch trên Google Calendar
                    </span>
                  </label>

                  {syncToGoogleCalendar && (
                    <div className="pl-5 space-y-1.5 pt-1 border-t border-sky-100">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="calTimeType"
                            checked={isAllDay}
                            onChange={() => setIsAllDay(true)}
                            className="accent-sky-600"
                          />
                          <span className="text-slate-700 font-medium">Cả ngày (Hạn {dueDate})</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="calTimeType"
                            checked={!isAllDay}
                            onChange={() => setIsAllDay(false)}
                            className="accent-sky-600"
                          />
                          <span className="text-slate-700 font-medium">Chọn giờ</span>
                        </label>
                      </div>

                      {!isAllDay && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-slate-500 text-[10px]">Từ:</span>
                          <input
                            type="time"
                            value={calendarStartTime}
                            onChange={(e) => setCalendarStartTime(e.target.value)}
                            className="p-1 bg-white border border-slate-300 rounded font-mono text-xs"
                          />
                          <span className="text-slate-500 text-[10px]">Đến:</span>
                          <input
                            type="time"
                            value={calendarEndTime}
                            onChange={(e) => setCalendarEndTime(e.target.value)}
                            className="p-1 bg-white border border-slate-300 rounded font-mono text-xs"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingId ? 'Cập Nhật Công Việc' : 'Giao Việc Ngay'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL CẬP NHẬT TIẾN ĐỘ & BÁO CÁO KẾT QUẢ CÔNG VIỆC */}
      {progressModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Cập Nhật Tiến Độ & Điền Kết Quả
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lựa chọn tiến độ thực tế và điền báo cáo kết quả hoàn thành
                  </p>
                </div>
              </div>
              <button
                onClick={() => setProgressModalTask(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickProgress} className="space-y-4 pt-4 text-xs">
              <div>
                <span className="text-slate-500 text-[11px]">Nhiệm vụ:</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">
                  {progressModalTask.title}
                </p>
                <div className="flex items-center justify-between text-xs mt-1.5 text-slate-600">
                  <span>
                    Người phụ trách: <strong>{getEmployee(progressModalTask.employeeId)?.name}</strong>
                  </span>
                  <span className="font-mono text-slate-500">
                    Hạn: {progressModalTask.dueDate.split('-').reverse().join('/')}
                  </span>
                </div>
              </div>

              {/* 3 Status Choices Buttons (Chưa triển khai | Đang triển khai | Hoàn thành) */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Lựa chọn trạng thái tiến độ:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickStatus('pending');
                      setQuickProgress(0);
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      quickStatus === 'pending'
                        ? 'bg-amber-100 text-amber-950 border-amber-400 font-bold shadow-2xs ring-2 ring-amber-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-sm mb-0.5">🟡</div>
                    <div className="font-bold">Chưa triển khai</div>
                    <div className="text-[10px] text-slate-400 font-mono">0%</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuickStatus('in-progress');
                      if (quickProgress === 0 || quickProgress === 100) setQuickProgress(50);
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      quickStatus === 'in-progress'
                        ? 'bg-sky-100 text-sky-950 border-sky-400 font-bold shadow-2xs ring-2 ring-sky-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-sm mb-0.5">🔵</div>
                    <div className="font-bold">Đang triển khai</div>
                    <div className="text-[10px] text-slate-400 font-mono">10% - 90%</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuickStatus('completed');
                      setQuickProgress(100);
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      quickStatus === 'completed'
                        ? 'bg-emerald-100 text-emerald-950 border-emerald-400 font-bold shadow-2xs ring-2 ring-emerald-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-sm mb-0.5">🟢</div>
                    <div className="font-bold">Hoàn thành</div>
                    <div className="text-[10px] text-slate-400 font-mono">100%</div>
                  </button>
                </div>
              </div>

              {/* Progress Slider & Quick preset buttons */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>Tiến độ thực hiện:</span>
                  <span className="text-base font-mono font-extrabold text-emerald-700">
                    {quickProgress}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={quickProgress}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setQuickProgress(val);
                    if (val >= 100) setQuickStatus('completed');
                    else if (val > 0) setQuickStatus('in-progress');
                    else setQuickStatus('pending');
                  }}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between gap-1 pt-1">
                  {[0, 25, 50, 75, 100].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => {
                        setQuickProgress(step);
                        if (step >= 100) setQuickStatus('completed');
                        else if (step > 0) setQuickStatus('in-progress');
                        else setQuickStatus('pending');
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                        quickProgress === step
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {step}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Result Note input with quick suggestion pills */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Điền kết quả thực hiện / Báo cáo hoàn thành:
                </label>
                <textarea
                  rows={3}
                  required={quickStatus === 'completed'}
                  placeholder="Nhập chi tiết kết quả đạt được, số liệu minh chứng, link file hoặc các vướng mắc..."
                  value={quickResultNote}
                  onChange={(e) => setQuickResultNote(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
                />
                {/* Suggestions chips */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className="text-[10px] text-slate-400 self-center">Gợi ý:</span>
                  {[
                    'Đã hoàn thành đúng hạn 100%',
                    'Đã đối soát xong bảng kê tiền ăn',
                    'Đã nộp báo cáo cho quản lý',
                    'Đang chờ phản hồi từ các bếp',
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setQuickResultNote(sug)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full cursor-pointer transition-colors"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProgressModalTask(null)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Lưu Tiến Độ & Kết Quả
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL THÔNG BÁO NHIỆM VỤ QUA ZALO / EMAIL */}
      {notificationTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Thông Báo Nhiệm Vụ Đến Nhân Viên
                  </h3>
                  <p className="text-xs text-slate-500">
                    Gửi trực tiếp qua ứng dụng Zalo hoặc Email của nhân sự
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNotificationTask(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Employee Information Card */}
            {(() => {
              const emp = getEmployee(notificationTask.task.employeeId);
              const { subject, bodyText } = generateNotificationContent(notificationTask.task);
              const cleanPhone = cleanPhoneForZalo(emp?.phone);

              return (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                            emp?.avatarColor || 'bg-emerald-600'
                          }`}
                        >
                          {emp?.name.split(' ').pop()?.charAt(0) || 'NV'}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900">{emp?.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono ml-2">
                            ({emp?.id})
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {emp?.department || 'HR Group'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/60 font-mono">
                      <div className="flex items-center gap-1 text-sky-800">
                        <Phone className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span>SĐT/Zalo: <strong>{emp?.phone || 'Chưa có'}</strong></span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-700 truncate">
                        <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{emp?.email || 'Chưa có'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Channel Action Buttons: Zalo & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Zalo Card */}
                    <div className="p-3.5 bg-sky-50/80 border border-sky-200 rounded-xl space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between font-bold text-sky-950 mb-1">
                          <span className="flex items-center gap-1.5">
                            <MessageSquare className="w-4 h-4 text-sky-600" />
                            Gửi Qua Zalo
                          </span>
                          <span className="text-[10px] bg-sky-200 text-sky-900 px-1.5 py-0.2 rounded font-mono">
                            Zalo Chat
                          </span>
                        </div>
                        <p className="text-[11px] text-sky-800">
                          Mở cuộc trò chuyện Zalo với số điện thoại nhân sự và gửi tin nhắn soạn sẵn.
                        </p>
                      </div>

                      <div className="space-y-1.5 pt-2">
                        <button
                          type="button"
                          onClick={() => handleOpenZaloChat(notificationTask.task)}
                          className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Mở Chat Zalo Ngay</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(bodyText, 'tin nhắn Zalo')}
                          className="w-full py-1.5 bg-white hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-lg font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer text-[11px]"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Sao chép nội dung Zalo</span>
                        </button>
                      </div>
                    </div>

                    {/* Email Card */}
                    <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between font-bold text-emerald-950 mb-1">
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-4 h-4 text-emerald-600" />
                            Gửi Qua Email
                          </span>
                          <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-mono">
                            Mailto
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800">
                          Mở ứng dụng Outlook/Gmail với tiêu đề và nội dung nhiệm vụ chuẩn hóa.
                        </p>
                      </div>

                      <div className="space-y-1.5 pt-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEmail(notificationTask.task)}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Gửi Email Nhiệm Vụ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(bodyText, 'nội dung Email')}
                          className="w-full py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer text-[11px]"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Sao chép nội dung Email</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Pre-formatted Message Content Preview */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span>Xem trước nội dung thông báo gửi đến nhân viên:</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(bodyText, 'toàn bộ thông báo')}
                        className="text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Sao chép tất cả</span>
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-[10px] text-slate-800 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed select-all">
                      {bodyText}
                    </pre>
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setNotificationTask(null)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold cursor-pointer"
                    >
                      Đã Xong
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable Sub-Card for Task (Kanban item)
interface TaskCardProps {
  task: Task;
  assignee?: Employee;
  assigner?: Employee;
  onEdit: () => void;
  onDelete: () => void;
  onProgressClick: () => void;
  onStatusChange: (status: Task['status']) => void;
  onNotifyClick: () => void;
  onZaloClick: () => void;
  onEmailClick: () => void;
  onCalendarSync?: () => void;
  getDueBadge: (dueDate: string, isCompleted: boolean) => React.ReactNode;
  getPriorityBadge: (p?: Task['priority']) => React.ReactNode;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  assignee,
  assigner,
  onEdit,
  onDelete,
  onProgressClick,
  onStatusChange,
  onNotifyClick,
  onZaloClick,
  onEmailClick,
  onCalendarSync,
  getDueBadge,
  getPriorityBadge,
}) => {
  const isCompleted = task.status === 'completed';
  const isInProgress = task.status === 'in-progress';
  const isPending = task.status === 'pending';

  return (
    <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between space-y-3">
      <div className="space-y-2">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-1 text-[11px]">
          <div>{getPriorityBadge(task.priority)}</div>
          <div>{getDueBadge(task.dueDate, isCompleted)}</div>
        </div>

        {/* Task Title */}
        <h4 className="font-bold text-slate-900 text-xs leading-snug">
          {task.title}
        </h4>

        {/* Description */}
        {task.description && (
          <p className="text-[11px] text-slate-500 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Result note if completed or filled */}
        {task.resultNote && (
          <div className="p-2 bg-emerald-50 rounded-lg text-[10px] text-emerald-900 border border-emerald-200">
            <strong>Báo cáo kết quả:</strong> {task.resultNote}
          </div>
        )}

        {/* Assignee Information & Quick Contacts */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 ${
                assignee?.avatarColor || 'bg-emerald-600'
              }`}
            >
              {assignee?.name.split(' ').pop()?.charAt(0) || 'NV'}
            </div>
            <div>
              <span className="font-bold text-slate-800 truncate block max-w-[120px]">
                {assignee ? assignee.name : task.employeeId}
              </span>
              <span className="text-[9px] text-slate-400 block font-mono">
                {assignee?.department || 'HR Group'}
              </span>
            </div>
          </div>

          {/* Quick Notification Contact Icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={onZaloClick}
              title={`Gửi tin nhắn Zalo (${assignee?.phone || 'Chưa có SĐT'})`}
              className="p-1 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onEmailClick}
              title={`Gửi email (${assignee?.email || 'Chưa có email'})`}
              className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
            </button>
            {/* Google Calendar Action */}
            {task.googleCalendarLink ? (
              <a
                href={task.googleCalendarLink}
                target="_blank"
                rel="noreferrer"
                title="Mở sự kiện trên Google Calendar"
                className="p-1 text-sky-700 hover:text-sky-900 hover:bg-sky-50 rounded transition-colors cursor-pointer"
              >
                <CalendarCheck className="w-3.5 h-3.5 text-sky-600" />
              </a>
            ) : (
              onCalendarSync && (
                <button
                  onClick={onCalendarSync}
                  title="Đăng ký lên Google Calendar"
                  className="p-1 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded transition-colors cursor-pointer"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                </button>
              )
            )}
            <button
              onClick={onNotifyClick}
              title="Mở menu thông báo Zalo / Email"
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3 Status Buttons for the Employee: [Chưa làm] [Đang làm] [Hoàn thành] */}
      <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
        {/* Progress Bar & Click to Report */}
        <div
          onClick={onProgressClick}
          className="cursor-pointer space-y-1 hover:opacity-80 transition-opacity"
          title="Bấm để cập nhật tiến độ & điền kết quả"
        >
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Tiến độ hoàn thành:</span>
            <span className="font-mono font-bold text-slate-900">{task.progress ?? 0}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isCompleted
                  ? 'bg-emerald-500'
                  : isInProgress
                  ? 'bg-sky-500'
                  : 'bg-amber-400'
              }`}
              style={{ width: `${task.progress ?? 0}%` }}
            />
          </div>
        </div>

        {/* 3 Quick Status Selector Buttons directly on the card */}
        <div className="grid grid-cols-3 gap-1 pt-0.5">
          <button
            type="button"
            onClick={() => onStatusChange('pending')}
            className={`py-1 px-1 rounded text-[10px] font-bold text-center transition-all cursor-pointer ${
              isPending
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-transparent'
            }`}
          >
            🟡 Chưa làm
          </button>
          <button
            type="button"
            onClick={() => onStatusChange('in-progress')}
            className={`py-1 px-1 rounded text-[10px] font-bold text-center transition-all cursor-pointer ${
              isInProgress
                ? 'bg-sky-100 text-sky-900 border border-sky-300 shadow-2xs'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-transparent'
            }`}
          >
            🔵 Đang làm
          </button>
          <button
            type="button"
            onClick={() => onStatusChange('completed')}
            className={`py-1 px-1 rounded text-[10px] font-bold text-center transition-all cursor-pointer ${
              isCompleted
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-transparent'
            }`}
          >
            🟢 Hoàn thành
          </button>
        </div>

        {/* Action Controls & Report Result button */}
        <div className="flex items-center justify-between pt-1 text-[11px]">
          <button
            onClick={onProgressClick}
            className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 hover:underline cursor-pointer text-[11px]"
          >
            <Sliders className="w-3 h-3" />
            <span>Điền kết quả</span>
          </button>

          {/* Edit / Delete Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              title="Sửa chi tiết"
              className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              title="Xóa công việc"
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
