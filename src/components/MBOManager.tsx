import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Check,
  X,
  Edit,
  Trash2,
  Calendar,
  Target,
  Award,
  Sliders,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  User,
  Sparkles,
  FileText,
  ChevronDown,
  Bell,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  Info,
  TableProperties,
  LayoutGrid,
  Printer,
  Percent,
  BookmarkCheck,
  Lightbulb,
  Building2,
  Compass,
  FileSpreadsheet,
} from 'lucide-react';
import { MBO, Employee, AppNotification } from '../types';
import { MBOCompletionTrendChart } from './MBOCompletionTrendChart';
import { WelstoryLogo } from './WelstoryLogo';

interface MBOManagerProps {
  employees: Employee[];
  mbos: MBO[];
  setMbos: (mbos: MBO[]) => void;
  currentUser: Employee | null;
  onNotifyUpdate?: (notification: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'>) => void;
  onOpenSendEmailModal?: (notification: AppNotification) => void;
}

export interface MBODueInfo {
  mbo: MBO;
  daysRemaining: number;
  isOverdue: boolean;
  isApproaching: boolean;
  isToday: boolean;
  dueDateStr: string;
  badgeLabel: string;
  badgeClass: string;
}

export function getMBODueInfo(mbo: MBO, referenceDateStr: string = '2026-10-06'): MBODueInfo {
  const isCompleted = mbo.status === 'completed' || (mbo.completionRate ?? mbo.selfAssessment ?? 0) >= 100;

  let dueDateStr = mbo.dueDate;
  if (!dueDateStr) {
    dueDateStr = mbo.period === '6-months' ? '2026-10-25' : '2026-12-31';
  }

  const today = new Date(referenceDateStr);
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (isCompleted) {
    return {
      mbo,
      daysRemaining,
      isOverdue: false,
      isApproaching: false,
      isToday: false,
      dueDateStr,
      badgeLabel: 'Đã hoàn thành',
      badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    };
  }

  const isToday = daysRemaining === 0;
  const isOverdue = daysRemaining < 0;
  const isApproaching = daysRemaining >= 0 && daysRemaining <= 7;

  let badgeLabel = '';
  let badgeClass = '';

  if (isOverdue) {
    badgeLabel = `Quá hạn ${Math.abs(daysRemaining)} ngày!`;
    badgeClass = 'text-rose-700 bg-rose-50 border-rose-300 font-bold';
  } else if (isToday) {
    badgeLabel = 'Hạn chót hôm nay!';
    badgeClass = 'text-amber-800 bg-amber-100 border-amber-300 font-bold animate-pulse';
  } else if (isApproaching) {
    badgeLabel = `Còn ${daysRemaining} ngày đến hạn`;
    badgeClass = 'text-amber-700 bg-amber-50 border-amber-300 font-semibold';
  } else {
    const formatted = dueDateStr.split('-').reverse().join('/');
    badgeLabel = `Hạn chót: ${formatted}`;
    badgeClass = 'text-slate-600 bg-slate-100 border-slate-200';
  }

  return {
    mbo,
    daysRemaining,
    isOverdue,
    isApproaching,
    isToday,
    dueDateStr,
    badgeLabel,
    badgeClass,
  };
}

// Preset MBO Templates matching standard Samsung Welstory HR practices
const PRESET_MBO_TEMPLATES = [
  {
    name: '1. Nâng cao năng lực tổ chức (Xây dựng SOP)',
    category: 'Mục tiêu Nghiệp vụ',
    isPersonalDevelopment: false,
    what: 'Nâng cao năng lực tổ chức',
    how: 'Xây dựng SOP chuẩn hóa quy trình vận hành và kiểm soát',
    criteria: 'Hoàn thành 100% SOP trong Quý',
    weight: 20,
    period: '6-months' as const,
    dueDate: '2026-10-25',
  },
  {
    name: '2. Đảm bảo thời gian tuyển dụng (Đáp ứng deadline)',
    category: 'Mục tiêu Nghiệp vụ',
    isPersonalDevelopment: false,
    what: 'Đảm bảo thời gian đáp ứng nhu cầu tuyển dụng',
    how: 'Mở rộng kênh tìm kiếm ứng viên, đẩy mạnh tạo nguồn đối tác',
    criteria: '% vị trí tuyển dụng đúng deadline: ≥ 90%',
    weight: 20,
    period: '6-months' as const,
    dueDate: '2026-10-25',
  },
  {
    name: '3. Nâng cao chất lượng ứng viên tuyển dụng (% Pass thử việc)',
    category: 'Mục tiêu Nghiệp vụ',
    isPersonalDevelopment: false,
    what: 'Nâng cao chất lượng ứng viên tuyển dụng',
    how: 'Chất lượng ứng viên: Phỏng vấn kỹ năng và thẩm định kinh nghiệm',
    criteria: '% Pass thử việc 2 tháng: ≥ 90%',
    weight: 20,
    period: 'annual' as const,
    dueDate: '2026-12-31',
  },
  {
    name: '4. Nâng cao hiệu quả tuyển dụng (Chính sách mới)',
    category: 'Mục tiêu Nghiệp vụ',
    isPersonalDevelopment: false,
    what: 'Nâng cao hiệu quả tuyển dụng',
    how: 'Xây dựng, bổ sung chính sách tuyển dụng và đãi ngộ mới',
    criteria: 'Thêm mới hoặc cải tiến 3 chính sách tuyển dụng',
    weight: 30,
    period: '6-months' as const,
    dueDate: '2026-10-25',
  },
  {
    name: '5. Nâng cao, phát triển năng lực cá nhân (Ngoại ngữ Opic/Topik)',
    category: 'Phát triển cá nhân / Đổi mới',
    isPersonalDevelopment: true,
    what: 'Nâng cao, phát triển năng lực cá nhân',
    how: 'Tham gia khóa đào tạo tiếng Anh/Hàn nâng cao năng lực giao tiếp',
    criteria: 'Mục tiêu đạt chứng chỉ Opic: IM hoặc Topik cấp 3',
    weight: 5,
    period: 'annual' as const,
    dueDate: '2026-12-31',
  },
  {
    name: '6. Cải tiến, đổi mới trong công việc (Sáng kiến đổi mới)',
    category: 'Phát triển cá nhân / Đổi mới',
    isPersonalDevelopment: true,
    what: 'Cải tiến, đổi mới trong công việc',
    how: 'Cải tiến phương thức tuyển dụng số hóa và quản lý dữ liệu',
    criteria: 'Số cải tiến áp dụng mới trong thực tế: ≥ 02 sáng kiến',
    weight: 5,
    period: '6-months' as const,
    dueDate: '2026-10-25',
  },
];

export const MBOManager: React.FC<MBOManagerProps> = ({
  employees,
  mbos,
  setMbos,
  currentUser,
  onNotifyUpdate,
  onOpenSendEmailModal,
}) => {
  const isAdminOrManager =
    currentUser?.role === 'admin' || currentUser?.role === 'quan_ly_nhan_su';

  // View mode: 'table' (Biểu mẫu chuẩn theo mẫu) | 'cards' (Dạng thẻ)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Form states matching official MBO evaluation sheet
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formEmployeeId, setFormEmployeeId] = useState<string>(currentUser?.id || '');
  const [what, setWhat] = useState(''); // What (Mục tiêu) / 무엇을(목표)
  const [how, setHow] = useState(''); // How (Phương án thực hiện) / 어떻게(세부실천사항)
  const [criteria, setCriteria] = useState(''); // 어떤기준으로(Tiêu chí đánh giá) / 어떤기준으로(평가기준)
  const [result, setResult] = useState(''); // Kết quả / 결과
  const [completionRate, setCompletionRate] = useState<number>(90); // Tỷ lệ hoàn thành (%) / 달성율(%)
  const [weight, setWeight] = useState<number>(20); // Trọng số / 가중치 (%)
  const [score, setScore] = useState<number>(18.0); // Điểm số / 점수 (Score)
  const [isPersonalDevelopment, setIsPersonalDevelopment] = useState<boolean>(false); // Dòng nổi bật chữ xanh
  const [period, setPeriod] = useState<'6-months' | 'annual'>('6-months');
  const [dueDate, setDueDate] = useState<string>('2026-10-25');
  const [status, setStatus] = useState<MBO['status']>('approved');

