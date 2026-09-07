import { beforeEach, describe, expect, it } from 'vitest'

import type { AttemptStats } from '../types/progress'
import {
  getSkillStatus,
  loadProgress,
  MASTERY_TASK_THRESHOLD,
  parseProgress,
  PROGRESS_SCHEMA_VERSION,
  PROGRESS_STORAGE_KEY,
  useProgressStore,
} from './progressStore'

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
