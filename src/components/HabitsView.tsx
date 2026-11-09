import React, { useState } from 'react';
import { Plus, Check, Edit3, Trash2, X } from 'lucide-react';
import {
  Goal,
  Habit,
  HabitCategory,
  HabitFrequency,
  HabitStatus,
  Language,
} from '../types/discipline';
import { translations, TranslationKeys } from '../i18n/translations';
import {
  calculateHabitMetrics,
  getLastNDaysIso,
  validateHabitForm,
} from '../utils/disciplineEngine';

interface HabitsViewProps {
  language: Language;
  todayIso: string;
  habits: Habit[];
  goals: Goal[];
  onSaveHabit: (
    habitData: Omit<Habit, 'id' | 'uid' | 'logs' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => void;
  onDeleteHabit: (habitId: string) => void;
  onToggleHabitDate: (habitId: string, dateIso: string) => void;
  onOpenSkipModal: (habitId: string, dateIso: string) => void;
}

export const HabitsView: React.FC<HabitsViewProps> = ({
  language,
  todayIso,
  habits,
  goals,
  onSaveHabit,
  onDeleteHabit,
  onToggleHabitDate,
  onOpenSkipModal,
}) => {
  const t = translations[language];
  const [statusFilter, setStatusFilter] = useState<HabitStatus | 'all'>('active');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | undefined>(
    undefined
  );
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [minimumAction, setMinimumAction] = useState('');
  const [category, setCategory] = useState<HabitCategory>('craft');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [targetPerWeek, setTargetPerWeek] = useState<number>(7);
  const [status, setStatus] = useState<HabitStatus>('active');
  const [linkedGoalId, setLinkedGoalId] = useState<string>('none');
  const [formError, setFormError] = useState<string | null>(null);

  const days14 = getLastNDaysIso(todayIso, 14);

  const openCreateForm = () => {
    setEditingHabitId(undefined);
    setTitle('');
    setDescription('');
    setMinimumAction('');
    setCategory('craft');
    setFrequency('daily');
    setTargetPerWeek(7);
    setStatus('active');
    setLinkedGoalId('none');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (habit: Habit) => {
    setEditingHabitId(habit.id);
    setTitle(habit.title);
    setDescription(habit.description);
    setMinimumAction(habit.minimumAction);
    setCategory(habit.category);
    setFrequency(habit.frequency);
    setTargetPerWeek(habit.targetPerWeek);
    setStatus(habit.status);
    setLinkedGoalId(habit.linkedGoalId || 'none');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errKey = validateHabitForm({
      title,
      description,
      minimumAction,
      targetPerWeek,
    });
    if (errKey) {
      setFormError(t[errKey as TranslationKeys]);
      return;
    }

    onSaveHabit(
      {
        title: title.trim(),
        description: description.trim() || title.trim(),
        minimumAction: minimumAction.trim() || title.trim(),
        category,
        frequency,
        targetPerWeek:
          frequency === 'daily' ? 7 : frequency === 'weekdays' ? 5 : targetPerWeek,
        status,
        linkedGoalId: linkedGoalId === 'none' ? undefined : linkedGoalId,
      },
      editingHabitId
    );
    setIsFormOpen(false);
  };

  const filteredHabits = habits.filter((h) =>
    statusFilter === 'all' ? true : h.status === statusFilter
  );

  const getCategoryLabel = (cat: HabitCategory) => {
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

  const getFrequencyLabel = (freq: HabitFrequency, target: number) => {
    if (freq === 'daily') return t.freqDaily;
    if (freq === 'weekdays') return t.freqWeekdays;
    return `${t.freqWeekly} (${target}/7)`;
  };

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
            {t.habitsHeaderTitle}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-2xl">
            {t.habitsHeaderDesc}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer inline-flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t.newHabitBtn}</span>
        </button>
      </div>

      {/* Interactive Filter Segmented Control + Matrix Legend */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="inline-flex flex-wrap items-center p-1 bg-[var(--surface)] border border-[var(--border)]">
          {(
            [
              { id: 'active', label: t.statusActive },
              { id: 'paused', label: t.statusPaused },
              { id: 'archived', label: t.statusArchived },
              { id: 'all', label: t.filterAll },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 sm:px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-[var(--background)] text-[var(--text-primary)] border border-[var(--border)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono-tabular text-[var(--text-secondary)]">
          <span>{t.matrix14Days}:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[var(--success)] inline-block" />
            {t.legendCompleted}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 border border-[var(--warning)] bg-[var(--warning)]/30 inline-block" />
            {t.legendSkipped}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 border border-[var(--border)] bg-[var(--background)] inline-block" />
            {t.legendMissed}
          </span>
        </div>
      </div>

      {/* Habits List with 14-Day Evidence Matrix */}
      {filteredHabits.length === 0 ? (
        <div className="p-10 text-center bg-[var(--surface)] border border-[var(--border)]">
          <p className="text-sm text-[var(--text-secondary)]">{t.emptyHabits}</p>
          <button
            type="button"
            onClick={openCreateForm}
            className="mt-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-fg)] cursor-pointer"
          >
            {t.newHabitBtn}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHabits.map((habit) => {
            const metrics = calculateHabitMetrics(habit, todayIso);
            const todayLog = habit.logs[todayIso];
            const isTodayDone = todayLog?.state === 'completed';
            const isTodaySkipped = todayLog?.state === 'skipped';

            return (
              <div
                key={habit.id}
                className="p-6 bg-[var(--surface)] border border-[var(--border)] space-y-5"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-1.5 max-w-2xl">
                    {/* Clean unboxed metadata */}
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular text-[var(--text-secondary)]">
                      <span>{getCategoryLabel(habit.category)}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {getFrequencyLabel(habit.frequency, habit.targetPerWeek)}
                      </span>
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

                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                      {habit.title}
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {habit.description}
                    </p>
                    <p className="text-xs font-mono-tabular text-[var(--text-secondary)]">
                      {t.habitMinActionPrefix} {habit.minimumAction}
                    </p>
                  </div>

                  {/* Action Controls */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleHabitDate(habit.id, todayIso)}
                      aria-label={`${t.habitMarkDone}: ${habit.title}`}
                      className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                        isTodayDone
                          ? 'bg-[var(--success)] text-[#F4F1EA]'
                          : 'bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {isTodayDone ? t.habitDoneToday : t.habitMarkDone}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenSkipModal(habit.id, todayIso)}
                      aria-label={`${t.habitMarkSkip}: ${habit.title}`}
                      className="px-3 py-2 text-xs font-medium border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {isTodaySkipped ? t.habitSkippedToday : t.habitMarkSkip}
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditForm(habit)}
                      aria-label={`${t.editHabitBtn}: ${habit.title}`}
                      className="p-2 border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(habit.id)}
                      aria-label={`${t.deleteHabitBtn}: ${habit.title}`}
                      className="p-2 border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 14-Day Interactive Calendar Strip */}
                <div className="pt-4 border-t border-[var(--border)]">
                  <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5">
                    {days14.map((dIso) => {
                      const log = habit.logs[dIso];
                      const dayNum = dIso.slice(8, 10);
                      const isToday = dIso === todayIso;

                      let cellStyle =
                        'bg-[var(--background)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]';
                      if (log?.state === 'completed') {
                        cellStyle =
                          'bg-[var(--success)] border-[var(--success)] text-[#F4F1EA] font-semibold';
                      } else if (log?.state === 'skipped') {
                        cellStyle =
                          'bg-[var(--warning)]/25 border-[var(--warning)] text-[var(--text-primary)]';
                      }

                      return (
                        <button
                          key={dIso}
                          type="button"
                          onClick={() => onToggleHabitDate(habit.id, dIso)}
                          title={
                            log?.skipReason
                              ? `${dIso}: ${log.skipReason}`
                              : dIso
                          }
                          aria-label={`${habit.title} ${dIso}`}
                          className={`h-10 border flex flex-col items-center justify-center font-mono-tabular text-xs transition-colors cursor-pointer ${cellStyle} ${
                            isToday ? 'ring-1 ring-[var(--accent)]' : ''
                          }`}
                        >
                          <span>{dayNum}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Habit Modal */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="habit-form-title"
        >
          <div className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] p-6 sm:p-8 text-[var(--text-primary)] my-8">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <h2
                id="habit-form-title"
                className="font-display text-xl font-bold"
              >
                {editingHabitId ? t.habitFormTitleEdit : t.habitFormTitleNew}
              </h2>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                aria-label={t.closeBtn}
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
              {formError && (
                <div
                  role="alert"
                  className="p-3 text-xs border border-[var(--danger)] text-[var(--danger)] bg-[var(--background)]"
                >
                  {formError}
                </div>
              )}

              <div>
                <label
                  htmlFor="habit-title-input"
                  className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                >
                  {t.habitFieldTitle}
                </label>
                <input
                  id="habit-title-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.habitFieldTitlePlaceholder}
                  className="w-full px-3.5 py-2 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label
                  htmlFor="habit-desc-input"
                  className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                >
                  {t.habitFieldDesc}
                </label>
                <textarea
                  id="habit-desc-input"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.habitFieldDescPlaceholder}
                  className="w-full px-3.5 py-2 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label
                  htmlFor="habit-min-input"
                  className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                >
                  {t.habitFieldMinAction}
                </label>
                <input
                  id="habit-min-input"
                  type="text"
                  value={minimumAction}
                  onChange={(e) => setMinimumAction(e.target.value)}
                  placeholder={t.habitFieldMinActionPlaceholder}
                  className="w-full px-3.5 py-2 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="habit-category-select"
                    className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                  >
                    {t.habitFieldCategory}
                  </label>
                  <select
                    id="habit-category-select"
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as HabitCategory)
                    }
                    className="w-full px-3 py-2 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)]"
                  >
                    <option value="craft">{t.catCraft}</option>
                    <option value="body">{t.catBody}</option>
                    <option value="mind">{t.catMind}</option>
                    <option value="order">{t.catOrder}</option>
                    <option value="recovery">{t.catRecovery}</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="habit-freq-select"
                    className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                  >
                    {t.habitFieldFrequency}
                  </label>
                  <select
                    id="habit-freq-select"
                    value={frequency}
                    onChange={(e) =>
                      setFrequency(e.target.value as HabitFrequency)
                    }
                    className="w-full px-3 py-2 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)]"
                  >
                    <option value="daily">{t.freqDaily}</option>
                    <option value="weekdays">{t.freqWeekdays}</option>
                    <option value="weekly">{t.freqWeekly}</option>
                  </select>
                </div>
              </div>

              {frequency === 'weekly' && (
                <div>
                  <label
                    htmlFor="habit-target-input"
                    className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                  >
                    {t.habitFieldTargetPerWeek} (1-7)
                  </label>
                  <input
                    id="habit-target-input"
                    type="number"
                    min={1}
                    max={7}
                    value={targetPerWeek}
                    onChange={(e) => setTargetPerWeek(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] font-mono-tabular"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="habit-status-select"
                    className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                  >
                    {t.habitFieldStatus}
                  </label>
                  <select
                    id="habit-status-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as HabitStatus)}
                    className="w-full px-3 py-2 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)]"
                  >
                    <option value="active">{t.statusActive}</option>
                    <option value="paused">{t.statusPaused}</option>
                    <option value="archived">{t.statusArchived}</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="habit-goal-select"
                    className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                  >
                    {t.habitFieldLinkedGoal}
                  </label>
                  <select
                    id="habit-goal-select"
                    value={linkedGoalId}
                    onChange={(e) => setLinkedGoalId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)]"
                  >
                    <option value="none">{t.noneOption}</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-[var(--border)] bg-[var(--background)] cursor-pointer"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] cursor-pointer"
                >
                  {t.saveBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] p-6 space-y-4">
            <h3 className="font-display text-lg font-bold">
              {t.deleteConfirmTitle}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {t.deleteConfirmDesc}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 text-xs border border-[var(--border)] bg-[var(--background)] cursor-pointer"
              >
                {t.cancelBtn}
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteHabit(deleteTargetId);
                  setDeleteTargetId(null);
                }}
                className="px-4 py-2 text-xs font-semibold bg-[var(--danger)] text-[#F4F1EA] cursor-pointer"
              >
                {t.confirmDeleteBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
