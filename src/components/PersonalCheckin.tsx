import React, { useState } from 'react';
import { 
  UserCheck, 
  Check, 
  Plus, 
  Calendar, 
  MapPin, 
  Briefcase,
  Clock,
  Sparkles,
  ChevronDown,
  Info,
  KeyRound,
  ShieldCheck,
  Trash2,
  X,
  Edit2,
  Users,
  Lock,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Flag
} from 'lucide-react';
import { Employee, EmployeeMealData, CycleConfig, AppSettings, AuthUser, MealSession, MealType, Task } from '../types';
import { getCycleDays, formatVND, formatNumber, formatDateVN } from '../utils/cycleHelper';
import { getRecordSessions } from '../utils/excelExport';

interface PersonalCheckinProps {
  employees: Employee[];
  mealData: Record<string, EmployeeMealData>;
  cycle: CycleConfig;
  settings: AppSettings;
  selectedEmployeeId: string;
  currentUser: AuthUser | null;
  tasks?: Task[];
  onNavigateToTasks?: () => void;
  onQuickTaskStatusChange?: (task: Task, newStatus: Task['status']) => void;
  onSelectEmployee: (id: string) => void;
  onSaveDayMeal: (
    employeeId: string,
    dateStr: string,
    sessions?: MealSession[],
    mealsCount?: number,
    location?: string,
    purpose?: string
  ) => void;
  onBatchCheckin: (employeeId: string, dates: string[], mealsCount: number) => void;
  onUpdatePassword?: (employeeId: string, newPass: string) => void;
  onOpenProfileModal?: () => void;
  onExportPersonalExcel?: (employee: Employee) => void;
  onOpenLogin?: () => void;
}

const COMMON_LOCATIONS = [
  'Bắc Ninh',
  'Phú Thọ',
  'Hải Phòng',
  'Hà Nam',
  'Bắc Giang cũ',
  'Thái Nguyên',
  'Hà Nội',
];

const COMMON_PURPOSES = [
  'Phỏng vấn',
  'Đưa nhân viên đi khám sức khỏe',
  'Tham gia ngày hội việc làm',
  'Gặp nhà cung cấp',
];

