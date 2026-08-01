/**
 * 機能③「系列記憶（順番タップ→答え合わせ）」画面。
 * 座標を N 個順に提示（盤面/符号/音声のうち1つ以上オン）→ 記憶 →
 * 示された順に N 個タップ → 答え合わせ（順序も一致で正解）。
 */
import { useEffect, useRef, useState } from 'react'
import { BackBar } from '../../components/BackBar'
import { ShogiBoard } from '../../components/ShogiBoard'
import { BoardModeSettings } from '../../components/BoardModeSettings'
import { cellLabel, type Cell } from '../../lib/coords'
import { delay, isTTSSupported, tts } from '../../lib/tts'
import { now } from '../../lib/time'
import { useSettings } from '../../store/useSettings'
import { useModeUi } from '../../store/useModeSettings'
import { useUsageGate } from '../../lib/entitlement'
import { SessionRecorder } from '../../lib/sessionRecorder'
import { FULL_RANGE, normalizeRange, rangeSize } from '../../lib/range'
import type { CellRange } from '../../lib/range'
import {
  ALL_CHANNELS,
  generateSequence,
  judgeSequence,
  toggleChannel,
  type Channel,
  type Channels,
  type SequenceJudgement,
} from './sequenceEngine'

type Phase = 'config' | 'present' | 'recall' | 'result'

const N_PRESETS = [3, 4, 5, 6, 7]
const CHANNEL_LABEL: Record<Channel, string> = {
  board: '盤面',
  symbol: '符号',
  audio: '音声',
}

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

