import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeWorkspaceRecovery,
  applyRecoveryProtocolToWorkspace,
  calculateHabitMetrics,
  computeAnalytics,
  createInitialWorkspaceState,
  createTestFixtureWorkspace,
  getOffsetDateIso,
  localizeWorkspaceSeedItems,
  recalculateGoalProgress,
  validateAuthForm,
  validateHabitForm,
  validateTaskForm,
} from './disciplineEngine';
import { Habit } from '../types/discipline';

test('createInitialWorkspaceState — starts with a completely empty workspace for any user', () => {
  const emptyWs = createInitialWorkspaceState('u-new', '2026-11-09');
  assert.equal(emptyWs.habits.length, 0);
  assert.equal(emptyWs.tasks.length, 0);
  assert.equal(emptyWs.goals.length, 0);
  assert.equal(emptyWs.journal.length, 0);
});

test('calculateHabitMetrics — documented skips preserve active chain and detect recovery need', () => {
  const todayIso = '2026-11-09';
  const yesterday = getOffsetDateIso(todayIso, -1);
  const twoDaysAgo = getOffsetDateIso(todayIso, -2);
  const threeDaysAgo = getOffsetDateIso(todayIso, -3);

  const habit: Habit = {
    id: 'h-test',
    uid: 'u-1',
    title: 'Deep Work 90m',
    description: 'Focus block',
    minimumAction: '25m focus',
    category: 'craft',
    frequency: 'daily',
    targetPerWeek: 7,
    status: 'active',
    logs: {
      [todayIso]: { date: todayIso, state: 'completed', timestamp: todayIso },
      [yesterday]: { date: yesterday, state: 'skipped', skipReason: 'Travel', timestamp: yesterday },
      [twoDaysAgo]: { date: twoDaysAgo, state: 'completed', timestamp: twoDaysAgo },
      [threeDaysAgo]: { date: threeDaysAgo, state: 'completed', timestamp: threeDaysAgo },
    },
    createdAt: todayIso,
    updatedAt: todayIso,
  };

  const metrics = calculateHabitMetrics(habit, todayIso);
  assert.equal(metrics.activeChainDays, 3);
  assert.equal(metrics.skippedCount14d, 1);
  assert.equal(metrics.needsRecovery, false);
});

test('analyzeWorkspaceRecovery & applyRecoveryProtocolToWorkspace — resolves overdue tasks and habit gaps', () => {
  const todayIso = '2026-11-09';
  const ws = createTestFixtureWorkspace('u-1', todayIso);
  const diagnosisBefore = analyzeWorkspaceRecovery(ws, todayIso);

  assert.equal(diagnosisBefore.needsAttention, true);
  assert.ok(diagnosisBefore.habitsWithGaps.length >= 1);
  assert.ok(diagnosisBefore.overdueTasks.length >= 1);

  const afterMinimumDay = applyRecoveryProtocolToWorkspace(ws, 'minimum_viable_day', todayIso);
  assert.equal(afterMinimumDay.minimumViableDayActiveDate, todayIso);
  assert.equal(afterMinimumDay.recoveryHistory.length, 1);

  const afterReschedule = applyRecoveryProtocolToWorkspace(ws, 'reschedule_overdue', todayIso);
  const overdueAfter = afterReschedule.tasks.filter((t) => !t.completed && t.dueDate < todayIso);
  assert.equal(overdueAfter.length, 0);
});

test('computeAnalytics & recalculateGoalProgress — returns accurate non-mocked metrics', () => {
  const todayIso = '2026-11-09';
  const ws = createTestFixtureWorkspace('u-1', todayIso);
  const analytics = computeAnalytics(ws, todayIso);

  assert.equal(analytics.dailySeries14d.length, 14);
  assert.ok(analytics.overallHabitRate14d > 0 && analytics.overallHabitRate14d <= 100);
  assert.equal(analytics.weekdayPerformance.length, 7);

  const goal = ws.goals[0];
  const progress = recalculateGoalProgress(goal, []);
  assert.equal(progress, 60);
});

test('localizeWorkspaceSeedItems — translates seeded items between Russian and English', () => {
  const todayIso = '2026-11-09';
  const wsRu = createTestFixtureWorkspace('u-1', todayIso, 'ru');
  const wsEn = localizeWorkspaceSeedItems(wsRu, 'en');

  assert.equal(wsEn.habits[0].title, '90 minutes of deep architectural focus before email');
  assert.equal(wsEn.tasks[0].title, 'Strategic block (90 min): finalize core project architecture');
  assert.equal(wsEn.goals[0].title, 'Establish autonomous deep work cadence (4 hours/day zero noise)');

  const wsBackToRu = localizeWorkspaceSeedItems(wsEn, 'ru');
  assert.equal(wsBackToRu.habits[0].title, '90 минут глубокой фокусировки до проверки почты');
});

test('form validations reject invalid inputs deterministically', () => {
  assert.equal(
    validateHabitForm({ title: '', description: 'ok', minimumAction: 'ok', targetPerWeek: 5 }),
    'errorHabitTitleRequired'
  );
  assert.equal(
    validateTaskForm({ title: 'Valid task', dueDate: 'invalid-date' }),
    'errorTaskDueDateInvalid'
  );
  assert.equal(
    validateAuthForm({ mode: 'register', email: 'bad-email', password: '123', displayName: 'A' }),
    'errorEmailInvalid'
  );
  assert.equal(
    validateAuthForm({ mode: 'login', email: 'user@discipline.app', password: 'secretPassword' }),
    null
  );
});
