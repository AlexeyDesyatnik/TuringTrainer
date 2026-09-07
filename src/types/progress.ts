export type AttemptMode = 'learning' | 'exam'
export type SimulationUsage = 'none' | 'partial' | 'full'
export type SkillStatus = 'attempted' | 'solves' | 'independent' | 'mastered'

export interface AttemptStats {
  taskId: string
  mode: AttemptMode
  startedAt: string
  durationMs: number
  correct: boolean
  hintsUsed: number
  stepsExecuted: number
  simulationUsage: SimulationUsage
  errors: string[]
}

export interface StoredProgress {
  schemaVersion: number
  attempts: AttemptStats[]
}