  // Print modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Quick assessment modal state
  const [assessmentModalMbo, setAssessmentModalMbo] = useState<MBO | null>(null);
  const [quickScore, setQuickScore] = useState<number>(85);
  const [quickResult, setQuickResult] = useState<string>('');
  const [quickStatus, setQuickStatus] = useState<MBO['status']>('approved');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>(
    isAdminOrManager ? 'all' : currentUser?.id || 'all'
  );
  const [filterPeriod, setFilterPeriod] = useState<'all' | '6-months' | 'annual'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | MBO['status']>('all');
  const [filterApproachingOnly, setFilterApproachingOnly] = useState<boolean>(false);

  // Notification Banner Dismiss
  const [isAlertBannerDismissed, setIsAlertBannerDismissed] = useState(false);
  const [toastAlert, setToastAlert] = useState<string | null>(null);

  // Auto-recalculate score when completionRate or weight changes
  useEffect(() => {
    const calculated = Number(((completionRate * weight) / 100).toFixed(1));
    setScore(calculated);
  }, [completionRate, weight]);

  // Calculate approaching MBOs for the current employee (or group if manager)
  const userMBOs = useMemo(() => {
    if (isAdminOrManager && filterEmployeeId === 'all') {
      return mbos;
    }
    const targetId = !isAdminOrManager ? currentUser?.id : filterEmployeeId;
    return mbos.filter((m) => m.employeeId === targetId);
  }, [mbos, isAdminOrManager, filterEmployeeId, currentUser]);

  const urgentMBOsInfo = useMemo(() => {
    return userMBOs
      .map((m) => getMBODueInfo(m, '2026-10-06'))
      .filter((info) => (info.isApproaching || info.isOverdue) && info.mbo.status !== 'completed' && ((info.mbo.completionRate ?? info.mbo.selfAssessment ?? 0) < 100))
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [userMBOs]);

  // Show a welcome toast once if approaching MBOs exist
  useEffect(() => {
    if (urgentMBOsInfo.length > 0) {
      setToastAlert(
        `Nhắc nhở: Có ${urgentMBOsInfo.length} mục tiêu MBO sắp đến hạn đánh giá trong 7 ngày tới!`
      );
      const timer = setTimeout(() => setToastAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [urgentMBOsInfo.length]);

  const openAddForm = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormEmployeeId(
      filterEmployeeId !== 'all' ? filterEmployeeId : (currentUser?.id || employees[0]?.id || '')
    );
    setWhat('');
    setHow('');
    setCriteria('');
    setResult('');
    setCompletionRate(90);
    setWeight(20);
    setScore(18.0);
    setIsPersonalDevelopment(false);
    setPeriod('6-months');
    setDueDate('2026-10-25');
    setStatus('approved');
  };

  const applyPresetTemplate = (preset: typeof PRESET_MBO_TEMPLATES[0]) => {
    setWhat(preset.what);
    setHow(preset.how);
    setCriteria(preset.criteria);
    setWeight(preset.weight);
    setPeriod(preset.period);
    setDueDate(preset.dueDate);
    setIsPersonalDevelopment(preset.isPersonalDevelopment);
    const calculated = Number(((completionRate * preset.weight) / 100).toFixed(1));
    setScore(calculated);
  };

  const openEditForm = (mbo: MBO) => {
    setIsAdding(true);
    setEditingId(mbo.id);
    setFormEmployeeId(mbo.employeeId);
    setWhat(mbo.what || mbo.title || '');
    setHow(mbo.how || mbo.description || '');
    setCriteria(mbo.criteria || mbo.target || '');
    setResult(mbo.result || '');
    const rate = mbo.completionRate ?? mbo.selfAssessment ?? 80;
    setCompletionRate(rate);
    setWeight(mbo.weight);
    const calculatedScore = mbo.score !== undefined
      ? mbo.score
      : Number(((rate * mbo.weight) / 100).toFixed(1));
    setScore(calculatedScore);
    setIsPersonalDevelopment(Boolean(mbo.isPersonalDevelopment));
    setPeriod(mbo.period);
    setDueDate(mbo.dueDate || (mbo.period === '6-months' ? '2026-10-25' : '2026-12-31'));
    setStatus(mbo.status);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!what.trim()) return;

    const compRate = Number(completionRate);
    const wt = Number(weight);
    const finalScore = score !== undefined && !isNaN(Number(score))
      ? Number(score)
      : Number(((compRate * wt) / 100).toFixed(1));

    if (editingId) {
      setMbos(
        mbos.map((m) =>
          m.id === editingId
            ? {
                ...m,
                employeeId: formEmployeeId,
                title: what.trim(),
                what: what.trim(),
                how: how.trim(),
                description: how.trim(),
                criteria: criteria.trim(),
                target: criteria.trim(),
                weight: wt,
                period,
                dueDate: dueDate || undefined,
                completionRate: compRate,
                selfAssessment: compRate,
                score: finalScore,
                result: result.trim(),
                isPersonalDevelopment,
                status,
                updatedAt: new Date().toISOString(),
              }
            : m
        )
      );
      setEditingId(null);
    } else {
      const newMbo: MBO = {
        id: `mbo-${Date.now()}`,
        employeeId: formEmployeeId || currentUser?.id || 'unknown',
        title: what.trim(),
        what: what.trim(),
        how: how.trim(),
        description: how.trim(),
        criteria: criteria.trim(),
        target: criteria.trim(),
        weight: wt,
        status,
        period,
        dueDate: dueDate || undefined,
        completionRate: compRate,
        selfAssessment: compRate,
        score: finalScore,
        result: result.trim(),
        isPersonalDevelopment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setMbos([newMbo, ...mbos]);
    }

    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa mục tiêu MBO này?')) {
      setMbos(mbos.filter((m) => m.id !== id));
    }
  };

  const openQuickAssessment = (mbo: MBO) => {
    setAssessmentModalMbo(mbo);
    const rate = mbo.completionRate ?? mbo.selfAssessment ?? 85;
    setQuickScore(rate);
    setQuickResult(mbo.result || '');
    setQuickStatus(mbo.status);
  };

  const handleSaveQuickAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessmentModalMbo) return;

    const newRate = Number(quickScore);
    const isComp = newRate >= 100 || quickStatus === 'completed';
    const finalStatus = isComp ? 'completed' : quickStatus;
    const finalResult = quickResult.trim();
    const finalScore = Number(((newRate * assessmentModalMbo.weight) / 100).toFixed(1));

    setMbos(
      mbos.map((m) =>
        m.id === assessmentModalMbo.id
          ? {
              ...m,
              completionRate: newRate,
              selfAssessment: newRate,
              score: finalScore,
              result: finalResult,
              status: finalStatus,
              updatedAt: new Date().toISOString(),
            }
          : m
      )
    );

    // Trigger notification to Admin & Department Manager
    if (onNotifyUpdate) {
      const emp = employees.find((e) => e.id === assessmentModalMbo.employeeId);
      onNotifyUpdate({
        type: isComp ? 'mbo_result' : 'mbo_progress',
        title: isComp
          ? `MBO hoàn thành 100%: ${assessmentModalMbo.title}`
          : `Cập nhật tự đánh giá MBO (${newRate}%): ${assessmentModalMbo.title}`,
        message: `Nhân viên ${emp?.name || 'Nhân sự'} (${emp?.id || assessmentModalMbo.employeeId}) vừa tự đánh giá đạt ${newRate}% và cập nhật kết quả cho mục tiêu MBO "${assessmentModalMbo.title}". Điểm số: ${finalScore}/${assessmentModalMbo.weight} điểm.`,
        employeeId: assessmentModalMbo.employeeId,
        employeeName: emp?.name || 'Nhân sự',
        department: emp?.department || 'HUMAN RESOURCES',
        targetId: assessmentModalMbo.id,
        targetTitle: assessmentModalMbo.title,
        oldStatus: assessmentModalMbo.status,
        newStatus: finalStatus,
        progress: newRate,
        resultNote: finalResult,
        recipientRoles: ['admin', 'quan_ly_nhan_su'],
      });
    }

    setAssessmentModalMbo(null);
  };

