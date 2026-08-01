/**
 * 統計タブ（機能⑥）。IndexedDB のセッション記録を集計して表示する。
 * デザインは「静かな鍛錬」（ダーク・墨・等幅数字・装飾控えめ、色は最小限）。
 */
import { useEffect, useState } from 'react'
import { allCells, cellToIndex } from '../lib/coords'
import { getAllSessions, type Mode, type Session } from '../lib/storage'
import { now } from '../lib/time'
import {
  dailySeries,
  hasAnyRecord,
  mistakeHeatmap,
  modeSummary,
  streakDays,
  todayAvgMs,
  todayTrialCount,
  type Metric,
} from '../features/stats/statsAgg'

const MODE_ROWS: { mode: Mode; no: string; label: string }[] = [
  { mode: 'listen', no: '00', label: 'ただ読み上げ' },
  { mode: 'tap', no: '01', label: '読み上げ→マス押下' },
  { mode: 'reverse', no: '02', label: 'マスが光る→記号' },
  { mode: 'sequence', no: '03', label: '系列記憶' },
]

function TrendChart({
  points,
  metric,
}: {
  points: { key: string; label: string; value: number | null }[]
  metric: Metric
}) {
  const w = 320
  const h = 90
  const pad = 6
  const present = points.filter((p) => p.value != null) as {
    key: string
    label: string
    value: number
  }[]
  if (present.length === 0) {
    return (
      <div className="flex h-[90px] items-center justify-center text-xs text-sumi-500">
        この期間の記録はありません
      </div>
    )
  }
  const values = present.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const n = points.length
  const x = (i: number) => pad + (i * (w - 2 * pad)) / Math.max(1, n - 1)
  // accuracy は上が良い、avgMs は下が良い→ どちらも「上=良い」に見えるよう反転
  const yNorm = (v: number) =>
    metric === 'avgMs' ? (v - min) / span : 1 - (v - min) / span
  const y = (v: number) => pad + yNorm(v) * (h - 2 * pad)

  // 連続する非null点を結ぶ
  const segs: string[] = []
  let cur: string[] = []
  points.forEach((p, i) => {
    if (p.value == null) {
      if (cur.length) segs.push(cur.join(' '))
      cur = []
    } else {
      cur.push(`${x(i)},${y(p.value)}`)
    }
  })
  if (cur.length) segs.push(cur.join(' '))

  const lastIdx = points.reduce((acc, p, i) => (p.value != null ? i : acc), -1)
  const last = points[lastIdx]

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full"
      role="img"
      aria-label="推移グラフ"
    >
      {segs.map((pts, i) => (
        <polyline
          key={i}
          points={pts}
          fill="none"
          stroke="var(--color-sumi-500)"
          strokeWidth="1.5"
        />
      ))}
      {last && last.value != null && (
        <circle
          cx={x(lastIdx)}
          cy={y(last.value)}
          r="3.5"
          fill="var(--color-glow)"
        />
      )}
    </svg>
  )
}

