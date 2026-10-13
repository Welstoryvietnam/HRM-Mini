import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Download,
  Printer,
  Calendar,
  Filter,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileText,
  Mail,
  ChevronDown,
  Info,
} from 'lucide-react';
import { Task, Employee, MBO, WorkNote, ChatMessage, AuthUser } from '../types';

interface AIChatBotProps {
  tasks: Task[];
  employees: Employee[];
  mbos: MBO[];
  notes: WorkNote[];
  currentUser: AuthUser | null;
  mode?: 'full' | 'compact';
  onClose?: () => void;
}

interface WeekOption {
  label: string;
  start: string;
  end: string;
}

const WEEK_OPTIONS: WeekOption[] = [
  {
    label: 'Tuần 41 (05/10/2026 - 11/10/2026) - Tuần hiện tại',
    start: '2026-10-05',
    end: '2026-10-11',
  },
  {
    label: 'Tuần 40 (28/09/2026 - 04/10/2026) - Tuần trước',
    start: '2026-10-28',
    end: '2026-10-04',
  },
  {
    label: 'Tuần 39 (21/09/2026 - 27/09/2026)',
    start: '2026-09-21',
    end: '2026-09-27',
  },
];

const PRESET_PROMPTS = [
  {
    icon: FileText,
    label: 'Tổng hợp báo cáo tuần này (Tất cả nhân viên)',
    prompt:
      'Hãy tổng hợp báo cáo công việc tuần này cho toàn bộ nhân sự bộ phận HR Welstory Việt Nam. Bao gồm tổng quan tỷ lệ hoàn thành, chi tiết từng nhân viên, các việc tồn đọng và đề xuất tuần tới.',
  },
  {
    icon: AlertTriangle,
    label: 'Phân tích Task quá hạn & rủi ro',
    prompt:
      'Liệt kê chi tiết các công việc đang bị quá hạn hoặc có mức độ ưu tiên khẩn cấp/cao nhưng chưa hoàn thành. Đưa ra cảnh báo và kiến nghị xử lý ngay.',
  },
  {
    icon: Users,
    label: 'Báo cáo hiệu suất theo từng nhân sự',
    prompt:
      'Lập bảng tổng hợp đánh giá số lượng và tiến độ công việc được giao theo từng nhân sự trong bộ phận. Ai đang có nhiều việc nhất và tỷ lệ hoàn thành ra sao?',
  },
  {
    icon: TrendingUp,
    label: 'Tiến độ mục tiêu MBO tuần này',
    prompt:
      'Tổng kết tiến độ các mục tiêu trọng tâm MBO của bộ phận HR, tỷ lệ đạt được so với kế hoạch và các điểm cần đẩy nhanh.',
  },
  {
    icon: Mail,
    label: 'Soạn email báo cáo tuần gửi Giám đốc',
    prompt:
      'Soạn một bức email ngắn gọn, chuyên nghiệp gửi Ban Giám Đốc tóm tắt kết quả công việc tuần này của bộ phận HR và các trọng tâm tuần tiếp theo.',
  },
  {
    icon: Clock,
    label: 'Lập kế hoạch hành động tuần tới',
    prompt:
      'Dựa trên các việc đang dở dang và mục tiêu hiện tại, hãy đề xuất 5 nhiệm vụ trọng tâm ưu tiên hàng đầu cần hoàn thành trong tuần kế tiếp.',
  },
];

