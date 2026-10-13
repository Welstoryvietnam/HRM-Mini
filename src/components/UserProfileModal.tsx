import React, { useState, useEffect } from 'react';
import {
  User,
  KeyRound,
  X,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Phone,
  Mail,
  Building2,
  ShieldCheck,
  Save,
} from 'lucide-react';
import { AuthUser } from '../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onUpdateProfile: (
    employeeId: string,
    updates: { phone?: string; email?: string; password?: string }
  ) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateProfile,
}) => {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setPhone(currentUser.phone || '');
      setEmail(currentUser.email || '');
      setIsChangingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess(false);
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    // Validate email format if provided
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Định dạng email không hợp lệ (Ví dụ: ten.nv@welstory.com)');
      return;
    }

    // Validate phone number format if provided
    if (trimmedPhone && !/^[0-9+\s\-().]{8,15}$/.test(trimmedPhone)) {
      setError('Số điện thoại không hợp lệ (Ví dụ: 0912 345 678)');
      return;
    }

    // Validate password if user opted to change it
    let passwordToUpdate: string | undefined = undefined;
    if (isChangingPassword) {
      const trimmedPass = newPassword.trim();
      if (!trimmedPass) {
        setError('Vui lòng nhập mật khẩu mới nếu muốn đổi mật khẩu');
        return;
      }
      if (trimmedPass.length < 4) {
        setError('Mật khẩu mới phải có ít nhất 4 ký tự');
        return;
      }
      if (trimmedPass !== confirmPassword.trim()) {
        setError('Mật khẩu xác nhận không khớp');
        return;
      }
      passwordToUpdate = trimmedPass;
    }

    onUpdateProfile(currentUser.id, {
      phone: trimmedPhone,
      email: trimmedEmail,
      password: passwordToUpdate,
    });

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Thông Tin Cá Nhân & Tài Khoản
              </h3>
              <p className="text-xs text-slate-500">
                Nhân viên tự quản lý SĐT, Email và Mật khẩu đăng nhập
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-2 animate-in fade-in">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-900">
              Cập nhật thông tin thành công!
            </p>
            <p className="text-xs text-slate-500">
              Dữ liệu cá nhân của bạn đã được lưu vào hệ thống.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Read-only Employee Summary Card */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                    currentUser.avatarColor || 'bg-emerald-600'
                  }`}
                >
                  {currentUser.name.split(' ').pop()?.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-slate-900">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Mã NV: {currentUser.id} • {currentUser.department || 'HR Group'}
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                {currentUser.role === 'admin'
                  ? 'Admin'
                  : currentUser.role === 'quan_ly_nhan_su'
                  ? 'Quản lý'
                  : 'Nhân viên'}
              </span>
            </div>

            {/* Editable Field 1: Phone */}
            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-sky-600" />
                <span>Số điện thoại liên hệ / Zalo:</span>
              </label>
              <input
                type="tel"
                placeholder="Ví dụ: 0912 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Số điện thoại này được dùng để gửi thông báo giao task trực tiếp qua Zalo.
              </p>
            </div>

            {/* Editable Field 2: Email */}
            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                <span>Email liên hệ công việc:</span>
              </label>
              <input
                type="email"
                placeholder="Ví dụ: nguyen.van.a@welstory.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Email nhận phiếu ăn ngoài, báo cáo task và thông báo công việc.
              </p>
            </div>

            {/* Option to Change Password */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isChangingPassword}
                  onChange={(e) => setIsChangingPassword(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  <span>Tôi muốn đổi mật khẩu đăng nhập</span>
                </span>
              </label>

              {isChangingPassword && (
                <div className="mt-3 p-3 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-3 animate-in fade-in">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Mật khẩu mới (tối thiểu 4 ký tự):
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Nhập mật khẩu mới..."
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-9 pr-9 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Xác nhận lại mật khẩu mới:
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Nhập lại mật khẩu mới..."
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu Thông Tin</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
