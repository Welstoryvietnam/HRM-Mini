import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'store.json');

// Initialize Gemini AI Client with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const INITIAL_EMPLOYEES = [
  {
    id: '1603186689',
    name: 'Trần Văn Thắng',
    department: 'HUMAN RESOURCES',
    avatarColor: 'bg-blue-600',
    notes: 'Quản trị viên hệ thống (Admin)',
    password: '123456',
    role: 'quan_ly_nhan_su',
  },
  {
    id: '1802260694',
    name: 'Lưu Thị Thúy Hường',
    department: 'HUMAN RESOURCES',
    avatarColor: 'bg-pink-600',
    notes: 'Nhân sự HR Group',
    password: '123456',
    role: 'nhan_vien_nhan_su',
  },
  {
    id: '1805181167',
    name: 'Vũ Thị Chung',
    department: 'HUMAN RESOURCES',
    avatarColor: 'bg-emerald-600',
    notes: 'Nhân sự HR Group',
    password: '123456',
    role: 'nhan_vien_nhan_su',
  },
  {
    id: '1806011183',
    name: 'Trần Phương Dung',
    department: 'HUMAN RESOURCES',
    avatarColor: 'bg-purple-600',
    notes: 'Nhân sự HR Group',
    password: '123456',
    role: 'nhan_vien_nhan_su',
  },
  {
    id: '1905082730',
    name: 'Vũ Thị Yến',
    department: 'HUMAN RESOURCES',
    avatarColor: 'bg-rose-600',
    notes: 'Nhân sự HR Group',
    password: '123456',
    role: 'nhan_vien_nhan_su',
  },
  {
    id: '1906042875',
    name: 'Hà Văn Nam',
    department: 'HUMAN RESOURCES',
    phone: '0936 678 901',
    avatarColor: 'bg-violet-600',
    notes: 'Trưởng nhóm tuyển dụng thực địa',
    password: '123456',
    role: 'quan_ly_nhan_su',
  },
  {
    id: '2003163729',
    name: 'Nguyễn Thị Hoài Thương',
    department: 'HUMAN RESOURCES',
    avatarColor: 'bg-teal-600',
    notes: 'Nhân sự HR Group',
    password: '123456',
    role: 'nhan_vien_nhan_su',
  },
  {
    id: '2006013886',
    name: 'Nguyễn Công Sơn',
    department: 'HUMAN RESOURCES',
    phone: '0905 567 890',
    avatarColor: 'bg-teal-600',
    notes: 'Tuyển dụng nhân sự cấp cao',
    password: '123456',
    role: 'nhan_vien_nhan_su',
  },
  {
    id: '2007274042',
    name: 'Lê Thị Hoài',
    department: 'HUMAN RESOURCES',
    avatarColor: 'bg-orange-600',
    notes: 'Nhân sự HR Group',
    password: '123456',
    role: 'nhan_vien_nhan_su',
  },
  {
    id: '2012144601',
    name: 'Nguyễn Văn Dựng',
    department: 'HUMAN RESOURCES',
    phone: '0964 456 789',
    avatarColor: 'bg-amber-600',
    notes: 'Chuyên viên phỏng vấn & sourcing',
    password: '123456',
    role: 'nhan_vien_nhan_su',
  },
  {
    id: '2209196118',
    name: 'Phạm Thị Thanh',
    department: 'HUMAN RESOURCES',
    avatarColor: 'bg-cyan-600',
    notes: 'Nhân sự HR Group',
    password: '123456',
    role: 'nhan_vien_nhan_su',
  },
  {
    id: '2302016468',
    name: 'Nguyễn Thị Hằng',
    department: 'HUMAN RESOURCES',
    avatarColor: 'bg-fuchsia-600',
    notes: 'Nhân sự HR Group',
    password: '123456',
    role: 'nhan_vien_nhan_su',
  },
  {
    id: '2304106616',
    name: 'Nguyễn Thị Ánh',
    department: 'HUMAN RESOURCES',
    avatarColor: 'bg-indigo-600',
    notes: 'Nhân sự HR Group',
    password: '123456',
    role: 'nhan_vien_nhan_su',
  },
  {
    id: '2404247449',
    name: 'Nguyễn Thị Hương Giang',
    department: 'HUMAN RESOURCES',
    avatarColor: 'bg-rose-500',
    notes: 'Nhân sự HR Group',
    password: '123456',
    role: 'nhan_vien_nhan_su',
  },
  {
    id: '2408057742',
    name: 'La Thị Thanh Huyền',
    department: 'HUMAN RESOURCES',
    avatarColor: 'bg-emerald-700',
    notes: 'Nhân sự HR Group',
    password: '123456',
    role: 'nhan_vien_nhan_su',
  },
  {
    id: '2502038104',
    name: 'Nguyễn Văn Hùng',
    department: 'HUMAN RESOURCES',
    phone: '0972 234 567',
    avatarColor: 'bg-sky-600',
    notes: 'Tuyển dụng khối nhà máy',
    password: '123456',
    role: 'nhan_vien_nhan_su',
  },
  {
    id: '2508188504',
    name: 'Hoàng Hải Ngữ',
    department: 'HUMAN RESOURCES',
    avatarColor: 'bg-lime-600',
    notes: 'Nhân sự HR Group',
    password: '123456',
    role: 'nhan_vien_nhan_su',
  },
  {
    id: '2509038532',
    name: 'Bùi Văn Nhiệm',
    department: 'HUMAN RESOURCES',
    phone: '0913 345 678',
    avatarColor: 'bg-indigo-600',
    notes: 'Tuyển dụng thị trường & đối tác',
    password: '123456',
    role: 'nhan_vien_nhan_su',
  },
  {
    id: '2603168875',
    name: 'Chu Thị Ngọc Hà',
    department: 'HUMAN RESOURCES',
    avatarColor: 'bg-violet-700',
    notes: 'Nhân sự HR Group',
    password: '123456',
    role: 'nhan_vien_nhan_su',
  },
  {
    id: '2603268920',
    name: 'Đinh Thị Thúy Vân',
    department: 'HUMAN RESOURCES',
    avatarColor: 'bg-amber-700',
    notes: 'Nhân sự HR Group',
    password: '123456',
    role: 'nhan_vien_nhan_su',
  },
  {
    id: '2603268921',
    name: 'Chu Thị Huế',
    department: 'HUMAN RESOURCES',
    avatarColor: 'bg-blue-700',
    notes: 'Nhân sự HR Group',
    password: '123456',
    role: 'nhan_vien_nhan_su',
  },
  {
    id: '2609079269',
    name: 'Nguyễn Thị Luyến',
    department: 'HUMAN RESOURCES',
    avatarColor: 'bg-teal-700',
    notes: 'Nhân sự HR Group',
    password: '123456',
    role: 'nhan_vien_nhan_su',
  },
];

