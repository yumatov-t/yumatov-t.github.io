import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Goal,
  Habit,
  JournalEntry,
  Language,
  Task,
  ThemeMode,
} from '../types/discipline';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let connectionTested = false;
export async function testFirestoreConnection(): Promise<void> {
  if (connectionTested) return;
  connectionTested = true;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

export function sanitizeId(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return cleaned || 'item_default';
}

export async function syncUserProfileToCloud(params: {
  uid: string;
  displayName: string;
  email: string;
  theme: ThemeMode;
  language: Language;
}): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== params.uid) return;
  const safeUid = sanitizeId(params.uid);
  const path = `users/${safeUid}`;
  const userRef = doc(db, 'users', safeUid);

  const cleanDisplayName = params.displayName.trim().slice(0, 100) || 'User';
  const cleanEmail = (params.email || 'user@discipline.app').trim().slice(0, 254);
  const cleanTheme = params.theme === 'light' ? 'light' : 'dark';
  const cleanLanguage = params.language === 'en' ? 'en' : 'ru';

  try {
    const existingSnap = await getDoc(userRef);
    if (existingSnap.exists()) {
      await updateDoc(userRef, {
        displayName: cleanDisplayName,
        email: cleanEmail,
        theme: cleanTheme,
        language: cleanLanguage,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(userRef, {
        uid: safeUid,
        displayName: cleanDisplayName,
        email: cleanEmail,
        theme: cleanTheme,
        language: cleanLanguage,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncHabitToCloud(uid: string, habit: Habit): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const safeUid = sanitizeId(uid);
  const safeId = sanitizeId(habit.id);
  const path = `users/${safeUid}/habits/${safeId}`;
  const itemRef = doc(db, 'users', safeUid, 'habits', safeId);

  const payload = {
    title: habit.title.trim().slice(0, 140) || 'Habit',
    description: (habit.description || '').trim().slice(0, 500),
    category: habit.category,
    frequency: habit.frequency,
    targetPerWeek: Math.min(7, Math.max(1, Math.round(habit.targetPerWeek))),
    status: habit.status,
    updatedAt: serverTimestamp(),
  };

  try {
    const snap = await getDoc(itemRef);
    if (snap.exists()) {
      await updateDoc(itemRef, payload);
    } else {
      await setDoc(itemRef, {
        uid: safeUid,
        ...payload,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncTaskToCloud(uid: string, task: Task): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const safeUid = sanitizeId(uid);
  const safeId = sanitizeId(task.id);
  const path = `users/${safeUid}/tasks/${safeId}`;
  const itemRef = doc(db, 'users', safeUid, 'tasks', safeId);

  const payload = {
    title: task.title.trim().slice(0, 200) || 'Task',
    notes: (task.notes || '').trim().slice(0, 1000),
    priority: task.priority,
    category: task.category,
    dueDate: task.dueDate.slice(0, 10),
    completed: Boolean(task.completed),
    goalId: sanitizeId(task.goalId || 'none'),
    updatedAt: serverTimestamp(),
  };

  try {
    const snap = await getDoc(itemRef);
    if (snap.exists()) {
      await updateDoc(itemRef, payload);
    } else {
      await setDoc(itemRef, {
        uid: safeUid,
        ...payload,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncGoalToCloud(uid: string, goal: Goal): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const safeUid = sanitizeId(uid);
  const safeId = sanitizeId(goal.id);
  const path = `users/${safeUid}/goals/${safeId}`;
  const itemRef = doc(db, 'users', safeUid, 'goals', safeId);

  const payload = {
    title: goal.title.trim().slice(0, 160) || 'Goal',
    outcome: (goal.outcome || 'Outcome').trim().slice(0, 800),
    targetDate: goal.targetDate.slice(0, 10),
    status: goal.status,
    progress: Math.min(100, Math.max(0, Math.round(goal.progress))),
    updatedAt: serverTimestamp(),
  };

  try {
    const snap = await getDoc(itemRef);
    if (snap.exists()) {
      await updateDoc(itemRef, payload);
    } else {
      await setDoc(itemRef, {
        uid: safeUid,
        ...payload,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncJournalToCloud(
  uid: string,
  entry: JournalEntry
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const safeUid = sanitizeId(uid);
  const safeId = sanitizeId(entry.id);
  const path = `users/${safeUid}/journal/${safeId}`;
  const itemRef = doc(db, 'users', safeUid, 'journal', safeId);

  const payload = {
    date: entry.date.slice(0, 10),
    wentWell: entry.wentWell.trim().slice(0, 1500) || '-',
    didNotWork: (entry.didNotWork || '').trim().slice(0, 1500),
    why: (entry.why || '').trim().slice(0, 1500),
    improveTomorrow: (entry.improveTomorrow || '').trim().slice(0, 1500),
    mood: entry.mood,
    updatedAt: serverTimestamp(),
  };

  try {
    const snap = await getDoc(itemRef);
    if (snap.exists()) {
      await updateDoc(itemRef, payload);
    } else {
      await setDoc(itemRef, {
        uid: safeUid,
        ...payload,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCloudDocument(
  uid: string,
  collectionName: 'habits' | 'tasks' | 'goals' | 'journal',
  itemId: string
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const safeUid = sanitizeId(uid);
  const safeId = sanitizeId(itemId);
  const path = `users/${safeUid}/${collectionName}/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', safeUid, collectionName, safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export { onAuthStateChanged, signInWithPopup, signOut };
export type { User };
