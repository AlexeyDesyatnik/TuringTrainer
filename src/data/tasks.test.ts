import { describe, expect, it } from 'vitest'

import { TuringMachine } from '../core/TuringMachine'
import { checkAnswer } from '../core/checkAnswer'
import type { Task } from '../types/task'
import { tasks } from './tasks'
import { parseTask, parseTasks, TaskValidationError } from './validateTask'

function getTask(id: string): Task {
  const task = tasks.find((candidate) => candidate.id === id)
  if (task === undefined) throw new Error(`Не найдена тестовая задача ${id}`)
  return task
}

describe('runtime-валидация задач', () => {
  it('принимает текущий набор задач', () => {
    expect(parseTasks(tasks)).toEqual(tasks)
  })

  it('покрывает обязательную матрицу уровней 1 и 2', () => {
    expect(tasks.filter((task) => task.level === 1).map((task) => task.format)).toEqual([
      'command-reading', 'prediction', 'trace', 'completion',
    ])
    expect(tasks.filter((task) => task.level === 2).map((task) => task.format)).toEqual([
      'algorithm', 'prediction', 'algorithm', 'reverse',
    ])
    expect(tasks.filter((task) => task.level === 3).map((task) => task.format)).toEqual([
      'pattern', 'exam',
    ])
    expect(tasks).toHaveLength(10)
  })

  it('останавливает все машины набора без достижения защитного лимита', () => {
    for (const task of tasks) {
      const machine = new TuringMachine(task.machine)

      while (!machine.isHalted()) machine.step()

      expect(machine.getHaltReason(), task.id).not.toBe('step-limit')
      expect(machine.isHalted(), task.id).toBe(true)
    }
  })

  it('требует ровно три разные подсказки', () => {
    const task = getTask('l1-command-reading-01')
    const invalidTask: unknown = { ...task, hints: ['Только одна подсказка'] }

    expect(() => parseTask(invalidTask)).toThrow('требуется ровно три подсказки')
  })

  it('требует λ в алфавите', () => {
    const task = getTask('l1-command-reading-01')
    const invalidTask: unknown = { ...task, alphabet: ['0', '1'] }

    expect(() => parseTask(invalidTask)).toThrow('должен содержать пустой символ λ')
  })

  it('отклоняет некорректный ключ команды с понятным путём к ошибке', () => {
    const task = getTask('l1-prediction-01')
    const invalidTask: unknown = {
      ...task,
      machine: {
        ...task.machine,
        commands: {
          'scan,0': { write: '1', direction: 'L', nextState: 'check' },
        },
      },
    }

    expect(() => parseTask(invalidTask)).toThrowError(TaskValidationError)
    expect(() => parseTask(invalidTask)).toThrow('ключ должен быть JSON-парой [state, symbol]')
  })

  it('отклоняет ссылки команды на неизвестное состояние', () => {
    const task = getTask('l1-prediction-01')
    const firstCommand = Object.entries(task.machine.commands)[0]
    if (firstCommand === undefined) throw new Error('В задаче отсутствуют команды')

    const invalidTask: unknown = {
      ...task,
      machine: {
        ...task.machine,
        commands: {
          [firstCommand[0]]: { ...firstCommand[1], nextState: 'unknown' },
        },
      },
    }

    expect(() => parseTask(invalidTask)).toThrow('состояние unknown отсутствует в states')
  })

  it('требует, чтобы choice-ответ существовал среди вариантов', () => {
    const task = getTask('l1-command-reading-01')
    const invalidTask: unknown = {
      ...task,
      answer: { type: 'choice', value: 'missing-choice' },
    }

    expect(() => parseTask(invalidTask)).toThrow('вариант missing-choice отсутствует в choices')
  })

  it('отклоняет повторяющиеся идентификаторы задач', () => {
    const task = getTask('l1-command-reading-01')

    expect(() => parseTasks([task, structuredClone(task)])).toThrow(
      'идентификаторы задач должны быть уникальны',
    )
  })
})

