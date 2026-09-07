import { makeCommandKey } from '../core/commandKey'
import { EMPTY_SYMBOL } from '../core/TuringMachine'
import type { Task } from '../types/task'
import { parseTasks } from './validateTask'

const rawTasks = [
  {
    id: 'l1-command-reading-01',
    level: 1,
    format: 'command-reading',
    skills: ['command-reading', 'machine-mechanics'],
    title: 'Прочитай команду',
    description:
      'Головка находится над символом 0, машина — в состоянии q0. Какую команду она выполнит?',
    machine: {
      initialTape: { [-1]: '1', 0: '0', 1: '1' },
      headPosition: 0,
      initialState: 'q0',
      commands: {
        [makeCommandKey('q0', '0')]: { write: '1', direction: 'R', nextState: 'q1' },
        [makeCommandKey('q0', '1')]: { write: '0', direction: 'L', nextState: 'q0' },
        [makeCommandKey('q0', EMPTY_SYMBOL)]: {
          write: EMPTY_SYMBOL,
          direction: 'S',
          nextState: 'halt',
        },
      },
      stepLimit: 10,
    },
    alphabet: [EMPTY_SYMBOL, '0', '1'],
    states: ['q0', 'q1', 'halt'],
    answer: { type: 'choice', value: 'write-1-right-q1' },
    choices: [
      { value: 'write-1-right-q1', label: 'Записать 1, сдвинуться вправо, перейти в q1' },
      { value: 'write-1-left-q1', label: 'Записать 1, сдвинуться влево, перейти в q1' },
      { value: 'write-0-right-q1', label: 'Записать 0, сдвинуться вправо, перейти в q1' },
      { value: 'write-1-right-q0', label: 'Записать 1, сдвинуться вправо, остаться в q0' },
    ],
    hints: [
      'Какое состояние активно и какой символ находится под головкой?',
      'Найди пересечение строки q0 и столбца 0 в таблице команд.',
      'В найденной команде сначала записывается символ 1. Затем прочитай направление и новое состояние.',
    ],
    explanation:
      'Активную команду задаёт пара q0 и 0. В этой ячейке указано: записать 1 в текущую ячейку, затем сдвинуть головку вправо и перейти в состояние q1.',
    commonMistakes: [
      { type: 'wrong-direction', description: 'Перепутаны направления L и R.' },
      { type: 'wrong-write-symbol', description: 'Прочитанный символ принят за записываемый.' },
      { type: 'wrong-next-state', description: 'Текущее состояние принято за следующее.' },
    ],
    source: { kind: 'original', label: 'Авторская задача тренажёра' },
  },
  {
    id: 'l1-prediction-01',
    level: 1,
    format: 'prediction',
    skills: ['single-step', 'machine-mechanics'],
    title: 'Предскажи следующий шаг',
    description:
      'До запуска машины предскажи три части следующего шага: записываемый символ, направление движения и новое состояние.',
    machine: {
      initialTape: { [-1]: '1', 0: '0', 1: '1' },
      headPosition: 0,
      initialState: 'scan',
      commands: {
        [makeCommandKey('scan', '0')]: { write: '1', direction: 'L', nextState: 'check' },
        [makeCommandKey('scan', '1')]: { write: '0', direction: 'R', nextState: 'scan' },
        [makeCommandKey('scan', EMPTY_SYMBOL)]: {
          write: EMPTY_SYMBOL,
          direction: 'S',
          nextState: 'halt',
        },
      },
      stepLimit: 10,
    },
    alphabet: [EMPTY_SYMBOL, '0', '1'],
    states: ['scan', 'check', 'halt'],
    answer: { type: 'prediction', write: '1', direction: 'L', nextState: 'check' },
    hints: [
      'Определи состояние машины и символ в ячейке под головкой.',
      'Используй команду на пересечении состояния scan и символа 0.',
      'Первое действие команды — записать 1 в текущую ячейку. Направление и состояние прочитай отдельно.',
    ],
    explanation:
      'Под головкой находится 0, а текущее состояние — scan. Соответствующая команда сначала заменяет 0 на 1, затем перемещает головку на одну ячейку влево и переводит машину в состояние check.',
    commonMistakes: [
      { type: 'wrong-command', description: 'Выбрана команда для другого символа или состояния.' },
      { type: 'wrong-direction', description: 'Направление L прочитано как движение вправо.' },
      { type: 'move-before-write', description: 'Запись ошибочно выполнена в ячейку после движения.' },
    ],
    source: { kind: 'original', label: 'Авторская задача тренажёра' },
  },
] satisfies Task[]

export const tasks = parseTasks(rawTasks)
