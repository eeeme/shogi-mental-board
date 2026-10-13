/**
 * 機能⑧「ただ読み上げ（受動）」画面。
 * 座標をひたすら音声で読み上げ続けるだけ。タップ・答え合わせなし。停止までエンドレス。
 * 画面を見ない「ながら聴き」用途。
 */
import { useEffect, useRef, useState } from 'react'
import { BackBar } from '../../components/BackBar'
import { ShogiBoard } from '../../components/ShogiBoard'
import { allCells, cellLabel, cellYomi, type Cell } from '../../lib/coords'
import { useEntitlement } from '../../lib/entitlement'
import { isNative, NativeSpeech } from '../../lib/nativeSpeech'
import type { PluginListenerHandle } from '@capacitor/core'
import { delay, isTTSSupported, tts } from '../../lib/tts'
import { now } from '../../lib/time'
import { useSettings } from '../../store/useSettings'
import { saveSession } from '../../lib/storage'
import { FULL_RANGE, isInRange, normalizeRange, randomCellInRange, rangeSize } from '../../lib/range'
import type { CellRange } from '../../lib/range'
import { runListenLoop } from './listenEngine'
import {
  DEFAULT_TOGGLES,
  toggleDisplay,
  type DisplayToggles,
  type ToggleKey,
} from './displayToggles'

const TOGGLE_ITEMS: { key: ToggleKey; label: string }[] = [
  { key: 'board', label: '盤' },
  { key: 'fileLabels', label: '筋ラベル' },
  { key: 'rankLabels', label: '段ラベル' },
  { key: 'symbol', label: '符号' },
  { key: 'glow', label: '光るマス' },
]

type Phase = 'config' | 'reading'

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