const DEFAULT_SETTINGS = {
  mealPrice: 40000,
  companyName: 'Công ty TNHH Welstory Việt Nam',
  departmentName: 'HR Group',
  preparerName: 'Nguyễn Văn Hùng',
  accountantName: 'Trần Thị Thu Thảo',
  leaderName: 'Hà Văn Nam',
  directorName: 'Nguyễn Hoàng Long',
};

const SERVER_INITIAL_TASKS = [
  {
    id: 'task-1',
    employeeId: '2502038104',
    title: 'Đối soát bảng kê và quyết toán tiền ăn ngoài chu kỳ 26/09 - 25/10',
    description: 'Rà soát chứng từ chấm ăn của đội ngũ tuyển dụng, đối chiếu với hóa đơn thực tế và chữ ký xác nhận của bếp ăn các điểm.',
    dueDate: '2026-10-15',
    status: 'in-progress',
    assignedBy: '1603186689',
    priority: 'urgent',
    progress: 60,
    resultNote: 'Đã hoàn tất đối soát 6/8 bếp ăn tại Bắc Ninh và Phú Thọ.',
    createdAt: '2026-10-06T08:00:00.000Z',
    updatedAt: '2026-10-07T10:30:00.000Z',
  },
  {
    id: 'task-2',
    employeeId: '2408227653',
    title: 'Tuyển dụng bổ sung 15 phụ bếp cho dự án bếp ăn Samsung Yên Phong',
    description: 'Tiếp nhận yêu cầu bổ sung nhân sự từ bộ phận vận hành bếp ăn, đăng tin tuyển dụng và tổ chức phỏng vấn vòng 1.',
    dueDate: '2026-10-20',
    status: 'in-progress',
    assignedBy: '1603186689',
    priority: 'high',
    progress: 40,
    resultNote: 'Đã phỏng vấn được 8 ứng viên, 5 người đạt yêu cầu.',
    createdAt: '2026-10-06T09:00:00.000Z',
    updatedAt: '2026-10-07T14:00:00.000Z',
  },
  {
    id: 'task-3',
    employeeId: '1802260694',
    title: 'Thu thập giấy tờ CCCD & Giấy khám sức khỏe nhân sự mới tháng 10',
    description: 'Kiểm tra tính hợp lệ của hồ sơ ứng viên trúng tuyển, chuẩn bị thủ tục cấp thẻ ra vào nhà máy.',
    dueDate: '2026-10-10',
    status: 'completed',
    assignedBy: '1603186689',
    priority: 'medium',
    progress: 100,
    completedAt: '2026-10-08T16:00:00.000Z',
    resultNote: 'Đã thu thập đầy đủ 100% hồ sơ của 12 nhân sự mới tiếp nhận.',
    createdAt: '2026-10-05T08:30:00.000Z',
    updatedAt: '2026-10-08T16:00:00.000Z',
  },
  {
    id: 'task-4',
    employeeId: '1805181167',
    title: 'Liên hệ phối hợp với Trung tâm Dịch vụ Việc làm tỉnh Bắc Ninh',
    description: 'Lên lịch tham gia phiên giao dịch việc làm lưu động và đăng ký gian tuyển dụng trực tiếp.',
    dueDate: '2026-10-18',
    status: 'pending',
    assignedBy: '1603186689',
    priority: 'medium',
    progress: 0,
    createdAt: '2026-10-07T11:00:00.000Z',
    updatedAt: '2026-10-07T11:00:00.000Z',
  },
  {
    id: 'task-5',
    employeeId: '1603186689',
    title: 'Tổng hợp báo cáo tiến độ tuần và đánh giá chỉ số MBO chu kỳ 6 tháng',
    description: 'Rà soát tỷ lệ hoàn thành mục tiêu cá nhân của các chuyên viên HR, chuẩn bị số liệu họp ban lãnh đạo.',
    dueDate: '2026-10-12',
    status: 'in-progress',
    assignedBy: '1603186689',
    priority: 'high',
    progress: 75,
    resultNote: 'Đã xuất bảng tổng kết và chuẩn bị slide báo cáo tuần.',
    createdAt: '2026-10-06T08:00:00.000Z',
    updatedAt: '2026-10-08T09:00:00.000Z',
  },
];

