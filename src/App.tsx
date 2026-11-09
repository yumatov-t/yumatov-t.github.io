/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Menu, X } from 'lucide-react';
import {
  Goal,
  Habit,
  JournalEntry,
  Language,
  NavSection,
  Task,
  ThemeMode,
  UserAccount,
  WorkspaceState,
} from './types/discipline';
import { translations } from './i18n/translations';
import {
  analyzeWorkspaceRecovery,
  applyRecoveryProtocolToWorkspace,
  formatIsoDate,
  localizeWorkspaceSeedItems,
  recalculateGoalProgress,
} from './utils/disciplineEngine';
import {
  getActiveSessionUser,
  loadUserPreferences,
  loadWorkspaceForUser,
  saveUserPreferences,
  saveWorkspaceForUser,
  setActiveSessionUser,
} from './services/storageService';
import {
  auth,
  deleteCloudDocument,
  loadCloudWorkspaceForUser,
  onAuthStateChanged,
  signOut,
  syncGoalToCloud,
  syncHabitToCloud,
  syncJournalToCloud,
  syncTaskToCloud,
  syncUserProfileToCloud,
  testFirestoreConnection,
} from './services/firebaseClient';
import { LoadingScreen } from './components/LoadingScreen';
import { AuthModal } from './components/AuthModal';
import { RecoveryModal } from './components/RecoveryModal';
import { DashboardView } from './components/DashboardView';
import { HabitsView } from './components/HabitsView';
import { TasksView } from './components/TasksView';
import { GoalsView } from './components/GoalsView';
import { AnalyticsView } from './components/AnalyticsView';
import { JournalView } from './components/JournalView';

