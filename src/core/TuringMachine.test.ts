import { describe, expect, it } from 'vitest'

import type { Command, TuringMachineConfig } from '../types/machine'
import { makeCommandKey, parseCommandKey } from './commandKey'
import { EMPTY_SYMBOL, TuringMachine } from './TuringMachine'

function createConfig(overrides: Partial<TuringMachineConfig> = {}): TuringMachineConfig {
  return {
    initialTape: { 0: '1' },
    headPosition: 0,
    initialState: 'q0',
    commands: {},
    ...overrides,
  }
}

function commandTable(entries: Array<[string, string, Command]>): TuringMachineConfig['commands'] {
  return Object.fromEntries(
    entries.map(([state, symbol, command]) => [makeCommandKey(state, symbol), command]),
  )
}

describe('makeCommandKey', () => {
  it('не создаёт коллизий для состояний и символов с запятыми', () => {
    expect(makeCommandKey('q,1', '0')).not.toBe(makeCommandKey('q', '1,0'))
  })

  it('читает ключ той же общей функцией формата', () => {
    const key = makeCommandKey('q,1', 'a,b')

    expect(parseCommandKey(key)).toEqual(['q,1', 'a,b'])
    expect(parseCommandKey('q0,0')).toBeNull()
    expect(parseCommandKey('["q0", "0", "лишнее"]')).toBeNull()
  })
})