interface StoreData {
  employees: any[];
  mealData: Record<string, any>;
  settings: any;
  passwordRequests: any[];
  notifications: any[];
  tasks: any[];
  notes: any[];
  version: number;
}

function loadStore(): StoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        employees: parsed.employees || INITIAL_EMPLOYEES,
        mealData: parsed.mealData || {},
        settings: parsed.settings || DEFAULT_SETTINGS,
        passwordRequests: parsed.passwordRequests || [],
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        tasks: Array.isArray(parsed.tasks) && parsed.tasks.length > 0 ? parsed.tasks : SERVER_INITIAL_TASKS,
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        version: parsed.version || Date.now(),
      };
    }
  } catch (err) {
    console.error('Error reading store file, using fallback', err);
  }
  const defaultStore: StoreData = {
    employees: INITIAL_EMPLOYEES,
    mealData: {},
    settings: DEFAULT_SETTINGS,
    passwordRequests: [],
    notifications: [],
    tasks: SERVER_INITIAL_TASKS,
    notes: [],
    version: Date.now(),
  };
  saveStore(defaultStore);
  return defaultStore;
}

function saveStore(data: StoreData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    data.version = Date.now();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving store file', err);
  }
}

const app = express();
app.use(express.json({ limit: '10mb' }));

// 1. Get entire central database
app.get('/api/data', (_req, res) => {
  const store = loadStore();
  res.json(store);
});

// 2. Save / toggle / edit single day meal
app.post('/api/meals/save', (req, res) => {
  const { employeeId, dateStr, sessions, mealsCount, note, location, purpose } = req.body;
  if (!employeeId || !dateStr) {
    return res.status(400).json({ error: 'Missing employeeId or dateStr' });
  }
  const store = loadStore();
  if (!store.mealData[employeeId]) {
    store.mealData[employeeId] = { employeeId, records: {} };
  }
  const empRecords = store.mealData[employeeId].records;
  const currentRecord = empRecords[dateStr];

  if (mealsCount !== undefined && mealsCount <= 0 && (!sessions || sessions.length === 0)) {
    delete empRecords[dateStr];
  } else {
    const effectiveSessions = sessions !== undefined ? sessions : currentRecord?.sessions;
    const count = sessions !== undefined ? sessions.length : (mealsCount !== undefined ? mealsCount : 1);
    empRecords[dateStr] = {
      date: dateStr,
      mealsCount: count,
      sessions: effectiveSessions,
      note: note !== undefined ? note : currentRecord?.note,
      location: location !== undefined ? location : currentRecord?.location,
      purpose: purpose !== undefined ? purpose : currentRecord?.purpose,
    };
  }
  saveStore(store);
  res.json({ success: true, mealData: store.mealData, version: store.version });
});

