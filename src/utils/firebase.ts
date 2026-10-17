import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDocFromServer,
  collection,
  onSnapshot,
  getDocs,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { EmployeeMealData, Employee, AppSettings, PasswordResetRequest, AppNotification, Task, WorkNote } from '../types';
import { saveMasterMealDataToCloud, fetchMasterCloudData } from './cloudSync';

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore targeting the provisioned database ID
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId || '(default)'
);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// Validate connection on startup as mandated by Firebase skill
export async function validateFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Firestore connection verified successfully.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore client is offline, check network connection.');
    }
  }
}

// Test connection immediately
validateFirestoreConnection();

/**
 * Delete ALL meal records from Firestore and the external cloud store.
 */
export async function deleteAllMealRecords() {
  try {
    // 1. Delete from Firestore
    const mealsCol = collection(db, 'meal_records');
    const snapshot = await getDocs(mealsCol);
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();

    // 2. Clear external cloud store while preserving employees/settings
    const currentCloudData = await fetchMasterCloudData();
    await saveMasterMealDataToCloud(
      {}, // Empty mealData
      {
        employees: currentCloudData?.employees,
        settings: currentCloudData?.settings,
        passwordRequests: currentCloudData?.passwordRequests,
      }
    );

    return true;
  } catch (err) {
    console.error('Error deleting all meal records:', err);
    return false;
  }
}

/**
 * Real-time subscription to all employee meal records.
 * Whenever ANY device writes or updates meal data, this callback is fired immediately (< 200ms).
 */
export function subscribeToMealsRealtime(
  callback: (mealData: Record<string, EmployeeMealData>) => void
): () => void {
  try {
    const mealsCol = collection(db, 'meal_records');
    const unsubscribe = onSnapshot(
      mealsCol,
      (snapshot) => {
        const result: Record<string, EmployeeMealData> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.employeeId && data.records) {
            result[data.employeeId] = {
              employeeId: data.employeeId,
              records: data.records,
            };
          }
        });
        callback(result);
      },
      (error) => {
        console.warn('Firestore onSnapshot meal_records warning:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Error setting up meals realtime listener:', err);
    return () => {};
  }
}

/**
 * Save an employee's meal records to Firestore with real-time replication.
 */
export async function saveMealRecordToFirestore(
  employeeId: string,
  records: Record<string, any>
) {
  try {
    const mealDocRef = doc(db, 'meal_records', employeeId);
    // Note: Do NOT use { merge: true } here!
    // Overwriting the document ensures that when a date is deleted from records,
    // it is also completely and permanently removed from Firestore.
    await setDoc(
      mealDocRef,
      {
        employeeId,
        records: records || {},
        updatedAt: Date.now(),
      }
    );
    return true;
  } catch (err) {
    console.warn(`Notice saving meal record to Firestore for employee ${employeeId}:`, err);
    return false;
  }
}

/**
 * Fetch all meal records from Firestore once (e.g. for manual refresh).
 */
export async function fetchAllMealsFromFirestore(): Promise<Record<string, EmployeeMealData>> {
  try {
    const mealsCol = collection(db, 'meal_records');
    const snapshot = await getDocs(mealsCol);
    const result: Record<string, EmployeeMealData> = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.employeeId && data.records) {
        result[data.employeeId] = {
          employeeId: data.employeeId,
          records: data.records,
        };
      }
    });
    return result;
  } catch (err) {
    console.warn('Firestore fetch meals notice:', err);
    return {};
  }
}

/**
 * Real-time subscription to global system configuration (employees, settings, password requests, tasks, notes).
 */
export function subscribeToSystemRealtime(
  callback: (config: {
    employees?: Employee[];
    settings?: AppSettings;
    passwordRequests?: PasswordResetRequest[];
    notifications?: AppNotification[];
    tasks?: Task[];
    notes?: WorkNote[];
  }) => void
): () => void {
  try {
    const sysDocRef = doc(db, 'system', 'main');
    const unsubscribe = onSnapshot(
      sysDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          callback({
            employees: data?.employees,
            settings: data?.settings,
            passwordRequests: data?.passwordRequests,
            notifications: data?.notifications,
            tasks: data?.tasks,
            notes: data?.notes,
          });
        }
      },
      (error) => {
        console.warn('Firestore onSnapshot system warning:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Error setting up system realtime listener:', err);
    return () => {};
  }
}

