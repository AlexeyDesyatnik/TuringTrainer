import { create } from 'zustand'

import { checkAnswer } from '../core/checkAnswer'
import { TuringMachine } from '../core/TuringMachine'
import { tasks } from '../data/tasks'
import type { Direction, StepResult } from '../types/machine'
import type { AttemptMode, AttemptStats, SimulationUsage } from '../types/progress'
import type { Task, TaskAnswer } from '../types/task'
import { useProgressStore } from './progressStore'

export type AnswerDraft =
  | { type: 'choice'; value: string }
  | { type: 'prediction'; write: string; direction: Direction | ''; nextState: string }
  | null

export type AnimationPhase = 'write' | 'move' | 'state' | null

export interface AnswerResult {
  correct: boolean
  submitted: TaskAnswer
  hintsUsed: number
  durationMs: number
  mode: AttemptMode
}

export const AUTO_SPEED_MIN = 100
export const AUTO_SPEED_MAX = 1000
export const DEFAULT_AUTO_SPEED = 500
export const ANIMATION_PHASE_MS = 220
export const EXAM_TIMER_TICK_MS = 250

interface SessionState {
  task: Task
  machine: TuringMachine
  revision: number
  draft: AnswerDraft
  result: AnswerResult | null
  autoRunning: boolean
  autoSpeedMs: number
  animationPhase: AnimationPhase
  animatedStep: StepResult | null
  reducedMotion: boolean
  openedHints: number
  attemptStartedAtMs: number
  executedSteps: number
  mode: AttemptMode
  elapsedMs: number
  selectTask: (taskId: string) => void
  step: () => void
  undo: () => void
  reset: () => void
  setChoice: (value: string) => void
  updatePrediction: (values: Partial<Omit<Extract<AnswerDraft, { type: 'prediction' }>, 'type'>>) => void
  submitAnswer: () => void
  retry: () => void
  nextTask: () => void
  toggleAuto: () => void
  stopAuto: () => void
  setAutoSpeed: (speedMs: number) => void
  setReducedMotion: (reduced: boolean) => void
  openNextHint: () => void
  setMode: (mode: AttemptMode) => void
  startExamTimer: () => void
  stopExamTimer: () => void
}

const initialTask = tasks[0]

if (initialTask === undefined) {
  throw new Error('Для запуска тренажёра требуется хотя бы одна задача')
}

