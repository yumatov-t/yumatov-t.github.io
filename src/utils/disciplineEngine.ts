import {
  Goal,
  Habit,
  JournalEntry,
  Task,
  WorkspaceState,
} from '../types/discipline';

export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getOffsetDateIso(baseIso: string, offsetDays: number): string {
  const [y, m, d] = baseIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + offsetDays);
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLastNDaysIso(endIso: string, count: number): string[] {
  const result: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    result.push(getOffsetDateIso(endIso, -i));
  }
  return result;
}

export function isHabitScheduledOnDate(habit: Habit, dateIso: string): boolean {
  if (habit.status !== 'active') return false;
  if (habit.frequency === 'daily') return true;
  const [y, m, d] = dateIso.split('-').map(Number);
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sun, 6 = Sat
  if (habit.frequency === 'weekdays') {
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }
  return true;
}

export interface HabitMetrics {
  consistencyRate14d: number; // 0..100
  completedCount14d: number;
  skippedCount14d: number;
  missedCount14d: number;
  activeChainDays: number; // Consecutive scheduled days with 'completed' or documented 'skipped'
  consecutiveUnloggedMisses: number; // Recent consecutive scheduled days before today with no log
  needsRecovery: boolean;
}

export function calculateHabitMetrics(habit: Habit, todayIso: string): HabitMetrics {
  const window14 = getLastNDaysIso(todayIso, 14);
  let completedCount14d = 0;
  let skippedCount14d = 0;
  let missedCount14d = 0;
  let expectedDays = 0;

  for (const dateIso of window14) {
    const scheduled = isHabitScheduledOnDate(habit, dateIso);
    const log = habit.logs[dateIso];
    if (log?.state === 'completed') {
      completedCount14d += 1;
      expectedDays += 1;
    } else if (log?.state === 'skipped') {
      skippedCount14d += 1;
    } else if (scheduled) {
      expectedDays += 1;
      if (dateIso < todayIso) {
        missedCount14d += 1;
      }
    }
  }

  let effectiveExpected = expectedDays;
  if (habit.frequency === 'weekly') {
    effectiveExpected = Math.max(1, habit.targetPerWeek * 2);
  }

  const rawRate =
    effectiveExpected > 0
      ? Math.round((completedCount14d / effectiveExpected) * 100)
      : 0;
  const consistencyRate14d = Math.min(100, Math.max(0, rawRate));

  // Calculate active chain (going backwards from today or yesterday)
  let activeChainDays = 0;
  for (let offset = 0; offset <= 30; offset++) {
    const dIso = getOffsetDateIso(todayIso, -offset);
    const log = habit.logs[dIso];
    if (log?.state === 'completed') {
      activeChainDays += 1;
    } else if (log?.state === 'skipped') {
      // Documented skip preserves the chain without incrementing raw completion count
      continue;
    } else {
      if (offset === 0) {
        // Not logged today yet doesn't break yesterday's chain
        continue;
      }
      if (!isHabitScheduledOnDate(habit, dIso)) {
        continue;
      }
      break;
    }
  }

  // Check consecutive unlogged misses immediately preceding today
  let consecutiveUnloggedMisses = 0;
  for (let offset = 1; offset <= 14; offset++) {
    const dIso = getOffsetDateIso(todayIso, -offset);
    if (!isHabitScheduledOnDate(habit, dIso)) continue;
    const log = habit.logs[dIso];
    if (!log) {
      consecutiveUnloggedMisses += 1;
    } else {
      break;
    }
  }

  const needsRecovery = consecutiveUnloggedMisses >= 2;

  return {
    consistencyRate14d,
    completedCount14d,
    skippedCount14d,
    missedCount14d,
    activeChainDays,
    consecutiveUnloggedMisses,
    needsRecovery,
  };
}

export interface RecoveryDiagnosis {
  needsAttention: boolean;
  habitsWithGaps: Array<{ habit: Habit; metrics: HabitMetrics }>;
  overdueTasks: Task[];
  atRiskGoals: Goal[];
  overallConsistency14d: number;
  minimumViableActiveToday: boolean;
}

export function analyzeWorkspaceRecovery(
  workspace: WorkspaceState,
  todayIso: string
): RecoveryDiagnosis {
  const activeHabits = workspace.habits.filter((h) => h.status === 'active');
  const habitPairs = activeHabits.map((habit) => ({
    habit,
    metrics: calculateHabitMetrics(habit, todayIso),
  }));

  const habitsWithGaps = habitPairs.filter((p) => p.metrics.needsRecovery);
  const overdueTasks = workspace.tasks.filter(
    (t) => !t.completed && t.dueDate < todayIso
  );
  const atRiskGoals = workspace.goals.filter(
    (g) => g.status === 'at_risk' || (g.status === 'in_progress' && g.targetDate < todayIso && g.progress < 100)
  );

  const overallConsistency14d =
    habitPairs.length > 0
      ? Math.round(
          habitPairs.reduce((acc, p) => acc + p.metrics.consistencyRate14d, 0) /
            habitPairs.length
        )
      : 0;

  const minimumViableActiveToday = workspace.minimumViableDayActiveDate === todayIso;
  const needsAttention =
    habitsWithGaps.length > 0 || overdueTasks.length > 0 || atRiskGoals.length > 0;

  return {
    needsAttention,
    habitsWithGaps,
    overdueTasks,
    atRiskGoals,
    overallConsistency14d,
    minimumViableActiveToday,
  };
}

