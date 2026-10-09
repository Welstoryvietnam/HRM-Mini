import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'store.json');

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

interface StoreData {
  employees: any[];
  mealData: Record<string, any>;
  settings: any;
  passwordRequests: any[];
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