  // Filtered list
  const filteredMBOs = useMemo(() => {
    return mbos.filter((m) => {
      // Approaching only filter
      if (filterApproachingOnly) {
        const info = getMBODueInfo(m, '2026-10-06');
        if (!info.isApproaching && !info.isOverdue) return false;
        if (m.status === 'completed' || ((m.completionRate ?? m.selfAssessment ?? 0) >= 100)) return false;
      }
      // Employee filter
      if (filterEmployeeId !== 'all' && m.employeeId !== filterEmployeeId) {
        return false;
      }
      // Period filter
      if (filterPeriod !== 'all' && m.period !== filterPeriod) {
        return false;
      }
      // Status filter
      if (filterStatus !== 'all' && m.status !== filterStatus) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const emp = employees.find((e) => e.id === m.employeeId);
        const empName = emp?.name.toLowerCase() || '';
        const titleStr = (m.title || m.what || '').toLowerCase();
        const descStr = (m.description || m.how || '').toLowerCase();
        const targetStr = (m.target || m.criteria || '').toLowerCase();
        const resultStr = (m.result || '').toLowerCase();
        return (
          titleStr.includes(q) ||
          descStr.includes(q) ||
          targetStr.includes(q) ||
          resultStr.includes(q) ||
          empName.includes(q)
        );
      }
      return true;
    });
  }, [
    mbos,
    filterApproachingOnly,
    filterEmployeeId,
    filterPeriod,
    filterStatus,
    searchQuery,
    employees,
  ]);

  // Summary statistics for the bilingual table
  const tableSummary = useMemo(() => {
    let totalWeight = 0;
    let totalScore = 0;
    filteredMBOs.forEach((m) => {
      const wt = m.weight || 0;
      const compRate = m.completionRate ?? m.selfAssessment ?? 0;
      const sc = m.score !== undefined ? m.score : Number(((compRate * wt) / 100).toFixed(1));
      totalWeight += wt;
      totalScore += sc;
    });
    totalScore = Number(totalScore.toFixed(1));
    const avgCompletion = totalWeight > 0 ? Number(((totalScore / totalWeight) * 100).toFixed(1)) : 0;

    // Rating grade
    let grade = 'B';
    let gradeText = 'Khá (양호)';
    let gradeBadge = 'bg-blue-100 text-blue-800 border-blue-300';
    if (totalScore >= 95) {
      grade = 'S';
      gradeText = 'Xuất sắc (최우수)';
      gradeBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    } else if (totalScore >= 85) {
      grade = 'A';
      gradeText = 'Giỏi (우수)';
      gradeBadge = 'bg-teal-100 text-teal-800 border-teal-300';
    } else if (totalScore >= 70) {
      grade = 'B';
      gradeText = 'Khá (양호)';
      gradeBadge = 'bg-sky-100 text-sky-800 border-sky-300';
    } else if (totalScore >= 60) {
      grade = 'C';
      gradeText = 'Trung bình (보통)';
      gradeBadge = 'bg-amber-100 text-amber-800 border-amber-300';
    } else {
      grade = 'D';
      gradeText = 'Cần cải thiện (미흡)';
      gradeBadge = 'bg-rose-100 text-rose-800 border-rose-300';
    }

    return {
      totalWeight,
      totalScore,
      avgCompletion,
      grade,
      gradeText,
      gradeBadge,
    };
  }, [filteredMBOs]);

  // Current employee total weight check for form helper
  const currentEmpMbos = useMemo(() => {
    const targetId = formEmployeeId || currentUser?.id;
    return mbos.filter((m) => m.employeeId === targetId && (editingId ? m.id !== editingId : true));
  }, [mbos, formEmployeeId, currentUser, editingId]);

  const existingWeightSum = useMemo(() => {
    return currentEmpMbos.reduce((acc, curr) => acc + (curr.weight || 0), 0);
  }, [currentEmpMbos]);

  const projectedTotalWeight = existingWeightSum + Number(weight || 0);

  const getEmployeeName = (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    return emp ? emp.name : `NV (${empId})`;
  };

  const getEmployeeDept = (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    return emp ? emp.department : 'HUMAN RESOURCES';
  };

  const getStatusBadge = (st: MBO['status']) => {
    switch (st) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Hoàn thành (완료)</span>
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200 shadow-2xs">
            <Clock className="w-3 h-3 text-sky-600" />
            <span>Đã duyệt (승인)</span>
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 shadow-2xs">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Chờ duyệt (대기)</span>
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
            <FileText className="w-3 h-3 text-slate-500" />
            <span>Bản nháp (초안)</span>
          </span>
        );
    }
  };

  const selectedEmployeeObj = useMemo(() => {
    if (filterEmployeeId === 'all') return null;
    return employees.find((e) => e.id === filterEmployeeId);
  }, [employees, filterEmployeeId]);

  return (
    <div className="space-y-6">
      {/* Toast Alert Pop */}
      {toastAlert && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 text-xs font-semibold rounded-xl shadow-2xl bg-amber-950 text-amber-100 border border-amber-600 animate-in fade-in slide-in-from-top-3">
          <Bell className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
          <span>{toastAlert}</span>
          <button
            onClick={() => setToastAlert(null)}
            className="text-amber-300 hover:text-white ml-2 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. MBO DUE DATE NOTIFICATION ALERT BANNER */}
      {urgentMBOsInfo.length > 0 && !isAlertBannerDismissed && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-rose-500/10 border border-amber-300/80 rounded-2xl p-4 sm:p-5 shadow-xs animate-in fade-in slide-in-from-top-2 space-y-3.5">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20 shrink-0">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-extrabold text-amber-950">
                    Cảnh Báo Hạn Chót MBO: Có {urgentMBOsInfo.length} mục tiêu sắp đến hạn đánh giá!
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-amber-200 text-amber-900 rounded-full border border-amber-300">
                    Hạn chót &le; 7 ngày
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-0.5">
                  Vui lòng cập nhật kết quả tự đánh giá và đối soát chỉ tiêu trước khi chu kỳ kết thúc.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setFilterApproachingOnly((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterApproachingOnly
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-amber-900 border border-amber-300 hover:bg-amber-50'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{filterApproachingOnly ? 'Đang lọc cảnh báo' : 'Lọc mục tiêu sắp đến hạn'}</span>
              </button>
              <button
                onClick={() => setIsAlertBannerDismissed(true)}
                title="Ẩn cảnh báo"
                className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-200/50 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Urgent Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {urgentMBOsInfo.slice(0, 3).map((info) => (
              <div
                key={info.mbo.id}
                className="p-3 bg-white/95 rounded-xl border border-amber-200/90 shadow-2xs flex flex-col justify-between space-y-2 hover:border-amber-400 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <span className="font-bold text-slate-700 truncate max-w-[140px]">
                      {getEmployeeName(info.mbo.employeeId)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md border text-[10px] ${info.badgeClass}`}>
                      {info.badgeLabel}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs line-clamp-1">
                    {info.mbo.what || info.mbo.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    Chỉ tiêu: {info.mbo.criteria || info.mbo.target}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-600 font-mono">
                    Hoàn thành: <strong>{info.mbo.completionRate ?? info.mbo.selfAssessment ?? 0}%</strong>
                  </span>
                  <button
                    onClick={() => openQuickAssessment(info.mbo)}
                    className="text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>Tự đánh giá ngay</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. RECHARTS VISUALIZATION COMPONENT: 6-Month Completion Percentage Trend */}
      <MBOCompletionTrendChart
        mbos={mbos}
        currentUser={currentUser}
        employees={employees}
      />

      {/* 3. MBO Management Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
                <Target className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Đăng Ký & Đánh Giá Kết Quả MBO (MBO 등록 및 평가)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Chuẩn biểu mẫu Samsung Welstory: Quản lý mục tiêu What, How, Tiêu chí đánh giá, Trọng số, Kết quả và Điểm số
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle: Table (Biểu mẫu chuẩn) vs Cards */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Xem dạng biểu mẫu bảng chuẩn song ngữ Việt - Hàn"
              >
                <TableProperties className="w-3.5 h-3.5 text-emerald-700" />
                <span>Bảng chuẩn theo mẫu (표 양식)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Xem dạng thẻ chi tiết"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Dạng thẻ (카드)</span>
              </button>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              title="Xem trước & In Biểu Mẫu Đăng Ký MBO chuẩn A4"
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>In Biểu Mẫu Chuẩn</span>
            </button>

            {/* Quick alert toggle chip */}
            {urgentMBOsInfo.length > 0 && (
              <button
                onClick={() => setFilterApproachingOnly((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterApproachingOnly
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                }`}
              >
                <Bell className="w-3.5 h-3.5 animate-pulse" />
                <span>Sắp đến hạn ({urgentMBOsInfo.length})</span>
              </button>
            )}

            <button
              onClick={openAddForm}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Đăng Ký MBO Mới</span>
            </button>
          </div>
        </div>

        {/* Filter notice if filterApproachingOnly is on */}
        {filterApproachingOnly && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Đang kích hoạt bộ lọc: Chỉ hiển thị các mục tiêu <strong>sắp đến hạn trong 7 ngày hoặc quá hạn</strong> ({filteredMBOs.length} mục tiêu).
              </span>
            </div>
            <button
              onClick={() => setFilterApproachingOnly(false)}
              className="font-bold underline text-amber-800 hover:text-amber-950 ml-2 cursor-pointer"
            >
              Hiện tất cả
            </button>
          </div>
        )}

        {/* Search & Filtering Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm mục tiêu What, How, Tiêu chí, Kết quả..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Employee filter */}
          {isAdminOrManager ? (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterEmployeeId}
                onChange={(e) => setFilterEmployeeId(e.target.value)}
                className="w-full pl-9 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none cursor-pointer"
              >
                <option value="all">Tất cả nhân sự ({employees.length})</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.id})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          ) : (
            <div className="flex items-center px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium">
              <span>Nhân sự: <strong>{currentUser?.name}</strong> ({currentUser?.id})</span>
            </div>
          )}

          {/* Period filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs">
            <button
              onClick={() => setFilterPeriod('all')}
              className={`flex-1 py-1 rounded-lg text-center font-medium transition-all cursor-pointer ${
                filterPeriod === 'all'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả kỳ
            </button>
            <button
              onClick={() => setFilterPeriod('6-months')}
              className={`flex-1 py-1 rounded-lg text-center font-medium transition-all cursor-pointer ${
                filterPeriod === '6-months'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              06 Tháng
            </button>
            <button
              onClick={() => setFilterPeriod('annual')}
              className={`flex-1 py-1 rounded-lg text-center font-medium transition-all cursor-pointer ${
                filterPeriod === 'annual'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hàng năm
            </button>
          </div>

          {/* Status filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full pl-9 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="draft">Bản nháp (초안)</option>
              <option value="submitted">Chờ duyệt (대기)</option>
              <option value="approved">Đã duyệt - Đang làm (승인)</option>
              <option value="completed">Đã hoàn thành (완료)</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* 4. FORM MODAL / DRAWER (FORM ĐĂNG KÝ MBO CHUẨN THEO MẪU BIỂU) */}
        {isAdding && (
          <form
            onSubmit={handleSave}
            className="p-5 sm:p-6 bg-gradient-to-br from-emerald-50/70 via-slate-50/70 to-emerald-50/40 border border-emerald-300 rounded-2xl text-xs space-y-5 shadow-sm animate-in fade-in duration-200"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                  {editingId ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    {editingId ? 'Chỉnh Sửa Mục Tiêu MBO (MBO 수정)' : 'Đăng Ký Mục Tiêu MBO Mới (MBO 신규 등록)'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Điền đầy đủ What (Mục tiêu), How (Phương án), Tiêu chí đánh giá, Trọng số & Kết quả
                  </p>
                </div>
              </div>

              {/* Template presets quick loader */}
              {!editingId && (
                <div className="flex items-center gap-1.5 self-start sm:self-auto bg-white px-2.5 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px] font-bold text-slate-700">Mẫu gợi ý chuẩn:</span>
                  <select
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      if (!isNaN(idx) && PRESET_MBO_TEMPLATES[idx]) {
                        applyPresetTemplate(PRESET_MBO_TEMPLATES[idx]);
                      }
                    }}
                    defaultValue=""
                    className="text-[11px] text-emerald-800 font-semibold bg-transparent focus:outline-none cursor-pointer max-w-[200px] truncate"
                  >
                    <option value="" disabled>-- Chọn mẫu nhanh --</option>
                    {PRESET_MBO_TEMPLATES.map((p, idx) => (
                      <option key={idx} value={idx}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 self-end sm:self-auto cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Row 1: Target type & Employee selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Employee selector */}
              {isAdminOrManager ? (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Nhân sự đăng ký MBO (대상자) <span className="text-rose-500">*</span>:
                  </label>
                  <select
                    value={formEmployeeId}
                    onChange={(e) => setFormEmployeeId(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.id}) - {emp.department}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Nhân sự thực hiện:</label>
                  <div className="p-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800">
                    {currentUser?.name} ({currentUser?.id})
                  </div>
                </div>
              )}

              {/* Classification / Nature */}
              <div className="sm:col-span-1 lg:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">
                  Phân loại tính chất mục tiêu (구분):
                </label>
                <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1 rounded-lg hover:bg-slate-50 flex-1">
                    <input
                      type="radio"
                      name="nature"
                      checked={!isPersonalDevelopment}
                      onChange={() => setIsPersonalDevelopment(false)}
                      className="accent-emerald-600"
                    />
                    <span className="font-semibold text-slate-800">
                      Mục tiêu Nghiệp vụ chuyên môn (Business Goals)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer px-2.5 py-1 rounded-lg bg-sky-50/70 border border-sky-200 hover:bg-sky-100/70 flex-1">
                    <input
                      type="radio"
                      name="nature"
                      checked={isPersonalDevelopment}
                      onChange={() => setIsPersonalDevelopment(true)}
                      className="accent-sky-600"
                    />
                    <span className="font-bold text-sky-800">
                      Phát triển cá nhân & Đổi mới sáng tạo (Chữ xanh nổi bật)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Row 2: What, How, Criteria (Core MBO fields matching standard template) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
              {/* Field 1: What */}
              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  1. Mục tiêu - What (무엇을 - 목표) <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ví dụ: Nâng cao năng lực tổ chức / Đảm bảo thời gian tuyển dụng..."
                  value={what}
                  onChange={(e) => setWhat(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Mục tiêu cốt lõi cần đạt được trong kỳ</span>
              </div>

              {/* Field 2: How */}
              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  2. Phương án thực hiện - How (어떻게 - 세부실천사항):
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Xây dựng SOP, Tối ưu hóa kênh tuyển dụng, Khảo sát chất lượng..."
                  value={how}
                  onChange={(e) => setHow(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Kế hoạch hành động & giải pháp triển khai</span>
              </div>

              {/* Field 3: Criteria */}
              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  3. Tiêu chí đánh giá - Criteria (어떤기준으로 - 평가기준) <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ví dụ: Hoàn thành 100% SOP, % vị trí đúng deadline ≥ 90%, Pass thử việc ≥ 90%..."
                  value={criteria}
                  onChange={(e) => setCriteria(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Chỉ số đo lường KPI cụ thể, định lượng</span>
              </div>
            </div>

            {/* Row 3: Weight, Period, Due Date, Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Weight */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-800 font-bold">
                    Trọng số KPI % (가중치) <span className="text-rose-500">*</span>:
                  </label>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      projectedTotalWeight === 100
                        ? 'bg-emerald-100 text-emerald-800'
                        : projectedTotalWeight > 100
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    Dự kiến: {projectedTotalWeight}% / 100%
                  </span>
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  step="1"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">
                  Gợi ý: 20%, 30%, 5% (Tổng các mục tiêu nên = 100%)
                </span>
              </div>

              {/* Period */}
              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  Kỳ đánh giá (구분 / Period):
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as any)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="6-months">06 Tháng (Bán niên)</option>
                  <option value="annual">Hàng năm (Toàn niên)</option>
                </select>
                <span className="text-[10px] text-slate-500">Chu kỳ rà soát & nghiệm thu</span>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-slate-800 font-bold mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Hạn chót hoàn thành (기한):</span>
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Ngày chốt đánh giá MBO</span>
              </div>

              {/* Status */}
              <div>
                <label className="block text-slate-800 font-bold mb-1">Trạng thái (상태):</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="draft">Bản nháp (초안)</option>
                  <option value="submitted">Chờ duyệt (대기)</option>
                  <option value="approved">Đã duyệt - Đang làm (승인)</option>
                  <option value="completed">Đã hoàn thành (완료)</option>
                </select>
                <span className="text-[10px] text-slate-500">Tiến trình phê duyệt</span>
              </div>
            </div>

            {/* Row 4: Result, Completion Rate %, and Auto Score */}
            <div className="p-4 bg-white/90 border border-emerald-200/90 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-bold">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <span>Kết Quả Thực Hiện & Tự Đánh Giá (결과 및 달성율 평가)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Result field */}
                <div className="sm:col-span-1">
                  <label className="block text-slate-700 font-bold mb-1">
                    Kết quả thực tế - Result (결과):
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Hoàn thành: 90/100 SOP, Đạt 85%, Opic: IM..."
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Số liệu hoặc chứng chỉ đạt được</span>
                </div>

                {/* Completion rate % */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-bold">
                      Tỷ lệ hoàn thành % (달성율 %):
                    </label>
                    <span className="font-mono font-extrabold text-emerald-700 text-sm">
                      {completionRate}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    value={completionRate}
                    onChange={(e) => setCompletionRate(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>0%</span>
                    <span>50%</span>
                    <span>90%</span>
                    <span>100%</span>
                    <span>150% (Vượt mức)</span>
                  </div>
                </div>

                {/* Score calculation */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Điểm số tự động (점수 - Score):
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-2 bg-emerald-50 border border-emerald-300 rounded-xl font-mono font-extrabold text-emerald-900 text-sm flex items-center justify-between">
                      <span>{score} điểm</span>
                      <span className="text-[11px] font-normal text-emerald-700">
                        ({completionRate}% &times; {weight}%)
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Công thức: Điểm = (Tỷ lệ hoàn thành &times; Trọng số) / 100
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-emerald-200">
              <div className="text-[11px] text-slate-500">
                <span className="text-rose-500">*</span> Các trường có dấu sao là bắt buộc theo biểu mẫu.
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-medium transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingId ? 'Lưu Thay Đổi MBO' : 'Lưu & Đăng Ký MBO'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* 5. MAIN DISPLAY VIEW */}

        {/* VIEW A: STANDARD BILINGUAL TABLE VIEW (BIỂU MẪU CHUẨN SAMSUNG WELSTORY THEO MẪU) */}
        {viewMode === 'table' && (
          <div className="space-y-4">
            {/* Table Header Summary Banner */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <WelstoryLogo size="sm" className="shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      BẢNG ĐĂNG KÝ VÀ ĐÁNH GIÁ MBO (MBO 등록 및 평가표)
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                      Chuẩn Biểu Mẫu HR
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {selectedEmployeeObj ? (
                      <>
                        Nhân sự: <strong>{selectedEmployeeObj.name}</strong> ({selectedEmployeeObj.id}) &bull; Bộ phận: <strong>{selectedEmployeeObj.department}</strong>
                      </>
                    ) : (
                      <>Tất cả nhân sự trong hệ thống &bull; Tổng số <strong>{filteredMBOs.length}</strong> mục tiêu</>
                    )}
                  </p>
                </div>
              </div>

              {/* KPI metrics badges in table header */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
                {/* Weight badge */}
                <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Tổng trọng số:</span>
                  <span
                    className={`font-mono font-bold ${
                      tableSummary.totalWeight === 100
                        ? 'text-emerald-700'
                        : tableSummary.totalWeight > 100
                        ? 'text-rose-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {tableSummary.totalWeight}%
                  </span>
                  {tableSummary.totalWeight !== 100 && (
                    <span className="text-[10px] text-amber-600 font-semibold">(Mục tiêu: 100%)</span>
                  )}
                </div>

                {/* Total score badge */}
                <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Tổng điểm MBO:</span>
                  <span className="font-mono font-extrabold text-emerald-700 text-sm">
                    {tableSummary.totalScore}
                  </span>
                  <span className="text-[10px] text-slate-400">/ 100</span>
                </div>

                {/* Rating grade badge */}
                <div className={`px-3 py-1.5 rounded-xl border shadow-2xs flex items-center gap-1.5 ${tableSummary.gradeBadge}`}>
                  <Award className="w-3.5 h-3.5" />
                  <span className="font-bold">Xếp loại: Hạng {tableSummary.grade}</span>
                  <span className="text-[11px] opacity-80">({tableSummary.gradeText})</span>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {filteredMBOs.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
                <Target className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">
                  Chưa có mục tiêu MBO nào phù hợp với bộ lọc hiện tại.
                </p>
                <p className="text-xs text-slate-400">
                  Bấm "+ Đăng Ký MBO Mới" ở góc trên để tạo chỉ tiêu công việc đầu tiên theo mẫu biểu.
                </p>
                <button
                  onClick={openAddForm}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Đăng Ký MBO Ngay</span>
                </button>
              </div>
            ) : (
              /* The Official Bilingual Table */
              <div className="overflow-x-auto border border-slate-200/90 rounded-2xl shadow-xs bg-white">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-800 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-3 text-center w-12 border-r border-slate-200/80">
                        STT<br /><span className="text-[9px] text-slate-500 font-normal">No.</span>
                      </th>
                      {filterEmployeeId === 'all' && (
                        <th className="py-3 px-3 w-36 border-r border-slate-200/80">
                          Nhân sự<br /><span className="text-[9px] text-slate-500 font-normal">성명 (사번)</span>
                        </th>
                      )}
                      <th className="py-3 px-3 w-28 border-r border-slate-200/80">
                        Phân loại<br /><span className="text-[9px] text-slate-500 font-normal">구분</span>
                      </th>
                      <th className="py-3 px-3 min-w-[200px] border-r border-slate-200/80">
                        What (Mục tiêu)<br /><span className="text-[9px] text-emerald-800 font-semibold">무엇을(목표)</span>
                      </th>
                      <th className="py-3 px-3 min-w-[180px] border-r border-slate-200/80">
                        How (Phương án thực hiện)<br /><span className="text-[9px] text-slate-600 font-normal">어떻게(세부실천사항)</span>
                      </th>
                      <th className="py-3 px-3 min-w-[180px] border-r border-slate-200/80">
                        Tiêu chí đánh giá<br /><span className="text-[9px] text-slate-600 font-normal">어떤기준으로(평가기준)</span>
                      </th>
                      <th className="py-3 px-2 text-center w-20 border-r border-slate-200/80">
                        Trọng số<br /><span className="text-[9px] text-slate-600 font-normal">가중치(%)</span>
                      </th>
                      <th className="py-3 px-2 text-center w-24 border-r border-slate-200/80">
                        Hạn chót<br /><span className="text-[9px] text-slate-600 font-normal">기한</span>
                      </th>
                      <th className="py-3 px-3 min-w-[150px] border-r border-slate-200/80">
                        Kết quả<br /><span className="text-[9px] text-slate-600 font-normal">결과</span>
                      </th>
                      <th className="py-3 px-2 text-center w-24 border-r border-slate-200/80">
                        Hoàn thành<br /><span className="text-[9px] text-slate-600 font-normal">달성율(%)</span>
                      </th>
                      <th className="py-3 px-2 text-center w-20 border-r border-slate-200/80">
                        Điểm số<br /><span className="text-[9px] text-emerald-800 font-semibold">점수</span>
                      </th>
                      <th className="py-3 px-2 text-center w-28 border-r border-slate-200/80">
                        Trạng thái<br /><span className="text-[9px] text-slate-600 font-normal">상태</span>
                      </th>
                      <th className="py-3 px-2 text-center w-24">
                        Thao tác<br /><span className="text-[9px] text-slate-600 font-normal">동작</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMBOs.map((mbo, idx) => {
                      const dueInfo = getMBODueInfo(mbo, '2026-10-06');
                      const rate = mbo.completionRate ?? mbo.selfAssessment ?? 0;
                      const wt = mbo.weight || 0;
                      const sc = mbo.score !== undefined ? mbo.score : Number(((rate * wt) / 100).toFixed(1));
                      const isBlueRow = Boolean(mbo.isPersonalDevelopment);

                      return (
                        <tr
                          key={mbo.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isBlueRow ? 'bg-sky-50/30 font-medium' : ''
                          }`}
                        >
                          {/* STT */}
                          <td className="py-3 px-2 text-center font-bold text-slate-500 border-r border-slate-100">
                            {idx + 1}
                          </td>

                          {/* Employee */}
                          {filterEmployeeId === 'all' && (
                            <td className="py-3 px-3 border-r border-slate-100">
                              <div className="font-bold text-slate-800 truncate max-w-[140px]">
                                {getEmployeeName(mbo.employeeId)}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {mbo.employeeId}
                              </div>
                            </td>
                          )}

                          {/* Classification */}
                          <td className="py-3 px-3 border-r border-slate-100">
                            {isBlueRow ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-100/70 border border-sky-300 px-2 py-0.5 rounded-md">
                                <Sparkles className="w-2.5 h-2.5 text-sky-600" />
                                <span>Phát triển / Đổi mới</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                <span>Nghiệp vụ</span>
                              </span>
                            )}
                          </td>

                          {/* What */}
                          <td className="py-3 px-3 border-r border-slate-100 font-semibold">
                            <span className={isBlueRow ? 'text-sky-900 font-bold' : 'text-slate-900'}>
                              {mbo.what || mbo.title}
                            </span>
                          </td>

                          {/* How */}
                          <td className="py-3 px-3 border-r border-slate-100 text-slate-600">
                            <span className={isBlueRow ? 'text-sky-800' : 'text-slate-700'}>
                              {mbo.how || mbo.description || '-'}
                            </span>
                          </td>

                          {/* Criteria */}
                          <td className="py-3 px-3 border-r border-slate-100 text-slate-700">
                            <span className="font-medium text-slate-800">
                              {mbo.criteria || mbo.target || '-'}
                            </span>
                          </td>

                          {/* Weight */}
                          <td className="py-3 px-2 text-center font-mono font-bold text-slate-800 border-r border-slate-100">
                            <span className="px-1.5 py-0.5 bg-slate-100 rounded text-amber-900">
                              {wt}%
                            </span>
                          </td>

                          {/* Due Date & Alerts */}
                          <td className="py-3 px-2 text-center border-r border-slate-100">
                            <div className="text-[11px] font-mono text-slate-700 font-medium">
                              {mbo.dueDate
                                ? mbo.dueDate.split('-').reverse().slice(0, 2).join('/')
                                : mbo.period === '6-months'
                                ? '25/10'
                                : '31/12'}
                            </div>
                            {(dueInfo.isApproaching || dueInfo.isOverdue) && mbo.status !== 'completed' && (
                              <span className={`inline-block mt-0.5 text-[9px] px-1 py-0.2 rounded font-bold ${dueInfo.badgeClass}`}>
                                {dueInfo.isOverdue ? 'Quá hạn' : 'Sắp hạn'}
                              </span>
                            )}
                          </td>

                          {/* Result */}
                          <td className="py-3 px-3 border-r border-slate-100 text-slate-700">
                            {mbo.result ? (
                              <div className="font-medium text-emerald-900 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{mbo.result}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Chưa ghi nhận</span>
                            )}
                          </td>

                          {/* Completion Rate */}
                          <td className="py-3 px-2 text-center border-r border-slate-100">
                            <div className="font-mono font-bold text-slate-900">
                              {rate}%
                            </div>
                            <div className="w-16 mx-auto h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                              <div
                                className={`h-full rounded-full ${
                                  rate >= 100
                                    ? 'bg-emerald-500'
                                    : rate >= 80
                                    ? 'bg-teal-500'
                                    : rate >= 60
                                    ? 'bg-sky-500'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                              />
                            </div>
                          </td>

                          {/* Score */}
                          <td className="py-3 px-2 text-center font-mono font-extrabold text-emerald-700 text-xs border-r border-slate-100">
                            {sc.toFixed(1)}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-2 text-center border-r border-slate-100">
                            {getStatusBadge(mbo.status)}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openQuickAssessment(mbo)}
                                title="Tự đánh giá & Cập nhật kết quả"
                                className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openEditForm(mbo)}
                                title="Chỉnh sửa MBO"
                                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(mbo.id)}
                                title="Xóa MBO"
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Table Footer: Summary Total Row */}
                  <tfoot>
                    <tr className="bg-emerald-50/80 font-bold text-slate-900 border-t-2 border-emerald-300 text-xs">
                      <td
                        colSpan={filterEmployeeId === 'all' ? 4 : 3}
                        className="py-3 px-4 text-left border-r border-emerald-200"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          <span className="font-extrabold text-emerald-950 uppercase">
                            TỔNG CỘNG (합계 / TOTAL)
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-[11px] border-r border-emerald-200">
                        {filteredMBOs.length} mục tiêu đánh giá
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-[11px] border-r border-emerald-200">
                        Hoàn thành TB: <strong>{tableSummary.avgCompletion}%</strong>
                      </td>
                      {/* Weight sum */}
                      <td className="py-3 px-2 text-center font-mono font-extrabold text-amber-950 border-r border-emerald-200">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            tableSummary.totalWeight === 100
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {tableSummary.totalWeight}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center text-slate-400 border-r border-emerald-200">
                        -
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-[11px] border-r border-emerald-200">
                        Đối soát cuối kỳ
                      </td>
                      <td className="py-3 px-2 text-center font-mono font-bold text-slate-900 border-r border-emerald-200">
                        {tableSummary.avgCompletion}%
                      </td>
                      {/* Total Score sum */}
                      <td className="py-3 px-2 text-center font-mono font-black text-emerald-800 text-sm border-r border-emerald-200">
                        {tableSummary.totalScore}
                      </td>
                      <td colSpan={2} className="py-3 px-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-lg border text-[11px] font-bold ${tableSummary.gradeBadge}`}>
                          Hạng {tableSummary.grade} ({tableSummary.gradeText})
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VIEW B: CARDS GRID VIEW (DẠNG THẺ CHI TIẾT) */}
        {viewMode === 'cards' && (
          <div>
            {filteredMBOs.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
                <Target className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">
                  Không tìm thấy mục tiêu MBO nào phù hợp với bộ lọc.
                </p>
                <p className="text-xs text-slate-400">
                  Bấm "+ Đăng Ký MBO Mới" để tạo chỉ tiêu mục tiêu công việc đầu tiên.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMBOs.map((mbo) => {
                  const dueInfo = getMBODueInfo(mbo, '2026-10-06');
                  const scoreVal = mbo.selfAssessment ?? mbo.completionRate ?? 0;
                  const isHigh = scoreVal >= 90;
                  const isMedium = scoreVal >= 75 && scoreVal < 90;
                  const isBlueCard = Boolean(mbo.isPersonalDevelopment);

                  return (
                    <div
                      key={mbo.id}
                      className={`p-5 rounded-2xl transition-all flex flex-col justify-between space-y-4 border ${
                        isBlueCard ? 'bg-sky-50/20' : 'bg-white'
                      } ${
                        dueInfo.isOverdue
                          ? 'border-rose-300 ring-2 ring-rose-100 shadow-xs'
                          : dueInfo.isApproaching
                          ? 'border-amber-300 ring-2 ring-amber-100 shadow-xs'
                          : 'border-slate-200/90 hover:border-emerald-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="space-y-2.5">
                        {/* Top tags & Due Date Alert Chip */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                              {getEmployeeName(mbo.employeeId)}
                            </span>
                            {isBlueCard && (
                              <span className="text-[10px] font-bold text-sky-700 bg-sky-100 border border-sky-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>Phát triển / Đổi mới</span>
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                mbo.period === '6-months'
                                  ? 'text-sky-700 bg-sky-50 border border-sky-200'
                                  : 'text-violet-700 bg-violet-50 border border-violet-200'
                              }`}
                            >
                              {mbo.period === '6-months' ? 'Kỳ 06 Tháng' : 'Kỳ Hàng Năm'}
                            </span>
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-mono">
                              Trọng số: {mbo.weight}%
                            </span>
                          </div>
                          <div>{getStatusBadge(mbo.status)}</div>
                        </div>

                        {/* Due Date Indicator Badge */}
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border ${dueInfo.badgeClass}`}>
                            {dueInfo.isOverdue ? (
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                            ) : dueInfo.isApproaching ? (
                              <Bell className="w-3 h-3 text-amber-600 animate-pulse" />
                            ) : (
                              <Calendar className="w-3 h-3 text-slate-500" />
                            )}
                            <span>{dueInfo.badgeLabel}</span>
                          </span>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h4 className={`font-bold text-sm leading-snug ${isBlueCard ? 'text-sky-950 font-extrabold' : 'text-slate-900'}`}>
                            {mbo.what || mbo.title}
                          </h4>
                          {(mbo.how || mbo.description) && (
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                              Phương án (How): {mbo.how || mbo.description}
                            </p>
                          )}
                        </div>

                        {/* Criteria requirement */}
                        <div className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1 border border-slate-100">
                          <div className="text-slate-500 font-semibold flex items-center gap-1">
                            <Target className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Tiêu chí đánh giá & Chỉ tiêu KPI:</span>
                          </div>
                          <p className="text-slate-800 font-medium pl-4">{mbo.criteria || mbo.target}</p>
                        </div>

                        {/* Actual result if available */}
                        {mbo.result && (
                          <div className="p-2.5 bg-emerald-50/50 rounded-xl text-xs space-y-1 border border-emerald-100">
                            <div className="text-emerald-800 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Kết quả thực tế ghi nhận:</span>
                            </div>
                            <p className="text-slate-700 pl-4">{mbo.result}</p>
                          </div>
                        )}
                      </div>

                      {/* Progress & Actions Bottom Bar */}
                      <div className="pt-3 border-t border-slate-100 space-y-3">
                        {/* Completion score bar */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1 font-semibold">
                            <span className="text-slate-600">Tỷ lệ hoàn thành:</span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono font-bold ${
                                  isHigh
                                    ? 'text-emerald-600'
                                    : isMedium
                                    ? 'text-sky-600'
                                    : 'text-amber-600'
                                }`}
                              >
                                {scoreVal}%
                              </span>
                              {mbo.score !== undefined && (
                                <span className="text-[11px] font-mono text-slate-500">
                                  ({mbo.score} điểm)
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isHigh
                                  ? 'bg-emerald-500'
                                  : isMedium
                                  ? 'bg-sky-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, scoreVal))}%` }}
                            />
                          </div>
                        </div>

                        {/* Quick Buttons */}
                        <div className="flex items-center justify-between pt-1 text-xs">
                          <button
                            onClick={() => openQuickAssessment(mbo)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold border transition-colors cursor-pointer ${
                              dueInfo.isApproaching || dueInfo.isOverdue
                                ? 'text-amber-900 bg-amber-50 hover:bg-amber-100 border-amber-300 shadow-2xs'
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                            }`}
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Tự đánh giá ({scoreVal}%)</span>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditForm(mbo)}
                              title="Sửa thông tin MBO"
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(mbo.id)}
                              title="Xóa MBO"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. QUICK SELF-ASSESSMENT MODAL */}
      {assessmentModalMbo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Tự Cập Nhật Đánh Giá Kết Quả MBO
                  </h3>
                  <p className="text-xs text-slate-500">Cập nhật tiến độ hoàn thành & điểm số tự động</p>
                </div>
              </div>
              <button
                onClick={() => setAssessmentModalMbo(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickAssessment} className="space-y-4 pt-4 text-xs">
              <div>
                <span className="text-slate-500 text-[11px]">Mục tiêu đang đánh giá:</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">
                  {assessmentModalMbo.what || assessmentModalMbo.title}
                </p>
                <div className="flex items-center justify-between text-xs mt-1.5 text-slate-600">
                  <span>Trọng số: <strong className="text-slate-900">{assessmentModalMbo.weight}%</strong></span>
                  {assessmentModalMbo.dueDate && (
                    <span className="text-amber-800 font-mono bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                      Hạn: {assessmentModalMbo.dueDate.split('-').reverse().join('/')}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between font-bold text-emerald-950">
                  <span>Tỷ lệ hoàn thành thực tế:</span>
                  <span className="text-base font-mono font-extrabold text-emerald-700">
                    {quickScore}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="150"
                  value={quickScore}
                  onChange={(e) => setQuickScore(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0%</span>
                  <span>50%</span>
                  <span>90% (Chuẩn)</span>
                  <span>100%</span>
                  <span>150%</span>
                </div>
                <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-between text-xs">
                  <span className="text-emerald-900 font-semibold">Điểm số ước tính:</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {((quickScore * assessmentModalMbo.weight) / 100).toFixed(1)} / {assessmentModalMbo.weight} điểm
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Ghi chú kết quả thực tế & dẫn chứng (Result):
                </label>
                <textarea
                  rows={3}
                  placeholder="Nhập chi tiết số liệu đạt được, lý do vượt chỉ tiêu hoặc các khó khăn thực tế..."
                  value={quickResult}
                  onChange={(e) => setQuickResult(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Cập nhật trạng thái:</label>
                <select
                  value={quickStatus}
                  onChange={(e) => setQuickStatus(e.target.value as any)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="draft">Bản nháp (초안)</option>
                  <option value="submitted">Chờ duyệt (대기)</option>
                  <option value="approved">Đã duyệt - Đang làm (승인)</option>
                  <option value="completed">Đã hoàn thành (완료)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssessmentModalMbo(null)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Lưu Kết Quả Đánh Giá
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. PRINT PREVIEW MODAL (BIỂU MẪU A4 IN CHUẨN CÔNG TY WELSTORY VIỆT NAM) */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/70 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
          {/* Top Floating Action Bar */}
          <div className="no-print max-w-5xl w-full mx-auto mb-4 bg-white p-3 rounded-2xl shadow-lg border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-emerald-600" />
              <span className="font-bold text-slate-900 text-sm">
                Xem Trước Bản In Biểu Mẫu MBO (MBO 등록 및 평가표)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>In Ngay / Xuất PDF</span>
              </button>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Sheet */}
          <div className="max-w-5xl w-full mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-200 text-slate-900 print:shadow-none print:border-none print:p-0 print:m-0 space-y-6">
            {/* Header info */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <WelstoryLogo size="md" className="shrink-0" />
                <div>
                  <h1 className="font-extrabold text-sm uppercase tracking-wide text-slate-900">
                    CÔNG TY TNHH WELSTORY VIỆT NAM
                  </h1>
                  <p className="text-xs text-slate-600">
                    PHÒNG NHÂN SỰ &bull; HUMAN RESOURCES GROUP
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>Biểu mẫu: HR-MBO-2026</div>
                <div>Ngày in: {new Date().toLocaleDateString('vi-VN')}</div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center space-y-1">
              <h2 className="text-lg sm:text-xl font-black uppercase text-slate-900 tracking-wider">
                BẢNG ĐĂNG KÝ VÀ ĐÁNH GIÁ MBO
              </h2>
              <p className="text-xs font-semibold text-slate-600 italic">
                (MBO 등록 및 평가표 - Management by Objectives Sheet)
              </p>
            </div>

            {/* Employee Meta Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 block">Họ và tên nhân sự:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedEmployeeObj ? selectedEmployeeObj.name : (currentUser?.name || 'Toàn bộ nhân sự')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Mã nhân viên (사번):</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedEmployeeObj ? selectedEmployeeObj.id : (currentUser?.id || 'ALL')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Bộ phận (부서):</span>
                <span className="font-bold text-slate-900">
                  {selectedEmployeeObj ? selectedEmployeeObj.department : 'HUMAN RESOURCES'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Kỳ đánh giá (구분):</span>
                <span className="font-bold text-emerald-800">
                  {filterPeriod === 'all' ? 'Năm 2026' : filterPeriod === '6-months' ? 'Kỳ 06 Tháng' : 'Kỳ Hàng Năm'}
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-300 rounded-lg">
              <table className="w-full text-[11px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
                    <th className="p-2 text-center w-8 border-r border-slate-300">STT</th>
                    <th className="p-2 w-24 border-r border-slate-300">Phân loại (구분)</th>
                    <th className="p-2 border-r border-slate-300">What (Mục tiêu - 무엇을)</th>
                    <th className="p-2 border-r border-slate-300">How (Phương án - 어떻게)</th>
                    <th className="p-2 border-r border-slate-300">Tiêu chí (평가기준)</th>
                    <th className="p-2 text-center w-14 border-r border-slate-300">Trọng số</th>
                    <th className="p-2 border-r border-slate-300">Kết quả (결과)</th>
                    <th className="p-2 text-center w-14 border-r border-slate-300">Hoàn thành</th>
                    <th className="p-2 text-center w-14 border-r border-slate-300">Điểm số</th>
                    <th className="p-2 text-center w-20">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredMBOs.map((mbo, idx) => {
                    const rate = mbo.completionRate ?? mbo.selfAssessment ?? 0;
                    const wt = mbo.weight || 0;
                    const sc = mbo.score !== undefined ? mbo.score : Number(((rate * wt) / 100).toFixed(1));
                    const isBlue = Boolean(mbo.isPersonalDevelopment);

                    return (
                      <tr key={mbo.id} className={isBlue ? 'bg-sky-50/40 text-sky-950 font-medium' : ''}>
                        <td className="p-2 text-center font-bold border-r border-slate-300">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-300">
                          {isBlue ? 'Phát triển / Đổi mới' : 'Nghiệp vụ'}
                        </td>
                        <td className="p-2 font-bold border-r border-slate-300">{mbo.what || mbo.title}</td>
                        <td className="p-2 border-r border-slate-300">{mbo.how || mbo.description || '-'}</td>
                        <td className="p-2 border-r border-slate-300">{mbo.criteria || mbo.target}</td>
                        <td className="p-2 text-center font-mono font-bold border-r border-slate-300">{wt}%</td>
                        <td className="p-2 border-r border-slate-300">{mbo.result || '-'}</td>
                        <td className="p-2 text-center font-mono font-bold border-r border-slate-300">{rate}%</td>
                        <td className="p-2 text-center font-mono font-bold border-r border-slate-300">{sc.toFixed(1)}</td>
                        <td className="p-2 text-center">
                          {mbo.status === 'completed' ? 'Hoàn thành' : mbo.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-extrabold border-t-2 border-slate-400">
                    <td colSpan={5} className="p-2 text-left border-r border-slate-300 uppercase">
                      Tổng Cộng (합계 / TOTAL)
                    </td>
                    <td className="p-2 text-center font-mono border-r border-slate-300">
                      {tableSummary.totalWeight}%
                    </td>
                    <td className="p-2 text-slate-600 border-r border-slate-300 text-center">-</td>
                    <td className="p-2 text-center font-mono border-r border-slate-300">
                      {tableSummary.avgCompletion}%
                    </td>
                    <td className="p-2 text-center font-mono text-emerald-800 text-xs border-r border-slate-300">
                      {tableSummary.totalScore}
                    </td>
                    <td className="p-2 text-center">
                      Hạng {tableSummary.grade}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Rating Summary Note */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center">
              <div>
                <strong>Quy chuẩn xếp loại:</strong> S (&ge;95đ: Xuất sắc) &bull; A (85-94.9đ: Giỏi) &bull; B (70-84.9đ: Khá) &bull; C (60-69.9đ: TB) &bull; D (&lt;60đ: Cần cải thiện)
              </div>
              <div className="font-bold text-slate-800">
                Kết quả chung cuộc: <span className="text-emerald-700 text-sm font-black">Hạng {tableSummary.grade} ({tableSummary.totalScore} điểm)</span>
              </div>
            </div>

            {/* Signature Blocks */}
            <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs">
              <div className="space-y-16">
                <div>
                  <div className="font-bold uppercase text-slate-800">Người Lập Biểu</div>
                  <div className="text-slate-500 italic text-[11px]">(Ký & ghi rõ họ tên)</div>
                </div>
                <div className="font-bold text-slate-900 border-t border-slate-300 pt-1 w-32 mx-auto">
                  {selectedEmployeeObj ? selectedEmployeeObj.name : (currentUser?.name || 'Nhân viên')}
                </div>
              </div>

              <div className="space-y-16">
                <div>
                  <div className="font-bold uppercase text-slate-800">Trưởng Nhóm / Quản Lý</div>
                  <div className="text-slate-500 italic text-[11px]">(Xác nhận đánh giá)</div>
                </div>
                <div className="font-bold text-slate-900 border-t border-slate-300 pt-1 w-32 mx-auto">
                  Hà Văn Nam
                </div>
              </div>

              <div className="space-y-16">
                <div>
                  <div className="font-bold uppercase text-slate-800">Giám Đốc Duyệt</div>
                  <div className="text-slate-500 italic text-[11px]">(Phê duyệt kết quả MBO)</div>
                </div>
                <div className="font-bold text-slate-900 border-t border-slate-300 pt-1 w-32 mx-auto">
                  Nguyễn Hoàng Long
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