// 3. Batch check-in multiple dates
app.post('/api/meals/batch', (req, res) => {
  const { employeeId, dates, mealsCount } = req.body;
  if (!employeeId || !Array.isArray(dates)) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }
  const store = loadStore();
  if (!store.mealData[employeeId]) {
    store.mealData[employeeId] = { employeeId, records: {} };
  }
  const empRecords = store.mealData[employeeId].records;
  dates.forEach((dateStr: string) => {
    if (mealsCount <= 0) {
      delete empRecords[dateStr];
    } else {
      const current = empRecords[dateStr];
      empRecords[dateStr] = {
        date: dateStr,
        mealsCount,
        sessions: current?.sessions || [
          {
            id: `${dateStr}_trua`,
            mealType: 'Bữa Trưa',
            startTime: '08:00',
            endTime: '17:00',
            location: 'Bắc Ninh',
            purpose: 'Tuyển dụng các bếp Samsung Yên Phong và các bếp Quế Võ',
            mealsCount: 1,
          },
        ],
        location: current?.location || 'Bắc Ninh',
        purpose: current?.purpose || 'Tuyển dụng các bếp Samsung Yên Phong và các bếp Quế Võ',
      };
    }
  });
  saveStore(store);
  res.json({ success: true, mealData: store.mealData, version: store.version });
});

// 4. Replace entire meal records
app.post('/api/meals/replace', (req, res) => {
  const { mealData } = req.body;
  const store = loadStore();
  store.mealData = mealData || {};
  saveStore(store);
  res.json({ success: true, mealData: store.mealData, version: store.version });
});

// 5. Reset all meal records to empty
app.post('/api/meals/reset', (_req, res) => {
  const store = loadStore();
  store.mealData = {};
  saveStore(store);
  res.json({ success: true, mealData: {}, version: store.version });
});

// 6. Update employees list
app.post('/api/employees', (req, res) => {
  const { employees } = req.body;
  if (!Array.isArray(employees)) {
    return res.status(400).json({ error: 'Invalid employees' });
  }
  const store = loadStore();
  store.employees = employees;
  saveStore(store);
  res.json({ success: true, employees: store.employees, version: store.version });
});

// 7. Submit password reset request
app.post('/api/password-requests', (req, res) => {
  const { employeeId, newPassword, reason } = req.body;
  const store = loadStore();
  const emp = store.employees.find((e) => e.id.toLowerCase() === employeeId.toLowerCase());
  if (!emp) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
  }
  const newReq = {
    id: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    employeeId: emp.id,
    employeeName: emp.name,
    newPassword,
    reason: reason || undefined,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
  store.passwordRequests.unshift(newReq);
  saveStore(store);
  res.json({ success: true, request: newReq, passwordRequests: store.passwordRequests, version: store.version });
});

// 8. Approve password reset request
app.post('/api/password-requests/approve', (req, res) => {
  const { requestId, reviewedBy } = req.body;
  const store = loadStore();
  const request = store.passwordRequests.find((r) => r.id === requestId);
  if (!request) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
  }
  request.status = 'approved';
  request.reviewedAt = new Date().toISOString();
  request.reviewedBy = reviewedBy || 'Admin HR';
  store.employees = store.employees.map((e) =>
    e.id === request.employeeId ? { ...e, password: request.newPassword } : e
  );
  saveStore(store);
  res.json({
    success: true,
    employees: store.employees,
    passwordRequests: store.passwordRequests,
    version: store.version,
  });
});

// 9. Reject password reset request
app.post('/api/password-requests/reject', (req, res) => {
  const { requestId, reviewedBy } = req.body;
  const store = loadStore();
  const request = store.passwordRequests.find((r) => r.id === requestId);
  if (!request) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu' });
  }
  request.status = 'rejected';
  request.reviewedAt = new Date().toISOString();
  request.reviewedBy = reviewedBy || 'Admin HR';
  saveStore(store);
  res.json({
    success: true,
    passwordRequests: store.passwordRequests,
    version: store.version,
  });
});

// 10. Update app settings
app.post('/api/settings', (req, res) => {
  const { settings } = req.body;
  const store = loadStore();
  store.settings = { ...store.settings, ...settings };
  saveStore(store);
  res.json({ success: true, settings: store.settings, version: store.version });
});

