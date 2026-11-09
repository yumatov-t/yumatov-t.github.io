import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Goal,
  Habit,
  JournalEntry,
  Language,
  Task,
  ThemeMode,
  UserAccount,
  WorkspaceState,
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
    tenantId?: boolean | string | null;
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

export async function registerFirebaseAccount(params: {
  email: string;
  password: string;
  displayName: string;
  theme?: ThemeMode;
  language?: Language;
}): Promise<UserAccount> {
  const cleanEmail = params.email.trim();
  const cleanName = params.displayName.trim().slice(0, 100) || 'User';
  const cred = await createUserWithEmailAndPassword(
    auth,
    cleanEmail,
    params.password
  );
  await updateProfile(cred.user, { displayName: cleanName });

  await syncUserProfileToCloud({
    uid: cred.user.uid,
    displayName: cleanName,
    email: cred.user.email || cleanEmail,
    theme: params.theme || 'dark',
    language: params.language || 'ru',
  });

  return {
    uid: cred.user.uid,
    email: cred.user.email || cleanEmail,
    displayName: cleanName,
    authProvider: 'firebase',
    emailVerified: cred.user.emailVerified,
    createdAt: new Date().toISOString(),
  };
}

export async function signInFirebaseAccount(params: {
  email: string;
  password: string;
}): Promise<UserAccount> {
  const cleanEmail = params.email.trim();
  const cred = await signInWithEmailAndPassword(
    auth,
    cleanEmail,
    params.password
  );
  const fbUser = cred.user;
  return {
    uid: fbUser.uid,
    email: fbUser.email || cleanEmail,
    displayName:
      fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
    authProvider: 'firebase',
    emailVerified: fbUser.emailVerified,
    createdAt: new Date().toISOString(),
  };
}