export const useSessionStore = create<SessionState>((set, get) => {
  let executionTimer: ReturnType<typeof setTimeout> | null = null
  let examTimer: ReturnType<typeof setInterval> | null = null

  function clearExecutionTimer(): void {
    if (executionTimer === null) return
    clearTimeout(executionTimer)
    executionTimer = null
  }

  function schedule(callback: () => void, delayMs: number): void {
    clearExecutionTimer()
    executionTimer = setTimeout(callback, delayMs)
  }

  function stopExamTimer(): void {
    if (examTimer === null) return
    clearInterval(examTimer)
    examTimer = null
  }

  function updateExamElapsed(): void {
    const { attemptStartedAtMs, mode, result } = get()
    if (mode !== 'exam' || result !== null) {
      stopExamTimer()
      return
    }
    set({ elapsedMs: Math.max(0, Date.now() - attemptStartedAtMs) })
  }

  function startExamTimer(): void {
    if (examTimer !== null || get().mode !== 'exam' || get().result !== null) return
    updateExamElapsed()
    examTimer = setInterval(updateExamElapsed, EXAM_TIMER_TICK_MS)
  }

  function stopAuto(): void {
    clearExecutionTimer()
    const { animatedStep, animationPhase, autoRunning } = get()
    if (!autoRunning && animationPhase === null && animatedStep === null) return
    set({ autoRunning: false, animationPhase: null, animatedStep: null })
  }

  function finishVisualStep(): void {
    clearExecutionTimer()
    const { autoRunning, machine } = get()
    const shouldContinue = autoRunning && !machine.isHalted()

    set({
      animationPhase: null,
      animatedStep: null,
      autoRunning: shouldContinue,
    })

    if (shouldContinue) schedule(runAutomaticStep, get().autoSpeedMs)
  }

  function advanceAnimation(): void {
    const { animationPhase } = get()

    if (animationPhase === 'write') {
      set({ animationPhase: 'move' })
      schedule(advanceAnimation, ANIMATION_PHASE_MS)
    } else if (animationPhase === 'move') {
      set({ animationPhase: 'state' })
      schedule(advanceAnimation, ANIMATION_PHASE_MS)
    } else if (animationPhase === 'state') {
      finishVisualStep()
    }
  }

  function performLogicalStep(): void {
    clearExecutionTimer()
    const { machine, reducedMotion, task } = get()
    const stepResult = machine.step()

    if (stepResult === null) {
      set((state) => ({
        revision: state.revision + 1,
        autoRunning: false,
        animationPhase: null,
        animatedStep: null,
      }))
      return
    }

    const shouldAnimate = task.level === 1 && !reducedMotion

    set((state) => ({
      revision: state.revision + 1,
      executedSteps: state.executedSteps + 1,
      animationPhase: shouldAnimate ? 'write' : null,
      animatedStep: shouldAnimate ? stepResult : null,
      autoRunning: shouldAnimate
        ? state.autoRunning
        : state.autoRunning && !machine.isHalted(),
    }))

    if (shouldAnimate) {
      schedule(advanceAnimation, ANIMATION_PHASE_MS)
    } else if (get().autoRunning) {
      schedule(runAutomaticStep, get().autoSpeedMs)
    }
  }

  function runAutomaticStep(): void {
    const { animationPhase, autoRunning, machine, result } = get()

    if (!autoRunning || animationPhase !== null || result !== null || machine.isHalted()) {
      stopAuto()
      return
    }

    performLogicalStep()
  }

  return {
    task: initialTask,
    machine: new TuringMachine(initialTask.machine),
    revision: 0,
    draft: createDraft(initialTask),
    result: null,
    autoRunning: false,
    autoSpeedMs: DEFAULT_AUTO_SPEED,
    animationPhase: null,
    animatedStep: null,
    reducedMotion: false,
    openedHints: 0,
    attemptStartedAtMs: Date.now(),
    executedSteps: 0,
    mode: 'learning',
    elapsedMs: 0,

    selectTask: (taskId) => {
      const task = tasks.find((candidate) => candidate.id === taskId)
      if (task === undefined || task.id === get().task.id) return
      stopAuto()
      stopExamTimer()

      set((state) => ({
        task,
        machine: new TuringMachine(task.machine),
        revision: state.revision + 1,
        draft: createDraft(task),
        result: null,
        openedHints: 0,
        attemptStartedAtMs: Date.now(),
        executedSteps: 0,
        elapsedMs: 0,
      }))
      if (get().mode === 'exam') startExamTimer()
    },

    step: () => {
      const { animationPhase, autoRunning, machine, result, task } = get()
      if (autoRunning || animationPhase !== null || result !== null) return
      if (task.format === 'prediction' && machine.getStepCount() === 0) return
      performLogicalStep()
    },

    undo: () => {
      const { machine, result } = get()
      if (result !== null) return
      stopAuto()
      if (!machine.undo()) return
      set((state) => ({ revision: state.revision + 1 }))
    },

    reset: () => {
      const { machine, task } = get()
      stopAuto()
      machine.reset()
      set((state) => ({
        revision: state.revision + 1,
        draft: createDraft(task),
        result: null,
      }))
    },

    setChoice: (value) => {
      if (get().result !== null || get().draft?.type !== 'choice') return
      set({ draft: { type: 'choice', value }, result: null })
    },

    updatePrediction: (values) => {
      const { draft, result } = get()
      if (result !== null || draft?.type !== 'prediction') return
      set({ draft: { ...draft, ...values }, result: null })
    },

    submitAnswer: () => {
      const {
        animationPhase,
        attemptStartedAtMs,
        draft,
        executedSteps,
        machine,
        openedHints,
        result,
        task,
        mode,
      } = get()
      if (animationPhase !== null || result !== null) return
      const submitted = draftToAnswer(draft)
      if (submitted === null) return
      stopAuto()

      const correct = checkAnswer(task.answer, submitted)
      const durationMs = Math.max(0, Date.now() - attemptStartedAtMs)
      stopExamTimer()
      const attempt: AttemptStats = {
        taskId: task.id,
        mode,
        startedAt: new Date(attemptStartedAtMs).toISOString(),
        durationMs,
        correct,
        hintsUsed: openedHints,
        stepsExecuted: executedSteps,
        simulationUsage: getSimulationUsage(executedSteps, machine.isHalted()),
        errors: correct ? [] : diagnoseErrors(task, submitted),
      }
      useProgressStore.getState().recordAttempt(attempt)

      if (task.format === 'prediction' && machine.getStepCount() === 0) {
        performLogicalStep()
      }

      set({
        result: {
          correct,
          submitted,
          hintsUsed: openedHints,
          durationMs,
          mode,
        },
      })
    },

    retry: () => {
      const { machine, task } = get()
      stopAuto()
      stopExamTimer()
      machine.reset()
      set((state) => ({
        revision: state.revision + 1,
        draft: createDraft(task),
        result: null,
        openedHints: 0,
        attemptStartedAtMs: Date.now(),
        executedSteps: 0,
        elapsedMs: 0,
      }))
      if (get().mode === 'exam') startExamTimer()
    },

    nextTask: () => {
      const currentIndex = tasks.findIndex((task) => task.id === get().task.id)
      const next = tasks[(currentIndex + 1) % tasks.length]
      if (next !== undefined) get().selectTask(next.id)
    },

    toggleAuto: () => {
      const { animationPhase, autoRunning, machine, result, task } = get()

      if (autoRunning) {
        stopAuto()
        return
      }

      if (
        animationPhase !== null
        || result !== null
        || machine.isHalted()
        || (task.format === 'prediction' && machine.getStepCount() === 0)
      ) return

      set({ autoRunning: true })
      runAutomaticStep()
    },

    stopAuto,

    setAutoSpeed: (speedMs) => {
      if (!Number.isFinite(speedMs)) return
      const normalizedSpeed = Math.min(
        AUTO_SPEED_MAX,
        Math.max(AUTO_SPEED_MIN, Math.round(speedMs)),
      )
      set({ autoSpeedMs: normalizedSpeed })

      if (get().autoRunning && get().animationPhase === null) {
        schedule(runAutomaticStep, normalizedSpeed)
      }
    },

    setReducedMotion: (reduced) => {
      if (get().reducedMotion === reduced) return
      set({ reducedMotion: reduced })

      if (reduced && get().animationPhase !== null) {
        finishVisualStep()
      }
    },

    openNextHint: () => {
      const { animationPhase, mode, openedHints, result, task } = get()
      if (
        mode !== 'learning'
        || animationPhase !== null
        || result !== null
        || openedHints >= task.hints.length
      ) return
      stopAuto()
      set({ openedHints: openedHints + 1 })
    },

    setMode: (mode) => {
      if (get().mode === mode) return
      const { machine, task } = get()
      stopAuto()
      stopExamTimer()
      machine.reset()
      set((state) => ({
        mode,
        elapsedMs: 0,
        attemptStartedAtMs: Date.now(),
        executedSteps: 0,
        revision: state.revision + 1,
        draft: createDraft(task),
        result: null,
        openedHints: 0,
      }))
      if (mode === 'exam') startExamTimer()
    },

    startExamTimer,
    stopExamTimer,
  }
})

