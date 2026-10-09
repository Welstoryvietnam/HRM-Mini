import React, { useState } from 'react';
import { 
  Check, 
  HelpCircle, 
  Sparkles, 
  Trash2, 
  Calendar,
  MessageSquarePlus,
  MapPin,
  Briefcase,
  X,
  Lock
} from 'lucide-react';
import { Employee, EmployeeMealData, CycleConfig, AppSettings, MealSession, MealType } from '../types';
import { getCycleDays, formatVND, formatNumber } from '../utils/cycleHelper';
import { getRecordSessions } from '../utils/excelExport';

interface MatrixCheckinProps {
  employees: Employee[];
  mealData: Record<string, EmployeeMealData>;
  cycle: CycleConfig;
  settings: AppSettings;
  onToggleMeal: (employeeId: string, dateStr: string, mealsCount?: number, note?: string) => void;
  onSaveDayMeal?: (
    employeeId: string,
    dateStr: string,
    sessions?: MealSession[],
    mealsCount?: number,
    location?: string,
    purpose?: string
  ) => void;
  onBatchCheckin: (employeeId: string, dates: string[], mealsCount: number) => void;
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

export const MatrixCheckin: React.FC<MatrixCheckinProps> = ({
  employees,
  mealData,
  cycle,
  settings,
  onToggleMeal,
  onSaveDayMeal,
  onBatchCheckin,
}) => {
  const cycleDays = getCycleDays(cycle);

  // Detail Modal state
  const [activeDetailModal, setActiveDetailModal] = useState<{
    employeeId: string;
    employeeName: string;
    dateStr: string;
    dayNum: number;
    monthNum: number;
  } | null>(null);

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

  const handleCellClick = (emp: Employee, dateStr: string, e: React.MouseEvent) => {
    // If alt key, open detailed editor
    if (e.altKey) {
      openDetailModal(emp, dateStr);
      return;
    }

    const currentRec = mealData[emp.id]?.records?.[dateStr];
    const currentMeals = currentRec ? currentRec.mealsCount : 0;

    // Rule: Cannot check-in for future dates
    const dayInfo = cycleDays.find((d) => d.dateStr === dateStr);
    if (dayInfo?.isFuture && currentMeals === 0) {
      alert(`Quy tắc chấm ăn: Không thể chấm trước cho tương lai (Ngày ${dayInfo.dayNum}/${dayInfo.monthNum} chưa đến)!`);
      return;
    }

    if (currentMeals > 0) {
      // Toggle off
      if (onSaveDayMeal) {
        onSaveDayMeal(emp.id, dateStr, [], 0);
      } else {
        onToggleMeal(emp.id, dateStr, 0);
      }
    } else {
      // Toggle on default Bữa Trưa
      const defaultSession: MealSession = {
        id: `${dateStr}_trua`,
        mealType: 'Bữa Trưa',
        startTime: '08:00',
        endTime: '17:00',
        location: 'Bắc Ninh',
        purpose: 'Phỏng vấn',
        mealsCount: 1,
      };
      if (onSaveDayMeal) {
        onSaveDayMeal(emp.id, dateStr, [defaultSession], 1, 'Bắc Ninh', 'Phỏng vấn');
      } else {
        onToggleMeal(emp.id, dateStr, 1);
      }
    }
  };

  const openDetailModal = (emp: Employee, dateStr: string) => {
    // Rule: Cannot edit future dates
    const dayInfo = cycleDays.find((d) => d.dateStr === dateStr);
    if (dayInfo?.isFuture) {
      alert(`Quy tắc chấm ăn: Không thể chấm trước cho tương lai (Ngày ${dayInfo.dayNum}/${dayInfo.monthNum} chưa đến)!`);
      return;
    }

    const currentRec = mealData[emp.id]?.records?.[dateStr];
    const [y, m, d] = dateStr.split('-').map(Number);
    setActiveDetailModal({
      employeeId: emp.id,
      employeeName: emp.name,
      dateStr,
      dayNum: d,
      monthNum: m,
    });

    if (currentRec && currentRec.mealsCount > 0) {
      const sessions = getRecordSessions(currentRec, dateStr);
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
      setLocationInput(sessions[0]?.location || currentRec.location || 'Bắc Ninh');
      setPurposeInput(sessions[0]?.purpose || currentRec.purpose || currentRec.note || 'Phỏng vấn');
    } else {
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

  const handleSaveModal = () => {
    if (!activeDetailModal) return;

    const chosenSessions: MealSession[] = [];
    const mealTypes: MealType[] = ['Bữa Sáng', 'Bữa Trưa', 'Bữa Tối', 'Bữa Đêm'];

    mealTypes.forEach((type) => {
      if (selectedMeals[type]) {
        chosenSessions.push({
          id: `${activeDetailModal.dateStr}_${type}`,
          mealType: type,
          startTime: mealTimes[type].start,
          endTime: mealTimes[type].end,
          location: locationInput.trim() || 'Bắc Ninh',
          purpose: purposeInput.trim() || 'Phỏng vấn',
          mealsCount: 1,
        });
      }
    });

    if (onSaveDayMeal) {
      onSaveDayMeal(
        activeDetailModal.employeeId,
        activeDetailModal.dateStr,
        chosenSessions,
        chosenSessions.length,
        locationInput.trim(),
        purposeInput.trim()
      );
    } else {
      onToggleMeal(
        activeDetailModal.employeeId,
        activeDetailModal.dateStr,
        chosenSessions.length,
        purposeInput.trim()
      );
    }

    setActiveDetailModal(null);
  };

  const handleDeleteFromModal = () => {
    if (!activeDetailModal) return;
    if (onSaveDayMeal) {
      onSaveDayMeal(activeDetailModal.employeeId, activeDetailModal.dateStr, [], 0);
    } else {
      onToggleMeal(activeDetailModal.employeeId, activeDetailModal.dateStr, 0);
    }
    setActiveDetailModal(null);
  };

  const handleQuickWeekdays = (employeeId: string) => {
    // Rule: Only batch checkin for past and today's weekdays (skip future)
    const weekdays = cycleDays.filter((d) => !d.isWeekend && !d.isFuture).map((d) => d.dateStr);
    if (weekdays.length === 0) {
      alert('Không có ngày làm việc nào trước hoặc bằng hôm nay để tích nhanh!');
      return;
    }
    onBatchCheckin(employeeId, weekdays, 1);
  };

  const handleClearEmployee = (employeeId: string) => {
    const allDates = cycleDays.map((d) => d.dateStr);
    onBatchCheckin(employeeId, allDates, 0);
  };

  // Grand totals
  let grandTotalMeals = 0;
  employees.forEach((emp) => {
    const records = mealData[emp.id]?.records || {};
    cycleDays.forEach((day) => {
      const rec = records[day.dateStr];
      if (rec && rec.mealsCount > 0) {
        grandTotalMeals += rec.mealsCount;
      }
    });
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header bar */}
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Bảng Ma Trận Tích Tiền Ăn Theo Ngày</span>
            <span className="text-xs font-normal text-slate-500">
              ({cycle.label})
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Nhấp chuột để tích/bỏ tích nhanh. Giữ <kbd className="px-1 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-mono">Alt</kbd> + click để chọn loại bữa (Sáng/Trưa/Tối/Đêm), địa điểm và mục đích công việc.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-emerald-600 text-white rounded flex items-center justify-center text-[10px] font-bold">✓</span>
            <span>Có ăn ngoài</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-slate-100 border border-slate-200 rounded"></span>
            <span>Không ăn</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-amber-50 border border-amber-200 rounded"></span>
            <span>Cuối tuần (T7, CN)</span>
          </div>
        </div>
      </div>

      {/* Responsive Matrix Grid with Horizontal Scroll */}
      <div className="overflow-x-auto relative max-h-[70vh]">
        <table className="w-full text-center text-xs border-collapse border-spacing-0">
          <thead className="sticky top-0 z-20 bg-slate-100 shadow-xs">
            <tr className="border-b border-slate-200">
              {/* Sticky Columns Left */}
              <th className="sticky left-0 z-30 bg-slate-100 py-2.5 px-2 text-center w-10 border-r border-slate-200 text-slate-600 font-semibold">
                STT
              </th>
              <th className="sticky left-10 z-30 bg-slate-100 py-2.5 px-3 text-left min-w-[170px] max-w-[190px] border-r border-slate-300 text-slate-700 font-semibold shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                Nhân viên tuyển dụng
              </th>

              {/* Day Columns */}
              {cycleDays.map((day) => {
                return (
                  <th
                    key={day.dateStr}
                    className={`py-2 px-1 min-w-[34px] w-[34px] border-r border-slate-200 select-none ${
                      day.isToday
                        ? 'bg-emerald-100 text-emerald-900 font-bold'
                        : day.isFuture
                        ? 'bg-slate-100/60 text-slate-400 opacity-60'
                        : day.isWeekend
                        ? 'bg-amber-50/70 text-amber-900'
                        : 'bg-slate-50 text-slate-700'
                    }`}
                    title={
                      day.isFuture
                        ? `Ngày ${day.dayNum}/${day.monthNum} (Tương lai - Khóa chấm)`
                        : `Ngày ${day.dayNum}/${day.monthNum} (${day.dayOfWeekLabel})`
                    }
                  >
                    <div className="font-bold text-xs">{day.dayNum}</div>
                    <div className={`text-[10px] ${day.isWeekend ? 'text-amber-700 font-semibold' : 'text-slate-400'}`}>
                      {day.dayOfWeekLabel}
                    </div>
                  </th>
                );
              })}

              {/* Sticky Summary Columns Right */}
              <th className="py-2.5 px-3 min-w-[70px] border-r border-slate-200 bg-slate-100 text-slate-700 font-semibold">
                Tổng ngày
              </th>
              <th className="py-2.5 px-3 min-w-[110px] bg-slate-100 text-slate-700 font-semibold text-right">
                Thành tiền
              </th>
              <th className="py-2.5 px-2 min-w-[90px] bg-slate-100 text-slate-700 font-semibold text-center">
                Tác vụ nhanh
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-slate-800">
            {employees.map((emp, empIdx) => {
              const records = mealData[emp.id]?.records || {};
              let empTotalMeals = 0;

              return (
                <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors group">
                  {/* Sticky STT */}
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 py-2.5 px-2 text-center text-slate-400 font-mono border-r border-slate-200">
                    {empIdx + 1}
                  </td>

                  {/* Sticky Name & Code */}
                  <td className="sticky left-10 z-10 bg-white group-hover:bg-slate-50 py-2 px-3 text-left border-r border-slate-300 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                    <div className="font-semibold text-slate-900 text-xs truncate max-w-[160px]">
                      {emp.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {emp.id}
                    </div>
                  </td>

                  {/* Days */}
                  {cycleDays.map((day) => {
                    const record = records[day.dateStr];
                    const hasMeal = record && record.mealsCount > 0;
                    const mealsCount = record?.mealsCount || 0;
                    if (hasMeal) {
                      empTotalMeals += mealsCount;
                    }

                    const sessions = hasMeal ? getRecordSessions(record, day.dateStr) : [];
                    const sessionNames = sessions.map((s) => s.mealType).join(', ');

                    return (
                      <td
                        key={day.dateStr}
                        onClick={(e) => handleCellClick(emp, day.dateStr, e)}
                        className={`py-1.5 px-0.5 border-r border-slate-100 text-center select-none transition-all relative ${
                          day.isFuture
                            ? 'bg-slate-50/60 cursor-not-allowed opacity-50'
                            : day.isToday
                            ? 'bg-emerald-50/40 hover:bg-emerald-100/50 cursor-pointer'
                            : day.isWeekend
                            ? 'bg-amber-50/20 hover:bg-emerald-100/50 cursor-pointer'
                            : 'hover:bg-emerald-100/50 cursor-pointer'
                        }`}
                        title={
                          day.isFuture
                            ? `Ngày ${day.dayNum}/${day.monthNum} trong tương lai - Không được chấm trước`
                            : `${emp.name} - ${day.dayNum}/${day.monthNum}: ${
                                hasMeal
                                  ? `${mealsCount} bữa (${sessionNames || 'Bữa ăn'}) - ${formatNumber(mealsCount * settings.mealPrice)} ₫\nĐịa điểm: ${sessions[0]?.location || 'Bắc Ninh'}\nMục đích: ${sessions[0]?.purpose || record?.purpose || 'Tuyển dụng'}`
                                  : 'Chưa có bữa ăn'
                              }\n(Click đổi trạng thái / Giữ Alt+Click chỉnh loại bữa & mục đích)`
                        }
                      >
                        <div
                          className={`w-7 h-7 mx-auto rounded-md flex items-center justify-center transition-all ${
                            hasMeal
                              ? 'bg-emerald-600 text-white font-bold shadow-xs'
                              : day.isFuture
                              ? 'text-slate-300'
                              : 'text-transparent hover:text-slate-300 hover:bg-slate-200/50'
                          }`}
                        >
                          {hasMeal ? (
                            mealsCount > 1 ? (
                              <span className="text-[10px] font-extrabold">{mealsCount}X</span>
                            ) : (
                              <Check className="w-4 h-4 stroke-[3]" />
                            )
                          ) : day.isFuture ? (
                            <Lock className="w-2.5 h-2.5 text-slate-300" />
                          ) : (
                            <span className="text-xs">·</span>
                          )}
                        </div>

                        {/* Location / Purpose indicator dot */}
                        {hasMeal && (sessions[0]?.location || sessions[0]?.purpose) && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
                        )}
                      </td>
                    );
                  })}

                  {/* Summary Columns */}
                  <td className="py-2 px-3 text-center border-r border-slate-200 font-mono font-bold text-slate-900 text-xs tabular-nums bg-slate-50/50">
                    {empTotalMeals}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-xs tabular-nums bg-slate-50/50">
                    {empTotalMeals > 0 ? (
                      <span className="text-emerald-700">{formatVND(empTotalMeals * settings.mealPrice)}</span>
                    ) : (
                      <span className="text-slate-400">0 ₫</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center bg-slate-50/50">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleQuickWeekdays(emp.id)}
                        title="Tích nhanh tất cả các ngày trong tuần (T2 - T6)"
                        className="p-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded"
                      >
                        T2-T6
                      </button>
                      <button
                        onClick={() => handleClearEmployee(emp.id)}
                        title="Xóa tích toàn bộ ngày của nhân viên này"
                        className="p-1 text-[10px] font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Daily Total Summary Footer */}
          <tfoot>
            <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
              <td colSpan={2} className="sticky left-0 z-20 bg-slate-100 py-3 px-3 text-left text-xs uppercase tracking-wider text-slate-700 border-r border-slate-300 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                TỔNG THEO NGÀY
              </td>

              {cycleDays.map((day) => {
                let dayTotal = 0;
                employees.forEach((emp) => {
                  const rec = mealData[emp.id]?.records?.[day.dateStr];
                  if (rec && rec.mealsCount > 0) {
                    dayTotal += rec.mealsCount;
                  }
                });

                return (
                  <td
                    key={day.dateStr}
                    className={`py-3 px-0.5 border-r border-slate-200 text-center font-mono text-xs tabular-nums ${
                      day.isToday
                        ? 'bg-emerald-100 text-emerald-900 font-extrabold'
                        : day.isWeekend
                        ? 'bg-amber-50 text-amber-900'
                        : 'text-slate-800'
                    }`}
                  >
                    {dayTotal > 0 ? dayTotal : '-'}
                  </td>
                );
              })}

              <td className="py-3 px-3 text-center font-mono text-sm text-slate-900 tabular-nums border-r border-slate-200">
                {grandTotalMeals}
              </td>
              <td className="py-3 px-3 text-right font-mono text-xs text-emerald-800 tabular-nums">
                {formatVND(grandTotalMeals * settings.mealPrice)}
              </td>
              <td className="py-3 px-2 text-center text-[10px] text-slate-500">
                Toàn bộ
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Detailed Meal & Purpose Modal */}
      {activeDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Chi Tiết Bữa Ăn: {activeDetailModal.employeeName} ({activeDetailModal.dayNum}/{activeDetailModal.monthNum})
                </h3>
              </div>
              <button
                onClick={() => setActiveDetailModal(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* 1. Phân loại bữa ăn */}
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

              {/* Summary */}
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

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleDeleteFromModal}
                  className="flex items-center gap-1 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa ngày này</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveDetailModal(null)}
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