export function recalculateGoalProgress(goal: Goal, linkedTasks: Task[] = []): number {
  const totalMilestones = goal.milestones.length;
  const completedMilestones = goal.milestones.filter((m) => m.completed).length;

  const totalTasks = linkedTasks.length;
  const completedTasks = linkedTasks.filter((t) => t.completed).length;

  const totalUnits = totalMilestones + totalTasks;
  if (totalUnits === 0) {
    return goal.progress;
  }
  return Math.round(((completedMilestones + completedTasks) / totalUnits) * 100);
}

export function applyRecoveryProtocolToWorkspace(
  workspace: WorkspaceState,
  protocol: 'minimum_viable_day' | 'calibrate_load' | 'reschedule_overdue',
  todayIso: string
): WorkspaceState {
  const tomorrowIso = getOffsetDateIso(todayIso, 1);
  const nowIso = new Date().toISOString();

  if (protocol === 'minimum_viable_day') {
    // Activate Minimum Viable Day for today & move low-priority overdue tasks to tomorrow
    const updatedTasks = workspace.tasks.map((task) => {
      if (!task.completed && task.dueDate <= todayIso && task.priority === 'low') {
        return { ...task, dueDate: tomorrowIso, updatedAt: nowIso };
      }
      return task;
    });

    // Also mark yesterday's unlogged gaps as documented recovery bridge so user isn't stuck in penalty state
    const yesterdayIso = getOffsetDateIso(todayIso, -1);
    const updatedHabits: Habit[] = workspace.habits.map((habit) => {
      if (habit.status !== 'active') return habit;
      const metrics = calculateHabitMetrics(habit, todayIso);
      if (metrics.needsRecovery && !habit.logs[yesterdayIso]) {
        return {
          ...habit,
          logs: {
            ...habit.logs,
            [yesterdayIso]: {
              date: yesterdayIso,
              state: 'skipped' as const,
              skipReason: 'Recovery protocol: Minimum Viable Day transition',
              timestamp: nowIso,
            },
          },
          updatedAt: nowIso,
        };
      }
      return habit;
    });

    return {
      ...workspace,
      habits: updatedHabits,
      tasks: updatedTasks,
      minimumViableDayActiveDate: todayIso,
      recoveryHistory: [
        {
          id: `rec-${Date.now()}`,
          date: todayIso,
          protocol: 'minimum_viable_day',
          summary: 'Activated Minimum Viable Day threshold & deferred low-priority load.',
        },
        ...workspace.recoveryHistory,
      ],
    };
  }

  if (protocol === 'calibrate_load') {
    // Scale strained daily habits to weekdays or 4x/week so the system matches realistic capacity
    const updatedHabits: Habit[] = workspace.habits.map((habit) => {
      if (habit.status !== 'active') return habit;
      const metrics = calculateHabitMetrics(habit, todayIso);
      if (metrics.needsRecovery) {
        const yesterdayIso = getOffsetDateIso(todayIso, -1);
        const nextFrequency =
          habit.frequency === 'daily' ? ('weekdays' as const) : ('weekly' as const);
        const nextTarget = nextFrequency === 'weekdays' ? 5 : Math.max(3, habit.targetPerWeek - 1);
        return {
          ...habit,
          frequency: nextFrequency,
          targetPerWeek: nextTarget,
          logs: habit.logs[yesterdayIso]
            ? habit.logs
            : {
                ...habit.logs,
                [yesterdayIso]: {
                  date: yesterdayIso,
                  state: 'skipped' as const,
                  skipReason: 'Schedule calibrated to sustainable cadence',
                  timestamp: nowIso,
                },
              },
          updatedAt: nowIso,
        };
      }
      return habit;
    });

    return {
      ...workspace,
      habits: updatedHabits,
      recoveryHistory: [
        {
          id: `rec-${Date.now()}`,
          date: todayIso,
          protocol: 'calibrate_load',
          summary: 'Calibrated strained habits to a sustainable weekly cadence.',
        },
        ...workspace.recoveryHistory,
      ],
    };
  }

  // protocol === 'reschedule_overdue'
  const updatedTasks = workspace.tasks.map((task) => {
    if (!task.completed && task.dueDate < todayIso) {
      const targetDue = task.priority === 'high' ? todayIso : tomorrowIso;
      return {
        ...task,
        dueDate: targetDue,
        updatedAt: nowIso,
      };
    }
    return task;
  });

  const updatedGoals = workspace.goals.map((goal) => {
    if (goal.status === 'at_risk') {
      return {
        ...goal,
        status: 'in_progress' as const,
        updatedAt: nowIso,
      };
    }
    return goal;
  });

  return {
    ...workspace,
    tasks: updatedTasks,
    goals: updatedGoals,
    recoveryHistory: [
      {
        id: `rec-${Date.now()}`,
        date: todayIso,
        protocol: 'reschedule_overdue',
        summary: 'Realigned overdue tasks to today/tomorrow and restored active goal focus.',
      },
      ...workspace.recoveryHistory,
    ],
  };
}

