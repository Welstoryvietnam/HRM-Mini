import React from 'react';
import { 
  X, 
  Calendar, 
  MapPin, 
  Briefcase,
  Trash2, 
  Utensils, 
  FileSpreadsheet,
  Mail,
  Phone
} from 'lucide-react';
import { Employee, EmployeeMealData, CycleConfig, AppSettings } from '../types';
import { getCycleDays, formatVND, formatNumber, formatDateVN } from '../utils/cycleHelper';
import { getRecordSessions } from '../utils/excelExport';

interface EmployeeDetailModalProps {
  employee: Employee | null;
  mealData: Record<string, EmployeeMealData>;
  cycle: CycleConfig;
  settings: AppSettings;
  onClose: () => void;
  onToggleMeal: (employeeId: string, dateStr: string, mealsCount?: number, note?: string) => void;
  onExportExcel?: (employee: Employee) => void;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  employee,
  mealData,
  cycle,
  settings,
  onClose,
  onToggleMeal,
  onExportExcel,
}) => {
  if (!employee) return null;

  const cycleDays = getCycleDays(cycle);
  const records = mealData[employee.id]?.records || {};

  const checkedDays = cycleDays
    .map((day) => {
      const rec = records[day.dateStr];
      if (rec && rec.mealsCount > 0) {
        const sessions = getRecordSessions(rec, day.dateStr);
        return {
          ...day,
          mealsCount: rec.mealsCount,
          sessions,
          location: sessions[0]?.location || rec.location || 'Bắc Ninh',
          purpose: sessions[0]?.purpose || rec.purpose || rec.note || 'Tuyển dụng các bếp',
        };
      }
      return null;
    })
    .filter(Boolean) as (typeof cycleDays[0] & {
      mealsCount: number;
      sessions: ReturnType<typeof getRecordSessions>;
      location: string;
      purpose: string;
    })[];

  const totalMeals = checkedDays.reduce((acc, d) => acc + (d.sessions?.length || d.mealsCount), 0);
  const totalAmount = totalMeals * settings.mealPrice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg ${
                employee.avatarColor || 'bg-emerald-600'
              }`}
            >
              {employee.name.split(' ').pop()?.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">{employee.name}</h3>
                <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                  Mã: {employee.id}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span>{employee.department} · {cycle.label}</span>
                {employee.email && (
                  <a
                    href={`mailto:${employee.email}`}
                    className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-700 font-mono text-[11px]"
                  >
                    · <Mail className="w-3 h-3 text-slate-400" /> {employee.email}
                  </a>
                )}
                {employee.phone && (
                  <span className="inline-flex items-center gap-1 text-slate-600 font-mono text-[11px]">
                    · <Phone className="w-3 h-3 text-slate-400" /> {employee.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlight Stats */}
        <div className="grid grid-cols-3 gap-3 my-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block">
              Tổng Số Bữa Hỗ Trợ
            </span>
            <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
              {totalMeals} <span className="text-xs font-normal text-slate-500">bữa</span>
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block">
              Đơn Giá Chuẩn
            </span>
            <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
              {formatNumber(settings.mealPrice)} ₫
            </span>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
            <span className="text-[11px] text-emerald-700 uppercase tracking-wider block font-semibold">
              Tổng Thành Tiền
            </span>
            <span className="text-xl font-bold font-mono text-emerald-800 tabular-nums">
              {formatVND(totalAmount)}
            </span>
          </div>
        </div>

        {/* Days List */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Chi tiết {checkedDays.length} ngày phát sinh tiền ăn bên ngoài
            </h4>
            <span className="text-[11px] text-slate-400">
              Nhấp thùng rác để hủy ngày
            </span>
          </div>

          {checkedDays.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
              <Utensils className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p>Chưa có ngày ăn ngoài nào được ghi nhận trong chu kỳ này.</p>
              <p className="text-slate-400 mt-1">
                Nhân viên có thể vào "Chấm Ăn Của Tôi" để tự đăng ký.
              </p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {checkedDays.map((day, idx) => (
                <div
                  key={day.dateStr}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors text-xs"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 text-center text-slate-400 font-mono text-[11px] mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-slate-900 font-mono text-sm">
                          {formatDateVN(day.dateStr)}
                        </strong>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            day.isWeekend
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {day.dayOfWeekLabel}
                        </span>
                        <span className="text-emerald-700 font-bold font-mono text-xs">
                          +{formatVND(day.sessions.length * settings.mealPrice)}
                        </span>
                      </div>

                      {/* Meal session badges */}
                      <div className="flex flex-wrap gap-1">
                        {day.sessions.map((s, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded font-semibold text-[11px] flex items-center gap-1"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            <span>{s.mealType}</span>
                            <span className="opacity-75 font-mono text-[10px]">
                              ({s.startTime} - {s.endTime})
                            </span>
                          </span>
                        ))}
                      </div>

                      {/* Địa điểm & Mục đích */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                        <div className="flex items-center gap-1 text-slate-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Địa điểm: <strong>{day.location}</strong></span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-700">
                          <Briefcase className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>Mục đích: <em>{day.purpose}</em></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleMeal(employee.id, day.dateStr, 0)}
                    title="Bỏ ngày ăn này"
                    className="self-end sm:self-center p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Ký nhận: <span className="italic font-medium text-slate-700">{employee.name}</span>
          </div>

          <div className="flex items-center gap-2">
            {onExportExcel && (
              <button
                type="button"
                onClick={() => onExportExcel(employee)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Xuất Excel Cá Nhân</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
