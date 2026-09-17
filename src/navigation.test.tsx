import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

    expect(screen.getByRole('heading', { name: 'Когда трассировать, а когда рассуждать?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать задачу' }))

    expect(screen.getByRole('heading', { name: 'Выбери, что хочешь потренировать' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Открыть задачу «Предскажи следующий шаг»' }))

    expect(screen.getByRole('heading', { name: 'Предскажи следующий шаг' })).toBeInTheDocument()
    expect(useSessionStore.getState().screen).toBe('task')
  })

  it('показывает на главной методический контекст занятия', () => {
    render(<App />)

    expect(screen.getByText('11 класс')).toBeInTheDocument()
    expect(screen.getByText('2 × 45 минут')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Не просто получить ответ' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Пять спринтов — один маршрут' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Диагностический маршрут' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Перекрёстная проверка' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Аналитическое решение' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Начать исследование' })).toBeInTheDocument()
  })

  it('одинаково разделяет учебные и экзаменационные результаты на экранах', () => {
    const progress = useProgressStore.getState()
    progress.recordAttempt({
      taskId: 'l1-command-reading-01',
      mode: 'learning',
      startedAt: '2026-09-07T12:00:00.000Z',
      durationMs: 10_000,
      correct: false,
      hintsUsed: 0,
      stepsExecuted: 0,
      simulationUsage: 'none',
      errors: ['wrong-direction'],
    })
    progress.recordAttempt({
      taskId: 'l1-command-reading-01',
      mode: 'learning',
      startedAt: '2026-09-07T12:01:00.000Z',
      durationMs: 8_000,
      correct: true,
      hintsUsed: 0,
      stepsExecuted: 0,
      simulationUsage: 'none',
      errors: [],
    })
    progress.recordAttempt({
      taskId: 'l2-state-role-01',
      mode: 'exam',
      startedAt: '2026-09-07T12:02:00.000Z',
      durationMs: 12_000,
      correct: true,
      hintsUsed: 0,
      stepsExecuted: 0,
      simulationUsage: 'none',
      errors: [],
    })
    render(<App />)

    const trajectory = screen.getByLabelText('Текущая траектория')
    expect(within(trajectory).getByText('Учебных попыток').parentElement).toHaveTextContent('2')
    expect(within(trajectory).getByText('Верных учебных').parentElement).toHaveTextContent('1')
    expect(within(trajectory).getByText('Самостоятельных').parentElement).toHaveTextContent('0')
    expect(within(trajectory).getByText('Экзамен: верно / попыток').parentElement).toHaveTextContent(
      '1 / 1',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Открыть прогресс' }))
    const summary = screen.getByLabelText('Сводка прогресса')
    expect(within(summary).getByText('Учебных попыток').parentElement).toHaveTextContent('2')
    expect(within(summary).getByText('Верных учебных').parentElement).toHaveTextContent('1')
    expect(within(summary).getByText('Самостоятельных').parentElement).toHaveTextContent('0')
    expect(within(summary).getByText('Экзамен: верно / попыток').parentElement).toHaveTextContent(
      '1 / 1',
    )
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
    expect(screen.getAllByText('Без подсказок')).toHaveLength(2)
    expect(screen.getByText('Решено 1 из 4')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Начать рекомендованную задачу' }))
    expect(screen.getByRole('heading', { name: 'Предскажи следующий шаг' })).toBeInTheDocument()
  })

  it('объясняет рекомендацию повторяющейся диагностической ошибкой', () => {
    const progress = useProgressStore.getState()
    const attempt = {
      taskId: 'l1-command-reading-01',
      mode: 'learning' as const,
      startedAt: '2026-09-07T12:00:00.000Z',
      durationMs: 10_000,
      correct: false,
      hintsUsed: 0,
      stepsExecuted: 0,
      simulationUsage: 'none' as const,
      errors: ['wrong-direction'],
    }
    progress.recordAttempt(attempt)
    progress.recordAttempt({ ...attempt, startedAt: '2026-09-07T12:01:00.000Z' })
    useSessionStore.getState().navigate('dashboard')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Предскажи следующий шаг' })).toBeInTheDocument()
    expect(screen.getByText(
      'Почему эта задача: ошибка «Перепутаны направления L и R» повторилась в 2 попытках.',
    )).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Начать рекомендованную задачу' }))
    expect(useSessionStore.getState().task.id).toBe('l1-prediction-01')
  })

  it('объясняет, когда перенос навыка ещё нельзя проверить', () => {
    useProgressStore.getState().recordAttempt({
      taskId: 'l2-state-role-01',
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

    const skillRow = screen.getByText('Роль состояния').parentElement?.parentElement
    if (skillRow === null || skillRow === undefined) throw new Error('Не найдена строка навыка')
    expect(within(skillRow).getByText('Без подсказок')).toBeInTheDocument()
    expect(within(skillRow).getByText(
      'Задача решена без подсказок. Другой задачи для проверки этого навыка пока нет.',
    )).toBeInTheDocument()
    expect(screen.queryByText('Освоено')).not.toBeInTheDocument()
  })

  it('восстанавливает прогресс из резервной копии на dashboard', async () => {
    useSessionStore.getState().navigate('dashboard')
    render(<App />)

    expect(screen.getByRole('button', { name: 'Скачать прогресс' })).toBeInTheDocument()

    const backup = JSON.stringify({
      schemaVersion: 1,
      attempts: [{
        taskId: 'l1-command-reading-01',
        mode: 'learning',
        startedAt: '2026-09-07T12:00:00.000Z',
        durationMs: 10_000,
        correct: true,
        hintsUsed: 0,
        stepsExecuted: 0,
        simulationUsage: 'none',
        errors: [],
      }],
    })

    fireEvent.change(screen.getByLabelText('Импортировать прогресс'), {
      target: { files: [{ text: async () => backup }] },
    })

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Прогресс восстановлен'))
    expect(useProgressStore.getState().attempts).toHaveLength(1)
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