export interface AnalyticsSummary {
  dailySeries14d: Array<{
    date: string;
    completedHabits: number;
    skippedHabits: number;
    totalActiveHabits: number;
    rate: number;
  }>;
  overallHabitRate14d: number;
  totalHabitCompletions14d: number;
  totalDocumentedSkips14d: number;
  taskCompletionRate: number;
  completedTasksCount: number;
  activeTasksCount: number;
  overdueTasksCount: number;
  averageGoalProgress: number;
  mostResilientHabits: Array<{ habit: Habit; rate: number; chain: number }>;
  strainedHabits: Array<{ habit: Habit; rate: number; misses: number }>;
  weekdayPerformance: Array<{
    weekdayIndex: number; // 1=Mon .. 7=Sun
    completionRate: number;
    missesCount: number;
  }>;
}

export function computeAnalytics(
  workspace: WorkspaceState,
  todayIso: string
): AnalyticsSummary {
  const activeHabits = workspace.habits.filter((h) => h.status === 'active');
  const days14 = getLastNDaysIso(todayIso, 14);

  let totalHabitCompletions14d = 0;
  let totalDocumentedSkips14d = 0;

  const dailySeries14d = days14.map((dateIso) => {
    let completedHabits = 0;
    let skippedHabits = 0;
    let scheduledCount = 0;

    for (const h of activeHabits) {
      const scheduled = isHabitScheduledOnDate(h, dateIso);
      const log = h.logs[dateIso];
      if (log?.state === 'completed') {
        completedHabits += 1;
        totalHabitCompletions14d += 1;
        scheduledCount += 1;
      } else if (log?.state === 'skipped') {
        skippedHabits += 1;
        totalDocumentedSkips14d += 1;
      } else if (scheduled) {
        scheduledCount += 1;
      }
    }

    const rate =
      scheduledCount > 0 ? Math.round((completedHabits / scheduledCount) * 100) : 0;

    return {
      date: dateIso,
      completedHabits,
      skippedHabits,
      totalActiveHabits: activeHabits.length,
      rate,
    };
  });

  const habitRankings = activeHabits.map((habit) => {
    const m = calculateHabitMetrics(habit, todayIso);
    return {
      habit,
      rate: m.consistencyRate14d,
      chain: m.activeChainDays,
      misses: m.missedCount14d,
    };
  });

  const mostResilientHabits = [...habitRankings]
    .sort((a, b) => b.rate - a.rate || b.chain - a.chain)
    .slice(0, 3);

  const strainedHabits = [...habitRankings]
    .filter((item) => item.rate < 70 || item.misses >= 2)
    .sort((a, b) => a.rate - b.rate || b.misses - a.misses)
    .slice(0, 3);

  const overallHabitRate14d =
    habitRankings.length > 0
      ? Math.round(
          habitRankings.reduce((acc, item) => acc + item.rate, 0) /
            habitRankings.length
        )
      : 0;

  const completedTasksCount = workspace.tasks.filter((t) => t.completed).length;
  const activeTasksCount = workspace.tasks.filter((t) => !t.completed).length;
  const overdueTasksCount = workspace.tasks.filter(
    (t) => !t.completed && t.dueDate < todayIso
  ).length;
  const taskCompletionRate =
    workspace.tasks.length > 0
      ? Math.round((completedTasksCount / workspace.tasks.length) * 100)
      : 0;

  const averageGoalProgress =
    workspace.goals.length > 0
      ? Math.round(
          workspace.goals.reduce((acc, g) => acc + g.progress, 0) /
            workspace.goals.length
        )
      : 0;

  // Weekday breakdown (1=Mon .. 7=Sun)
  const weekdayBuckets: Record<number, { scheduled: number; completed: number; misses: number }> = {
    1: { scheduled: 0, completed: 0, misses: 0 },
    2: { scheduled: 0, completed: 0, misses: 0 },
    3: { scheduled: 0, completed: 0, misses: 0 },
    4: { scheduled: 0, completed: 0, misses: 0 },
    5: { scheduled: 0, completed: 0, misses: 0 },
    6: { scheduled: 0, completed: 0, misses: 0 },
    7: { scheduled: 0, completed: 0, misses: 0 },
  };

  for (const dIso of days14) {
    const [y, m, d] = dIso.split('-').map(Number);
    const utcDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const weekdayIndex = utcDay === 0 ? 7 : utcDay;
    for (const h of activeHabits) {
      const log = h.logs[dIso];
      const scheduled = isHabitScheduledOnDate(h, dIso);
      if (log?.state === 'completed') {
        weekdayBuckets[weekdayIndex].scheduled += 1;
        weekdayBuckets[weekdayIndex].completed += 1;
      } else if (scheduled && dIso <= todayIso && !log) {
        weekdayBuckets[weekdayIndex].scheduled += 1;
        if (dIso < todayIso) {
          weekdayBuckets[weekdayIndex].misses += 1;
        }
      }
    }
  }

  const weekdayPerformance = [1, 2, 3, 4, 5, 6, 7].map((weekdayIndex) => {
    const b = weekdayBuckets[weekdayIndex];
    return {
      weekdayIndex,
      completionRate: b.scheduled > 0 ? Math.round((b.completed / b.scheduled) * 100) : 0,
      missesCount: b.misses,
    };
  });

  return {
    dailySeries14d,
    overallHabitRate14d,
    totalHabitCompletions14d,
    totalDocumentedSkips14d,
    taskCompletionRate,
    completedTasksCount,
    activeTasksCount,
    overdueTasksCount,
    averageGoalProgress,
    mostResilientHabits,
    strainedHabits,
    weekdayPerformance,
  };
}

