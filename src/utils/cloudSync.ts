import { EmployeeMealData, Employee, AppSettings, PasswordResetRequest, AppNotification, Task, WorkNote } from '../types';

export const MASTER_CLOUD_ID = 'ff808181a09d98f701a0ffbadd936765';
const REST_API_URL = `https://api.restful-api.dev/objects/${MASTER_CLOUD_ID}`;
const LIVE_CHANNEL = 'https://ntfy.sh/welstory_hr_group_sync_channel_2026_vn';

// Broadcast an event to all connected devices in real time (< 500ms)
export async function broadcastLiveEvent(event: any) {
  try {
    const payload = JSON.stringify({
      ...event,
      _senderTime: Date.now(),
    });

    await fetch(LIVE_CHANNEL, {
      method: 'POST',
      body: payload,
      headers: {
        'Title': 'Welstory Sync',
        'Priority': 'urgent',
      },
    });
  } catch (err) {
    console.warn('Live broadcast error:', err);
  }
}

// Subscribe to real-time events from all devices
export function subscribeToLiveEvents(onEvent: (event: any) => void): () => void {
  let eventSource: EventSource | null = null;

  try {
    eventSource = new EventSource(`${LIVE_CHANNEL}/sse`);

    eventSource.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed && parsed.message) {
          try {
            const inner = JSON.parse(parsed.message);
            onEvent(inner);
          } catch {
            // ignore non-json
          }
        }
      } catch (err) {
        console.warn('Error parsing SSE live message', err);
      }
    };

    eventSource.onerror = () => {
      // Reconnection handled automatically
    };
  } catch (err) {
    console.warn('EventSource not supported or blocked:', err);
  }

  return () => {
    if (eventSource) {
      eventSource.close();
    }
  };
}

let cachedCloudData: any = {};

// Fetch the single unified master cloud database (1 fast GET request)
export async function fetchMasterCloudData(): Promise<{
  mealData?: Record<string, EmployeeMealData>;
  employees?: Employee[];
  settings?: AppSettings;
  passwordRequests?: PasswordResetRequest[];
  notifications?: AppNotification[];
  tasks?: Task[];
  notes?: WorkNote[];
  updatedAt?: number;
} | null> {
  try {
    const res = await fetch(REST_API_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const item = await res.json();
    if (item?.data) {
      cachedCloudData = { ...cachedCloudData, ...item.data };
      return item.data;
    }
    return null;
  } catch (err) {
    console.warn('Error fetching master cloud data:', err);
    return null;
  }
}

// Save the entire meal database directly to the master cloud object
export async function saveMasterMealDataToCloud(
  mealData: Record<string, EmployeeMealData>,
  extraData?: {
    employees?: Employee[];
    settings?: AppSettings;
    passwordRequests?: PasswordResetRequest[];
    notifications?: AppNotification[];
    tasks?: Task[];
    notes?: WorkNote[];
  }
) {
  try {
    cachedCloudData = {
      ...cachedCloudData,
      mealData: mealData || cachedCloudData.mealData || {},
      ...(extraData?.employees ? { employees: extraData.employees } : {}),
      ...(extraData?.settings ? { settings: extraData.settings } : {}),
      ...(extraData?.passwordRequests ? { passwordRequests: extraData.passwordRequests } : {}),
      ...(extraData?.notifications ? { notifications: extraData.notifications } : {}),
      ...(extraData?.tasks ? { tasks: extraData.tasks } : {}),
      ...(extraData?.notes ? { notes: extraData.notes } : {}),
      updatedAt: Date.now(),
    };

    await fetch(REST_API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'welstory_master_cloud_v2',
        data: cachedCloudData,
      }),
    });
  } catch (err) {
    console.warn('Error saving master meal data to cloud:', err);
  }
}
