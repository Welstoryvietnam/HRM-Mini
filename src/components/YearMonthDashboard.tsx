import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Utensils, 
  Users, 
  Award, 
  FileSpreadsheet, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  MapPin,
  Briefcase,
  History,
  Check
} from 'lucide-react';
import { Employee, EmployeeMealData, CycleConfig, AppSettings, AuthUser, MealType } from '../types';
import { getCycleConfig, getCycleDays, formatVND, formatNumber, numberToVietnameseWords } from '../utils/cycleHelper';
import { getRecordSessions } from '../utils/excelExport';

interface YearMonthDashboardProps {
  employees: Employee[];
  mealData: Record<string, EmployeeMealData>;
  currentCycle: CycleConfig;
  settings: AppSettings;
  currentUser?: AuthUser | null;
  onSelectCycle: (cycle: CycleConfig) => void;
  onExportExcel: () => void;
}

export const YearMonthDashboard: React.FC<YearMonthDashboardProps> = ({
  employees,
  mealData,
  currentCycle,
  settings,
  currentUser,
  onSelectCycle,
  onExportExcel,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<number | 'all'>('all');

  const isPersonalView = Boolean(currentUser && currentUser.role === 'nhan_vien_nhan_su');

  // If in personal view, strictly consider ONLY the logged in employee!
  const targetEmployees = isPersonalView
    ? employees.filter((e) => e.id === currentUser?.id)
    : employees;

  // Compute stats for all 12 cycles of the selected year
  const monthlyStats = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const cycle = getCycleConfig(selectedYear, month);
    const cycleDays = getCycleDays(cycle);

    let totalMeals = 0;
    const staffMealMap: Record<string, number> = {};

    targetEmployees.forEach((emp) => {
      const records = mealData[emp.id]?.records || {};
      let empMeals = 0;
      cycleDays.forEach((day) => {
        const rec = records[day.dateStr];
        if (rec && rec.mealsCount > 0) {
          empMeals += rec.mealsCount;
        }
      });
      staffMealMap[emp.id] = empMeals;
      totalMeals += empMeals;
    });

    const totalAmount = totalMeals * settings.mealPrice;
    const activeStaffCount = Object.values(staffMealMap).filter((c) => c > 0).length;

    return {
      month,
      cycle,
      totalMeals,
      totalAmount,
      activeStaffCount,
      staffMealMap,
      isCurrentCycle: currentCycle.year === selectedYear && currentCycle.month === month,
    };
  });

  // Filtered view data
  const filteredCycles =
    selectedMonthFilter === 'all'
      ? monthlyStats
      : monthlyStats.filter((m) => m.month === selectedMonthFilter);

  // Overall totals for the selected scope
  const totalScopeMeals = filteredCycles.reduce((acc, curr) => acc + curr.totalMeals, 0);
  const totalScopeAmount = totalScopeMeals * settings.mealPrice;
  const avgMealsPerActiveMonth =
    filteredCycles.filter((c) => c.totalMeals > 0).length > 0
      ? (totalScopeMeals / filteredCycles.filter((c) => c.totalMeals > 0).length).toFixed(1)
      : '0';

  // Find peak month
  const peakMonth = [...monthlyStats].sort((a, b) => b.totalMeals - a.totalMeals)[0];

  // Employee rankings in the selected scope (only relevant for manager/admin)
  const employeeRankings = employees.map((emp) => {
    let empTotalMeals = 0;
    filteredCycles.forEach((cycleStat) => {
      empTotalMeals += cycleStat.staffMealMap[emp.id] || 0;
    });
    const empAmount = empTotalMeals * settings.mealPrice;
    return {
      employee: emp,
      totalMeals: empTotalMeals,
      amount: empAmount,
    };
  }).sort((a, b) => b.totalMeals - a.totalMeals);

  // Personal detailed breakdown for personal view
  const personalMealTypeStats: Record<MealType, number> = {
    'Bữa Trưa': 0,
    'Bữa Tối': 0,
    'Bữa Sáng': 0,
    'Bữa Đêm': 0,
  };
  const personalLocationCounts: Record<string, number> = {};

  if (isPersonalView && currentUser) {
    const records = mealData[currentUser.id]?.records || {};
    filteredCycles.forEach((cycleStat) => {
      const days = getCycleDays(cycleStat.cycle);
      days.forEach((day) => {
        const rec = records[day.dateStr];
        if (rec && rec.mealsCount > 0) {
          const sessions = getRecordSessions(rec, day.dateStr);
          sessions.forEach((s) => {
            personalMealTypeStats[s.mealType] = (personalMealTypeStats[s.mealType] || 0) + 1;
            const loc = s.location || 'Bắc Ninh';
            personalLocationCounts[loc] = (personalLocationCounts[loc] || 0) + 1;
          });
        }
      });
    });
  }

  const maxMonthlyMeals = Math.max(...monthlyStats.map((m) => m.totalMeals), 1);

  return (
    <div className="space-y-6">
      {/* Control Bar: Year and Month Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              {isPersonalView
                ? `Dashboard Xu Hướng & Lịch Sử Tiền Ăn Cá Nhân (${currentUser?.name})`
                : `Dashboard Phân Tích & Quản Lý Tiền Ăn Theo Tháng / Năm`}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isPersonalView
              ? `Theo dõi chi tiết số suất ăn ngoài, lịch sử các chu kỳ và phụ cấp của ${currentUser?.name} (Mã NV: ${currentUser?.id})`
              : `Báo cáo tổng hợp số bữa, định mức ${formatNumber(settings.mealPrice)} ₫/bữa và ngân sách công tác tuyển dụng`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            {[2025, 2026, 2027].map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  selectedYear === year
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Năm {year}
              </button>
            ))}
          </div>

          {/* Month selector dropdown */}
          <select
            value={selectedMonthFilter}
            onChange={(e) =>
              setSelectedMonthFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            aria-label="Lọc theo tháng hoặc xem cả năm"
            className="text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Toàn bộ 12 Chu Kỳ (Cả Năm {selectedYear})</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                Kỳ Tháng {m}/{selectedYear} (26/{String(m === 1 ? 12 : m - 1).padStart(2, '0')} - 25/{String(m).padStart(2, '0')})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Budget */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isPersonalView
                ? selectedMonthFilter === 'all'
                  ? `Tiền Phụ Cấp Của Tôi Năm ${selectedYear}`
                  : `Phụ Cấp Kỳ T${selectedMonthFilter}`
                : selectedMonthFilter === 'all'
                ? `Tổng Chi Phí Năm ${selectedYear}`
                : `Chi Phí Kỳ T${selectedMonthFilter}`}
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {formatVND(totalScopeAmount)}
          </div>
          <div className="text-xs text-slate-500 mt-1 truncate">
            {numberToVietnameseWords(totalScopeAmount)}
          </div>
        </div>

        {/* Total Meals */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isPersonalView ? 'Tổng Suất Ăn Của Tôi' : 'Tổng Suất Ăn Lũy Kế'}
            </span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
              <Utensils className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {formatNumber(totalScopeMeals)}{' '}
            <span className="text-sm font-normal text-slate-500">suất/bữa</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Định mức: {formatNumber(settings.mealPrice)} ₫/suất ăn ngoài
          </div>
        </div>

        {/* Peak Month */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isPersonalView ? 'Kỳ Cao Điểm Của Tôi' : 'Kỳ Cao Điểm Tuyển Dụng'}
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            Tháng {peakMonth.month}{' '}
            <span className="text-sm font-normal text-slate-500">({peakMonth.totalMeals} bữa)</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Kinh phí kỳ này: {formatVND(peakMonth.totalAmount)}
          </div>
        </div>

        {/* Average per month */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isPersonalView ? 'Bình Quân Suất / Chu Kỳ' : 'Bình Quân / Kỳ Hoạt Động'}
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {avgMealsPerActiveMonth}{' '}
            <span className="text-sm font-normal text-slate-500">suất/kỳ</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            ~ {formatVND(Number(avgMealsPerActiveMonth) * settings.mealPrice)} / chu kỳ
          </div>
        </div>
      </div>

      {/* Main Content: Chart & Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 12-Month Bar Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {isPersonalView
                  ? `Xu Hướng Tiền Ăn 12 Chu Kỳ Của Tôi (Năm ${selectedYear})`
                  : `Xu Hướng Chi Phí Tiền Ăn 12 Chu Kỳ Trong Năm ${selectedYear}`}
              </h3>
              <p className="text-xs text-slate-500">
                {isPersonalView
                  ? `Số lượng bữa ăn ngoài của bạn qua các chu kỳ (từ ngày 26 đến 25 hàng tháng)`
                  : `Biểu đồ thể hiện số lượng suất ăn bên ngoài theo từng chu kỳ (26 đến 25)`}
              </p>
            </div>
            <span className="text-xs text-slate-500">
              Nhấp vào cột để chọn chu kỳ
            </span>
          </div>

          {/* Bar Chart Container */}
          <div className="pt-6 pb-2">
            <div className="flex items-end justify-between gap-1 sm:gap-2 h-56 border-b border-slate-200 pb-2">
              {monthlyStats.map((item) => {
                const heightPercent =
                  maxMonthlyMeals > 0
                    ? Math.max(8, Math.round((item.totalMeals / maxMonthlyMeals) * 100))
                    : 8;

                const isSelected =
                  selectedMonthFilter === 'all'
                    ? item.isCurrentCycle
                    : selectedMonthFilter === item.month;

                return (
                  <div
                    key={item.month}
                    onClick={() => {
                      onSelectCycle(item.cycle);
                      setSelectedMonthFilter(item.month);
                    }}
                    className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                  >
                    {/* Tooltip value */}
                    <span
                      className={`text-[10px] font-mono tabular-nums mb-1 transition-opacity ${
                        item.totalMeals > 0
                          ? 'opacity-80 group-hover:opacity-100 font-bold'
                          : 'opacity-0'
                      }`}
                    >
                      {item.totalMeals > 0 ? item.totalMeals : ''}
                    </span>

                    {/* Bar */}
                    <div
                      style={{ height: `${item.totalMeals > 0 ? heightPercent : 4}%` }}
                      className={`w-full max-w-[36px] rounded-t-md transition-all ${
                        isSelected
                          ? 'bg-emerald-600 shadow-md ring-2 ring-emerald-300'
                          : item.totalMeals > 0
                          ? 'bg-emerald-200 group-hover:bg-emerald-400'
                          : 'bg-slate-100 group-hover:bg-slate-200'
                      }`}
                    />

                    {/* X-axis label */}
                    <div className="mt-2 text-center">
                      <span
                        className={`text-[11px] block font-semibold ${
                          isSelected ? 'text-emerald-700' : 'text-slate-600'
                        }`}
                      >
                        T{item.month}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-emerald-600 rounded-sm"></span>
                  <span>Kỳ đang chọn</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-emerald-200 rounded-sm"></span>
                  <span>Có phát sinh tiền ăn</span>
                </span>
              </div>
              <span>Đơn vị tính: Suất/bữa ăn ngoài</span>
            </div>
          </div>
        </div>

        {/* Right Panel: If personal view, show personal history & meal types. If manager, show ranking */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          {isPersonalView ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Phân Loại Bữa & Địa Điểm Của Tôi
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500">
                  {selectedMonthFilter === 'all' ? `Năm ${selectedYear}` : `Kỳ T${selectedMonthFilter}`}
                </span>
              </div>

              {/* Meal Type Distribution */}
              <div className="space-y-2 mb-4 text-xs">
                <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  1. Phân loại theo bữa ăn:
                </div>
                {(['Bữa Trưa', 'Bữa Tối', 'Bữa Sáng', 'Bữa Đêm'] as MealType[]).map((type) => {
                  const count = personalMealTypeStats[type] || 0;
                  const ratio = totalScopeMeals > 0 ? Math.round((count / totalScopeMeals) * 100) : 0;
                  return (
                    <div key={type} className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-800">{type}</span>
                        <span className="font-mono font-bold text-slate-900">
                          {count} bữa <span className="font-normal text-slate-500">({formatVND(count * settings.mealPrice)})</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${ratio}%` }}
                          className="bg-emerald-600 h-full rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Locations Visited */}
              <div className="text-xs pt-3 border-t border-slate-100">
                <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>2. Địa điểm tuyển dụng đã đi:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(personalLocationCounts).length === 0 ? (
                    <span className="text-slate-400 italic">Chưa có lịch sử địa điểm</span>
                  ) : (
                    Object.entries(personalLocationCounts).map(([loc, count]) => (
                      <span
                        key={loc}
                        className="px-2 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-md text-[11px] font-medium"
                      >
                        {loc}: <strong>{count}</strong> lần
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Xếp Hạng Công Tác Tuyển Dụng
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500">
                  {selectedMonthFilter === 'all' ? `Năm ${selectedYear}` : `Kỳ T${selectedMonthFilter}`}
                </span>
              </div>

              <div className="space-y-3.5">
                {employeeRankings.map((item, idx) => {
                  const ratio =
                    totalScopeMeals > 0
                      ? Math.round((item.totalMeals / totalScopeMeals) * 100)
                      : 0;

                  return (
                    <div key={item.employee.id} className="text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              idx === 0
                                ? 'bg-amber-100 text-amber-800'
                                : idx === 1
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-slate-900">
                            {item.employee.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ({item.employee.id.slice(-4)})
                          </span>
                        </div>

                        <div className="text-right">
                          <strong className="text-slate-900 font-mono tabular-nums">
                            {item.totalMeals} bữa
                          </strong>
                          <span className="text-slate-500 text-[11px] ml-1">
                            ({formatVND(item.amount)})
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${ratio}%` }}
                          className="bg-emerald-600 h-full rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!isPersonalView && (
            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <button
                onClick={onExportExcel}
                title="Xuất toàn bộ báo cáo tiền ăn phòng tuyển dụng (.xlsx)"
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Xuất Toàn Bộ Báo Cáo Excel</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 12-Month Cycles Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              {isPersonalView
                ? `Bảng Lịch Sử 12 Chu Kỳ Tiền Ăn Của Tôi (Năm ${selectedYear})`
                : `Bảng Tổng Hợp 12 Chu Kỳ Tiền Ăn Trong Năm ${selectedYear}`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Quy tắc chốt từ ngày 26 tháng này đến 25 tháng kế tiếp
            </p>
          </div>

          <div className="text-xs text-slate-600 font-mono font-bold">
            Tổng cả năm: <span className="text-emerald-700">{formatVND(totalScopeAmount)}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3 text-center w-12">Kỳ</th>
                <th className="py-3 px-4">Khoảng thời gian chu kỳ</th>
                <th className="py-3 px-4 text-center">
                  {isPersonalView ? 'Số bữa đã chấm của tôi' : 'Số NV đi ngoài'}
                </th>
                <th className="py-3 px-4 text-center">Tổng số bữa</th>
                <th className="py-3 px-4 text-right">Đơn giá định mức</th>
                <th className="py-3 px-4 text-right">Thành tiền (VNĐ)</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-center w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {monthlyStats.map((item) => (
                <tr
                  key={item.month}
                  className={`hover:bg-slate-50/70 transition-colors ${
                    item.isCurrentCycle ? 'bg-emerald-50/30' : ''
                  }`}
                >
                  <td className="py-3 px-3 text-center font-bold text-slate-900">
                    T{item.month}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    <span className="font-semibold text-slate-900">
                      26/{String(item.month === 1 ? 12 : item.month - 1).padStart(2, '0')} - 25/{String(item.month).padStart(2, '0')}/{selectedYear}
                    </span>
                    {item.isCurrentCycle && (
                      <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded font-sans font-bold">
                        Chu kỳ hiện tại
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center font-mono">
                    {isPersonalView
                      ? `${item.totalMeals} bữa`
                      : `${item.activeStaffCount} / ${employees.length}`}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                    {item.totalMeals > 0 ? item.totalMeals : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">
                    {formatNumber(settings.mealPrice)} ₫
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {item.totalAmount > 0 ? (
                      <span className="text-emerald-700">{formatVND(item.totalAmount)}</span>
                    ) : (
                      <span className="text-slate-400">0 ₫</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {item.totalMeals > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Đã tổng hợp</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Chưa phát sinh</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onSelectCycle(item.cycle)}
                      className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-md font-medium text-[11px] transition-colors inline-flex items-center gap-1"
                    >
                      <span>Xem kỳ này</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                <td colSpan={3} className="py-3 px-4 uppercase text-xs">
                  {isPersonalView
                    ? `TỔNG CỘNG CỦA BẠN (${currentUser?.name}) CẢ NĂM ${selectedYear}`
                    : `TỔNG CỘNG CẢ NĂM ${selectedYear}`}
                </td>
                <td className="py-3 px-4 text-center font-mono text-sm">
                  {monthlyStats.reduce((acc, c) => acc + c.totalMeals, 0)} bữa
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-600">
                  {formatNumber(settings.mealPrice)} ₫
                </td>
                <td className="py-3 px-4 text-right font-mono text-emerald-800 text-sm">
                  {formatVND(monthlyStats.reduce((acc, c) => acc + c.totalAmount, 0))}
                </td>
                <td colSpan={2} className="py-3 px-4 text-center text-xs text-slate-500">
                  12 chu kỳ quyết toán
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