// Helper to format basic markdown to HTML safely
function renderFormattedMarkdown(text: string) {
  if (!text) return null;

  // Split into paragraphs / lines
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];

  lines.forEach((line, idx) => {
    // Handle code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${idx}`}
            className="my-3 p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto"
          >
            <code>{codeBlockBuffer.join('\n')}</code>
          </pre>
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      return;
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(
        <h4
          key={idx}
          className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-3.5 mb-1.5 flex items-center gap-1.5"
        >
          {line.replace('### ', '')}
        </h4>
      );
      return;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3
          key={idx}
          className="text-base font-extrabold text-slate-900 dark:text-white mt-4 mb-2 pb-1 border-b border-slate-200 dark:border-slate-800"
        >
          {line.replace('## ', '')}
        </h3>
      );
      return;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h2
          key={idx}
          className="text-lg font-black text-emerald-800 dark:text-emerald-400 mt-4 mb-2"
        >
          {line.replace('# ', '')}
        </h2>
      );
      return;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={idx}
          className="border-l-4 border-emerald-500 pl-3 py-1 my-2 text-xs italic text-slate-700 dark:text-slate-300 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-r"
        >
          {formatInline(line.replace('> ', ''))}
        </blockquote>
      );
      return;
    }

    // Bullet points
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const cleanLine = line.trim().replace(/^[-*]\s+/, '');
      elements.push(
        <li
          key={idx}
          className="ml-5 list-disc text-xs sm:text-sm text-slate-800 dark:text-slate-200 my-1 leading-relaxed"
        >
          {formatInline(cleanLine)}
        </li>
      );
      return;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={idx} className="h-2" />);
      return;
    }

    // Normal paragraph
    elements.push(
      <p
        key={idx}
        className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed my-1"
      >
        {formatInline(line)}
      </p>
    );
  });

  return <div className="space-y-0.5">{elements}</div>;
}

