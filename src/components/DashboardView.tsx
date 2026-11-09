import React, { useEffect, useState } from 'react';
import { Check, ArrowUpRight, Play, Pause, RotateCcw } from 'lucide-react';
import {
  Language,
  NavSection,
  UserAccount,
  WorkspaceState,
} from '../types/discipline';
import { translations } from '../i18n/translations';
import {
  calculateHabitMetrics,
  computeAnalytics,
  isHabitScheduledOnDate,
  RecoveryDiagnosis,
} from '../utils/disciplineEngine';

interface DashboardViewProps {
  language: Language;
  todayIso: string;
  user: UserAccount | null;
  workspace: WorkspaceState;
  diagnosis: RecoveryDiagnosis;
  onNavigate: (section: NavSection) => void;
  onToggleHabitToday: (habitId: string) => void;
  onOpenSkipModal: (habitId: string, dateIso: string) => void;
  onToggleTask: (taskId: string) => void;
  onOpenRecovery: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  language,
  todayIso,
  workspace,
  diagnosis,
  onNavigate,
  onToggleHabitToday,
  onOpenSkipModal,
  onToggleTask,
  onOpenRecovery,
}) => {
  const t = translations[language];

  const activeHabits = workspace.habits.filter((h) => h.status === 'active');
  const todayScheduledHabits = activeHabits.filter((h) =>
    isHabitScheduledOnDate(h, todayIso)
  );
  const completedTodayCount = todayScheduledHabits.filter(
    (h) =>
      h.logs[todayIso]?.state === 'completed' ||
      h.logs[todayIso]?.state === 'skipped'
  ).length;

  const activeTasks = workspace.tasks.filter((task) => !task.completed);
  const priorityTasks = [...activeTasks]
    .sort((a, b) => {
      const prioOrder = { high: 0, medium: 1, low: 2 };
      if (prioOrder[a.priority] !== prioOrder[b.priority]) {
        return prioOrder[a.priority] - prioOrder[b.priority];
      }
      return a.dueDate.localeCompare(b.dueDate);
    })
    .slice(0, 5);

  const avgGoalProgress =
    workspace.goals.length > 0
      ? Math.round(
          workspace.goals.reduce((acc, g) => acc + g.progress, 0) /
            workspace.goals.length
        )
      : 0;

  const analytics = computeAnalytics(workspace, todayIso);

  // Deep Focus Session Timer State (90m / 45m / 25m)
  const [presetMinutes, setPresetMinutes] = useState<number>(90);
  const [secondsLeft, setSecondsLeft] = useState<number>(90 * 60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [selectedFocusHabitId, setSelectedFocusHabitId] = useState<string>(
    () => todayScheduledHabits[0]?.id || ''
  );

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  const handleSelectPreset = (mins: number) => {
    setTimerRunning(false);
    setPresetMinutes(mins);
    setSecondsLeft(mins * 60);
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'body':
        return t.catBody;
      case 'mind':
        return t.catMind;
      case 'craft':
        return t.catCraft;
      case 'order':
        return t.catOrder;
      default:
        return t.catRecovery;
    }
  };

  const getPriorityLabel = (prio: string) => {
    switch (prio) {
      case 'high':
        return t.prioHigh;
      case 'medium':
        return t.prioMedium;
      default:
        return t.prioLow;
    }
  };

  const focusHabit =
    todayScheduledHabits.find((h) => h.id === selectedFocusHabitId) ||
    todayScheduledHabits[0];
  const isFocusHabitDone =
    focusHabit && focusHabit.logs[todayIso]?.state === 'completed';

  return (
    <div className="space-y-10">
      {/* Command Hero + Live Focus & Telemetry Instrument */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pb-8 border-b border-[var(--border)]">
        {/* Left 7 Cols: Editorial Statement & Recovery Status */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono-tabular text-[var(--text-secondary)] uppercase tracking-widest">
              <span>{todayIso}</span>
              <span aria-hidden="true">·</span>
              <span
                className={
                  diagnosis.minimumViableActiveToday
                    ? 'text-[var(--text-primary)] font-semibold'
                    : diagnosis.needsAttention
                    ? 'text-[var(--warning)]'
                    : 'text-[var(--success)]'
                }
              >
                {diagnosis.minimumViableActiveToday
                  ? t.utilityRecoveryActive
                  : diagnosis.needsAttention
                  ? t.utilityRecoveryNeeded
                  : t.utilityRecoveryNominal}
              </span>
            </div>

            <h1
              className="mt-4 font-display text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.08]"
              style={{ textWrap: 'balance' }}
            >
              {t.philosophyMain}
            </h1>

            <p className="mt-4 text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl leading-relaxed">
              {t.dashboardSubtitle}
            </p>
          </div>

          {/* Adaptive Recovery Protocol Module */}
          <div className="p-5 sm:p-6 bg-[var(--surface)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="text-xs font-mono-tabular uppercase tracking-widest text-[var(--text-secondary)]">
                {t.sectionRecoveryBanner}
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed">
                {diagnosis.needsAttention
                  ? `${t.recoveryGapsDetected}: ${diagnosis.habitsWithGaps.length} · ${t.recoveryOverdueDetected}: ${diagnosis.overdueTasks.length}`
                  : t.recoveryAllGood}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenRecovery}
              className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {t.utilityOpenRecovery} →
            </button>
          </div>
        </div>

        {/* Right 5 Cols: Deep Focus Session Instrument + 14-Day Rhythm Matrix */}
        <div className="lg:col-span-5 p-6 bg-[var(--surface)] border border-[var(--border)] flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
              <span className="text-xs font-mono-tabular uppercase tracking-widest text-[var(--text-secondary)]">
                {language === 'ru' ? 'ФОКУС-СЕССИЯ' : 'FOCUS SESSION'}
              </span>
              <div className="inline-flex items-center gap-1">
                {[25, 45, 90].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleSelectPreset(mins)}
                    className={`px-2 py-0.5 text-[11px] font-mono-tabular border cursor-pointer transition-colors ${
                      presetMinutes === mins
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)] font-semibold'
                        : 'border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Timer Display & Controls */}
            <div className="flex items-center justify-between gap-4">
              <div className="font-mono-tabular text-4xl sm:text-5xl font-bold tracking-tight">
                {formatTimer(secondsLeft)}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTimerRunning((prev) => !prev)}
                  className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  {timerRunning ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>{language === 'ru' ? 'Пауза' : 'Pause'}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{language === 'ru' ? 'Старт' : 'Start'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTimerRunning(false);
                    setSecondsLeft(presetMinutes * 60);
                  }}
                  aria-label="Reset Timer"
                  className="p-2 border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Active Focus Target Selector */}
            {focusHabit && (
              <div className="pt-2 flex items-center justify-between gap-3">
                <select
                  aria-label={language === 'ru' ? 'Привычка в фокусе' : 'Focus habit'}
                  value={focusHabit.id}
                  onChange={(e) => setSelectedFocusHabitId(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] truncate"
                >
                  {todayScheduledHabits.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.title}
                    </option>
                  ))}
                </select>
                {!isFocusHabitDone && (
                  <button
                    type="button"
                    onClick={() => onToggleHabitToday(focusHabit.id)}
                    className="px-3 py-1.5 text-xs font-mono-tabular border border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    ✓ {t.habitMarkDone}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 14-Day Momentum Telemetry Barcode */}
          <div className="pt-4 border-t border-[var(--border)] space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-mono-tabular text-[var(--text-secondary)] uppercase tracking-wider">
              <span>
                {language === 'ru'
                  ? 'ПУЛЬС ПОСЛЕДОВАТЕЛЬНОСТИ (14 ДН.)'
                  : '14-DAY CONSISTENCY PULSE'}
              </span>
              <span className="text-[var(--text-primary)] font-semibold">
                {diagnosis.overallConsistency14d}%
              </span>
            </div>

            <div className="grid grid-cols-14 gap-1.5 items-end h-12 pt-1">
              {analytics.dailySeries14d.map((day) => {
                const heightPct = Math.max(14, day.rate);
                const isToday = day.date === todayIso;
                return (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.rate}%`}
                    className="h-full flex flex-col justify-end"
                  >
                    <div
                      className={`w-full transition-all duration-300 ${
                        day.rate >= 75
                          ? 'bg-[var(--text-primary)]'
                          : day.rate >= 40
                          ? 'bg-[var(--text-secondary)]'
                          : 'bg-[var(--border)]'
                      } ${isToday ? 'ring-1 ring-[var(--accent)]' : ''}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Full-Width 4-Column Tabular KPI Strip */}
      <section
        aria-label="Key Metrics"
        className="grid grid-cols-2 lg:grid-cols-4 border border-[var(--border)] bg-[var(--surface)] divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)]"
      >
        <div className="p-5">
          <div className="text-xs text-[var(--text-secondary)]">
            {t.kpiConsistency}
          </div>
          <div className="mt-2 font-mono-tabular text-3xl font-bold">
            {diagnosis.overallConsistency14d}%
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-[var(--text-secondary)]">
            {t.kpiTodayHabits}
          </div>
          <div className="mt-2 font-mono-tabular text-3xl font-bold">
            {completedTodayCount}{' '}
            <span className="text-sm font-normal text-[var(--text-secondary)]">
              {t.kpiOutOf} {todayScheduledHabits.length}
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-[var(--text-secondary)]">
            {t.kpiActiveTasks}
          </div>
          <div className="mt-2 font-mono-tabular text-3xl font-bold">
            {activeTasks.length}{' '}
            {diagnosis.overdueTasks.length > 0 && (
              <span className="text-xs font-normal text-[var(--warning)]">
                ({diagnosis.overdueTasks.length} {t.kpiOverdue})
              </span>
            )}
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-[var(--text-secondary)]">
            {t.kpiGoalsVelocity}
          </div>
          <div className="mt-2 font-mono-tabular text-3xl font-bold">
            {avgGoalProgress}%
          </div>
        </div>
      </section>

      {/* Main Two-Column Operational Grid: Habits Today & Tasks Today */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* 01. Today's Habits (7 cols) */}
        <section className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <h2 className="text-lg font-semibold tracking-tight">
              {t.sectionTodayHabits}
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('habits')}
              aria-label={`${t.viewAll}: ${t.navHabits}`}
              className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <span>{t.viewAll}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[var(--border)] border border-[var(--border)] bg-[var(--surface)]">
            {todayScheduledHabits.length === 0 ? (
              <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-xs text-[var(--text-secondary)]">
                  {t.emptyHabits}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('habits')}
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  + {t.newHabitBtn}
                </button>
              </div>
            ) : (
              todayScheduledHabits.map((habit) => {
                const todayLog = habit.logs[todayIso];
                const metrics = calculateHabitMetrics(habit, todayIso);
                const isDone = todayLog?.state === 'completed';
                const isSkipped = todayLog?.state === 'skipped';

                return (
                  <div
                    key={habit.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--surface-secondary)]/50 transition-colors"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)] font-mono-tabular">
                        <span>{getCategoryLabel(habit.category)}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {t.habitRateLabel} {metrics.consistencyRate14d}%
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {t.habitChainLabel} {metrics.activeChainDays}{' '}
                          {t.daysShort}
                        </span>
                      </div>

                      <h3
                        className={`text-base font-semibold ${
                          isDone
                            ? 'line-through text-[var(--text-secondary)]'
                            : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {habit.title}
                      </h3>

                      <p className="text-xs text-[var(--text-secondary)]">
                        {diagnosis.minimumViableActiveToday ? (
                          <span className="text-[var(--text-primary)] font-medium">
                            {t.habitMinActionPrefix} {habit.minimumAction}
                          </span>
                        ) : (
                          habit.description
                        )}
                      </p>

                      {isSkipped && todayLog?.skipReason && (
                        <p className="text-xs font-mono-tabular text-[var(--warning)]">
                          {t.habitSkippedToday}: {todayLog.skipReason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleHabitToday(habit.id)}
                        aria-label={`${t.habitMarkDone}: ${habit.title}`}
                        className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                          isDone
                            ? 'bg-[var(--success)] text-[#050506]'
                            : 'bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isDone ? t.habitDoneToday : t.habitMarkDone}</span>
                      </button>

                      {!isDone && (
                        <button
                          type="button"
                          onClick={() => onOpenSkipModal(habit.id, todayIso)}
                          aria-label={`${t.habitMarkSkip}: ${habit.title}`}
                          className="px-3 py-2 text-xs font-medium border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {isSkipped ? t.habitSkippedToday : t.habitMarkSkip}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* 02. Priority Tasks (5 cols) */}
        <section className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <h2 className="text-lg font-semibold tracking-tight">
              {t.sectionTodayTasks}
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('tasks')}
              aria-label={`${t.viewAll}: ${t.navTasks}`}
              className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <span>{t.viewAll}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[var(--border)] border border-[var(--border)] bg-[var(--surface)]">
            {priorityTasks.length === 0 ? (
              <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-xs text-[var(--text-secondary)]">
                  {t.emptyTasks}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('tasks')}
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  + {t.newTaskBtn}
                </button>
              </div>
            ) : (
              priorityTasks.map((task) => {
                const isOverdue = !task.completed && task.dueDate < todayIso;
                return (
                  <div
                    key={task.id}
                    className="p-4 flex items-start justify-between gap-3 hover:bg-[var(--surface-secondary)]/50 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs font-mono-tabular text-[var(--text-secondary)]">
                        <span
                          className={
                            task.priority === 'high'
                              ? 'text-[var(--text-primary)] font-semibold'
                              : ''
                          }
                        >
                          {getPriorityLabel(task.priority)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            isOverdue ? 'text-[var(--warning)] font-semibold' : ''
                          }
                        >
                          {task.dueDate}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-[var(--text-primary)]">
                        {task.title}
                      </div>
                      {task.notes && (
                        <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                          {task.notes}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleTask(task.id)}
                      aria-label={`${t.habitMarkDone}: ${task.title}`}
                      className="px-3 py-1.5 text-xs font-medium border border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {t.habitMarkDone}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* 03. Long-Term Goals Trajectory */}
      <section className="space-y-4 pt-4 border-t border-[var(--border)]">
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-lg font-semibold tracking-tight">
            {t.sectionActiveGoals}
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('goals')}
            aria-label={`${t.viewAll}: ${t.navGoals}`}
            className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <span>{t.viewAll}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {workspace.goals.length === 0 ? (
          <div className="p-6 bg-[var(--surface)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs text-[var(--text-secondary)]">
              {t.emptyGoals}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('goals')}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              + {t.newGoalBtn}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {workspace.goals.map((goal) => (
              <div
                key={goal.id}
                className="p-6 bg-[var(--surface)] border border-[var(--border)] flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono-tabular text-[var(--text-secondary)]">
                    <span>{goal.targetDate}</span>
                    <span>{goal.progress}%</span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold">{goal.title}</h3>
                  <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                    {goal.outcome}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="w-full h-1.5 bg-[var(--background)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] transition-all duration-300"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
