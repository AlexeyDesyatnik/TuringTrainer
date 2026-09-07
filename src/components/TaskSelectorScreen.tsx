import { useState } from 'react'

import { tasks } from '../data/tasks'
import { useProgressStore } from '../store/progressStore'
import { useSessionStore } from '../store/sessionStore'

export function TaskSelectorScreen() {
  const [level, setLevel] = useState<'all' | '1' | '2' | '3'>('all')
  const [skill, setSkill] = useState('all')
  const attempts = useProgressStore((state) => state.attempts)
  const mode = useSessionStore((state) => state.mode)
  const setMode = useSessionStore((state) => state.setMode)
  const navigate = useSessionStore((state) => state.navigate)
  const openTask = useSessionStore((state) => state.openTask)
  const skills = [...new Set(tasks.flatMap((task) => task.skills))]
  const visibleTasks = tasks.filter(
    (task) => (level === 'all' || task.level === Number(level))
      && (skill === 'all' || task.skills.includes(skill)),
  )

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <button className="text-sm font-bold text-violet-800 hover:underline" onClick={() => navigate('home')} type="button">
          ← На главную
        </button>
        <div className="mt-7 grid gap-6 border-b border-slate-300 pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-700">Каталог практики</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">Выбери мыслительное действие</h1>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Уровень определяется не длиной ленты, а способом рассуждения.
            </p>
          </div>
          <div aria-label="Режим для выбранной задачи" className="flex rounded-xl bg-slate-200 p-1" role="group">
            {(['learning', 'exam'] as const).map((value) => (
              <button
                aria-pressed={mode === value}
                className={`rounded-lg px-4 py-2 text-sm font-bold ${mode === value ? 'bg-slate-950 text-white shadow' : 'text-slate-600'}`}
                key={value}
                onClick={() => setMode(value)}
                type="button"
              >
                {value === 'learning' ? 'Учебный' : 'Экзаменационный'}
              </button>
            ))}
          </div>
        </div>

        <section aria-label="Фильтры задач" className="mt-6 grid gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid-cols-2">
          <label className="text-sm font-bold text-slate-700">
            Уровень
            <select className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3" onChange={(event) => setLevel(event.target.value as typeof level)} value={level}>
              <option value="all">Все уровни</option>
              <option value="1">1 · Механика</option>
              <option value="2">2 · Алгоритм</option>
              <option value="3">3 · Абстракция</option>
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">
            Навык
            <select className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3" onChange={(event) => setSkill(event.target.value)} value={skill}>
              <option value="all">Все навыки</option>
              {skills.map((item) => <option key={item} value={item}>{skillLabel(item)}</option>)}
            </select>
          </label>
        </section>

        <section aria-label="Список задач" className="mt-6 grid gap-4 md:grid-cols-2">
          {visibleTasks.map((task, index) => {
            const taskAttempts = attempts.filter((attempt) => attempt.taskId === task.id)
            const solved = taskAttempts.some((attempt) => attempt.mode === mode && attempt.correct)
            return (
              <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={task.id}>
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-xs font-bold text-violet-700">{String(index + 1).padStart(2, '0')}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${solved ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                    {solved ? 'Решено' : 'Не решено'}
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-black text-slate-950">{task.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{task.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800">Уровень {task.level}</span>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{skillLabel(task.skills[0] ?? '')}</span>
                </div>
                <button
                  aria-label={`Открыть задачу «${task.title}»`}
                  className="mt-5 rounded-xl bg-slate-950 px-4 py-3 font-bold text-white hover:bg-violet-800"
                  onClick={() => openTask(task.id)}
                  type="button"
                >
                  Открыть задачу
                </button>
              </article>
            )
          })}
          {visibleTasks.length === 0 && (
            <p className="rounded-2xl bg-white p-6 text-slate-600">Для выбранных фильтров задач пока нет.</p>
          )}
        </section>
      </div>
    </main>
  )
}

export function skillLabel(skill: string): string {
  const labels: Record<string, string> = {
    'command-reading': 'Чтение команды',
    'single-step': 'Один шаг',
    'machine-mechanics': 'Механика машины',
    'short-trace': 'Короткая трассировка',
    'command-completion': 'Восстановление команды',
    'state-role': 'Роль состояния',
    'cycle-analysis': 'Анализ цикла',
    'multi-step-prediction': 'Прогноз нескольких шагов',
    'algorithm-function': 'Функция алгоритма',
    'one-way-pass': 'Однонаправленный проход',
    'reverse-reasoning': 'Обратное рассуждение',
    'pattern-recognition': 'Поиск закономерности',
    'alternating-states': 'Чередование состояний',
    'analytical-solution': 'Аналитическое решение',
  }
  return labels[skill] ?? skill
}
