/**
 * 統計の集計ロジック（純粋関数）。IndexedDB から読んだ Session[] を集計する。
 * UI から分離してテスト可能に保つ。
 */
import { cellFromLabel, cellToIndex } from '../../lib/coords'
import type { Mode, Session, Trial } from '../../lib/storage'

export type Metric = 'accuracy' | 'avgMs'

/** ローカル日付キー（YYYY-MM-DD）。 */
export function dayKey(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function startOfDay(ts: number): Date {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d
}

/** 正誤概念のあるモードか（listen は受動なので対象外）。 */
export function isScored(mode: Mode): boolean {
  return mode !== 'listen'
}

function scoredTrials(sessions: Session[]): Trial[] {
  return sessions.filter((s) => isScored(s.mode)).flatMap((s) => s.trials)
}

/** 連続日数（ストリーク）。今日 or 昨日から遡って連続でセッションがある日数。 */
export function streakDays(sessions: Session[], nowTs: number): number {
  const days = new Set(sessions.map((s) => dayKey(s.startedAt)))
  const cursor = startOfDay(nowTs)
  const has = () => days.has(dayKey(cursor.getTime()))
  if (!has()) {
    cursor.setDate(cursor.getDate() - 1)
    if (!has()) return 0
  }
  let n = 0
  while (has()) {
    n += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return n
}

/** 今日の試行数（採点対象）。 */
export function todayTrialCount(sessions: Session[], nowTs: number): number {
  const today = dayKey(nowTs)
  return scoredTrials(sessions.filter((s) => dayKey(s.startedAt) === today))
    .length
}

/** 今日の平均反応時間(ms)。試行がなければ null。 */
export function todayAvgMs(sessions: Session[], nowTs: number): number | null {
  const today = dayKey(nowTs)
  const trials = scoredTrials(
    sessions.filter((s) => dayKey(s.startedAt) === today),
  )
  if (trials.length === 0) return null
  return Math.round(trials.reduce((a, t) => a + t.ms, 0) / trials.length)
}

export type SeriesPoint = { key: string; label: string; value: number | null }

/** 直近 days 日の日別推移。value は accuracy(0〜1) or 平均ms。データなしは null。 */
export function dailySeries(
  sessions: Session[],
  metric: Metric,
  days: number,
  nowTs: number,
): SeriesPoint[] {
  // 日別に採点対象の試行をまとめる
  const byDay = new Map<string, Trial[]>()
  for (const s of sessions) {
    if (!isScored(s.mode)) continue
    const k = dayKey(s.startedAt)
    const arr = byDay.get(k) ?? []
    arr.push(...s.trials)
    byDay.set(k, arr)
  }

  const points: SeriesPoint[] = []
  const cursor = startOfDay(nowTs)
  cursor.setDate(cursor.getDate() - (days - 1))
  for (let i = 0; i < days; i++) {
    const k = dayKey(cursor.getTime())
    const trials = byDay.get(k) ?? []
    let value: number | null = null
    if (trials.length > 0) {
      value =
        metric === 'accuracy'
          ? trials.filter((t) => t.correct).length / trials.length
          : Math.round(trials.reduce((a, t) => a + t.ms, 0) / trials.length)
    }
    const label = `${cursor.getMonth() + 1}/${cursor.getDate()}`
    points.push({ key: k, label, value })
    cursor.setDate(cursor.getDate() + 1)
  }
  return points
}

export type ModeStat = {
  mode: Mode
  sessions: number
  trials: number
  correct: number
  /** 正答率（0〜1）。採点対象で trials>0 のとき。 */
  accuracy: number | null
  /** 平均反応時間(ms)。 */
  avgMs: number | null
  /** 実施時間の合計(ms)（listen 等の受動モード向け）。 */
  durationMs: number
}

/** モード別サマリー。 */
export function modeSummary(sessions: Session[], mode: Mode): ModeStat {
  const ms = sessions.filter((s) => s.mode === mode)
  const trials = ms.flatMap((s) => s.trials)
  const correct = trials.filter((t) => t.correct).length
  const durationMs = ms.reduce(
    (a, s) => a + Math.max(0, s.finishedAt - s.startedAt),
    0,
  )
  return {
    mode,
    sessions: ms.length,
    trials: trials.length,
    correct,
    accuracy: isScored(mode) && trials.length > 0 ? correct / trials.length : null,
    avgMs:
      trials.length > 0
        ? Math.round(trials.reduce((a, t) => a + t.ms, 0) / trials.length)
        : null,
    durationMs,
  }
}

/**
 * 弱点ヒートマップ。単一マス出題（tap/reverse）の誤答を index ごとに数える。
 * @returns counts=index→誤答数, max=最大誤答数（濃淡の正規化用）
 */
export function mistakeHeatmap(sessions: Session[]): {
  counts: Map<number, number>
  max: number
} {
  const counts = new Map<number, number>()
  for (const s of sessions) {
    if (s.mode !== 'tap' && s.mode !== 'reverse') continue
    for (const t of s.trials) {
      if (t.correct) continue
      const cell = cellFromLabel(t.prompt)
      if (!cell) continue
      const idx = cellToIndex(cell)
      counts.set(idx, (counts.get(idx) ?? 0) + 1)
    }
  }
  let max = 0
  for (const v of counts.values()) max = Math.max(max, v)
  return { counts, max }
}

/** 全体で採点対象の試行が1件でもあるか（空状態判定）。 */
export function hasAnyRecord(sessions: Session[]): boolean {
  return sessions.length > 0
}
