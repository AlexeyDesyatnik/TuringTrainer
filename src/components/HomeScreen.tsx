import { getProgressSummary, useProgressStore } from '../store/progressStore'
import { useSessionStore } from '../store/sessionStore'
import assessmentMaterialsUrl from '../../methodical-development/Assessment_materials.docx?url'
import diagnosticRouteExampleUrl from '../../methodical-development/Diagnostic_route_example.docx?url'
import diagnosticRouteTemplateUrl from '../../methodical-development/Diagnostic_route_template.docx?url'
import experimentCardsUrl from '../../methodical-development/Experiment_cards.docx?url'
import offlineReserveUrl from '../../methodical-development/Offline_reserve_pack.docx?url'
import passportUrl from '../../methodical-development/Passport_metodicheskoi_razrabotki_TuringTrainer.docx?url'
import presentationUrl from '../../methodical-development/Presentation_TuringTrainer_5_minutes_methodical_v3.pptx?url'
import projectCaseUrl from '../../methodical-development/Project_case_students.docx?url'
import rubricUrl from '../../methodical-development/Detailed_product_rubric.docx?url'
import studentWorksheetUrl from '../../methodical-development/Student_worksheet.docx?url'
import teacherKitUrl from '../../methodical-development/Teacher_methodical_kit.docx?url'

const primaryButton =
  'rounded-full bg-amber-300 px-6 py-3 font-bold text-slate-950 transition hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300'
const secondaryButton =
  'rounded-full border border-white/20 bg-white/5 px-6 py-3 font-bold text-white transition hover:border-white/40 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white'