// Validation helpers
export function validateHabitForm(input: {
  title: string;
  description: string;
  minimumAction: string;
  targetPerWeek: number;
}): string | null {
  if (!input.title || input.title.trim().length < 2) {
    return 'errorHabitTitleRequired';
  }
  if (input.title.trim().length > 140) {
    return 'errorHabitTitleTooLong';
  }
  if (input.description.trim().length > 500) {
    return 'errorDescriptionTooLong';
  }
  if (input.targetPerWeek < 1 || input.targetPerWeek > 7) {
    return 'errorInvalidTargetPerWeek';
  }
  return null;
}

export function validateTaskForm(input: {
  title: string;
  dueDate: string;
}): string | null {
  if (!input.title || input.title.trim().length < 2) {
    return 'errorTaskTitleRequired';
  }
  if (input.title.trim().length > 200) {
    return 'errorTaskTitleTooLong';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
    return 'errorTaskDueDateInvalid';
  }
  return null;
}

export function validateGoalForm(input: {
  title: string;
  outcome: string;
  targetDate: string;
}): string | null {
  if (!input.title || input.title.trim().length < 2) {
    return 'errorGoalTitleRequired';
  }
  if (!input.outcome || input.outcome.trim().length < 3) {
    return 'errorGoalOutcomeRequired';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.targetDate)) {
    return 'errorGoalDateInvalid';
  }
  return null;
}

export function validateJournalForm(input: {
  date: string;
  wentWell: string;
}): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return 'errorJournalDateInvalid';
  }
  if (!input.wentWell || input.wentWell.trim().length < 2) {
    return 'errorJournalWentWellRequired';
  }
  return null;
}

export function validateAuthForm(input: {
  mode: 'login' | 'register' | 'reset';
  email: string;
  password?: string;
  displayName?: string;
}): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!input.email || !emailRegex.test(input.email.trim())) {
    return 'errorEmailInvalid';
  }
  if (input.mode === 'register') {
    if (!input.displayName || input.displayName.trim().length < 2) {
      return 'errorNameRequired';
    }
  }
  if (input.mode === 'login' || input.mode === 'register') {
    if (!input.password || input.password.length < 6) {
      return 'errorPasswordTooShort';
    }
  }
  return null;
}

