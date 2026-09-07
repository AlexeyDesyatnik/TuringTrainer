import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ANIMATION_PHASE_MS,
  AUTO_SPEED_MAX,
  AUTO_SPEED_MIN,
  DEFAULT_AUTO_SPEED,
  useSessionStore,
} from './sessionStore'
import { useProgressStore } from './progressStore'

describe('автозапуск сессии', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    const store = useSessionStore.getState()
    store.selectTask('l1-command-reading-01')
    store.retry()
    store.setAutoSpeed(DEFAULT_AUTO_SPEED)
    store.setReducedMotion(true)
  })

  afterEach(() => {
    useSessionStore.getState().stopAuto()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('выполняет шаг сразу и не выполняет новые шаги после паузы', () => {
    useSessionStore.getState().toggleAuto()

    expect(useSessionStore.getState().machine.getStepCount()).toBe(1)
    expect(useSessionStore.getState().autoRunning).toBe(true)
    expect(vi.getTimerCount()).toBe(1)

    useSessionStore.getState().toggleAuto()
    vi.advanceTimersByTime(2000)

    expect(useSessionStore.getState().autoRunning).toBe(false)
    expect(useSessionStore.getState().machine.getStepCount()).toBe(1)
  })

  it('прекращает запуск при остановке машины', () => {
    useSessionStore.getState().toggleAuto()
    vi.advanceTimersByTime(DEFAULT_AUTO_SPEED)

    const { autoRunning, machine } = useSessionStore.getState()
    expect(autoRunning).toBe(false)
    expect(machine.isHalted()).toBe(true)
    expect(machine.getHaltReason()).toBe('missing-command')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('очищает таймер при undo и reset', () => {
    useSessionStore.getState().toggleAuto()
    useSessionStore.getState().undo()

    expect(useSessionStore.getState().autoRunning).toBe(false)
    expect(useSessionStore.getState().machine.getStepCount()).toBe(0)
    expect(vi.getTimerCount()).toBe(0)

    useSessionStore.getState().toggleAuto()
    useSessionStore.getState().reset()
    vi.advanceTimersByTime(2000)

    expect(useSessionStore.getState().machine.getStepCount()).toBe(0)
    expect(useSessionStore.getState().autoRunning).toBe(false)
  })

  it('очищает таймер и создаёт новую машину при смене задачи', () => {
    useSessionStore.getState().toggleAuto()
    useSessionStore.getState().selectTask('l1-prediction-01')
    vi.advanceTimersByTime(2000)

    const { autoRunning, machine, task } = useSessionStore.getState()
    expect(task.id).toBe('l1-prediction-01')
    expect(machine.getStepCount()).toBe(0)
    expect(autoRunning).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('не запускается до отправки прогноза', () => {
    useSessionStore.getState().selectTask('l1-prediction-01')
    useSessionStore.getState().toggleAuto()

    expect(useSessionStore.getState().autoRunning).toBe(false)
    expect(useSessionStore.getState().machine.getStepCount()).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('ограничивает скорость и пересоздаёт ожидающий таймер', () => {
    useSessionStore.getState().setAutoSpeed(1)
    expect(useSessionStore.getState().autoSpeedMs).toBe(AUTO_SPEED_MIN)

    useSessionStore.getState().setAutoSpeed(5000)
    expect(useSessionStore.getState().autoSpeedMs).toBe(AUTO_SPEED_MAX)

    useSessionStore.getState().setAutoSpeed(DEFAULT_AUTO_SPEED)
    useSessionStore.getState().toggleAuto()
    vi.advanceTimersByTime(400)
    useSessionStore.getState().setAutoSpeed(AUTO_SPEED_MIN)

    vi.advanceTimersByTime(99)
    expect(useSessionStore.getState().autoRunning).toBe(true)
    vi.advanceTimersByTime(1)
    expect(useSessionStore.getState().autoRunning).toBe(false)
  })
})

describe('трёхфазная анимация', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    const store = useSessionStore.getState()
    store.selectTask('l1-command-reading-01')
    store.retry()
    store.setAutoSpeed(DEFAULT_AUTO_SPEED)
    store.setReducedMotion(false)
  })

  afterEach(() => {
    useSessionStore.getState().stopAuto()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('меняет машину атомарно и последовательно показывает write, move, state', () => {
    useSessionStore.getState().step()

    expect(useSessionStore.getState().machine.getState()).toBe('q1')
    expect(useSessionStore.getState().machine.getHeadPosition()).toBe(1)
    expect(useSessionStore.getState().animationPhase).toBe('write')
    expect(useSessionStore.getState().animatedStep).toMatchObject({
      previousState: 'q0',
      newState: 'q1',
      previousHeadPosition: 0,
      newHeadPosition: 1,
    })

    vi.advanceTimersByTime(ANIMATION_PHASE_MS)
    expect(useSessionStore.getState().animationPhase).toBe('move')

    vi.advanceTimersByTime(ANIMATION_PHASE_MS)
    expect(useSessionStore.getState().animationPhase).toBe('state')

    vi.advanceTimersByTime(ANIMATION_PHASE_MS)
    expect(useSessionStore.getState().animationPhase).toBeNull()
    expect(useSessionStore.getState().animatedStep).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('отключает визуальные фазы при reduced motion', () => {
    useSessionStore.getState().setReducedMotion(true)
    useSessionStore.getState().step()

    expect(useSessionStore.getState().machine.getStepCount()).toBe(1)
    expect(useSessionStore.getState().animationPhase).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('не запускает пересекающийся ручной шаг во время анимации', () => {
    useSessionStore.getState().step()
    useSessionStore.getState().step()

    expect(useSessionStore.getState().machine.getStepCount()).toBe(1)
    expect(useSessionStore.getState().animationPhase).toBe('write')
    expect(vi.getTimerCount()).toBe(1)
  })

  it('ждёт завершения всех фаз перед интервалом следующего автоматического шага', () => {
    useSessionStore.getState().toggleAuto()

    expect(useSessionStore.getState().animationPhase).toBe('write')
    expect(useSessionStore.getState().machine.getStepCount()).toBe(1)

    vi.advanceTimersByTime(ANIMATION_PHASE_MS * 3)
    expect(useSessionStore.getState().animationPhase).toBeNull()
    expect(useSessionStore.getState().autoRunning).toBe(true)

    vi.advanceTimersByTime(DEFAULT_AUTO_SPEED - 1)
    expect(useSessionStore.getState().machine.isHalted()).toBe(false)
    vi.advanceTimersByTime(1)
    expect(useSessionStore.getState().machine.getHaltReason()).toBe('missing-command')
    expect(useSessionStore.getState().autoRunning).toBe(false)
  })

  it('пауза отменяет оставшиеся визуальные фазы без повторного изменения машины', () => {
    useSessionStore.getState().toggleAuto()
    useSessionStore.getState().toggleAuto()
    vi.advanceTimersByTime(2000)

    expect(useSessionStore.getState().animationPhase).toBeNull()
    expect(useSessionStore.getState().autoRunning).toBe(false)
    expect(useSessionStore.getState().machine.getStepCount()).toBe(1)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('подсказки текущей попытки', () => {
  beforeEach(() => {
    const store = useSessionStore.getState()
    store.selectTask('l1-command-reading-01')
    store.retry()
    store.setReducedMotion(true)
  })

  afterEach(() => useSessionStore.getState().stopAuto())

  it('открывает не больше трёх подсказок строго по порядку', () => {
    const store = useSessionStore.getState()

    store.openNextHint()
    expect(useSessionStore.getState().openedHints).toBe(1)
    store.openNextHint()
    store.openNextHint()
    store.openNextHint()

    expect(useSessionStore.getState().openedHints).toBe(3)
  })

  it('сохраняет помощь при reset и очищает при новой попытке', () => {
    useSessionStore.getState().openNextHint()
    useSessionStore.getState().reset()
    expect(useSessionStore.getState().openedHints).toBe(1)

    useSessionStore.getState().retry()
    expect(useSessionStore.getState().openedHints).toBe(0)
  })

  it('фиксирует число подсказок в результате независимо от правильности', () => {
    const store = useSessionStore.getState()
    store.openNextHint()
    store.openNextHint()
    store.setChoice('write-1-right-q1')
    store.submitAnswer()

    expect(useSessionStore.getState().result).toMatchObject({
      correct: true,
      hintsUsed: 2,
    })
  })

  it('очищает подсказки при смене задачи', () => {
    useSessionStore.getState().openNextHint()
    useSessionStore.getState().selectTask('l1-prediction-01')

    expect(useSessionStore.getState().openedHints).toBe(0)
  })
})

describe('фиксация статистики попытки', () => {
  beforeEach(() => {
    useProgressStore.getState().clearProgress()
    const store = useSessionStore.getState()
    store.selectTask('l1-command-reading-01')
    store.retry()
    store.setReducedMotion(true)
  })

  it('учитывает выполненные учеником шаги и использование симулятора', () => {
    const store = useSessionStore.getState()
    store.step()
    store.setChoice('write-1-right-q1')
    store.submitAnswer()

    expect(useProgressStore.getState().attempts).toHaveLength(1)
    expect(useProgressStore.getState().attempts[0]).toMatchObject({
      taskId: 'l1-command-reading-01',
      mode: 'learning',
      correct: true,
      hintsUsed: 0,
      stepsExecuted: 1,
      simulationUsage: 'partial',
      errors: [],
    })
  })

  it('не считает демонстрационный шаг после прогноза использованием симулятора', () => {
    const store = useSessionStore.getState()
    store.selectTask('l1-prediction-01')
    store.updatePrediction({ write: '0', direction: 'R', nextState: 'scan' })
    store.submitAnswer()

    expect(useSessionStore.getState().machine.getStepCount()).toBe(1)
    expect(useProgressStore.getState().attempts[0]).toMatchObject({
      taskId: 'l1-prediction-01',
      correct: false,
      stepsExecuted: 0,
      simulationUsage: 'none',
      errors: ['wrong-command', 'wrong-direction'],
    })
  })

  it('не создаёт повторную запись при повторной отправке результата', () => {
    const store = useSessionStore.getState()
    store.setChoice('write-1-right-q1')
    store.submitAnswer()
    store.submitAnswer()

    expect(useProgressStore.getState().attempts).toHaveLength(1)
  })
})
