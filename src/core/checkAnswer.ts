import { EMPTY_SYMBOL } from './TuringMachine'
import type { TaskAnswer } from '../types/task'

export function checkAnswer(expected: TaskAnswer, submitted: TaskAnswer): boolean {
  if (expected.type !== submitted.type) return false

  switch (expected.type) {
    case 'choice':
      return submitted.type === 'choice' && expected.value === submitted.value
    case 'count':
      return submitted.type === 'count'
        && expected.symbol === submitted.symbol
        && expected.value === submitted.value
    case 'steps':
      return submitted.type === 'steps' && expected.value === submitted.value
    case 'prediction':
      return submitted.type === 'prediction'
        && expected.write === submitted.write
        && expected.direction === submitted.direction
        && expected.nextState === submitted.nextState
    case 'tape':
      return submitted.type === 'tape' && tapesEqual(expected.value, submitted.value)
  }
}

function tapesEqual(
  expected: Record<number, string>,
  submitted: Record<number, string>,
): boolean {
  const expectedEntries = nonEmptyEntries(expected)
  const submittedEntries = nonEmptyEntries(submitted)

  if (expectedEntries.length !== submittedEntries.length) return false

  return expectedEntries.every(
    ([index, symbol], position) => {
      const submittedEntry = submittedEntries[position]
      return submittedEntry?.[0] === index && submittedEntry[1] === symbol
    },
  )
}

function nonEmptyEntries(tape: Record<number, string>): Array<[number, string]> {
  return Object.entries(tape)
    .map(([index, symbol]): [number, string] => [Number(index), symbol])
    .filter(([, symbol]) => symbol !== EMPTY_SYMBOL)
    .sort(([left], [right]) => left - right)
}
