import { useProgressStore } from '../store/progressStore'
import { useSessionStore } from '../store/sessionStore'

const primaryButton =
  'rounded-xl bg-amber-300 px-6 py-3 font-bold text-slate-950 transition hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
const secondaryButton =
  'rounded-xl border border-slate-600 px-6 py-3 font-bold text-white transition hover:border-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'

export function HomeScreen() {
  const attempts = useProgressStore((state) => state.attempts)
  const task = useSessionStore((state) => state.task)
  const mode = useSessionStore((state) => state.mode)
  const navigate = useSessionStore((state) => state.navigate)
  const correct = attempts.filter((attempt) => attempt.correct).length
  const independent = attempts.filter(
    (attempt) => attempt.mode === 'learning' && attempt.correct && attempt.hintsUsed === 0,
  ).length

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-14 px-5 py-10 sm:px-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center lg:px-10">
        <section aria-labelledby="home-title">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-amber-300">
            КЕГЭ-2026 · Задание 12
          </p>
          <h1 id="home-title" className="mt-5 max-w-4xl text-5xl font-black leading-[0.98] tracking-tight sm:text-7xl">
            Не прокручивай машину. Пойми её.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
            От одного точного шага до закономерности, которая заменяет сотни строк трассировки.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button className={primaryButton} onClick={() => navigate('task')} type="button">
              {attempts.length === 0 ? 'Начать обучение' : 'Продолжить обучение'}
            </button>
            <button className={secondaryButton} onClick={() => navigate('selector')} type="button">
              Выбрать задачу
            </button>
            <button className={secondaryButton} onClick={() => navigate('dashboard')} type="button">
              Открыть прогресс
            </button>
          </div>
        </section>

        <aside className="relative overflow-hidden rounded-[2rem] border border-slate-700 bg-slate-900 p-6 shadow-2xl sm:p-8">
          <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-violet-600/30 blur-3xl" />
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Текущая траектория</p>
          <h2 className="mt-3 text-2xl font-black">{task.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Уровень {task.level} · {mode === 'exam' ? 'экзаменационный' : 'учебный'} режим
          </p>
          <dl className="mt-8 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-slate-800 p-3">
              <dt className="text-xs text-slate-400">Попыток</dt>
              <dd className="mt-1 text-2xl font-black text-amber-300">{attempts.length}</dd>
            </div>
            <div className="rounded-2xl bg-slate-800 p-3">
              <dt className="text-xs text-slate-400">Верно</dt>
              <dd className="mt-1 text-2xl font-black text-emerald-300">{correct}</dd>
            </div>
            <div className="rounded-2xl bg-slate-800 p-3">
              <dt className="text-xs text-slate-400">Самостоятельно</dt>
              <dd className="mt-1 text-2xl font-black text-violet-300">{independent}</dd>
            </div>
          </dl>
          <div className="mt-8 space-y-3 border-t border-slate-700 pt-6 text-sm text-slate-300">
            <p><strong className="text-white">01</strong> · Выполни точный шаг</p>
            <p><strong className="text-white">02</strong> · Объясни цикл и состояния</p>
            <p><strong className="text-white">03</strong> · Реши без полной трассировки</p>
          </div>
        </aside>
      </div>
    </main>
  )
}
