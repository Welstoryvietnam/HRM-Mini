import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import { getApp, getApps, initializeApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';
import { Task } from '../types';

// Ensure Firebase App is initialized
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Provider with minimal Calendar scope
export const calendarProvider = new GoogleAuthProvider();
calendarProvider.addScope('https://www.googleapis.com/auth/calendar.events');
// Prompt user to select account if needed
calendarProvider.setCustomParameters({
  prompt: 'consent',
});

// In-memory token cache (Do NOT store in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;
let isSigningIn = false;

// Initialize listener
export const initCalendarAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    cachedUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // User logged in but token not yet in memory
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const getCalendarAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const getCalendarUser = (): User | null => {
  return cachedUser;
};

export const signInGoogleCalendar = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, calendarProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Không thể nhận được Access Token từ Google Authentication');
    }
    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Calendar Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const signOutGoogleCalendar = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedUser = null;
};

export interface CreateEventParams {
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // e.g. "09:00"
  endTime?: string; // e.g. "17:00"
  location?: string;
  attendees?: string[];
}

export interface GoogleCalendarEventResult {
  id: string;
  htmlLink: string;
  summary: string;
}

/**
 * Creates an event on the user's primary Google Calendar via Google Calendar API v3.
 */
export async function createGoogleCalendarEvent(
  params: CreateEventParams,
  token?: string
): Promise<GoogleCalendarEventResult> {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) {
    throw new Error('Chưa đăng nhập Google Calendar hoặc phiên làm việc đã hết hạn.');
  }

  // Construct start/end time
  let startObj: any = {};
  let endObj: any = {};

  if (params.startTime && params.endTime) {
    const startIso = `${params.date}T${params.startTime}:00+07:00`;
    const endIso = `${params.date}T${params.endTime}:00+07:00`;
    startObj = { dateTime: startIso, timeZone: 'Asia/Ho_Chi_Minh' };
    endObj = { dateTime: endIso, timeZone: 'Asia/Ho_Chi_Minh' };
  } else {
    // All-day event: Google requires end date to be exclusive for multi-day, or next day
    const nextDate = new Date(params.date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    startObj = { date: params.date };
    endObj = { date: nextDateStr };
  }

  const payload: any = {
    summary: `[Welstory] ${params.title}`,
    description: params.description,
    location: params.location || 'Công ty TNHH Welstory Việt Nam',
    start: startObj,
    end: endObj,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'popup', minutes: 1440 }, // 1 day before
      ],
    },
  };

  if (params.attendees && params.attendees.length > 0) {
    payload.attendees = params.attendees
      .filter((e) => e && e.includes('@'))
      .map((email) => ({ email }));
  }

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message ||
        `Lỗi tạo sự kiện trên Google Calendar (${response.status}: ${response.statusText})`
    );
  }

  const data = await response.json();
  return {
    id: data.id,
    htmlLink: data.htmlLink,
    summary: data.summary,
  };
}

/**
 * Generate a prefilled Google Calendar web URL as an instant fallback or manual link.
 */
export function getGoogleCalendarWebUrl(
  title: string,
  description: string,
  dateStr: string,
  startTime?: string,
  endTime?: string
): string {
  const cleanDate = dateStr.replace(/-/g, '');
  let datesParam = '';

  if (startTime && endTime) {
    const cleanStart = startTime.replace(/:/g, '') + '00';
    const cleanEnd = endTime.replace(/:/g, '') + '00';
    datesParam = `${cleanDate}T${cleanStart}/${cleanDate}T${cleanEnd}`;
  } else {
    // Next day for all day
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    const nextDate = d.toISOString().split('T')[0].replace(/-/g, '');
    datesParam = `${cleanDate}/${nextDate}`;
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `[Welstory] ${title}`,
    details: `${description}\n\n---\nHệ thống Quản lý Welstory Việt Nam`,
    location: 'Công ty TNHH Welstory Việt Nam',
    dates: datesParam,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
