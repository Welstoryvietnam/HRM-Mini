/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from './components/Header';
import { CycleSelector } from './components/CycleSelector';
import { SummaryStats } from './components/SummaryStats';
import { SummaryTable } from './components/SummaryTable';
import { MatrixCheckin } from './components/MatrixCheckin';
import { PersonalCheckin } from './components/PersonalCheckin';
import { EmployeeManager } from './components/EmployeeManager';
import { EmployeeDetailModal } from './components/EmployeeDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { PrintTemplate } from './components/PrintTemplate';
import { LoginModal } from './components/LoginModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { UserProfileModal } from './components/UserProfileModal';
import { YearMonthDashboard } from './components/YearMonthDashboard';
import { MBOManager } from './components/MBOManager';
import { TaskManager } from './components/TaskManager';
import { NoteManager } from './components/NoteManager';
import { AIChatBot } from './components/AIChatBot';
import { SendNotificationEmailModal } from './components/SendNotificationEmailModal';
import { Employee, EmployeeMealData, CycleConfig, AppSettings, AuthUser, MealSession, PasswordResetRequest, MBO, Task, AppNotification, WorkNote } from './types';
import { getCurrentCycle, isFutureDate } from './utils/cycleHelper';
import { INITIAL_EMPLOYEES, INITIAL_MEAL_DATA, DEFAULT_SETTINGS, INITIAL_MBOS, INITIAL_TASKS, INITIAL_NOTIFICATIONS, INITIAL_NOTES } from './utils/initialData';
import { 
  exportSmartMealAllowanceToExcel, 
  exportIndividualMealAllowanceToExcel 
} from './utils/excelExport';
import {
  fetchServerData,
  fetchTasksFromServer,
  saveMealOnServer,
  batchCheckinOnServer,
  syncEmployeesOnServer,
  requestPasswordResetOnServer,
  approvePasswordResetOnServer,
  rejectPasswordResetOnServer,
  saveSettingsOnServer,
  replaceMealsOnServer,
} from './utils/api';
import {
  broadcastLiveEvent,
  subscribeToLiveEvents,
  fetchMasterCloudData,
  saveMasterMealDataToCloud,
} from './utils/cloudSync';
import {
  subscribeToMealsRealtime,
  saveMealRecordToFirestore,
  fetchAllMealsFromFirestore,
  subscribeToSystemRealtime,
  saveSystemConfigToFirestore,
  subscribeToTasksRealtime,
  saveTaskToFirestore,
  deleteTaskFromFirestore,
  saveAllTasksToFirestore,
  fetchAllTasksFromFirestore,
} from './utils/firebase';

function mergeTasksByTimestamp(existing: Task[], incoming: Task[]): Task[] {
  const map = new Map<string, Task>();
  existing.forEach((t) => map.set(t.id, t));
  incoming.forEach((inc) => {
    const cur = map.get(inc.id);
    if (!cur) {
      map.set(inc.id, inc);
    } else {
      const curTime = cur.updatedAt ? new Date(cur.updatedAt).getTime() : 0;
      const incTime = inc.updatedAt ? new Date(inc.updatedAt).getTime() : 0;
      if (incTime >= curTime) {
        map.set(inc.id, inc);
      }
    }
  });
  return Array.from(map.values());
}