export function SequenceScreen({
  onBack,
  onInfo,
}: {
  onBack: () => void
  onInfo?: () => void
}) {
  const { rate, yomiStyle } = useSettings()
  const { orientation, showLabels } = useModeUi('sequence')
  const gate = useUsageGate('sequence')
  const supported = isTTSSupported()

  // パラメータ
  const [n, setN] = useState(4)
  const [intervalSec, setIntervalSec] = useState(1.2)
  const [rangeMode, setRangeMode] = useState<'all' | 'partial'>('all')
  const [partialRange, setPartialRange] = useState<CellRange>({
    fileMin: 7,
    fileMax: 9,
    rankMin: 1,
    rankMax: 3,
  })
  const [channels, setChannels] = useState<Channels>({
    board: true,
    symbol: false,
    audio: true,
  })

  // 実行状態
  const [phase, setPhase] = useState<Phase>('config')
  const [sequence, setSequence] = useState<Cell[]>([])
  const [presentIndex, setPresentIndex] = useState(-1)
  const [taps, setTaps] = useState<Cell[]>([])
  const [judgement, setJudgement] = useState<SequenceJudgement | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const recorderRef = useRef<SessionRecorder | null>(null)
  const recallStartRef = useRef(0)

  const range = rangeMode === 'all' ? FULL_RANGE : normalizeRange(partialRange)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      tts.cancel()
      void recorderRef.current?.finish()
    }
  }, [])

  const backToConfig = () => {
    abortRef.current?.abort()
    tts.cancel()
    setPhase('config')
    setPresentIndex(-1)
    setTaps([])
    setJudgement(null)
  }

  const runPresentation = async (seq: Cell[]) => {
    const ac = new AbortController()
    abortRef.current = ac
    try {
      for (let i = 0; i < seq.length; i++) {
        if (ac.signal.aborted) return
        const cell = seq[i]
        setPresentIndex(i)
        const speak = channels.audio
          ? tts.speakCell(cell, yomiStyle, { rate })
          : Promise.resolve()
        await Promise.all([speak, delay(intervalSec * 1000, ac.signal)])
        if (ac.signal.aborted) return
        // 次のマスとの区切り（同じマスが続いて見える誤認を防ぐ）
        setPresentIndex(-1)
        await delay(220, ac.signal)
      }
      // 提示終了 → 回答フェーズ
      setPhase('recall')
      setTaps([])
      recallStartRef.current = now()
    } catch {
      // Abort は正常系
    }
  }

  const start = async () => {
    tts.unlock() // iOS 対策（ユーザー操作起点）
    gate.record() // 無料利用回数を記録（現状はブロックしない）
    const seq = generateSequence(n, range)
    setSequence(seq)
    setJudgement(null)
    setPresentIndex(-1)
    setPhase('present')
    if (!recorderRef.current) {
      recorderRef.current = new SessionRecorder('sequence')
    }
    await runPresentation(seq)
  }

  const finishRecall = (finalTaps: Cell[]) => {
    const ms = now() - recallStartRef.current
    const result = judgeSequence(sequence, finalTaps)
    setJudgement(result)
    setPhase('result')
    recorderRef.current?.record({
      prompt: sequence.map(cellLabel).join(' '),
      answer: finalTaps.map(cellLabel).join(' '),
      correct: result.correct,
      ms,
    })
  }

  const onRecallTap = (cell: Cell) => {
    if (phase !== 'recall') return
    setTaps((prev) => {
      if (prev.length >= sequence.length) return prev
      const next = [...prev, cell]
      if (next.length === sequence.length) finishRecall(next)
      return next
    })
  }

  const tapOrderContent = (cell: Cell) => {
    const idx = taps.findIndex(
      (t) => t.file === cell.file && t.rank === cell.rank,
    )
    return idx >= 0 ? idx + 1 : null
  }

  // ---- 画面 ----
  if (phase === 'config') {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
        <BackBar title="系列記憶" onBack={onBack} onInfo={onInfo} />
        <p className="text-sm text-sumi-300">
          座標を <span className="tnum text-sumi-100">{n}</span> 個
          順に覚えて、示された順にタップします。
        </p>

        {!supported && channels.audio && (
          <p className="rounded-md border border-line-soft bg-ink-900/60 p-3 text-xs text-sumi-500">
            この端末は音声非対応です。音声オフでも盤面・符号で出題できます。
          </p>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-sm text-sumi-300">出題数 N</span>
          <div className="flex gap-2">
            {N_PRESETS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setN(v)}
                aria-pressed={n === v}
                className={[
                  'tnum flex-1 rounded-md border px-2 py-2 text-sm transition-colors',
                  n === v
                    ? 'border-glow/70 text-sumi-100'
                    : 'border-line text-sumi-500 hover:text-sumi-300',
                ].join(' ')}
                style={
                  n === v ? { backgroundColor: 'var(--color-ink-800)' } : undefined
                }
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-sumi-300">提示手段（1つ以上）</span>
          <div className="flex gap-2">
            {ALL_CHANNELS.map((c) => {
              const on = channels[c]
              const disabled = c === 'audio' && !supported
              return (
                <button
                  key={c}
                  type="button"
                  disabled={disabled}
                  onClick={() => setChannels((prev) => toggleChannel(prev, c))}
                  aria-pressed={on}
                  className={[
                    'flex-1 rounded-md border px-3 py-2 text-sm transition-colors disabled:opacity-40',
                    on
                      ? 'border-glow/70 text-sumi-100'
                      : 'border-line text-sumi-500 hover:text-sumi-300',
                  ].join(' ')}
                  style={
                    on ? { backgroundColor: 'var(--color-ink-800)' } : undefined
                  }
                >
                  {CHANNEL_LABEL[c]}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-sumi-300">提示間隔</span>
            <span className="tnum text-sm text-sumi-100">
              {intervalSec.toFixed(1)}秒
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.1}
            value={intervalSec}
            onChange={(e) => setIntervalSec(Number(e.target.value))}
            className="w-full accent-[var(--color-glow)]"
            aria-label="提示間隔（秒）"
          />
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

        <BoardModeSettings mode="sequence" />

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

  if (phase === 'present') {
    const current = presentIndex >= 0 ? sequence[presentIndex] : null
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
        <BackBar title="系列記憶 — 記憶" onBack={backToConfig} />
        <p className="tnum text-center text-sm text-sumi-500">
          {presentIndex >= 0 ? presentIndex + 1 : sequence.length} /{' '}
          {sequence.length}
        </p>

        {channels.symbol && (
          <div
            className="tnum text-center text-6xl font-semibold"
            style={{
              color: current
                ? 'var(--color-glow-soft)'
                : 'var(--color-sumi-500)',
            }}
            aria-live="polite"
          >
            {current ? cellLabel(current) : '—'}
          </div>
        )}

        {channels.board ? (
          <div className="mx-auto w-full max-w-[340px]">
            <ShogiBoard
              orientation={orientation}
              showLabels={showLabels}
              highlight={current}
            />
          </div>
        ) : (
          <p className="text-center text-sm text-sumi-500">
            {channels.audio ? '音声で出題中…' : '出題中…'} 覚えてください
          </p>
        )}

        <button
          type="button"
          onClick={backToConfig}
          className="mx-auto rounded-md border border-line px-4 py-2 text-sm text-sumi-300"
        >
          中止
        </button>
      </div>
    )
  }

  if (phase === 'recall') {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-6">
        <BackBar title="系列記憶 — 再現" onBack={backToConfig} />
        <p className="text-center text-sm text-sumi-300">
          示された順にタップ{' '}
          <span className="tnum text-sumi-100">
            {taps.length} / {sequence.length}
          </span>
        </p>
        <div className="w-full">
          <ShogiBoard
            orientation={orientation}
            showLabels={showLabels}
            onCellTap={onRecallTap}
            cellContent={tapOrderContent}
          />
        </div>
        <button
          type="button"
          onClick={() => setTaps([])}
          disabled={taps.length === 0}
          className="mx-auto rounded-md border border-line px-4 py-2 text-sm text-sumi-300 disabled:opacity-40"
        >
          タップをやり直す
        </button>
      </div>
    )
  }

  // result
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-6">
      <BackBar title="系列記憶 — 結果" onBack={onBack} />
      <div
        className="rounded-lg border p-6 text-center"
        style={{
          borderColor: judgement?.correct
            ? 'var(--color-glow)'
            : 'var(--color-line)',
        }}
      >
        <p
          className="text-2xl font-semibold"
          style={{
            color: judgement?.correct
              ? 'var(--color-glow-soft)'
              : 'var(--color-sumi-100)',
          }}
        >
          {judgement?.correct ? '正解' : '不正解'}
        </p>
        <p className="tnum mt-1 text-sm text-sumi-500">
          位置一致 {judgement?.matched} / {judgement?.total}
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-line-soft p-4 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-sumi-500">出題</span>
          <span className="tnum text-right text-sumi-100">
            {sequence.map(cellLabel).join(' ')}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-sumi-500">回答</span>
          <span className="tnum text-right text-sumi-300">
            {taps.map(cellLabel).join(' ') || '—'}
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={backToConfig}
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

export default SequenceScreen
