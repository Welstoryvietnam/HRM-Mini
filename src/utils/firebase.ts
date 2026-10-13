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
import firebaseConfig from '../../firebase-applet-config.json';
import { EmployeeMealData, Employee, AppSettings, PasswordResetRequest, AppNotification, Task, WorkNote } from '../types';
import { saveMasterMealDataToCloud, fetchMasterCloudData } from './cloudSync';

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore targeting the provisioned database ID
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId || '(default)'
);

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
