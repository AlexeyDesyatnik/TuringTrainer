import { beforeEach, describe, expect, it } from 'vitest'

import type { AttemptStats } from '../types/progress'
import {
  getNextTask,
  getRecommendedTask,
  getSkillStatus,
  loadProgress,
  MASTERY_TASK_THRESHOLD,
  parseProgress,
  PROGRESS_SCHEMA_VERSION,
  PROGRESS_STORAGE_KEY,
  useProgressStore,
} from './progressStore'
import { tasks } from '../data/tasks'

const baseAttempt: AttemptStats = {
  taskId: 'l1-command-reading-01',
  mode: 'learning',
  startedAt: '2026-09-07T12:00:00.000Z',
  durationMs: 15_000,
  correct: false,
  hintsUsed: 0,
  stepsExecuted: 0,
  simulationUsage: 'none',
  errors: [],
}

describe('хранение прогресса', () => {
  beforeEach(() => useProgressStore.getState().clearProgress())

  it('сохраняет отправленную попытку в localStorage', () => {
    useProgressStore.getState().recordAttempt(baseAttempt)

    expect(useProgressStore.getState().attempts).toEqual([baseAttempt])
    expect(loadProgress(window.localStorage).attempts).toEqual([baseAttempt])
  })

  it('не падает на повреждённом JSON и неизвестной версии', () => {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, '{broken')
    expect(loadProgress(window.localStorage).attempts).toEqual([])

    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({
      schemaVersion: 999,
      attempts: [baseAttempt],
    }))
    expect(loadProgress(window.localStorage).attempts).toEqual([])
  })

  it('сохраняет валидное подмножество массива попыток', () => {
    expect(parseProgress({
      schemaVersion: PROGRESS_SCHEMA_VERSION,
      attempts: [baseAttempt, { ...baseAttempt, durationMs: -1 }, null],
    }).attempts).toEqual([baseAttempt])
  })
})

describe('статус освоения навыка', () => {
  it('использует именованный порог самостоятельных решений разных задач', () => {
    expect(MASTERY_TASK_THRESHOLD).toBe(2)

    const wrong = baseAttempt
    const supported = { ...baseAttempt, correct: true, hintsUsed: 1 }
    const independent = { ...baseAttempt, correct: true }
    const transfer: AttemptStats = {
      ...baseAttempt,
      taskId: 'l1-prediction-01',
      correct: true,
    }
    const examSuccess: AttemptStats = { ...independent, mode: 'exam' }

    expect(getSkillStatus([], 'machine-mechanics')).toBe('not-started')
    expect(getSkillStatus([examSuccess], 'machine-mechanics')).toBe('not-started')
    expect(getSkillStatus([wrong], 'machine-mechanics')).toBe('attempted')
    expect(getSkillStatus([supported], 'machine-mechanics')).toBe('solves')
    expect(getSkillStatus([independent], 'machine-mechanics')).toBe('independent')
    expect(getSkillStatus([independent, transfer], 'machine-mechanics')).toBe('mastered')
  })
})

describe('рекомендации задач', () => {
  it('сначала предлагает нерешённую, затем несамостоятельную задачу', () => {
    expect(getRecommendedTask([])?.id).toBe('l1-command-reading-01')

    const supported = { ...baseAttempt, correct: true, hintsUsed: 1 }
    expect(getRecommendedTask([supported])?.id).toBe('l1-prediction-01')

    const secondSolved: AttemptStats = {
      ...baseAttempt,
      taskId: 'l1-prediction-01',
      correct: true,
    }
    expect(getRecommendedTask([supported, secondSolved])?.id).toBe('l1-command-reading-01')
  })

  it('выбирает следующую нерешённую задачу того же уровня', () => {
    const current = tasks[0]
    if (current === undefined) throw new Error('Нет тестовой задачи')

    expect(getNextTask(current, [], 'learning')?.id).toBe('l1-prediction-01')
    expect(getNextTask(current, [{
      ...baseAttempt,
      taskId: 'l1-prediction-01',
      correct: true,
    }], 'learning')).toBeNull()
  })
})
