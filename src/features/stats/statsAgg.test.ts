import { describe, it, expect } from 'vitest'
import {
  dailySeries,
  mistakeHeatmap,
  modeSummary,
  streakDays,
  todayAvgMs,
  todayTrialCount,
} from './statsAgg'
import { cellToIndex } from '../../lib/coords'
import type { Mode, Session, Trial } from '../../lib/storage'

function ts(y: number, mo: number, d: number, h = 12): number {
  return new Date(y, mo - 1, d, h).getTime()
}
let seq = 0
function sess(
  mode: Mode,
  startedAt: number,
  trials: Trial[],
  finishedAt = startedAt + 1000,
): Session {
  return { id: `s${seq++}`, mode, startedAt, finishedAt, trials }
}
function tr(correct: boolean, ms: number, prompt = '5五'): Trial {
  return { prompt, answer: prompt, correct, ms }
}

const NOW = ts(2026, 8, 1)

describe('streakDays', () => {
  it('今日と昨日にあれば 2', () => {
    const s = [
      sess('tap', ts(2026, 8, 1), [tr(true, 100)]),
      sess('tap', ts(2026, 7, 31), [tr(true, 100)]),
    ]
    expect(streakDays(s, NOW)).toBe(2)
  })
  it('昨日だけでも 1（今日未実施でも継続扱い）', () => {
    const s = [sess('tap', ts(2026, 7, 31), [tr(true, 100)])]
    expect(streakDays(s, NOW)).toBe(1)
  })
  it('間が空くと途切れる（今日と2日前 → 1）', () => {
    const s = [
      sess('tap', ts(2026, 8, 1), [tr(true, 100)]),
      sess('tap', ts(2026, 7, 30), [tr(true, 100)]),
    ]
    expect(streakDays(s, NOW)).toBe(1)
  })
  it('記録なしは 0', () => {
    expect(streakDays([], NOW)).toBe(0)
  })
})

describe('today 集計', () => {
  const s = [
    sess('tap', ts(2026, 8, 1), [tr(true, 400), tr(false, 800)]),
    sess('reverse', ts(2026, 8, 1), [tr(true, 600)]),
    sess('tap', ts(2026, 7, 31), [tr(true, 999)]), // 昨日は除外
    sess('listen', ts(2026, 8, 1), []), // 受動は試行0
  ]
  it('今日の試行数（採点対象）', () => {
    expect(todayTrialCount(s, NOW)).toBe(3)
  })
  it('今日の平均ms', () => {
    expect(todayAvgMs(s, NOW)).toBe(Math.round((400 + 800 + 600) / 3))
  })
  it('今日データなしは null', () => {
    expect(todayAvgMs([], NOW)).toBeNull()
  })
})

describe('dailySeries', () => {
  const s = [
    sess('tap', ts(2026, 8, 1), [tr(true, 200), tr(false, 400)]), // 正答率0.5
    sess('tap', ts(2026, 7, 30), [tr(true, 100)]), // 正答率1.0
  ]
  it('accuracy: 直近3日、データなし日は null', () => {
    const pts = dailySeries(s, 'accuracy', 3, NOW)
    expect(pts.map((p) => p.value)).toEqual([1, null, 0.5]) // 7/30, 7/31, 8/1
  })
  it('avgMs: 平均反応時間', () => {
    const pts = dailySeries(s, 'avgMs', 3, NOW)
    expect(pts[2].value).toBe(300) // 8/1 の (200+400)/2
  })
  it('点数は days 個', () => {
    expect(dailySeries(s, 'accuracy', 7, NOW)).toHaveLength(7)
  })
})

describe('modeSummary', () => {
  const s = [
    sess('tap', ts(2026, 8, 1), [tr(true, 300), tr(false, 500)]),
    sess('listen', ts(2026, 8, 1), [], ts(2026, 8, 1) + 60000),
  ]
  it('採点モードは正答率・平均ms', () => {
    const m = modeSummary(s, 'tap')
    expect(m.trials).toBe(2)
    expect(m.correct).toBe(1)
    expect(m.accuracy).toBe(0.5)
    expect(m.avgMs).toBe(400)
  })
  it('listen は正答率 null・実施時間を持つ', () => {
    const m = modeSummary(s, 'listen')
    expect(m.accuracy).toBeNull()
    expect(m.sessions).toBe(1)
    expect(m.durationMs).toBe(60000)
  })
})

describe('mistakeHeatmap', () => {
  it('単一マス出題の誤答のみ数える（tap/reverse）', () => {
    const s = [
      sess('tap', NOW, [tr(false, 100, '7六'), tr(true, 100, '7六')]),
      sess('reverse', NOW, [tr(false, 100, '7六')]),
      sess('sequence', NOW, [tr(false, 100, '1四 6八')]), // 複数マスは無視
    ]
    const { counts, max } = mistakeHeatmap(s)
    expect(counts.get(cellToIndex({ file: 7, rank: 6 }))).toBe(2)
    expect(max).toBe(2)
  })
})
