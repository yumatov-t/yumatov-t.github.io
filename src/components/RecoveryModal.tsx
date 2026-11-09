import React from 'react';
import { X } from 'lucide-react';
import { Language, WorkspaceState } from '../types/discipline';
import { translations } from '../i18n/translations';
import { RecoveryDiagnosis } from '../utils/disciplineEngine';

interface RecoveryModalProps {
  isOpen: boolean;
  language: Language;
  diagnosis: RecoveryDiagnosis;
  workspace: WorkspaceState;
  onClose: () => void;
  onApplyProtocol: (
    protocol: 'minimum_viable_day' | 'calibrate_load' | 'reschedule_overdue'
  ) => void;
}

export const RecoveryModal: React.FC<RecoveryModalProps> = ({
  isOpen,
  language,
  diagnosis,
  workspace,
  onClose,
  onApplyProtocol,
}) => {
  const t = translations[language];
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-modal-title"
    >
      <div className="w-full max-w-3xl bg-[var(--surface)] border border-[var(--border)] p-6 sm:p-8 text-[var(--text-primary)] my-8">
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-[var(--border)]">
          <div>
            <p className="text-xs font-mono-tabular uppercase tracking-widest text-[var(--accent)]">
              {t.philosophyMain}
            </p>
            <h2
              id="recovery-modal-title"
              className="font-display text-2xl sm:text-3xl font-bold mt-1"
            >
              {t.recoveryTitle}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-2xl leading-relaxed">
              {t.recoverySubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeBtn}
            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Objective Diagnosis Summary */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-[var(--border)]">
          <div className="p-4 bg-[var(--background)] border border-[var(--border)]">
            <div className="text-xs text-[var(--text-secondary)]">
              {t.recoveryGapsDetected}
            </div>
            <div className="mt-1 font-mono-tabular text-2xl font-semibold">
              {diagnosis.habitsWithGaps.length}
            </div>
            {diagnosis.habitsWithGaps.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
                {diagnosis.habitsWithGaps.map(({ habit, metrics }) => (
                  <li key={habit.id} className="truncate">
                    · {habit.title} ({metrics.consecutiveUnloggedMisses}{' '}
                    {t.daysShort})
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-4 bg-[var(--background)] border border-[var(--border)]">
            <div className="text-xs text-[var(--text-secondary)]">
              {t.recoveryOverdueDetected}
            </div>
            <div className="mt-1 font-mono-tabular text-2xl font-semibold">
              {diagnosis.overdueTasks.length}
            </div>
            {diagnosis.overdueTasks.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
                {diagnosis.overdueTasks.slice(0, 3).map((task) => (
                  <li key={task.id} className="truncate">
                    · {task.title} ({task.dueDate})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Three Non-Punitive Actionable Protocols */}
        <div className="mt-6 space-y-4">
          <div className="p-5 bg-[var(--background)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <h3 className="text-base font-semibold">
                {t.recoveryProtocol1Title}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {t.recoveryProtocol1Desc}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onApplyProtocol('minimum_viable_day')}
              className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {t.recoveryProtocol1Action}
            </button>
          </div>

          <div className="p-5 bg-[var(--background)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <h3 className="text-base font-semibold">
                {t.recoveryProtocol2Title}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {t.recoveryProtocol2Desc}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onApplyProtocol('calibrate_load')}
              className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {t.recoveryProtocol2Action}
            </button>
          </div>

          <div className="p-5 bg-[var(--background)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <h3 className="text-base font-semibold">
                {t.recoveryProtocol3Title}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {t.recoveryProtocol3Desc}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onApplyProtocol('reschedule_overdue')}
              className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {t.recoveryProtocol3Action}
            </button>
          </div>
        </div>

        {/* Recovery Ledger */}
        <div className="mt-6 pt-5 border-t border-[var(--border)]">
          <h4 className="text-xs font-mono-tabular uppercase tracking-wider text-[var(--text-secondary)]">
            {t.recoveryHistoryTitle}
          </h4>
          {workspace.recoveryHistory.length === 0 ? (
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              {t.recoveryEmptyHistory}
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-xs">
              {workspace.recoveryHistory.slice(0, 4).map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-center justify-between py-1.5 border-b border-[var(--border)]"
                >
                  <span>{ev.summary}</span>
                  <span className="font-mono-tabular text-[var(--text-secondary)]">
                    {ev.date}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
