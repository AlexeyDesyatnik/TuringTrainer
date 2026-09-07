import { create } from 'zustand'

import { tasks } from '../data/tasks'
import type { AttemptStats, SkillStatus, StoredProgress } from '../types/progress'
import type { Task } from '../types/task'

export const PROGRESS_SCHEMA_VERSION = 1
export const PROGRESS_STORAGE_KEY = 'turing-trainer-progress'
export const MASTERY_TASK_THRESHOLD = 2

interface ProgressState extends StoredProgress {
  recordAttempt: (attempt: AttemptStats) => void
  clearProgress: () => void
}

const initialProgress = loadProgress(getBrowserStorage())

export const useProgressStore = create<ProgressState>((set) => ({
  ...initialProgress,

  recordAttempt: (attempt) => {
    set((state) => {
      const progress: StoredProgress = {
        schemaVersion: PROGRESS_SCHEMA_VERSION,
        attempts: [...state.attempts, attempt],
      }
      saveProgress(getBrowserStorage(), progress)
      return progress
    })
  },

  clearProgress: () => {
    const progress = emptyProgress()
    const storage = getBrowserStorage()
    try {
      storage?.removeItem(PROGRESS_STORAGE_KEY)
    } catch {
      // Storage may be blocked; in-memory progress still remains usable.
    }
    set(progress)
  },
}))

export function loadProgress(storage: Storage | null): StoredProgress {
  if (storage === null) return emptyProgress()

  try {
    const raw = storage.getItem(PROGRESS_STORAGE_KEY)
    if (raw === null) return emptyProgress()
    return parseProgress(JSON.parse(raw))
  } catch {
    return emptyProgress()
  }
}

export function parseProgress(value: unknown): StoredProgress {
  if (!isRecord(value) || value.schemaVersion !== PROGRESS_SCHEMA_VERSION) {
    return emptyProgress()
  }

  if (!Array.isArray(value.attempts)) return emptyProgress()

  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    attempts: value.attempts.flatMap((attempt) => {
      const parsed = parseAttempt(attempt)
      return parsed === null ? [] : [parsed]
    }),
  }
}

export function getSkillStatus(
  attempts: AttemptStats[],
  skill: string,
): SkillStatus | 'not-started' {
  const taskIds = new Set(
    tasks.filter((task) => task.skills.includes(skill)).map((task) => task.id),
  )
  const relevant = attempts.filter(
    (attempt) => attempt.mode === 'learning' && taskIds.has(attempt.taskId),
  )

  if (relevant.length === 0) return 'not-started'

  const independentTaskIds = new Set(
    relevant
      .filter((attempt) => attempt.correct && attempt.hintsUsed === 0)
      .map((attempt) => attempt.taskId),
  )

  if (independentTaskIds.size >= MASTERY_TASK_THRESHOLD) return 'mastered'
  if (independentTaskIds.size > 0) return 'independent'
  if (relevant.some((attempt) => attempt.correct)) return 'solves'
  return 'attempted'
}

export function getRecommendedTask(attempts: AttemptStats[]): Task | null {
  const learningAttempts = attempts.filter((attempt) => attempt.mode === 'learning')
  const solvedTaskIds = new Set(
    learningAttempts.filter((attempt) => attempt.correct).map((attempt) => attempt.taskId),
  )
  const independentTaskIds = new Set(
    learningAttempts
      .filter((attempt) => attempt.correct && attempt.hintsUsed === 0)
      .map((attempt) => attempt.taskId),
  )

  return tasks.find((task) => !solvedTaskIds.has(task.id))
    ?? tasks.find((task) => !independentTaskIds.has(task.id))
    ?? null
}

export function getNextTask(
  currentTask: Task,
  attempts: AttemptStats[],
  mode: AttemptStats['mode'],
): Task | null {
  const solvedTaskIds = new Set(
    attempts
      .filter((attempt) => attempt.mode === mode && attempt.correct)
      .map((attempt) => attempt.taskId),
  )
  const unresolved = tasks.filter(
    (task) => task.id !== currentTask.id && !solvedTaskIds.has(task.id),
  )
  const primarySkill = currentTask.skills[0]

  return unresolved.find((task) => primarySkill !== undefined && task.skills.includes(primarySkill))
    ?? unresolved.find((task) => task.level === currentTask.level)
    ?? unresolved[0]
    ?? null
}

function saveProgress(storage: Storage | null, progress: StoredProgress): void {
  try {
    storage?.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // A full or blocked storage must not break task submission.
  }
}

function parseAttempt(value: unknown): AttemptStats | null {
  if (!isRecord(value)) return null
  if (typeof value.taskId !== 'string' || value.taskId === '') return null
  if (value.mode !== 'learning' && value.mode !== 'exam') return null
  if (typeof value.startedAt !== 'string' || Number.isNaN(Date.parse(value.startedAt))) return null
  if (!isNonNegativeNumber(value.durationMs)) return null
  if (typeof value.correct !== 'boolean') return null
  if (!isNonNegativeInteger(value.hintsUsed)) return null
  if (!isNonNegativeInteger(value.stepsExecuted)) return null
  if (
    value.simulationUsage !== 'none'
    && value.simulationUsage !== 'partial'
    && value.simulationUsage !== 'full'
  ) return null
  if (!Array.isArray(value.errors) || !value.errors.every((error) => typeof error === 'string')) {
    return null
  }

  return {
    taskId: value.taskId,
    mode: value.mode,
    startedAt: value.startedAt,
    durationMs: value.durationMs,
    correct: value.correct,
    hintsUsed: value.hintsUsed,
    stepsExecuted: value.stepsExecuted,
    simulationUsage: value.simulationUsage,
    errors: [...value.errors],
  }
}

function emptyProgress(): StoredProgress {
  return { schemaVersion: PROGRESS_SCHEMA_VERSION, attempts: [] }
}

function getBrowserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
