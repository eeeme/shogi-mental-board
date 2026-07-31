/**
 * 機能①「読み上げ→マス押下（逐次1問1答）」画面。
 * 座標を1つ提示（符号 and/or 音声）→ 該当マスを即タップ → 正誤＋反応時間を記録 → 次の1問。
 * 符号と音声はどちらか一方をオフにできるが両方オフは不可。盤面は常にオン。
 */
import { useEffect, useRef, useState } from 'react'
import { BackBar } from '../../components/BackBar'
import { ShogiBoard } from '../../components/ShogiBoard'
import { cellLabel, type Cell } from '../../lib/coords'
import { isTTSSupported, tts } from '../../lib/tts'
import { now } from '../../lib/time'
import { useSettings } from '../../store/useSettings'
import { SessionRecorder } from '../../lib/sessionRecorder'
import { FULL_RANGE, normalizeRange, rangeSize } from '../../lib/range'
import type { CellRange } from '../../lib/range'
import {
  judgeTap,
  nextQuestion,
  toggleTapChannel,
  type TapChannels,
} from './tapEngine'

type Phase = 'config' | 'playing' | 'result'

const COUNT_PRESETS = [10, 20, 30]

type Feedback = { correct: boolean; expected: Cell; tapped: Cell }

function RangeRow({
  label,
  min,
  max,
  onChange,
}: {
  label: string
  min: number
  max: number
  onChange: (min: number, max: number) => void
}) {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 text-sm text-sumi-300">{label}</span>
      <select
        value={min}
        onChange={(e) => onChange(Number(e.target.value), max)}
        className="tnum rounded-md border border-line bg-ink-850 px-2 py-1.5 text-sm text-sumi-100"
        aria-label={`${label} 下限`}
      >
        {digits.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <span className="text-sumi-500">〜</span>
      <select
        value={max}
        onChange={(e) => onChange(min, Number(e.target.value))}
        className="tnum rounded-md border border-line bg-ink-850 px-2 py-1.5 text-sm text-sumi-100"
        aria-label={`${label} 上限`}
      >
        {digits.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </div>
  )
}

export function TapCellScreen({ onBack }: { onBack: () => void }) {
  const { rate, yomiStyle, boardOrientation } = useSettings()
  const supported = isTTSSupported()

  // パラメータ
  const [count, setCount] = useState(10)
  const [rangeMode, setRangeMode] = useState<'all' | 'partial'>('all')
  const [partialRange, setPartialRange] = useState<CellRange>({
    fileMin: 7,
    fileMax: 9,
    rankMin: 1,
    rankMax: 3,
  })
  const [channels, setChannels] = useState<TapChannels>({
    symbol: true,
    audio: true,
  })

  // 実行状態
  const [phase, setPhase] = useState<Phase>('config')
  const [current, setCurrent] = useState<Cell | null>(null)
  const [qIndex, setQIndex] = useState(0)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [summary, setSummary] = useState({ total: 0, correct: 0, avgMs: 0 })

  const recorderRef = useRef<SessionRecorder | null>(null)
  const qStartRef = useRef(0)
  const prevRef = useRef<Cell | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const range = rangeMode === 'all' ? FULL_RANGE : normalizeRange(partialRange)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      tts.cancel()
      void recorderRef.current?.finish()
    }
  }, [])

  const askQuestion = (cell: Cell) => {
    setCurrent(cell)
    setFeedback(null)
    prevRef.current = cell
    qStartRef.current = now()
    if (channels.audio) void tts.speakCell(cell, yomiStyle, { rate })
  }

  const start = () => {
    tts.unlock() // iOS 対策
    recorderRef.current = new SessionRecorder('tap')
    setPhase('playing')
    setQIndex(0)
    askQuestion(nextQuestion(range, Math.random, null))
  }

  const finish = () => {
    const rec = recorderRef.current
    const total = rec?.count ?? 0
    const correct = rec?.correctCount ?? 0
    const snap = rec?.snapshot()
    const avgMs =
      snap && snap.trials.length > 0
        ? Math.round(
            snap.trials.reduce((s, t) => s + t.ms, 0) / snap.trials.length,
          )
        : 0
    setSummary({ total, correct, avgMs })
    void rec?.finish()
    setPhase('result')
  }

  const onTap = (cell: Cell) => {
    if (phase !== 'playing' || feedback || !current) return
    const correct = judgeTap(current, cell)
    const ms = now() - qStartRef.current
    recorderRef.current?.record({
      prompt: cellLabel(current),
      answer: cellLabel(cell),
      correct,
      ms,
    })
    setFeedback({ correct, expected: current, tapped: cell })
    const answered = qIndex + 1
    timerRef.current = setTimeout(() => {
      if (answered >= count) {
        finish()
      } else {
        setQIndex(answered)
        askQuestion(nextQuestion(range, Math.random, prevRef.current))
      }
    }, 750)
  }

  const stop = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    tts.cancel()
    void recorderRef.current?.finish()
    recorderRef.current = null
    setPhase('config')
    setCurrent(null)
    setFeedback(null)
  }

  // ---- 画面 ----
  if (phase === 'config') {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
        <BackBar title="読み上げ→マス押下" onBack={onBack} />
        <p className="text-sm text-sumi-300">
          出された座標のマスを、その場でタップします（1問1答）。
        </p>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-sumi-300">出題数</span>
          <div className="flex gap-2">
            {COUNT_PRESETS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setCount(v)}
                aria-pressed={count === v}
                className={[
                  'tnum flex-1 rounded-md border px-2 py-2 text-sm transition-colors',
                  count === v
                    ? 'border-glow/70 text-sumi-100'
                    : 'border-line text-sumi-500 hover:text-sumi-300',
                ].join(' ')}
                style={
                  count === v
                    ? { backgroundColor: 'var(--color-ink-800)' }
                    : undefined
                }
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-sumi-300">出題手段（どちらか一方は必須）</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setChannels((c) => toggleTapChannel(c, 'symbol'))}
              aria-pressed={channels.symbol}
              className={[
                'flex-1 rounded-md border px-3 py-2 text-sm transition-colors',
                channels.symbol
                  ? 'border-glow/70 text-sumi-100'
                  : 'border-line text-sumi-500 hover:text-sumi-300',
              ].join(' ')}
              style={
                channels.symbol
                  ? { backgroundColor: 'var(--color-ink-800)' }
                  : undefined
              }
            >
              符号表示
            </button>
            <button
              type="button"
              disabled={!supported}
              onClick={() => setChannels((c) => toggleTapChannel(c, 'audio'))}
              aria-pressed={channels.audio}
              className={[
                'flex-1 rounded-md border px-3 py-2 text-sm transition-colors disabled:opacity-40',
                channels.audio
                  ? 'border-glow/70 text-sumi-100'
                  : 'border-line text-sumi-500 hover:text-sumi-300',
              ].join(' ')}
              style={
                channels.audio
                  ? { backgroundColor: 'var(--color-ink-800)' }
                  : undefined
              }
            >
              音声
            </button>
          </div>
          {!supported && (
            <p className="text-xs text-sumi-500">
              この端末は音声非対応です。符号表示でプレイできます。
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-sumi-300">
            出題範囲
            <span className="tnum ml-2 text-xs text-sumi-500">
              {rangeSize(range)}マス
            </span>
          </span>
          <div className="flex gap-2">
            {(['all', 'partial'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setRangeMode(m)}
                aria-pressed={rangeMode === m}
                className={[
                  'flex-1 rounded-md border px-3 py-2 text-sm transition-colors',
                  rangeMode === m
                    ? 'border-glow/70 text-sumi-100'
                    : 'border-line text-sumi-500 hover:text-sumi-300',
                ].join(' ')}
                style={
                  rangeMode === m
                    ? { backgroundColor: 'var(--color-ink-800)' }
                    : undefined
                }
              >
                {m === 'all' ? '全盤' : '一部'}
              </button>
            ))}
          </div>
          {rangeMode === 'partial' && (
            <div className="mt-1 flex flex-col gap-2 rounded-md border border-line-soft p-3">
              <RangeRow
                label="筋"
                min={partialRange.fileMin}
                max={partialRange.fileMax}
                onChange={(fileMin, fileMax) =>
                  setPartialRange((r) => ({ ...r, fileMin, fileMax }))
                }
              />
              <RangeRow
                label="段"
                min={partialRange.rankMin}
                max={partialRange.rankMax}
                onChange={(rankMin, rankMax) =>
                  setPartialRange((r) => ({ ...r, rankMin, rankMax }))
                }
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={start}
          className="rounded-lg border border-line bg-ink-850 px-6 py-4 text-lg font-medium text-sumi-100 transition-colors hover:border-glow/60"
          style={{ boxShadow: '0 0 24px -10px var(--color-glow)' }}
        >
          開始
        </button>
      </div>
    )
  }

  if (phase === 'playing') {
    // フィードバック中は出題マスを光らせて正解位置を示す
    const highlight = feedback ? feedback.expected : null
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-6">
        <BackBar title="読み上げ→マス押下" onBack={stop} />
        <div className="flex items-center justify-between">
          <span className="tnum text-sm text-sumi-500">
            {qIndex + 1} / {count}
          </span>
          {feedback ? (
            <span
              className="text-sm font-medium"
              style={{
                color: feedback.correct
                  ? 'var(--color-glow-soft)'
                  : 'var(--color-sumi-300)',
              }}
            >
              {feedback.correct ? '正解' : `不正解（正: ${cellLabel(feedback.expected)}）`}
            </span>
          ) : (
            <span className="text-sm text-sumi-500">タップ</span>
          )}
        </div>

        <div
          className="tnum text-center text-5xl font-semibold"
          style={{ color: 'var(--color-glow-soft)' }}
          aria-live="polite"
        >
          {channels.symbol && current ? cellLabel(current) : '？'}
        </div>

        <div className="mx-auto w-full max-w-[340px]">
          <ShogiBoard
            orientation={boardOrientation}
            onCellTap={onTap}
            highlight={highlight}
            disabled={!!feedback}
          />
        </div>

        {channels.audio && current && (
          <button
            type="button"
            onClick={() => tts.speakCell(current, yomiStyle, { rate })}
            className="mx-auto rounded-md border border-line px-4 py-2 text-sm text-sumi-300"
          >
            もう一度聞く
          </button>
        )}
      </div>
    )
  }

  // result
  const rate100 =
    summary.total > 0 ? Math.round((summary.correct / summary.total) * 100) : 0
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-6">
      <BackBar title="読み上げ→マス押下 — 結果" onBack={onBack} />
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-line-soft p-4 text-center">
          <p className="tnum text-2xl font-semibold text-glow-soft">{rate100}%</p>
          <p className="mt-1 text-xs text-sumi-500">正答率</p>
        </div>
        <div className="rounded-lg border border-line-soft p-4 text-center">
          <p className="tnum text-2xl font-semibold text-sumi-100">
            {summary.correct}/{summary.total}
          </p>
          <p className="mt-1 text-xs text-sumi-500">正解数</p>
        </div>
        <div className="rounded-lg border border-line-soft p-4 text-center">
          <p className="tnum text-2xl font-semibold text-sumi-100">
            {summary.avgMs}
          </p>
          <p className="mt-1 text-xs text-sumi-500">平均ms</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setPhase('config')}
          className="flex-1 rounded-md border border-line px-4 py-3 text-sm text-sumi-300"
        >
          設定へ
        </button>
        <button
          type="button"
          onClick={start}
          className="flex-1 rounded-md border border-glow/70 bg-ink-800 px-4 py-3 text-sm text-sumi-100"
        >
          もう一度
        </button>
      </div>
    </div>
  )
}

export default TapCellScreen