const SEED_TRANSLATIONS = {
  habits: {
    'habit-deep-work': {
      ru: {
        title: '90 минут глубокой фокусировки до проверки почты',
        description: 'Работа над главным архитектурным приоритетом дня без мессенджеров и уведомлений.',
        minimumAction: '25 минут одного непрерывного рабочего блока по таймеру.',
      },
      en: {
        title: '90 minutes of deep architectural focus before email',
        description: 'Work on the primary architectural priority of the day without messengers or notifications.',
        minimumAction: '25 minutes of a single uninterrupted focus block.',
      },
    },
    'habit-mobility': {
      ru: {
        title: 'Утренняя суставная разминка и холодная вода',
        description: '15 минут работы с плечевым поясом, грудным отделом и дыханием перед началом дня.',
        minimumAction: '3 минуты разминки плеч и 10 глубоких вдохов.',
      },
      en: {
        title: 'Morning joint mobility & cold water',
        description: '15 minutes of shoulder, thoracic mobility, and breathwork before starting the day.',
        minimumAction: '3 minutes of shoulder mobility and 10 deep breaths.',
      },
    },
    'habit-reading': {
      ru: {
        title: 'Чтение профессиональной и философской литературы (30 стр.)',
        description: 'Анализ сложных текстов с фиксацией одного структурного тезиса в заметках.',
        minimumAction: 'Прочитать 5 страниц перед сном без экрана телефона.',
      },
      en: {
        title: 'Professional & philosophical reading (30 pages)',
        description: 'Analyze complex texts and capture one structural thesis in notes.',
        minimumAction: 'Read 5 pages before sleep away from screens.',
      },
    },
    'habit-shutdown': {
      ru: {
        title: 'Вечерний аудит дня и закрытие рабочих вкладок в 21:30',
        description: 'Фиксация трёх главных задач на завтра и полный выход из цифрового шума.',
        minimumAction: 'Записать одну главную задачу на завтра и убрать ноутбук.',
      },
      en: {
        title: 'Evening day audit & digital shutdown at 21:30',
        description: 'Define the top three priorities for tomorrow and step away from digital noise.',
        minimumAction: 'Write down one primary task for tomorrow and close the laptop.',
      },
    },
  },
  tasks: {
    'task-1': {
      ru: {
        title: 'Стратегический блок (90 мин): завершить архитектуру ключевого проекта',
        notes: 'Полная изоляция от мессенджеров и почты до фиксации итогового документа.',
      },
      en: {
        title: 'Strategic block (90 min): finalize core project architecture',
        notes: 'Zero messengers or email until the structural specification is locked.',
      },
      legacyTitles: [
        'Проверить алгоритм расчёта индекса последовательности за 14 дней',
        'Verify the 14-day consistency index calculation algorithm',
      ],
    },
    'task-2': {
      ru: {
        title: 'Интервальная сессия в бассейне: 8x100м на технику гребка',
        notes: 'Контроль высокого локтя и спокойного выдоха в воду.',
      },
      en: {
        title: 'Pool interval session: 8x100m stroke mechanics focus',
        notes: 'Maintain high-elbow catch and steady rhythmic exhale.',
      },
      legacyTitles: [] as string[],
    },
    'task-3': {
      ru: {
        title: 'Разобрать рабочие заметки и закрыть недельный план',
        notes: 'Отсечь второстепенные обязательства и оставить максимум 3 приоритета.',
      },
      en: {
        title: 'Process weekly notes and lock next week’s execution plan',
        notes: 'Cut secondary commitments and keep at most 3 high-leverage priorities.',
      },
      legacyTitles: [
        'Разобрать накопившиеся заметки за прошлую неделю',
        'Process accumulated research notes from last week',
      ],
    },
    'task-4': {
      ru: {
        title: 'Силовой и восстановительный протокол: грудной отдел и плечевой пояс',
        notes: 'Мобилизация после нагрузок на воде и 20 минут спокойного восстановления.',
      },
      en: {
        title: 'Strength & recovery protocol: thoracic and shoulder girdle',
        notes: 'Post-swim mobility work and 20 minutes of deliberate parasympathetic recovery.',
      },
      legacyTitles: [
        'Настроить цветовую систему и контраст для светлой и тёмной тем',
        'Calibrate color tokens and contrast for light and dark themes',
      ],
    },
  },
  goals: {
    'goal-architecture-v1': {
      ru: {
        title: 'Выстроить автономный режим глубокой работы (4 часа в день без шума)',
        outcome: 'Ежедневный утренний блок глубокой концентрации до 12:00 и жёсткое закрытие рабочих коммуникаций в 21:30.',
        milestones: {
          'ms-1': 'Убрать телефон и уведомления из утреннего рабочего контура',
          'ms-2': 'Выдержать 14 дней утренних 90-минутных сессий подряд',
          'ms-3': 'Внедрить протокол минимального дня на случай перегрузок',
          'ms-4': 'Сократить операционные созвоны до двух раз в неделю',
          'ms-5': 'Закрепить стабильный 4-часовой ритм глубокого фокуса',
        },
      },
      en: {
        title: 'Establish autonomous deep work cadence (4 hours/day zero noise)',
        outcome: 'Daily morning deep focus block before 12:00 and strict communication shutdown at 21:30.',
        milestones: {
          'ms-1': 'Remove phone and notifications from morning workspace',
          'ms-2': 'Complete 14 consecutive days of 90-minute morning focus blocks',
          'ms-3': 'Deploy minimum viable day protocol for high-strain days',
          'ms-4': 'Consolidate operational calls to twice per week',
          'ms-5': 'Lock in a sustainable 4-hour daily deep focus rhythm',
        },
      },
      legacyTitles: [
        'Выпустить публичную версию DISCIPLINE v1.0',
        'Ship public release of DISCIPLINE v1.0',
      ],
    },
    'goal-physical-endurance': {
      ru: {
        title: 'Сформировать устойчивый физический ритм (1000м на воде)',
        outcome: 'Три тренировки в неделю и ежедневная утренняя мобилизация суставов без выгорания и пропусков более 2 дней.',
        milestones: {
          'ms-201': 'Стабилизировать утренний подъём и разминку 14 дней подряд',
          'ms-202': 'Выйти на темп 1:55/100м на дистанции 800м',
          'ms-203': 'Проплыть 1000м свободным стилем с ровным дыханием',
          'ms-204': 'Закрепить недельный цикл восстановления',
        },
      },
      en: {
        title: 'Build sustainable physical endurance (1000m swim)',
        outcome: 'Three pool sessions per week and daily morning mobility without burnout or unlogged gaps over 2 days.',
        milestones: {
          'ms-201': 'Stabilize morning wake-up and mobility for 14 days',
          'ms-202': 'Hold 1:55/100m pace across 800m distance',
          'ms-203': 'Swim 1000m freestyle with controlled breathing',
          'ms-204': 'Lock in weekly active recovery cadence',
        },
      },
      legacyTitles: [] as string[],
    },
  },
  journal: {
    'journal-1': {
      ru: {
        wentWell: 'Удалось удержать 90 минут глубокой концентрации с утра и закрыть ключевой стратегический этап без единого отвлечения.',
        didNotWork: 'Вечером затянулся рабочий созвон, из-за чего пропустил чтение и поздно закрыл ноутбук.',
        why: 'Не поставил жёсткий лимит времени на вечернее обсуждение второстепенных деталей.',
        improveTomorrow: 'Перенести все обсуждения на первую половину дня до 16:00 и выполнить хотя бы минимальный порог чтения (5 страниц).',
      },
      en: {
        wentWell: 'Sustained 90 minutes of deep morning focus and completed the primary strategic deliverable with zero distractions.',
        didNotWork: 'Evening call ran late, causing me to miss reading and delay digital shutdown.',
        why: 'Did not set a hard time boundary on secondary evening discussions.',
        improveTomorrow: 'Schedule all synchronous calls before 16:00 and complete at least the minimum reading threshold (5 pages).',
      },
    },
    'journal-2': {
      ru: {
        wentWell: 'Отличная тренировка в воде — ровный ритм дыхания, после бассейна высокая ясность мыслей.',
        didNotWork: 'Слишком много мелких операционных задач в списке на день создали ощущение распыления.',
        why: 'Попытался закрыть недельный бэклог за один вторник вместо выбора 2-3 ключевых действий.',
        improveTomorrow: 'Ограничивать список активных задач на день максимум тремя пунктами высокого приоритета.',
      },
      en: {
        wentWell: 'Strong session in the water — steady breathing cadence and high mental clarity afterwards.',
        didNotWork: 'Too many minor operational tasks on the daily list created cognitive fragmentation.',
        why: 'Tried to clear a full weekly backlog in a single afternoon instead of selecting 2-3 key actions.',
        improveTomorrow: 'Cap the active daily task list at a maximum of three high-priority items.',
      },
    },
  },
} as const;

