import React from 'react';
import { Printer, X } from 'lucide-react';
import { Employee, EmployeeMealData, CycleConfig, AppSettings } from '../types';
import { getCycleDays, formatNumber, formatVND, numberToVietnameseWords, formatDateVN } from '../utils/cycleHelper';
import { WelstoryLogo } from './WelstoryLogo';

interface PrintTemplateProps {
  employees: Employee[];
  mealData: Record<string, EmployeeMealData>;
  cycle: CycleConfig;
  settings: AppSettings;
  onClose: () => void;
}

export const PrintTemplate: React.FC<PrintTemplateProps> = ({
  employees,
  mealData,
  cycle,
  settings,
  onClose,
}) => {
  const cycleDays = getCycleDays(cycle);

  let grandTotalMeals = 0;
  const rows = employees.map((emp, idx) => {
    const records = mealData[emp.id]?.records || {};
    let mealsCount = 0;
    cycleDays.forEach((day) => {
      const rec = records[day.dateStr];
      if (rec && rec.mealsCount > 0) {
        mealsCount += rec.mealsCount;
      }
    });

    const amount = mealsCount * settings.mealPrice;
    grandTotalMeals += mealsCount;

    return {
      stt: idx + 1,
      id: emp.id,
      name: emp.name,
      department: emp.department,
      mealsCount,
      amount,
      notes: emp.notes || '',
    };
  });

  const grandTotalAmount = grandTotalMeals * settings.mealPrice;

  const handlePrint = () => {
    window.print();
  };

  const today = new Date();
  const dayStr = String(today.getDate()).padStart(2, '0');
  const monthStr = String(today.getMonth() + 1).padStart(2, '0');
  const yearStr = today.getFullYear();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      {/* Top Floating Action Bar (hidden on print) */}
      <div className="no-print max-w-4xl w-full mx-auto mb-4 bg-white p-3 rounded-xl shadow-lg border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Printer className="w-5 h-5 text-emerald-600" />
          <span className="font-bold text-slate-800 text-sm">
            Xem trước bản in bảng thanh toán tiền ăn
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>In ngay (Print / Lưu PDF)</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* A4 Sheet Container */}
      <div className="max-w-4xl w-full mx-auto bg-white p-8 sm:p-12 rounded-xl shadow-xl border border-slate-200 text-slate-900 print:shadow-none print:border-none print:p-0 print:m-0">
        {/* Document Header */}
        <div className="flex justify-between items-start border-b border-slate-300 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <WelstoryLogo size="md" className="shrink-0" />
            <div>
              <div className="font-bold text-sm uppercase tracking-wide">
                {settings.companyName}
              </div>
              <div className="text-xs font-semibold text-slate-700 uppercase mt-0.5">
                {settings.departmentName}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Số: ......... /QTTĂ-TD
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="font-bold text-xs uppercase">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </div>
            <div className="text-xs italic underline">
              Độc lập - Tự do - Hạnh phúc
            </div>
            <div className="text-xs text-slate-500 italic mt-1">
              Hà Nội, ngày {dayStr} tháng {monthStr} năm {yearStr}
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center my-6">
          <h1 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-slate-900">
            BẢNG TỔNG HỢP CHI PHÍ TIỀN ĂN BÊN NGOÀI
          </h1>
          <p className="text-sm font-semibold text-slate-700 mt-1">
            {settings.departmentName.toUpperCase()} · BỘ PHẬN TUYỂN DỤNG
          </p>
          <p className="text-xs text-slate-600 italic mt-0.5">
            (Chu kỳ quyết toán: Từ ngày {formatDateVN(cycle.startDate)} đến ngày {formatDateVN(cycle.endDate)})
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Đơn giá khoán định mức: <strong>{formatNumber(settings.mealPrice)} VNĐ/1 bữa</strong>
          </p>
        </div>

        {/* Official Summary Table */}
        <table className="w-full text-xs border-collapse border border-slate-400 my-4">
          <thead>
            <tr className="bg-slate-100 text-slate-800 font-bold text-center">
              <th className="border border-slate-400 p-2 w-10">STT</th>
              <th className="border border-slate-400 p-2 w-28">Mã NV</th>
              <th className="border border-slate-400 p-2 text-left">Họ và tên</th>
              <th className="border border-slate-400 p-2 text-left">Bộ phận</th>
              <th className="border border-slate-400 p-2 w-24">Số ngày ăn</th>
              <th className="border border-slate-400 p-2 w-24 text-right">Đơn giá</th>
              <th className="border border-slate-400 p-2 w-28 text-right">Thành tiền (VNĐ)</th>
              <th className="border border-slate-400 p-2 w-24">Ký nhận</th>
              <th className="border border-slate-400 p-2">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="border border-slate-400 p-2 text-center font-mono">
                  {row.stt}
                </td>
                <td className="border border-slate-400 p-2 font-mono font-semibold">
                  {row.id}
                </td>
                <td className="border border-slate-400 p-2 font-semibold">
                  {row.name}
                </td>
                <td className="border border-slate-400 p-2">
                  {row.department}
                </td>
                <td className="border border-slate-400 p-2 text-center font-mono font-bold">
                  {row.mealsCount}
                </td>
                <td className="border border-slate-400 p-2 text-right font-mono">
                  {formatNumber(settings.mealPrice)}
                </td>
                <td className="border border-slate-400 p-2 text-right font-mono font-bold">
                  {formatNumber(row.amount)}
                </td>
                <td className="border border-slate-400 p-2 text-center"></td>
                <td className="border border-slate-400 p-2 text-[11px] text-slate-600">
                  {row.notes}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold">
              <td colSpan={4} className="border border-slate-400 p-2 text-center uppercase">
                TỔNG CỘNG
              </td>
              <td className="border border-slate-400 p-2 text-center font-mono text-sm">
                {grandTotalMeals}
              </td>
              <td className="border border-slate-400 p-2 text-right font-mono">
                {formatNumber(settings.mealPrice)}
              </td>
              <td className="border border-slate-400 p-2 text-right font-mono text-sm">
                {formatNumber(grandTotalAmount)}
              </td>
              <td colSpan={2} className="border border-slate-400 p-2"></td>
            </tr>
          </tfoot>
        </table>

        {/* Written words */}
        <div className="my-4 text-xs">
          <strong>Số tiền bằng chữ: </strong>
          <span className="italic font-medium text-slate-800">
            {numberToVietnameseWords(grandTotalAmount)}
          </span>
        </div>

        {/* Signatures 4 columns */}
        <div className="grid grid-cols-4 gap-4 text-center text-xs mt-10 pt-4">
          <div>
            <div className="font-bold uppercase">Người lập biểu</div>
            <div className="text-[11px] italic text-slate-500">(Ký, họ tên)</div>
            <div className="h-20 flex items-end justify-center font-semibold">
              {settings.preparerName}
            </div>
          </div>

          <div>
            <div className="font-bold uppercase">TP. Tuyển dụng</div>
            <div className="text-[11px] italic text-slate-500">(Ký, họ tên)</div>
            <div className="h-20 flex items-end justify-center font-semibold">
              {settings.leaderName}
            </div>
          </div>

          <div>
            <div className="font-bold uppercase">Kế toán thanh toán</div>
            <div className="text-[11px] italic text-slate-500">(Ký, họ tên)</div>
            <div className="h-20 flex items-end justify-center font-semibold">
              {settings.accountantName}
            </div>
          </div>

          <div>
            <div className="font-bold uppercase">Giám đốc duyệt</div>
            <div className="text-[11px] italic text-slate-500">(Ký, đóng dấu)</div>
            <div className="h-20 flex items-end justify-center font-semibold">
              {settings.directorName}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