export default function App() {
  // Load persistent state from localStorage with migration to remove Lê Đăng Đoàn & update Welstory / HR Group
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem('meal_employees_v2');
      if (saved) {
        const parsed: Employee[] = JSON.parse(saved);
        const filtered = parsed.filter((e) => e.id !== '2511198718');
        const existingIds = new Set(filtered.map((e) => e.id));
        const merged = [
          ...filtered,
          ...INITIAL_EMPLOYEES.filter((e) => !existingIds.has(e.id)),
        ].map((e) => (e.id === '1603186689' ? { ...e, role: 'admin' as const, notes: 'Quản trị viên hệ thống (Admin)' } : e));
        localStorage.setItem('meal_employees_v2', JSON.stringify(merged));
        return merged;
      }
    } catch (e) {
      console.error('Error loading saved employees', e);
    }
    return INITIAL_EMPLOYEES;
  });

  const [mealData, setMealData] = useState<Record<string, EmployeeMealData>>(() => {
    try {
      // Clear meal data requested by user - migrate to v3 with empty initial state
      const isCleared = localStorage.getItem('meal_records_cleared_v3');
      if (!isCleared) {
        localStorage.setItem('meal_records_cleared_v3', 'true');
        localStorage.removeItem('meal_records_v2');
        localStorage.setItem('meal_records_v3', JSON.stringify({}));
        return {};
      }
      const saved = localStorage.getItem('meal_records_v3');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading saved meal data', e);
    }
    return {};
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('meal_settings_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.preparerName === 'Lê Đăng Đoàn') {
          parsed.preparerName = 'Nguyễn Văn Hùng';
        }
        if (!parsed.companyName || parsed.companyName.includes('CÔNG TY CỔ PHẦN TẬP ĐOÀN') || parsed.companyName.includes('ĐẦU TƯ')) {
          parsed.companyName = 'Công ty TNHH Welstory Việt Nam';
        }
        if (!parsed.departmentName || parsed.departmentName === 'HUMAN RESOURCES' || parsed.departmentName.includes('Bộ phận Tuyển dụng')) {
          parsed.departmentName = 'HR Group';
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error loading saved settings', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Current logged in user: Always null on opening via link, requiring user to log in first!
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      // Only keep session if active in the current tab session
      const sessionSaved = sessionStorage.getItem('meal_auth_user_session_v3');
      if (sessionSaved) {
        const parsed: AuthUser = JSON.parse(sessionSaved);
        if (parsed?.id && parsed.id !== '2511198718') {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading session auth user', e);
    }
    // Return null so any opening of the link starts at the login screen first
    return null;
  });

  const [cycle, setCycle] = useState<CycleConfig>(() => getCurrentCycle());
  const [mbos, setMbos] = useState<MBO[]>(() => {
    try {
      localStorage.removeItem('welstory_mbos_v1');
      const saved = localStorage.getItem('welstory_mbos_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading saved MBOs', e);
    }
    return INITIAL_MBOS;
  });
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      // Clean up legacy mock data
      localStorage.removeItem('welstory_tasks_v1');
      const saved = localStorage.getItem('welstory_tasks_v2');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading saved tasks', e);
    }
    return INITIAL_TASKS;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      // Clean up legacy mock data
      localStorage.removeItem('welstory_notifications_v1');
      const saved = localStorage.getItem('welstory_notifications_v2');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading saved notifications', e);
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [emailModalNotification, setEmailModalNotification] = useState<AppNotification | null>(null);

  const [activeTab, setActiveTab] = useState<'meal' | 'mbo' | 'tasks' | 'notes' | 'employees' | 'ai-chat'>('meal');
  const [activeMealTab, setActiveMealTab] = useState<'personal' | 'summary' | 'matrix' | 'dashboard'>('personal');
  const [showFloatingAIChat, setShowFloatingAIChat] = useState(false);
  const [notes, setNotes] = useState<WorkNote[]>(() => {
    try {
      const saved = localStorage.getItem('welstory_notes_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading notes', e);
    }
    return INITIAL_NOTES;
  });

  useEffect(() => {
    try {
      localStorage.setItem('welstory_notes_v1', JSON.stringify(notes));
    } catch (e) {
      console.error('Error saving notes', e);
    }
  }, [notes]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(() => {
    try {
      const savedUser = localStorage.getItem('meal_auth_user_v2');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.id && parsed.id !== 'admin') {
          return parsed.id;
        }
      }
    } catch (e) {
      console.error('Error loading saved auth user for selectedEmployeeId', e);
    }
    return INITIAL_EMPLOYEES[0]?.id || '';
  });

  // Keep selectedEmployeeId synchronized with the logged-in user
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && employees.some((e) => e.id === currentUser.id)) {
      setSelectedEmployeeId(currentUser.id);
    }
  }, [currentUser, employees]);

  // Modals
  const [detailModalEmployee, setDetailModalEmployee] = useState<Employee | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  // Password reset requests submitted by employees for Admin approval
  const [passwordRequests, setPasswordRequests] = useState<PasswordResetRequest[]>(() => {
    try {
      const saved = localStorage.getItem('meal_password_requests_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading password requests', e);
    }
    return [];
  });

  const mealDataRef = useRef<Record<string, EmployeeMealData>>(mealData);
  useEffect(() => {
    mealDataRef.current = mealData;
  }, [mealData]);

  const [syncToast, setSyncToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setSyncToast({ message, type });
    setTimeout(() => {
      setSyncToast((curr) => (curr?.message === message ? null : curr));
    }, 3500);
  };

  const lastServerVersionRef = useRef<number>(0);
  const tasksRef = useRef<Task[]>(tasks);
  tasksRef.current = tasks;
  const isFirestoreTasksIncomingRef = useRef<boolean>(false);

  // Sync state from cloud & real-time SSE live events across all devices
  useEffect(() => {
    let isMounted = true;

    // 0. Firestore Real-time listeners across ALL devices (< 200ms)
    const unsubscribeFirestoreMeals = subscribeToMealsRealtime((firestoreMeals) => {
      if (!isMounted || !firestoreMeals) return;
      if (Object.keys(firestoreMeals).length > 0) {
        setMealData((prev) => {
          const merged = { ...prev, ...firestoreMeals };
          mealDataRef.current = merged;
          return merged;
        });
        showNotification('Firebase: Đã đồng bộ dữ liệu thời gian thực!', 'info');
      }
    });

    const unsubscribeFirestoreTasks = subscribeToTasksRealtime((firestoreTasks) => {
      if (!isMounted || !firestoreTasks) return;
      if (firestoreTasks.length > 0) {
        isFirestoreTasksIncomingRef.current = true;
        setTasks(firestoreTasks);
        showNotification('Firebase: Đã đồng bộ nhiệm vụ thời gian thực!', 'info');
      } else if (tasksRef.current && tasksRef.current.length > 0) {
        saveAllTasksToFirestore(tasksRef.current);
      }
    });

    const unsubscribeFirestoreSystem = subscribeToSystemRealtime((sysConfig) => {
      if (!isMounted || !sysConfig) return;
      if (sysConfig.employees && sysConfig.employees.length > 0) {
        const existingIds = new Set(sysConfig.employees.map((e: any) => e.id));
        const merged = [
          ...sysConfig.employees,
          ...INITIAL_EMPLOYEES.filter((e) => !existingIds.has(e.id)),
        ].map((e) => (e.id === '1603186689' ? { ...e, role: 'admin' as const, notes: 'Quản trị viên hệ thống (Admin)' } : e));
        setEmployees(merged);
      }
      if (sysConfig.settings) {
        setSettings(sysConfig.settings);
      }
      if (sysConfig.passwordRequests) {
        setPasswordRequests(sysConfig.passwordRequests);
      }
      if (sysConfig.notifications && Array.isArray(sysConfig.notifications)) {
        setNotifications(sysConfig.notifications);
      }
      if (sysConfig.tasks && Array.isArray(sysConfig.tasks) && sysConfig.tasks.length > 0) {
        setTasks((prev) => mergeTasksByTimestamp(prev, sysConfig.tasks!));
      }
    });

    // 1. Listen to instant live broadcast events from all devices (< 500ms)
    const unsubscribeLive = subscribeToLiveEvents((event) => {
      if (!isMounted || !event) return;
      if (event.type === 'MASTER_SYNC' && event.mealData) {
        mealDataRef.current = event.mealData;
        setMealData(event.mealData);
        showNotification('Đã nhận cập nhật chấm cơm thời gian thực từ thiết bị khác!', 'info');
      } else if (event.type === 'NEW_NOTIFICATION' && event.notification) {
        setNotifications((prev) => {
          const filtered = prev.filter((n) => n.id !== event.notification.id);
          return [event.notification, ...filtered];
        });
        showNotification(`Thông báo mới: ${event.notification.title}`, 'info');
      } else if (event.type === 'NOTIFICATIONS_SYNC' && event.notifications) {
        setNotifications(event.notifications);
      } else if (event.type === 'task_saved' && event.task) {
        setTasks((prev) => {
          const map = new Map<string, Task>();
          prev.forEach((t) => map.set(t.id, t));
          map.set(event.task.id, event.task);
          return Array.from(map.values());
        });
      } else if (event.type === 'task_deleted' && event.taskId) {
        setTasks((prev) => prev.filter((t) => t.id !== event.taskId));
      } else if (event.type === 'tasks_update' && Array.isArray(event.tasks)) {
        setTasks((prev) => mergeTasksByTimestamp(prev, event.tasks));
      } else if (event.type === 'MEAL_SAVE' && event.allRecords) {
        setMealData((prev) => {
          const next = {
            ...prev,
            [event.employeeId]: {
              employeeId: event.employeeId,
              records: event.allRecords,
            },
          };
          mealDataRef.current = next;
          return next;
        });
      } else if (event.type === 'MEAL_BATCH' && event.records) {
        setMealData((prev) => {
          const next = {
            ...prev,
            [event.employeeId]: {
              employeeId: event.employeeId,
              records: event.records,
            },
          };
          mealDataRef.current = next;
          return next;
        });
      } else if (event.type === 'PASSWORD_REQUEST') {
        if (event.request) {
          setPasswordRequests((prev) => {
            const filtered = prev.filter((r) => r.id !== event.request.id);
            return [event.request, ...filtered];
          });
        }
      } else if (event.type === 'PASSWORD_RESOLVED') {
        if (event.requestId) {
          setPasswordRequests((prev) =>
            prev.map((r) =>
              r.id === event.requestId ? { ...r, status: event.status } : r
            )
          );
        }
        if (event.employees) {
          setEmployees(event.employees);
        }
      }
    });

    // 2. Fetch master cloud database on startup
    fetchMasterCloudData().then((cloud) => {
      if (!isMounted || !cloud) return;
      if (cloud.mealData && Object.keys(cloud.mealData).length > 0) {
        setMealData((prev) => {
          const merged = { ...prev };
          Object.entries(cloud.mealData!).forEach(([empId, empMeal]) => {
            if (empMeal && empMeal.records) {
              merged[empId] = {
                employeeId: empId,
                records: { ...empMeal.records },
              };
            }
          });
          mealDataRef.current = merged;
          return merged;
        });
      }
      if (cloud.employees && Array.isArray(cloud.employees) && cloud.employees.length > 0) {
        const existingIds = new Set(cloud.employees.map((e: any) => e.id));
        const merged = [
          ...cloud.employees,
          ...INITIAL_EMPLOYEES.filter((e) => !existingIds.has(e.id)),
        ].map((e) => (e.id === '1603186689' ? { ...e, role: 'admin' as const, notes: 'Quản trị viên hệ thống (Admin)' } : e));
        setEmployees(merged);
      }
      if (cloud.settings) {
        setSettings(cloud.settings);
      }
      if (cloud.passwordRequests) {
        setPasswordRequests(cloud.passwordRequests);
      }
      if (cloud.notifications && Array.isArray(cloud.notifications) && cloud.notifications.length > 0) {
        setNotifications(cloud.notifications);
      }
      if (cloud.tasks && Array.isArray(cloud.tasks) && cloud.tasks.length > 0) {
        setTasks((prev) => mergeTasksByTimestamp(prev, cloud.tasks!));
      }
    });

    // 3. Fallback server polling
    const syncFromServer = async () => {
      try {
        const data = await fetchServerData();
        if (!isMounted || !data) return;

        if (data.version && data.version !== lastServerVersionRef.current) {
          lastServerVersionRef.current = data.version;
          if (data.employees && Array.isArray(data.employees) && data.employees.length > 0) {
            const existingIds = new Set(data.employees.map((e: any) => e.id));
            const merged = [
              ...data.employees,
              ...INITIAL_EMPLOYEES.filter((e) => !existingIds.has(e.id)),
            ].map((e) => (e.id === '1603186689' ? { ...e, role: 'admin' as const, notes: 'Quản trị viên hệ thống (Admin)' } : e));
            setEmployees(merged);
          }
          if (data.mealData && Object.keys(data.mealData).length > 0) {
            setMealData((prev) => {
              const next = { ...prev, ...data.mealData };
              mealDataRef.current = next;
              return next;
            });
          }
          if (data.settings) {
            setSettings(data.settings);
          }
          if (data.passwordRequests) {
            setPasswordRequests(data.passwordRequests);
          }
          if (data.tasks && Array.isArray(data.tasks) && data.tasks.length > 0) {
            setTasks((prev) => mergeTasksByTimestamp(prev, data.tasks!));
          }
        }
      } catch (err) {
        // silent fallback to cloud
      }
    };

    // Initial fetch
    syncFromServer();

    // Direct initial tasks sync from server so any new machine gets the latest tasks immediately
    fetchTasksFromServer().then((srvTasks) => {
      if (!isMounted || !srvTasks || !Array.isArray(srvTasks)) return;
      if (srvTasks.length > 0) {
        setTasks((prev) => mergeTasksByTimestamp(prev, srvTasks));
      }
    });

    const interval = setInterval(syncFromServer, 3000);

    const handleFocus = () => {
      syncFromServer();
      fetchTasksFromServer().then((srvTasks) => {
        if (!isMounted || !srvTasks || !Array.isArray(srvTasks)) return;
        if (srvTasks.length > 0) {
          setTasks((prev) => mergeTasksByTimestamp(prev, srvTasks));
        }
      });
      fetchMasterCloudData().then((cloud) => {
        if (!isMounted || !cloud) return;
        if (cloud.mealData && Object.keys(cloud.mealData).length > 0) {
          setMealData((prev) => {
            const merged = { ...prev };
            Object.entries(cloud.mealData!).forEach(([empId, empMeal]) => {
              if (empMeal && empMeal.records) {
                merged[empId] = {
                  employeeId: empId,
                  records: { ...empMeal.records },
                };
              }
            });
            mealDataRef.current = merged;
            return merged;
          });
        }
      });
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      isMounted = false;
      unsubscribeFirestoreMeals();
      unsubscribeFirestoreTasks();
      unsubscribeFirestoreSystem();
      unsubscribeLive();
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  // Sync passwordRequests with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('meal_password_requests_v2', JSON.stringify(passwordRequests));
    } catch (e) {
      console.error('Failed to save password requests', e);
    }
  }, [passwordRequests]);

  // Sync with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('meal_employees_v2', JSON.stringify(employees));
    } catch (e) {
      console.error('Failed to save employees', e);
    }
  }, [employees]);

  useEffect(() => {
    try {
      localStorage.setItem('meal_records_v3', JSON.stringify(mealData));
    } catch (e) {
      console.error('Failed to save mealData', e);
    }
  }, [mealData]);

  useEffect(() => {
    try {
      localStorage.setItem('meal_settings_v2', JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem('welstory_mbos_v2', JSON.stringify(mbos));
    } catch (e) {
      console.error('Failed to save mbos', e);
    }
  }, [mbos]);

  const isInitialTasksMount = useRef(true);
  useEffect(() => {
    try {
      localStorage.setItem('welstory_tasks_v2', JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save tasks', e);
    }

    if (isInitialTasksMount.current) {
      isInitialTasksMount.current = false;
      return;
    }

    // If update arrived from Firestore realtime listener, do not re-emit to prevent loops
    if (isFirestoreTasksIncomingRef.current) {
      isFirestoreTasksIncomingRef.current = false;
      fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, replace: true }),
      }).catch(() => {});
      return;
    }

    // 1. Central Server Sync
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks, replace: true }),
    }).catch((err) => console.warn('Sync tasks to server error:', err));

    // 2. Realtime Firestore Sync
    saveAllTasksToFirestore(tasks).catch((err) =>
      console.warn('Sync tasks to firestore error:', err)
    );

    // 3. Master Cloud & SSE Live Broadcast
    saveMasterMealDataToCloud(mealDataRef.current, { tasks }).catch((err) =>
      console.warn('Sync tasks to cloud error:', err)
    );
    broadcastLiveEvent({ type: 'tasks_update', tasks });
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem('welstory_notifications_v2', JSON.stringify(notifications));
    } catch (e) {
      console.error('Failed to save notifications', e);
    }
  }, [notifications]);

  useEffect(() => {
    try {
      if (currentUser) {
        sessionStorage.setItem('meal_auth_user_session_v3', JSON.stringify(currentUser));
      } else {
        sessionStorage.removeItem('meal_auth_user_session_v3');
      }
      // Clean up legacy localStorage key so it never auto-logs in
      localStorage.removeItem('meal_auth_user_v2');
    } catch (e) {
      console.error('Failed to sync auth user session', e);
    }
  }, [currentUser]);

  // Auth actions
  const handleLogin = (user: AuthUser) => {
    const effectiveUser: AuthUser =
      user.id === '1603186689' ? { ...user, role: 'admin' } : user;
    setCurrentUser(effectiveUser);
    setShowLoginModal(false);
    if (effectiveUser.role !== 'admin') {
      setSelectedEmployeeId(effectiveUser.id);
      setActiveTab('meal');
      setActiveMealTab('personal');
    } else {
      setSelectedEmployeeId(effectiveUser.id !== 'admin' ? effectiveUser.id : (employees[0]?.id || ''));
      setActiveTab('meal');
      setActiveMealTab('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('meal_auth_user_session_v3');
    localStorage.removeItem('meal_auth_user_v2');
    setShowLoginModal(true);
  };

  const handleSetEmployees = (newEmployees: Employee[]) => {
    setEmployees(newEmployees);
    syncEmployeesOnServer(newEmployees);
  };

  const handleUpdatePassword = (employeeId: string, newPass: string) => {
    setEmployees((prev) => {
      const updated = prev.map((e) => (e.id === employeeId ? { ...e, password: newPass } : e));
      syncEmployeesOnServer(updated);
      return updated;
    });
  };

  const handleUpdateProfile = (
    employeeId: string,
    updates: { phone?: string; email?: string; password?: string }
  ) => {
    setEmployees((prev) => {
      const updated = prev.map((e) => {
        if (e.id === employeeId) {
          return {
            ...e,
            phone: updates.phone !== undefined ? updates.phone : e.phone,
            email: updates.email !== undefined ? updates.email : e.email,
            password: updates.password !== undefined && updates.password !== '' ? updates.password : e.password,
          };
        }
        return e;
      });
      syncEmployeesOnServer(updated);
      return updated;
    });

    setCurrentUser((prev) => {
      if (!prev || prev.id !== employeeId) return prev;
      return {
        ...prev,
        phone: updates.phone !== undefined ? updates.phone : prev.phone,
        email: updates.email !== undefined ? updates.email : prev.email,
      };
    });

    showNotification('Đã cập nhật thông tin cá nhân (SĐT, Email, Mật khẩu) thành công!', 'success');
  };

  const handleSetSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettingsOnServer(newSettings);
  };

  const handleSetMealData = (newMealData: Record<string, EmployeeMealData>) => {
    setMealData(newMealData);
    replaceMealsOnServer(newMealData);
  };

  // Submit password reset request from employee
  const handleRequestPasswordReset = (
    employeeId: string,
    newPassword: string,
    reason?: string
  ): { success: boolean; message: string } => {
    const emp = employees.find((e) => e.id.toLowerCase() === employeeId.toLowerCase());
    if (!emp) {
      return { success: false, message: 'Không tìm thấy thông tin nhân viên trong hệ thống.' };
    }

    const newReq: PasswordResetRequest = {
      id: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      employeeId: emp.id,
      employeeName: emp.name,
      newPassword,
      reason: reason || undefined,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    setPasswordRequests((prev) => [newReq, ...prev]);
    requestPasswordResetOnServer({ employeeId: emp.id, newPassword, reason });
    return { success: true, message: 'Đã gửi yêu cầu đổi mật khẩu cho Admin duyệt.' };
  };

  // Admin approves password reset request -> employee password immediately updates
  const handleApprovePasswordReset = (requestId: string) => {
    const req = passwordRequests.find((r) => r.id === requestId);
    if (!req) return;

    // 1. Update employee's active password
    const updatedEmployees = employees.map((e) =>
      e.id === req.employeeId ? { ...e, password: req.newPassword } : e
    );
    setEmployees(updatedEmployees);

    // 2. Mark request as approved
    const updatedRequests = passwordRequests.map((r) =>
      r.id === requestId
        ? {
            ...r,
            status: 'approved' as const,
            reviewedAt: new Date().toISOString(),
            reviewedBy: currentUser?.name || 'Admin HR',
          }
        : r
    );
    setPasswordRequests(updatedRequests);

    // Sync to central server
    approvePasswordResetOnServer({ requestId, reviewedBy: currentUser?.name || 'Admin HR' });
  };

  // Admin rejects password reset request
  const handleRejectPasswordReset = (requestId: string, reason?: string) => {
    const updatedRequests = passwordRequests.map((r) =>
      r.id === requestId
        ? {
            ...r,
            status: 'rejected' as const,
            reviewedAt: new Date().toISOString(),
            reviewedBy: currentUser?.name || 'Admin HR',
          }
        : r
    );
    setPasswordRequests(updatedRequests);
    rejectPasswordResetOnServer({ requestId, reviewedBy: currentUser?.name || 'Admin HR' });
  };

  // Dispatch real-time notification to Admin & Department Managers
  const handleDispatchNotification = (
    notifData: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'>
  ) => {
    const newNotif: AppNotification = {
      ...notifData,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      readBy: [],
    };

    const nextNotifications = [newNotif, ...notifications];
    setNotifications(nextNotifications);

    // 1. Persist to Firestore
    saveSystemConfigToFirestore({
      employees,
      settings,
      passwordRequests,
      notifications: nextNotifications,
    });

    // 2. Broadcast live event across all devices
    broadcastLiveEvent({
      type: 'NEW_NOTIFICATION',
      notification: newNotif,
    });

    // 3. Save to master cloud
    saveMasterMealDataToCloud(mealData, {
      employees,
      settings,
      passwordRequests,
      notifications: nextNotifications,
      tasks: tasksRef.current,
    });

    // 4. Show toast notification on screen
    showNotification(`Thông báo mới: ${newNotif.title}`, 'info');

    // 5. If this is a progress update or completed result, suggest pushing email or open email modal
    if (notifData.type === 'task_result' || notifData.type === 'mbo_result' || (notifData.progress ?? 0) >= 100) {
      setEmailModalNotification(newNotif);
    }
  };

  const handleMarkNotificationAsRead = (id: string) => {
    if (!currentUser) return;
    const currentUserId = currentUser.id;
    const updated = notifications.map((n) =>
      n.id === id && !n.readBy.includes(currentUserId)
        ? { ...n, readBy: [...n.readBy, currentUserId] }
        : n
    );
    setNotifications(updated);
    saveSystemConfigToFirestore({ notifications: updated });
    broadcastLiveEvent({ type: 'NOTIFICATIONS_SYNC', notifications: updated });
  };

  const handleMarkAllNotificationsAsRead = () => {
    if (!currentUser) return;
    const currentUserId = currentUser.id;
    const updated = notifications.map((n) =>
      !n.readBy.includes(currentUserId)
        ? { ...n, readBy: [...n.readBy, currentUserId] }
        : n
    );
    setNotifications(updated);
    saveSystemConfigToFirestore({ notifications: updated });
    broadcastLiveEvent({ type: 'NOTIFICATIONS_SYNC', notifications: updated });
    showNotification('Đã đánh dấu tất cả thông báo là đã đọc!', 'success');
  };

  const handleClearAllNotifications = () => {
    if (confirm('Bạn có chắc chắn muốn xóa tất cả thông báo trong hệ thống?')) {
      setNotifications([]);
      saveSystemConfigToFirestore({ notifications: [] });
      broadcastLiveEvent({ type: 'NOTIFICATIONS_SYNC', notifications: [] });
      showNotification('Đã xóa danh sách thông báo!', 'info');
    }
  };

  const handleNavigateFromNotification = (type: 'task' | 'mbo', targetId: string) => {
    if (type === 'task') {
      setActiveTab('tasks');
    } else {
      setActiveTab('mbo');
    }
  };

  const handleQuickTaskStatusChange = (task: Task, newStatus: Task['status']) => {
    const isCompleted = newStatus === 'completed';
    const newProgress = isCompleted ? 100 : newStatus === 'in-progress' ? Math.max(task.progress || 30, 20) : 0;
    const updatedTask: Task = {
      ...task,
      status: newStatus,
      progress: newProgress,
      completedAt: isCompleted ? task.completedAt || new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updatedTask : t)));
    saveTaskToFirestore(updatedTask);
    broadcastLiveEvent({ type: 'task_saved', task: updatedTask });

    // Real-time dispatch notification
    handleDispatchNotification({
      type: 'task_progress',
      title: `Tiến độ nhiệm vụ: ${task.title}`,
      message: `${currentUser?.name || 'Nhân viên'} đã cập nhật trạng thái: "${
        newStatus === 'completed' ? 'Đã hoàn thành' : newStatus === 'in-progress' ? 'Đang thực hiện' : 'Chưa thực hiện'
      }" (${newProgress}%)`,
      employeeId: task.employeeId,
      employeeName: employees.find((e) => e.id === task.employeeId)?.name || task.employeeId,
      department: employees.find((e) => e.id === task.employeeId)?.department || 'HR Group',
      targetId: task.id,
      targetTitle: task.title,
      newStatus,
      progress: newProgress,
    });
    showNotification(`Đã cập nhật công việc sang "${newStatus === 'completed' ? 'Đã hoàn thành' : newStatus === 'in-progress' ? 'Đang thực hiện' : 'Chưa thực hiện'}"!`, 'success');
  };

  // Handler for single meal toggle (backward compatible)
  const handleToggleMeal = (
    employeeId: string,
    dateStr: string,
    mealsCount: number = 1,
    note?: string
  ) => {
    // Rule: Cannot check-in for future dates
    if (mealsCount > 0 && isFutureDate(dateStr)) {
      showNotification(`Quy tắc chấm ăn: Không thể chấm trước cho tương lai (Ngày ${dateStr})!`, 'warning');
      return;
    }
    handleSaveDayMeal(employeeId, dateStr, undefined, mealsCount, undefined, note);
  };

  // Comprehensive meal save supporting multiple meals, location, and purpose
  const handleSaveDayMeal = (
    employeeId: string,
    dateStr: string,
    sessions?: MealSession[],
    mealsCount?: number,
    location?: string,
    purpose?: string
  ) => {
    const count =
      mealsCount !== undefined
        ? mealsCount
        : sessions && sessions.length > 0
        ? sessions.length
        : 0;

    // Rule: Cannot check-in for future dates
    if (count > 0 && isFutureDate(dateStr)) {
      showNotification(`Quy tắc chấm ăn: Không thể chấm trước cho ngày tương lai (${dateStr})!`, 'warning');
      return;
    }

    const currentEmpData = mealDataRef.current[employeeId] || { employeeId, records: {} };
    const currentRecords = { ...currentEmpData.records };

    if (count <= 0) {
      delete currentRecords[dateStr];
    } else {
      const defaultSessions: MealSession[] = sessions || [
        {
          id: `${dateStr}_trua`,
          mealType: 'Bữa Trưa',
          startTime: '08:00',
          endTime: '17:00',
          location: location || currentRecords[dateStr]?.location || 'Bắc Ninh',
          purpose: purpose || currentRecords[dateStr]?.purpose || currentRecords[dateStr]?.note || 'Phỏng vấn',
          mealsCount: 1,
        },
      ];

      currentRecords[dateStr] = {
        date: dateStr,
        mealsCount: count,
        sessions: defaultSessions,
        location: location || defaultSessions[0]?.location || currentRecords[dateStr]?.location || 'Bắc Ninh',
        purpose: purpose || defaultSessions[0]?.purpose || currentRecords[dateStr]?.purpose || currentRecords[dateStr]?.note || 'Phỏng vấn',
        note: purpose || currentRecords[dateStr]?.note,
      };
    }

    const nextMealData = {
      ...mealDataRef.current,
      [employeeId]: {
        employeeId,
        records: currentRecords,
      },
    };

    mealDataRef.current = nextMealData;
    setMealData(nextMealData);

    try {
      localStorage.setItem('meal_records_v3', JSON.stringify(nextMealData));
    } catch (e) {}

    // 1. Save directly to Google Cloud Firestore (Real-time DB)
    saveMealRecordToFirestore(employeeId, currentRecords);

    // 2. Broadcast live event with master data to all other devices (< 500ms)
    broadcastLiveEvent({
      type: 'MASTER_SYNC',
      mealData: nextMealData,
      employeeId,
      dateStr,
    });

    // 3. Persist to Master Cloud Database
    saveMasterMealDataToCloud(nextMealData, {
      employees,
      settings,
      passwordRequests,
      tasks: tasksRef.current,
      notifications,
    });

    // 4. Fallback server sync
    saveMealOnServer({
      employeeId,
      dateStr,
      sessions: count <= 0 ? [] : sessions,
      mealsCount: count,
      location,
      purpose,
    });

    if (count <= 0) {
      showNotification(`Đã xóa ngày ăn (${dateStr}) thành công!`, 'info');
    } else {
      showNotification('Đã lưu & đồng bộ Firebase thành công!', 'success');
    }
  };

  // Handler for batch checkin (e.g. weekdays or clear)
  const handleBatchCheckin = (employeeId: string, dates: string[], mealsCount: number) => {
    // Rule: Filter out dates in the future when adding meals
    let targetDates = dates;
    if (mealsCount > 0) {
      targetDates = dates.filter((d) => !isFutureDate(d));
      if (targetDates.length === 0 && dates.length > 0) {
        showNotification('Tất cả ngày được chọn đều thuộc tương lai, không thể chấm trước!', 'warning');
        return;
      }
      if (targetDates.length < dates.length) {
        showNotification('Đã tự động loại bỏ các ngày trong tương lai theo quy tắc!', 'warning');
      }
    }

    const currentEmpData = mealDataRef.current[employeeId] || { employeeId, records: {} };
    const currentRecords = { ...currentEmpData.records };

    targetDates.forEach((d) => {
      if (mealsCount <= 0) {
        delete currentRecords[d];
      } else {
        currentRecords[d] = {
          date: d,
          mealsCount: 1,
          sessions: [
            {
              id: `${d}_trua`,
              mealType: 'Bữa Trưa',
              startTime: '08:00',
              endTime: '17:00',
              location: 'Bắc Ninh',
              purpose: 'Phỏng vấn',
              mealsCount: 1,
            },
          ],
          location: 'Bắc Ninh',
          purpose: 'Phỏng vấn',
        };
      }
    });

    const nextMealData = {
      ...mealDataRef.current,
      [employeeId]: {
        employeeId,
        records: currentRecords,
      },
    };

    mealDataRef.current = nextMealData;
    setMealData(nextMealData);

    try {
      localStorage.setItem('meal_records_v3', JSON.stringify(nextMealData));
    } catch (e) {}

    // 1. Save directly to Google Cloud Firestore
    saveMealRecordToFirestore(employeeId, currentRecords);

    // 2. Instant live broadcast to other devices
    broadcastLiveEvent({
      type: 'MASTER_SYNC',
      mealData: nextMealData,
      employeeId,
    });

    // 3. Persistent cloud store update
    saveMasterMealDataToCloud(nextMealData, {
      employees,
      settings,
      passwordRequests,
      tasks: tasksRef.current,
      notifications,
    });

    batchCheckinOnServer({
      employeeId,
      dates,
      mealsCount,
    });

    showNotification('Đã lưu chuỗi ngày & đồng bộ Firebase thành công!', 'success');
  };

  const handleExportExcel = async (targetEmployeeId?: string) => {
    try {
      showNotification('Đang xử lý và tạo file Excel...', 'info');
      // If logged in as regular employee, STRICTLY force export of their own record only
      const effectiveTargetId =
        currentUser && currentUser.role === 'nhan_vien_nhan_su'
          ? currentUser.id
          : targetEmployeeId;

      await exportSmartMealAllowanceToExcel(
        currentUser,
        employees,
        mealData,
        cycle,
        settings,
        effectiveTargetId
      );
      showNotification('Đã xuất file Excel thành công!', 'success');
    } catch (err: any) {
      console.error('Export error:', err);
      showNotification('Không thể xuất file: ' + (err?.message || 'Lỗi xử lý'), 'warning');
    }
  };

  const handleExportIndividual = async (emp: Employee) => {
    try {
      showNotification(`Đang tạo file Excel cho ${emp.name}...`, 'info');
      // If logged in as regular employee, prevent exporting others
      if (currentUser && currentUser.role === 'nhan_vien_nhan_su' && currentUser.id !== emp.id) {
        const ownEmp = employees.find((e) => e.id === currentUser.id);
        if (ownEmp) {
          await exportIndividualMealAllowanceToExcel(ownEmp, mealData, cycle, settings);
          showNotification('Đã xuất file Excel cá nhân thành công!', 'success');
          return;
        }
      }
      await exportIndividualMealAllowanceToExcel(emp, mealData, cycle, settings);
      showNotification(`Đã xuất file Excel cho ${emp.name} thành công!`, 'success');
    } catch (err: any) {
      console.error('Export individual error:', err);
      showNotification('Không thể xuất file: ' + (err?.message || 'Lỗi xử lý'), 'warning');
    }
  };

  const handleQuickCheckin = (emp: Employee) => {
    setSelectedEmployeeId(emp.id);
    setActiveTab('meal');
    setActiveMealTab('personal');
  };

  const pendingRequestsCount = passwordRequests.filter((r) => r.status === 'pending').length;

  const approachingMBOCount = useMemo(() => {
    const today = new Date('2026-10-06');
    today.setHours(0, 0, 0, 0);

    const targetList =
      currentUser && currentUser.role === 'nhan_vien_nhan_su'
        ? mbos.filter((m) => m.employeeId === currentUser.id)
        : mbos;

    return targetList.filter((m) => {
      if (m.status === 'completed' || (m.selfAssessment ?? 0) >= 100) return false;
      let dueStr = m.dueDate;
      if (!dueStr) {
        dueStr = m.period === '6-months' ? '2026-10-25' : '2026-12-31';
      }
      const due = new Date(dueStr);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }).length;
  }, [mbos, currentUser]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('theme') === 'dark') {
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      // 1. Fetch from Google Cloud Firestore
      try {
        const firestoreMeals = await fetchAllMealsFromFirestore();
        if (Object.keys(firestoreMeals).length > 0) {
          setMealData((prev) => {
            const merged = { ...prev, ...firestoreMeals };
            mealDataRef.current = merged;
            return merged;
          });
        }
      } catch (err) {
        console.warn('Firestore manual sync fallback:', err);
      }

      // 2. Fetch from Master Cloud Database
      const cloud = await fetchMasterCloudData();
      if (cloud) {
        if (cloud.mealData && Object.keys(cloud.mealData).length > 0) {
          setMealData((prev) => {
            const merged = { ...prev };
            Object.entries(cloud.mealData!).forEach(([empId, empMeal]) => {
              if (empMeal && empMeal.records) {
                merged[empId] = {
                  employeeId: empId,
                  records: { ...empMeal.records },
                };
              }
            });
            mealDataRef.current = merged;
            return merged;
          });
        }
        if (cloud.employees && Array.isArray(cloud.employees) && cloud.employees.length > 0) {
          setEmployees(cloud.employees);
        }
        if (cloud.settings) setSettings(cloud.settings);
        if (cloud.passwordRequests) setPasswordRequests(cloud.passwordRequests);
      }

      // 2. Fetch from Local Server API if running
      const data = await fetchServerData();
      if (data) {
        if (data.employees && Array.isArray(data.employees) && data.employees.length > 0) {
          setEmployees(data.employees);
        }
        if (data.mealData && Object.keys(data.mealData).length > 0) {
          setMealData((prev) => {
            const next = { ...prev, ...data.mealData };
            mealDataRef.current = next;
            return next;
          });
        }
        if (data.settings) {
          setSettings(data.settings);
        }
        if (data.passwordRequests) {
          setPasswordRequests(data.passwordRequests);
        }
        if (data.tasks && Array.isArray(data.tasks) && data.tasks.length > 0) {
          setTasks((prev) => {
            const map = new Map<string, Task>();
            prev.forEach((t) => map.set(t.id, t));
            data.tasks!.forEach((t) => map.set(t.id, t));
            return Array.from(map.values());
          });
        }
      }

      // 3. Fetch latest tasks from server directly
      const srvTasks = await fetchTasksFromServer();
      if (srvTasks && Array.isArray(srvTasks) && srvTasks.length > 0) {
        setTasks((prev) => {
          const map = new Map<string, Task>();
          prev.forEach((t) => map.set(t.id, t));
          srvTasks.forEach((t) => map.set(t.id, t));
          return Array.from(map.values());
        });
      }

      showNotification('Đã làm mới dữ liệu từ đám mây & máy chủ!', 'success');
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeMealTab={activeMealTab}
          setActiveMealTab={setActiveMealTab}
          currentUser={currentUser}
          employees={employees}
          notifications={notifications}
          tasks={tasks}
          onOpenLogin={() => setShowLoginModal(true)}
          onLogout={handleLogout}
          onExportExcel={() => handleExportExcel()}
          onOpenPrint={() => setShowPrintModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenChangePassword={() => setShowChangePasswordModal(true)}
          pendingRequestsCount={pendingRequestsCount}
          approachingMBOCount={approachingMBOCount}
          isSyncing={isSyncing}
          onSyncNow={handleManualSync}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          onMarkNotificationAsRead={handleMarkNotificationAsRead}
          onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
          onClearAllNotifications={handleClearAllNotifications}
          onNavigateFromNotification={handleNavigateFromNotification}
          onOpenSendEmailModal={(notif) => setEmailModalNotification(notif)}
        />

      {/* Main Workspace - Expanded for Enterprise full table comfort */}
      <main className="flex-1 max-w-[1560px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {/* Render Month & Year Dashboard inside Quản lý tiền ăn ngoài */}
        {activeTab === 'meal' && activeMealTab === 'dashboard' && (
          <YearMonthDashboard
            employees={employees}
            mealData={mealData}
            currentCycle={cycle}
            settings={settings}
            currentUser={currentUser}
            onSelectCycle={(newCycle) => {
              setCycle(newCycle);
              setActiveMealTab('summary');
            }}
            onExportExcel={() => handleExportExcel()}
          />
        )}

        {/* Views that require CycleSelector and SummaryStats */}
        {activeTab === 'meal' && activeMealTab !== 'dashboard' && (
          <>
            <CycleSelector cycle={cycle} setCycle={setCycle} settings={settings} />
            <SummaryStats
              employees={employees}
              mealData={mealData}
              cycle={cycle}
              settings={settings}
              currentUser={currentUser}
            />
          </>
        )}

        {/* Personal Check-in tab */}
        {activeTab === 'meal' && activeMealTab === 'personal' && (
          <PersonalCheckin
            employees={employees}
            mealData={mealData}
            cycle={cycle}
            settings={settings}
            selectedEmployeeId={selectedEmployeeId}
            currentUser={currentUser}
            tasks={tasks}
            onNavigateToTasks={() => setActiveTab('tasks')}
            onQuickTaskStatusChange={handleQuickTaskStatusChange}
            onSelectEmployee={setSelectedEmployeeId}
            onSaveDayMeal={handleSaveDayMeal}
            onBatchCheckin={handleBatchCheckin}
            onUpdatePassword={handleUpdatePassword}
            onOpenProfileModal={() => setShowChangePasswordModal(true)}
            onExportPersonalExcel={handleExportIndividual}
            onOpenLogin={() => setShowLoginModal(true)}
          />
        )}

        {/* Summary Table tab */}
        {activeTab === 'meal' && activeMealTab === 'summary' && (
          <SummaryTable
            employees={employees}
            mealData={mealData}
            cycle={cycle}
            settings={settings}
            currentUser={currentUser}
            onViewEmployeeDetail={(emp) => setDetailModalEmployee(emp)}
            onQuickCheckin={handleQuickCheckin}
            onExportExcel={() => handleExportExcel()}
            onExportEmployeeExcel={handleExportIndividual}
          />
        )}

        {/* Matrix Check-in tab */}
        {activeTab === 'meal' && activeMealTab === 'matrix' && (
          <MatrixCheckin
            employees={
              currentUser && currentUser.role === 'nhan_vien_nhan_su'
                ? employees.filter((e) => e.id === currentUser.id)
                : employees
            }
            mealData={mealData}
            cycle={cycle}
            settings={settings}
            onToggleMeal={handleToggleMeal}
            onSaveDayMeal={handleSaveDayMeal}
            onBatchCheckin={handleBatchCheckin}
          />
        )}

        {/* Employees Management tab */}
        {activeTab === 'employees' && (
          <EmployeeManager
            employees={employees}
            setEmployees={handleSetEmployees}
            currentUser={currentUser}
            passwordRequests={passwordRequests}
            onApprovePasswordReset={handleApprovePasswordReset}
            onRejectPasswordReset={handleRejectPasswordReset}
          />
        )}

        {/* MBO tab */}
        {activeTab === 'mbo' && (
          <MBOManager
            employees={employees}
            mbos={mbos}
            setMbos={setMbos}
            currentUser={currentUser as Employee}
            onNotifyUpdate={handleDispatchNotification}
            onOpenSendEmailModal={(notif) => setEmailModalNotification(notif)}
          />
        )}

        {/* Tasks tab */}
        {activeTab === 'tasks' && (
          <TaskManager
            employees={employees}
            tasks={tasks}
            setTasks={setTasks}
            currentUser={currentUser as Employee}
            onNotifyUpdate={handleDispatchNotification}
            onOpenSendEmailModal={(notif) => setEmailModalNotification(notif)}
          />
        )}

        {/* Notes tab */}
        {activeTab === 'notes' && (
          <NoteManager
            employees={employees}
            notes={notes}
            setNotes={setNotes}
            currentUser={currentUser as Employee}
            onConvertNoteToTask={(note, targetEmployeeId, options) => {
              const assignedTarget = targetEmployeeId || note.employeeId || (currentUser?.id ?? employees[0]?.id);
              const newTask: Task = {
                id: `task-${Date.now()}`,
                employeeId: assignedTarget,
                title: note.title,
                description: note.content,
                dueDate: options?.dueDate || note.date || new Date().toISOString().slice(0, 10),
                status: 'pending',
                assignedBy: currentUser?.id ?? employees[0]?.id,
                priority: options?.priority || 'medium',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              setTasks((prev) => [newTask, ...prev]);
              saveTaskToFirestore(newTask);
              broadcastLiveEvent({ type: 'task_saved', task: newTask });
              // Also notify
              const targetEmp = employees.find((e) => e.id === assignedTarget);
              handleDispatchNotification({
                type: 'task_progress',
                title: 'Nhiệm vụ mới từ Ghi chú',
                message: `Task "${note.title}" đã được giao cho ${targetEmp?.name || assignedTarget}`,
                employeeId: assignedTarget,
                employeeName: targetEmp?.name || assignedTarget,
                department: targetEmp?.department || 'Nhân sự',
                targetId: newTask.id,
                targetTitle: newTask.title,
                newStatus: 'pending',
                progress: 0,
              });
              showNotification(`Đã chuyển thành Task và giao cho ${targetEmp?.name || assignedTarget}!`, 'success');
              setActiveTab('tasks');
            }}
          />
        )}

        {/* AI Chatbot tab: Trợ lý AI Báo Cáo Tuần */}
        {activeTab === 'ai-chat' && (
          <AIChatBot
            tasks={tasks}
            employees={employees}
            mbos={mbos}
            notes={notes}
            currentUser={currentUser}
          />
        )}
      </main>

      {/* Real-time Sync Toast Notification */}
      {syncToast && (
        <div className={`fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold rounded-xl shadow-2xl border animate-in fade-in slide-in-from-top-2 pointer-events-none ${
          syncToast.type === 'warning'
            ? 'bg-amber-950 text-amber-200 border-amber-600'
            : 'bg-slate-900 text-white border-slate-700'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            syncToast.type === 'success' ? 'bg-emerald-400' : syncToast.type === 'warning' ? 'bg-amber-400' : 'bg-sky-400'
          } animate-ping`}></span>
          <span>{syncToast.message}</span>
        </div>
      )}

      {/* Login Modal with strict password requirement and forgot password flow */}
      {(showLoginModal || !currentUser) && (
        <LoginModal
          employees={employees}
          currentUser={currentUser}
          onLogin={handleLogin}
          onClose={currentUser ? () => setShowLoginModal(false) : undefined}
          onRequestPasswordReset={handleRequestPasswordReset}
          passwordRequests={passwordRequests}
        />
      )}

      {/* Detail Modal */}
      {detailModalEmployee && (
        <EmployeeDetailModal
          employee={detailModalEmployee}
          mealData={mealData}
          cycle={cycle}
          settings={settings}
          onClose={() => setDetailModalEmployee(null)}
          onToggleMeal={handleToggleMeal}
          onExportExcel={handleExportIndividual}
        />
      )}

      {/* Print Modal */}
      {showPrintModal && (
        <PrintTemplate
          employees={employees}
          mealData={mealData}
          cycle={cycle}
          settings={settings}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          settings={settings}
          setSettings={handleSetSettings}
          employees={employees}
          setEmployees={handleSetEmployees}
          mealData={mealData}
          setMealData={handleSetMealData}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Employee Profile, Phone, Email & Password Modal */}
      <UserProfileModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        currentUser={currentUser}
        onUpdateProfile={handleUpdateProfile}
      />

      {/* Send Notification Email Modal */}
      <SendNotificationEmailModal
        isOpen={Boolean(emailModalNotification)}
        notification={emailModalNotification}
        employees={employees}
        onClose={() => setEmailModalNotification(null)}
        onSuccessToast={(msg) => showNotification(msg, 'success')}
      />

      {/* Floating AI Assistant Quick Trigger (Available across all modules) */}
      {activeTab !== 'ai-chat' && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setShowFloatingAIChat((prev) => !prev)}
            title="Mở nhanh Trợ lý AI Báo Cáo Tuần (Gemini 3.8 Flash)"
            className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer border border-emerald-400/40 group"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
              <span className="text-xs">✨</span>
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                <span>Trợ Lý Báo Cáo AI</span>
                <span className="px-1 py-0.2 bg-amber-400 text-slate-900 text-[9px] font-black rounded">
                  GEMINI
                </span>
              </div>
              <div className="text-[10px] text-emerald-100/90 leading-tight">
                Tổng hợp báo cáo tuần
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Floating AI Assistant Compact Drawer Modal */}
      {showFloatingAIChat && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-[95vw] sm:w-[500px] max-w-full shadow-2xl animate-in slide-in-from-bottom-5">
          <AIChatBot
            tasks={tasks}
            employees={employees}
            mbos={mbos}
            notes={notes}
            currentUser={currentUser}
            mode="compact"
            onClose={() => setShowFloatingAIChat(false)}
          />
        </div>
      )}

      {/* Footer */}
      <footer className="no-print mt-auto py-4 border-t border-slate-200/80 text-center text-xs text-slate-500">
        <div className="max-w-[1560px] mx-auto px-4 text-center">
          <p className="text-xs text-slate-500 font-medium">
            Phát triển bởi Brian Tran/HR Group/Welstory Việt Nam
          </p>
        </div>
      </footer>
    </div>
  );
}
