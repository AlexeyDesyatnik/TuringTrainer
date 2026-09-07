import { parseCommandKey } from '../core/commandKey'
import { EMPTY_SYMBOL } from '../core/TuringMachine'
import type { Task } from '../types/task'
import { TASK_FORMATS } from '../types/task'

type UnknownRecord = Record<string, unknown>

const DIRECTIONS = new Set(['L', 'R', 'N', 'S'])
const ANSWER_TYPES = new Set(['tape', 'count', 'steps', 'prediction', 'choice'])

export class TaskValidationError extends Error {
  readonly issues: string[]

  constructor(issues: string[]) {
    super(`Некорректные данные задачи:\n- ${issues.join('\n- ')}`)
    this.name = 'TaskValidationError'
    this.issues = issues
  }
}

export function parseTask(value: unknown, path = 'task'): Task {
  const issues: string[] = []

  validateTask(value, path, issues)

  if (issues.length > 0) {
    throw new TaskValidationError(issues)
  }

  return value as Task
}

export function parseTasks(value: unknown): Task[] {
  if (!Array.isArray(value)) {
    throw new TaskValidationError(['tasks: ожидался массив задач'])
  }

  const tasks = value.map((task, index) => parseTask(task, `tasks[${index}]`))
  const ids = new Set<string>()
  const duplicateIds = new Set<string>()

  for (const task of tasks) {
    if (ids.has(task.id)) duplicateIds.add(task.id)
    ids.add(task.id)
  }

  if (duplicateIds.size > 0) {
    throw new TaskValidationError([
      `tasks: идентификаторы задач должны быть уникальны; повторы: ${[...duplicateIds].join(', ')}`,
    ])
  }

  return tasks
}

function validateTask(value: unknown, path: string, issues: string[]): void {
  if (!isRecord(value)) {
    issues.push(`${path}: ожидался объект`)
    return
  }

  requireString(value.id, `${path}.id`, issues)

  if (value.level !== 1 && value.level !== 2 && value.level !== 3) {
    issues.push(`${path}.level: допустимы только уровни 1, 2 или 3`)
  }

  if (typeof value.format !== 'string' || !TASK_FORMATS.includes(value.format as never)) {
    issues.push(`${path}.format: неизвестный формат задачи`)
  }

  validateUniqueStrings(value.skills, `${path}.skills`, issues, 1)
  requireString(value.title, `${path}.title`, issues)
  requireString(value.description, `${path}.description`, issues)
  requireString(value.explanation, `${path}.explanation`, issues)

  const alphabet = validateUniqueStrings(value.alphabet, `${path}.alphabet`, issues, 1)
  const states = validateUniqueStrings(value.states, `${path}.states`, issues, 1)

  if (alphabet !== null && !alphabet.has(EMPTY_SYMBOL)) {
    issues.push(`${path}.alphabet: должен содержать пустой символ ${EMPTY_SYMBOL}`)
  }

  validateMachine(value.machine, `${path}.machine`, issues, alphabet, states)
  validateAnswer(value.answer, value.choices, `${path}.answer`, issues, alphabet, states)
  validateHints(value.hints, `${path}.hints`, issues)
  validateCommonMistakes(value.commonMistakes, `${path}.commonMistakes`, issues)
  validateSource(value.source, `${path}.source`, issues)
}

