import { getProgressSummary, useProgressStore } from '../store/progressStore'
import { useSessionStore } from '../store/sessionStore'

const primaryButton =
  'rounded-full bg-amber-300 px-6 py-3 font-bold text-slate-950 transition hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300'
const secondaryButton =
  'rounded-full border border-white/20 bg-white/5 px-6 py-3 font-bold text-white transition hover:border-white/40 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white'

const sprints = [
  {
    number: '01',
    title: 'Исходная стратегия',
    duration: '10 минут',
    description: 'Решить входную задачу и честно записать первый способ рассуждения.',
  },
  {
    number: '02',
    title: 'Эксперимент',
    duration: '20 минут',
    description: 'Сравнить три попытки: время, шаги, подсказки, ошибки и результат.',
  },
  {
    number: '03',
    title: 'Закономерность',
    duration: '15 минут',
    description: 'Найти цикл или инвариант и проверить гипотезу на границе.',
  },
  {
    number: '04',
    title: 'Сборка маршрута',
    duration: '30 минут',
    description: 'Оформить правила выбора стратегии, пример и карту ошибок.',
  },
  {
    number: '05',
    title: 'Перекрёстная проверка',
    duration: '15 минут',
    description: 'Передать маршрут другой команде и исправить неоднозначности.',
  },
]

const strategyBranches = [
  {
    marker: 'A',
    title: 'Полная трассировка',
    description: 'Когда путь короткий, а каждый шаг влияет на ответ.',
  },
  {
    marker: 'B',
    title: 'Проверочные шаги',
    description: 'Когда нужно подтвердить гипотезу, но не исполнять всю машину.',
  },
  {
    marker: 'C',
    title: 'Аналитическое решение',
    description: 'Когда цикл, роль состояния или инвариант уже доказаны.',
  },
]