function createDraft(task: Task): AnswerDraft {
  if (task.answer.type === 'choice') return { type: 'choice', value: '' }
  if (task.answer.type === 'prediction') {
    return { type: 'prediction', write: '', direction: '', nextState: '' }
  }
  return null
}

function draftToAnswer(draft: AnswerDraft): TaskAnswer | null {
  if (draft === null) return null

  if (draft.type === 'choice') {
    return draft.value === '' ? null : draft
  }

  if (draft.write === '' || draft.direction === '' || draft.nextState === '') return null

  return {
    type: 'prediction',
    write: draft.write,
    direction: draft.direction,
    nextState: draft.nextState,
  }
}

function getSimulationUsage(stepsExecuted: number, halted: boolean): SimulationUsage {
  if (stepsExecuted === 0) return 'none'
  return halted ? 'full' : 'partial'
}

function diagnoseErrors(task: Task, submitted: TaskAnswer): string[] {
  if (task.answer.type !== 'prediction' || submitted.type !== 'prediction') return []

  const availableCodes = new Set(task.commonMistakes.map((mistake) => mistake.type))
  const errors = new Set<string>()
  const addAvailable = (...codes: string[]) => {
    const code = codes.find((candidate) => availableCodes.has(candidate))
    if (code !== undefined) errors.add(code)
  }

  if (task.answer.write !== submitted.write) {
    addAvailable('wrong-write-symbol', 'wrong-command')
  }
  if (task.answer.direction !== submitted.direction) {
    addAvailable('wrong-direction', 'wrong-command')
  }
  if (task.answer.nextState !== submitted.nextState) {
    addAvailable('wrong-next-state', 'wrong-command')
  }

  return [...errors]
}
