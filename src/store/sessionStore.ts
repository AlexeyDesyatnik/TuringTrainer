import { create } from 'zustand'

import { checkAnswer } from '../core/checkAnswer'
import { EMPTY_SYMBOL, TuringMachine } from '../core/TuringMachine'
import { parseTapeInput } from '../core/parseTapeInput'
import { tasks } from '../data/tasks'
import type { Direction, StepResult } from '../types/machine'
import type { AttemptMode, AttemptStats, SimulationUsage } from '../types/progress'
import type { Task, TaskAnswer } from '../types/task'
import { getNextTask, useProgressStore } from './progressStore'

export type AnswerDraft =
  | { type: 'choice'; value: string }
  | { type: 'prediction'; write: string; direction: Direction | ''; nextState: string }
  | { type: 'steps'; value: string }
  | { type: 'count'; symbol: string; value: string }
  | { type: 'tape'; startIndex: string; value: string }
  | null

export type AnimationPhase = 'write' | 'move' | 'state' | null
export type AppScreen = 'home' | 'selector' | 'task' | 'dashboard'

export interface AnswerResult {
  correct: boolean
  submitted: TaskAnswer
  hintsUsed: number
  durationMs: number
  mode: AttemptMode
  errors: string[]
}

export const AUTO_SPEED_MIN = 100
export const AUTO_SPEED_MAX = 1000
export const ANIMATION_PHASE_MS = 660
export const DEFAULT_AUTO_SPEED = ANIMATION_PHASE_MS
export const EXAM_TIMER_TICK_MS = 250

interface SessionState {
  task: Task
  machine: TuringMachine
  revision: number
  draft: AnswerDraft
  result: AnswerResult | null
  pendingResult: AnswerResult | null
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
  screen: AppScreen
  selectTask: (taskId: string) => void
  step: () => void
  undo: () => void
  reset: () => void
  setChoice: (value: string) => void
  setNumericAnswer: (value: string) => void
  updateTapeAnswer: (values: Partial<Omit<Extract<AnswerDraft, { type: 'tape' }>, 'type'>>) => void
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
  navigate: (screen: AppScreen) => void
  openTask: (taskId: string) => void
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
    const { attemptStartedAtMs, mode, result, screen } = get()
    if (mode !== 'exam' || result !== null || screen !== 'task') {
      stopExamTimer()
      return
    }
    set({ elapsedMs: Math.max(0, Date.now() - attemptStartedAtMs) })
  }

  function startExamTimer(): void {
    if (
      examTimer !== null
      || get().mode !== 'exam'
      || get().result !== null
      || get().screen !== 'task'
    ) return
    updateExamElapsed()
    examTimer = setInterval(updateExamElapsed, EXAM_TIMER_TICK_MS)
  }

  function stopAuto(): void {
    clearExecutionTimer()
    const { animatedStep, animationPhase, autoRunning, pendingResult } = get()
    if (!autoRunning && animationPhase === null && animatedStep === null) return
    set({
      autoRunning: false,
      animationPhase: null,
      animatedStep: null,
      pendingResult: null,
      result: pendingResult ?? get().result,
    })
  }

  function finishVisualStep(): void {
    clearExecutionTimer()
    const { autoRunning, machine, pendingResult, result } = get()
    const shouldContinue = pendingResult === null && autoRunning && !machine.isHalted()

    set({
      animationPhase: null,
      animatedStep: null,
      autoRunning: shouldContinue,
      pendingResult: null,
      result: pendingResult ?? result,
    })

    if (shouldContinue) schedule(runAutomaticStep, get().autoSpeedMs)
  }

  function advanceAnimation(): void {
    const { animationPhase } = get()

    if (animationPhase === 'write') {
      set({ animationPhase: 'move' })
      schedule(advanceAnimation, get().autoSpeedMs)
    } else if (animationPhase === 'move') {
      set({ animationPhase: 'state' })
      schedule(advanceAnimation, get().autoSpeedMs)
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
      schedule(advanceAnimation, get().autoSpeedMs)
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
    pendingResult: null,
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
    screen: 'home',

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
        pendingResult: null,
        openedHints: 0,
        attemptStartedAtMs: Date.now(),
        executedSteps: 0,
        elapsedMs: 0,
      }))
      if (get().mode === 'exam' && get().screen === 'task') startExamTimer()
    },

    step: () => {
      const { animationPhase, autoRunning, machine, result, task } = get()
      if (autoRunning || animationPhase !== null || result !== null) return
      if (task.answer.type === 'prediction' && machine.getStepCount() === 0) return
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
        pendingResult: null,
      }))
    },

    setChoice: (value) => {
      if (get().result !== null || get().draft?.type !== 'choice') return
      set({ draft: { type: 'choice', value }, result: null })
    },

    setNumericAnswer: (value) => {
      const { draft, result } = get()
      if (result !== null || (draft?.type !== 'steps' && draft?.type !== 'count')) return
      set({ draft: { ...draft, value }, result: null })
    },

    updateTapeAnswer: (values) => {
      const { draft, result } = get()
      if (result !== null || draft?.type !== 'tape') return
      set({ draft: { ...draft, ...values }, result: null })
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
      const submitted = draftToAnswer(draft, task)
      if (submitted === null) return
      stopAuto()

      const correct = checkAnswer(task.answer, submitted)
      const simulationUsage = getSimulationUsage(executedSteps, machine.isHalted())
      const errors = [
        ...(correct ? [] : diagnoseErrors(task, submitted)),
        ...diagnoseStrategy(task, simulationUsage),
      ]
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
        simulationUsage,
        errors,
      }
      useProgressStore.getState().recordAttempt(attempt)

      const answerResult: AnswerResult = {
        correct,
        submitted,
        hintsUsed: openedHints,
        durationMs,
        mode,
        errors,
      }

      if (task.answer.type === 'prediction' && machine.getStepCount() === 0) {
        performLogicalStep()
        if (get().animationPhase !== null) {
          set({ pendingResult: answerResult })
          return
        }
      }

      set({ result: answerResult })
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
        pendingResult: null,
        openedHints: 0,
        attemptStartedAtMs: Date.now(),
        executedSteps: 0,
        elapsedMs: 0,
      }))
      if (get().mode === 'exam' && get().screen === 'task') startExamTimer()
    },

    nextTask: () => {
      const { attempts } = useProgressStore.getState()
      const { mode, task } = get()
      const next = getNextTask(task, attempts, mode)
      if (next === null) {
        get().navigate('selector')
      } else {
        get().selectTask(next.id)
      }
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
        || (task.answer.type === 'prediction' && machine.getStepCount() === 0)
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
        pendingResult: null,
        openedHints: 0,
      }))
      if (mode === 'exam' && get().screen === 'task') startExamTimer()
    },

    startExamTimer,
    stopExamTimer,

    navigate: (screen) => {
      if (get().screen === screen) return
      if (get().screen === 'task') {
        stopAuto()
        stopExamTimer()
      }
      set({ screen })
      if (screen === 'task' && get().mode === 'exam' && get().result === null) {
        startExamTimer()
      }
    },

    openTask: (taskId) => {
      if (get().task.id === taskId) {
        get().retry()
      } else {
        get().selectTask(taskId)
      }
      set({ screen: 'task' })
      if (get().mode === 'exam' && get().result === null) startExamTimer()
    },
  }
})

