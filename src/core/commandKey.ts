import type { MachineState, TapeSymbol } from '../types/machine'

export function makeCommandKey(state: MachineState, symbol: TapeSymbol): string {
  return JSON.stringify([state, symbol])
}

export function parseCommandKey(key: string): [MachineState, TapeSymbol] | null {
  try {
    const value: unknown = JSON.parse(key)

    if (
      !Array.isArray(value)
      || value.length !== 2
      || typeof value[0] !== 'string'
      || typeof value[1] !== 'string'
    ) {
      return null
    }

    return [value[0], value[1]]
  } catch {
    return null
  }
}