function validateMachine(
  value: unknown,
  path: string,
  issues: string[],
  alphabet: Set<string> | null,
  states: Set<string> | null,
): void {
  if (!isRecord(value)) {
    issues.push(`${path}: ожидался объект конфигурации машины`)
    return
  }

  if (!Number.isInteger(value.headPosition)) {
    issues.push(`${path}.headPosition: ожидалось целое число`)
  }

  const initialState = requireString(value.initialState, `${path}.initialState`, issues)

  if (initialState !== null && states !== null && !states.has(initialState)) {
    issues.push(`${path}.initialState: состояние ${initialState} отсутствует в states`)
  }

  if (
    value.stepLimit !== undefined
    && (!Number.isInteger(value.stepLimit) || (value.stepLimit as number) < 0)
  ) {
    issues.push(`${path}.stepLimit: ожидалось неотрицательное целое число`)
  }

  if (!isRecord(value.initialTape)) {
    issues.push(`${path}.initialTape: ожидался объект ленты`)
  } else {
    for (const [index, symbol] of Object.entries(value.initialTape)) {
      if (!Number.isInteger(Number(index))) {
        issues.push(`${path}.initialTape.${index}: индекс должен быть целым числом`)
      }
      validateSymbol(symbol, `${path}.initialTape.${index}`, issues, alphabet)
    }
  }

  if (!isRecord(value.commands)) {
    issues.push(`${path}.commands: ожидался объект таблицы команд`)
    return
  }

  for (const [key, command] of Object.entries(value.commands)) {
    const commandPath = `${path}.commands[${JSON.stringify(key)}]`
    const pair = parseCommandKey(key)

    if (pair === null) {
      issues.push(`${commandPath}: ключ должен быть JSON-парой [state, symbol]`)
    } else {
      const [state, symbol] = pair
      if (states !== null && !states.has(state)) {
        issues.push(`${commandPath}: состояние ${state} отсутствует в states`)
      }
      if (alphabet !== null && !alphabet.has(symbol)) {
        issues.push(`${commandPath}: читаемый символ ${symbol} отсутствует в alphabet`)
      }
    }

    if (!isRecord(command)) {
      issues.push(`${commandPath}: ожидался объект команды`)
      continue
    }

    validateSymbol(command.write, `${commandPath}.write`, issues, alphabet)

    if (typeof command.direction !== 'string' || !DIRECTIONS.has(command.direction)) {
      issues.push(`${commandPath}.direction: допустимы только L, R, N или S`)
    }

    const nextState = requireString(command.nextState, `${commandPath}.nextState`, issues)
    if (nextState !== null && states !== null && !states.has(nextState)) {
      issues.push(`${commandPath}.nextState: состояние ${nextState} отсутствует в states`)
    }
  }
}

function validateAnswer(
  value: unknown,
  choicesValue: unknown,
  path: string,
  issues: string[],
  alphabet: Set<string> | null,
  states: Set<string> | null,
): void {
  if (!isRecord(value) || typeof value.type !== 'string' || !ANSWER_TYPES.has(value.type)) {
    issues.push(`${path}: неизвестный тип ответа`)
    return
  }

  if (value.type === 'tape') {
    if (!isRecord(value.value)) {
      issues.push(`${path}.value: ожидался объект ленты`)
      return
    }
    for (const [index, symbol] of Object.entries(value.value)) {
      if (!Number.isInteger(Number(index))) {
        issues.push(`${path}.value.${index}: индекс должен быть целым числом`)
      }
      validateSymbol(symbol, `${path}.value.${index}`, issues, alphabet)
    }
    return
  }

  if (value.type === 'count') {
    validateSymbol(value.symbol, `${path}.symbol`, issues, alphabet)
    if (value.symbol === EMPTY_SYMBOL) {
      issues.push(`${path}.symbol: нельзя считать бесконечное число пустых ячеек`)
    }
    requireNonNegativeInteger(value.value, `${path}.value`, issues)
    return
  }

  if (value.type === 'steps') {
    requireNonNegativeInteger(value.value, `${path}.value`, issues)
    return
  }

  if (value.type === 'prediction') {
    validateSymbol(value.write, `${path}.write`, issues, alphabet)
    if (typeof value.direction !== 'string' || !DIRECTIONS.has(value.direction)) {
      issues.push(`${path}.direction: допустимы только L, R, N или S`)
    }
    const nextState = requireString(value.nextState, `${path}.nextState`, issues)
    if (nextState !== null && states !== null && !states.has(nextState)) {
      issues.push(`${path}.nextState: состояние ${nextState} отсутствует в states`)
    }
    return
  }

  const answerValue = requireString(value.value, `${path}.value`, issues)
  const choices = validateChoices(choicesValue, path.replace(/\.answer$/, '.choices'), issues)

  if (answerValue !== null && choices !== null && !choices.has(answerValue)) {
    issues.push(`${path}.value: вариант ${answerValue} отсутствует в choices`)
  }
}

