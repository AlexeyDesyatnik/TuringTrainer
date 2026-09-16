import { create } from 'zustand'

import { tasks } from '../data/tasks'
import type { AttemptStats, SkillStatus, StoredProgress } from '../types/progress'
import type { Task } from '../types/task'

export const PROGRESS_SCHEMA_VERSION = 1
export const PROGRESS_STORAGE_KEY = 'turing-trainer-progress'
export const MASTERY_TASK_THRESHOLD = 2

export interface ProgressSummary {
  learningAttempts: number
  learningCorrect: number
  independentLearning: number
  examAttempts: number
  examCorrect: number
}

export interface SkillProgress {
  status: SkillStatus | 'not-started'
  availableTaskCount: number
  independentTaskCount: number
}

interface ProgressState extends StoredProgress {
  recordAttempt: (attempt: AttemptStats) => void
  clearProgress: () => void
  exportProgress: () => string
  importProgress: (serialized: string) => boolean
}

const initialProgress = loadProgress(getBrowserStorage())

export const useProgressStore = create<ProgressState>((set, get) => ({
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

  exportProgress: () => {
    const { schemaVersion, attempts } = get()
    return JSON.stringify({ schemaVersion, attempts }, null, 2)
  },

  importProgress: (serialized) => {
    const progress = parseImportedProgress(serialized)
    if (progress === null) return false

    saveProgress(getBrowserStorage(), progress)
    set(progress)
    return true
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
  return getSkillProgress(attempts, skill).status
}

export function getSkillProgress(
  attempts: AttemptStats[],
  skill: string,
): SkillProgress {
  const taskIds = new Set(
    tasks.filter((task) => task.skills.includes(skill)).map((task) => task.id),
  )
  const relevant = attempts.filter(
    (attempt) => attempt.mode === 'learning' && taskIds.has(attempt.taskId),
  )

  const independentTaskIds = new Set(
    getIndependentLearningAttempts(attempts)
      .filter((attempt) => taskIds.has(attempt.taskId))
      .map((attempt) => attempt.taskId),
  )

  let status: SkillProgress['status'] = 'attempted'
  if (relevant.length === 0) status = 'not-started'
  else if (
    taskIds.size >= MASTERY_TASK_THRESHOLD
    && independentTaskIds.size >= MASTERY_TASK_THRESHOLD
  ) status = 'mastered'
  else if (independentTaskIds.size > 0) status = 'independent'
  else if (relevant.some((attempt) => attempt.correct)) status = 'solves'

  return {
    status,
    availableTaskCount: taskIds.size,
    independentTaskCount: independentTaskIds.size,
  }
}

export function isIndependentLearningAttempt(
  attempt: AttemptStats,
  previousAttempts: AttemptStats[],
): boolean {
  return isIndependentLearningCandidate(attempt)
    && !previousAttempts.some((previous) => previous.taskId === attempt.taskId)
}

export function getIndependentLearningAttempts(attempts: AttemptStats[]): AttemptStats[] {
  const seenTaskIds = new Set<string>()

  return attempts.filter((attempt) => {
    const isFirstAttempt = !seenTaskIds.has(attempt.taskId)
    seenTaskIds.add(attempt.taskId)
    return isFirstAttempt && isIndependentLearningCandidate(attempt)
  })
}

export function getProgressSummary(attempts: AttemptStats[]): ProgressSummary {
  const learningAttempts = attempts.filter((attempt) => attempt.mode === 'learning')
  const examAttempts = attempts.filter((attempt) => attempt.mode === 'exam')

  return {
    learningAttempts: learningAttempts.length,
    learningCorrect: learningAttempts.filter((attempt) => attempt.correct).length,
    independentLearning: getIndependentLearningAttempts(attempts).length,
    examAttempts: examAttempts.length,
    examCorrect: examAttempts.filter((attempt) => attempt.correct).length,
  }
}

export function getRecommendedTask(attempts: AttemptStats[]): Task | null {
  const learningAttempts = attempts.filter((attempt) => attempt.mode === 'learning')
  const solvedTaskIds = new Set(
    learningAttempts.filter((attempt) => attempt.correct).map((attempt) => attempt.taskId),
  )
  const independentTaskIds = new Set(
    getIndependentLearningAttempts(attempts)
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

function parseImportedProgress(serialized: string): StoredProgress | null {
  try {
    const value: unknown = JSON.parse(serialized)
    if (
      !isRecord(value)
      || value.schemaVersion !== PROGRESS_SCHEMA_VERSION
      || !Array.isArray(value.attempts)
    ) return null

    const attempts: AttemptStats[] = []
    for (const attempt of value.attempts) {
      const parsed = parseAttempt(attempt)
      if (parsed === null) return null
      attempts.push(parsed)
    }

    return { schemaVersion: PROGRESS_SCHEMA_VERSION, attempts }
  } catch {
    return null
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

function isIndependentLearningCandidate(attempt: AttemptStats): boolean {
  return attempt.mode === 'learning' && attempt.correct && attempt.hintsUsed === 0
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