/**
 * Save system configuration to Firestore.
 */
export async function saveSystemConfigToFirestore(payload: {
  employees?: Employee[];
  settings?: AppSettings;
  passwordRequests?: PasswordResetRequest[];
  notifications?: AppNotification[];
  tasks?: Task[];
  notes?: WorkNote[];
}) {
  try {
    const sysDocRef = doc(db, 'system', 'main');
    await setDoc(
      sysDocRef,
      {
        ...payload,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error('Error saving system config to Firestore:', err);
    return false;
  }
}

/**
 * Real-time subscription to dedicated tasks collection.
 * Whenever ANY device creates, updates, changes status, or deletes a task,
 * this listener fires immediately across all devices (< 100ms).
 */
export function subscribeToTasksRealtime(
  callback: (tasks: Task[]) => void
): () => void {
  try {
    const tasksCol = collection(db, 'tasks');
    const unsubscribe = onSnapshot(
      tasksCol,
      (snapshot) => {
        const result: Task[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && (data.title || data.employeeId)) {
            result.push({
              id: docSnap.id,
              employeeId: data.employeeId || '',
              title: data.title || '',
              description: data.description || '',
              dueDate: data.dueDate || '',
              status: data.status || 'pending',
              assignedBy: data.assignedBy || 'admin',
              priority: data.priority || 'medium',
              progress: typeof data.progress === 'number' ? data.progress : (data.status === 'completed' ? 100 : 0),
              completedAt: data.completedAt || undefined,
              resultNote: data.resultNote || undefined,
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
              googleCalendarEventId: data.googleCalendarEventId || undefined,
              googleCalendarLink: data.googleCalendarLink || undefined,
            });
          }
        });

        // Sort tasks: newest or by dueDate descending
        result.sort((a, b) => {
          const dateA = a.dueDate || a.createdAt || '';
          const dateB = b.dueDate || b.createdAt || '';
          return dateB.localeCompare(dateA);
        });

        callback(result);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'tasks');
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Error setting up tasks realtime listener:', err);
    return () => {};
  }
}

/**
 * Save or update a single task in Firestore in real-time.
 */
export async function saveTaskToFirestore(task: Task): Promise<boolean> {
  try {
    const taskDocRef = doc(db, 'tasks', task.id);
    const payload = {
      ...task,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(taskDocRef, payload, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `tasks/${task.id}`);
    return false;
  }
}

/**
 * Delete a single task from Firestore in real-time.
 */
export async function deleteTaskFromFirestore(taskId: string): Promise<boolean> {
  try {
    const taskDocRef = doc(db, 'tasks', taskId);
    await deleteDoc(taskDocRef);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `tasks/${taskId}`);
    return false;
  }
}

/**
 * Batch save all tasks to Firestore (used for initial sync/migration or full restore).
 */
export async function saveAllTasksToFirestore(tasks: Task[]): Promise<boolean> {
  try {
    if (!tasks || tasks.length === 0) return true;
    const batch = writeBatch(db);
    tasks.forEach((task) => {
      const taskDocRef = doc(db, 'tasks', task.id);
      batch.set(
        taskDocRef,
        {
          ...task,
          updatedAt: task.updatedAt || new Date().toISOString(),
        },
        { merge: true }
      );
    });
    await batch.commit();

    // Also update system/main backup
    await saveSystemConfigToFirestore({ tasks });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'tasks');
    return false;
  }
}

/**
 * Fetch all tasks from Firestore once.
 */
export async function fetchAllTasksFromFirestore(): Promise<Task[]> {
  try {
    const tasksCol = collection(db, 'tasks');
    const snapshot = await getDocs(tasksCol);
    const result: Task[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && (data.title || data.employeeId)) {
        result.push({
          id: docSnap.id,
          employeeId: data.employeeId || '',
          title: data.title || '',
          description: data.description || '',
          dueDate: data.dueDate || '',
          status: data.status || 'pending',
          assignedBy: data.assignedBy || 'admin',
          priority: data.priority || 'medium',
          progress: typeof data.progress === 'number' ? data.progress : (data.status === 'completed' ? 100 : 0),
          completedAt: data.completedAt || undefined,
          resultNote: data.resultNote || undefined,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          googleCalendarEventId: data.googleCalendarEventId || undefined,
          googleCalendarLink: data.googleCalendarLink || undefined,
        });
      }
    });
    return result;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'tasks');
    return [];
  }
}
