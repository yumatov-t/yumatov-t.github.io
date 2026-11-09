import {
  Language,
  ThemeMode,
  UserAccount,
  WorkspaceState,
} from '../types/discipline';
import {
  createInitialWorkspaceState,
  formatIsoDate,
} from '../utils/disciplineEngine';

const ACCOUNTS_KEY = 'discipline_accounts_v1';
const ACTIVE_SESSION_KEY = 'discipline_active_session_v1';
const PREFS_KEY = 'discipline_prefs_v1';
const WORKSPACE_PREFIX = 'discipline_workspace_v4_clean_';

interface StoredAccountRecord {
  uid: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: string;
}

function simpleHash(raw: string): string {
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `h_${(hash >>> 0).toString(16)}`;
}

function readAccounts(): StoredAccountRecord[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredAccountRecord[]): void {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed to persist accounts:', err);
  }
}

export function loadUserPreferences(): { theme: ThemeMode; language: Language } {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        theme: parsed.theme === 'light' ? 'light' : 'dark',
        language: parsed.language === 'en' ? 'en' : 'ru',
      };
    }
  } catch {
    // fallback
  }
  return { theme: 'dark', language: 'ru' };
}

export function saveUserPreferences(prefs: {
  theme: ThemeMode;
  language: Language;
}): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.error('Failed to save preferences:', err);
  }
}

export function getActiveSessionUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserAccount;
  } catch {
    return null;
  }
}

export function setActiveSessionUser(user: UserAccount | null): void {
  try {
    if (!user) {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    } else {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(user));
    }
  } catch (err) {
    console.error('Failed to save session:', err);
  }
}

export function registerLocalUser(params: {
  email: string;
  password: string;
  displayName: string;
}): { user?: UserAccount; errorKey?: string } {
  const cleanEmail = params.email.trim().toLowerCase();
  const accounts = readAccounts();

  if (accounts.some((a) => a.email.toLowerCase() === cleanEmail)) {
    return { errorKey: 'errorAuthEmailExists' };
  }

  const uid = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const nowIso = new Date().toISOString();
  const record: StoredAccountRecord = {
    uid,
    email: cleanEmail,
    displayName: params.displayName.trim(),
    passwordHash: simpleHash(params.password),
    createdAt: nowIso,
  };

  accounts.push(record);
  writeAccounts(accounts);

  const user: UserAccount = {
    uid,
    email: cleanEmail,
    displayName: record.displayName,
    authProvider: 'local',
    emailVerified: true,
    createdAt: nowIso,
  };

  // Seed initial workspace for the new account
  const todayIso = formatIsoDate(new Date());
  const initialWs = createInitialWorkspaceState(uid, todayIso);
  saveWorkspaceForUser(uid, initialWs);
  setActiveSessionUser(user);

  return { user };
}

export function signInLocalUser(params: {
  email: string;
  password: string;
}): { user?: UserAccount; errorKey?: string } {
  const cleanEmail = params.email.trim().toLowerCase();
  const accounts = readAccounts();
  const found = accounts.find((a) => a.email.toLowerCase() === cleanEmail);

  if (!found || found.passwordHash !== simpleHash(params.password)) {
    return { errorKey: 'errorAuthInvalidCredentials' };
  }

  const user: UserAccount = {
    uid: found.uid,
    email: found.email,
    displayName: found.displayName,
    authProvider: 'local',
    emailVerified: true,
    createdAt: found.createdAt,
  };

  setActiveSessionUser(user);
  return { user };
}

export function resetLocalUserPassword(params: {
  email: string;
  newPassword: string;
}): { ok: boolean; errorKey?: string } {
  const cleanEmail = params.email.trim().toLowerCase();
  const accounts = readAccounts();
  const idx = accounts.findIndex((a) => a.email.toLowerCase() === cleanEmail);

  if (idx === -1) {
    return { ok: false, errorKey: 'errorAuthUserNotFound' };
  }

  accounts[idx] = {
    ...accounts[idx],
    passwordHash: simpleHash(params.newPassword),
  };
  writeAccounts(accounts);
  return { ok: true };
}

export function loadWorkspaceForUser(uid: string): WorkspaceState {
  const key = `${WORKSPACE_PREFIX}${uid}`;
  const todayIso = formatIsoDate(new Date());
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as WorkspaceState;
      if (
        parsed &&
        Array.isArray(parsed.habits) &&
        Array.isArray(parsed.tasks) &&
        Array.isArray(parsed.goals) &&
        Array.isArray(parsed.journal)
      ) {
        return {
          ...parsed,
          recoveryHistory: Array.isArray(parsed.recoveryHistory)
            ? parsed.recoveryHistory
            : [],
        };
      }
    }
  } catch (err) {
    console.error('Failed to read workspace:', err);
  }

  const seeded = createInitialWorkspaceState(uid, todayIso);
  saveWorkspaceForUser(uid, seeded);
  return seeded;
}

export function saveWorkspaceForUser(
  uid: string,
  workspace: WorkspaceState
): void {
  const key = `${WORKSPACE_PREFIX}${uid}`;
  try {
    localStorage.setItem(key, JSON.stringify(workspace));
  } catch (err) {
    console.error('Failed to save workspace:', err);
  }
}
