import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from './App'
import { ANIMATION_PHASE_MS, useSessionStore } from './store/sessionStore'
import { useProgressStore } from './store/progressStore'

describe('экран учебной задачи', () => {
  beforeEach(() => {
    useProgressStore.getState().clearProgress()
    useSessionStore.getState().setMode('learning')
    useSessionStore.getState().selectTask('l1-command-reading-01')
    useSessionStore.getState().retry()
    useSessionStore.getState().setReducedMotion(true)
    useSessionStore.getState().navigate('task')
  })

  afterEach(() => {
    useSessionStore.getState().stopAuto()
    useSessionStore.getState().stopExamTimer()
    vi.useRealTimers()
  })

  it('показывает условие, 15 ячеек и активную команду', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Прочитай команду' })).toBeInTheDocument()
    expect(screen.getAllByLabelText(/^Ячейка /)).toHaveLength(15)
    expect(screen.getByLabelText('Ячейка 0: 0, головка')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '1 · R · q1' })).toHaveAttribute('aria-current', 'step')
  })

  it('выполняет шаг, отменяет его и сбрасывает машину', () => {
    render(<App />)
    const status = screen.getByLabelText('Состояние машины')
    const back = screen.getByRole('button', { name: 'Шаг назад' })

    expect(status).toHaveTextContent('Состояние q0')
    expect(back).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Шаг вперёд' }))
    expect(status).toHaveTextContent('Состояние q1')
    expect(status).toHaveTextContent('Головка 1')
    expect(status).toHaveTextContent('Шагов 1')
    expect(screen.getByLabelText('Ячейка 1: 1, головка')).toBeInTheDocument()
    expect(back).toBeEnabled()

    fireEvent.click(back)
    expect(status).toHaveTextContent('Состояние q0')
    expect(screen.getByLabelText('Ячейка 0: 0, головка')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Шаг вперёд' }))
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить машину' }))
    expect(status).toHaveTextContent('Шагов 0')
    expect(screen.getByLabelText('Ячейка 0: 0, головка')).toBeInTheDocument()
  })

  it('проверяет выбранный ответ и показывает содержательный результат', () => {
    render(<App />)

    fireEvent.click(screen.getByLabelText('Записать 1, сдвинуться влево, перейти в q1'))
    fireEvent.click(screen.getByRole('button', { name: 'Проверить ответ' }))

    const result = screen.getByRole('alert')
    expect(result).toHaveTextContent('Пока неверно')
    expect(result).toHaveTextContent('Твой ответ: Записать 1, сдвинуться влево, перейти в q1')
    expect(result).toHaveTextContent('Правильный ответ: Записать 1, сдвинуться вправо, перейти в q1')
    expect(result).toHaveTextContent('Активную команду задаёт пара q0 и 0')
    expect(result).toHaveTextContent('Попытка сохранена на этом устройстве')
    expect(screen.getByLabelText('Сохранённый прогресс')).toHaveTextContent('Попыток: 1')

    fireEvent.click(within(result).getByRole('button', { name: 'Решить ещё раз' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('проверяет прогноз до выполнения фактического шага', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '2. Предскажи следующий шаг' }))

    const forward = screen.getByRole('button', { name: 'Шаг вперёд' })
    expect(forward).toBeDisabled()
    expect(screen.getByText(/Сначала отправь прогноз/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Записать символ'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Направление движения'), { target: { value: 'L' } })
    fireEvent.change(screen.getByLabelText('Новое состояние'), { target: { value: 'check' } })
    fireEvent.click(screen.getByRole('button', { name: 'Проверить ответ' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Верно')
    expect(screen.getByLabelText('Ячейка -1: 1, головка')).toBeInTheDocument()
    expect(screen.getByLabelText('Состояние машины')).toHaveTextContent('Состояние check')
    expect(screen.getByLabelText('Направление движения')).toBeDisabled()
    expect(forward).toBeDisabled()
  })

  it('останавливает автозапуск при размонтировании экрана', () => {
    vi.useFakeTimers()
    const { unmount } = render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Авто' }))
    expect(useSessionStore.getState().autoRunning).toBe(true)
    expect(screen.getByRole('button', { name: 'Пауза' })).toBeInTheDocument()

    unmount()
    vi.advanceTimersByTime(2000)

    expect(useSessionStore.getState().autoRunning).toBe(false)
    expect(useSessionStore.getState().machine.getStepCount()).toBe(1)
  })

  it('показывает три фазы атомарно выполненного шага', () => {
    vi.useFakeTimers()
    useSessionStore.getState().setReducedMotion(false)
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Шаг вперёд' }))

    expect(useSessionStore.getState().machine.getState()).toBe('q1')
    expect(screen.getByTestId('animation-phase')).toHaveTextContent('1. Запись')
    expect(screen.getByLabelText('Состояние машины')).toHaveTextContent('Состояние q0')
    expect(screen.getByLabelText('Ячейка 0: 1, головка')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(ANIMATION_PHASE_MS))
    expect(screen.getByTestId('animation-phase')).toHaveTextContent('2. Движение')
    expect(screen.getByLabelText('Ячейка 1: 1, головка')).toBeInTheDocument()
    expect(screen.getByLabelText('Состояние машины')).toHaveTextContent('Состояние q0')

    act(() => vi.advanceTimersByTime(ANIMATION_PHASE_MS))
    expect(screen.getByTestId('animation-phase')).toHaveTextContent('3. Состояние')
    expect(screen.getByLabelText('Состояние машины')).toHaveTextContent('Состояние q1')

    act(() => vi.advanceTimersByTime(ANIMATION_PHASE_MS))
    expect(screen.queryByTestId('animation-phase')).not.toBeInTheDocument()
  })

  it('открывает подсказки последовательно и отдельно показывает самостоятельность', () => {
    render(<App />)

    expect(screen.queryByText(/Какое состояние активно/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Открыть подсказку 1 из 3' }))
    expect(screen.getByText(/Какое состояние активно/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Открыть подсказку 2 из 3' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Сбросить машину' }))
    expect(screen.getByText(/Какое состояние активно/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Открыть подсказку 2 из 3' }))

    fireEvent.click(screen.getByLabelText('Записать 1, сдвинуться вправо, перейти в q1'))
    fireEvent.click(screen.getByRole('button', { name: 'Проверить ответ' }))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Самостоятельность: с поддержкой, подсказок использовано: 2',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Решить ещё раз' }))
    expect(screen.queryByText(/Какое состояние активно/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Открыть подсказку 1 из 3' })).toBeInTheDocument()
  })

  it('ведёт экзаменационный таймер и сохраняет попытку отдельно', () => {
    vi.useFakeTimers()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Экзаменационный' }))
    expect(screen.getByText('В экзаменационном режиме подсказки недоступны.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Открыть подсказку/ })).not.toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1100))
    expect(screen.getByLabelText('Состояние машины')).toHaveTextContent('Таймер 00:01')

    fireEvent.click(screen.getByLabelText('Записать 1, сдвинуться вправо, перейти в q1'))
    fireEvent.click(screen.getByRole('button', { name: 'Проверить ответ' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Режим и время: экзаменационный, 00:01')
    expect(screen.getByLabelText('Сохранённый прогресс')).toHaveTextContent('экзамен: 1')
    act(() => vi.advanceTimersByTime(2000))
    expect(useSessionStore.getState().elapsedMs).toBe(1000)
  })

  it('принимает целое число команд в задаче на трассировку', () => {
    useSessionStore.getState().selectTask('l1-trace-01')
    useSessionStore.getState().retry()
    render(<App />)

    const submit = screen.getByRole('button', { name: 'Проверить ответ' })
    expect(screen.getByRole('heading', { name: 'Короткая трассировка' })).toBeInTheDocument()
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Количество шагов'), { target: { value: '2.5' } })
    expect(submit).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Количество шагов'), { target: { value: '3' } })
    expect(submit).toBeEnabled()
    fireEvent.click(submit)

    expect(screen.getByRole('alert')).toHaveTextContent('Верно')
    expect(screen.getByRole('alert')).toHaveTextContent('Правильный ответ: 3 шага')
  })

  it('проходит задачу на восстановление отсутствующей команды', () => {
    useSessionStore.getState().selectTask('l1-completion-01')
    useSessionStore.getState().retry()
    render(<App />)

    expect(
      screen.getAllByRole('cell', { name: '—' }).some((cell) => cell.getAttribute('aria-current') === 'step'),
    ).toBe(true)
    fireEvent.click(screen.getByLabelText('Записать 0, сдвинуться влево, перейти в q1'))
    fireEvent.click(screen.getByRole('button', { name: 'Проверить ответ' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Верно')
    expect(screen.getByRole('alert')).toHaveTextContent('0 · L · q1')
  })
})
