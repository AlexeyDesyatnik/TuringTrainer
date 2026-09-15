import { makeCommandKey } from '../core/commandKey'
import { EMPTY_SYMBOL } from '../core/TuringMachine'
import type { Task } from '../types/task'
import { parseTasks } from './validateTask'

function tapeFromString(value: string): Record<number, string> {
  return Object.fromEntries(Array.from(value, (symbol, index) => [index, symbol]))
}

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
      { value: 'write-1-left-q1', label: 'Записать 1, сдвинуться влево, перейти в q1', mistakeType: 'wrong-direction' },
      { value: 'write-0-right-q1', label: 'Записать 0, сдвинуться вправо, перейти в q1', mistakeType: 'wrong-write-symbol' },
      { value: 'write-1-right-q0', label: 'Записать 1, сдвинуться вправо, остаться в q0', mistakeType: 'wrong-next-state' },
    ],
    hints: [
      'Какое состояние активно и какой символ находится под головкой?',
      'Найди пересечение строки q0 и столбца 0 в таблице команд.',
      'В найденной команде сначала записывается символ 1. Затем прочитай направление и новое состояние.',
    ],
    explanation:
      'Активную команду задаёт пара q0 и 0. В этой ячейке указано: записать 1 в текущую ячейку, затем сдвинуть головку вправо и перейти в состояние q1.',
    commonMistakes: [
      { type: 'wrong-direction', description: 'Перепутаны направления L и R.', nextAction: 'Сопоставь L с движением влево, а R — с движением вправо, затем перечитай среднюю часть активной команды.' },
      { type: 'wrong-write-symbol', description: 'Прочитанный символ принят за записываемый.', nextAction: 'Раздели символ под головкой и первый символ команды: в ответ выпиши тот, который машина должна записать.' },
      { type: 'wrong-next-state', description: 'Текущее состояние принято за следующее.', nextAction: 'Отдельно назови текущее состояние и состояние в конце команды, затем используй в ответе второе.' },
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
      { type: 'wrong-command', description: 'Выбрана команда для другого символа или состояния.', nextAction: 'Сначала зафиксируй пару «текущее состояние, символ под головкой» и заново найди только её команду в таблице.' },
      { type: 'wrong-direction', description: 'Направление L прочитано как движение вправо.', nextAction: 'Отметь текущий индекс головки и уменьши его на один для движения L.' },
      { type: 'move-before-write', description: 'Запись ошибочно выполнена в ячейку после движения.', nextAction: 'Выполни части команды по порядку: сначала измени текущую ячейку, только затем перемести головку.' },
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
      { type: 'stop-step-not-counted', description: 'Останавливающая команда S не включена в число шагов.', nextAction: 'Добавь к двум командам обработки единиц команду на λ, которая выполняется и только после этого останавливает машину.' },
      { type: 'wrong-count', description: 'Подсчитаны ячейки ленты, а не выполненные команды.', nextAction: 'Запиши по одной отметке после каждой выполненной команды, включая последнюю команду на λ.' },
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
      { value: 'write-0-right-q1', label: 'Записать 0, сдвинуться вправо, перейти в q1', mistakeType: 'wrong-direction' },
      { value: 'write-1-left-q1', label: 'Оставить 1, сдвинуться влево, перейти в q1', mistakeType: 'wrong-write-symbol' },
      { value: 'write-0-left-q0', label: 'Записать 0, сдвинуться влево, остаться в q0', mistakeType: 'wrong-next-state' },
    ],
    hints: [
      'Раздели требуемое действие на запись, движение и новое состояние.',
      'Первая часть команды должна записывать 0, а направление задаётся буквой L.',
      'После записи 0 и движения L последней частью команды должно быть состояние q1.',
    ],
    explanation:
      'Требование прямо задаёт три части команды в обязательном порядке: записать 0, выполнить движение L и перейти в q1. Поэтому пропущенная команда имеет вид 0 · L · q1.',
    commonMistakes: [
      { type: 'wrong-direction', description: 'Перепутаны направления L и R.', nextAction: 'Переведи слово «влево» в обозначение L и проверь среднюю часть восстанавливаемой команды.' },
      { type: 'wrong-write-symbol', description: 'Исходная единица ошибочно оставлена без изменения.', nextAction: 'Возьми требуемый результат записи из условия: первая часть команды должна заменять 1 на 0.' },
      { type: 'wrong-next-state', description: 'Вместо перехода в q1 выбрано текущее состояние q0.', nextAction: 'Проверь последнюю часть команды: после шага машина должна оказаться в q1, а не сохранить q0.' },
    ],
    source: { kind: 'original', label: 'Авторская задача тренажёра' },
  },
  {
    id: 'l2-state-role-01',
    level: 2,
    format: 'algorithm',
    skills: ['state-role', 'cycle-analysis'],
    title: 'Роль состояния return',
    description:
      'Машина начинает у левого края блока единиц. Какую роль выполняет состояние return во всём алгоритме?',
    machine: {
      initialTape: { 0: '1', 1: '1', 2: '1' },
      headPosition: 0,
      initialState: 'scan',
      commands: {
        [makeCommandKey('scan', '0')]: { write: '0', direction: 'R', nextState: 'scan' },
        [makeCommandKey('scan', '1')]: { write: '1', direction: 'R', nextState: 'scan' },
        [makeCommandKey('scan', EMPTY_SYMBOL)]: {
          write: EMPTY_SYMBOL,
          direction: 'L',
          nextState: 'return',
        },
        [makeCommandKey('return', '0')]: { write: '0', direction: 'L', nextState: 'return' },
        [makeCommandKey('return', '1')]: { write: '0', direction: 'L', nextState: 'return' },
        [makeCommandKey('return', EMPTY_SYMBOL)]: {
          write: EMPTY_SYMBOL,
          direction: 'S',
          nextState: 'halt',
        },
      },
      stepLimit: 20,
    },
    alphabet: [EMPTY_SYMBOL, '0', '1'],
    states: ['scan', 'return', 'halt'],
    answer: { type: 'choice', value: 'return-left-and-zero' },
    choices: [
      { value: 'return-left-and-zero', label: 'Идти влево к началу блока и заменять единицы нулями' },
      { value: 'return-right-and-zero', label: 'Продолжать движение вправо и заменять единицы нулями', mistakeType: 'wrong-direction' },
      { value: 'return-left-preserve', label: 'Вернуться влево, не изменяя символы на ленте', mistakeType: 'state-role-missed' },
      { value: 'return-stop-now', label: 'Остановить машину сразу после перехода из scan', mistakeType: 'cycle-missed' },
    ],
    hints: [
      'Сравни направления команд в состояниях scan и return.',
      'В return обе непустые команды двигают головку влево. Что происходит с единицей?',
      'Состояние return ведёт к левому пустому краю и при проходе записывает 0 вместо каждой 1.',
    ],
    explanation:
      'Состояние scan находит правый край блока. После перехода в return головка идёт обратно влево, каждая встреченная единица заменяется нулём. На пустой ячейке слева машина останавливается. Значит, return отвечает за обратный проход и преобразование блока.',
    commonMistakes: [
      { type: 'wrong-direction', description: 'Не замечена смена направления движения после scan.', nextAction: 'Сравни направления в командах scan и return и стрелками отметь, куда движется головка в каждом состоянии.' },
      { type: 'state-role-missed', description: 'Команды состояния рассмотрены отдельно, без общей роли обратного прохода.', nextAction: 'Объедини все команды return в одно правило: куда идёт головка и что происходит с каждой встреченной единицей.' },
      { type: 'cycle-missed', description: 'Не распознан повторяющийся цикл обработки блока.', nextAction: 'Проследи return до команды на левом λ: машина повторяет обработку символов и останавливается только у края.' },
    ],
    source: { kind: 'original', label: 'Авторская задача тренажёра' },
  },
  {
    id: 'l2-multi-prediction-01',
    level: 2,
    format: 'prediction',
    skills: ['multi-step-prediction', 'short-trace'],
    title: 'Прогноз трёх шагов',
    description:
      'Машина инвертирует символ под головкой и движется вправо. Сколько единиц будет на ленте ровно после трёх выполненных команд?',
    machine: {
      initialTape: { 0: '0', 1: '1', 2: '0' },
      headPosition: 0,
      initialState: 'flip',
      commands: {
        [makeCommandKey('flip', '0')]: { write: '1', direction: 'R', nextState: 'flip' },
        [makeCommandKey('flip', '1')]: { write: '0', direction: 'R', nextState: 'flip' },
        [makeCommandKey('flip', EMPTY_SYMBOL)]: {
          write: EMPTY_SYMBOL,
          direction: 'S',
          nextState: 'halt',
        },
      },
      stepLimit: 10,
    },
    alphabet: [EMPTY_SYMBOL, '0', '1'],
    states: ['flip', 'halt'],
    answer: { type: 'count', symbol: '1', value: 2 },
    hints: [
      'Запиши отдельно три исходных символа, которые прочитает головка.',
      'За три команды последовательность 0 1 0 превратится в три инвертированных символа.',
      'После инверсии получается последовательность 1 0 1. Остаётся подсчитать единицы.',
    ],
    explanation:
      'Головка движется только вправо, поэтому за три команды каждый исходный символ обрабатывается ровно один раз: 0 1 0 превращается в 1 0 1. В результате на ленте находятся 2 единицы. Останавливающая команда на λ ещё не выполнялась.',
    commonMistakes: [
      { type: 'wrong-count', description: 'Неверно подсчитаны единицы после трёх инверсий.', nextAction: 'Одновременно замени 0 1 0 на 1 0 1 и пересчитай единицы только в полученной тройке.' },
      { type: 'extra-stop-step', description: 'Ошибочно выполнена четвёртая, останавливающая команда на λ.', nextAction: 'Останови прогноз сразу после третьей команды: состояние машины на этом месте ещё не требует выполнять команду на λ.' },
      { type: 'full-trace-overuse', description: 'Короткое однонаправленное преобразование заменено лишней полной трассировкой.', nextAction: 'Примени правило инверсии сразу к трём исходным символам без продолжения трассировки до остановки.' },
    ],
    source: { kind: 'original', label: 'Авторская задача тренажёра' },
  },
  {
    id: 'l2-algorithm-function-01',
    level: 2,
    format: 'algorithm',
    skills: ['algorithm-function', 'one-way-pass'],
    title: 'Определи функцию машины',
    description:
      'На ленте записан непрерывный блок единиц, головка стоит на его левом символе. Что делает машина с этим блоком?',
    machine: {
      initialTape: { 0: '1', 1: '1', 2: '1' },
      headPosition: 0,
      initialState: 'append',
      commands: {
        [makeCommandKey('append', '1')]: { write: '1', direction: 'R', nextState: 'append' },
        [makeCommandKey('append', EMPTY_SYMBOL)]: {
          write: '1',
          direction: 'S',
          nextState: 'halt',
        },
      },
      stepLimit: 10,
    },
    alphabet: [EMPTY_SYMBOL, '1'],
    states: ['append', 'halt'],
    answer: { type: 'choice', value: 'append-one' },
    choices: [
      { value: 'append-one', label: 'Дописывает одну единицу справа от блока' },
      { value: 'erase-one', label: 'Стирает последнюю единицу блока', mistakeType: 'stop-write-missed' },
      { value: 'move-only', label: 'Проходит блок вправо, не изменяя результат', mistakeType: 'stop-write-missed' },
      { value: 'double-block', label: 'Удваивает количество единиц в блоке', mistakeType: 'one-way-pass-missed' },
    ],
    hints: [
      'Что происходит с единицами во время движения вправо?',
      'Изменение ленты происходит только тогда, когда головка впервые читает λ.',
      'На первой пустой ячейке справа команда записывает 1 и останавливает машину.',
    ],
    explanation:
      'Во время прохода по блоку машина сохраняет каждую единицу и движется вправо. На первой пустой ячейке она записывает новую единицу и останавливается. Поэтому длина блока увеличивается ровно на один символ.',
    commonMistakes: [
      { type: 'one-way-pass-missed', description: 'Не распознан однонаправленный проход до правого края.', nextAction: 'Проследи неизменную команду на 1: каждый символ сохраняется, а головка только идёт к первой пустой ячейке справа.' },
      { type: 'stop-write-missed', description: 'Не учтена запись единицы в останавливающей команде.', nextAction: 'Отдельно выполни команду на λ: она записывает новую 1 в первой пустой ячейке и затем останавливает машину.' },
      { type: 'algorithm-function-missed', description: 'Трассировка не обобщена до функции увеличения блока.', nextAction: 'Сравни длину блока до и после остановки и сформулируй изменение одним действием над всем блоком.' },
    ],
    source: { kind: 'original', label: 'Авторская задача тренажёра' },
  },
  {
    id: 'l2-reverse-01',
    level: 2,
    format: 'reverse',
    skills: ['reverse-reasoning', 'command-reading'],
    title: 'Найди предыдущее состояние',
    description:
      'Используй таблицу для отдельной ситуации: до шага под головкой был 0, а после шага в этой ячейке находится 1, головка сдвинута вправо и новым состоянием стало qB. В каком состоянии машина была перед шагом?',
    machine: {
      initialTape: { 0: '1' },
      headPosition: 0,
      initialState: 'qC',
      commands: {
        [makeCommandKey('qA', '0')]: { write: '1', direction: 'R', nextState: 'qB' },
        [makeCommandKey('qA', '1')]: { write: '0', direction: 'L', nextState: 'qC' },
        [makeCommandKey('qC', '0')]: { write: '0', direction: 'R', nextState: 'qB' },
        [makeCommandKey('qC', '1')]: { write: '1', direction: 'R', nextState: 'qB' },
        [makeCommandKey('qB', EMPTY_SYMBOL)]: {
          write: EMPTY_SYMBOL,
          direction: 'S',
          nextState: 'halt',
        },
      },
      stepLimit: 10,
    },
    alphabet: [EMPTY_SYMBOL, '0', '1'],
    states: ['qA', 'qB', 'qC', 'halt'],
    answer: { type: 'choice', value: 'qA' },
    choices: [
      { value: 'qA', label: 'Состояние qA' },
      { value: 'qB', label: 'Состояние qB', mistakeType: 'current-vs-previous-state' },
      { value: 'qC', label: 'Состояние qC', mistakeType: 'wrong-command' },
    ],
    hints: [
      'Ищи команду по известным результатам: запись 1, движение R и переход в qB.',
      'Сравни команды в строках qA и qC для прочитанного символа 0.',
      'Только команда в строке qA одновременно заменяет 0 на 1, движется вправо и переходит в qB.',
    ],
    explanation:
      'Нужно читать таблицу в обратную сторону. Известны все три результата команды: записана 1, выполнено R и получено qB. Для исходного символа 0 этому набору соответствует только команда в состоянии qA.',
    commonMistakes: [
      { type: 'current-vs-previous-state', description: 'Новое состояние qB ошибочно принято за предыдущее.', nextAction: 'Раздели состояния «до» и «после»: qB дано как результат шага, поэтому ищи исходную строку среди остальных состояний.' },
      { type: 'wrong-command', description: 'Выбрана команда, совпадающая только по направлению или новому состоянию.', nextAction: 'Сравни все три признака результата одновременно: запись 1, движение R и переход в qB.' },
      { type: 'reverse-reasoning-missed', description: 'Таблица прочитана только вперёд, без поиска команды по результату.', nextAction: 'Иди от известного результата назад: найди в таблице единственную команду 1 · R · qB для прочитанного 0.' },
    ],
    source: { kind: 'original', label: 'Авторская задача тренажёра' },
  },
  {
    id: 'l3-pattern-01',
    level: 3,
    format: 'pattern',
    skills: ['pattern-recognition', 'one-way-pass'],
    title: 'Инверсия длинной ленты',
    description:
      'С индекса 0 записан фрагмент 0010110011010010. Машина идёт только вправо и меняет каждый двоичный символ на противоположный. Запиши итоговый непустой фрагмент ленты, не выполняя полную трассировку.',
    machine: {
      initialTape: tapeFromString('0010110011010010'),
      headPosition: 0,
      initialState: 'invert',
      commands: {
        [makeCommandKey('invert', '0')]: { write: '1', direction: 'R', nextState: 'invert' },
        [makeCommandKey('invert', '1')]: { write: '0', direction: 'R', nextState: 'invert' },
        [makeCommandKey('invert', EMPTY_SYMBOL)]: {
          write: EMPTY_SYMBOL,
          direction: 'S',
          nextState: 'halt',
        },
      },
      stepLimit: 25,
    },
    alphabet: [EMPTY_SYMBOL, '0', '1'],
    states: ['invert', 'halt'],
    answer: { type: 'tape', value: tapeFromString('1101001100101101') },
    hints: [
      'Сформулируй преобразование одной ячейки независимо от остальных.',
      'Головка не возвращается назад: каждый символ обрабатывается ровно один раз.',
      'Замени одновременно все 0 на 1, а все 1 на 0, сохраняя порядок и длину строки.',
    ],
    explanation:
      'Состояние invert реализует независимую замену 0 → 1 и 1 → 0, после которой головка всегда движется вправо. Поэтому длина и позиции символов не меняются, а весь результат получается одновременной инверсией исходной строки: 1101001100101101. Команда на λ только останавливает машину.',
    commonMistakes: [
      { type: 'wrong-pattern', description: 'Закономерность инверсии применена не ко всем символам.', nextAction: 'Пройди итоговую строку по позициям и проверь для каждой пары исходный → итоговый, что 0 заменён на 1, а 1 — на 0.' },
      { type: 'position-shift', description: 'Символы ошибочно сдвинуты или изменён начальный индекс.', nextAction: 'Сохрани начальный индекс 0 и ту же длину строки: движение головки не переносит уже записанные символы.' },
      { type: 'full-trace-overuse', description: 'Одно и то же локальное правило вычислялось пошагово для всей длинной ленты.', nextAction: 'Примени правило 0 ↔ 1 ко всей строке поразрядно, не моделируя отдельно состояние машины после каждого шага.' },
    ],
    source: { kind: 'original', label: 'Авторская задача тренажёра' },
  },
  {
    id: 'l3-exam-01',
    level: 3,
    format: 'exam',
    skills: ['alternating-states', 'analytical-solution'],
    title: 'Каждая вторая единица',
    description:
      'На ленте записана 21 единица подряд. Состояния erase и keep чередуются при движении вправо. Сколько единиц останется после остановки машины? Реши задачу аналитически.',
    machine: {
      initialTape: tapeFromString('1'.repeat(21)),
      headPosition: 0,
      initialState: 'erase',
      commands: {
        [makeCommandKey('erase', '1')]: {
          write: EMPTY_SYMBOL,
          direction: 'R',
          nextState: 'keep',
        },
        [makeCommandKey('keep', '1')]: { write: '1', direction: 'R', nextState: 'erase' },
        [makeCommandKey('erase', EMPTY_SYMBOL)]: {
          write: EMPTY_SYMBOL,
          direction: 'S',
          nextState: 'halt',
        },
        [makeCommandKey('keep', EMPTY_SYMBOL)]: {
          write: EMPTY_SYMBOL,
          direction: 'S',
          nextState: 'halt',
        },
      },
      stepLimit: 30,
    },
    alphabet: [EMPTY_SYMBOL, '1'],
    states: ['erase', 'keep', 'halt'],
    answer: { type: 'count', symbol: '1', value: 10 },
    hints: [
      'Рассмотри пару соседних единиц и проследи только смену состояний.',
      'В каждой полной паре состояние erase стирает первую единицу, а keep сохраняет вторую.',
      'Из 21 единицы образуются 10 полных пар и одна лишняя единица, которая попадает в состояние erase.',
    ],
    explanation:
      'Каждые две команды образуют повторяющийся блок: первая единица пары стирается в erase, вторая сохраняется в keep. В 21 символе есть 10 полных пар и одна оставшаяся единица. Каждая пара даёт одну сохранённую единицу, а последняя нечётная единица стирается. Ответ: 10.',
    commonMistakes: [
      { type: 'cycle-missed', description: 'Не распознан двухшаговый цикл erase → keep.', nextAction: 'Сгруппируй соседние единицы в пары: в каждой паре первая стирается, а вторая сохраняется.' },
      { type: 'odd-remainder-missed', description: 'Неверно обработана последняя единица при нечётной длине блока.', nextAction: 'После выделения 10 полных пар отдельно проверь 21-ю единицу: она попадает в состояние erase и стирается.' },
      { type: 'full-trace-overuse', description: 'Вместо подсчёта пар выполнена полная трассировка 21 символа.', nextAction: 'Замени 20 первых единиц десятью одинаковыми парами erase → keep и рассмотри отдельно только остаток.' },
      { type: 'wrong-count', description: 'Неверно подсчитано число полных пар.', nextAction: 'Вычисли целую часть от 21 ÷ 2: каждая из 10 полных пар оставляет ровно одну единицу.' },
    ],
    source: { kind: 'original', label: 'Авторская задача экзаменационного формата' },
  },
] satisfies Task[]

export const tasks = parseTasks(rawTasks)