export const PersonalCheckin: React.FC<PersonalCheckinProps> = ({
  employees,
  mealData,
  cycle,
  settings,
  selectedEmployeeId,
  currentUser,
  tasks = [],
  onNavigateToTasks,
  onQuickTaskStatusChange,
  onSelectEmployee,
  onSaveDayMeal,
  onBatchCheckin,
  onUpdatePassword,
  onOpenProfileModal,
  onExportPersonalExcel,
  onOpenLogin,
}) => {
  // Check if currentUser corresponds to an employee in the list
  const loggedInEmp = currentUser
    ? employees.find((e) => e.id.toLowerCase() === currentUser.id.toLowerCase())
    : null;

  // Regular employees can only view/edit their own check-in.
  // Managers & Admins can switch to view/check for any team member.
  const isRegularEmployee = Boolean(currentUser && currentUser.role === 'nhan_vien_nhan_su' && loggedInEmp);
  const canSwitchEmployees = Boolean(currentUser && (currentUser.role === 'admin' || currentUser.role === 'quan_ly_nhan_su'));

  const effectiveEmployeeId = (() => {
    // 1. Regular employee ALWAYS views their own account
    if (isRegularEmployee && loggedInEmp) {
      return loggedInEmp.id;
    }
    // 2. If a specific employee is selected via dropdown/table and exists in list
    if (selectedEmployeeId && employees.some((e) => e.id === selectedEmployeeId)) {
      return selectedEmployeeId;
    }
    // 3. If manager is logged in, default to manager's own account
    if (loggedInEmp) {
      return loggedInEmp.id;
    }
    // 4. Default to first employee in list
    return employees[0]?.id || '';
  })();

  const currentEmp = employees.find((e) => e.id === effectiveEmployeeId) || employees[0];
  const isViewingOwnAccount = Boolean(currentUser && currentEmp && currentUser.id === currentEmp.id);
  const cycleDays = getCycleDays(cycle);
  const empRecords = (currentEmp ? mealData[currentEmp.id]?.records : {}) || {};

  // Day editor modal state
  const [editingDay, setEditingDay] = useState<{
    dateStr: string;
    dayNum: number;
    monthNum: number;
    dayOfWeekLabel: string;
  } | null>(null);

  // Edit form state
  const [selectedMeals, setSelectedMeals] = useState<Record<MealType, boolean>>({
    'Bữa Sáng': false,
    'Bữa Trưa': true,
    'Bữa Tối': false,
    'Bữa Đêm': false,
  });

  const [mealTimes, setMealTimes] = useState<Record<MealType, { start: string; end: string }>>({
    'Bữa Sáng': { start: '06:30', end: '08:30' },
    'Bữa Trưa': { start: '08:00', end: '17:00' },
    'Bữa Tối': { start: '17:00', end: '19:00' },
    'Bữa Đêm': { start: '22:00', end: '06:00' },
  });

  const [locationInput, setLocationInput] = useState('Bắc Ninh');
  const [purposeInput, setPurposeInput] = useState('Phỏng vấn');

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Calculate personal total
  let totalMeals = 0;
  cycleDays.forEach((day) => {
    const rec = empRecords[day.dateStr];
    if (rec && rec.mealsCount > 0) {
      const sessions = getRecordSessions(rec, day.dateStr);
      totalMeals += sessions.length;
    }
  });

  const totalAmount = totalMeals * settings.mealPrice;

  // Open day editor modal with current values
  const openDayEditor = (day: typeof cycleDays[0], e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Rule: Cannot edit or check-in for future dates
    if (day.isFuture) {
      alert(`Quy tắc chấm ăn: Không thể chấm trước cho tương lai (Ngày ${day.dayNum}/${day.monthNum} chưa đến)!`);
      return;
    }

    const rec = empRecords[day.dateStr];
    setEditingDay({
      dateStr: day.dateStr,
      dayNum: day.dayNum,
      monthNum: day.monthNum,
      dayOfWeekLabel: day.dayOfWeekLabel,
    });

    if (rec && rec.mealsCount > 0) {
      const sessions = getRecordSessions(rec, day.dateStr);
      const newSelected: Record<MealType, boolean> = {
        'Bữa Sáng': false,
        'Bữa Trưa': false,
        'Bữa Tối': false,
        'Bữa Đêm': false,
      };
      const newTimes = { ...mealTimes };

      sessions.forEach((s) => {
        newSelected[s.mealType] = true;
        if (s.startTime && s.endTime) {
          newTimes[s.mealType] = { start: s.startTime, end: s.endTime };
        }
      });

      setSelectedMeals(newSelected);
      setMealTimes(newTimes);
      setLocationInput(sessions[0]?.location || rec.location || 'Bắc Ninh');
      setPurposeInput(sessions[0]?.purpose || rec.purpose || rec.note || 'Phỏng vấn');
    } else {
      // Default to Bữa Trưa
      setSelectedMeals({
        'Bữa Sáng': false,
        'Bữa Trưa': true,
        'Bữa Tối': false,
        'Bữa Đêm': false,
      });
      setLocationInput('Bắc Ninh');
      setPurposeInput('Phỏng vấn');
    }
  };

  // Quick 1-click on card
  const handleQuickToggleDay = (day: typeof cycleDays[0]) => {
    if (!currentEmp) return;

    // Rule: Cannot check-in for future dates
    if (day.isFuture) {
      alert(`Quy tắc chấm ăn: Không thể chấm trước cho tương lai (Ngày ${day.dayNum}/${day.monthNum} chưa đến)!`);
      return;
    }

    const rec = empRecords[day.dateStr];
    if (rec && rec.mealsCount > 0) {
      // If already has meals, open detail editor so they can modify or remove
      openDayEditor(day);
    } else {
      // Fast check: add default Bữa Trưa
      const defaultSession: MealSession = {
        id: `${day.dateStr}_trua`,
        mealType: 'Bữa Trưa',
        startTime: '08:00',
        endTime: '17:00',
        location: 'Bắc Ninh',
        purpose: 'Phỏng vấn',
        mealsCount: 1,
      };
      onSaveDayMeal(currentEmp.id, day.dateStr, [defaultSession]);
    }
  };

  // Save changes from modal
  const handleSaveModal = () => {
    if (!currentEmp || !editingDay) return;

    const chosenSessions: MealSession[] = [];
    const mealTypes: MealType[] = ['Bữa Sáng', 'Bữa Trưa', 'Bữa Tối', 'Bữa Đêm'];

    mealTypes.forEach((type) => {
      if (selectedMeals[type]) {
        chosenSessions.push({
          id: `${editingDay.dateStr}_${type}`,
          mealType: type,
          startTime: mealTimes[type].start,
          endTime: mealTimes[type].end,
          location: locationInput.trim() || 'Bắc Ninh',
          purpose: purposeInput.trim() || 'Phỏng vấn',
          mealsCount: 1,
        });
      }
    });

    if (chosenSessions.length > 0) {
      onSaveDayMeal(
        currentEmp.id,
        editingDay.dateStr,
        chosenSessions,
        chosenSessions.length,
        locationInput.trim(),
        purposeInput.trim()
      );
    } else {
      // Remove day record if no meals selected
      onSaveDayMeal(currentEmp.id, editingDay.dateStr, [], 0);
    }

    setEditingDay(null);
  };

  // Delete all meals on editing day
  const handleDeleteDay = () => {
    if (!currentEmp || !editingDay) return;
    onSaveDayMeal(currentEmp.id, editingDay.dateStr, [], 0);
    setEditingDay(null);
  };

  const handleQuickWeekdays = () => {
    if (!currentEmp) return;
    // Rule: Only batch checkin for past and today's weekdays (skip future)
    const weekdays = cycleDays.filter((d) => !d.isWeekend && !d.isFuture).map((d) => d.dateStr);
    if (weekdays.length === 0) {
      alert('Không có ngày làm việc nào trước hoặc bằng hôm nay để tích nhanh!');
      return;
    }
    onBatchCheckin(currentEmp.id, weekdays, 1);
  };

  const handleClearAll = () => {
    if (!currentEmp) return;
    if (confirm('Bạn có chắc chắn muốn bỏ chọn tất cả các ngày trong chu kỳ này?')) {
      const allDates = cycleDays.map((d) => d.dateStr);
      onBatchCheckin(currentEmp.id, allDates, 0);
    }
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || !currentEmp) return;
    if (onUpdatePassword) {
      onUpdatePassword(currentEmp.id, newPassword.trim());
    }
    setPasswordSuccess('Đổi mật khẩu thành công!');
    setNewPassword('');
    setTimeout(() => {
      setPasswordSuccess('');
      setShowPasswordChange(false);
    }, 1500);
  };

  return (
    <div className="space-y-4">
      {/* Action Toolbar: Quick checkin batch & Admin employee switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {canSwitchEmployees ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>Nhân viên:</span>
            </span>
            <select
              value={effectiveEmployeeId}
              onChange={(e) => onSelectEmployee(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.id})
                </option>
              ))}
            </select>
          </div>
        ) : <div />}

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleQuickWeekdays}
            title="Tự động tích Bữa Trưa cho các ngày làm việc thứ 2 đến thứ 6"
            className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-300 shadow-2xs cursor-pointer active:scale-95"
          >
            + Tích nhanh Bữa Trưa (T2-T6)
          </button>
          <button
            onClick={handleClearAll}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 shadow-2xs cursor-pointer active:scale-95"
          >
            Bỏ chọn tất cả
          </button>
        </div>
      </div>

      {/* Selected Employee Summary Card */}
      {currentEmp && (
        <div className="bg-emerald-900 text-white rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg ${
                currentEmp.avatarColor || 'bg-emerald-700'
              }`}
            >
              {currentEmp.name.split(' ').pop()?.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{currentEmp.name}</h3>
                <span className="text-xs bg-emerald-800/80 px-2 py-0.5 rounded text-emerald-200 font-mono">
                  Mã NV: {currentEmp.id}
                </span>
                {currentEmp.role === 'quan_ly_nhan_su' && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded border border-amber-400/30">
                    Trưởng nhóm
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2.5 text-xs text-emerald-200 mt-1">
                <span>{currentEmp.department}</span>
                {currentEmp.phone && (
                  <span className="font-mono text-emerald-300">· 📞 {currentEmp.phone}</span>
                )}
                {currentEmp.email && (
                  <span className="text-emerald-300 font-mono text-[11px]">· ✉️ {currentEmp.email}</span>
                )}
                {isViewingOwnAccount && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenProfileModal) onOpenProfileModal();
                      else setShowPasswordChange(!showPasswordChange);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-800/90 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold border border-emerald-600/60 transition-all cursor-pointer shadow-2xs ml-1"
                    title="Nhân viên tự chỉnh sửa SĐT, Email và Mật khẩu đăng nhập"
                  >
                    <KeyRound className="w-3 h-3 text-emerald-300" />
                    <span>Cập nhật SĐT, Email & Mật khẩu</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 border-t md:border-t-0 md:border-l border-emerald-800/80 pt-3 md:pt-0 md:pl-6">
            <div>
              <div className="text-xs text-emerald-300">Tổng số bữa hỗ trợ</div>
              <div className="text-2xl font-bold font-mono text-white tabular-nums">
                {totalMeals} <span className="text-sm font-normal text-emerald-300">bữa</span>
              </div>
            </div>

            <div>
              <div className="text-xs text-emerald-300">Tổng tiền phụ cấp nhận</div>
              <div className="text-2xl font-bold font-mono text-emerald-300 tabular-nums">
                {formatVND(totalAmount)}
              </div>
            </div>

            {onExportPersonalExcel && currentEmp && (
              <button
                type="button"
                onClick={() => onExportPersonalExcel(currentEmp)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700/80 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-xs font-semibold border border-emerald-500/50 shadow-xs transition-all cursor-pointer mt-1 sm:mt-0"
                title="Tải bảng kê tiền ăn ngoài (.xlsx) cá nhân của bạn"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>Xuất Excel Cá Nhân</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Assigned Tasks from Superior (Nhiệm vụ cấp trên giao) */}
      {currentEmp && (() => {
        const empTasks = tasks.filter((t) => t.employeeId === currentEmp.id);
        if (empTasks.length === 0) return null;
        const pendingCount = empTasks.filter((t) => t.status !== 'completed').length;

        return (
          <div className="bg-white border-2 border-emerald-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                  <Clock className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                      Công Việc Cấp Trên Giao Cho Bạn
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {empTasks.length} nhiệm vụ
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {pendingCount > 0
                      ? `Còn ${pendingCount} công việc cần thực hiện hoặc báo cáo kết quả.`
                      : 'Tuyệt vời! Bạn đã hoàn thành 100% công việc được giao.'}
                  </p>
                </div>
              </div>

              {onNavigateToTasks && (
                <button
                  type="button"
                  onClick={onNavigateToTasks}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <span>Mở Bảng Tasks Chi Tiết</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {empTasks.map((task) => {
                const isOverdue =
                  task.status !== 'completed' &&
                  task.dueDate &&
                  task.dueDate < new Date().toISOString().slice(0, 10);

                return (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                      task.status === 'completed'
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : task.status === 'in-progress'
                        ? 'bg-sky-50/40 border-sky-200'
                        : isOverdue
                        ? 'bg-rose-50/50 border-rose-200'
                        : 'bg-slate-50/60 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          task.priority === 'urgent'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : task.priority === 'high'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {task.priority === 'urgent'
                          ? 'Gấp / Khẩn cấp'
                          : task.priority === 'high'
                          ? 'Ưu tiên cao'
                          : 'Tiêu chuẩn'}
                      </span>

                      {onQuickTaskStatusChange && (
                        <select
                          value={task.status}
                          onChange={(e) =>
                            onQuickTaskStatusChange(task, e.target.value as Task['status'])
                          }
                          className="text-[11px] font-bold px-2 py-0.5 bg-white border border-slate-300 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="pending">🟡 Chưa làm</option>
                          <option value="in-progress">🔵 Đang làm</option>
                          <option value="completed">🟢 Đã xong</option>
                        </select>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h5 className="font-bold text-xs text-slate-900 line-clamp-2">
                        {task.title}
                      </h5>
                      {task.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                      <span
                        className={`font-mono font-semibold ${
                          isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'
                        }`}
                      >
                        📅 Hạn: {task.dueDate ? task.dueDate.split('-').reverse().join('/') : 'Không có'}
                      </span>
                      <span className="font-bold font-mono text-slate-700">
                        {task.progress ?? (task.status === 'completed' ? 100 : task.status === 'in-progress' ? 50 : 0)}%
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          task.status === 'completed'
                            ? 'bg-emerald-500'
                            : task.status === 'in-progress'
                            ? 'bg-sky-500'
                            : 'bg-amber-400'
                        }`}
                        style={{
                          width: `${
                            task.progress ??
                            (task.status === 'completed'
                              ? 100
                              : task.status === 'in-progress'
                              ? 50
                              : 0)
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Change Password Dialog if open */}
      {showPasswordChange && currentEmp && (
        <form
          onSubmit={handleSavePassword}
          className="bg-white border border-emerald-300 rounded-xl p-4 shadow-sm text-xs flex flex-wrap items-center gap-3 animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-slate-800">
              Đổi mật khẩu cho {currentEmp.name}:
            </span>
          </div>

          <input
            type="password"
            required
            placeholder="Nhập mật khẩu mới..."
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />

          <button
            type="submit"
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs"
          >
            Lưu Mật Khẩu
          </button>

          <button
            type="button"
            onClick={() => setShowPasswordChange(false)}
            className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            Đóng
          </button>

          {passwordSuccess && (
            <span className="text-emerald-600 font-bold text-xs">{passwordSuccess}</span>
          )}
        </form>
      )}

      {/* Date Grid Check-in */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2 mb-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Chấm Tiền Ăn Bên Ngoài ({cycle.label})</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Chọn phân loại bữa ăn (Bữa Trưa, Bữa Tối, Bữa Sáng, Bữa Đêm), Địa điểm làm việc bên ngoài và Mục đích công việc
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Định mức: <strong>{formatNumber(settings.mealPrice)} ₫/bữa</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {cycleDays.map((day) => {
            const rec = empRecords[day.dateStr];
            const hasMeal = rec && rec.mealsCount > 0;
            const sessions = hasMeal ? getRecordSessions(rec, day.dateStr) : [];

            return (
              <div
                key={day.dateStr}
                onClick={() => handleQuickToggleDay(day)}
                className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between select-none ${
                  day.isFuture
                    ? 'border-dashed border-slate-200 bg-slate-50/60 opacity-65 cursor-not-allowed'
                    : hasMeal
                    ? 'border-emerald-500 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-500 cursor-pointer'
                    : day.isToday
                    ? 'border-emerald-400 bg-emerald-50/20 ring-1 ring-emerald-400 cursor-pointer'
                    : day.isWeekend
                    ? 'border-amber-200 bg-amber-50/20 cursor-pointer'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                }`}
                title={day.isFuture ? 'Ngày trong tương lai - Quy tắc không được chấm trước' : undefined}
              >
                {/* Card Top: Date & Action button */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-base text-slate-900 font-mono">
                        {String(day.dayNum).padStart(2, '0')}/{String(day.monthNum).padStart(2, '0')}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          day.isWeekend
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {day.dayOfWeekLabel}
                      </span>
                    </div>
                    {day.isToday && (
                      <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                        ● Hôm nay
                      </span>
                    )}
                    {day.isFuture && (
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5 mt-0.5">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Chưa tới ngày</span>
                      </span>
                    )}
                  </div>

                  {/* Toggle Indicator & Quick Remove */}
                  <div className="flex items-center gap-1">
                    {hasMeal && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentEmp) {
                            onSaveDayMeal(currentEmp.id, day.dateStr, [], 0);
                          }
                        }}
                        title="Xóa nhanh ngày ăn này"
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div
                      onClick={(e) => openDayEditor(day, e)}
                      className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                        day.isFuture
                          ? 'border border-slate-200 bg-slate-100/80 text-slate-400 cursor-not-allowed'
                          : hasMeal
                          ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 cursor-pointer'
                          : 'border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 cursor-pointer'
                      }`}
                    >
                      {day.isFuture ? (
                        <>
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>Khóa</span>
                        </>
                      ) : hasMeal ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>{sessions.length} bữa</span>
                        </>
                      ) : (
                        <span>+ Tích</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Middle: Meal Badges, Location, Purpose */}
                {hasMeal ? (
                  <div className="mt-3 space-y-2">
                    {/* Meal badges */}
                    <div className="flex flex-wrap gap-1">
                      {sessions.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded font-semibold text-[11px] flex items-center gap-1"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          <span>{s.mealType}</span>
                        </span>
                      ))}
                    </div>

                    {/* Địa điểm làm việc bên ngoài */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="font-semibold text-slate-900">
                        {sessions[0]?.location || 'Bắc Ninh'}
                      </span>
                    </div>

                    {/* Mục đích công việc */}
                    <div className="text-[11px] text-slate-600 bg-white/80 p-2 rounded-lg border border-slate-200 line-clamp-2">
                      <strong className="text-slate-800">Mục đích: </strong>
                      {sessions[0]?.purpose || 'Phỏng vấn'}
                    </div>
                  </div>
                ) : (
                  <div className="my-3 py-3 text-center text-xs text-slate-400">
                    Chưa đăng ký bữa ăn ngoài
                  </div>
                )}

                {/* Card Bottom: Total money & Edit / Delete actions */}
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className={hasMeal ? 'font-bold text-emerald-700 font-mono text-sm' : 'text-slate-400'}>
                    {hasMeal ? formatVND(sessions.length * settings.mealPrice) : '0 ₫'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {hasMeal && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentEmp) {
                            onSaveDayMeal(currentEmp.id, day.dateStr, [], 0);
                          }
                        }}
                        className="text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded font-medium flex items-center gap-1 transition-colors"
                        title="Xóa ngày đã đăng ký"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Xóa</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => openDayEditor(day, e)}
                      className="text-[11px] text-slate-500 hover:text-emerald-700 font-medium flex items-center gap-1 px-2 py-1 hover:bg-slate-50 rounded"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>{hasMeal ? 'Sửa' : 'Thêm chi tiết'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comprehensive Day Editor Modal */}
      {editingDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6 text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Đăng Ký Bữa Ăn Ngày {editingDay.dayNum}/{editingDay.monthNum} ({editingDay.dayOfWeekLabel})
                </h3>
              </div>
              <button
                onClick={() => setEditingDay(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* 1. Phân loại bữa ăn: Bữa Trưa, Bữa Tối, Bữa Sáng, Bữa Đêm */}
              <div>
                <label className="block text-slate-800 font-bold mb-1.5">
                  1. Phân loại bữa ăn:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(['Bữa Trưa', 'Bữa Tối', 'Bữa Sáng', 'Bữa Đêm'] as MealType[]).map((type) => {
                    const isChecked = selectedMeals[type];
                    return (
                      <div
                        key={type}
                        onClick={() =>
                          setSelectedMeals({ ...selectedMeals, [type]: !isChecked })
                        }
                        className={`px-3 py-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isChecked
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500 font-semibold'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className="font-bold text-sm text-slate-800">{type}</span>
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                            isChecked ? 'bg-emerald-600 text-white font-bold' : 'border border-slate-300'
                          }`}
                        >
                          {isChecked && '✓'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Địa điểm làm việc bên ngoài */}
              <div>
                <label className="block text-slate-800 font-bold mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>2. Địa điểm làm việc bên ngoài:</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Bắc Ninh, Phú Thọ, Hải Phòng..."
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {/* Suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {COMMON_LOCATIONS.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setLocationInput(loc)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px]"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Mục đích công việc */}
              <div>
                <label className="block text-slate-800 font-bold mb-1 flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                  <span>3. Mục đích công việc:</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Phỏng vấn, Tham gia ngày hội việc làm..."
                  value={purposeInput}
                  onChange={(e) => setPurposeInput(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {/* Suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {COMMON_PURPOSES.map((pur) => (
                    <button
                      key={pur}
                      type="button"
                      onClick={() => setPurposeInput(pur)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] text-left truncate max-w-[280px]"
                      title={pur}
                    >
                      {pur}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary of this day */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-600">Tổng phụ cấp ngày này: </span>
                  <strong className="text-emerald-800 font-mono text-sm">
                    {formatVND(
                      Object.values(selectedMeals).filter(Boolean).length * settings.mealPrice
                    )}
                  </strong>
                  <span className="text-slate-500 ml-1">
                    ({Object.values(selectedMeals).filter(Boolean).length} bữa)
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleDeleteDay}
                  className="flex items-center gap-1 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa ngày này</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDay(null)}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveModal}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs"
                  >
                    Lưu Bữa Ăn
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