function validateChoices(value: unknown, path: string, issues: string[]): Set<string> | null {
  if (!Array.isArray(value) || value.length < 2) {
    issues.push(`${path}: для ответа choice нужны минимум два варианта`)
    return null
  }

  const values = new Set<string>()

  value.forEach((choice, index) => {
    if (!isRecord(choice)) {
      issues.push(`${path}[${index}]: ожидался объект варианта`)
      return
    }
    const choiceValue = requireString(choice.value, `${path}[${index}].value`, issues)
    requireString(choice.label, `${path}[${index}].label`, issues)
    if (choiceValue !== null) {
      if (values.has(choiceValue)) issues.push(`${path}: значения вариантов должны быть уникальны`)
      values.add(choiceValue)
    }
  })

  return values
}

function validateHints(value: unknown, path: string, issues: string[]): void {
  if (!Array.isArray(value) || value.length !== 3) {
    issues.push(`${path}: требуется ровно три подсказки`)
    return
  }

  const hints = validateUniqueStrings(value, path, issues, 3)
  if (hints !== null && hints.size !== 3) {
    issues.push(`${path}: подсказки должны различаться`)
  }
}

function validateCommonMistakes(value: unknown, path: string, issues: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push(`${path}: требуется хотя бы одна типичная ошибка`)
    return
  }

  const codes = new Set<string>()

  value.forEach((mistake, index) => {
    if (!isRecord(mistake)) {
      issues.push(`${path}[${index}]: ожидался объект ошибки`)
      return
    }
    const code = requireString(mistake.type, `${path}[${index}].type`, issues)
    requireString(mistake.description, `${path}[${index}].description`, issues)
    if (code !== null) {
      if (codes.has(code)) issues.push(`${path}: коды ошибок должны быть уникальны`)
      codes.add(code)
    }
  })
}

function validateSource(value: unknown, path: string, issues: string[]): void {
  if (!isRecord(value)) {
    issues.push(`${path}: ожидался объект источника`)
    return
  }

  if (value.kind !== 'original' && value.kind !== 'official') {
    issues.push(`${path}.kind: допустимы только original или official`)
  }
  requireString(value.label, `${path}.label`, issues)

  if (value.url !== undefined) {
    const url = requireString(value.url, `${path}.url`, issues)
    if (url !== null) {
      try {
        const parsedUrl = new URL(url)
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') throw new Error()
      } catch {
        issues.push(`${path}.url: ожидался корректный HTTP(S)-адрес`)
      }
    }
  }
}

function validateUniqueStrings(
  value: unknown,
  path: string,
  issues: string[],
  minimumLength: number,
): Set<string> | null {
  if (!Array.isArray(value) || value.length < minimumLength) {
    issues.push(`${path}: ожидался массив минимум из ${minimumLength} элементов`)
    return null
  }

  const strings = new Set<string>()
  value.forEach((item, index) => {
    const text = requireString(item, `${path}[${index}]`, issues)
    if (text !== null) strings.add(text)
  })

  if (strings.size !== value.length) {
    issues.push(`${path}: элементы должны быть уникальны`)
  }

  return strings
}

function validateSymbol(
  value: unknown,
  path: string,
  issues: string[],
  alphabet: Set<string> | null,
): void {
  const symbol = requireString(value, path, issues)
  if (symbol !== null && alphabet !== null && !alphabet.has(symbol)) {
    issues.push(`${path}: символ ${symbol} отсутствует в alphabet`)
  }
}

function requireString(value: unknown, path: string, issues: string[]): string | null {
  if (typeof value !== 'string' || value.trim() === '') {
    issues.push(`${path}: ожидалась непустая строка`)
    return null
  }
  return value
}

function requireNonNegativeInteger(value: unknown, path: string, issues: string[]): void {
  if (!Number.isInteger(value) || (value as number) < 0) {
    issues.push(`${path}: ожидалось неотрицательное целое число`)
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
