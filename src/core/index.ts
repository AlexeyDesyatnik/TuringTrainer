export { makeCommandKey, parseCommandKey } from './commandKey'
export { checkAnswer } from './checkAnswer'
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
