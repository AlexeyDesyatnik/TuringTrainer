export { makeCommandKey, parseCommandKey } from './commandKey'
export { checkAnswer } from './checkAnswer'
export { parseTapeInput } from './parseTapeInput'
export { EMPTY_SYMBOL, TuringMachine } from './TuringMachine'
export type {
  Command,
  CommandTable,
  Direction,
  HaltReason,
  MachineState,
  StepResult,
  TapeCell,
  TapeSymbol,
  TuringMachineConfig,
} from '../types/machine'
