import { describe, expect, it } from 'vitest'

import { TuringMachine } from '../core/TuringMachine'
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
})
