import React from 'react';
import {
  Mail,
  Send,
  X,
  Copy,
  Check,
  User,
  Building2,
  AlertCircle,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { AppNotification, Employee } from '../types';

interface SendNotificationEmailModalProps {
  notification: AppNotification | null;
  employees: Employee[];
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
}

export const SendNotificationEmailModal: React.FC<SendNotificationEmailModalProps> = ({
  notification,
  employees,
  isOpen,
  onClose,
  onSuccessToast,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !notification) return null;

  // Find admin & department managers
  const adminAndManagers = employees.filter(
    (e) => e.role === 'admin' || e.role === 'quan_ly_nhan_su'
  );

  // Suggested manager emails
  const managerEmails = adminAndManagers
    .map((e) => e.email)
    .filter((email): email is string => Boolean(email));

  const defaultRecipientEmails =
    managerEmails.length > 0 ? managerEmails.join('; ') : 'thang.tv@welstory.com';

  const isCompleted =
    notification.newStatus === 'completed' || (notification.progress ?? 0) >= 100;

  const subject = `[WELSTORY HR] ${
    isCompleted ? 'Báo cáo hoàn thành' : 'Cập nhật tiến độ'
  }: ${notification.targetTitle} (${notification.employeeName})`;

  const formattedDate = new Date(notification.createdAt).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const bodyText = `[THÔNG BÁO TIẾN ĐỘ & KẾT QUẢ CÔNG VIỆC - WELSTORY HR]
Kính gửi: Ban Quản trị (Admin) & Quản lý bộ phận ${notification.department},

Nhân sự phụ trách vừa cập nhật tiến độ công việc trên hệ thống Welstory:
• Họ và tên nhân viên: ${notification.employeeName}
• Mã nhân viên: ${notification.employeeId}
• Bộ phận: ${notification.department}
• Thời gian cập nhật: ${formattedDate}

--------------------------------------------------
THÔNG TIN NHIỆM VỤ / MỤC TIÊU:
• Tên nhiệm vụ/MBO: ${notification.targetTitle}
• Trạng thái hiện tại: ${
    isCompleted
      ? 'ĐÃ HOÀN THÀNH (100%)'
      : notification.newStatus === 'in-progress'
      ? `ĐANG TRIỂN KHAI (${notification.progress ?? 0}%)`
      : 'CHƯA TRIỂN KHAI'
  }
• Tiến độ ghi nhận: ${notification.progress ?? 0}%

${
  notification.resultNote
    ? `BÁO CÁO KẾT QUẢ THỰC TẾ:
"${notification.resultNote}"`
    : 'Chưa có ghi chú kết quả bổ sung.'
}
--------------------------------------------------

Hệ thống Welstory Management System đã tự động ghi nhận và đồng bộ dữ liệu thời gian thực.
Truy cập hệ thống: ${window.location.origin}`;

  const handleSendViaEmailApp = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(
      defaultRecipientEmails
    )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;

    window.location.href = mailtoUrl;
    if (onSuccessToast) {
      onSuccessToast('Đang mở ứng dụng Email để đẩy thông báo tới Quản lý & Admin!');
    }
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(bodyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    if (onSuccessToast) {
      onSuccessToast('Đã sao chép nội dung báo cáo gửi email!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Đẩy Thông Báo Đến Email Quản Lý & Admin
              </h3>
              <p className="text-xs text-slate-500">
                Gửi tự động qua email hoặc ứng dụng Outlook / Gmail
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Recipients summary */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Người nhận đề xuất (Admin & Quản lý bộ phận):
            </span>
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold px-2 py-0.5 rounded-full">
              {adminAndManagers.length} tài khoản
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {adminAndManagers.map((mgr) => (
              <span
                key={mgr.id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] text-slate-700 dark:text-slate-200 font-medium"
              >
                <User className="w-3 h-3 text-emerald-600" />
                <span>{mgr.name}</span>
                {mgr.email && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({mgr.email})
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Email Preview */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
            <span>Tiêu đề Email:</span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
              [Tự động chuẩn hóa]
            </span>
          </div>
          <input
            type="text"
            readOnly
            value={subject}
            className="w-full p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200"
          />
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
            <span>Nội dung thư thông báo gửi đi:</span>
            <button
              type="button"
              onClick={handleCopyContent}
              className="text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold text-[11px] cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Đã sao chép!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Sao chép nội dung</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] text-slate-800 dark:text-slate-200 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed select-all">
            {bodyText}
          </pre>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium text-xs cursor-pointer"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyContent}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Sao chép</span>
            </button>

            <button
              type="button"
              onClick={handleSendViaEmailApp}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Mở Email & Gửi Ngay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