// 10b. Tasks API (Central sync across all devices & employees)
app.get('/api/tasks', (_req, res) => {
  const store = loadStore();
  res.json({ success: true, tasks: store.tasks || [], version: store.version });
});

app.post('/api/tasks', (req, res) => {
  const { tasks } = req.body;
  if (!Array.isArray(tasks)) {
    return res.status(400).json({ error: 'tasks must be an array' });
  }
  const store = loadStore();
  const taskMap = new Map<string, any>();
  // Keep existing tasks
  (store.tasks || []).forEach((t: any) => taskMap.set(t.id, t));
  // Merge incoming updates
  tasks.forEach((t: any) => taskMap.set(t.id, t));
  store.tasks = Array.from(taskMap.values());
  saveStore(store);
  res.json({ success: true, tasks: store.tasks, version: store.version });
});

app.post('/api/tasks/create', (req, res) => {
  const { task } = req.body;
  if (!task || !task.id) {
    return res.status(400).json({ error: 'Invalid task object' });
  }
  const store = loadStore();
  store.tasks = [task, ...(store.tasks || []).filter((t: any) => t.id !== task.id)];
  saveStore(store);
  res.json({ success: true, task, tasks: store.tasks, version: store.version });
});

app.post('/api/notifications', (req, res) => {
  const { notifications } = req.body;
  if (!Array.isArray(notifications)) {
    return res.status(400).json({ error: 'notifications must be an array' });
  }
  const store = loadStore();
  store.notifications = notifications;
  saveStore(store);
  res.json({ success: true, notifications: store.notifications, version: store.version });
});

app.post('/api/notes', (req, res) => {
  const { notes } = req.body;
  if (!Array.isArray(notes)) {
    return res.status(400).json({ error: 'notes must be an array' });
  }
  const store = loadStore();
  store.notes = notes;
  saveStore(store);
  res.json({ success: true, notes: store.notes, version: store.version });
});

