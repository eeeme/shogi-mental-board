import { describe, it, expect, beforeEach } from 'vitest'
import {
  FREE_DAILY_LIMIT,
  bump,
  dayKey,
  isLimited,
  loadUsage,
  remaining,
  saveUsage,
  usedToday,
  type Usage,
} from './usage'

const TODAY = '2026-08-01'
const YEST = '2026-07-31'

describe('dayKey', () => {
  it('ローカル日付を YYYY-MM-DD で返す', () => {
    expect(dayKey(new Date(2026, 7, 1, 12).getTime())).toBe('2026-08-01')
  })
})

describe('bump（加算と日付リセット）', () => {
  it('同じ日は加算', () => {
    expect(bump({ day: TODAY, count: 1 }, TODAY)).toEqual({
      day: TODAY,
      count: 2,
    })
  })
  it('日付が変わったら 1 にリセット', () => {
    expect(bump({ day: YEST, count: 3 }, TODAY)).toEqual({
      day: TODAY,
      count: 1,
    })
  })
  it('初回(null)は 1', () => {
    expect(bump(null, TODAY)).toEqual({ day: TODAY, count: 1 })
  })
})

describe('usedToday / remaining / isLimited', () => {
  it('前日の記録は今日 0 回扱い', () => {
    const prev: Usage = { day: YEST, count: 3 }
    expect(usedToday(prev, TODAY)).toBe(0)
    expect(remaining(prev, TODAY, false)).toBe(FREE_DAILY_LIMIT)
    expect(isLimited(prev, TODAY, false)).toBe(false)
  })

  it('3回で無料枠を使い切る', () => {
    const prev: Usage = { day: TODAY, count: 3 }
    expect(usedToday(prev, TODAY)).toBe(3)
    expect(remaining(prev, TODAY, false)).toBe(0)
    expect(isLimited(prev, TODAY, false)).toBe(true)
  })

  it('2回目までは残あり', () => {
    const prev: Usage = { day: TODAY, count: 2 }
    expect(remaining(prev, TODAY, false)).toBe(1)
    expect(isLimited(prev, TODAY, false)).toBe(false)
  })

  it('Pro は無制限（Infinity・非制限）', () => {
    const prev: Usage = { day: TODAY, count: 99 }
    expect(remaining(prev, TODAY, true)).toBe(Infinity)
    expect(isLimited(prev, TODAY, true)).toBe(false)
  })
})

describe('localStorage 保存', () => {
  beforeEach(() => localStorage.clear())
  it('保存・読み込みできる', () => {
    saveUsage('tapCell', { day: TODAY, count: 2 })
    expect(loadUsage('tapCell')).toEqual({ day: TODAY, count: 2 })
  })
  it('未保存は null', () => {
    expect(loadUsage('reverse')).toBeNull()
  })
})
