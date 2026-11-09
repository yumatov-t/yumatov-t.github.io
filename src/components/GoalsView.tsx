import React, { useState } from 'react';
import { Plus, Check, Edit3, Trash2, X } from 'lucide-react';
import {
  Goal,
  GoalMilestone,
  GoalStatus,
  Habit,
  Language,
  Task,
} from '../types/discipline';
import { translations, TranslationKeys } from '../i18n/translations';
import { getOffsetDateIso, validateGoalForm } from '../utils/disciplineEngine';

interface GoalsViewProps {
  language: Language;
  todayIso: string;
  goals: Goal[];
  habits: Habit[];
  tasks: Task[];
  onSaveGoal: (
    goalData: Omit<Goal, 'id' | 'uid' | 'progress' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => void;
  onToggleMilestone: (goalId: string, milestoneId: string) => void;
  onAddMilestoneInline: (goalId: string, title: string) => void;
  onDeleteGoal: (goalId: string) => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  language,
  todayIso,
  goals,
  habits,
  tasks,
  onSaveGoal,
  onToggleMilestone,
  onAddMilestoneInline,
  onDeleteGoal,
}) => {
  const t = translations[language];
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | undefined>(
    undefined
  );
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [inlineMilestoneInputs, setInlineMilestoneInputs] = useState<
    Record<string, string>
  >({});

  // Form states
  const [title, setTitle] = useState('');
  const [outcome, setOutcome] = useState('');
  const [targetDate, setTargetDate] = useState(getOffsetDateIso(todayIso, 30));
  const [status, setStatus] = useState<GoalStatus>('in_progress');
  const [milestones, setMilestones] = useState<GoalMilestone[]>([]);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const openCreateForm = () => {
    setEditingGoalId(undefined);
    setTitle('');
    setOutcome('');
    setTargetDate(getOffsetDateIso(todayIso, 30));
    setStatus('in_progress');
    setMilestones([]);
    setNewMilestoneTitle('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setTitle(goal.title);
    setOutcome(goal.outcome);
    setTargetDate(goal.targetDate);
    setStatus(goal.status);
    setMilestones([...goal.milestones]);
    setNewMilestoneTitle('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleAddDraftMilestone = () => {
    if (!newMilestoneTitle.trim()) return;
    setMilestones((prev) => [
      ...prev,
      {
        id: `ms_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: newMilestoneTitle.trim(),
        completed: false,
      },
    ]);
    setNewMilestoneTitle('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errKey = validateGoalForm({ title, outcome, targetDate });
    if (errKey) {
      setFormError(t[errKey as TranslationKeys]);
      return;
    }

    const finalMilestones = [...milestones];
    if (newMilestoneTitle.trim()) {
      finalMilestones.push({
        id: `ms_${Date.now()}`,
        title: newMilestoneTitle.trim(),
        completed: false,
      });
    }

    onSaveGoal(
      {
        title: title.trim(),
        outcome: outcome.trim(),
        targetDate,
        status,
        milestones: finalMilestones,
      },
      editingGoalId
    );
    setIsFormOpen(false);
  };

  const getStatusLabel = (st: GoalStatus) => {
    switch (st) {
      case 'in_progress':
        return t.gstatusInProgress;
      case 'at_risk':
        return t.gstatusAtRisk;
      case 'achieved':
        return t.gstatusAchieved;
      default:
        return t.gstatusPaused;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
            {t.goalsHeaderTitle}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-2xl">
            {t.goalsHeaderDesc}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer inline-flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t.newGoalBtn}</span>
        </button>
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="p-10 text-center bg-[var(--surface)] border border-[var(--border)] space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">{t.emptyGoals}</p>
          <button
            type="button"
            onClick={openCreateForm}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-fg)] cursor-pointer"
          >
            {t.newGoalBtn}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {goals.map((goal) => {
            const linkedHabits = habits.filter(
              (h) => h.linkedGoalId === goal.id
            );
            const linkedTasks = tasks.filter((tk) => tk.goalId === goal.id);
            const inlineText = inlineMilestoneInputs[goal.id] || '';

            return (
              <div
                key={goal.id}
                className="p-6 bg-[var(--surface)] border border-[var(--border)] flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular text-[var(--text-secondary)]">
                        <span>{getStatusLabel(goal.status)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{goal.targetDate}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[var(--text-primary)] font-semibold">
                          {goal.progress}%
                        </span>
                      </div>
                      <h2 className="text-xl font-bold">{goal.title}</h2>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditForm(goal)}
                        aria-label={`${t.editHabitBtn}: ${goal.title}`}
                        className="p-2 border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTargetId(goal.id)}
                        aria-label={`${t.deleteHabitBtn}: ${goal.title}`}
                        className="p-2 border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--danger)] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {goal.outcome}
                  </p>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-[var(--background)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] transition-all duration-300"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>

                  {/* Interactive Milestones */}
                  <div className="pt-3 border-t border-[var(--border)] space-y-2">
                    <div className="text-xs font-mono-tabular uppercase tracking-wider text-[var(--text-secondary)]">
                      {t.goalFieldMilestones}
                    </div>
                    <ul className="space-y-1.5">
                      {goal.milestones.map((ms) => (
                        <li key={ms.id}>
                          <button
                            type="button"
                            onClick={() => onToggleMilestone(goal.id, ms.id)}
                            className="w-full flex items-center gap-2.5 text-left py-1 text-xs hover:text-[var(--accent)] transition-colors cursor-pointer"
                          >
                            <span
                              className={`w-4 h-4 border flex items-center justify-center shrink-0 ${
                                ms.completed
                                  ? 'bg-[var(--success)] border-[var(--success)] text-[#F4F1EA]'
                                  : 'border-[var(--border)] bg-[var(--background)]'
                              }`}
                            >
                              {ms.completed && <Check className="w-3 h-3" />}
                            </span>
                            <span
                              className={
                                ms.completed
                                  ? 'line-through text-[var(--text-secondary)]'
                                  : 'text-[var(--text-primary)]'
                              }
                            >
                              {ms.title}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>

                    {/* Inline add milestone */}
                    <div className="pt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={inlineText}
                        onChange={(e) =>
                          setInlineMilestoneInputs((prev) => ({
                            ...prev,
                            [goal.id]: e.target.value,
                          }))
                        }
                        placeholder={t.goalAddMilestonePlaceholder}
                        aria-label={`${t.goalAddMilestoneBtn}: ${goal.title}`}
                        className="flex-1 px-3 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!inlineText.trim()) return;
                          onAddMilestoneInline(goal.id, inlineText.trim());
                          setInlineMilestoneInputs((prev) => ({
                            ...prev,
                            [goal.id]: '',
                          }));
                        }}
                        aria-label={t.goalAddMilestoneBtn}
                        className="px-3 py-1.5 text-xs font-medium border border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent)] cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Linked Habits & Tasks count footer */}
                <div className="pt-4 border-t border-[var(--border)] flex items-center gap-3 text-xs font-mono-tabular text-[var(--text-secondary)]">
                  <span>
                    {t.linkedHabitsCount} {linkedHabits.length}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {t.linkedTasksCount} {linkedTasks.length}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Goal Modal */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="goal-form-title"
        >
          <div className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] p-6 sm:p-8 text-[var(--text-primary)] my-8">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <h2
                id="goal-form-title"
                className="font-display text-xl font-bold"
              >
                {editingGoalId ? t.goalFormTitleEdit : t.goalFormTitleNew}
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
                  htmlFor="goal-title-input"
                  className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                >
                  {t.goalFieldTitle}
                </label>
                <input
                  id="goal-title-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.goalFieldTitlePlaceholder}
                  className="w-full px-3.5 py-2 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label
                  htmlFor="goal-outcome-input"
                  className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                >
                  {t.goalFieldOutcome}
                </label>
                <textarea
                  id="goal-outcome-input"
                  rows={2}
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder={t.goalFieldOutcomePlaceholder}
                  className="w-full px-3.5 py-2 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="goal-date-input"
                    className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                  >
                    {t.goalFieldTargetDate}
                  </label>
                  <input
                    id="goal-date-input"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="goal-status-select"
                    className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                  >
                    {t.goalFieldStatus}
                  </label>
                  <select
                    id="goal-status-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as GoalStatus)}
                    className="w-full px-3 py-2 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)]"
                  >
                    <option value="in_progress">{t.gstatusInProgress}</option>
                    <option value="at_risk">{t.gstatusAtRisk}</option>
                    <option value="achieved">{t.gstatusAchieved}</option>
                    <option value="paused">{t.gstatusPaused}</option>
                  </select>
                </div>
              </div>

              {/* Milestones editor */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  {t.goalFieldMilestones}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMilestoneTitle}
                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                    placeholder={t.goalAddMilestonePlaceholder}
                    className="flex-1 px-3 py-2 text-xs bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)]"
                  />
                  <button
                    type="button"
                    onClick={handleAddDraftMilestone}
                    className="px-3 py-2 text-xs font-medium border border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent)] cursor-pointer whitespace-nowrap"
                  >
                    {t.goalAddMilestoneBtn}
                  </button>
                </div>

                {milestones.length > 0 && (
                  <ul className="space-y-1.5 pt-2">
                    {milestones.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between text-xs px-3 py-1.5 bg-[var(--background)] border border-[var(--border)]"
                      >
                        <span>{m.title}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setMilestones((prev) =>
                              prev.filter((item) => item.id !== m.id)
                            )
                          }
                          className="text-[var(--text-secondary)] hover:text-[var(--danger)] cursor-pointer"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs border border-[var(--border)] bg-[var(--background)] cursor-pointer"
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

      {/* Delete Goal Confirmation */}
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
                  onDeleteGoal(deleteTargetId);
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