// 11. Gemini AI HR Weekly Report & Multi-Turn Chatbot
app.post('/api/ai/weekly-report-chat', async (req, res) => {
  let generateLocalReport = () => '';
  try {
    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Danh sách tin nhắn (messages) là bắt buộc' });
    }

    // Build context summary from tasks, employees, mbos, notes, mealData
    const tasks = context?.tasks || [];
    const employees = context?.employees || [];
    const mbos = context?.mbos || [];
    const notes = context?.notes || [];
    const weekInfo = context?.currentWeek || {
      start: '2026-10-05',
      end: '2026-10-11',
      label: 'Tuần 41/2026 (05/10/2026 - 11/10/2026)',
    };

    const latestUserMsg = [...messages].reverse().find((m: any) => m.role === 'user')?.content || '';

    // Smart fallback synthesizer function
    generateLocalReport = () => {
      const total = tasks.length;
      const completed = tasks.filter((t: any) => t.status === 'completed');
      const inProgress = tasks.filter((t: any) => t.status === 'in-progress');
      const pending = tasks.filter((t: any) => t.status === 'pending');
      const rate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
      const todayStr = '2026-10-09';
      const overdue = tasks.filter(
        (t: any) => t.status !== 'completed' && t.dueDate && t.dueDate < todayStr
      );

      // Check if user requested email draft
      const isEmailRequest = latestUserMsg.toLowerCase().includes('email') || latestUserMsg.toLowerCase().includes('gửi sếp') || latestUserMsg.toLowerCase().includes('gửi giám đốc');

      if (isEmailRequest) {
        return `### ✉️ DỰ THẢO EMAIL BÁO CÁO TUẦN GỬI BAN GIÁM ĐỐC
**Kính gửi:** Ban Giám Đốc & Trưởng phòng Nhân sự Welstory Việt Nam,  
**Người gửi:** Bộ phận Tuyển dụng & Quản lý nhân sự Welstory (HR Group),  
**Thời gian:** ${weekInfo.label}  

---

**Kính thưa Ban Giám Đốc,**

Bộ phận HR xin trân trọng báo cáo tóm tắt kết quả triển khai công việc trong ${weekInfo.label} như sau:

#### 1. Tổng quan số liệu chính:
- **Tổng số công việc theo dõi:** ${total} nhiệm vụ
- **Đã hoàn thành:** ${completed.length} nhiệm vụ (Đạt tỷ lệ **${rate}%**)
- **Đang triển khai đúng hạn:** ${inProgress.length} nhiệm vụ
- **Chưa triển khai:** ${pending.length} nhiệm vụ
${overdue.length > 0 ? `- ⚠️ **Công việc cần đôn đốc thêm:** ${overdue.length} việc có hạn chót gấp.` : '- ✅ **Không có công việc nào bị quá hạn.**'}

#### 2. Kết quả trọng tâm nổi bật trong tuần:
${completed.length > 0
  ? completed.slice(0, 5).map((t: any) => `• ✅ **${t.title}** (Phụ trách: ${employees.find((e: any) => e.id === t.employeeId)?.name || t.employeeId})${t.resultNote ? ` - Kết quả: ${t.resultNote}` : ''}`).join('\n')
  : '• Các đầu việc lớn đang trong giai đoạn hoàn tất các bước cuối cùng.'}

#### 3. Kế hoạch và phương hướng tuần tới:
1. Hoàn tất đối soát 100% chi phí tiền ăn ngoài chu kỳ của đội ngũ tuyển dụng.
2. Đẩy mạnh tiếp cận nguồn ứng viên phụ bếp cho các dự án bếp ăn công nghiệp trọng điểm.
3. Rà soát và cập nhật hồ sơ đánh giá mục tiêu MBO chu kỳ 6 tháng.

Kính trình Ban Giám Đốc xem xét và cho ý kiến chỉ đạo.  
Trân trọng cảm ơn!`;
      }

      // Default comprehensive weekly report
      let rep = `## 📊 BÁO CÁO TỔNG HỢP CÔNG VIỆC TUẦN - WELSTORY HR
**Thời gian áp dụng:** ${weekInfo.label}  
**Đơn vị:** Bộ phận Nhân sự & Tuyển dụng (HR Welstory Việt Nam)  
**Ngày trích xuất:** ${new Date().toLocaleDateString('vi-VN')}  

---

### 1. 📈 TỔNG QUAN TIẾN ĐỘ TOÀN BỘ PHẬN
| Chỉ số theo dõi | Số lượng | Tỷ lệ (%) | Đánh giá |
| :--- | :---: | :---: | :--- |
| **Tổng số nhiệm vụ** | **${total}** | 100% | Khối lượng công việc tuần |
| 🟢 **Đã hoàn thành** | **${completed.length}** | **${rate}%** | ${rate >= 70 ? 'Đạt tiến độ xuất sắc' : 'Đang duy trì tiến độ'} |
| 🔵 **Đang triển khai** | **${inProgress.length}** | ${total > 0 ? Math.round((inProgress.length / total) * 100) : 0}% | Đúng lộ trình |
| 🟡 **Chưa triển khai** | **${pending.length}** | ${total > 0 ? Math.round((pending.length / total) * 100) : 0}% | Cần bắt đầu sớm |
| ⚠️ **Quá hạn / Cần đôn đốc** | **${overdue.length}** | ${total > 0 ? Math.round((overdue.length / total) * 100) : 0}% | ${overdue.length > 0 ? 'Cần xử lý ngay' : 'Không có'} |

---

### 2. 👥 HIỆU SUẤT VÀ PHÂN CÔNG THEO TỪNG NHÂN SỰ
${employees.map((emp: any) => {
  const empTasks = tasks.filter((t: any) => t.employeeId === emp.id);
  const empDone = empTasks.filter((t: any) => t.status === 'completed');
  const empProg = empTasks.filter((t: any) => t.status === 'in-progress');
  const empPend = empTasks.filter((t: any) => t.status === 'pending');
  const empRate = empTasks.length > 0 ? Math.round((empDone.length / empTasks.length) * 100) : 100;
  return `#### • **${emp.name}** (${emp.id} - ${emp.department || 'HR Group'})
- Tổng việc: **${empTasks.length}** | Hoàn thành: **${empDone.length}** | Đang làm: **${empProg.length}** | Chưa làm: **${empPend.length}** (Đạt **${empRate}%**)
${empTasks.length > 0 ? empTasks.slice(0, 3).map((t: any) => `  - [${t.status === 'completed' ? '🟢 Đã xong' : t.status === 'in-progress' ? '🔵 Đang làm ' + (t.progress || 0) + '%' : '🟡 Chưa làm'}] ${t.title} (Hạn: ${t.dueDate || 'Chưa định'})`).join('\n') : '  - *Chưa có đầu việc phân công trong tuần này.*'}`;
}).join('\n\n')}

---

### 3. ⚠️ CÁC CÔNG VIỆC CẦN CHÚ Ý & RỦI RO
${overdue.length > 0
  ? overdue.map((t: any) => `- 🔴 **${t.title}** (Phụ trách: ${employees.find((e: any) => e.id === t.employeeId)?.name || t.employeeId}) - Hạn chót: **${t.dueDate}** - Đang đạt ${t.progress || 0}%`).join('\n')
  : '- ✅ **Toàn bộ công việc trong tuần đều diễn ra đúng tiến độ, không có nhiệm vụ quá hạn nghiêm trọng.**'}

---

### 4. 🎯 TIẾN ĐỘ MỤC TIÊU TRỌNG TÂM MBO
${mbos.length > 0
  ? mbos.map((m: any) => `- 🎯 **${m.title}** (Trọng số ${m.weight}%): Tỷ lệ hoàn thành **${m.completionRate || 0}%** - Trạng thái: ${m.status === 'completed' ? 'Hoàn thành' : 'Đang triển khai'}`).join('\n')
  : '- Đang bám sát mục tiêu tuyển dụng nhân sự các dự án trọng điểm.'}

---

### 5. 🚀 KẾ HOẠCH HÀNH ĐỘNG TUẦN TIẾP THEO
1. **Kiểm tra và quyết toán tiền ăn:** Khóa sổ chu kỳ 26/09 - 25/10 cho tất cả chuyên viên tuyển dụng.
2. **Tăng cường phỏng vấn tuyển dụng:** Bổ sung nhân lực phụ bếp cho bếp ăn công nghiệp đối tác.
3. **Đôn đốc các nhiệm vụ dở dang:** Tập trung dứt điểm ${inProgress.length} công việc đang triển khai để nâng tỷ lệ hoàn thành lên trên 85%.`;

      return rep;
    };

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        success: true,
        reply: generateLocalReport(),
      });
    }
    const selectedEmployeeId = context?.selectedEmployeeId;
    const currentUser = context?.currentUser;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: any) => t.status === 'completed');
    const inProgressTasks = tasks.filter((t: any) => t.status === 'in-progress');
    const pendingTasks = tasks.filter((t: any) => t.status === 'pending');

    const todayStr = '2026-10-09';
    const overdueTasks = tasks.filter(
      (t: any) => t.status !== 'completed' && t.dueDate && t.dueDate < todayStr
    );
    const urgentTasks = tasks.filter(
      (t: any) =>
        (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'completed'
    );

    // Group tasks by employee
    const employeeTaskBreakdown = employees.map((emp: any) => {
      const empTasks = tasks.filter((t: any) => t.employeeId === emp.id);
      const empDone = empTasks.filter((t: any) => t.status === 'completed');
      const empInProg = empTasks.filter((t: any) => t.status === 'in-progress');
      const empPending = empTasks.filter((t: any) => t.status === 'pending');
      const empOverdue = empTasks.filter(
        (t: any) => t.status !== 'completed' && t.dueDate && t.dueDate < todayStr
      );

      return {
        id: emp.id,
        name: emp.name,
        department: emp.department,
        total: empTasks.length,
        completed: empDone.length,
        inProgress: empInProg.length,
        pending: empPending.length,
        overdue: empOverdue.length,
        tasks: empTasks.map((t: any) => ({
          title: t.title,
          description: t.description || '',
          status: t.status,
          dueDate: t.dueDate,
          priority: t.priority || 'medium',
          progress: t.progress || 0,
          resultNote: t.resultNote || '',
        })),
      };
    });

    const systemInstruction = `
Bạn là Trợ lý AI Báo Cáo Nhân Sự cấp cao (Senior HR AI Analyst & Weekly Report Specialist) của Bộ phận HR / Welstory Việt Nam.
Người dùng đang trò chuyện: ${currentUser ? `${currentUser.name} (Vai trò: ${currentUser.role || 'HR'})` : 'Quản lý Bộ phận HR'}.
Ngày hiện tại: ${todayStr}.
Tuần làm việc: ${weekInfo.label} (Từ ${weekInfo.start} đến ${weekInfo.end}).
${selectedEmployeeId ? `Người dùng đang lọc báo cáo riêng cho nhân viên có Mã NV: ${selectedEmployeeId}` : 'Phạm vi phân tích: Toàn bộ nhân sự Bộ phận HR Welstory'}.

DỮ LIỆU CÔNG VIỆC THỰC TẾ TRONG HỆ THỐNG:
1. Thống kê Tasks:
- Tổng số Task: ${totalTasks}
- Hoàn thành: ${completedTasks.length} (${totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0}%)
- Đang thực hiện: ${inProgressTasks.length}
- Chờ thực hiện: ${pendingTasks.length}
- Task quá hạn: ${overdueTasks.length} (${overdueTasks.map((t: any) => `"${t.title}" (Hạn: ${t.dueDate})`).join(', ') || 'Không có'})
- Task khẩn cấp/cao đang mở: ${urgentTasks.length}

2. Chi tiết theo từng nhân viên:
${JSON.stringify(employeeTaskBreakdown, null, 2)}

3. Mục tiêu trọng tâm MBO:
${JSON.stringify(
  mbos.map((m: any) => ({
    title: m.title,
    employeeId: m.employeeId,
    completionRate: m.completionRate,
    status: m.status,
    weight: m.weight,
    criteria: m.criteria,
    result: m.result,
  })),
  null,
  2
)}

4. Ghi chú công việc gần đây:
${JSON.stringify(
  notes.slice(0, 10).map((n: any) => ({
    title: n.title,
    category: n.category,
    content: n.content,
    employeeId: n.employeeId,
    date: n.date,
  })),
  null,
  2
)}

QUY TẮC PHẢN HỒI:
- Luôn trả lời bằng TIẾNG VIỆT chuẩn xác, giọng văn chuyên nghiệp, súc tích, định hướng giải pháp và sẵn sàng cho báo cáo gửi Ban Giám Đốc / Trưởng bộ phận.
- Khi người dùng yêu cầu "Tổng hợp báo cáo tuần" hoặc hỏi về báo cáo công việc, hãy cấu trúc bài báo cáo rõ ràng:
  1. 📋 **TIÊU ĐỀ BÁO CÁO & THỜI GIAN**: "BÁO CÁO CÔNG VIỆC TUẦN [KHOẢNG THỜI GIAN] - BỘ PHẬN HR WELSTORY"
  2. 📊 **TỔNG QUAN HIỆU SUẤT (EXECUTIVE SUMMARY)**:
     - Tỷ lệ hoàn thành %, số lượng công việc (Done / In-progress / Pending / Overdue).
     - Nhận xét cô đọng về tiến độ chung.
  3. 👥 **KẾT QUẢ THEO TỪNG NHÂN SỰ & MẢNG VIỆC**:
     - Chi tiết từng nhân sự đã làm được gì, tỷ lệ tiến độ và điểm nổi bật.
  4. ⚠️ **CÁC VẤN ĐỀ TỒN ĐỌNG, RỦI RO & QUÁ HẠN**:
     - Chỉ rõ các task bị trễ hạn hoặc cần hỗ trợ đôn đốc khẩn cấp.
  5. 🎯 **TIẾN ĐỘ MỤC TIÊU TRỌNG TÂM MBO**:
     - Tình hình thực hiện các chỉ tiêu tuyển dụng / quản lý nhân sự.
  6. 🚀 **KẾ HOẠCH & HÀNH ĐỘNG TRỌNG TÂM TUẦN TỚI**:
     - Danh sách 3-5 đầu việc ưu tiên hàng đầu.
- Trình bày trực quan với Markdown: sử dụng bullet points, in đậm số liệu, bảng biểu tóm tắt, icon trực quan (✅, ⏳, ⚠️, 🎯, 📊, 🚀).
- Hỗ trợ đa dạng yêu cầu tiếp theo trong hội thoại: soạn email gửi lãnh đạo, trích xuất việc của 1 người cụ thể, đôn đốc task khẩn cấp, phân tích nguyên nhân chậm trễ,...
`;

    // Map conversation history to Gemini contents array
    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(m.content || m.text || '') }],
    }));

    // Resilient call: try primary gemini-3.8-flash, with fallback to gemini-flash-latest on transient 503/high demand
    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest'];
    let reply = '';
    let lastErr: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature: 0.3,
          },
        });
        if (response && response.text) {
          reply = response.text;
          break;
        }
      } catch (err: any) {
        lastErr = err;
        console.warn(`Model ${modelName} encountered error, trying fallback...`, err?.message);
      }
    }

    if (!reply) {
      throw lastErr || new Error('Không nhận được nội dung phản hồi từ mô hình AI.');
    }

    return res.json({
      success: true,
      reply,
    });
  } catch (err: any) {
    console.error('Error in /api/ai/weekly-report-chat, falling back to local synthesizer:', err);
    try {
      const fallbackReply = generateLocalReport();
      return res.json({
        success: true,
        reply: fallbackReply,
      });
    } catch {
      return res.status(500).json({
        error:
          err?.message ||
          'Đã có lỗi khi kết nối tới mô hình AI. Vui lòng thử lại sau giây lát.',
      });
    }
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(distPath) && fs.existsSync(path.resolve(distPath, 'index.html'));

  if (isProduction || (hasDist && process.env.VITE_DEV !== 'true')) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