function createDraft(task: Task): AnswerDraft {
  if (task.answer.type === 'choice') return { type: 'choice', value: '' }
  if (task.answer.type === 'prediction') {
    return { type: 'prediction', write: '', direction: '', nextState: '' }
  }
  if (task.answer.type === 'steps') return { type: 'steps', value: '' }
  if (task.answer.type === 'count') {
    return { type: 'count', symbol: task.answer.symbol, value: '' }
  }
  if (task.answer.type === 'tape') {
    const indexes = Object.keys(task.answer.value).map(Number)
    return {
      type: 'tape',
      startIndex: indexes.length === 0 ? '0' : String(Math.min(...indexes)),
      value: '',
    }
  }
  return null
}

function draftToAnswer(draft: AnswerDraft, task: Task): TaskAnswer | null {
  if (draft === null) return null

  if (draft.type === 'choice') {
    return draft.value === '' ? null : draft
  }

  if (draft.type === 'steps') {
    const value = Number(draft.value)
    if (draft.value === '' || !Number.isInteger(value) || value < 0) return null
    return { type: 'steps', value }
  }

  if (draft.type === 'count') {
    const value = Number(draft.value)
    if (draft.value === '' || !Number.isInteger(value) || value < 0) return null
    return { type: 'count', symbol: draft.symbol, value }
  }

  if (draft.type === 'tape') {
    const value = parseTapeInput(draft.startIndex, draft.value, task.alphabet)
    return value === null ? null : { type: 'tape', value }
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
  const availableCodes = new Set(task.commonMistakes.map((mistake) => mistake.type))
  const errors = new Set<string>()
  const addAvailable = (...codes: string[]) => {
    const code = codes.find((candidate) => availableCodes.has(candidate))
    if (code !== undefined) errors.add(code)
  }

  if (task.answer.type === 'steps' && submitted.type === 'steps') {
    if (submitted.value === task.answer.value - 1) {
      addAvailable('stop-step-not-counted', 'wrong-count')
    } else if (submitted.value !== task.answer.value) {
      addAvailable('wrong-count')
    }
    return [...errors]
  }

  if (task.answer.type === 'count' && submitted.type === 'count') {
    if (submitted.value !== task.answer.value || submitted.symbol !== task.answer.symbol) {
      addAvailable('wrong-count')
    }
    return [...errors]
  }

  if (task.answer.type === 'tape' && submitted.type === 'tape') {
    const expectedStart = firstNonEmptyIndex(task.answer.value)
    const submittedStart = firstNonEmptyIndex(submitted.value)
    if (expectedStart !== submittedStart) {
      addAvailable('position-shift', 'wrong-pattern')
    } else {
      addAvailable('wrong-pattern')
    }
    return [...errors]
  }

  if (task.answer.type !== 'prediction' || submitted.type !== 'prediction') return []

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

function diagnoseStrategy(task: Task, simulationUsage: SimulationUsage): string[] {
  if (
    simulationUsage === 'full'
    && task.commonMistakes.some((mistake) => mistake.type === 'full-trace-overuse')
  ) {
    return ['full-trace-overuse']
  }
  return []
}

function firstNonEmptyIndex(tape: Record<number, string>): number | null {
  const indexes = Object.entries(tape)
    .filter(([, symbol]) => symbol !== EMPTY_SYMBOL)
    .map(([index]) => Number(index))
  return indexes.length === 0 ? null : Math.min(...indexes)
}