describe('TuringMachine', () => {
  it('инициализирует разреженную ленту с отрицательными индексами', () => {
    const machine = new TuringMachine(createConfig({
      initialTape: { [-3]: 'A', 0: EMPTY_SYMBOL, 4: 'B' },
      headPosition: -3,
    }))

    expect(machine.readSymbol()).toBe('A')
    expect(machine.getTapeView(0, 4)).toEqual([
      { index: -4, symbol: EMPTY_SYMBOL },
      { index: -3, symbol: 'A' },
      { index: -2, symbol: EMPTY_SYMBOL },
      { index: -1, symbol: EMPTY_SYMBOL },
      { index: 0, symbol: EMPTY_SYMBOL },
      { index: 1, symbol: EMPTY_SYMBOL },
      { index: 2, symbol: EMPTY_SYMBOL },
      { index: 3, symbol: EMPTY_SYMBOL },
      { index: 4, symbol: 'B' },
    ])
  })

  it('читает записанный символ и λ из отсутствующей ячейки', () => {
    const machine = new TuringMachine(createConfig({
      commands: commandTable([
        ['q0', '1', { write: '1', direction: 'R', nextState: 'q1' }],
      ]),
    }))

    expect(machine.readSymbol()).toBe('1')
    machine.step()
    expect(machine.readSymbol()).toBe(EMPTY_SYMBOL)
  })

  it.each([
    ['L', -1],
    ['R', 1],
    ['N', 0],
    ['S', 0],
  ] as const)('записывает символ и выполняет направление %s', (direction, expectedPosition) => {
    const machine = new TuringMachine(createConfig({
      commands: commandTable([
        ['q0', '1', { write: '0', direction, nextState: 'q1' }],
      ]),
    }))

    const result = machine.step()

    expect(result).toMatchObject({
      read: '1',
      written: '0',
      direction,
      previousState: 'q0',
      newState: 'q1',
      previousHeadPosition: 0,
      newHeadPosition: expectedPosition,
    })
    expect(machine.getTapeView(0, 0)[0]?.symbol).toBe('0')
    expect(machine.getHeadPosition()).toBe(expectedPosition)
    expect(machine.getState()).toBe('q1')
    expect(machine.isHalted()).toBe(direction === 'S')
  })

  it('атомарно соблюдает порядок «запись → движение → состояние»', () => {
    const machine = new TuringMachine(createConfig({
      initialTape: { 0: 'A', 1: 'B' },
      commands: commandTable([
        ['q0', 'A', { write: 'X', direction: 'R', nextState: 'q1' }],
      ]),
    }))

    expect(machine.step()).toEqual({
      read: 'A',
      written: 'X',
      direction: 'R',
      previousState: 'q0',
      newState: 'q1',
      previousHeadPosition: 0,
      newHeadPosition: 1,
      halted: false,
    })
    expect(machine.getTapeView(0, 1)).toEqual([
      { index: -1, symbol: EMPTY_SYMBOL },
      { index: 0, symbol: 'X' },
      { index: 1, symbol: 'B' },
    ])
  })

  it('останавливается после команды S', () => {
    const machine = new TuringMachine(createConfig({
      commands: commandTable([
        ['q0', '1', { write: '0', direction: 'S', nextState: 'halt' }],
      ]),
    }))

    expect(machine.step()).toMatchObject({ halted: true, haltReason: 'stop-command' })
    expect(machine.getHaltReason()).toBe('stop-command')
    expect(machine.getStepCount()).toBe(1)
  })

  it('останавливается без изменений при отсутствии команды', () => {
    const machine = new TuringMachine(createConfig())

    expect(machine.step()).toBeNull()
    expect(machine.isHalted()).toBe(true)
    expect(machine.getHaltReason()).toBe('missing-command')
    expect(machine.getStepCount()).toBe(0)
    expect(machine.getState()).toBe('q0')
    expect(machine.getHeadPosition()).toBe(0)
    expect(machine.readSymbol()).toBe('1')
  })

  it('останавливается сразу после последнего разрешённого шага', () => {
    const machine = new TuringMachine(createConfig({
      initialTape: {},
      stepLimit: 2,
      commands: commandTable([
        ['q0', EMPTY_SYMBOL, { write: EMPTY_SYMBOL, direction: 'R', nextState: 'q0' }],
      ]),
    }))

    expect(machine.step()).toMatchObject({ halted: false })
    expect(machine.step()).toMatchObject({ halted: true, haltReason: 'step-limit' })
    expect(machine.getStepCount()).toBe(2)
    expect(machine.getHeadPosition()).toBe(2)
  })

  it('не выполняет ни одной команды при нулевом лимите', () => {
    const machine = new TuringMachine(createConfig({
      stepLimit: 0,
      commands: commandTable([
        ['q0', '1', { write: '0', direction: 'R', nextState: 'q1' }],
      ]),
    }))

    expect(machine.step()).toBeNull()
    expect(machine.getHaltReason()).toBe('step-limit')
    expect(machine.getStepCount()).toBe(0)
    expect(machine.readSymbol()).toBe('1')
  })

  it('не изменяет состояние при повторном step после остановки', () => {
    const machine = new TuringMachine(createConfig({
      commands: commandTable([
        ['q0', '1', { write: '0', direction: 'S', nextState: 'halt' }],
      ]),
    }))

    machine.step()
    const stateAfterHalt = {
      tape: machine.getTapeView(0, 1),
      head: machine.getHeadPosition(),
      state: machine.getState(),
      steps: machine.getStepCount(),
      reason: machine.getHaltReason(),
    }

    expect(machine.step()).toBeNull()
    expect({
      tape: machine.getTapeView(0, 1),
      head: machine.getHeadPosition(),
      state: machine.getState(),
      steps: machine.getStepCount(),
      reason: machine.getHaltReason(),
    }).toEqual(stateAfterHalt)
  })

  it('отменяет обычный шаг', () => {
    const machine = new TuringMachine(createConfig({
      commands: commandTable([
        ['q0', '1', { write: '0', direction: 'R', nextState: 'q1' }],
      ]),
    }))

    machine.step()

    expect(machine.undo()).toBe(true)
    expect(machine.readSymbol()).toBe('1')
    expect(machine.getHeadPosition()).toBe(0)
    expect(machine.getState()).toBe('q0')
    expect(machine.getStepCount()).toBe(0)
    expect(machine.isHalted()).toBe(false)
    expect(machine.undo()).toBe(false)
  })

  it('отменяет останавливающий шаг и восстанавливает причину остановки', () => {
    const machine = new TuringMachine(createConfig({
      commands: commandTable([
        ['q0', '1', { write: '0', direction: 'S', nextState: 'halt' }],
      ]),
    }))

    machine.step()
    expect(machine.isHalted()).toBe(true)

    expect(machine.undo()).toBe(true)
    expect(machine.isHalted()).toBe(false)
    expect(machine.getHaltReason()).toBeNull()
    expect(machine.getStepCount()).toBe(0)
    expect(machine.getState()).toBe('q0')
    expect(machine.readSymbol()).toBe('1')
  })

  it('сбрасывает машину после нескольких шагов и остановки', () => {
    const machine = new TuringMachine(createConfig({
      initialTape: { [-1]: '1', 0: '1' },
      commands: commandTable([
        ['q0', '1', { write: '0', direction: 'L', nextState: 'q0' }],
        ['q0', EMPTY_SYMBOL, { write: EMPTY_SYMBOL, direction: 'S', nextState: 'halt' }],
      ]),
    }))

    machine.step()
    machine.step()
    machine.step()
    machine.reset()

    expect(machine.getTapeView(0, 1)).toEqual([
      { index: -1, symbol: '1' },
      { index: 0, symbol: '1' },
      { index: 1, symbol: EMPTY_SYMBOL },
    ])
    expect(machine.getHeadPosition()).toBe(0)
    expect(machine.getState()).toBe('q0')
    expect(machine.getStepCount()).toBe(0)
    expect(machine.isHalted()).toBe(false)
    expect(machine.getHaltReason()).toBeNull()
    expect(machine.undo()).toBe(false)
  })

  it('удаляет λ из разреженной ленты и запрещает считать пустые ячейки', () => {
    const machine = new TuringMachine(createConfig({
      commands: commandTable([
        ['q0', '1', { write: EMPTY_SYMBOL, direction: 'N', nextState: 'q1' }],
      ]),
    }))

    machine.step()

    expect(machine.readSymbol()).toBe(EMPTY_SYMBOL)
    expect(machine.countSymbol('1')).toBe(0)
    expect(() => machine.countSymbol(EMPTY_SYMBOL)).toThrow('бесконечное число')
  })

  it('выполняет полную эталонную трассировку замены единиц нулями', () => {
    const machine = new TuringMachine(createConfig({
      initialTape: { 0: '1', 1: '1', 2: '1' },
      stepLimit: 10,
      commands: commandTable([
        ['scan', '1', { write: '0', direction: 'R', nextState: 'scan' }],
        ['scan', EMPTY_SYMBOL, { write: EMPTY_SYMBOL, direction: 'S', nextState: 'halt' }],
      ]),
      initialState: 'scan',
    }))

    const trace = []
    let result = machine.step()

    while (result !== null) {
      trace.push(result)
      if (result.halted) break
      result = machine.step()
    }

    expect(trace).toHaveLength(4)
    expect(trace.map((step) => step.read)).toEqual(['1', '1', '1', EMPTY_SYMBOL])
    expect(machine.getTapeView(1, 2)).toEqual([
      { index: -1, symbol: EMPTY_SYMBOL },
      { index: 0, symbol: '0' },
      { index: 1, symbol: '0' },
      { index: 2, symbol: '0' },
      { index: 3, symbol: EMPTY_SYMBOL },
    ])
    expect(machine.getState()).toBe('halt')
    expect(machine.getHeadPosition()).toBe(3)
    expect(machine.getStepCount()).toBe(4)
    expect(machine.getHaltReason()).toBe('stop-command')
  })

  it('отклоняет некорректную позицию головки и лимит', () => {
    expect(() => new TuringMachine(createConfig({ headPosition: 0.5 }))).toThrow('целым числом')
    expect(() => new TuringMachine(createConfig({ stepLimit: -1 }))).toThrow('неотрицательным')
  })
})
