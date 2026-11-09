export type ThemeMode = 'dark' | 'light';
export type Language = 'ru' | 'en';

export type NavSection =
  | 'dashboard'
  | 'habits'
  | 'tasks'
  | 'goals'
  | 'analytics'
  | 'journal';

export type HabitCategory = 'body' | 'mind' | 'craft' | 'order' | 'recovery';
export type HabitFrequency = 'daily' | 'weekdays' | 'weekly';
export type HabitStatus = 'active' | 'paused' | 'archived';

export type HabitLogState = 'completed' | 'skipped';

export interface HabitDayLog {
  date: string; // YYYY-MM-DD
  state: HabitLogState;
  skipReason?: string;
  note?: string;
  timestamp: string;
}

export interface Habit {
  id: string;
  uid: string;
  title: string;
  description: string; // Minimum viable action / protocol
  minimumAction: string; // Scaled-down version for low-energy/recovery days
  category: HabitCategory;
  frequency: HabitFrequency;
  targetPerWeek: number; // 1..7
  status: HabitStatus;
  linkedGoalId?: string;
  logs: Record<string, HabitDayLog>; // keyed by YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskCategory = 'deep-work' | 'operations' | 'health' | 'learning' | 'personal';

export interface Task {
  id: string;
  uid: string;
  title: string;
  notes: string;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate: string; // YYYY-MM-DD
  completed: boolean;
  completedAt?: string;
  goalId: string; // 'none' or Goal.id
  createdAt: string;
  updatedAt: string;
}

export type GoalStatus = 'in_progress' | 'at_risk' | 'achieved' | 'paused';

export interface GoalMilestone {
  id: string;
  title: string;
  completed: boolean;
  targetDate?: string;
}

export interface Goal {
  id: string;
  uid: string;
  title: string;
  outcome: string;
  targetDate: string; // YYYY-MM-DD
  status: GoalStatus;
  progress: number; // 0..100
  milestones: GoalMilestone[];
  createdAt: string;
  updatedAt: string;
}

export type JournalMood = 'focused' | 'steady' | 'strained' | 'recovering';

export interface JournalEntry {
  id: string;
  uid: string;
  date: string; // YYYY-MM-DD
  wentWell: string;
  didNotWork: string;
  why: string;
  improveTomorrow: string;
  mood: JournalMood;
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryEvent {
  id: string;
  date: string;
  protocol: 'minimum_viable_day' | 'calibrate_load' | 'reschedule_overdue';
  summary: string;
}

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  authProvider: 'local' | 'firebase';
  emailVerified: boolean;
  createdAt: string;
}

export interface WorkspaceState {
  habits: Habit[];
  tasks: Task[];
  goals: Goal[];
  journal: JournalEntry[];
  recoveryHistory: RecoveryEvent[];
  minimumViableDayActiveDate?: string; // YYYY-MM-DD if activated today
}