export function localizeWorkspaceSeedItems(
  workspace: WorkspaceState,
  lang: 'ru' | 'en'
): WorkspaceState {
  const otherLang = lang === 'ru' ? 'en' : 'ru';

  const habits = workspace.habits.map((h) => {
    const map = SEED_TRANSLATIONS.habits[h.id as keyof typeof SEED_TRANSLATIONS.habits];
    if (!map) return h;
    if (h.title === map[otherLang].title || h.title === map[lang].title) {
      return {
        ...h,
        title: map[lang].title,
        description: map[lang].description,
        minimumAction: map[lang].minimumAction,
      };
    }
    return h;
  });

  const tasks = workspace.tasks.map((tk) => {
    const map = SEED_TRANSLATIONS.tasks[tk.id as keyof typeof SEED_TRANSLATIONS.tasks];
    if (!map) return tk;
    const isSeeded =
      tk.title === map[otherLang].title ||
      tk.title === map[lang].title ||
      (map.legacyTitles as readonly string[]).includes(tk.title);
    if (isSeeded) {
      return {
        ...tk,
        title: map[lang].title,
        notes: map[lang].notes,
      };
    }
    return tk;
  });

  const goals = workspace.goals.map((g) => {
    const map = SEED_TRANSLATIONS.goals[g.id as keyof typeof SEED_TRANSLATIONS.goals];
    if (!map) return g;
    const isSeeded =
      g.title === map[otherLang].title ||
      g.title === map[lang].title ||
      (map.legacyTitles as readonly string[]).includes(g.title);
    if (isSeeded) {
      return {
        ...g,
        title: map[lang].title,
        outcome: map[lang].outcome,
        milestones: g.milestones.map((m) => {
          const msTitle =
            map[lang].milestones[m.id as keyof typeof map['ru']['milestones']];
          return msTitle ? { ...m, title: msTitle } : m;
        }),
      };
    }
    return g;
  });

  const journal = workspace.journal.map((j) => {
    const map = SEED_TRANSLATIONS.journal[j.id as keyof typeof SEED_TRANSLATIONS.journal];
    if (!map) return j;
    if (
      j.id === 'journal-1' ||
      j.id === 'journal-2' ||
      j.wentWell === map[otherLang].wentWell ||
      j.wentWell === map[lang].wentWell
    ) {
      return {
        ...j,
        wentWell: map[lang].wentWell,
        didNotWork: map[lang].didNotWork,
        why: map[lang].why,
        improveTomorrow: map[lang].improveTomorrow,
      };
    }
    return j;
  });

  return {
    ...workspace,
    habits,
    tasks,
    goals,
    journal,
  };
}