export async function resetFirebaseAccountPassword(
  email: string
): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
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
  try {
    const existingSnap = await getDoc(userRef);
    const cleanName = params.displayName.trim().slice(0, 100) || 'User';
    const cleanEmail = (params.email || 'user@discipline.app')
      .trim()
      .slice(0, 254);
    const cleanTheme = params.theme === 'light' ? 'light' : 'dark';
    const cleanLang = params.language === 'en' ? 'en' : 'ru';

    if (existingSnap.exists()) {
      await updateDoc(userRef, {
        displayName: cleanName,
        email: cleanEmail,
        theme: cleanTheme,
        language: cleanLang,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(userRef, {
        uid: safeUid,
        displayName: cleanName,
        email: cleanEmail,
        theme: cleanTheme,
        language: cleanLang,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncHabitToCloud(
  uid: string,
  habit: Habit
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const safeUid = sanitizeId(uid);
  const safeId = sanitizeId(habit.id);
  const path = `users/${safeUid}/habits/${safeId}`;
  const ref = doc(db, 'users', safeUid, 'habits', safeId);
  try {
    const existingSnap = await getDoc(ref);
    const payload = {
      title: habit.title.trim().slice(0, 140) || 'Habit',
      description: (habit.description || '').trim().slice(0, 500),
      category: habit.category,
      frequency: habit.frequency,
      targetPerWeek: Math.min(7, Math.max(1, Math.round(habit.targetPerWeek))),
      status: habit.status,
      updatedAt: serverTimestamp(),
    };
    if (existingSnap.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, {
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
  const ref = doc(db, 'users', safeUid, 'tasks', safeId);
  try {
    const existingSnap = await getDoc(ref);
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
    if (existingSnap.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, {
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
  const ref = doc(db, 'users', safeUid, 'goals', safeId);
  try {
    const existingSnap = await getDoc(ref);
    const payload = {
      title: goal.title.trim().slice(0, 160) || 'Goal',
      outcome: (goal.outcome || 'Outcome').trim().slice(0, 800),
      targetDate: goal.targetDate.slice(0, 10),
      status: goal.status,
      progress: Math.min(100, Math.max(0, Math.round(goal.progress))),
      updatedAt: serverTimestamp(),
    };
    if (existingSnap.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, {
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
  const ref = doc(db, 'users', safeUid, 'journal', safeId);
  try {
    const existingSnap = await getDoc(ref);
    const payload = {
      date: entry.date.slice(0, 10),
      wentWell: entry.wentWell.trim().slice(0, 1500) || '-',
      didNotWork: (entry.didNotWork || '').trim().slice(0, 1500),
      why: (entry.why || '').trim().slice(0, 1500),
      improveTomorrow: (entry.improveTomorrow || '').trim().slice(0, 1500),
      mood: entry.mood,
      updatedAt: serverTimestamp(),
    };
    if (existingSnap.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, {
        uid: safeUid,
        ...payload,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadCloudWorkspaceForUser(
  uid: string,
  localFallback: WorkspaceState
): Promise<WorkspaceState> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return localFallback;
  const safeUid = sanitizeId(uid);
  const nowIso = new Date().toISOString();

  try {
    // Ensure parent user document exists first so subcollection reads pass hasValidParentUser(userId)
    const userRef = doc(db, 'users', safeUid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await syncUserProfileToCloud({
        uid: safeUid,
        displayName:
          auth.currentUser.displayName ||
          auth.currentUser.email?.split('@')[0] ||
          'User',
        email: auth.currentUser.email || 'user@discipline.app',
        theme: 'dark',
        language: 'ru',
      });
    }

    const [habitsSnap, tasksSnap, goalsSnap, journalSnap] = await Promise.all([
      getDocs(
        query(collection(db, 'users', safeUid, 'habits'), where('uid', '==', safeUid))
      ),
      getDocs(
        query(collection(db, 'users', safeUid, 'tasks'), where('uid', '==', safeUid))
      ),
      getDocs(
        query(collection(db, 'users', safeUid, 'goals'), where('uid', '==', safeUid))
      ),
      getDocs(
        query(collection(db, 'users', safeUid, 'journal'), where('uid', '==', safeUid))
      ),
    ]);

    const localHabitMap = new Map(localFallback.habits.map((h) => [h.id, h]));
    const localGoalMap = new Map(localFallback.goals.map((g) => [g.id, g]));

    const habits: Habit[] = habitsSnap.docs.map((d) => {
      const data = d.data();
      const localMatch = localHabitMap.get(d.id);
      return {
        id: d.id,
        uid: safeUid,
        title: String(data.title || 'Habit'),
        description: String(data.description || ''),
        minimumAction: localMatch?.minimumAction || String(data.description || ''),
        category: data.category || 'craft',
        frequency: data.frequency || 'daily',
        targetPerWeek: Number(data.targetPerWeek || 7),
        status: data.status || 'active',
        linkedGoalId: localMatch?.linkedGoalId,
        logs: localMatch?.logs || {},
        createdAt: localMatch?.createdAt || nowIso,
        updatedAt: nowIso,
      };
    });

    const tasks: Task[] = tasksSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        uid: safeUid,
        title: String(data.title || 'Task'),
        notes: String(data.notes || ''),
        priority: data.priority || 'medium',
        category: data.category || 'deep-work',
        dueDate: String(data.dueDate || nowIso.slice(0, 10)),
        completed: Boolean(data.completed),
        goalId: String(data.goalId || 'none'),
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    });

    const goals: Goal[] = goalsSnap.docs.map((d) => {
      const data = d.data();
      const localMatch = localGoalMap.get(d.id);
      return {
        id: d.id,
        uid: safeUid,
        title: String(data.title || 'Goal'),
        outcome: String(data.outcome || ''),
        targetDate: String(data.targetDate || nowIso.slice(0, 10)),
        status: data.status || 'in_progress',
        progress: Number(data.progress || 0),
        milestones: localMatch?.milestones || [],
        createdAt: localMatch?.createdAt || nowIso,
        updatedAt: nowIso,
      };
    });

    const journal: JournalEntry[] = journalSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        uid: safeUid,
        date: String(data.date || nowIso.slice(0, 10)),
        wentWell: String(data.wentWell || ''),
        didNotWork: String(data.didNotWork || ''),
        why: String(data.why || ''),
        improveTomorrow: String(data.improveTomorrow || ''),
        mood: data.mood || 'steady',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    });

    return {
      habits: habits.length > 0 ? habits : localFallback.habits,
      tasks: tasks.length > 0 ? tasks : localFallback.tasks,
      goals: goals.length > 0 ? goals : localFallback.goals,
      journal: journal.length > 0 ? journal : localFallback.journal,
      recoveryHistory: localFallback.recoveryHistory,
      minimumViableDayActiveDate: localFallback.minimumViableDayActiveDate,
    };
  } catch (err) {
    console.warn('Cloud workspace sync warning:', err);
    return localFallback;
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
