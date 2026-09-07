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
  {
    id: 'l1-trace-01',
    level: 1,
    format: 'trace',
    skills: ['short-trace', 'machine-mechanics'],
    title: 'Короткая трассировка',
    description:
      'На ленте записаны две единицы. Сколько команд выполнит машина до остановки, включая останавливающую команду?',
    machine: {
      initialTape: { 0: '1', 1: '1' },
      headPosition: 0,
      initialState: 'scan',
      commands: {
        [makeCommandKey('scan', '1')]: { write: '0', direction: 'R', nextState: 'scan' },
        [makeCommandKey('scan', '0')]: { write: '0', direction: 'R', nextState: 'scan' },
        [makeCommandKey('scan', EMPTY_SYMBOL)]: {
          write: EMPTY_SYMBOL,
          direction: 'S',
          nextState: 'halt',
        },
      },
      stepLimit: 10,
    },
    alphabet: [EMPTY_SYMBOL, '0', '1'],
    states: ['scan', 'halt'],
    answer: { type: 'steps', value: 3 },
    hints: [
      'Проследи, над какими ячейками по очереди окажется головка.',
      'Каждая единица обрабатывается одной командой, после чего головка движется вправо.',
      'После двух единиц головка читает λ. Команду S тоже нужно включить в число выполненных команд.',
    ],
    explanation:
      'Первые две команды заменяют две единицы нулями и дважды сдвигают головку вправо. Третья команда читается на пустой ячейке и останавливает машину направлением S. Всего выполнено 3 команды.',
    commonMistakes: [
      { type: 'stop-step-not-counted', description: 'Останавливающая команда S не включена в число шагов.' },
      { type: 'wrong-count', description: 'Подсчитаны ячейки ленты, а не выполненные команды.' },
    ],
    source: { kind: 'original', label: 'Авторская задача тренажёра' },
  },
  {
    id: 'l1-completion-01',
    level: 1,
    format: 'completion',
    skills: ['command-completion', 'command-reading', 'machine-mechanics'],
    title: 'Восстанови команду',
    description:
      'В ячейке таблицы для состояния q0 и символа 1 пропущена команда. Какую команду нужно поставить, чтобы заменить 1 на 0, сдвинуть головку влево и перейти в q1?',
    machine: {
      initialTape: { [-1]: '0', 0: '1' },
      headPosition: 0,
      initialState: 'q0',
      commands: {
        [makeCommandKey('q0', '0')]: { write: '1', direction: 'R', nextState: 'q0' },
        [makeCommandKey('q0', EMPTY_SYMBOL)]: {
          write: EMPTY_SYMBOL,
          direction: 'S',
          nextState: 'halt',
        },
        [makeCommandKey('q1', '0')]: { write: '0', direction: 'S', nextState: 'halt' },
      },
      stepLimit: 10,
    },
    alphabet: [EMPTY_SYMBOL, '0', '1'],
    states: ['q0', 'q1', 'halt'],
    answer: { type: 'choice', value: 'write-0-left-q1' },
    choices: [
      { value: 'write-0-left-q1', label: 'Записать 0, сдвинуться влево, перейти в q1' },
      { value: 'write-0-right-q1', label: 'Записать 0, сдвинуться вправо, перейти в q1' },
      { value: 'write-1-left-q1', label: 'Оставить 1, сдвинуться влево, перейти в q1' },
      { value: 'write-0-left-q0', label: 'Записать 0, сдвинуться влево, остаться в q0' },
    ],
    hints: [
      'Раздели требуемое действие на запись, движение и новое состояние.',
      'Первая часть команды должна записывать 0, а направление задаётся буквой L.',
      'После записи 0 и движения L последней частью команды должно быть состояние q1.',
    ],
    explanation:
      'Требование прямо задаёт три части команды в обязательном порядке: записать 0, выполнить движение L и перейти в q1. Поэтому пропущенная команда имеет вид 0 · L · q1.',
    commonMistakes: [
      { type: 'wrong-direction', description: 'Перепутаны направления L и R.' },
      { type: 'wrong-write-symbol', description: 'Исходная единица ошибочно оставлена без изменения.' },
      { type: 'wrong-next-state', description: 'Вместо перехода в q1 выбрано текущее состояние q0.' },
    ],
    source: { kind: 'original', label: 'Авторская задача тренажёра' },
  },
] satisfies Task[]

export const tasks = parseTasks(rawTasks)