export function HomeScreen() {
  const attempts = useProgressStore((state) => state.attempts)
  const task = useSessionStore((state) => state.task)
  const mode = useSessionStore((state) => state.mode)
  const navigate = useSessionStore((state) => state.navigate)
  const progress = getProgressSummary(attempts)

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <header className="relative z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 sm:px-8 lg:px-10">
          <a className="group flex items-center gap-3" href="#top" aria-label="Тьюринг под лупой — начало страницы">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-amber-300/40 bg-amber-300/10 font-mono text-sm font-black text-amber-300 transition group-hover:bg-amber-300/20">
              T
            </span>
            <span>
              <strong className="block text-sm leading-tight">Тьюринг под лупой</strong>
              <span className="block text-xs text-slate-400">исследовательское занятие</span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-300 md:flex" aria-label="Разделы страницы">
            <a className="transition hover:text-white" href="#question">Задача</a>
            <a className="transition hover:text-white" href="#lesson-plan">Ход занятия</a>
            <a className="transition hover:text-white" href="#product">Результат</a>
          </nav>

          <button
            className="rounded-full border border-amber-300/50 px-4 py-2 text-sm font-bold text-amber-200 transition hover:bg-amber-300/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300"
            onClick={() => navigate('selector')}
            type="button"
          >
            Задачи
          </button>
        </div>
      </header>

      <div className="relative" id="top">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(circle_at_75%_22%,rgba(124,58,237,0.28),transparent_36%),radial-gradient(circle_at_18%_15%,rgba(245,158,11,0.15),transparent_28%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:42px_42px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />

        <section className="relative mx-auto grid min-h-[42rem] max-w-7xl gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:px-10 lg:py-24" aria-labelledby="home-title">
          <div>
            <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.16em]">
              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-amber-200">11 класс</span>
              <span className="rounded-full border border-violet-300/30 bg-violet-300/10 px-3 py-1.5 text-violet-200">2 × 45 минут</span>
              <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-emerald-200">КЕГЭ · задание 12</span>
            </div>

            <p className="mt-8 font-mono text-xs font-bold uppercase tracking-[0.24em] text-amber-300">
              Исследуй · докажи · передай другому
            </p>
            <h1 id="home-title" className="mt-5 max-w-4xl text-5xl font-black leading-[0.96] tracking-tight sm:text-7xl">
              Когда трассировать,
              <span className="block text-slate-400">а когда рассуждать?</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              Тренажёр становится исследовательским стендом: сравните собственные решения, найдите закономерность и создайте диагностический маршрут для другой команды.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button className={primaryButton} onClick={() => navigate('task')} type="button">
                {attempts.length === 0 ? 'Начать исследование' : 'Продолжить исследование'}
              </button>
              <button className={secondaryButton} onClick={() => navigate('selector')} type="button">
                Выбрать задачу
              </button>
              <button className={secondaryButton} onClick={() => navigate('dashboard')} type="button">
                Открыть прогресс
              </button>
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-violet-950/40 backdrop-blur sm:p-8" aria-label="Текущая траектория">
            <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-violet-600/30 blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Текущая траектория</p>
                <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-200">стенд готов</span>
              </div>
              <h2 className="mt-4 text-2xl font-black">{task.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Уровень {task.level} · {mode === 'exam' ? 'экзаменационный' : 'учебный'} режим
              </p>

              <dl className="mt-8 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                <div className="rounded-2xl border border-white/5 bg-slate-800/80 p-3">
                  <dt className="text-xs text-slate-400">Учебных попыток</dt>
                  <dd className="mt-1 text-2xl font-black text-amber-300">{progress.learningAttempts}</dd>
                </div>
                <div className="rounded-2xl border border-white/5 bg-slate-800/80 p-3">
                  <dt className="text-xs text-slate-400">Верных учебных</dt>
                  <dd className="mt-1 text-2xl font-black text-emerald-300">{progress.learningCorrect}</dd>
                </div>
                <div className="rounded-2xl border border-white/5 bg-slate-800/80 p-3">
                  <dt className="text-xs text-slate-400">Самостоятельных</dt>
                  <dd className="mt-1 text-2xl font-black text-violet-300">{progress.independentLearning}</dd>
                </div>
                <div className="rounded-2xl border border-white/5 bg-slate-800/80 p-3">
                  <dt className="text-xs text-slate-400">Экзамен: верно / попыток</dt>
                  <dd className="mt-1 text-2xl font-black text-sky-300">{progress.examCorrect} / {progress.examAttempts}</dd>
                </div>
              </dl>

              <div className="mt-8 border-t border-white/10 pt-6">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">Траектория мышления</p>
                <ol className="mt-4 space-y-3 text-sm text-slate-300">
                  <li className="flex gap-3"><strong className="text-white">01</strong><span>Предскажи точный шаг</span></li>
                  <li className="flex gap-3"><strong className="text-white">02</strong><span>Проверь цикл и роль состояния</span></li>
                  <li className="flex gap-3"><strong className="text-white">03</strong><span>Обоснуй решение без полного перебора</span></li>
                </ol>
              </div>
            </div>
          </aside>
        </section>
      </div>

      <section className="border-y border-white/10 bg-white/[0.03]" id="question" aria-labelledby="question-title">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:px-10 lg:py-20">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Задача занятия</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl" id="question-title">Не просто получить ответ</h2>
            <p className="mt-5 max-w-md leading-7 text-slate-400">
              Полная трассировка помогает увидеть механику, но на длинной ленте превращается в источник ошибок. Нужно научиться вовремя менять стратегию.
            </p>
          </div>

          <blockquote className="relative rounded-[2rem] border border-violet-300/20 bg-violet-300/[0.07] p-7 sm:p-10">
            <span className="absolute right-7 top-4 font-serif text-7xl leading-none text-violet-300/20" aria-hidden="true">?</span>
            <p className="max-w-3xl text-2xl font-bold leading-snug text-white sm:text-3xl">
              Как по данным собственных решений определить, когда пошаговая симуляция помогает, а когда пора переходить к аналитическому решению?
            </p>
            <footer className="mt-6 text-sm font-semibold text-violet-200">Проектный вопрос команды</footer>
          </blockquote>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-24" id="lesson-plan" aria-labelledby="lesson-plan-title">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-amber-300">90 минут практики</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl" id="lesson-plan-title">Пять спринтов — один маршрут</h2>
          </div>
          <p className="max-w-xl leading-7 text-slate-400">Каждый этап оставляет проверяемый след: от исходной гипотезы до продукта, который работает без пояснений авторов.</p>
        </div>

        <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {sprints.map((sprint, index) => (
            <li className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900 p-6 transition hover:-translate-y-1 hover:border-amber-300/30" key={sprint.number}>
              <div className="absolute right-5 top-4 font-mono text-4xl font-black text-white/[0.06]">{sprint.number}</div>
              <p className="font-mono text-xs font-bold text-amber-300">{sprint.duration}</p>
              <h3 className="mt-8 text-xl font-black">{sprint.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{sprint.description}</p>
              {index < sprints.length - 1 && <span className="mt-6 block h-px w-10 bg-amber-300/40 lg:hidden" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-white/10 bg-slate-900/60" id="product" aria-labelledby="product-title">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:px-10 lg:py-24">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Результат команды</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl" id="product-title">Диагностический маршрут</h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Не реферат и не пересказ правил, а проверенный на данных инструмент, который помогает другому ученику выбрать способ решения и исправить типичную ошибку.
            </p>

            <ul className="mt-8 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
              {[
                'данные не менее трёх попыток',
                'обычный и граничный пример',
                'карта минимум из трёх ошибок',
                'независимая проверка другой командой',
              ].map((item) => (
                <li className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3" key={item}>
                  <span className="mt-0.5 text-emerald-300" aria-hidden="true">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-950 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Условие → стратегия</p>
                <h3 className="mt-2 text-xl font-black">Три ветви решения</h3>
              </div>
              <span className="font-mono text-xs text-slate-500">IF / THEN</span>
            </div>

            <div className="mt-5 space-y-3">
              {strategyBranches.map((branch) => (
                <article className="grid grid-cols-[2.75rem_1fr] gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4" key={branch.marker}>
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-300/10 font-mono font-black text-violet-200">{branch.marker}</span>
                  <div>
                    <h4 className="font-bold text-white">{branch.title}</h4>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{branch.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-24" aria-labelledby="evidence-title">
        <div className="rounded-[2.25rem] border border-amber-300/20 bg-amber-300/[0.07] px-6 py-10 sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:px-12">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Готовы проверить гипотезу?</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl" id="evidence-title">Сначала прогноз. Затем — данные.</h2>
            <p className="mt-4 leading-7 text-slate-300">Начните с точного шага, сохраните результаты попыток и вернитесь к ним при сборке маршрута.</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 lg:mt-0 lg:shrink-0">
            <button className={primaryButton} onClick={() => navigate('task')} type="button">Перейти к первой задаче</button>
            <button className={secondaryButton} onClick={() => navigate('dashboard')} type="button">Данные попыток</button>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 text-sm text-slate-500 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 sm:flex-row lg:px-2">
          <span>Тьюринг под лупой · методическая разработка учебного занятия</span>
          <span>Информатика × математика</span>
        </div>
      </footer>
    </main>
  )
}