export default function App() {
  const todayIso = useMemo(() => formatIsoDate(new Date()), []);

  // Load initial preferences
  const initialPrefs = useMemo(() => loadUserPreferences(), []);
  const [theme, setTheme] = useState<ThemeMode>(initialPrefs.theme);
  const [language, setLanguage] = useState<Language>(initialPrefs.language);

  // Show swimmer surfacing loading screen on initial visit (skip only if ?autostart=1)
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') !== '1';
  });
  const [splashPinned, setSplashPinned] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('splash') === '1';
  });

  // Active User & Workspace State
  const [user, setUser] = useState<UserAccount | null>(() =>
    getActiveSessionUser()
  );
  const currentUid = user?.uid || 'local_default_author';
  const [workspace, setWorkspace] = useState<WorkspaceState>(() =>
    localizeWorkspaceSeedItems(
      loadWorkspaceForUser(currentUid),
      initialPrefs.language
    )
  );

  // Navigation & UI Modals
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<
    'login' | 'register' | 'reset'
  >('login');
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Skip-with-Reason Modal State
  const [skipModalState, setSkipModalState] = useState<{
    isOpen: boolean;
    habitId: string;
    dateIso: string;
    reason: string;
  }>({
    isOpen: false,
    habitId: '',
    dateIso: todayIso,
    reason: '',
  });

  const t = translations[language];

  // Sync theme class on <html> and <body>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveUserPreferences({ theme, language });
  }, [theme, language]);

  // Update document lang attribute
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Auto-dismiss splash after 2.2s unless pinned
  useEffect(() => {
    if (!showSplash || splashPinned) return;
    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [showSplash, splashPinned]);

  // Test Firestore connection on boot and listen to Firebase Auth state
  useEffect(() => {
    testFirestoreConnection();
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const fbAccount: UserAccount = {
          uid: fbUser.uid,
          email: fbUser.email || 'user@discipline.app',
          displayName:
            fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          authProvider: 'firebase',
          emailVerified: fbUser.emailVerified,
          createdAt: new Date().toISOString(),
        };
        setUser(fbAccount);
        setActiveSessionUser(fbAccount);
        const localFallback = loadWorkspaceForUser(fbAccount.uid);
        const cloudWs = await loadCloudWorkspaceForUser(
          fbAccount.uid,
          localFallback
        );
        setWorkspace(cloudWs);
        saveWorkspaceForUser(fbAccount.uid, cloudWs);
      }
    });
    return () => unsub();
  }, []);

  // Reload workspace whenever user changes
  useEffect(() => {
    const loaded = localizeWorkspaceSeedItems(
      loadWorkspaceForUser(currentUid),
      language
    );
    setWorkspace(loaded);
  }, [currentUid]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  const commitWorkspace = (next: WorkspaceState, feedback?: string) => {
    setWorkspace(next);
    saveWorkspaceForUser(currentUid, next);
    if (feedback) {
      triggerToast(feedback);
    }
  };

  // Recovery Diagnosis
  const diagnosis = useMemo(
    () => analyzeWorkspaceRecovery(workspace, todayIso),
    [workspace, todayIso]
  );

  // Handlers: Theme & Language
  const handleToggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (user?.authProvider === 'firebase') {
      syncUserProfileToCloud({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        theme: nextTheme,
        language,
      });
    }
  };

  const handleToggleLanguage = () => {
    const nextLang: Language = language === 'ru' ? 'en' : 'ru';
    setLanguage(nextLang);
    const localized = localizeWorkspaceSeedItems(workspace, nextLang);
    setWorkspace(localized);
    saveWorkspaceForUser(currentUid, localized);
    if (user?.authProvider === 'firebase') {
      syncUserProfileToCloud({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        theme,
        language: nextLang,
      });
    }
  };

  // Handlers: Auth
  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthInitialMode(mode);
    setAuthModalOpen(true);
  };

  const handleAuthenticated = async (authenticatedUser: UserAccount) => {
    setUser(authenticatedUser);
    setActiveSessionUser(authenticatedUser);
    const localWs = localizeWorkspaceSeedItems(
      loadWorkspaceForUser(authenticatedUser.uid),
      language
    );
    setWorkspace(localWs);
    if (authenticatedUser.authProvider === 'firebase') {
      const cloudWs = await loadCloudWorkspaceForUser(
        authenticatedUser.uid,
        localWs
      );
      setWorkspace(cloudWs);
      saveWorkspaceForUser(authenticatedUser.uid, cloudWs);
    }
    triggerToast(t.savedFeedback);
  };

  const handleSignOut = async () => {
    if (user?.authProvider === 'firebase') {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Sign out error:', err);
      }
    }
    setUser(null);
    setActiveSessionUser(null);
    const defaultWs = localizeWorkspaceSeedItems(
      loadWorkspaceForUser('local_default_author'),
      language
    );
    setWorkspace(defaultWs);
  };

  // Handlers: Habits
  const handleToggleHabitDate = (habitId: string, dateIso: string) => {
    const nowIso = new Date().toISOString();
    let updatedHabit: Habit | undefined;

    const nextHabits = workspace.habits.map((h) => {
      if (h.id !== habitId) return h;
      const existingLog = h.logs[dateIso];
      const nextLogs = { ...h.logs };

      if (existingLog?.state === 'completed') {
        delete nextLogs[dateIso];
      } else {
        nextLogs[dateIso] = {
          date: dateIso,
          state: 'completed',
          timestamp: nowIso,
        };
      }

      updatedHabit = {
        ...h,
        logs: nextLogs,
        updatedAt: nowIso,
      };
      return updatedHabit;
    });

    commitWorkspace({ ...workspace, habits: nextHabits }, t.savedFeedback);
    if (updatedHabit && user?.authProvider === 'firebase') {
      syncHabitToCloud(user.uid, updatedHabit);
    }
  };

  const handleOpenSkipModal = (habitId: string, dateIso: string) => {
    const habit = workspace.habits.find((h) => h.id === habitId);
    const existingReason = habit?.logs[dateIso]?.skipReason || '';
    setSkipModalState({
      isOpen: true,
      habitId,
      dateIso,
      reason: existingReason,
    });
  };

  const handleConfirmSkip = (e: React.FormEvent) => {
    e.preventDefault();
    const { habitId, dateIso, reason } = skipModalState;
    const nowIso = new Date().toISOString();
    const cleanReason = reason.trim() || t.skipReasonPreset3;

    const nextHabits = workspace.habits.map((h) => {
      if (h.id !== habitId) return h;
      return {
        ...h,
        logs: {
          ...h.logs,
          [dateIso]: {
            date: dateIso,
            state: 'skipped' as const,
            skipReason: cleanReason,
            timestamp: nowIso,
          },
        },
        updatedAt: nowIso,
      };
    });

    commitWorkspace({ ...workspace, habits: nextHabits }, t.savedFeedback);
    setSkipModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSaveHabit = (
    habitData: Omit<Habit, 'id' | 'uid' | 'logs' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    const nowIso = new Date().toISOString();
    let savedHabit: Habit | undefined;

    if (existingId) {
      const nextHabits = workspace.habits.map((h) => {
        if (h.id !== existingId) return h;
        savedHabit = {
          ...h,
          ...habitData,
          updatedAt: nowIso,
        };
        return savedHabit;
      });
      commitWorkspace({ ...workspace, habits: nextHabits }, t.savedFeedback);
    } else {
      savedHabit = {
        id: `habit_${Date.now()}`,
        uid: currentUid,
        ...habitData,
        logs: {},
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      commitWorkspace(
        { ...workspace, habits: [savedHabit, ...workspace.habits] },
        t.savedFeedback
      );
    }

    if (savedHabit && user?.authProvider === 'firebase') {
      syncHabitToCloud(user.uid, savedHabit);
    }
  };

  const handleDeleteHabit = (habitId: string) => {
    const nextHabits = workspace.habits.filter((h) => h.id !== habitId);
    commitWorkspace({ ...workspace, habits: nextHabits }, t.savedFeedback);
    if (user?.authProvider === 'firebase') {
      deleteCloudDocument(user.uid, 'habits', habitId);
    }
  };

  // Handlers: Tasks
  const handleSaveTask = (
    taskData: Omit<
      Task,
      'id' | 'uid' | 'completed' | 'completedAt' | 'createdAt' | 'updatedAt'
    >,
    existingId?: string
  ) => {
    const nowIso = new Date().toISOString();
    let savedTask: Task | undefined;
    let nextTasks: Task[];

    if (existingId) {
      nextTasks = workspace.tasks.map((tk) => {
        if (tk.id !== existingId) return tk;
        savedTask = {
          ...tk,
          ...taskData,
          updatedAt: nowIso,
        };
        return savedTask;
      });
    } else {
      savedTask = {
        id: `task_${Date.now()}`,
        uid: currentUid,
        ...taskData,
        completed: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      nextTasks = [savedTask, ...workspace.tasks];
    }

    // Recalculate linked goal progress if applicable
    const nextGoals = workspace.goals.map((g) => {
      const linked = nextTasks.filter((tk) => tk.goalId === g.id);
      return {
        ...g,
        progress: recalculateGoalProgress(g, linked),
      };
    });

    commitWorkspace(
      { ...workspace, tasks: nextTasks, goals: nextGoals },
      t.savedFeedback
    );
    if (savedTask && user?.authProvider === 'firebase') {
      syncTaskToCloud(user.uid, savedTask);
    }
  };

  const handleToggleTask = (taskId: string) => {
    const nowIso = new Date().toISOString();
    let toggledTask: Task | undefined;

    const nextTasks = workspace.tasks.map((tk) => {
      if (tk.id !== taskId) return tk;
      const nextCompleted = !tk.completed;
      toggledTask = {
        ...tk,
        completed: nextCompleted,
        completedAt: nextCompleted ? nowIso : undefined,
        updatedAt: nowIso,
      };
      return toggledTask;
    });

    const nextGoals = workspace.goals.map((g) => {
      const linked = nextTasks.filter((tk) => tk.goalId === g.id);
      return {
        ...g,
        progress: recalculateGoalProgress(g, linked),
      };
    });

    commitWorkspace(
      { ...workspace, tasks: nextTasks, goals: nextGoals },
      t.savedFeedback
    );
    if (toggledTask && user?.authProvider === 'firebase') {
      syncTaskToCloud(user.uid, toggledTask);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    const nextTasks = workspace.tasks.filter((tk) => tk.id !== taskId);
    const nextGoals = workspace.goals.map((g) => {
      const linked = nextTasks.filter((tk) => tk.goalId === g.id);
      return {
        ...g,
        progress: recalculateGoalProgress(g, linked),
      };
    });
    commitWorkspace(
      { ...workspace, tasks: nextTasks, goals: nextGoals },
      t.savedFeedback
    );
    if (user?.authProvider === 'firebase') {
      deleteCloudDocument(user.uid, 'tasks', taskId);
    }
  };

  // Handlers: Goals
  const handleSaveGoal = (
    goalData: Omit<Goal, 'id' | 'uid' | 'progress' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    const nowIso = new Date().toISOString();
    let savedGoal: Goal | undefined;

    if (existingId) {
      const nextGoals = workspace.goals.map((g) => {
        if (g.id !== existingId) return g;
        const linked = workspace.tasks.filter((tk) => tk.goalId === g.id);
        const draftGoal: Goal = {
          ...g,
          ...goalData,
          updatedAt: nowIso,
        };
        const prog =
          goalData.status === 'achieved'
            ? 100
            : recalculateGoalProgress(draftGoal, linked);
        savedGoal = { ...draftGoal, progress: prog };
        return savedGoal;
      });
      commitWorkspace({ ...workspace, goals: nextGoals }, t.savedFeedback);
    } else {
      const draftGoal: Goal = {
        id: `goal_${Date.now()}`,
        uid: currentUid,
        ...goalData,
        progress: goalData.status === 'achieved' ? 100 : 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      draftGoal.progress =
        goalData.status === 'achieved'
          ? 100
          : recalculateGoalProgress(draftGoal, []);
      savedGoal = draftGoal;
      commitWorkspace(
        { ...workspace, goals: [savedGoal, ...workspace.goals] },
        t.savedFeedback
      );
    }

    if (savedGoal && user?.authProvider === 'firebase') {
      syncGoalToCloud(user.uid, savedGoal);
    }
  };

  const handleToggleMilestone = (goalId: string, milestoneId: string) => {
    const nowIso = new Date().toISOString();
    let updatedGoal: Goal | undefined;

    const nextGoals = workspace.goals.map((g) => {
      if (g.id !== goalId) return g;
      const nextMilestones = g.milestones.map((m) =>
        m.id === milestoneId ? { ...m, completed: !m.completed } : m
      );
      const linked = workspace.tasks.filter((tk) => tk.goalId === g.id);
      const draft: Goal = { ...g, milestones: nextMilestones, updatedAt: nowIso };
      const nextProgress = recalculateGoalProgress(draft, linked);
      updatedGoal = {
        ...draft,
        progress: nextProgress,
        status: nextProgress === 100 ? 'achieved' : g.status,
      };
      return updatedGoal;
    });

    commitWorkspace({ ...workspace, goals: nextGoals }, t.savedFeedback);
    if (updatedGoal && user?.authProvider === 'firebase') {
      syncGoalToCloud(user.uid, updatedGoal);
    }
  };

  const handleAddMilestoneInline = (goalId: string, title: string) => {
    const nowIso = new Date().toISOString();
    let updatedGoal: Goal | undefined;

    const nextGoals = workspace.goals.map((g) => {
      if (g.id !== goalId) return g;
      const nextMilestones = [
        ...g.milestones,
        {
          id: `ms_${Date.now()}`,
          title,
          completed: false,
        },
      ];
      const linked = workspace.tasks.filter((tk) => tk.goalId === g.id);
      const draft: Goal = { ...g, milestones: nextMilestones, updatedAt: nowIso };
      updatedGoal = {
        ...draft,
        progress: recalculateGoalProgress(draft, linked),
      };
      return updatedGoal;
    });

    commitWorkspace({ ...workspace, goals: nextGoals }, t.savedFeedback);
    if (updatedGoal && user?.authProvider === 'firebase') {
      syncGoalToCloud(user.uid, updatedGoal);
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    const nextGoals = workspace.goals.filter((g) => g.id !== goalId);
    commitWorkspace({ ...workspace, goals: nextGoals }, t.savedFeedback);
    if (user?.authProvider === 'firebase') {
      deleteCloudDocument(user.uid, 'goals', goalId);
    }
  };

  // Handlers: Journal
  const handleSaveJournalEntry = (
    entryData: Omit<JournalEntry, 'id' | 'uid' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    const nowIso = new Date().toISOString();
    let savedEntry: JournalEntry | undefined;

    if (existingId) {
      const nextJournal = workspace.journal.map((j) => {
        if (j.id !== existingId) return j;
        savedEntry = {
          ...j,
          ...entryData,
          updatedAt: nowIso,
        };
        return savedEntry;
      });
      commitWorkspace({ ...workspace, journal: nextJournal }, t.savedFeedback);
    } else {
      savedEntry = {
        id: `journal_${Date.now()}`,
        uid: currentUid,
        ...entryData,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      commitWorkspace(
        { ...workspace, journal: [savedEntry, ...workspace.journal] },
        t.savedFeedback
      );
    }

    if (savedEntry && user?.authProvider === 'firebase') {
      syncJournalToCloud(user.uid, savedEntry);
    }
  };

  const handleDeleteJournalEntry = (entryId: string) => {
    const nextJournal = workspace.journal.filter((j) => j.id !== entryId);
    commitWorkspace({ ...workspace, journal: nextJournal }, t.savedFeedback);
    if (user?.authProvider === 'firebase') {
      deleteCloudDocument(user.uid, 'journal', entryId);
    }
  };

  // Handler: Apply Recovery Protocol
  const handleApplyRecoveryProtocol = (
    protocol: 'minimum_viable_day' | 'calibrate_load' | 'reschedule_overdue'
  ) => {
    const nextWs = applyRecoveryProtocolToWorkspace(
      workspace,
      protocol,
      todayIso
    );
    commitWorkspace(nextWs, t.savedFeedback);
    setRecoveryModalOpen(false);
  };

  if (showSplash) {
    return (
      <LoadingScreen
        language={language}
        onPauseAutoDismiss={() => setSplashPinned(true)}
        onFinish={() => {
          setSplashPinned(false);
          setShowSplash(false);
        }}
      />
    );
  }

  const navItems: Array<{ id: NavSection; label: string }> = [
    { id: 'dashboard', label: t.navDashboard },
    { id: 'habits', label: t.navHabits },
    { id: 'tasks', label: t.navTasks },
    { id: 'goals', label: t.navGoals },
    { id: 'analytics', label: t.navAnalytics },
    { id: 'journal', label: t.navJournal },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--text-primary)] overflow-x-hidden">
      {/* Release-Grade Single Top Bar: 3 Zones separated by gap-8 */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 sm:gap-8 px-4 sm:px-6 lg:px-12 py-3.5 sm:py-4 bg-[var(--background)]/95 backdrop-blur-sm border-b border-[var(--border)]">
        {/* Zone 1: Brand wordmark with straight lowercase 'l' */}
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection('dashboard');
          }}
          aria-label="discipline."
          className="inline-flex items-center shrink-0"
        >
          <img
            src="/assets/discipline_wordmark.png"
            alt="discipline."
            className="h-3.5 sm:h-4.5 w-auto block invert dark:invert-0"
          />
        </a>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`py-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 ${
                  isActive
                    ? 'border-[var(--accent)] text-[var(--text-primary)] font-semibold'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Release Controls + Primary Recovery CTA */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleLanguage}
            aria-label="Switch Language"
            className="hidden lg:inline-flex px-2.5 py-1.5 text-xs font-mono-tabular border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors cursor-pointer whitespace-nowrap"
          >
            {language === 'ru' ? 'RU' : 'EN'}
          </button>

          <button
            type="button"
            onClick={handleToggleTheme}
            aria-label="Switch Theme"
            className="hidden lg:inline-flex px-2.5 py-1.5 text-xs font-mono-tabular border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors cursor-pointer whitespace-nowrap"
          >
            {theme === 'dark' ? t.themeDark : t.themeLight}
          </button>

          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-mono-tabular text-[var(--text-secondary)] max-w-[120px] truncate">
                {user.displayName}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-2.5 py-1.5 text-xs border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors cursor-pointer whitespace-nowrap"
              >
                {t.authSignOut}
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenAuth('login')}
                className="px-3 py-1.5 text-xs font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors cursor-pointer whitespace-nowrap"
              >
                {t.authSignIn}
              </button>
              <button
                type="button"
                onClick={() => handleOpenAuth('register')}
                className="px-3 py-1.5 text-xs font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors cursor-pointer whitespace-nowrap"
              >
                {t.authRegister}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setRecoveryModalOpen(true)}
            className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {t.utilityOpenRecovery}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle Menu"
            className="md:hidden p-1.5 sm:p-2 border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] cursor-pointer shrink-0"
          >
            {mobileMenuOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Navigation & Settings Drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4 space-y-3"
        >
          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveSection(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-2 text-left text-xs font-medium border ${
                  activeSection === item.id
                    ? 'border-[var(--accent)] bg-[var(--background)] text-[var(--text-primary)] font-semibold'
                    : 'border-[var(--border)] text-[var(--text-secondary)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleTheme}
                className="px-2.5 py-1.5 font-mono-tabular border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]"
              >
                {theme === 'dark' ? t.themeDark : t.themeLight}
              </button>
              <button
                type="button"
                onClick={handleToggleLanguage}
                className="px-2.5 py-1.5 font-mono-tabular border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]"
              >
                {language === 'ru' ? 'RU / EN' : 'EN / RU'}
              </button>
            </div>

            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="px-3 py-1.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)]"
              >
                {t.authSignOut}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleOpenAuth('login');
                  }}
                  className="px-3 py-1.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]"
                >
                  {t.authSignIn}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleOpenAuth('register');
                  }}
                  className="px-3 py-1.5 bg-[var(--accent)] text-[var(--accent-fg)] font-semibold"
                >
                  {t.authRegister}
                </button>
              </div>
            )}
          </div>
        </nav>
      )}

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-10">
        {activeSection === 'dashboard' && (
          <DashboardView
            language={language}
            todayIso={todayIso}
            user={user}
            workspace={workspace}
            diagnosis={diagnosis}
            onNavigate={setActiveSection}
            onToggleHabitToday={(habitId) =>
              handleToggleHabitDate(habitId, todayIso)
            }
            onOpenSkipModal={handleOpenSkipModal}
            onToggleTask={handleToggleTask}
            onOpenRecovery={() => setRecoveryModalOpen(true)}
            onOpenAuth={handleOpenAuth}
          />
        )}

        {activeSection === 'habits' && (
          <HabitsView
            language={language}
            todayIso={todayIso}
            habits={workspace.habits}
            goals={workspace.goals}
            onSaveHabit={handleSaveHabit}
            onDeleteHabit={handleDeleteHabit}
            onToggleHabitDate={handleToggleHabitDate}
            onOpenSkipModal={handleOpenSkipModal}
          />
        )}

        {activeSection === 'tasks' && (
          <TasksView
            language={language}
            todayIso={todayIso}
            tasks={workspace.tasks}
            goals={workspace.goals}
            onSaveTask={handleSaveTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {activeSection === 'goals' && (
          <GoalsView
            language={language}
            todayIso={todayIso}
            goals={workspace.goals}
            habits={workspace.habits}
            tasks={workspace.tasks}
            onSaveGoal={handleSaveGoal}
            onToggleMilestone={handleToggleMilestone}
            onAddMilestoneInline={handleAddMilestoneInline}
            onDeleteGoal={handleDeleteGoal}
          />
        )}

        {activeSection === 'analytics' && (
          <AnalyticsView
            language={language}
            todayIso={todayIso}
            workspace={workspace}
            onOpenRecovery={() => setRecoveryModalOpen(true)}
          />
        )}

        {activeSection === 'journal' && (
          <JournalView
            language={language}
            todayIso={todayIso}
            entries={workspace.journal}
            onSaveEntry={handleSaveJournalEntry}
            onDeleteEntry={handleDeleteJournalEntry}
          />
        )}
      </main>

      {/* Clean Product Footer */}
      <footer className="px-4 sm:px-6 lg:px-12 py-6 border-t border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-secondary)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/assets/discipline_wordmark.png"
            alt="discipline."
            className="h-3.5 w-auto block invert dark:invert-0 opacity-90"
          />
        </div>
        <div className="flex flex-wrap items-center gap-5">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>
      </footer>

      {/* Documented Skip Modal */}
      {skipModalState.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="skip-modal-title"
        >
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] p-6 sm:p-8 text-[var(--text-primary)] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h2
                id="skip-modal-title"
                className="font-display text-lg font-bold"
              >
                {t.skipModalTitle}
              </h2>
              <button
                type="button"
                onClick={() =>
                  setSkipModalState((prev) => ({ ...prev, isOpen: false }))
                }
                aria-label={t.closeBtn}
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {t.skipModalDesc}
            </p>

            <form onSubmit={handleConfirmSkip} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="skip-reason-input"
                  className="block text-xs font-medium text-[var(--text-secondary)]"
                >
                  {t.skipReasonLabel} ({skipModalState.dateIso})
                </label>
                <input
                  id="skip-reason-input"
                  type="text"
                  value={skipModalState.reason}
                  onChange={(e) =>
                    setSkipModalState((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  placeholder={t.skipReasonPlaceholder}
                  className="w-full px-3.5 py-2 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="space-y-1.5">
                {[
                  t.skipReasonPreset1,
                  t.skipReasonPreset2,
                  t.skipReasonPreset3,
                  t.skipReasonPreset4,
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      setSkipModalState((prev) => ({
                        ...prev,
                        reason: preset,
                      }))
                    }
                    className="w-full text-left px-3 py-1.5 text-xs border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors cursor-pointer"
                  >
                    · {preset}
                  </button>
                ))}
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() =>
                    setSkipModalState((prev) => ({ ...prev, isOpen: false }))
                  }
                  className="px-4 py-2 text-xs border border-[var(--border)] bg-[var(--background)] cursor-pointer"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] cursor-pointer"
                >
                  {t.confirmSkipBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authInitialMode}
        language={language}
        theme={theme}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
      />

      {/* Recovery System Modal */}
      <RecoveryModal
        isOpen={recoveryModalOpen}
        language={language}
        diagnosis={diagnosis}
        workspace={workspace}
        onClose={() => setRecoveryModalOpen(false)}
        onApplyProtocol={handleApplyRecoveryProtocol}
      />

      {/* Subtle Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 px-4 py-2.5 text-xs font-mono-tabular bg-[var(--text-primary)] text-[var(--background)] border border-[var(--border)] shadow-sm"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
