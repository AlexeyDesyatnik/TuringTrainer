import { useEffect } from 'react'

import { makeCommandKey } from '../core/commandKey'
import { EMPTY_SYMBOL } from '../core/TuringMachine'
import { tasks } from '../data/tasks'
import {
  AUTO_SPEED_MAX,
  AUTO_SPEED_MIN,
  useSessionStore,
  type AnswerDraft,
} from '../store/sessionStore'
import type { Direction, HaltReason } from '../types/machine'
import type { Task, TaskAnswer } from '../types/task'

const primaryButton =
  'rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500'
const secondaryButton =
  'rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:border-violet-400 hover:text-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400'
const selectClass =
  'mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200'

export function TaskScreen() {
  const task = useSessionStore((state) => state.task)
  const machine = useSessionStore((state) => state.machine)
  const revision = useSessionStore((state) => state.revision)
  const draft = useSessionStore((state) => state.draft)
  const result = useSessionStore((state) => state.result)
  const autoRunning = useSessionStore((state) => state.autoRunning)
  const autoSpeedMs = useSessionStore((state) => state.autoSpeedMs)
  const selectTask = useSessionStore((state) => state.selectTask)
  const step = useSessionStore((state) => state.step)
  const undo = useSessionStore((state) => state.undo)
  const reset = useSessionStore((state) => state.reset)
  const toggleAuto = useSessionStore((state) => state.toggleAuto)
  const stopAuto = useSessionStore((state) => state.stopAuto)
  const setAutoSpeed = useSessionStore((state) => state.setAutoSpeed)

  useEffect(() => stopAuto, [stopAuto])

  const headPosition = machine.getHeadPosition()
  const state = machine.getState()
  const readSymbol = machine.readSymbol()
  const stepCount = machine.getStepCount()
  const predictionPending = task.format === 'prediction' && stepCount === 0 && result === null
  const tape = machine.getTapeView(headPosition, 7)

  return (
    <main className="min-h-screen pb-16">
      <header className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-amber-300">
              КЕГЭ-2026 · Задание 12
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Машина Тьюринга
            </h1>
          </div>
          <nav aria-label="Учебные задачи" className="flex gap-2 overflow-x-auto pb-1">
            {tasks.map((item, index) => (
              <button
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
                  item.id === task.id
                    ? 'border-amber-300 bg-amber-300 text-slate-950'
                    : 'border-slate-600 text-slate-200 hover:border-slate-300'
                }`}
                key={item.id}
                onClick={() => selectTask(item.id)}
                type="button"
              >
                {index + 1}. {item.title}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <section className="grid gap-4 border-b border-slate-200 pb-7 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="mb-3 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide">
              <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-800">Уровень {task.level}</span>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-700">Учебный режим</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950">{task.title}</h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{task.description}</p>
          </div>
          <p className="font-mono text-xs text-slate-500">{task.source.label}</p>
        </section>

        <section aria-labelledby="tape-heading" className="py-7">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Симулятор</p>
              <h3 id="tape-heading" className="mt-1 text-xl font-black text-slate-950">Лента машины</h3>
            </div>
            <div
              aria-label="Состояние машины"
              aria-live="polite"
              className="flex flex-wrap gap-x-5 gap-y-1 rounded-xl bg-white px-4 py-3 font-mono text-sm shadow-sm ring-1 ring-slate-200"
              data-revision={revision}
            >
              <span>Состояние <strong className="text-violet-700">{state}</strong></span>
              <span>Головка <strong>{headPosition}</strong></span>
              <span>Шагов <strong>{stepCount}</strong></span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-300 bg-white px-4 pb-4 pt-10 shadow-sm">
            <div className="mx-auto flex w-max gap-1" data-testid="tape">
              {tape.map((cell) => {
                const active = cell.index === headPosition
                return (
                  <div className="relative pt-5 text-center" key={cell.index}>
                    {active && (
                      <span className="absolute inset-x-0 top-0 text-xs font-black text-violet-700" aria-hidden="true">
                        ▼
                      </span>
                    )}
                    <div
                      aria-label={`Ячейка ${cell.index}: ${displaySymbol(cell.symbol)}${active ? ', головка' : ''}`}
                      className={`flex h-12 w-12 items-center justify-center border-2 font-mono text-lg font-bold ${
                        active
                          ? 'border-amber-400 bg-amber-100 text-slate-950 shadow-[0_0_0_3px_rgba(251,191,36,0.25)]'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      {displaySymbol(cell.symbol)}
                    </div>
                    <span className={`mt-1 block font-mono text-[11px] ${active ? 'font-bold text-violet-700' : 'text-slate-400'}`}>
                      {cell.index}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <CommandTable task={task} currentState={state} readSymbol={readSymbol} />

          <aside className="space-y-4">
            <section aria-labelledby="controls-heading" className="rounded-2xl bg-slate-950 p-5 text-white shadow-lg">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Управление</p>
              <h3 id="controls-heading" className="mt-1 text-lg font-black">Выполнение</h3>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button className={secondaryButton} disabled={stepCount === 0 || result !== null || autoRunning} onClick={undo} type="button">
                  Шаг назад
                </button>
                <button
                  className={primaryButton}
                  disabled={machine.isHalted() || predictionPending || result !== null || autoRunning}
                  onClick={step}
                  type="button"
                >
                  Шаг вперёд
                </button>
                <button
                  className={`${autoRunning ? primaryButton : secondaryButton} col-span-2`}
                  disabled={!autoRunning && (machine.isHalted() || predictionPending || result !== null)}
                  onClick={toggleAuto}
                  type="button"
                >
                  {autoRunning ? 'Пауза' : 'Авто'}
                </button>
                <button className={`${secondaryButton} col-span-2`} onClick={reset} type="button">
                  Сбросить машину
                </button>
              </div>
              <label className="mt-5 block text-sm font-semibold text-slate-200">
                Скорость: {autoSpeedMs} мс
                <input
                  aria-label="Скорость автозапуска"
                  className="mt-3 block w-full accent-amber-300"
                  max={AUTO_SPEED_MAX}
                  min={AUTO_SPEED_MIN}
                  onChange={(event) => setAutoSpeed(Number(event.target.value))}
                  step="100"
                  type="range"
                  value={autoSpeedMs}
                />
              </label>
              {predictionPending && (
                <p className="mt-4 text-sm leading-6 text-amber-200">
                  Сначала отправь прогноз. После этого машина выполнит шаг.
                </p>
              )}
              {machine.isHalted() && (
                <p className="mt-4 text-sm leading-6 text-rose-200">
                  Машина остановлена: {haltReasonLabel(machine.getHaltReason())}.
                </p>
              )}
            </section>
          </aside>
        </div>

        <AnswerPanel task={task} draft={draft} />
      </div>
    </main>
  )
}

function CommandTable({ task, currentState, readSymbol }: {
  task: Task
  currentState: string
  readSymbol: string
}) {
  return (
    <section aria-labelledby="commands-heading" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Программа</p>
      <h3 id="commands-heading" className="mt-1 text-xl font-black text-slate-950">Таблица команд</h3>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
          <thead>
            <tr>
              <th className="border-b-2 border-slate-300 p-3 font-bold text-slate-500" scope="col">Состояние</th>
              {task.alphabet.map((symbol) => (
                <th
                  className={`border-b-2 p-3 text-center font-mono text-base ${symbol === readSymbol ? 'border-amber-400 bg-amber-50 text-slate-950' : 'border-slate-300 text-slate-600'}`}
                  key={symbol}
                  scope="col"
                >
                  {displaySymbol(symbol)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {task.states.map((state) => (
              <tr className={state === currentState ? 'bg-violet-50' : undefined} key={state}>
                <th className={`border-b border-slate-200 p-3 font-mono ${state === currentState ? 'text-violet-800' : 'text-slate-700'}`} scope="row">
                  {state === currentState ? `▶ ${state}` : state}
                </th>
                {task.alphabet.map((symbol) => {
                  const command = task.machine.commands[makeCommandKey(state, symbol)]
                  const active = state === currentState && symbol === readSymbol
                  return (
                    <td
                      aria-current={active ? 'step' : undefined}
                      className={`border-b border-l border-slate-200 p-3 text-center font-mono ${active ? 'bg-amber-100 font-black text-slate-950 outline outline-2 -outline-offset-2 outline-violet-600' : 'text-slate-600'}`}
                      key={symbol}
                    >
                      {command === undefined
                        ? <span className="text-slate-400" title="Команда отсутствует">—</span>
                        : <span>{displaySymbol(command.write)} · {command.direction} · {command.nextState}</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">
        Формат команды: записать символ · направление · новое состояние. Пустая ячейка означает отсутствие команды.
      </p>
    </section>
  )
}

function AnswerPanel({ task, draft }: { task: Task; draft: AnswerDraft }) {
  const result = useSessionStore((state) => state.result)
  const setChoice = useSessionStore((state) => state.setChoice)
  const updatePrediction = useSessionStore((state) => state.updatePrediction)
  const submitAnswer = useSessionStore((state) => state.submitAnswer)
  const retry = useSessionStore((state) => state.retry)
  const nextTask = useSessionStore((state) => state.nextTask)
  const complete = isDraftComplete(draft)

  return (
    <section aria-labelledby="answer-heading" className="mt-6 rounded-3xl border border-violet-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="max-w-4xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Твой ответ</p>
        <h3 id="answer-heading" className="mt-1 text-2xl font-black text-slate-950">
          {task.answer.type === 'prediction' ? 'Предскажи команду до запуска' : 'Выбери команду'}
        </h3>

        {draft?.type === 'choice' && task.choices !== undefined && (
          <fieldset className="mt-5 grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Варианты ответа</legend>
            {task.choices.map((choice) => (
              <label
                className={`flex cursor-pointer gap-3 rounded-xl border p-4 text-sm leading-6 transition ${
                  draft.value === choice.value
                    ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-100'
                    : 'border-slate-200 hover:border-slate-400'
                }`}
                key={choice.value}
              >
                <input
                  checked={draft.value === choice.value}
                  className="mt-1 h-4 w-4 accent-violet-700"
                  disabled={result !== null}
                  name="task-answer"
                  onChange={() => setChoice(choice.value)}
                  type="radio"
                  value={choice.value}
                />
                <span>{choice.label}</span>
              </label>
            ))}
          </fieldset>
        )}

        {draft?.type === 'prediction' && (
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-bold text-slate-700">
              Записать
              <select
                aria-label="Записать символ"
                className={selectClass}
                disabled={result !== null}
                onChange={(event) => updatePrediction({ write: event.target.value })}
                value={draft.write}
              >
                <option value="">Выбери символ</option>
                {task.alphabet.map((symbol) => <option key={symbol} value={symbol}>{displaySymbol(symbol)}</option>)}
              </select>
            </label>
            <label className="text-sm font-bold text-slate-700">
              Направление
              <select
                aria-label="Направление движения"
                className={selectClass}
                disabled={result !== null}
                onChange={(event) => updatePrediction({ direction: event.target.value as Direction | '' })}
                value={draft.direction}
              >
                <option value="">Выбери направление</option>
                <option value="L">L · влево</option>
                <option value="R">R · вправо</option>
                <option value="N">N · без движения</option>
                <option value="S">S · остановка</option>
              </select>
            </label>
            <label className="text-sm font-bold text-slate-700">
              Новое состояние
              <select
                aria-label="Новое состояние"
                className={selectClass}
                disabled={result !== null}
                onChange={(event) => updatePrediction({ nextState: event.target.value })}
                value={draft.nextState}
              >
                <option value="">Выбери состояние</option>
                {task.states.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </label>
          </div>
        )}

        <button className={`${primaryButton} mt-5`} disabled={!complete || result !== null} onClick={submitAnswer} type="button">
          Проверить ответ
        </button>

        {result !== null && (
          <div
            aria-live="assertive"
            className={`mt-6 rounded-2xl border-l-4 p-5 ${result.correct ? 'border-emerald-500 bg-emerald-50' : 'border-rose-500 bg-rose-50'}`}
            role="alert"
          >
            <p className={`text-lg font-black ${result.correct ? 'text-emerald-900' : 'text-rose-900'}`}>
              {result.correct ? 'Верно' : 'Пока неверно'}
            </p>
            <dl className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
              <div><dt className="inline font-bold">Твой ответ: </dt><dd className="inline">{formatAnswer(task, result.submitted)}</dd></div>
              <div><dt className="inline font-bold">Правильный ответ: </dt><dd className="inline">{formatAnswer(task, task.answer)}</dd></div>
            </dl>
            <p className="mt-3 text-sm leading-6 text-slate-700">{task.explanation}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className={secondaryButton} onClick={retry} type="button">Решить ещё раз</button>
              <button className={primaryButton} onClick={nextTask} type="button">Следующая задача</button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function isDraftComplete(draft: AnswerDraft): boolean {
  if (draft === null) return false
  if (draft.type === 'choice') return draft.value !== ''
  return draft.write !== '' && draft.direction !== '' && draft.nextState !== ''
}

function displaySymbol(symbol: string): string {
  return symbol === EMPTY_SYMBOL ? '␣' : symbol
}

function haltReasonLabel(reason: HaltReason | null): string {
  if (reason === 'stop-command') return 'выполнена команда S'
  if (reason === 'missing-command') return 'команда отсутствует'
  if (reason === 'step-limit') return 'достигнут лимит шагов'
  return 'причина не указана'
}

function formatAnswer(task: Task, answer: TaskAnswer): string {
  if (answer.type === 'choice') {
    return task.choices?.find((choice) => choice.value === answer.value)?.label ?? answer.value
  }
  if (answer.type === 'prediction') {
    return `${displaySymbol(answer.write)} · ${answer.direction} · ${answer.nextState}`
  }
  if (answer.type === 'count') return `${answer.value} символов «${displaySymbol(answer.symbol)}»`
  if (answer.type === 'steps') return `${answer.value} шагов`
  return Object.entries(answer.value)
    .map(([index, symbol]) => `${index}:${displaySymbol(symbol)}`)
    .join(', ')
}
