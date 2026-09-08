import { useEffect, useRef } from 'react'

import { makeCommandKey } from '../core/commandKey'
import { parseTapeInput } from '../core/parseTapeInput'
import { EMPTY_SYMBOL } from '../core/TuringMachine'
import { tasks } from '../data/tasks'
import {
  AUTO_SPEED_MAX,
  AUTO_SPEED_MIN,
  useSessionStore,
  type AnswerDraft,
  type AnswerResult,
  type AnimationPhase,
} from '../store/sessionStore'
import type { Direction, HaltReason, StepResult } from '../types/machine'
import type { Task, TaskAnswer } from '../types/task'
import { useProgressStore } from '../store/progressStore'

const primaryButton =
  'rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500'
const secondaryButton =
  'rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:border-violet-400 hover:text-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400'
const controlPrimaryButton =
  'rounded-xl bg-amber-300 px-5 py-3 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400'
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
  const animationPhase = useSessionStore((state) => state.animationPhase)
  const animatedStep = useSessionStore((state) => state.animatedStep)
  const mode = useSessionStore((state) => state.mode)
  const elapsedMs = useSessionStore((state) => state.elapsedMs)
  const selectTask = useSessionStore((state) => state.selectTask)
  const step = useSessionStore((state) => state.step)
  const undo = useSessionStore((state) => state.undo)
  const reset = useSessionStore((state) => state.reset)
  const toggleAuto = useSessionStore((state) => state.toggleAuto)
  const stopAuto = useSessionStore((state) => state.stopAuto)
  const setAutoSpeed = useSessionStore((state) => state.setAutoSpeed)
  const setReducedMotion = useSessionStore((state) => state.setReducedMotion)
  const setMode = useSessionStore((state) => state.setMode)
  const startExamTimer = useSessionStore((state) => state.startExamTimer)
  const stopExamTimer = useSessionStore((state) => state.stopExamTimer)
  const navigate = useSessionStore((state) => state.navigate)

  useEffect(() => stopAuto, [stopAuto])

  useEffect(() => {
    if (mode === 'exam' && result === null) startExamTimer()
    return stopExamTimer
  }, [mode, result, startExamTimer, stopExamTimer])

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setReducedMotion(mediaQuery.matches)
    updatePreference()
    mediaQuery.addEventListener('change', updatePreference)
    return () => mediaQuery.removeEventListener('change', updatePreference)
  }, [setReducedMotion])

  const machineHeadPosition = machine.getHeadPosition()
  const machineState = machine.getState()
  const showingOldCommand = animationPhase === 'write' || animationPhase === 'move'
  const headPosition = animationPhase === 'write' && animatedStep !== null
    ? animatedStep.previousHeadPosition
    : machineHeadPosition
  const tapeCenter = animatedStep?.previousHeadPosition ?? machineHeadPosition
  const state = showingOldCommand && animatedStep !== null
    ? animatedStep.previousState
    : machineState
  const readSymbol = showingOldCommand && animatedStep !== null
    ? animatedStep.read
    : machine.readSymbol()
  const stepCount = machine.getStepCount()
  const predictionPending = task.answer.type === 'prediction' && stepCount === 0 && result === null
  const tape = machine.getTapeView(tapeCenter, 7)

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
            <nav aria-label="Разделы приложения" className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-slate-300">
              <button className="hover:text-white hover:underline" onClick={() => navigate('home')} type="button">Главная</button>
              <button className="hover:text-white hover:underline" onClick={() => navigate('selector')} type="button">Все задачи</button>
              <button className="hover:text-white hover:underline" onClick={() => navigate('dashboard')} type="button">Прогресс</button>
            </nav>
          </div>
          <div className="min-w-0">
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
            <ProgressSummary />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <section className="grid gap-4 border-b border-slate-200 pb-7 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="mb-3 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide">
              <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-800">Уровень {task.level}</span>
              <div aria-label="Режим выполнения" className="flex rounded-full bg-slate-200 p-0.5" role="group">
                <button
                  aria-pressed={mode === 'learning'}
                  className={`rounded-full px-3 py-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${mode === 'learning' ? 'bg-white text-violet-800 shadow-sm' : 'text-slate-600'}`}
                  onClick={() => setMode('learning')}
                  type="button"
                >
                  Учебный
                </button>
                <button
                  aria-pressed={mode === 'exam'}
                  className={`rounded-full px-3 py-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${mode === 'exam' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600'}`}
                  onClick={() => setMode('exam')}
                  type="button"
                >
                  Экзаменационный
                </button>
              </div>
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
              className={`flex flex-wrap gap-x-5 gap-y-1 rounded-xl bg-white px-4 py-3 font-mono text-sm shadow-sm ring-1 ${animationPhase === 'state' ? 'ring-violet-500' : 'ring-slate-200'}`}
              data-revision={revision}
            >
              <span>Состояние <strong className="text-violet-700">{state}</strong></span>
              <span>Головка <strong>{headPosition}</strong></span>
              <span>Шагов <strong>{stepCount}</strong></span>
              {mode === 'exam' && <span>Таймер <strong>{formatDuration(elapsedMs)}</strong></span>}
            </div>
          </div>

          {animationPhase !== null && animatedStep !== null && (
            <div
              aria-live="polite"
              className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950"
              data-testid="animation-phase"
            >
              <strong>{animationPhaseLabel(animationPhase)}</strong>
              <span>{animationDescription(animationPhase, animatedStep)}</span>
            </div>
          )}

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
                      className={`flex h-12 w-12 items-center justify-center border-2 font-mono text-lg font-bold transition-colors ${
                        animationPhase === 'write' && cell.index === animatedStep?.previousHeadPosition
                          ? 'border-emerald-500 bg-emerald-100 text-emerald-950 shadow-[0_0_0_3px_rgba(34,197,94,0.2)]'
                          : active
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
                <button className={secondaryButton} disabled={stepCount === 0 || result !== null || autoRunning || animationPhase !== null} onClick={undo} type="button">
                  Шаг назад
                </button>
                <button
                  className={controlPrimaryButton}
                  disabled={machine.isHalted() || predictionPending || result !== null || autoRunning || animationPhase !== null}
                  onClick={step}
                  type="button"
                >
                  Шаг вперёд
                </button>
                <button
                  className={`${autoRunning ? controlPrimaryButton : secondaryButton} col-span-2`}
                  disabled={!autoRunning && (machine.isHalted() || predictionPending || result !== null || animationPhase !== null)}
                  onClick={toggleAuto}
                  type="button"
                >
                  {autoRunning ? 'Пауза' : 'Авто'}
                </button>
                <button className={`${secondaryButton} col-span-2`} disabled={result !== null} onClick={reset} type="button">
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
            <HintPanel task={task} animationActive={animationPhase !== null} />
          </aside>
        </div>

        <AnswerPanel task={task} draft={draft} animationActive={animationPhase !== null} />
      </div>
    </main>
  )
}

function ProgressSummary() {
  const attempts = useProgressStore((state) => state.attempts)
  const correct = attempts.filter((attempt) => attempt.correct).length
  const learning = attempts.filter((attempt) => attempt.mode === 'learning').length
  const exam = attempts.filter((attempt) => attempt.mode === 'exam').length
  const independent = attempts.filter(
    (attempt) => attempt.correct && attempt.hintsUsed === 0,
  ).length

  return (
    <p aria-label="Сохранённый прогресс" className="mt-2 text-right font-mono text-xs text-slate-400">
      Попыток: {attempts.length} · учебных: {learning} · экзамен: {exam} · верно: {correct} · самостоятельно: {independent}
    </p>
  )
}

function HintPanel({ task, animationActive }: { task: Task; animationActive: boolean }) {
  const mode = useSessionStore((state) => state.mode)
  const openedHints = useSessionStore((state) => state.openedHints)
  const result = useSessionStore((state) => state.result)
  const openNextHint = useSessionStore((state) => state.openNextHint)
  const allHintsOpened = openedHints === task.hints.length

  return (
    <section aria-labelledby="hints-heading" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">Поддержка</p>
      <h3 id="hints-heading" className="mt-1 text-lg font-black text-slate-950">Подсказки</h3>
      {mode === 'exam' ? (
        <p className="mt-2 rounded-xl bg-slate-950 p-3 text-sm leading-6 text-white">
          В экзаменационном режиме подсказки недоступны.
        </p>
      ) : (
        <>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Помощь не снижает правильность, но учитывается отдельно.
      </p>

      {openedHints > 0 && (
        <ol className="mt-4 space-y-3">
          {task.hints.slice(0, openedHints).map((hint, index) => (
            <li className="rounded-xl border border-amber-200 bg-white p-3 text-sm leading-6 text-slate-700" key={hint}>
              <strong className="mr-2 text-amber-800">{index + 1}.</strong>
              {hint}
            </li>
          ))}
        </ol>
      )}

      {!allHintsOpened && result === null && (
        <button
          className={`${secondaryButton} mt-4 w-full`}
          disabled={animationActive}
          onClick={openNextHint}
          type="button"
        >
          Открыть подсказку {openedHints + 1} из {task.hints.length}
        </button>
      )}

      {allHintsOpened && (
        <p className="mt-4 text-sm font-semibold text-amber-900">Все три подсказки открыты.</p>
      )}
        </>
      )}
    </section>
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

function AnswerPanel({ task, draft, animationActive }: {
  task: Task
  draft: AnswerDraft
  animationActive: boolean
}) {
  const result = useSessionStore((state) => state.result)
  const setChoice = useSessionStore((state) => state.setChoice)
  const setNumericAnswer = useSessionStore((state) => state.setNumericAnswer)
  const updateTapeAnswer = useSessionStore((state) => state.updateTapeAnswer)
  const updatePrediction = useSessionStore((state) => state.updatePrediction)
  const submitAnswer = useSessionStore((state) => state.submitAnswer)
  const retry = useSessionStore((state) => state.retry)
  const nextTask = useSessionStore((state) => state.nextTask)
  const complete = isDraftComplete(draft, task)

  return (
    <section aria-labelledby="answer-heading" className="mt-6 rounded-3xl border border-violet-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="max-w-4xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Твой ответ</p>
        <h3 id="answer-heading" className="mt-1 text-2xl font-black text-slate-950 outline-none" tabIndex={-1}>
          {answerHeading(task.answer)}
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
                  disabled={result !== null || animationActive}
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
                disabled={result !== null || animationActive}
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
                disabled={result !== null || animationActive}
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
                disabled={result !== null || animationActive}
                onChange={(event) => updatePrediction({ nextState: event.target.value })}
                value={draft.nextState}
              >
                <option value="">Выбери состояние</option>
                {task.states.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </label>
          </div>
        )}

        {draft?.type === 'steps' && (
          <label className="mt-5 block max-w-sm text-sm font-bold text-slate-700">
            Количество выполненных команд
            <input
              aria-label="Количество шагов"
              className={selectClass}
              disabled={result !== null || animationActive}
              inputMode="numeric"
              min="0"
              onChange={(event) => setNumericAnswer(event.target.value)}
              step="1"
              type="number"
              value={draft.value}
            />
          </label>
        )}

        {draft?.type === 'count' && (
          <label className="mt-5 block max-w-sm text-sm font-bold text-slate-700">
            Количество символов «{displaySymbol(draft.symbol)}»
            <input
              aria-label={`Количество символов ${displaySymbol(draft.symbol)}`}
              className={selectClass}
              disabled={result !== null || animationActive}
              inputMode="numeric"
              min="0"
              onChange={(event) => setNumericAnswer(event.target.value)}
              step="1"
              type="number"
              value={draft.value}
            />
          </label>
        )}

        {draft?.type === 'tape' && (
          <div className="mt-5 grid max-w-2xl gap-4 sm:grid-cols-[10rem_1fr]">
            <label className="text-sm font-bold text-slate-700">
              Начальный индекс
              <input
                aria-label="Начальный индекс ответа"
                className={selectClass}
                disabled={result !== null || animationActive}
                inputMode="numeric"
                onChange={(event) => updateTapeAnswer({ startIndex: event.target.value })}
                step="1"
                type="number"
                value={draft.startIndex}
              />
            </label>
            <label className="text-sm font-bold text-slate-700">
              Содержимое ленты
              <input
                aria-describedby="tape-answer-help"
                aria-label="Содержимое ленты в ответе"
                className={`${selectClass} font-mono tracking-widest`}
                disabled={result !== null || animationActive}
                onChange={(event) => updateTapeAnswer({ value: event.target.value })}
                placeholder="Например: 1101"
                type="text"
                value={draft.value}
              />
            </label>
            <p className="text-xs leading-5 text-slate-500 sm:col-span-2" id="tape-answer-help">
              Введи символы подряд или через пробел. Для пустой ячейки используй λ.
            </p>
          </div>
        )}

        <button className={`${primaryButton} mt-5`} disabled={!complete || result !== null || animationActive} onClick={submitAnswer} type="button">
          Проверить ответ
        </button>

        {result !== null && (
          <ResultDialog
            nextTask={nextTask}
            result={result}
            retry={retry}
            task={task}
          />
        )}
      </div>
    </section>
  )
}

function ResultDialog({ nextTask, result, retry, task }: {
  nextTask: () => void
  result: AnswerResult
  retry: () => void
  task: Task
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    titleRef.current?.focus()

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusable === undefined || focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      const activeIndex = Array.from(focusable).findIndex((element) => element === active)

      if (event.shiftKey && (active === first || activeIndex === -1)) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && (active === last || activeIndex === -1)) {
        event.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', trapFocus)
    return () => {
      document.removeEventListener('keydown', trapFocus)
      document.body.style.overflow = previousOverflow
      const previousIsDisabled = previouslyFocused instanceof HTMLButtonElement
        && previouslyFocused.disabled
      if (previouslyFocused?.isConnected && !previousIsDisabled) {
        previouslyFocused.focus()
      } else {
        document.getElementById('answer-heading')?.focus()
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-sm sm:p-8">
      <div className="flex min-h-full items-center justify-center">
        <div
          aria-describedby="result-explanation"
          aria-labelledby="result-title"
          aria-modal="true"
          className={`w-full max-w-2xl rounded-3xl border-t-8 bg-white p-5 shadow-2xl sm:p-8 ${result.correct ? 'border-emerald-500' : 'border-rose-500'}`}
          ref={dialogRef}
          role="dialog"
        >
          <div aria-live="assertive" role="alert">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Результат попытки</p>
            <h2
              className={`mt-2 text-3xl font-black outline-none ${result.correct ? 'text-emerald-900' : 'text-rose-900'}`}
              id="result-title"
              ref={titleRef}
              tabIndex={-1}
            >
              {result.correct ? 'Верно' : 'Пока неверно'}
            </h2>
            <dl className="mt-5 grid gap-2 text-sm leading-6 text-slate-700">
              <div><dt className="inline font-bold">Твой ответ: </dt><dd className="inline">{formatAnswer(task, result.submitted)}</dd></div>
              <div><dt className="inline font-bold">Правильный ответ: </dt><dd className="inline">{formatAnswer(task, task.answer)}</dd></div>
              <div>
                <dt className="inline font-bold">Самостоятельность: </dt>
                <dd className="inline">
                  {result.hintsUsed === 0
                    ? 'самостоятельно, без подсказок'
                    : `с поддержкой, подсказок использовано: ${result.hintsUsed}`}
                </dd>
              </div>
              <div>
                <dt className="inline font-bold">Режим и время: </dt>
                <dd className="inline">
                  {result.mode === 'exam' ? 'экзаменационный' : 'учебный'}, {formatDuration(result.durationMs)}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-sm leading-6 text-slate-700" id="result-explanation">{task.explanation}</p>
            {result.errors.length > 0 && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-slate-700">
                <p className="font-bold text-rose-900">Диагностика решения</p>
                {result.errors.map((error) => (
                  <p className="mt-1" key={error}>{mistakeDescription(task, error)}</p>
                ))}
                <p className="mt-2">
                  <strong>Следующий шаг:</strong> реши задачу ещё раз и отдельно проверь действие, указанное в диагностике.
                </p>
              </div>
            )}
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Попытка сохранена на этом устройстве
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button className={secondaryButton} onClick={retry} type="button">Решить ещё раз</button>
            <button className={primaryButton} onClick={nextTask} type="button">Следующая задача</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function isDraftComplete(draft: AnswerDraft, task: Task): boolean {
  if (draft === null) return false
  if (draft.type === 'choice') return draft.value !== ''
  if (draft.type === 'steps') {
    const value = Number(draft.value)
    return draft.value !== '' && Number.isInteger(value) && value >= 0
  }
  if (draft.type === 'count') {
    const value = Number(draft.value)
    return draft.value !== '' && Number.isInteger(value) && value >= 0
  }
  if (draft.type === 'tape') {
    return parseTapeInput(draft.startIndex, draft.value, task.alphabet) !== null
  }
  return draft.write !== '' && draft.direction !== '' && draft.nextState !== ''
}

function answerHeading(answer: TaskAnswer): string {
  if (answer.type === 'prediction') return 'Предскажи команду до запуска'
  if (answer.type === 'steps') return 'Укажи число выполненных команд'
  if (answer.type === 'count') return `Подсчитай символы «${displaySymbol(answer.symbol)}»`
  if (answer.type === 'tape') return 'Запиши итоговое содержимое ленты'
  return 'Выбери команду'
}

function displaySymbol(symbol: string): string {
  return symbol === EMPTY_SYMBOL ? '␣' : symbol
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

function animationPhaseLabel(phase: Exclude<AnimationPhase, null>): string {
  if (phase === 'write') return '1. Запись'
  if (phase === 'move') return '2. Движение'
  return '3. Состояние'
}

function animationDescription(
  phase: Exclude<AnimationPhase, null>,
  step: StepResult,
): string {
  if (phase === 'write') {
    return `В ячейку ${step.previousHeadPosition} записан символ ${displaySymbol(step.written)}.`
  }
  if (phase === 'move') {
    const directions: Record<Direction, string> = {
      L: 'L, головка движется влево',
      R: 'R, головка движется вправо',
      N: 'N, головка остаётся на месте',
      S: 'S, головка остаётся на месте и машина останавливается',
    }
    return directions[step.direction]
  }
  return `Новое состояние: ${step.newState}.`
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
  if (answer.type === 'count') {
    return `${answer.value} ${symbolsWord(answer.value)} «${displaySymbol(answer.symbol)}»`
  }
  if (answer.type === 'steps') return `${answer.value} ${stepsWord(answer.value)}`
  return formatTapeAnswer(answer.value)
}

function stepsWord(value: number): string {
  const lastTwoDigits = value % 100
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'шагов'
  const lastDigit = value % 10
  if (lastDigit === 1) return 'шаг'
  if (lastDigit >= 2 && lastDigit <= 4) return 'шага'
  return 'шагов'
}

function symbolsWord(value: number): string {
  const lastTwoDigits = value % 100
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'символов'
  const lastDigit = value % 10
  if (lastDigit === 1) return 'символ'
  if (lastDigit >= 2 && lastDigit <= 4) return 'символа'
  return 'символов'
}

function mistakeDescription(task: Task, error: string): string {
  return task.commonMistakes.find((mistake) => mistake.type === error)?.description ?? error
}

function formatTapeAnswer(tape: Record<number, string>): string {
  const entries = Object.entries(tape)
    .filter(([, symbol]) => symbol !== EMPTY_SYMBOL)
    .map(([index, symbol]) => [Number(index), symbol] as const)
    .sort(([left], [right]) => left - right)

  if (entries.length === 0) return 'пустая лента'

  const contiguous = entries.every(
    ([index], position) => position === 0 || index === entries[position - 1]![0] + 1,
  )
  if (!contiguous) {
    return entries.map(([index, symbol]) => `${index}:${displaySymbol(symbol)}`).join(', ')
  }

  const first = entries[0]![0]
  const last = entries[entries.length - 1]![0]
  return `[${first}…${last}] ${entries.map(([, symbol]) => displaySymbol(symbol)).join('')}`
}
