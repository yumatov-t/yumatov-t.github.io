import React from 'react';
import { Language, WorkspaceState } from '../types/discipline';
import { translations } from '../i18n/translations';
import { computeAnalytics } from '../utils/disciplineEngine';

interface AnalyticsViewProps {
  language: Language;
  todayIso: string;
  workspace: WorkspaceState;
  onOpenRecovery: () => void;
}

const WEEKDAY_NAMES: Record<Language, Record<number, string>> = {
  ru: {
    1: 'Пн',
    2: 'Вт',
    3: 'Ср',
    4: 'Чт',
    5: 'Пт',
    6: 'Сб',
    7: 'Вс',
  },
  en: {
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
    6: 'Sat',
    7: 'Sun',
  },
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  language,
  todayIso,
  workspace,
  onOpenRecovery,
}) => {
  const t = translations[language];
  const summary = computeAnalytics(workspace, todayIso);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="pb-6 border-b border-[var(--border)]">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
          {t.analyticsHeaderTitle}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-2xl">
          {t.analyticsHeaderDesc}
        </p>
      </div>

      {/* Top 4 Empirical KPI Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 border border-[var(--border)] bg-[var(--surface)] divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)]">
        <div className="p-5">
          <div className="text-xs text-[var(--text-secondary)]">
            {t.kpiConsistency}
          </div>
          <div className="mt-2 font-mono-tabular text-3xl font-bold">
            {summary.overallHabitRate14d}%
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-[var(--text-secondary)]">
            {t.metricTotalCompletions}
          </div>
          <div className="mt-2 font-mono-tabular text-3xl font-bold">
            {summary.totalHabitCompletions14d}
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-[var(--text-secondary)]">
            {t.metricDocumentedSkips}
          </div>
          <div className="mt-2 font-mono-tabular text-3xl font-bold">
            {summary.totalDocumentedSkips14d}
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-[var(--text-secondary)]">
            {t.metricTaskRate}
          </div>
          <div className="mt-2 font-mono-tabular text-3xl font-bold">
            {summary.taskCompletionRate}%
          </div>
        </div>
      </section>

      {/* 01. 14-Day Habit Execution Trajectory Bar Chart */}
      <section className="p-6 bg-[var(--surface)] border border-[var(--border)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold">{t.chart14DayTitle}</h2>
          <div className="flex items-center gap-4 text-xs font-mono-tabular text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[var(--accent)] inline-block" />
              {t.legendCompleted}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[var(--warning)] inline-block" />
              {t.legendSkipped}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 items-end h-44 pt-4">
          {summary.dailySeries14d.map((day) => {
            const barHeight = Math.max(6, day.rate);
            const labelDay = day.date.slice(8, 10);
            const hasSkip = day.skippedHabits > 0;

            return (
              <div
                key={day.date}
                className="flex flex-col items-center justify-end h-full gap-2"
              >
                <div className="text-[10px] font-mono-tabular text-[var(--text-secondary)]">
                  {day.rate}%
                </div>
                <div className="w-full h-28 bg-[var(--background)] border border-[var(--border)] flex flex-col justify-end overflow-hidden">
                  <div
                    className={`w-full transition-all duration-300 ${
                      hasSkip && day.completedHabits === 0
                        ? 'bg-[var(--warning)]'
                        : 'bg-[var(--accent)]'
                    }`}
                    style={{ height: `${barHeight}%` }}
                  />
                </div>
                <div className="text-[11px] font-mono-tabular text-[var(--text-secondary)]">
                  {labelDay}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Two-Column Breakdown: Weekday Performance & Resilient vs Strained Habits */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 02. Weekday Consistency Distribution (5 cols) */}
        <section className="lg:col-span-5 p-6 bg-[var(--surface)] border border-[var(--border)] space-y-5">
          <h2 className="text-lg font-semibold pb-3 border-b border-[var(--border)]">
            {t.chartWeekdayTitle}
          </h2>
          <div className="space-y-3">
            {summary.weekdayPerformance.map((item) => (
              <div key={item.weekdayIndex} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono-tabular">
                  <span className="font-semibold">
                    {WEEKDAY_NAMES[language][item.weekdayIndex]}
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    {item.completionRate}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[var(--background)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--text-primary)] transition-all duration-300"
                    style={{ width: `${item.completionRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 03 & 04. Resilient Habits & Friction Zones (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <section className="p-6 bg-[var(--surface)] border border-[var(--border)] space-y-4">
            <h2 className="text-lg font-semibold pb-3 border-b border-[var(--border)]">
              {t.resilientHabitsTitle}
            </h2>
            <div className="divide-y divide-[var(--border)]">
              {summary.mostResilientHabits.map(({ habit, rate, chain }) => (
                <div
                  key={habit.id}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {habit.title}
                    </div>
                    <div className="text-xs font-mono-tabular text-[var(--text-secondary)]">
                      {t.habitChainLabel} {chain} {t.daysShort}
                    </div>
                  </div>
                  <div className="font-mono-tabular text-lg font-bold text-[var(--success)] shrink-0">
                    {rate}%
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="p-6 bg-[var(--surface)] border border-[var(--border)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold">{t.strainedHabitsTitle}</h2>
              <button
                type="button"
                onClick={onOpenRecovery}
                className="text-xs font-mono-tabular underline text-[var(--accent)] cursor-pointer"
              >
                {t.utilityOpenRecovery} →
              </button>
            </div>
            {summary.strainedHabits.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">
                {t.noStrainedHabits}
              </p>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {summary.strainedHabits.map(({ habit, rate, misses }) => (
                  <div
                    key={habit.id}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {habit.title}
                      </div>
                      <div className="text-xs font-mono-tabular text-[var(--text-secondary)]">
                        {t.habitMinActionPrefix} {habit.minimumAction}
                      </div>
                    </div>
                    <div className="text-right font-mono-tabular shrink-0">
                      <div className="text-sm font-bold text-[var(--warning)]">
                        {rate}%
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        -{misses} {t.daysShort}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
