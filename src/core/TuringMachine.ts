import type {
  CommandTable,
  HaltReason,
  MachineState,
  StepResult,
  TapeCell,
  TapeSymbol,
  TuringMachineConfig,
} from '../types/machine'
import { makeCommandKey } from './commandKey'

export const EMPTY_SYMBOL = 'λ'

interface MachineSnapshot {
  tape: Map<number, TapeSymbol>
  headPosition: number
  state: MachineState
  halted: boolean
  haltReason: HaltReason | null
  stepCount: number
}

export class TuringMachine {
  private readonly initialTape: Map<number, TapeSymbol>
  private readonly initialHeadPosition: number
  private readonly initialState: MachineState
  private readonly commands: CommandTable
  private readonly stepLimit: number | undefined

  private tape: Map<number, TapeSymbol>
  private headPosition: number
  private state: MachineState
  private halted = false
  private haltReason: HaltReason | null = null
  private stepCount = 0
  private history: MachineSnapshot[] = []

  constructor(config: TuringMachineConfig) {
    if (!Number.isInteger(config.headPosition)) {
      throw new Error('Позиция головки должна быть целым числом')
    }

    if (
      config.stepLimit !== undefined
      && (!Number.isInteger(config.stepLimit) || config.stepLimit < 0)
    ) {
      throw new Error('Лимит шагов должен быть неотрицательным целым числом')
    }

    this.initialTape = this.createTape(config.initialTape)
    this.initialHeadPosition = config.headPosition
    this.initialState = config.initialState
    this.commands = Object.fromEntries(
      Object.entries(config.commands).map(([key, command]) => [key, { ...command }]),
    )
    this.stepLimit = config.stepLimit

    this.tape = new Map(this.initialTape)
    this.headPosition = this.initialHeadPosition
    this.state = this.initialState
  }

  readSymbol(): TapeSymbol {
    return this.tape.get(this.headPosition) ?? EMPTY_SYMBOL
  }

  step(): StepResult | null {
    if (this.halted) {
      return null
    }

    if (this.stepLimit !== undefined && this.stepCount >= this.stepLimit) {
      this.halted = true
      this.haltReason = 'step-limit'
      return null
    }

    const read = this.readSymbol()
    const command = this.commands[makeCommandKey(this.state, read)]

    if (command === undefined) {
      this.halted = true
      this.haltReason = 'missing-command'
      return null
    }

    this.history.push(this.createSnapshot())

    const previousState = this.state
    const previousHeadPosition = this.headPosition

    if (command.write === EMPTY_SYMBOL) {
      this.tape.delete(this.headPosition)
    } else {
      this.tape.set(this.headPosition, command.write)
    }

    if (command.direction === 'L') {
      this.headPosition -= 1
    } else if (command.direction === 'R') {
      this.headPosition += 1
    }

    this.state = command.nextState
    this.stepCount += 1

    if (command.direction === 'S') {
      this.halted = true
      this.haltReason = 'stop-command'
    } else if (this.stepLimit !== undefined && this.stepCount >= this.stepLimit) {
      this.halted = true
      this.haltReason = 'step-limit'
    }

    const result: StepResult = {
      read,
      written: command.write,
      direction: command.direction,
      previousState,
      newState: this.state,
      previousHeadPosition,
      newHeadPosition: this.headPosition,
      halted: this.halted,
    }

    if (this.haltReason !== null) {
      result.haltReason = this.haltReason
    }

    return result
  }

  undo(): boolean {
    const snapshot = this.history.pop()

    if (snapshot === undefined) {
      return false
    }

    this.restoreSnapshot(snapshot)
    return true
  }

  reset(): void {
    this.tape = new Map(this.initialTape)
    this.headPosition = this.initialHeadPosition
    this.state = this.initialState
    this.halted = false
    this.haltReason = null
    this.stepCount = 0
    this.history = []
  }

  getTapeView(center: number, radius: number): TapeCell[] {
    if (!Number.isInteger(center) || !Number.isInteger(radius) || radius < 0) {
      throw new Error('Центр и радиус диапазона ленты должны быть целыми числами')
    }

    const cells: TapeCell[] = []

    for (let index = center - radius; index <= center + radius; index += 1) {
      cells.push({ index, symbol: this.tape.get(index) ?? EMPTY_SYMBOL })
    }

    return cells
  }

  countSymbol(symbol: TapeSymbol): number {
    if (symbol === EMPTY_SYMBOL) {
      throw new Error('Нельзя подсчитать бесконечное число пустых ячеек')
    }

    let count = 0

    for (const tapeSymbol of this.tape.values()) {
      if (tapeSymbol === symbol) {
        count += 1
      }
    }

    return count
  }

  getState(): MachineState {
    return this.state
  }

  getHeadPosition(): number {
    return this.headPosition
  }

  isHalted(): boolean {
    return this.halted
  }

  getHaltReason(): HaltReason | null {
    return this.haltReason
  }

  getStepCount(): number {
    return this.stepCount
  }

  private createTape(initialTape: Record<number, TapeSymbol>): Map<number, TapeSymbol> {
    const tape = new Map<number, TapeSymbol>()

    for (const [rawIndex, symbol] of Object.entries(initialTape)) {
      const index = Number(rawIndex)

      if (!Number.isInteger(index)) {
        throw new Error(`Индекс ячейки должен быть целым числом: ${rawIndex}`)
      }

      if (symbol !== EMPTY_SYMBOL) {
        tape.set(index, symbol)
      }
    }

    return tape
  }

  private createSnapshot(): MachineSnapshot {
    return {
      tape: new Map(this.tape),
      headPosition: this.headPosition,
      state: this.state,
      halted: this.halted,
      haltReason: this.haltReason,
      stepCount: this.stepCount,
    }
  }

  private restoreSnapshot(snapshot: MachineSnapshot): void {
    this.tape = new Map(snapshot.tape)
    this.headPosition = snapshot.headPosition
    this.state = snapshot.state
    this.halted = snapshot.halted
    this.haltReason = snapshot.haltReason
    this.stepCount = snapshot.stepCount
  }
}