const sprints = [
  {
    number: '01',
    title: 'Первый способ решения',
    duration: '10 минут',
    description: 'Решить входную задачу и записать, как вы рассуждали.',
  },
  {
    number: '02',
    title: 'Сравнение способов',
    duration: '20 минут',
    description: 'Выполнить контролируемую пару двумя назначенными способами и сравнить результаты попыток 2 и 3.',
  },
  {
    number: '03',
    title: 'Находим правило',
    duration: '15 минут',
    description: 'Найти, что повторяется или не меняется, и проверить правило на граничном примере.',
  },
  {
    number: '04',
    title: 'Собираем маршрут',
    duration: '30 минут',
    description: 'Записать, когда выбирать каждый способ, и добавить пример и карту ошибок.',
  },
  {
    number: '05',
    title: 'Проверяем друг у друга',
    duration: '15 минут',
    description: 'Передать маршрут другой команде и исправить непонятные места.',
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
    title: 'Несколько проверочных шагов',
    description: 'Когда нужно проверить предположение, но не выполнять все шаги машины.',
  },
  {
    marker: 'C',
    title: 'Аналитическое решение',
    description: 'Когда уже понятно, что повторяется или остаётся неизменным.',
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
              <span className="block text-xs text-slate-400">проектное занятие</span>
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
              Проектное занятие по выбору способа решения
            </p>
            <h1 id="home-title" className="mt-5 max-w-4xl text-5xl font-black leading-[0.96] tracking-tight sm:text-7xl">
              Когда трассировать,
              <span className="block text-slate-400">а когда рассуждать?</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              Выполните свободную входную попытку, затем сравните два назначенных способа на экспериментальной паре и составьте для другой команды понятную схему выбора.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button className={primaryButton} onClick={() => navigate('task')} type="button">
                {attempts.length === 0 ? 'Начать работу' : 'Продолжить работу'}
              </button>
              <button className={secondaryButton} onClick={() => navigate('selector')} type="button">
                Выбрать задачу
              </button>
              <button className={secondaryButton} onClick={() => navigate('dashboard')} type="button">
                Открыть прогресс
              </button>
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-violet-950/40 backdrop-blur sm:p-8" aria-label="Текущий прогресс">
            <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-violet-600/30 blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Где вы сейчас</p>
                <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-200">можно начинать</span>
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
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">Как будем работать</p>
                <ol className="mt-4 space-y-3 text-sm text-slate-300">
                  <li className="flex gap-3"><strong className="text-white">01</strong><span>Предскажи следующий шаг</span></li>
                  <li className="flex gap-3"><strong className="text-white">02</strong><span>Найди, что повторяется</span></li>
                  <li className="flex gap-3"><strong className="text-white">03</strong><span>Реши без полной трассировки и объясни способ</span></li>
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
              Полная трассировка помогает понять работу машины. Но на длинной ленте она занимает много времени и повышает риск ошибки. Важно вовремя выбрать другой способ.
            </p>
          </div>

          <blockquote className="relative rounded-[2rem] border border-violet-300/20 bg-violet-300/[0.07] p-7 sm:p-10">
            <span className="absolute right-7 top-4 font-serif text-7xl leading-none text-violet-300/20" aria-hidden="true">?</span>
            <p className="max-w-3xl text-2xl font-bold leading-snug text-white sm:text-3xl">
              Как понять по своим решениям, когда полезна полная трассировка, а когда лучше найти правило и решить задачу без неё?
            </p>
            <footer className="mt-6 text-sm font-semibold text-violet-200">Главный вопрос команды</footer>
          </blockquote>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-24" id="lesson-plan" aria-labelledby="lesson-plan-title">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-amber-300">90 минут практики</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl" id="lesson-plan-title">Пять шагов — один маршрут</h2>
          </div>
          <p className="max-w-xl leading-7 text-slate-400">После каждого шага остаётся результат, который можно проверить: от первого предположения до маршрута, понятного без объяснений авторов.</p>
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
              Диагностический маршрут — это проверенная на данных схема, которая помогает другому ученику выбрать способ решения и исправить ошибку.
            </p>

            <ul className="mt-8 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
              {[
                'результаты не менее трёх попыток',
                'обычный и граничный пример',
                'не менее трёх ошибок и способов их исправить',
                'проверка маршрута другой командой',
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
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Условие → способ решения</p>
                <h3 className="mt-2 text-xl font-black">Три способа решения</h3>
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
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Готовы проверить своё предположение?</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl" id="evidence-title">Сначала прогноз. Затем — данные.</h2>
            <p className="mt-4 leading-7 text-slate-300">Сначала предскажите следующий шаг, затем проверьте себя. Результаты попыток понадобятся при сборке маршрута.</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 lg:mt-0 lg:shrink-0">
            <button className={primaryButton} onClick={() => navigate('task')} type="button">Открыть тренажёр</button>
            <button className={secondaryButton} onClick={() => navigate('dashboard')} type="button">Результаты попыток</button>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-white/[0.03]" id="materials" aria-labelledby="materials-title">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Файлы для проведения</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl" id="materials-title">Материалы занятия</h2>
          <p className="mt-4 max-w-3xl leading-7 text-slate-300">Скачайте рабочие материалы до занятия. Файлы с ключами размещены отдельно, но статический сайт не ограничивает доступ к ним.</p>
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <MaterialGroup title="Для учеников" files={studentMaterials} />
            <MaterialGroup title="Для учителя и демонстрации" files={teacherMaterials} />
          </div>
          <p className="mt-8 text-sm leading-6 text-slate-400">Для автономной работы передайте учителю файл <strong className="text-slate-200">index.html</strong> вместе с соседней папкой <strong className="text-slate-200">assets</strong>. Ссылки работают, если их взаимное расположение не менять.</p>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 text-sm text-slate-500 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 sm:flex-row lg:px-2">
          <span>Тьюринг под лупой · проектное занятие</span>
          <span>Информатика × математика</span>
        </div>
      </footer>
    </main>
  )
}

const studentMaterials = [
  ['Рабочий лист', studentWorksheetUrl],
  ['Проектное задание', projectCaseUrl],
  ['Шаблон диагностического маршрута', diagnosticRouteTemplateUrl],
  ['Итоговые задания', assessmentMaterialsUrl],
] as const

const teacherMaterials = [
  ['Комплект учителя', teacherKitUrl],
  ['Карточки экспериментальной пары', experimentCardsUrl],
  ['Резерв без компьютера', offlineReserveUrl],
  ['Заполненный образец маршрута', diagnosticRouteExampleUrl],
  ['Подробный рубрикатор', rubricUrl],
  ['Паспорт разработки', passportUrl],
  ['Актуальная презентация', presentationUrl],
] as const

function MaterialGroup({ title, files }: { title: string; files: ReadonlyArray<readonly [string, string]> }) {
  return (
    <section>
      <h3 className="text-xl font-black">{title}</h3>
      <ul className="mt-4 space-y-3">
        {files.map(([label, fileName]) => (
          <li key={fileName}>
            <a className="block rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-semibold text-slate-100 transition hover:border-violet-300 hover:text-white" href={fileName}>
              {label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
