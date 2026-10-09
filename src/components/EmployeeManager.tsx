import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  RotateCcw, 
  Check, 
  X, 
  Copy, 
  ShieldCheck, 
  KeyRound, 
  RefreshCw,
  Sparkles,
  Eye,
  EyeOff,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Bell,
  Search,
  Mail
} from 'lucide-react';
import { Employee, AuthUser, PasswordResetRequest } from '../types';
import { INITIAL_EMPLOYEES } from '../utils/initialData';

interface EmployeeManagerProps {
  employees: Employee[];
  setEmployees: (employees: Employee[]) => void;
  currentUser?: AuthUser | null;
  passwordRequests?: PasswordResetRequest[];
  onApprovePasswordReset?: (requestId: string) => void;
  onRejectPasswordReset?: (requestId: string, reason?: string) => void;
}

export const EmployeeManager: React.FC<EmployeeManagerProps> = ({
  employees,
  setEmployees,
  currentUser,
  passwordRequests = [],
  onApprovePasswordReset,
  onRejectPasswordReset,
}) => {
  // Sub-view: 'employees' | 'requests'
  const [viewTab, setViewTab] = useState<'employees' | 'requests'>('employees');
  const [searchTerm, setSearchTerm] = useState('');

  // Request filter state
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [idInput, setIdInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [deptInput, setDeptInput] = useState('HR Group');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('123456');
  const [roleInput, setRoleInput] = useState<'nhan_vien_nhan_su' | 'quan_ly_nhan_su'>('nhan_vien_nhan_su');
  const [errorMessage, setErrorMessage] = useState('');

  // Handover slip modal state
  const [handoverEmployee, setHandoverEmployee] = useState<Employee | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [showReqPasswordMap, setShowReqPasswordMap] = useState<Record<string, boolean>>({});

  // Quick reset password state
  const [quickPasswordEmp, setQuickPasswordEmp] = useState<Employee | null>(null);
  const [quickNewPassword, setQuickNewPassword] = useState('');
  const [quickPasswordSuccess, setQuickPasswordSuccess] = useState('');

  // Toast feedback
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const colors = [
    'bg-emerald-600',
    'bg-sky-600',
    'bg-indigo-600',
    'bg-amber-600',
    'bg-teal-600',
    'bg-violet-600',
    'bg-rose-600',
    'bg-cyan-600',
  ];

  const pendingRequests = passwordRequests.filter((r) => r.status === 'pending');
  const pendingCount = pendingRequests.length;

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Helper to generate a realistic Welstory Employee ID
  const handleAutoGenerateId = () => {
    const prefix = '2502';
    const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
    const generated = `${prefix}${randomSuffix}`;
    setIdInput(generated);
  };

  const handleStartAdd = () => {
    setViewTab('employees');
    setIsAdding(true);
    setEditingId(null);
    setIdInput('');
    setNameInput('');
    setDeptInput('HR Group');
    setPhoneInput('');
    setEmailInput('');
    setNotesInput('');
    setPasswordInput('123456');
    setRoleInput('nhan_vien_nhan_su');
    setErrorMessage('');
  };

  const handleStartEdit = (emp: Employee) => {
    setViewTab('employees');
    setEditingId(emp.id);
    setIsAdding(false);
    setIdInput(emp.id);
    setNameInput(emp.name);
    setDeptInput(emp.department || 'HR Group');
    setPhoneInput(emp.phone || '');
    setEmailInput(emp.email || '');
    setNotesInput(emp.notes || '');
    setPasswordInput(emp.password || '123456');
    setRoleInput(emp.role === 'quan_ly_nhan_su' ? 'quan_ly_nhan_su' : 'nhan_vien_nhan_su');
    setErrorMessage('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = idInput.trim();
    const cleanName = nameInput.trim();

    if (!cleanId) {
      setErrorMessage('Vui lòng nhập Mã nhân viên');
      return;
    }
    if (!cleanName) {
      setErrorMessage('Vui lòng nhập Họ và tên nhân viên');
      return;
    }

    if (isAdding) {
      if (employees.some((e) => e.id === cleanId)) {
        setErrorMessage('Mã nhân viên này đã tồn tại trong hệ thống');
        return;
      }

      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const newEmp: Employee = {
        id: cleanId,
        name: cleanName,
        department: deptInput.trim(),
        phone: phoneInput.trim(),
        email: emailInput.trim() || undefined,
        notes: notesInput.trim(),
        avatarColor: randomColor,
        password: passwordInput.trim() || '123456',
        role: roleInput,
      };

      setEmployees([...employees, newEmp]);
      setIsAdding(false);
      setHandoverEmployee(newEmp);
      showNotice(`Đã tạo tài khoản cho nhân viên ${newEmp.name} (${newEmp.id})`);
    } else if (editingId) {
      if (cleanId !== editingId && employees.some((e) => e.id === cleanId)) {
        setErrorMessage('Mã nhân viên mới này đã tồn tại');
        return;
      }

      setEmployees(
        employees.map((e) =>
          e.id === editingId
            ? {
                ...e,
                id: cleanId,
                name: cleanName,
                department: deptInput.trim(),
                phone: phoneInput.trim(),
                email: emailInput.trim() || undefined,
                notes: notesInput.trim(),
                password: passwordInput.trim() || '123456',
                role: roleInput,
              }
            : e
        )
      );
      setEditingId(null);
      showNotice(`Đã cập nhật thông tin nhân viên ${cleanName}`);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa nhân viên "${name}" (${id}) khỏi hệ thống?`)) {
      setEmployees(employees.filter((e) => e.id !== id));
      showNotice(`Đã xóa nhân viên ${name}`);
    }
  };

  const handleResetPassword = (id: string, name: string) => {
    if (confirm(`Đặt lại mật khẩu cho "${name}" về mặc định "123456"?`)) {
      setEmployees(
        employees.map((e) => (e.id === id ? { ...e, password: '123456' } : e))
      );
      showNotice(`Đã đặt lại mật khẩu cho "${name}" về 123456`);
    }
  };

  const handleSaveQuickPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPasswordEmp || !quickNewPassword.trim()) return;

    setEmployees(
      employees.map((e) =>
        e.id === quickPasswordEmp.id ? { ...e, password: quickNewPassword.trim() } : e
      )
    );

    setQuickPasswordSuccess(`Đã đổi mật khẩu cho ${quickPasswordEmp.name} thành công!`);
    showNotice(`Đã đổi mật khẩu cho ${quickPasswordEmp.name}`);
    setTimeout(() => {
      setQuickPasswordEmp(null);
      setQuickNewPassword('');
      setQuickPasswordSuccess('');
    }, 1200);
  };

  const handleCopyHandoverMessage = (emp: Employee) => {
    const loginUrl = window.location.origin;
    const emailLine = emp.email ? `\n• Email nhận thông báo: ${emp.email}` : '';
    const phoneLine = emp.phone ? `\n• Số điện thoại / Zalo: ${emp.phone}` : '';
    const message = `Kính gửi Anh/Chị ${emp.name},\nBộ phận Tuyển dụng (HR Group) gửi Anh/Chị thông tin tài khoản truy cập phần mềm Chấm Tiền Ăn Bên Ngoài Welstory:\n\n• Tên đăng nhập (Mã NV): ${emp.id}\n• Mật khẩu khởi tạo: ${emp.password || '123456'}${emailLine}${phoneLine}\n• Vai trò: ${emp.role === 'quan_ly_nhan_su' ? 'Trưởng nhóm tuyển dụng' : 'Nhân viên tuyển dụng'}\n• Đường link truy cập: ${loginUrl}\n\nSau khi đăng nhập thành công, Anh/Chị vui lòng chọn nút "Đổi MK" ở thanh tiêu đề trên cùng để cập nhật mật khẩu riêng.`;

    navigator.clipboard.writeText(message).then(() => {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
    });
  };

  const handleResetToDefault = () => {
    if (confirm('Khôi phục lại danh sách 5 nhân viên tuyển dụng mặc định ban đầu?')) {
      setEmployees(INITIAL_EMPLOYEES);
      showNotice('Đã khôi phục danh sách mẫu ban đầu');
    }
  };

  const toggleShowPassword = (id: string) => {
    setShowPasswordMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleShowReqPassword = (id: string) => {
    setShowReqPasswordMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleApprove = (req: PasswordResetRequest) => {
    if (onApprovePasswordReset) {
      onApprovePasswordReset(req.id);
      showNotice(`ĐÃ DUYỆT: Mật khẩu mới của ${req.employeeName} (${req.employeeId}) đã có hiệu lực!`);
    }
  };

  const handleReject = (req: PasswordResetRequest) => {
    if (confirm(`Bạn có chắc muốn từ chối yêu cầu đổi mật khẩu của ${req.employeeName} (${req.employeeId})?`)) {
      if (onRejectPasswordReset) {
        onRejectPasswordReset(req.id);
        showNotice(`Đã từ chối yêu cầu đổi mật khẩu của ${req.employeeName}`);
      }
    }
  };

  // Filtered requests
  const filteredRequests = passwordRequests.filter((r) => {
    if (requestFilter === 'pending') return r.status === 'pending';
    if (requestFilter === 'approved') return r.status === 'approved';
    if (requestFilter === 'rejected') return r.status === 'rejected';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Toast Notice */}
      {actionNotice && (
        <div className="p-3 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Admin Notice Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base">Quản Lý Tài Khoản & Phê Duyệt Mật Khẩu</span>
              <span className="bg-emerald-500/30 text-emerald-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-emerald-500/40">
                Admin HR
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Cấp tài khoản mới cho nhân sự, kiểm soát quyền truy cập và xét duyệt yêu cầu cấp lại mật khẩu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục mẫu</span>
          </button>

          {!isAdding && !editingId && (
            <button
              onClick={handleStartAdd}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-all shadow-md active:scale-95"
            >
              <UserPlus className="w-4 h-4 text-slate-900" />
              <span>+ Cấp Tài Khoản Mới Cho NV</span>
            </button>
          )}
        </div>
      </div>

      {/* Pending Requests Alert Banner (if any) */}
      {pendingCount > 0 && viewTab !== 'requests' && (
        <div 
          onClick={() => {
            setViewTab('requests');
            setRequestFilter('pending');
          }}
          className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between cursor-pointer hover:bg-amber-100/80 transition-colors shadow-xs animate-in fade-in"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 animate-pulse">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-950">
                Có {pendingCount} yêu cầu đổi mật khẩu mới từ nhân viên đang chờ Admin phê duyệt!
              </span>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Nhân viên chỉ có thể dùng mật khẩu mới sau khi bạn bấm duyệt.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-900 bg-white px-3 py-1.5 rounded-lg border border-amber-300 shadow-2xs hover:bg-amber-50">
            Xem và Duyệt ngay &rarr;
          </span>
        </div>
      )}

      {/* Main Tabs Navigation: Danh sách tài khoản vs Yêu cầu đổi mật khẩu */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setViewTab('employees')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
            viewTab === 'employees'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Danh Sách Nhân Viên ({employees.length})</span>
        </button>

        <button
          onClick={() => setViewTab('requests')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all relative ${
            viewTab === 'requests'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Duyệt Đổi Mật Khẩu</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] bg-amber-500 text-white font-bold rounded-full animate-pulse">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: EMPLOYEES LIST & MANAGEMENT */}
      {viewTab === 'employees' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {/* Add / Edit Form Drawer */}
          {(isAdding || editingId) && (
            <form onSubmit={handleSave} className="p-5 bg-emerald-50/70 border-b border-emerald-200 text-xs animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-200/80 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-slate-900 text-sm">
                    {isAdding ? 'Cấp Tài Khoản Mới Cho Nhân Viên Tuyển Dụng' : 'Chỉnh Sửa Thông Tin & Mật Khẩu'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-semibold">
                      Mã NV (Username) <span className="text-rose-500">*</span>:
                    </label>
                    {isAdding && (
                      <button
                        type="button"
                        onClick={handleAutoGenerateId}
                        className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Tự sinh mã</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 2502038104"
                    value={idInput}
                    onChange={(e) => setIdInput(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Họ và tên <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn Hùng"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-semibold">Mật khẩu khởi tạo:</label>
                    <button
                      type="button"
                      onClick={() => setPasswordInput('123456')}
                      className="text-[10px] text-slate-500 hover:text-emerald-700"
                    >
                      Mặc định (123456)
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="123456"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Vai trò:</label>
                  <select
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value as 'nhan_vien_nhan_su' | 'quan_ly_nhan_su')}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="nhan_vien_nhan_su">Nhân viên Nhân sự</option>
                    <option value="quan_ly_nhan_su">Quản lý Nhân sự</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Số điện thoại:</label>
                  <input
                    type="text"
                    placeholder="0981 xxx xxx"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email nhân viên:</label>
                  <input
                    type="email"
                    placeholder="hung.nv@welstory.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Ghi chú địa bàn:</label>
                  <input
                    type="text"
                    placeholder="KCN Bắc Ninh, Hà Nam..."
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-emerald-200/60">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                  }}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>{isAdding ? 'Tạo Tài Khoản & Xuất Phiếu Bàn Giao' : 'Cập Nhật Thay Đổi'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Quick Password Modal */}
          {quickPasswordEmp && (
            <div className="p-4 bg-amber-50 border-b border-amber-200 text-xs flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <KeyRound className="w-4 h-4 text-amber-700" />
                <span>Đổi mật khẩu cho: {quickPasswordEmp.name} ({quickPasswordEmp.id})</span>
              </div>
              <form onSubmit={handleSaveQuickPassword} className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Nhập mật khẩu mới..."
                  value={quickNewPassword}
                  onChange={(e) => setQuickNewPassword(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-slate-900 font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Lưu Mật Khẩu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickPasswordEmp(null);
                    setQuickNewPassword('');
                  }}
                  className="px-2.5 py-1.5 text-slate-600 hover:bg-amber-100 rounded-lg"
                >
                  Đóng
                </button>
              </form>
              {quickPasswordSuccess && (
                <span className="text-emerald-700 font-bold ml-2">{quickPasswordSuccess}</span>
              )}
            </div>
          )}

          {/* Search bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên, mã NV, email hoặc SĐT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Employees Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-12">STT</th>
                  <th className="py-3 px-4 w-36">Mã NV (Tài khoản)</th>
                  <th className="py-3 px-4 min-w-[200px]">Họ và Tên</th>
                  <th className="py-3 px-4">Vai trò</th>
                  <th className="py-3 px-4">Mật khẩu hiện tại</th>
                  <th className="py-3 px-4">Số điện thoại</th>
                  <th className="py-3 px-4 min-w-[190px]">Email</th>
                  <th className="py-3 px-4">Ghi chú</th>
                  <th className="py-3 px-4 text-center min-w-[160px]">Thao tác Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {employees
                  .filter((e) => {
                    const term = searchTerm.toLowerCase();
                    return (
                      e.name.toLowerCase().includes(term) ||
                      e.id.toLowerCase().includes(term) ||
                      (e.email && e.email.toLowerCase().includes(term)) ||
                      (e.phone && e.phone.includes(term))
                    );
                  })
                  .map((emp, index) => {
                  const isPassVisible = showPasswordMap[emp.id];
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-3 text-center text-xs text-slate-400 font-mono">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-xs">
                        {emp.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                              emp.avatarColor || 'bg-emerald-600'
                            }`}
                          >
                            {emp.name.split(' ').pop()?.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-900">{emp.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {emp.role === 'quan_ly_nhan_su' ? (
                          <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Quản lý Nhân sự
                          </span>
                        ) : (
                          <span className="text-slate-600">Nhân viên Nhân sự</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                          <span>{isPassVisible ? (emp.password || '123456') : '••••••'}</span>
                          <button
                            type="button"
                            onClick={() => toggleShowPassword(emp.id)}
                            className="text-slate-400 hover:text-slate-700"
                            title={isPassVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          >
                            {isPassVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 font-mono">
                        {emp.phone || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono">
                        {emp.email ? (
                          <a
                            href={`mailto:${emp.email}`}
                            className="text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1.5"
                            title={`Gửi email đến ${emp.email}`}
                          >
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[170px]">{emp.email}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {emp.notes || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Copy / Issue Handover Card */}
                          <button
                            onClick={() => setHandoverEmployee(emp)}
                            title="Cấp tài khoản & Sao chép tin nhắn gửi nhân viên"
                            className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Cấp TK</span>
                          </button>

                          {/* Quick password change */}
                          <button
                            onClick={() => {
                              setQuickPasswordEmp(emp);
                              setQuickNewPassword(emp.password || '123456');
                            }}
                            title="Đổi mật khẩu cho nhân viên này"
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-colors"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset password to 123456 */}
                          <button
                            onClick={() => handleResetPassword(emp.id, emp.name)}
                            title="Đặt lại mật khẩu về 123456"
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit details */}
                          <button
                            onClick={() => handleStartEdit(emp)}
                            title="Sửa thông tin"
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(emp.id, emp.name)}
                            title="Xóa nhân viên"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
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
        </div>
      )}

      {/* TAB 2: PASSWORD RESET APPROVAL REQUESTS */}
      {viewTab === 'requests' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {/* Header & Filter Controls */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <span>Xét Duyệt Yêu Cầu Cấp Lại Mật Khẩu Từ Màn Hình Đăng Nhập</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Chỉ khi Admin bấm <strong className="text-emerald-700">"Duyệt"</strong> thì mật khẩu mới của nhân viên mới bắt đầu có hiệu lực đăng nhập.
              </p>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setRequestFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  requestFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Tất cả ({passwordRequests.length})
              </button>

              <button
                onClick={() => setRequestFilter('pending')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                  requestFilter === 'pending'
                    ? 'bg-amber-500 text-white'
                    : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
                }`}
              >
                <span>Chờ duyệt</span>
                <span className="px-1 bg-black/20 text-white rounded-full text-[10px]">
                  {pendingCount}
                </span>
              </button>

              <button
                onClick={() => setRequestFilter('approved')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  requestFilter === 'approved'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                Đã duyệt ({passwordRequests.filter((r) => r.status === 'approved').length})
              </button>

              <button
                onClick={() => setRequestFilter('rejected')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  requestFilter === 'rejected'
                    ? 'bg-rose-600 text-white'
                    : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                }`}
              >
                Đã từ chối ({passwordRequests.filter((r) => r.status === 'rejected').length})
              </button>
            </div>
          </div>

          {/* Requests Table */}
          {filteredRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <KeyRound className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-medium text-slate-600">
                {requestFilter === 'pending'
                  ? 'Hiện không có yêu cầu đổi mật khẩu nào đang chờ duyệt.'
                  : 'Chưa có yêu cầu nào trong danh sách.'}
              </p>
              <p className="text-xs text-slate-400">
                Khi nhân viên bấm "Quên mật khẩu?" tại màn hình đăng nhập, yêu cầu sẽ hiển thị tại đây để Admin duyệt.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-12">STT</th>
                    <th className="py-3 px-4 w-36">Mã NV</th>
                    <th className="py-3 px-4 min-w-[180px]">Họ và Tên</th>
                    <th className="py-3 px-4 min-w-[150px]">Mật khẩu mới yêu cầu</th>
                    <th className="py-3 px-4">Thời gian gửi</th>
                    <th className="py-3 px-4">Lý do</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-center min-w-[170px]">Thao tác duyệt của Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredRequests.map((req, index) => {
                    const isPassVisible = showReqPasswordMap[req.id];
                    const dateFormatted = new Date(req.createdAt).toLocaleString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    });

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 text-center text-xs text-slate-400 font-mono">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 text-xs">
                          {req.employeeId}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {req.employeeName}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded text-slate-800">
                            <span>{isPassVisible ? req.newPassword : '••••••'}</span>
                            <button
                              type="button"
                              onClick={() => toggleShowReqPassword(req.id)}
                              className="text-slate-400 hover:text-slate-700"
                              title={isPassVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            >
                              {isPassVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                          {dateFormatted}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {req.reason || '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {req.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              <span>Chờ duyệt</span>
                            </span>
                          )}
                          {req.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Đã duyệt</span>
                            </span>
                          )}
                          {req.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <XCircle className="w-3 h-3" />
                              <span>Đã từ chối</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {req.status === 'pending' ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleApprove(req)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                                title="Duyệt và cập nhật mật khẩu mới này cho nhân viên"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Duyệt Mật Khẩu</span>
                              </button>
                              <button
                                onClick={() => handleReject(req)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-lg text-xs font-semibold transition-colors"
                                title="Từ chối yêu cầu"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Từ chối</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              {req.status === 'approved'
                                ? `Bởi ${req.reviewedBy || 'Admin'}`
                                : 'Đã từ chối'}
                            </span>
                          )}
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

      {/* Handover Modal: Phiếu Cấp Tài Khoản Bàn Giao Cho Nhân Viên */}
      {handoverEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Phiếu Cấp Tài Khoản Nhân Viên</h3>
                  <p className="text-xs text-slate-500">Thông tin bàn giao tài khoản chấm tiền ăn ngoài</p>
                </div>
              </div>
              <button
                onClick={() => setHandoverEmployee(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {copiedSuccess && (
              <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Đã sao chép toàn bộ thông tin đăng nhập vào bộ nhớ tạm!</span>
              </div>
            )}

            {/* Credential Slip Card */}
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
                <span className="text-slate-500 font-sans">Họ và tên:</span>
                <span className="font-bold text-slate-900 font-sans">{handoverEmployee.name}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
                <span className="text-slate-500 font-sans">Tên đăng nhập (Mã NV):</span>
                <span className="font-bold text-emerald-700">{handoverEmployee.id}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
                <span className="text-slate-500 font-sans">Mật khẩu khởi tạo:</span>
                <span className="font-bold text-emerald-700">{handoverEmployee.password || '123456'}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
                <span className="text-slate-500 font-sans">Vai trò:</span>
                <span className="font-sans font-medium text-slate-800">
                  {handoverEmployee.role === 'quan_ly_nhan_su' ? 'Trưởng nhóm tuyển dụng' : 'Nhân viên tuyển dụng'}
                </span>
              </div>

              {handoverEmployee.email && (
                <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
                  <span className="text-slate-500 font-sans">Email:</span>
                  <span className="font-mono text-emerald-700 truncate max-w-[220px]">{handoverEmployee.email}</span>
                </div>
              )}

              {handoverEmployee.phone && (
                <div className="flex justify-between items-center py-1 border-b border-slate-200/80">
                  <span className="text-slate-500 font-sans">Số điện thoại / Zalo:</span>
                  <span className="font-mono text-slate-700">{handoverEmployee.phone}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-sans">Đường dẫn truy cập:</span>
                <span className="text-[11px] text-slate-600 truncate max-w-[200px]">{window.location.origin}</span>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={() => handleCopyHandoverMessage(handoverEmployee)}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span>Sao Chép Tin Nhắn Gửi Cho Nhân Viên</span>
              </button>

              <button
                type="button"
                onClick={() => setHandoverEmployee(null)}
                className="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-medium text-center"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