export function ListenScreen({
  onBack,
  onInfo,
}: {
  onBack: () => void
  onInfo?: () => void
}) {
  const { rate, yomiStyle } = useSettings()
  const supported = isTTSSupported()
  const { isPro } = useEntitlement()
  /** 購入済みのアプリ版は、画面を消しても続くバックグラウンド読み上げを使う。 */
  const background = isNative && isPro
  const [notice, setNotice] = useState<string | null>(null)
  const listenersRef = useRef<PluginListenerHandle[]>([])

  const [intervalSec, setIntervalSec] = useState(1.5)
  const [rangeMode, setRangeMode] = useState<'all' | 'partial'>('all')
  const [partialRange, setPartialRange] = useState<CellRange>({
    fileMin: 7,
    fileMax: 9,
    rankMin: 1,
    rankMax: 3,
  })

  const [toggles, setToggles] = useState<DisplayToggles>(DEFAULT_TOGGLES)

  const [phase, setPhase] = useState<Phase>('config')
  const [current, setCurrent] = useState<Cell | null>(null)
  const [count, setCount] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const startedAtRef = useRef(0)
  const savedRef = useRef(true)

  const setToggle = (key: ToggleKey, value: boolean) =>
    setToggles((s) => toggleDisplay(s, key, value))

  const range = rangeMode === 'all' ? FULL_RANGE : normalizeRange(partialRange)

  // 実施したセッションを記録（受動なので試行は持たず、実施時間のみ）。
  const persistSession = () => {
    if (savedRef.current) return
    savedRef.current = true
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    void saveSession({
      id,
      mode: 'listen',
      startedAt: startedAtRef.current,
      finishedAt: now(),
      trials: [],
    })
  }

  const detachListeners = () => {
    const handles = listenersRef.current
    listenersRef.current = []
    for (const h of handles) void h.remove()
  }

  /** バックグラウンド読み上げの進み具合を画面に映す（画面オフ中の分は戻ったときにまとめて届く）。 */
  const attachListeners = async () => {
    detachListeners()
    const onCell = await NativeSpeech.addListener('loopCell', (e) => {
      setCurrent({ file: e.file, rank: e.rank })
      setCount(e.count)
    })
    const onStopped = await NativeSpeech.addListener('loopStopped', (e) => {
      detachListeners()
      persistSession()
      setPhase('config')
      setCurrent(null)
      if (e.reason === 'tts_unavailable') {
        setNotice('この端末では日本語の読み上げが使えませんでした。端末の設定で「テキスト読み上げ」の日本語音声を入れてください。')
      }
    })
    listenersRef.current = [onCell, onStopped]
  }

  useEffect(() => {
    // アプリが作り直されても、バックグラウンドで読み上げ中ならその画面に戻す
    if (background) {
      void NativeSpeech.isLooping().then(({ looping }) => {
        if (!looping) return
        savedRef.current = false
        startedAtRef.current = now()
        setPhase('reading')
        void attachListeners()
      })
    }
    return () => {
      abortRef.current?.abort()
      tts.cancel()
      if (background) void NativeSpeech.stopLoop().catch(() => undefined)
      detachListeners()
      persistSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stop = () => {
    abortRef.current?.abort()
    tts.cancel()
    if (background) void NativeSpeech.stopLoop().catch(() => undefined)
    detachListeners()
    persistSession()
    setPhase('config')
    setCurrent(null)
  }

  const startBackground = async () => {
    const items = allCells()
      .filter((c) => isInRange(c, range))
      .map((c) => ({ text: cellYomi(c, yomiStyle), file: c.file, rank: c.rank }))
    startedAtRef.current = now()
    savedRef.current = false
    setNotice(null)
    setPhase('reading')
    setCurrent(null)
    setCount(0)
    await attachListeners()
    try {
      await NativeSpeech.startLoop({ items, intervalMs: intervalSec * 1000, rate })
    } catch {
      detachListeners()
      savedRef.current = true
      setPhase('config')
      setNotice('読み上げを開始できませんでした。もう一度お試しください。')
    }
  }

  const start = async () => {
    if (background) {
      await startBackground()
      return
    }
    tts.unlock() // iOS 対策（ユーザー操作起点）
    const ac = new AbortController()
    abortRef.current = ac
    startedAtRef.current = now()
    savedRef.current = false
    setPhase('reading')
    setCurrent(null)
    setCount(0)

    let prev: Cell | null = null
    await runListenLoop({
      pickCell: () => {
        const c = randomCellInRange(range, Math.random, prev)
        prev = c
        return c
      },
      speakCell: (c) => tts.speakCell(c, yomiStyle, { rate }),
      waitGap: (signal) => delay(intervalSec * 1000, signal),
      signal: ac.signal,
      onCell: (c) => {
        setCurrent(c)
        setCount((n) => n + 1)
      },
    })
  }

  if (phase === 'reading') {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
        <BackBar title="ただ読み上げ" onBack={stop} onInfo={onInfo} />
        <p className="text-center text-sm text-sumi-500">
          {background
            ? '画面を消しても読み上げ続けます。通知の「停止」からも止められます'
            : '停止するまで読み上げ続けます（ながら聴き）'}
        </p>

        {toggles.symbol && (
          <div
            className="tnum text-center text-6xl font-semibold"
            style={{
              color: current
                ? 'var(--color-glow-soft)'
                : 'var(--color-sumi-500)',
            }}
            aria-live="polite"
          >
            {current ? cellLabel(current) : '…'}
          </div>
        )}

        {toggles.board && (
          <div className="w-full">
            <ShogiBoard
              orientation="sente"
              showFileLabels={toggles.fileLabels}
              showRankLabels={toggles.rankLabels}
              highlight={toggles.glow ? current : null}
            />
          </div>
        )}

        <p className="tnum text-center text-sm text-sumi-500">{count} 回</p>
        <button
          type="button"
          onClick={stop}
          className="rounded-lg border border-glow/70 bg-ink-800 px-6 py-4 text-lg font-medium text-sumi-100"
        >
          停止
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
      <BackBar title="ただ読み上げ" onBack={onBack} onInfo={onInfo} />
      <p className="text-sm text-sumi-300">
        座標をひたすら読み上げます。タップも答え合わせもありません。
      </p>

      {!supported && (
        <p className="rounded-md border border-line-soft bg-ink-900/60 p-3 text-xs text-sumi-500">
          この端末/ブラウザは音声読み上げに対応していません。
        </p>
      )}

      {isNative && (
        <p className="rounded-md border border-line-soft bg-ink-900/60 p-3 text-xs leading-relaxed text-sumi-500">
          {background
            ? '画面を消しても、他のアプリを使っていても読み上げを続けます。止めるときは「停止」か、通知の「停止」を押してください。'
            : '画面を消したり他のアプリに切り替えると止まります。購入すると、画面を消しても読み上げを続けられます（設定 → 購入）。'}
        </p>
      )}

      {notice && (
        <p className="rounded-md border border-line-soft bg-ink-900/60 p-3 text-xs text-sumi-300">
          {notice}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-sumi-300">発話間隔</span>
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
        <span className="text-sm text-sumi-300">
          表示（音声は常時オン。全部オフ＝音だけでもOK）
        </span>
        <div className="flex flex-wrap gap-2">
          {TOGGLE_ITEMS.map(({ key, label }) => {
            const on = toggles[key]
            return (
              <button
                key={key}
                type="button"
                onClick={() => setToggle(key, !on)}
                aria-pressed={on}
                className={[
                  'rounded-md border px-3 py-2 text-sm transition-colors',
                  on
                    ? 'border-glow/70 text-sumi-100'
                    : 'border-line text-sumi-500 hover:text-sumi-300',
                ].join(' ')}
                style={
                  on ? { backgroundColor: 'var(--color-ink-800)' } : undefined
                }
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={start}
        disabled={!supported}
        className="rounded-lg border border-line bg-ink-850 px-6 py-4 text-lg font-medium text-sumi-100 transition-colors hover:border-glow/60 disabled:opacity-50"
        style={{ boxShadow: '0 0 24px -10px var(--color-glow)' }}
      >
        開始
      </button>

      <p className="tnum text-xs text-sumi-500">
        話速 {rate.toFixed(1)}x（設定で変更）
      </p>
    </div>
  )
}

export default ListenScreen
