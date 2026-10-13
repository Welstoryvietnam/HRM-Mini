import { Employee, EmployeeMealData, AppSettings, PasswordResetRequest, MealSession, Task, WorkNote } from '../types';

export interface ServerDataResponse {
  employees: Employee[];
  mealData: Record<string, EmployeeMealData>;
  settings: AppSettings;
  passwordRequests: PasswordResetRequest[];
  tasks?: Task[];
  notes?: WorkNote[];
  version: number;
}

export async function fetchServerData(): Promise<ServerDataResponse | null> {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Could not connect to central server, using local cache', err);
    return null;
  }
}

export async function saveMealOnServer(payload: {
  employeeId: string;
  dateStr: string;
  sessions?: MealSession[];
  mealsCount?: number;
  note?: string;
  location?: string;
  purpose?: string;
}) {
  try {
    await fetch('/api/meals/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Failed to sync meal to server', err);
  }
}

export async function batchCheckinOnServer(payload: {
  employeeId: string;
  dates: string[];
  mealsCount: number;
}) {
  try {
    await fetch('/api/meals/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Failed to sync batch check-in to server', err);
  }
}

export async function resetMealsOnServer() {
  try {
    await fetch('/api/meals/reset', { method: 'POST' });
  } catch (err) {
    console.error('Failed to reset meals on server', err);
  }
}

export async function replaceMealsOnServer(mealData: Record<string, EmployeeMealData>) {
  try {
    await fetch('/api/meals/replace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mealData }),
    });
  } catch (err) {
    console.error('Failed to replace mealData on server', err);
  }
}

export async function syncEmployeesOnServer(employees: Employee[]) {
  try {
    await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employees }),
    });
  } catch (err) {
    console.error('Failed to sync employees to server', err);
  }
}

export async function requestPasswordResetOnServer(payload: {
  employeeId: string;
  newPassword: string;
  reason?: string;
}) {
  try {
    const res = await fetch('/api/password-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error('Failed to request password reset on server', err);
    return null;
  }
}

export async function approvePasswordResetOnServer(payload: {
  requestId: string;
  reviewedBy: string;
}) {
  try {
    const res = await fetch('/api/password-requests/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error('Failed to approve password reset on server', err);
    return null;
  }
}

export async function rejectPasswordResetOnServer(payload: {
  requestId: string;
  reviewedBy: string;
}) {
  try {
    const res = await fetch('/api/password-requests/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error('Failed to reject password reset on server', err);
    return null;
  }
}

export async function saveSettingsOnServer(settings: AppSettings) {
  try {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
  } catch (err) {
    console.error('Failed to save settings on server', err);
  }
}
