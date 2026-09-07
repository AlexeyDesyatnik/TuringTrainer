import type { Direction, TapeSymbol, TuringMachineConfig } from './machine'

export const TASK_FORMATS = [
  'command-reading',
  'prediction',
  'trace',
  'completion',
  'algorithm',
  'reverse',
  'pattern',
  'exam',
] as const

export type TaskFormat = (typeof TASK_FORMATS)[number]

export type TaskAnswer =
  | { type: 'tape'; value: Record<number, TapeSymbol> }
  | { type: 'count'; symbol: TapeSymbol; value: number }
  | { type: 'steps'; value: number }
  | { type: 'prediction'; write: TapeSymbol; direction: Direction; nextState: string }
  | { type: 'choice'; value: string }

export interface TaskChoice {
  value: string
  label: string
}

export interface CommonMistake {
  type: string
  description: string
}

export interface TaskSource {
  kind: 'original' | 'official'
  label: string
  url?: string
}

export interface Task {
  id: string
  level: 1 | 2 | 3
  format: TaskFormat
  skills: string[]
  title: string
  description: string
  machine: TuringMachineConfig
  alphabet: TapeSymbol[]
  states: string[]
  answer: TaskAnswer
  choices?: TaskChoice[]
  hints: [string, string, string]
  explanation: string
  commonMistakes: CommonMistake[]
  source: TaskSource
}
