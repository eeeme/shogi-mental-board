/**
 * 機能②「マスが光る→記号回答（逆変換）」画面。
 * ランダムな1マスをハイライト → 筋・段のピッカーで回答 → 正誤＋反応時間を記録 → 次。
 */
import { useEffect, useRef, useState } from 'react'
import { BackBar } from '../../components/BackBar'
import { ShogiBoard } from '../../components/ShogiBoard'
import { cellLabel, type Cell } from '../../lib/coords'
import { now } from '../../lib/time'
import { useSettings } from '../../store/useSettings'
import { SessionRecorder } from '../../lib/sessionRecorder'
import { FULL_RANGE, normalizeRange, rangeSize } from '../../lib/range'
import type { CellRange } from '../../lib/range'
import { judgeReverse, randomTarget } from './reverseEngine'

type Phase = 'config' | 'playing' | 'result'

const COUNT_PRESETS = [10, 20, 30]
const RANK_KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九']
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

type Feedback = { correct: boolean; expected: Cell; answer: Cell }

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
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 text-sm text-sumi-300">{label}</span>
      <select
        value={min}
        onChange={(e) => onChange(Number(e.target.value), max)}
        className="tnum rounded-md border border-line bg-ink-850 px-2 py-1.5 text-sm text-sumi-100"
        aria-label={`${label} 下限`}
      >
        {DIGITS.map((d) => (
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
        {DIGITS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </div>
  )
}

function PickerRow({
  label,
  options,
  value,
  onPick,
  disabled,
}: {
  label: string
  options: { v: number; text: string }[]
  value: number | null
  onPick: (v: number) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-sumi-500">{label}</span>
      <div className="grid grid-cols-9 gap-1">
        {options.map((o) => {
          const active = value === o.v
          return (
            <button
              key={o.v}
              type="button"
              disabled={disabled}
              onClick={() => onPick(o.v)}
              aria-pressed={active}
              className={[
                'tnum rounded-md border py-2 text-sm transition-colors disabled:opacity-40',
                active
                  ? 'border-glow/70 text-sumi-100'
                  : 'border-line text-sumi-300 hover:text-sumi-100',
              ].join(' ')}
              style={active ? { backgroundColor: 'var(--color-ink-800)' } : undefined}
            >
              {o.text}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ReverseScreen({ onBack }: { onBack: () => void }) {
  const { boardOrientation } = useSettings()

  // パラメータ
  const [count, setCount] = useState(10)
  const [rangeMode, setRangeMode] = useState<'all' | 'partial'>('all')
  const [partialRange, setPartialRange] = useState<CellRange>({
    fileMin: 7,
    fileMax: 9,
    rankMin: 1,
    rankMax: 3,
  })

  // 実行状態
  const [phase, setPhase] = useState<Phase>('config')
  const [target, setTarget] = useState<Cell | null>(null)
  const [qIndex, setQIndex] = useState(0)
  const [pickFile, setPickFile] = useState<number | null>(null)
  const [pickRank, setPickRank] = useState<number | null>(null)
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
      void recorderRef.current?.finish()
    }
  }, [])

  const ask = (cell: Cell) => {
    setTarget(cell)
    prevRef.current = cell
    setPickFile(null)
    setPickRank(null)
    setFeedback(null)
    qStartRef.current = now()
  }

  const start = () => {
    recorderRef.current = new SessionRecorder('reverse')
    setPhase('playing')
    setQIndex(0)
    ask(randomTarget(range, Math.random, null))
  }

  const finish = () => {
    const rec = recorderRef.current
    const snap = rec?.snapshot()
    const total = rec?.count ?? 0
    const correct = rec?.correctCount ?? 0
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

  const submit = () => {
    if (feedback || !target || pickFile == null || pickRank == null) return
    const answer: Cell = { file: pickFile, rank: pickRank }
    const correct = judgeReverse(target, answer)
    const ms = now() - qStartRef.current
    recorderRef.current?.record({
      prompt: cellLabel(target),
      answer: cellLabel(answer),
      correct,
      ms,
    })
    setFeedback({ correct, expected: target, answer })
    const answered = qIndex + 1
    timerRef.current = setTimeout(() => {
      if (answered >= count) {
        finish()
      } else {
        setQIndex(answered)
        ask(randomTarget(range, Math.random, prevRef.current))
      }
    }, 800)
  }

  const stop = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    void recorderRef.current?.finish()
    recorderRef.current = null
    setPhase('config')
    setTarget(null)
    setFeedback(null)
  }

  // ---- 画面 ----
  if (phase === 'config') {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
        <BackBar title="マスが光る→記号回答" onBack={onBack} />
        <p className="text-sm text-sumi-300">
          光ったマスの座標（筋・段）を答えます。
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
    const canSubmit = pickFile != null && pickRank != null && !feedback
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
        <BackBar title="マスが光る→記号回答" onBack={stop} />
        <div className="flex items-center justify-between">
          <span className="tnum text-sm text-sumi-500">
            {qIndex + 1} / {count}
          </span>
          {feedback && (
            <span
              className="text-sm font-medium"
              style={{
                color: feedback.correct
                  ? 'var(--color-glow-soft)'
                  : 'var(--color-sumi-300)',
              }}
            >
              {feedback.correct
                ? '正解'
                : `不正解（正: ${cellLabel(feedback.expected)}）`}
            </span>
          )}
        </div>

        <div className="mx-auto w-full max-w-[300px]">
          <ShogiBoard orientation={boardOrientation} highlight={target} showRulers />
        </div>

        <PickerRow
          label="筋"
          options={DIGITS.map((d) => ({ v: d, text: String(d) }))}
          value={pickFile}
          onPick={setPickFile}
          disabled={!!feedback}
        />
        <PickerRow
          label="段"
          options={DIGITS.map((d) => ({ v: d, text: RANK_KANJI[d - 1] }))}
          value={pickRank}
          onPick={setPickRank}
          disabled={!!feedback}
        />

        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="rounded-lg border border-glow/70 bg-ink-800 px-6 py-3 text-base font-medium text-sumi-100 transition-colors disabled:opacity-40"
        >
          {pickFile != null && pickRank != null
            ? `決定（${pickFile}${RANK_KANJI[pickRank - 1]}）`
            : '筋と段を選ぶ'}
        </button>
      </div>
    )
  }

  // result
  const rate100 =
    summary.total > 0 ? Math.round((summary.correct / summary.total) * 100) : 0
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-6">
      <BackBar title="マスが光る→記号回答 — 結果" onBack={onBack} />
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

export default ReverseScreen
