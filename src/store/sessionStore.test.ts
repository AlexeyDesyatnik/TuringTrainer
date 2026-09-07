import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AUTO_SPEED_MAX,
  AUTO_SPEED_MIN,
  DEFAULT_AUTO_SPEED,
  useSessionStore,
} from './sessionStore'

describe('автозапуск сессии', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    const store = useSessionStore.getState()
    store.selectTask('l1-command-reading-01')
    store.reset()
    store.setAutoSpeed(DEFAULT_AUTO_SPEED)
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
