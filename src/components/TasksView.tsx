import React, { useState } from 'react';
import { Plus, Check, Edit3, Trash2, Search, X } from 'lucide-react';
import {
  Goal,
  Language,
  Task,
  TaskCategory,
  TaskPriority,
} from '../types/discipline';
import { translations, TranslationKeys } from '../i18n/translations';
import { validateTaskForm } from '../utils/disciplineEngine';

interface TasksViewProps {
  language: Language;
  todayIso: string;
  tasks: Task[];
  goals: Goal[];
  onSaveTask: (
    taskData: Omit<
      Task,
      'id' | 'uid' | 'completed' | 'completedAt' | 'createdAt' | 'updatedAt'
    >,
    existingId?: string
  ) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  language,
  todayIso,
  tasks,
  goals,
  onSaveTask,
  onToggleTask,
  onDeleteTask,
}) => {
  const t = translations[language];
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'completed' | 'overdue'
  >('active');
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>(
    'all'
  );
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate'>('priority');
  const [searchQuery, setSearchQuery] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | undefined>(
    undefined
  );
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [category, setCategory] = useState<TaskCategory>('deep-work');
  const [dueDate, setDueDate] = useState(todayIso);
  const [goalId, setGoalId] = useState('none');
  const [formError, setFormError] = useState<string | null>(null);

  const openCreateForm = () => {
    setEditingTaskId(undefined);
    setTitle('');
    setNotes('');
    setPriority('high');
    setCategory('deep-work');
    setDueDate(todayIso);
    setGoalId('none');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (task: Task) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setNotes(task.notes);
    setPriority(task.priority);
    setCategory(task.category);
    setDueDate(task.dueDate);
    setGoalId(task.goalId || 'none');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errKey = validateTaskForm({ title, dueDate });
    if (errKey) {
      setFormError(t[errKey as TranslationKeys]);
      return;
    }

    onSaveTask(
      {
        title: title.trim(),
        notes: notes.trim(),
        priority,
        category,
        dueDate,
        goalId,
      },
      editingTaskId
    );
    setIsFormOpen(false);
  };

  const getPriorityLabel = (p: TaskPriority) => {
    switch (p) {
      case 'high':
        return t.prioHigh;
      case 'medium':
        return t.prioMedium;
      default:
        return t.prioLow;
    }
  };

  const getCategoryLabel = (c: TaskCategory) => {
    switch (c) {
      case 'deep-work':
        return t.tcatDeepWork;
      case 'operations':
        return t.tcatOperations;
      case 'health':
        return t.tcatHealth;
      case 'learning':
        return t.tcatLearning;
      default:
        return t.tcatPersonal;
    }
  };

  const filteredTasks = tasks
    .filter((task) => {
      if (statusFilter === 'active' && task.completed) return false;
      if (statusFilter === 'completed' && !task.completed) return false;
      if (
        statusFilter === 'overdue' &&
        (task.completed || task.dueDate >= todayIso)
      )
        return false;
      if (categoryFilter !== 'all' && task.category !== categoryFilter)
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          task.title.toLowerCase().includes(q) ||
          task.notes.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (sortBy === 'priority') {
        const pOrder = { high: 0, medium: 1, low: 2 };
        if (pOrder[a.priority] !== pOrder[b.priority]) {
          return pOrder[a.priority] - pOrder[b.priority];
        }
        return a.dueDate.localeCompare(b.dueDate);
      }
      return a.dueDate.localeCompare(b.dueDate);
    });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
            {t.tasksHeaderTitle}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-2xl">
            {t.tasksHeaderDesc}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer inline-flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t.newTaskBtn}</span>
        </button>
      </div>

      {/* Filters, Search & Sort Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status segmented tabs */}
          <div className="inline-flex items-center p-1 bg-[var(--surface)] border border-[var(--border)]">
            {(
              [
                { id: 'active', label: t.filterActive },
                { id: 'overdue', label: t.filterOverdue },
                { id: 'completed', label: t.filterCompleted },
                { id: 'all', label: t.filterAll },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-[var(--background)] text-[var(--text-primary)] border border-[var(--border)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Category select */}
          <select
            aria-label={t.taskFieldCategory}
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as TaskCategory | 'all')
            }
            className="px-3 py-2 text-xs bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)]"
          >
            <option value="all">{t.filterAll}</option>
            <option value="deep-work">{t.tcatDeepWork}</option>
            <option value="operations">{t.tcatOperations}</option>
            <option value="health">{t.tcatHealth}</option>
            <option value="learning">{t.tcatLearning}</option>
            <option value="personal">{t.tcatPersonal}</option>
          </select>

          {/* Sort select */}
          <select
            aria-label="Sort tasks"
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'priority' | 'dueDate')
            }
            className="px-3 py-2 text-xs bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)]"
          >
            <option value="priority">{t.sortByPriority}</option>
            <option value="dueDate">{t.sortByDueDate}</option>
          </select>
        </div>

        {/* Search input */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      {/* Tasks High-Density List */}
      <div className="border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
        {filteredTasks.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              {t.emptyTasks}
            </p>
            <button
              type="button"
              onClick={openCreateForm}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-fg)] cursor-pointer"
            >
              {t.newTaskBtn}
            </button>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isOverdue = !task.completed && task.dueDate < todayIso;
            const linkedGoal = goals.find((g) => g.id === task.goalId);

            return (
              <div
                key={task.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--surface-secondary)]/50 transition-colors"
              >
                <div className="space-y-1.5 min-w-0">
                  {/* Unboxed inline metadata */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular text-[var(--text-secondary)]">
                    <span
                      className={
                        task.priority === 'high'
                          ? 'text-[var(--accent)] font-semibold'
                          : ''
                      }
                    >
                      {getPriorityLabel(task.priority)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{getCategoryLabel(task.category)}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        isOverdue ? 'text-[var(--warning)] font-semibold' : ''
                      }
                    >
                      {task.dueDate}
                    </span>
                    {linkedGoal && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate max-w-[200px]">
                          {linkedGoal.title}
                        </span>
                      </>
                    )}
                  </div>

                  <h3
                    className={`text-base font-semibold ${
                      task.completed
                        ? 'line-through text-[var(--text-secondary)]'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {task.title}
                  </h3>

                  {task.notes && (
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {task.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggleTask(task.id)}
                    aria-label={`${t.habitMarkDone}: ${task.title}`}
                    className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                      task.completed
                        ? 'bg-[var(--success)] text-[#F4F1EA]'
                        : 'bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {task.completed ? t.habitDoneToday : t.habitMarkDone}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditForm(task)}
                    aria-label={`${t.editHabitBtn}: ${task.title}`}
                    className="p-2 border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(task.id)}
                    aria-label={`${t.deleteHabitBtn}: ${task.title}`}
                    className="p-2 border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--danger)] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Task Form Modal */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-form-title"
        >
          <div className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] p-6 sm:p-8 text-[var(--text-primary)] my-8">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <h2
                id="task-form-title"
                className="font-display text-xl font-bold"
              >
                {editingTaskId ? t.taskFormTitleEdit : t.taskFormTitleNew}
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
                  htmlFor="task-title-input"
                  className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                >
                  {t.taskFieldTitle}
                </label>
                <input
                  id="task-title-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.taskFieldTitlePlaceholder}
                  className="w-full px-3.5 py-2 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label
                  htmlFor="task-notes-input"
                  className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                >
                  {t.taskFieldNotes}
                </label>
                <textarea
                  id="task-notes-input"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.taskFieldNotesPlaceholder}
                  className="w-full px-3.5 py-2 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="task-prio-select"
                    className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                  >
                    {t.taskFieldPriority}
                  </label>
                  <select
                    id="task-prio-select"
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as TaskPriority)
                    }
                    className="w-full px-3 py-2 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)]"
                  >
                    <option value="high">{t.prioHigh}</option>
                    <option value="medium">{t.prioMedium}</option>
                    <option value="low">{t.prioLow}</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="task-cat-select"
                    className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                  >
                    {t.taskFieldCategory}
                  </label>
                  <select
                    id="task-cat-select"
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as TaskCategory)
                    }
                    className="w-full px-3 py-2 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)]"
                  >
                    <option value="deep-work">{t.tcatDeepWork}</option>
                    <option value="operations">{t.tcatOperations}</option>
                    <option value="health">{t.tcatHealth}</option>
                    <option value="learning">{t.tcatLearning}</option>
                    <option value="personal">{t.tcatPersonal}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="task-due-input"
                    className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                  >
                    {t.taskFieldDueDate}
                  </label>
                  <input
                    id="task-due-input"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="task-goal-select"
                    className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                  >
                    {t.taskFieldGoal}
                  </label>
                  <select
                    id="task-goal-select"
                    value={goalId}
                    onChange={(e) => setGoalId(e.target.value)}
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

      {/* Delete Confirmation */}
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
                  onDeleteTask(deleteTargetId);
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
