import type { TapeSymbol } from '../types/machine'

export function parseTapeInput(
  startIndexValue: string,
  input: string,
  alphabet: TapeSymbol[],
): Record<number, TapeSymbol> | null {
  const startIndex = Number(startIndexValue)
  const symbols = Array.from(input.replace(/\s/g, ''))

  if (!Number.isInteger(startIndex) || symbols.length === 0) return null
  if (symbols.some((symbol) => !alphabet.includes(symbol))) return null

  return Object.fromEntries(
    symbols.map((symbol, offset) => [startIndex + offset, symbol]),
  )
}