// Inline format for bold, code, highlights
function formatInline(text: string): React.ReactNode {
  // Bold **text**
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 font-mono text-xs"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export const AIChatBot: React.FC<AIChatBotProps> = ({
  tasks,
  employees,
  mbos,
  notes,
  currentUser,
  mode = 'full',
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('welstory_ai_chat_history_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading chat history', e);
    }
    return [
      {
        id: 'welcome-msg',
        role: 'assistant',
        content: `Xin chào ${
          currentUser?.name || 'Quản lý'
        }! Tôi là **Trợ lý AI Báo Cáo Nhân Sự** của Bộ phận HR / Welstory Việt Nam.

Tôi đã đồng bộ toàn bộ dữ liệu thực tế gồm **${tasks.length} công việc (Tasks)**, **${mbos.length} mục tiêu MBO**, **${notes.length} ghi chú** của **${employees.length} nhân sự**.

Tôi có thể hỗ trợ bạn ngay:
- 📊 **Lập báo cáo tổng hợp tuần** hoàn chỉnh gửi Giám đốc.
- 👥 **Thống kê tiến độ theo từng nhân viên** chi tiết.
- ⚠️ **Kiểm tra công việc quá hạn** và các rủi ro tồn đọng.
- ✉️ **Soạn email báo cáo tuần** chuẩn mực doanh nghiệp.
- 🚀 **Đề xuất kế hoạch hành động trọng tâm** cho tuần tới.

Hãy chọn gợi ý nhanh bên dưới hoặc nhập yêu cầu của bạn!`,
        timestamp: new Date().toISOString(),
      },
    ];
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<WeekOption>(WEEK_OPTIONS[0]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('welstory_ai_chat_history_v1', JSON.stringify(messages));
    } catch (e) {
      console.error('Error saving chat history', e);
    }
  }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Stats calculation for the context badge
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in-progress').length;
  const overdueCount = tasks.filter(
    (t) => t.status !== 'completed' && t.dueDate && t.dueDate < '2026-10-09'
  ).length;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputPrompt('');
    setIsLoading(true);

    try {
      // Build server request payload with full HR context
      const filteredTasks =
        selectedEmployeeId === 'all'
          ? tasks
          : tasks.filter((t) => t.employeeId === selectedEmployeeId);

      const payload = {
        messages: newMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        context: {
          tasks: filteredTasks,
          employees,
          mbos,
          notes,
          currentWeek: selectedWeek,
          selectedEmployeeId: selectedEmployeeId === 'all' ? undefined : selectedEmployeeId,
          currentUser,
        },
      };

      const res = await fetch('/api/ai/weekly-report-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Lỗi kết nối từ máy chủ');
      }

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.reply || 'Đã tạo báo cáo thành công.',
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Không thể tạo báo cáo lúc này**: ${
          err?.message || 'Lỗi không xác định'
        }.\n\n*Gợi ý*: Vui lòng kiểm tra cấu hình Gemini API hoặc thử lại câu hỏi ngắn hơn.`,
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (text: string) => {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bao_Cao_Tuan_${selectedWeek.start}_${selectedWeek.end}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = (content: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Báo Cáo Công Việc Tuần - HR Welstory</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; padding: 40px; color: #1e293b; max-width: 900px; margin: 0 auto; }
            h1, h2, h3, h4 { color: #0f172a; margin-top: 1.5em; }
            ul, ol { padding-left: 20px; }
            li { margin: 6px 0; }
            blockquote { border-left: 4px solid #10b981; padding-left: 12px; margin: 12px 0; color: #475569; font-style: italic; }
            pre { background: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 13px; }
            hr { border: none; border-top: 1px solid #e2e840; margin: 24px 0; }
            .header-banner { border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 24px; }
            .company { font-weight: bold; color: #059669; font-size: 14px; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <div class="company">Công ty TNHH Welstory Việt Nam · Bộ phận HR</div>
            <div>Hệ Thống Quản Lý & Báo Cáo Công Việc</div>
          </div>
          <div style="white-space: pre-wrap;">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const handleClearChat = () => {
    if (confirm('Bạn có chắc muốn xóa lịch sử cuộc trò chuyện này để bắt đầu phiên mới?')) {
      const resetMsg: ChatMessage = {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Đã làm mới phiên trò chuyện. Dữ liệu công việc của ${employees.length} nhân sự đã sẵn sàng. Hãy chọn nội dung bạn muốn tổng hợp!`,
        timestamp: new Date().toISOString(),
      };
      setMessages([resetMsg]);
      localStorage.removeItem('welstory_ai_chat_history_v1');
    }
  };

  return (
    <div
      className={`flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden ${
        mode === 'compact' ? 'h-[620px] w-full max-w-lg' : 'h-[calc(100vh-140px)] min-h-[640px]'
      }`}
    >
      {/* 1. Header Toolbar */}
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xs">
            <Sparkles className="w-5 h-5 text-emerald-200 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm sm:text-base leading-tight">
                Trợ Lý AI Báo Cáo Tuần
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-500/40 text-emerald-100 rounded-full border border-emerald-300/30">
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-[11px] text-emerald-100/90 leading-tight">
              Tổng hợp tiến độ Task, MBO & nhân sự Bộ phận HR Welstory
            </p>
          </div>
        </div>

        {/* Live Data Badge & Action Controls */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Quick Stats Pill */}
          <div className="hidden md:flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-xl text-[11px]">
            <span className="flex items-center gap-1 text-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <b>{completedCount}</b>/{tasks.length} Xong
            </span>
            <span className="text-white/30">|</span>
            <span className="flex items-center gap-1 text-amber-200">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <b>{inProgressCount}</b> Đang làm
            </span>
            {overdueCount > 0 && (
              <>
                <span className="text-white/30">|</span>
                <span className="flex items-center gap-1 text-rose-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <b>{overdueCount}</b> Quá hạn
                </span>
              </>
            )}
          </div>

          {/* Clear history */}
          <button
            onClick={handleClearChat}
            title="Làm mới cuộc trò chuyện"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 2. Filter & Context Bar */}
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Week Selector */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-slate-500 font-medium">Kỳ báo cáo:</span>
            <select
              value={selectedWeek.start}
              onChange={(e) => {
                const opt = WEEK_OPTIONS.find((w) => w.start === e.target.value);
                if (opt) setSelectedWeek(opt);
              }}
              className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              {WEEK_OPTIONS.map((w) => (
                <option key={w.start} value={w.start} className="text-slate-900 dark:text-slate-100">
                  {w.label}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Filter */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-medium">Nhân sự:</span>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">Toàn bộ nhân sự ({employees.length} người)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id} className="text-slate-900 dark:text-slate-100">
                  {emp.name} ({emp.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-emerald-600" />
          <span>Dữ liệu thời gian thực được đồng bộ tự động</span>
        </div>
      </div>

      {/* 3. Messages Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <div
              key={message.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {/* Bot Avatar */}
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-2xs mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              {/* Message Content Container */}
              <div
                className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 shadow-2xs transition-all ${
                  isUser
                    ? 'bg-emerald-600 text-white rounded-tr-xs'
                    : message.isError
                    ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 rounded-tl-xs'
                    : 'bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-xs'
                }`}
              >
                {/* User Text */}
                {isUser ? (
                  <p className="text-xs sm:text-sm font-medium whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </p>
                ) : (
                  <div>
                    {/* Assistant Formatted Markdown */}
                    <div className="prose prose-xs sm:prose-sm dark:prose-invert max-w-none">
                      {renderFormattedMarkdown(message.content)}
                    </div>

                    {/* Action Bar for AI Reports (Copy, Download, Print) */}
                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-[10px] text-slate-400">
                        {new Date(message.timestamp).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {/* Copy */}
                        <button
                          onClick={() => handleCopy(message.id, message.content)}
                          title="Sao chép nội dung"
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 font-medium text-[11px] transition-colors cursor-pointer shadow-2xs"
                        >
                          {copiedId === message.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600 font-semibold">Đã sao chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Sao chép</span>
                            </>
                          )}
                        </button>

                        {/* Download as Markdown */}
                        <button
                          onClick={() => handleDownload(message.content)}
                          title="Tải về file Markdown"
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 font-medium text-[11px] transition-colors cursor-pointer shadow-2xs"
                        >
                          <Download className="w-3 h-3" />
                          <span>Tải .md</span>
                        </button>

                        {/* Print */}
                        <button
                          onClick={() => handlePrint(message.content)}
                          title="In hoặc lưu PDF"
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 font-medium text-[11px] transition-colors cursor-pointer shadow-2xs"
                        >
                          <Printer className="w-3 h-3" />
                          <span>In / PDF</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar */}
              {isUser && (
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs mt-1 ${
                    currentUser?.avatarColor || 'bg-emerald-700'
                  }`}
                >
                  {currentUser?.name.split(' ').pop()?.charAt(0) || <UserIcon className="w-4 h-4" />}
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start animate-in fade-in">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-2xs">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-xs p-4 shadow-2xs max-w-[85%]">
              <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
                <span className="font-semibold">
                  Đang phân tích dữ liệu {tasks.length} tasks và tổng hợp báo cáo tuần...
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Gemini AI đang tính toán tỷ lệ hoàn thành, đối soát người phụ trách và lập đề xuất tuần tới.
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Quick Prompt Suggestions Chips */}
      <div className="px-4 py-2 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200/80 dark:border-slate-800">
        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Gợi ý mẫu báo cáo nhanh:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {PRESET_PROMPTS.map((preset, i) => {
            const Icon = preset.icon;
            return (
              <button
                key={i}
                type="button"
                disabled={isLoading}
                onClick={() => handleSendMessage(preset.prompt)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
              >
                <Icon className="w-3 h-3 text-emerald-600" />
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Input Bar */}
      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-end gap-2"
        >
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              rows={2}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập yêu cầu tổng hợp công việc, ví dụ: 'Tổng hợp báo cáo tuần này cho tôi', 'Các task nào đang quá hạn?' (Nhấn Enter để gửi, Shift+Enter xuống dòng)..."
              disabled={isLoading}
              className="w-full resize-none px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-2xs"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !inputPrompt.trim()}
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-95 shadow-2xs disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Gửi</span>
          </button>
        </form>
      </div>
    </div>
  );
};
