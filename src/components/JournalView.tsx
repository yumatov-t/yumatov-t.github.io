import React, { useState } from 'react';
import { Plus, Edit3, Trash2, X } from 'lucide-react';
import {
  JournalEntry,
  JournalMood,
  Language,
} from '../types/discipline';
import { translations, TranslationKeys } from '../i18n/translations';
import { validateJournalForm } from '../utils/disciplineEngine';

interface JournalViewProps {
  language: Language;
  todayIso: string;
  entries: JournalEntry[];
  onSaveEntry: (
    entryData: Omit<JournalEntry, 'id' | 'uid' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => void;
  onDeleteEntry: (entryId: string) => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
  language,
  todayIso,
  entries,
  onSaveEntry,
  onDeleteEntry,
}) => {
  const t = translations[language];
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | undefined>(
    undefined
  );
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form states
  const [date, setDate] = useState(todayIso);
  const [mood, setMood] = useState<JournalMood>('steady');
  const [wentWell, setWentWell] = useState('');
  const [didNotWork, setDidNotWork] = useState('');
  const [why, setWhy] = useState('');
  const [improveTomorrow, setImproveTomorrow] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const openCreateForm = () => {
    setEditingEntryId(undefined);
    setDate(todayIso);
    setMood('steady');
    setWentWell('');
    setDidNotWork('');
    setWhy('');
    setImproveTomorrow('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (entry: JournalEntry) => {
    setEditingEntryId(entry.id);
    setDate(entry.date);
    setMood(entry.mood);
    setWentWell(entry.wentWell);
    setDidNotWork(entry.didNotWork);
    setWhy(entry.why);
    setImproveTomorrow(entry.improveTomorrow);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errKey = validateJournalForm({ date, wentWell });
    if (errKey) {
      setFormError(t[errKey as TranslationKeys]);
      return;
    }

    onSaveEntry(
      {
        date,
        mood,
        wentWell: wentWell.trim(),
        didNotWork: didNotWork.trim(),
        why: why.trim(),
        improveTomorrow: improveTomorrow.trim(),
      },
      editingEntryId
    );
    setIsFormOpen(false);
  };

  const getMoodLabel = (m: JournalMood) => {
    switch (m) {
      case 'focused':
        return t.moodFocused;
      case 'steady':
        return t.moodSteady;
      case 'strained':
        return t.moodStrained;
      default:
        return t.moodRecovering;
    }
  };

  const sortedEntries = [...entries].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
            {t.journalHeaderTitle}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-2xl">
            {t.journalHeaderDesc}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer inline-flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t.newJournalBtn}</span>
        </button>
      </div>

      {/* Entries List */}
      {sortedEntries.length === 0 ? (
        <div className="p-10 text-center bg-[var(--surface)] border border-[var(--border)] space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            {t.emptyJournal}
          </p>
          <button
            type="button"
            onClick={openCreateForm}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-fg)] cursor-pointer"
          >
            {t.newJournalBtn}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedEntries.map((entry) => (
            <article
              key={entry.id}
              className="p-6 sm:p-8 bg-[var(--surface)] border border-[var(--border)] space-y-5"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-2 text-xs font-mono-tabular text-[var(--text-secondary)]">
                  <span className="text-sm font-bold text-[var(--text-primary)]">
                    {entry.date}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{getMoodLabel(entry.mood)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditForm(entry)}
                    aria-label={`${t.editHabitBtn}: ${entry.date}`}
                    className="p-2 border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(entry.id)}
                    aria-label={`${t.deleteHabitBtn}: ${entry.date}`}
                    className="p-2 border border-[var(--border)] bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--danger)] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-1.5">
                  <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-[var(--text-secondary)]">
                    {t.journalQ1}
                  </h3>
                  <p className="text-[var(--text-primary)] leading-relaxed">
                    {entry.wentWell}
                  </p>
                </div>

                {entry.didNotWork && (
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-[var(--text-secondary)]">
                      {t.journalQ2}
                    </h3>
                    <p className="text-[var(--text-primary)] leading-relaxed">
                      {entry.didNotWork}
                    </p>
                  </div>
                )}

                {entry.why && (
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-[var(--text-secondary)]">
                      {t.journalQ3}
                    </h3>
                    <p className="text-[var(--text-primary)] leading-relaxed">
                      {entry.why}
                    </p>
                  </div>
                )}

                {entry.improveTomorrow && (
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-[var(--accent)]">
                      {t.journalQ4}
                    </h3>
                    <p className="text-[var(--text-primary)] leading-relaxed font-medium">
                      {entry.improveTomorrow}
                    </p>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Journal Form Modal */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="journal-form-title"
        >
          <div className="w-full max-w-xl bg-[var(--surface)] border border-[var(--border)] p-6 sm:p-8 text-[var(--text-primary)] my-8">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <h2
                id="journal-form-title"
                className="font-display text-xl font-bold"
              >
                {editingEntryId
                  ? t.journalFormTitleEdit
                  : t.journalFormTitleNew}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="journal-date-input"
                    className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                  >
                    {t.journalFieldDate}
                  </label>
                  <input
                    id="journal-date-input"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-tabular bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="journal-mood-select"
                    className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                  >
                    {t.journalFieldMood}
                  </label>
                  <select
                    id="journal-mood-select"
                    value={mood}
                    onChange={(e) => setMood(e.target.value as JournalMood)}
                    className="w-full px-3 py-2 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)]"
                  >
                    <option value="focused">{t.moodFocused}</option>
                    <option value="steady">{t.moodSteady}</option>
                    <option value="strained">{t.moodStrained}</option>
                    <option value="recovering">{t.moodRecovering}</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="journal-q1-input"
                  className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                >
                  {t.journalQ1}
                </label>
                <textarea
                  id="journal-q1-input"
                  rows={2}
                  value={wentWell}
                  onChange={(e) => setWentWell(e.target.value)}
                  placeholder={t.journalQ1Placeholder}
                  className="w-full px-3.5 py-2 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label
                  htmlFor="journal-q2-input"
                  className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                >
                  {t.journalQ2}
                </label>
                <textarea
                  id="journal-q2-input"
                  rows={2}
                  value={didNotWork}
                  onChange={(e) => setDidNotWork(e.target.value)}
                  placeholder={t.journalQ2Placeholder}
                  className="w-full px-3.5 py-2 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label
                  htmlFor="journal-q3-input"
                  className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                >
                  {t.journalQ3}
                </label>
                <textarea
                  id="journal-q3-input"
                  rows={2}
                  value={why}
                  onChange={(e) => setWhy(e.target.value)}
                  placeholder={t.journalQ3Placeholder}
                  className="w-full px-3.5 py-2 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label
                  htmlFor="journal-q4-input"
                  className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                >
                  {t.journalQ4}
                </label>
                <textarea
                  id="journal-q4-input"
                  rows={2}
                  value={improveTomorrow}
                  onChange={(e) => setImproveTomorrow(e.target.value)}
                  placeholder={t.journalQ4Placeholder}
                  className="w-full px-3.5 py-2 text-sm bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
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
                  onDeleteEntry(deleteTargetId);
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
