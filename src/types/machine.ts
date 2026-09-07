export type TapeSymbol = string
export type MachineState = string
export type Direction = 'L' | 'R' | 'N' | 'S'
export type HaltReason = 'stop-command' | 'missing-command' | 'step-limit'

export interface Command {
  write: TapeSymbol
  direction: Direction
  nextState: MachineState
}

export type CommandTable = Record<string, Command>

export interface TuringMachineConfig {
  initialTape: Record<number, TapeSymbol>
  headPosition: number
  initialState: MachineState
  commands: CommandTable
  stepLimit?: number
}

export interface StepResult {
  read: TapeSymbol
  written: TapeSymbol
  direction: Direction
  previousState: MachineState
  newState: MachineState
  previousHeadPosition: number
  newHeadPosition: number
  halted: boolean
  haltReason?: HaltReason
}

export interface TapeCell {
  index: number
  symbol: TapeSymbol
}
