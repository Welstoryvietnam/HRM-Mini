import React, { useState } from 'react';
import { 
  X, 
  Settings as SettingsIcon, 
  Save, 
  Download, 
  Upload, 
  RotateCcw,
  CheckCircle2,
  Banknote,
  Trash2
} from 'lucide-react';
import { AppSettings, Employee, EmployeeMealData } from '../types';
import { INITIAL_EMPLOYEES, INITIAL_MEAL_DATA, DEFAULT_SETTINGS } from '../utils/initialData';
import { deleteAllMealRecords } from '../utils/firebase';

interface SettingsModalProps {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  employees: Employee[];
  setEmployees: (employees: Employee[]) => void;
  mealData: Record<string, EmployeeMealData>;
  setMealData: (data: Record<string, EmployeeMealData>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  setSettings,
  employees,
  setEmployees,
  mealData,
  setMealData,
  onClose,
}) => {
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  const handleExportJSON = () => {
    const backup = {
      timestamp: new Date().toISOString(),
      settings: formData,
      employees,
      mealData,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Sao_Luu_Tien_An_Tuyendung_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.employees && parsed.mealData) {
            setEmployees(parsed.employees);
            setMealData(parsed.mealData);
            if (parsed.settings) {
              setSettings(parsed.settings);
              setFormData(parsed.settings);
            }
            alert('Khôi phục dữ liệu từ file JSON thành công!');
            onClose();
          } else {
            alert('File JSON không hợp lệ hoặc thiếu cấu trúc!');
          }
        } catch {
          alert('Đã xảy ra lỗi khi đọc file JSON!');
        }
      };
    }
  };

  const handleClearMealDataOnly = async () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu tiền ăn đã chấm trong ứng dụng và cloud? (Toàn bộ danh sách tài khoản và nhân viên sẽ được giữ nguyên 100%)')) {
      await deleteAllMealRecords();
      setMealData({});
      alert('Đã xóa toàn bộ dữ liệu tiền ăn! Danh sách nhân viên và tài khoản được giữ nguyên.');
      onClose();
    }
  };

  const handleResetAll = () => {
    if (confirm('Khôi phục toàn bộ danh sách nhân viên mặc định và làm trống dữ liệu tiền ăn?')) {
      setEmployees(INITIAL_EMPLOYEES);
      setMealData({});
      setSettings(DEFAULT_SETTINGS);
      setFormData(DEFAULT_SETTINGS);
      alert('Đã khôi phục dữ liệu ban đầu!');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">
              Cài Đặt Hệ Thống & Định Mức Tiền Ăn
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Rate */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
            <label className="flex items-center gap-1.5 font-bold text-emerald-900 mb-1">
              <Banknote className="w-4 h-4 text-emerald-700" />
              <span>Đơn giá tiền ăn bên ngoài (VNĐ / 1 bữa):</span>
            </label>
            <div className="relative mt-1">
              <input
                type="number"
                step={5000}
                min={0}
                required
                value={formData.mealPrice}
                onChange={(e) =>
                  setFormData({ ...formData, mealPrice: Number(e.target.value) || 0 })
                }
                className="w-full p-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-sm text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                VNĐ/bữa (Mặc định: 40.000 đ)
              </span>
            </div>
            <p className="text-[11px] text-emerald-700 mt-1">
              Theo quy định phòng Nhân sự tuyển dụng: 40.000 VNĐ cho mỗi suất ăn bên ngoài.
            </p>
          </div>

          {/* Org & Dept */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Tên đơn vị / Công ty:</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Tên phòng ban / Bộ phận:</label>
              <input
                type="text"
                value={formData.departmentName}
                onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Signers */}
          <div className="border-t border-slate-100 pt-3">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
              Họ tên chức danh ký duyệt biểu mẫu
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Người lập biểu:</label>
                <input
                  type="text"
                  value={formData.preparerName}
                  onChange={(e) => setFormData({ ...formData, preparerName: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Trưởng bộ phận Tuyển dụng:</label>
                <input
                  type="text"
                  value={formData.leaderName}
                  onChange={(e) => setFormData({ ...formData, leaderName: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Kế toán thanh toán:</label>
                <input
                  type="text"
                  value={formData.accountantName}
                  onChange={(e) => setFormData({ ...formData, accountantName: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Giám đốc phê duyệt:</label>
                <input
                  type="text"
                  value={formData.directorName}
                  onChange={(e) => setFormData({ ...formData, directorName: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Backup & Restore Data */}
          <div className="border-t border-slate-100 pt-3">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
              Quản lý dữ liệu (Sao lưu & Khôi phục)
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Sao lưu dữ liệu (Tải JSON)</span>
              </button>

              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Nhập lại dữ liệu (Nạp JSON)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleClearMealDataOnly}
                className="flex items-center gap-1.5 px-3 py-1.5 text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg font-medium transition-colors border border-amber-200"
                title="Xóa toàn bộ các bản ghi chấm tiền ăn nhưng giữ nguyên các tài khoản nhân viên"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-700" />
                <span>Xóa dữ liệu tiền ăn</span>
              </button>

              <button
                type="button"
                onClick={handleResetAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg font-medium transition-colors ml-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại ban đầu</span>
              </button>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            {savedSuccess ? (
              <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Đã lưu cài đặt thành công!</span>
              </span>
            ) : (
              <span className="text-slate-400">Dữ liệu được tự động lưu trên máy tính</span>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Đóng
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>Lưu cấu hình</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