describe('эталонные шаги учебных задач', () => {
  it('команда первой задачи соответствует правильному варианту', () => {
    const task = getTask('l1-command-reading-01')
    const machine = new TuringMachine(task.machine)

    expect(machine.step()).toMatchObject({
      read: '0',
      written: '1',
      direction: 'R',
      previousState: 'q0',
      newState: 'q1',
      previousHeadPosition: 0,
      newHeadPosition: 1,
    })
    expect(task.answer).toEqual({ type: 'choice', value: 'write-1-right-q1' })
    if (task.answer.type !== 'choice') throw new Error('Ожидался ответ с выбором варианта')
    const answerValue = task.answer.value
    expect(task.choices?.find((choice) => choice.value === answerValue)?.label).toBe(
      'Записать 1, сдвинуться вправо, перейти в q1',
    )
  })

  it('ядро подтверждает прогноз второй задачи', () => {
    const task = getTask('l1-prediction-01')
    const machine = new TuringMachine(task.machine)
    const result = machine.step()

    expect(task.answer.type).toBe('prediction')
    if (task.answer.type !== 'prediction') throw new Error('Ожидался ответ-прогноз')

    expect(result).toMatchObject({
      read: '0',
      written: task.answer.write,
      direction: task.answer.direction,
      newState: task.answer.nextState,
      previousHeadPosition: 0,
      newHeadPosition: -1,
    })
    expect(machine.getTapeView(0, 1)).toEqual([
      { index: -1, symbol: '1' },
      { index: 0, symbol: '1' },
      { index: 1, symbol: '1' },
    ])
  })

  it('подтверждает полный ответ задачи на короткую трассировку', () => {
    const task = getTask('l1-trace-01')
    const machine = new TuringMachine(task.machine)
    const trace = []

    while (!machine.isHalted()) {
      const result = machine.step()
      if (result !== null) trace.push(result)
    }

    expect(task.answer).toEqual({ type: 'steps', value: 3 })
    expect(trace).toHaveLength(3)
    expect(trace.map((step) => step.read)).toEqual(['1', '1', 'λ'])
    expect(machine.getTapeView(1, 1)).toEqual([
      { index: 0, symbol: '0' },
      { index: 1, symbol: '0' },
      { index: 2, symbol: 'λ' },
    ])
    expect(machine.getHaltReason()).toBe('stop-command')
  })

  it('оставляет восстанавливаемую команду явно отсутствующей в таблице', () => {
    const task = getTask('l1-completion-01')
    const machine = new TuringMachine(task.machine)

    expect(machine.step()).toBeNull()
    expect(machine.getHaltReason()).toBe('missing-command')
    expect(task.answer).toEqual({ type: 'choice', value: 'write-0-left-q1' })
    expect(task.choices?.find((choice) => choice.value === 'write-0-left-q1')?.label).toContain(
      'Записать 0, сдвинуться влево, перейти в q1',
    )
  })

  it('подтверждает роль обратного прохода состояния return', () => {
    const task = getTask('l2-state-role-01')
    const machine = new TuringMachine(task.machine)
    const trace = []

    while (!machine.isHalted()) {
      const result = machine.step()
      if (result !== null) trace.push(result)
    }

    expect(trace).toHaveLength(8)
    expect(trace.map((step) => step.previousState)).toEqual([
      'scan', 'scan', 'scan', 'scan', 'return', 'return', 'return', 'return',
    ])
    expect(machine.getTapeView(1, 2)).toEqual([
      { index: -1, symbol: 'λ' },
      { index: 0, symbol: '0' },
      { index: 1, symbol: '0' },
      { index: 2, symbol: '0' },
      { index: 3, symbol: 'λ' },
    ])
    expect(task.answer).toEqual({ type: 'choice', value: 'return-left-and-zero' })
  })

  it('подтверждает прогноз результата ровно трёх шагов', () => {
    const task = getTask('l2-multi-prediction-01')
    const machine = new TuringMachine(task.machine)

    machine.step()
    machine.step()
    machine.step()

    expect(machine.isHalted()).toBe(false)
    expect(machine.getStepCount()).toBe(3)
    expect(machine.countSymbol('1')).toBe(2)
    expect(machine.getTapeView(1, 1)).toEqual([
      { index: 0, symbol: '1' },
      { index: 1, symbol: '0' },
      { index: 2, symbol: '1' },
    ])
    expect(task.answer).toEqual({ type: 'count', symbol: '1', value: 2 })
  })

  it('подтверждает функцию дописывания единицы справа', () => {
    const task = getTask('l2-algorithm-function-01')
    const machine = new TuringMachine(task.machine)

    while (!machine.isHalted()) machine.step()

    expect(machine.getStepCount()).toBe(4)
    expect(machine.countSymbol('1')).toBe(4)
    expect(machine.getTapeView(2, 2)).toEqual([
      { index: 0, symbol: '1' },
      { index: 1, symbol: '1' },
      { index: 2, symbol: '1' },
      { index: 3, symbol: '1' },
      { index: 4, symbol: 'λ' },
    ])
    expect(task.answer).toEqual({ type: 'choice', value: 'append-one' })
  })

  it('подтверждает обратный поиск предыдущего состояния', () => {
    const task = getTask('l2-reverse-01')
    const hypotheticalMachine = new TuringMachine({
      ...task.machine,
      initialTape: { 0: '0' },
      initialState: 'qA',
    })

    expect(hypotheticalMachine.step()).toMatchObject({
      read: '0',
      written: '1',
      direction: 'R',
      previousState: 'qA',
      newState: 'qB',
    })
    expect(task.answer).toEqual({ type: 'choice', value: 'qA' })
  })

  it('подтверждает инверсию длинной ленты и перенос правила', () => {
    const task = getTask('l3-pattern-01')
    const machine = new TuringMachine(task.machine)

    while (!machine.isHalted()) machine.step()

    const actualTape = Object.fromEntries(
      machine.getTapeView(7, 8)
        .filter((cell) => cell.symbol !== 'λ')
        .map((cell) => [cell.index, cell.symbol]),
    )
    expect(task.answer.type).toBe('tape')
    if (task.answer.type !== 'tape') throw new Error('Ожидался ответ-лента')
    expect(checkAnswer(task.answer, { type: 'tape', value: actualTape })).toBe(true)
    expect(machine.getStepCount()).toBe(17)

    const shortMachine = new TuringMachine({
      ...task.machine,
      initialTape: { 0: '0', 1: '1', 2: '0' },
    })
    while (!shortMachine.isHalted()) shortMachine.step()
    expect(shortMachine.getTapeView(1, 1)).toEqual([
      { index: 0, symbol: '1' },
      { index: 1, symbol: '0' },
      { index: 2, symbol: '1' },
    ])
  })

  it('подтверждает аналитический подсчёт пар и нечётного остатка', () => {
    const task = getTask('l3-exam-01')
    const machine = new TuringMachine(task.machine)

    while (!machine.isHalted()) machine.step()

    expect(machine.getStepCount()).toBe(22)
    expect(machine.countSymbol('1')).toBe(10)
    expect(task.answer).toEqual({ type: 'count', symbol: '1', value: 10 })

    const shortMachine = new TuringMachine({
      ...task.machine,
      initialTape: { 0: '1', 1: '1', 2: '1', 3: '1', 4: '1' },
    })
    while (!shortMachine.isHalted()) shortMachine.step()
    expect(shortMachine.countSymbol('1')).toBe(2)
  })
})