function Heatmap({ sessions }: { sessions: Session[] }) {
  const { counts, max } = mistakeHeatmap(sessions)
  return (
    <div
      className="grid aspect-square w-full max-w-[280px] grid-cols-9 grid-rows-9 overflow-hidden rounded-sm"
      style={{ backgroundColor: 'var(--color-line)', gap: '1px', padding: '1px' }}
      aria-label="弱点ヒートマップ"
    >
      {allCells().map((cell) => {
        const idx = cellToIndex(cell)
        const c = counts.get(idx) ?? 0
        const op = max > 0 ? c / max : 0
        return (
          <div
            key={idx}
            style={{ backgroundColor: 'var(--color-ink-850)' }}
            className="relative"
          >
            {op > 0 && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: 'var(--color-sumi-300)',
                  opacity: 0.12 + op * 0.55,
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function Stats() {
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [metric, setMetric] = useState<Metric>('accuracy')
  const [days, setDays] = useState<7 | 30>(7)
  const [nowTs] = useState(() => now())

  useEffect(() => {
    let alive = true
    getAllSessions().then((s) => {
      if (alive) setSessions(s)
    })
    return () => {
      alive = false
    }
  }, [])

  if (sessions === null) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-6 text-sm text-sumi-500">
        読み込み中…
      </div>
    )
  }

  if (!hasAnyRecord(sessions)) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
        <h1 className="text-xl font-semibold text-sumi-100">統計</h1>
        <div className="rounded-lg border border-line-soft bg-ink-900/60 p-6 text-center">
          <p className="text-sm text-sumi-300">まだ記録がありません</p>
          <p className="mt-1 text-xs text-sumi-500">
            ホームから「01 読み上げ→マス押下」などを試すと、ここに記録が溜まります。
          </p>
        </div>
      </div>
    )
  }

  const streak = streakDays(sessions, nowTs)
  const tCount = todayTrialCount(sessions, nowTs)
  const tAvg = todayAvgMs(sessions, nowTs)
  const series = dailySeries(sessions, metric, days, nowTs)

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
      <h1 className="text-xl font-semibold text-sumi-100">統計</h1>

      {/* サマリー */}
      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-line-soft p-4 text-center">
          <p className="tnum text-3xl font-semibold text-sumi-100">{streak}</p>
          <p className="mt-1 text-xs text-sumi-500">連続日数</p>
        </div>
        <div className="rounded-lg border border-line-soft p-4 text-center">
          <p className="tnum text-3xl font-semibold text-sumi-100">{tCount}</p>
          <p className="mt-1 text-xs text-sumi-500">今日の回数</p>
        </div>
        <div className="rounded-lg border border-line-soft p-4 text-center">
          <p className="tnum text-3xl font-semibold text-sumi-100">
            {tAvg ?? '—'}
          </p>
          <p className="mt-1 text-xs text-sumi-500">今日の平均ms</p>
        </div>
      </section>

      {/* 推移グラフ */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {(['accuracy', 'avgMs'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                aria-pressed={metric === m}
                className={[
                  'rounded-md border px-3 py-1 text-xs transition-colors',
                  metric === m
                    ? 'border-glow/70 text-sumi-100'
                    : 'border-line text-sumi-500',
                ].join(' ')}
              >
                {m === 'accuracy' ? '正答率' : '平均反応'}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {([7, 30] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                aria-pressed={days === d}
                className={[
                  'tnum rounded-md border px-3 py-1 text-xs transition-colors',
                  days === d
                    ? 'border-glow/70 text-sumi-100'
                    : 'border-line text-sumi-500',
                ].join(' ')}
              >
                {d}日
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-line-soft p-3">
          <TrendChart points={series} metric={metric} />
        </div>
      </section>

      {/* モード別サマリー */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-sumi-300">モード別</h2>
        <div className="overflow-x-auto rounded-lg border border-line-soft">
          <table className="tnum w-full text-right text-sm">
            <thead>
              <tr className="text-xs text-sumi-500">
                <th className="px-3 py-2 text-left font-normal">モード</th>
                <th className="px-2 py-2 font-normal">試行</th>
                <th className="px-2 py-2 font-normal">正答率</th>
                <th className="px-3 py-2 font-normal">平均ms</th>
              </tr>
            </thead>
            <tbody>
              {MODE_ROWS.map(({ mode, no, label }) => {
                const m = modeSummary(sessions, mode)
                if (mode === 'listen') {
                  const min = Math.round(m.durationMs / 60000)
                  return (
                    <tr key={mode} className="border-t border-line-soft">
                      <td className="px-3 py-2 text-left text-sumi-300">
                        <span className="text-sumi-500">{no}</span> {label}
                      </td>
                      <td className="px-2 py-2 text-sumi-100">{m.sessions}回</td>
                      <td className="px-2 py-2 text-sumi-500">—</td>
                      <td className="px-3 py-2 text-sumi-100">{min}分</td>
                    </tr>
                  )
                }
                return (
                  <tr key={mode} className="border-t border-line-soft">
                    <td className="px-3 py-2 text-left text-sumi-300">
                      <span className="text-sumi-500">{no}</span> {label}
                    </td>
                    <td className="px-2 py-2 text-sumi-100">{m.trials}</td>
                    <td className="px-2 py-2 text-sumi-100">
                      {m.accuracy == null
                        ? '—'
                        : `${Math.round(m.accuracy * 100)}%`}
                    </td>
                    <td className="px-3 py-2 text-sumi-100">{m.avgMs ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 弱点ヒートマップ */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm text-sumi-300">弱点マス（間違えやすい所ほど濃い）</h2>
        <div className="flex justify-center">
          <Heatmap sessions={sessions} />
        </div>
      </section>
    </div>
  )
}

export default Stats