export function createInitialWorkspaceState(
  _uid?: string,
  _todayIso?: string,
  _lang: 'ru' | 'en' = 'ru'
): WorkspaceState {
  return {
    habits: [],
    tasks: [],
    goals: [],
    journal: [],
    recoveryHistory: [],
  };
}

export function createTestFixtureWorkspace(
  uid: string,
  todayIso: string,
  lang: 'ru' | 'en' = 'ru'
): WorkspaceState {
  const nowIso = new Date().toISOString();
  const days14 = getLastNDaysIso(todayIso, 14);

  const deepWorkLogs: Habit['logs'] = {};
  const mobilityLogs: Habit['logs'] = {};
  const readingLogs: Habit['logs'] = {};
  const eveningShutdownLogs: Habit['logs'] = {};

  days14.forEach((dIso, idx) => {
    if (dIso === todayIso) return;
    if (idx !== 4 && idx !== 9) {
      deepWorkLogs[dIso] = {
        date: dIso,
        state: 'completed',
        timestamp: nowIso,
      };
    } else if (idx === 9) {
      deepWorkLogs[dIso] = {
        date: dIso,
        state: 'skipped',
        skipReason: 'Длительный перелёт — осознанный пропуск',
        timestamp: nowIso,
      };
    }

    if (idx >= 2) {
      mobilityLogs[dIso] = {
        date: dIso,
        state: 'completed',
        timestamp: nowIso,
      };
    }

    if (idx <= 10 && idx % 2 === 0) {
      readingLogs[dIso] = {
        date: dIso,
        state: 'completed',
        timestamp: nowIso,
      };
    }

    if (idx !== 5 && idx !== 11 && idx !== 12) {
      eveningShutdownLogs[dIso] = {
        date: dIso,
        state: 'completed',
        timestamp: nowIso,
      };
    }
  });

  mobilityLogs[todayIso] = {
    date: todayIso,
    state: 'completed',
    timestamp: nowIso,
  };

  const goals: Goal[] = [
    {
      id: 'goal-architecture-v1',
      uid,
      title: 'Выстроить автономный режим глубокой работы (4 часа в день без шума)',
      outcome: 'Ежедневный утренний блок глубокой концентрации до 12:00 и жёсткое закрытие рабочих коммуникаций в 21:30.',
      targetDate: getOffsetDateIso(todayIso, 30),
      status: 'in_progress',
      progress: 60,
      milestones: [
        { id: 'ms-1', title: 'Убрать телефон и уведомления из утреннего рабочего контура', completed: true },
        { id: 'ms-2', title: 'Выдержать 14 дней утренних 90-минутных сессий подряд', completed: true },
        { id: 'ms-3', title: 'Внедрить протокол минимального дня на случай перегрузок', completed: true },
        { id: 'ms-4', title: 'Сократить операционные созвоны до двух раз в неделю', completed: false },
        { id: 'ms-5', title: 'Закрепить стабильный 4-часовой ритм глубокого фокуса', completed: false },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'goal-physical-endurance',
      uid,
      title: 'Сформировать устойчивый физический ритм (1000м на воде)',
      outcome: 'Три тренировки в неделю и ежедневная утренняя мобилизация суставов без выгорания и пропусков более 2 дней.',
      targetDate: getOffsetDateIso(todayIso, 45),
      status: 'in_progress',
      progress: 50,
      milestones: [
        { id: 'ms-201', title: 'Стабилизировать утренний подъём и разминку 14 дней подряд', completed: true },
        { id: 'ms-202', title: 'Выйти на темп 1:55/100м на дистанции 800м', completed: true },
        { id: 'ms-203', title: 'Проплыть 1000м свободным стилем с ровным дыханием', completed: false },
        { id: 'ms-204', title: 'Закрепить недельный цикл восстановления', completed: false },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const habits: Habit[] = [
    {
      id: 'habit-deep-work',
      uid,
      title: '90 минут глубокой фокусировки до проверки почты',
      description: 'Работа над главным архитектурным приоритетом дня без мессенджеров и уведомлений.',
      minimumAction: '25 минут одного непрерывного рабочего блока по таймеру.',
      category: 'craft',
      frequency: 'weekdays',
      targetPerWeek: 5,
      status: 'active',
      linkedGoalId: 'goal-architecture-v1',
      logs: deepWorkLogs,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'habit-mobility',
      uid,
      title: 'Утренняя суставная разминка и холодная вода',
      description: '15 минут работы с плечевым поясом, грудным отделом и дыханием перед началом дня.',
      minimumAction: '3 минуты разминки плеч и 10 глубоких вдохов.',
      category: 'body',
      frequency: 'daily',
      targetPerWeek: 7,
      status: 'active',
      linkedGoalId: 'goal-physical-endurance',
      logs: mobilityLogs,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'habit-reading',
      uid,
      title: 'Чтение профессиональной и философской литературы (30 стр.)',
      description: 'Анализ сложных текстов с фиксацией одного структурного тезиса в заметках.',
      minimumAction: 'Прочитать 5 страниц перед сном без экрана телефона.',
      category: 'mind',
      frequency: 'daily',
      targetPerWeek: 7,
      status: 'active',
      logs: readingLogs,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'habit-shutdown',
      uid,
      title: 'Вечерний аудит дня и закрытие рабочих вкладок в 21:30',
      description: 'Фиксация трёх главных задач на завтра и полный выход из цифрового шума.',
      minimumAction: 'Записать одну главную задачу на завтра и убрать ноутбук.',
      category: 'order',
      frequency: 'daily',
      targetPerWeek: 7,
      status: 'active',
      linkedGoalId: 'goal-architecture-v1',
      logs: eveningShutdownLogs,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const tasks: Task[] = [
    {
      id: 'task-1',
      uid,
      title: 'Стратегический блок (90 мин): завершить архитектуру ключевого проекта',
      notes: 'Полная изоляция от мессенджеров и почты до фиксации итогового документа.',
      priority: 'high',
      category: 'deep-work',
      dueDate: todayIso,
      completed: false,
      goalId: 'goal-architecture-v1',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'task-2',
      uid,
      title: 'Интервальная сессия в бассейне: 8x100м на технику гребка',
      notes: 'Контроль высокого локтя и спокойного выдоха в воду.',
      priority: 'medium',
      category: 'health',
      dueDate: todayIso,
      completed: false,
      goalId: 'goal-physical-endurance',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'task-3',
      uid,
      title: 'Разобрать рабочие заметки и закрыть недельный план',
      notes: 'Отсечь второстепенные обязательства и оставить максимум 3 приоритета.',
      priority: 'low',
      category: 'operations',
      dueDate: getOffsetDateIso(todayIso, -1),
      completed: false,
      goalId: 'none',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'task-4',
      uid,
      title: 'Силовой и восстановительный протокол: грудной отдел и плечевой пояс',
      notes: 'Мобилизация после нагрузок на воде и 20 минут спокойного восстановления.',
      priority: 'high',
      category: 'health',
      dueDate: getOffsetDateIso(todayIso, -2),
      completed: true,
      completedAt: nowIso,
      goalId: 'goal-physical-endurance',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const journal: JournalEntry[] = [
    {
      id: 'journal-1',
      uid,
      date: getOffsetDateIso(todayIso, -1),
      wentWell: 'Удалось удержать 90 минут глубокой концентрации утром и завершить базовую структуру базы данных.',
      didNotWork: 'Вечером затянулся рабочий созвон, из-за чего пропустил чтение и поздно закрыл ноутбук.',
      why: 'Не поставил жёсткий лимит времени на вечернее обсуждение второстепенных деталей.',
      improveTomorrow: 'Перенести все обсуждения на первую половину дня до 16:00 и выполнить хотя бы минимальный порог чтения (5 страниц).',
      mood: 'steady',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'journal-2',
      uid,
      date: getOffsetDateIso(todayIso, -3),
      wentWell: 'Отличная тренировка в воде — ровный ритм дыхания, после бассейна высокая ясность мыслей.',
      didNotWork: 'Слишком много мелких операционных задач в списке на день создали ощущение распыления.',
      why: 'Попытался закрыть недельный бэклог за один вторник вместо выбора 2-3 ключевых действий.',
      improveTomorrow: 'Ограничивать список активных задач на день максимум тремя пунктами высокого приоритета.',
      mood: 'focused',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  return localizeWorkspaceSeedItems(
    {
      habits,
      tasks,
      goals,
      journal,
      recoveryHistory: [],
    },
    lang
  );
}
