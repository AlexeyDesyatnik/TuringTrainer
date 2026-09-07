import { describe, expect, it } from 'vitest'

import type { TaskAnswer } from '../types/task'
import { checkAnswer } from './checkAnswer'
import { EMPTY_SYMBOL } from './TuringMachine'

describe('checkAnswer', () => {
  it('точно сравнивает выбор, число шагов и счётчик символов', () => {
    expect(checkAnswer(
      { type: 'choice', value: 'a' },
      { type: 'choice', value: 'a' },
    )).toBe(true)
    expect(checkAnswer(
      { type: 'steps', value: 4 },
      { type: 'steps', value: 5 },
    )).toBe(false)
    expect(checkAnswer(
      { type: 'count', symbol: '1', value: 3 },
      { type: 'count', symbol: '0', value: 3 },
    )).toBe(false)
  })

  it('сравнивает все обязательные поля прогноза', () => {
    const expected: TaskAnswer = {
      type: 'prediction',
      write: '1',
      direction: 'L',
      nextState: 'q1',
    }

    expect(checkAnswer(expected, { ...expected })).toBe(true)
    expect(checkAnswer(expected, { ...expected, direction: 'R' })).toBe(false)
    expect(checkAnswer(expected, { ...expected, nextState: 'q2' })).toBe(false)
  })

  it('игнорирует явно записанные пустые символы в ответе-ленте', () => {
    expect(checkAnswer(
      { type: 'tape', value: { 0: '1', 1: '0' } },
      { type: 'tape', value: { [-2]: EMPTY_SYMBOL, 0: '1', 1: '0', 4: EMPTY_SYMBOL } },
    )).toBe(true)
  })

  it('не считает ответы разных типов равными', () => {
    expect(checkAnswer(
      { type: 'steps', value: 1 },
      { type: 'choice', value: '1' },
    )).toBe(false)
  })
})
