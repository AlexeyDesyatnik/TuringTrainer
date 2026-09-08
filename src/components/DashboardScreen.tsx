import { useState, type ChangeEvent } from 'react'

import { tasks } from '../data/tasks'
import { getRecommendedTask, getSkillStatus, useProgressStore } from '../store/progressStore'
import { useSessionStore } from '../store/sessionStore'
import type { SkillStatus } from '../types/progress'
import { skillLabel } from './TaskSelectorScreen'

export function DashboardScreen() {
  const attempts = useProgressStore((state) => state.attempts)
  const exportProgress = useProgressStore((state) => state.exportProgress)
  const importProgress = useProgressStore((state) => state.importProgress)
  const [transferStatus, setTransferStatus] = useState<string | null>(null)
  const navigate = useSessionStore((state) => state.navigate)
  const openTask = useSessionStore((state) => state.openTask)
  const setMode = useSessionStore((state) => state.setMode)
  const skills = [...new Set(tasks.flatMap((task) => task.skills))]
  const recommendation = getRecommendedTask(attempts)
  const learningAttempts = attempts.filter((attempt) => attempt.mode === 'learning')
  const examAttempts = attempts.filter((attempt) => attempt.mode === 'exam')
  const independent = learningAttempts.filter(
    (attempt) => attempt.correct && attempt.hintsUsed === 0,
  ).length
  const solvedLearningTaskIds = new Set(
    learningAttempts.filter((attempt) => attempt.correct).map((attempt) => attempt.taskId),
  )
  const errorCounts = attempts.flatMap((attempt) => attempt.errors).reduce<Record<string, number>>(
    (counts, error) => ({ ...counts, [error]: (counts[error] ?? 0) + 1 }),
    {},
  )

  const startRecommendation = () => {
    if (recommendation === null) return
    setMode('learning')
    openTask(recommendation.id)
  }

  const downloadProgress = () => {
    const blob = new Blob([exportProgress()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `turing-trainer-progress-${new Date().toISOString().slice(0, 10)}.json`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    setTransferStatus('Резервная копия скачана')
  }

  const restoreProgress = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file === undefined) return

    try {
      const restored = importProgress(await file.text())
      setTransferStatus(restored
        ? 'Прогресс восстановлен из резервной копии'
        : 'Не удалось восстановить прогресс: файл повреждён или имеет неизвестную версию')
    } catch {
      setTransferStatus('Не удалось прочитать файл резервной копии')
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <button className="text-sm font-bold text-violet-800 hover:underline" onClick={() => navigate('home')} type="button">
          ← На главную
        </button>
        <header className="mt-7 border-b border-slate-300 pb-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-700">Диагностика</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">Что тренировать дальше?</h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            Прогресс основан на правильности, самостоятельности и переносе навыка, а не только на числе попыток.
          </p>
        </header>

        <section aria-label="Сводка прогресса" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Учебных попыток" value={learningAttempts.length} />
          <Metric label="Экзаменационных" value={examAttempts.length} />
          <Metric label="Верных" value={attempts.filter((attempt) => attempt.correct).length} />
          <Metric label="Самостоятельных" value={independent} />
        </section>

        <section aria-labelledby="levels-heading" className="mt-6">
          <h2 id="levels-heading" className="text-xl font-black text-slate-950">Уровни</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {([1, 2, 3] as const).map((level) => {
              const levelTasks = tasks.filter((task) => task.level === level)
              const solved = levelTasks.filter((task) => solvedLearningTaskIds.has(task.id)).length
              return (
                <div className="rounded-2xl border border-slate-200 bg-white p-4" key={level}>
                  <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Уровень {level}</p>
                  <p className="mt-2 font-semibold text-slate-800">{levelName(level)}</p>
                  <p className="mt-1 font-mono text-sm text-slate-500">Решено {solved} из {levelTasks.length}</p>
                </div>
              )
            })}
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
          <section aria-labelledby="skills-heading" className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 id="skills-heading" className="text-2xl font-black text-slate-950">Навыки</h2>
            <div className="mt-4 divide-y divide-slate-200">
              {skills.map((skill) => {
                const status = getSkillStatus(attempts, skill)
                return (
                  <div className="flex items-center justify-between gap-4 py-4" key={skill}>
                    <span className="font-semibold text-slate-800">{skillLabel(skill)}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(status)}`}>
                      {statusLabel(status)}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl bg-slate-950 p-5 text-white shadow-lg">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">Рекомендация</p>
              {recommendation === null ? (
                <p className="mt-3 leading-7 text-slate-200">Текущий набор решён самостоятельно. Можно переходить к новым задачам.</p>
              ) : (
                <>
                  <h2 className="mt-3 text-xl font-black">{recommendation.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Следующий шаг: {skillLabel(recommendation.skills[0] ?? '')}.
                  </p>
                  <button className="mt-5 w-full rounded-xl bg-amber-300 px-4 py-3 font-bold text-slate-950 hover:bg-amber-200" onClick={startRecommendation} type="button">
                    Начать рекомендованную задачу
                  </button>
                </>
              )}
            </section>

            <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <h2 className="font-black text-slate-950">Повторяющиеся ошибки</h2>
              {Object.keys(errorCounts).length === 0 ? (
                <p className="mt-2 text-sm leading-6 text-slate-600">Диагностированных ошибок пока нет.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {Object.entries(errorCounts).map(([error, count]) => (
                    <p className="flex justify-between gap-3 text-sm text-slate-700" key={error}>
                      <span>{errorLabel(error)}</span><strong>{count}</strong>
                    </p>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
              <h2 className="font-black text-slate-950">Перенос прогресса</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Скачай резервную копию перед переносом автономного тренажёра на другой компьютер.
              </p>
              <div className="mt-4 grid gap-2">
                <button
                  className="rounded-xl bg-violet-700 px-4 py-3 text-sm font-bold text-white hover:bg-violet-600"
                  onClick={downloadProgress}
                  type="button"
                >
                  Скачать прогресс
                </button>
                <label className="cursor-pointer rounded-xl border border-violet-300 bg-white px-4 py-3 text-center text-sm font-bold text-violet-800 hover:border-violet-500 hover:bg-violet-100">
                  Загрузить из файла
                  <input
                    accept="application/json,.json"
                    aria-label="Импортировать прогресс"
                    className="sr-only"
                    onChange={(event) => void restoreProgress(event)}
                    type="file"
                  />
                </label>
              </div>
              {transferStatus !== null && (
                <p className="mt-3 text-sm font-semibold text-violet-900" role="status">
                  {transferStatus}
                </p>
              )}
            </section>
          </aside>
        </div>

        <button className="mt-6 rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800" onClick={() => navigate('selector')} type="button">
          Открыть все задачи
        </button>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </div>
  )
}

function statusLabel(status: SkillStatus | 'not-started'): string {
  const labels = {
    'not-started': 'Не начат',
    attempted: 'Есть попытка',
    solves: 'Решает',
    independent: 'Самостоятельно',
    mastered: 'Освоено',
  }
  return labels[status]
}

function statusClass(status: SkillStatus | 'not-started'): string {
  if (status === 'mastered') return 'bg-emerald-100 text-emerald-800'
  if (status === 'independent') return 'bg-violet-100 text-violet-800'
  if (status === 'solves') return 'bg-blue-100 text-blue-800'
  if (status === 'attempted') return 'bg-amber-100 text-amber-800'
  return 'bg-slate-100 text-slate-600'
}

function errorLabel(error: string): string {
  const mistake = tasks.flatMap((task) => task.commonMistakes).find((item) => item.type === error)
  return mistake?.description ?? error
}

function levelName(level: 1 | 2 | 3): string {
  if (level === 1) return 'Механика'
  if (level === 2) return 'Алгоритм'
  return 'Абстракция'
}
