import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from './App'
import { useProgressStore } from './store/progressStore'
import { useSessionStore } from './store/sessionStore'

describe('навигация приложения', () => {
  beforeEach(() => {
    useProgressStore.getState().clearProgress()
    const session = useSessionStore.getState()
    session.setMode('learning')
    session.selectTask('l1-command-reading-01')
    session.retry()
    session.setReducedMotion(true)
    session.navigate('home')
  })

  afterEach(() => {
    useSessionStore.getState().stopAuto()
    useSessionStore.getState().stopExamTimer()
    vi.useRealTimers()
  })

  it('проходит путь home → selector → task без React Router', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Не прокручивай машину. Пойми её.' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать задачу' }))

    expect(screen.getByRole('heading', { name: 'Выбери мыслительное действие' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Открыть задачу «Предскажи следующий шаг»' }))

    expect(screen.getByRole('heading', { name: 'Предскажи следующий шаг' })).toBeInTheDocument()
    expect(useSessionStore.getState().screen).toBe('task')
  })

  it('показывает dashboard и открывает рекомендованную задачу', () => {
    useProgressStore.getState().recordAttempt({
      taskId: 'l1-command-reading-01',
      mode: 'learning',
      startedAt: '2026-09-07T12:00:00.000Z',
      durationMs: 10_000,
      correct: true,
      hintsUsed: 0,
      stepsExecuted: 0,
      simulationUsage: 'none',
      errors: [],
    })
    useSessionStore.getState().navigate('dashboard')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Что тренировать дальше?' })).toBeInTheDocument()
    expect(screen.getByText('Предскажи следующий шаг')).toBeInTheDocument()
    expect(screen.getAllByText('Самостоятельно')).toHaveLength(2)
    expect(screen.getByText('Решено 1 из 2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Начать рекомендованную задачу' }))
    expect(screen.getByRole('heading', { name: 'Предскажи следующий шаг' })).toBeInTheDocument()
  })

  it('останавливает автозапуск при уходе с экрана задачи', () => {
    useSessionStore.getState().navigate('task')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Авто' }))

    expect(useSessionStore.getState().autoRunning).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Прогресс' }))

    expect(useSessionStore.getState().screen).toBe('dashboard')
    expect(useSessionStore.getState().autoRunning).toBe(false)
  })

  it('не запускает экзаменационный таймер в каталоге и останавливает при уходе', () => {
    vi.useFakeTimers()
    const session = useSessionStore.getState()
    session.navigate('selector')
    session.setMode('exam')
    expect(vi.getTimerCount()).toBe(0)

    session.openTask('l1-command-reading-01')
    const { unmount } = render(<App />)
    act(() => vi.advanceTimersByTime(500))
    expect(useSessionStore.getState().elapsedMs).toBe(500)

    fireEvent.click(screen.getByRole('button', { name: 'Прогресс' }))
    act(() => vi.advanceTimersByTime(1000))
    expect(useSessionStore.getState().elapsedMs).toBe(500)
    unmount()
  })
})
