import { create } from 'zustand'

import { checkAnswer } from '../core/checkAnswer'
import { TuringMachine } from '../core/TuringMachine'
import { tasks } from '../data/tasks'
import type { Direction } from '../types/machine'
import type { Task, TaskAnswer } from '../types/task'

export type AnswerDraft =
  | { type: 'choice'; value: string }
  | { type: 'prediction'; write: string; direction: Direction | ''; nextState: string }
  | null

export interface AnswerResult {
  correct: boolean
  submitted: TaskAnswer
}

export const AUTO_SPEED_MIN = 100
export const AUTO_SPEED_MAX = 1000
export const DEFAULT_AUTO_SPEED = 500

interface SessionState {
  task: Task
  machine: TuringMachine
  revision: number
  draft: AnswerDraft
  result: AnswerResult | null
  autoRunning: boolean
  autoSpeedMs: number
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
}

const initialTask = tasks[0]

if (initialTask === undefined) {
  throw new Error('Для запуска тренажёра требуется хотя бы одна задача')
}

export const useSessionStore = create<SessionState>((set, get) => {
  let autoTimer: ReturnType<typeof setTimeout> | null = null

  function clearAutoTimer(): void {
    if (autoTimer === null) return
    clearTimeout(autoTimer)
    autoTimer = null
  }

  function stopAuto(): void {
    clearAutoTimer()
    if (get().autoRunning) set({ autoRunning: false })
  }

  function scheduleAutomaticStep(): void {
    clearAutoTimer()
    autoTimer = setTimeout(runAutomaticStep, get().autoSpeedMs)
  }

  function runAutomaticStep(): void {
    const { autoRunning, machine, result } = get()

    if (!autoRunning || result !== null || machine.isHalted()) {
      stopAuto()
      return
    }

    const stepResult = machine.step()
    const stopped = stepResult === null || machine.isHalted()

    set((state) => ({
      revision: state.revision + 1,
      autoRunning: !stopped,
    }))

    if (stopped) {
      clearAutoTimer()
    } else {
      scheduleAutomaticStep()
    }
  }

  return {
    task: initialTask,
    machine: new TuringMachine(initialTask.machine),
    revision: 0,
    draft: createDraft(initialTask),
    result: null,
    autoRunning: false,
    autoSpeedMs: DEFAULT_AUTO_SPEED,

    selectTask: (taskId) => {
      const task = tasks.find((candidate) => candidate.id === taskId)
      if (task === undefined || task.id === get().task.id) return
      stopAuto()

      set((state) => ({
        task,
        machine: new TuringMachine(task.machine),
        revision: state.revision + 1,
        draft: createDraft(task),
        result: null,
      }))
    },

    step: () => {
      const { autoRunning, machine, result, task } = get()
      if (autoRunning || result !== null) return
      if (task.format === 'prediction' && machine.getStepCount() === 0) return

      machine.step()
      set((state) => ({ revision: state.revision + 1, result: null }))
    },

    undo: () => {
      const { machine, result } = get()
      if (result !== null) return
      stopAuto()
      if (!machine.undo()) return
      set((state) => ({ revision: state.revision + 1, result: null }))
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
      const { draft, machine, result, task } = get()
      if (result !== null) return
      const submitted = draftToAnswer(draft)
      if (submitted === null) return
      stopAuto()

      if (task.format === 'prediction' && machine.getStepCount() === 0) {
        machine.step()
      }

      set((state) => ({
        result: { correct: checkAnswer(task.answer, submitted), submitted },
        revision: state.revision + 1,
      }))
    },

    retry: () => get().reset(),

    nextTask: () => {
      const currentIndex = tasks.findIndex((task) => task.id === get().task.id)
      const next = tasks[(currentIndex + 1) % tasks.length]
      if (next !== undefined) get().selectTask(next.id)
    },

    toggleAuto: () => {
      const { autoRunning, machine, result, task } = get()

      if (autoRunning) {
        stopAuto()
        return
      }

      if (
        result !== null
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

      if (get().autoRunning) scheduleAutomaticStep()
    },
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
