/**
 * 機能③「ただ読み上げ」画面。
 * 座標を連続で読み上げるだけの受動モード。画面を見ずに「ながら」で成立する。
 * パラメータ: 発話間隔（スピード）/ 出題範囲（全盤・一部）/ 連続数。
 */
import { useEffect, useRef, useState } from 'react'
import { BackBar } from '../../components/BackBar'
import { ShogiBoard } from '../../components/ShogiBoard'
import { cellLabel, type Cell } from '../../lib/coords'
import { delay, isTTSSupported, tts } from '../../lib/tts'
import { useSettings } from '../../store/useSettings'
import {
  FULL_RANGE,
  normalizeRange,
  randomCellInRange,
  rangeSize,
  type CellRange,
} from './listenEngine'

type CountPreset = 10 | 20 | 50 | 0 // 0 = エンドレス
const COUNT_PRESETS: { value: CountPreset; label: string }[] = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 50, label: '50' },
  { value: 0, label: 'エンドレス' },
]

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

export function ListenScreen({ onBack }: { onBack: () => void }) {
  const { rate, yomiStyle, boardOrientation } = useSettings()
  const supported = isTTSSupported()

  // パラメータ
  const [intervalSec, setIntervalSec] = useState(1.5)
  const [rangeMode, setRangeMode] = useState<'all' | 'partial'>('all')
  const [partialRange, setPartialRange] = useState<CellRange>({
    fileMin: 7,
    fileMax: 9,
    rankMin: 1,
    rankMax: 3,
  })
  const [count, setCount] = useState<CountPreset>(20)

  // 実行状態
  const [running, setRunning] = useState(false)
  const [current, setCurrent] = useState<Cell | null>(null)
  const [done, setDone] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const range = rangeMode === 'all' ? FULL_RANGE : normalizeRange(partialRange)

  // アンマウント時は必ず停止
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      tts.cancel()
    }
  }, [])

  const stop = () => {
    abortRef.current?.abort()
    tts.cancel()
  }

  const start = async () => {
    if (running) return
    // ★ ユーザー操作起点でアンロック（iOS 対策）
    tts.unlock()

    const ac = new AbortController()
    abortRef.current = ac
    setRunning(true)
    setDone(0)
    setCurrent(null)

    let prev: Cell | null = null
    let n = 0
    try {
      while (!ac.signal.aborted && (count === 0 || n < count)) {
        const cell = randomCellInRange(range, Math.random, prev)
        prev = cell
        setCurrent(cell)
        await tts.speakCell(cell, yomiStyle, { rate })
        if (ac.signal.aborted) break
        n += 1
        setDone(n)
        if (count !== 0 && n >= count) break
        await delay(intervalSec * 1000, ac.signal)
      }
    } catch {
      // AbortError（停止）は正常系
    } finally {
      tts.cancel()
      setRunning(false)
      abortRef.current = null
    }
  }

  const total = count === 0 ? '∞' : String(count)

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
      <BackBar title="ただ読み上げ" onBack={onBack} />

      {!supported && (
        <p className="rounded-md border border-line-soft bg-ink-900/60 p-3 text-xs text-sumi-500">
          この端末/ブラウザは音声読み上げに対応していません。スマホのブラウザでお試しください。
        </p>
      )}

      {/* 現在の読み上げ表示（見なくても成立するが、見れば確認できる） */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="tnum text-5xl font-semibold"
          style={{ color: current ? 'var(--color-glow-soft)' : 'var(--color-sumi-500)' }}
          aria-live="polite"
        >
          {current ? cellLabel(current) : '—'}
        </div>
        <div className="tnum text-sm text-sumi-500">
          {done} / {total}
        </div>
        <div className="w-full max-w-[280px]">
          <ShogiBoard orientation={boardOrientation} highlight={current} />
        </div>
      </div>

      {running ? (
        <button
          type="button"
          onClick={stop}
          className="rounded-lg border border-glow/70 bg-ink-800 px-6 py-4 text-lg font-medium text-sumi-100"
        >
          停止
        </button>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={!supported}
          className="rounded-lg border border-line bg-ink-850 px-6 py-4 text-lg font-medium text-sumi-100 transition-colors hover:border-glow/60 disabled:opacity-50"
          style={{ boxShadow: '0 0 24px -10px var(--color-glow)' }}
        >
          開始
        </button>
      )}

      {/* パラメータ（実行中は編集不可） */}
      <fieldset
        disabled={running}
        className="flex flex-col gap-5 disabled:opacity-50"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-sumi-300">発話間隔</span>
            <span className="tnum text-sm text-sumi-100">
              {intervalSec.toFixed(1)}秒
            </span>
          </div>
          <input
            type="range"
            min={0.3}
            max={4}
            step={0.1}
            value={intervalSec}
            onChange={(e) => setIntervalSec(Number(e.target.value))}
            className="w-full accent-[var(--color-glow)]"
            aria-label="発話間隔（秒）"
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

        <div className="flex flex-col gap-2">
          <span className="text-sm text-sumi-300">連続数</span>
          <div className="flex gap-2">
            {COUNT_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setCount(p.value)}
                aria-pressed={count === p.value}
                className={[
                  'tnum flex-1 rounded-md border px-2 py-2 text-sm transition-colors',
                  count === p.value
                    ? 'border-glow/70 text-sumi-100'
                    : 'border-line text-sumi-500 hover:text-sumi-300',
                ].join(' ')}
                style={
                  count === p.value
                    ? { backgroundColor: 'var(--color-ink-800)' }
                    : undefined
                }
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <p className="tnum text-xs text-sumi-500">
          話速 {rate.toFixed(1)}x・読み{yomiStyle === 'modern' ? 'よん/なな/きゅう' : 'し/しち/く'}（設定で変更）
        </p>
      </fieldset>
    </div>
  )
}

export default ListenScreen
