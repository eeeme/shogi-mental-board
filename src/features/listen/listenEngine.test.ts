import { describe, it, expect } from 'vitest'
import {
  FULL_RANGE,
  isInRange,
  normalizeRange,
  randomCellInRange,
  rangeSize,
} from './listenEngine'

describe('normalizeRange', () => {
  it('1〜9 にクランプし min<=max を保証する', () => {
    expect(normalizeRange({ fileMin: 0, fileMax: 12, rankMin: 9, rankMax: 3 })).toEqual({
      fileMin: 1,
      fileMax: 9,
      rankMin: 3,
      rankMax: 9,
    })
  })
})

describe('rangeSize', () => {
  it('全盤は 81', () => {
    expect(rangeSize(FULL_RANGE)).toBe(81)
  })
  it('部分範囲の面積', () => {
    expect(rangeSize({ fileMin: 7, fileMax: 9, rankMin: 1, rankMax: 3 })).toBe(9)
    expect(rangeSize({ fileMin: 5, fileMax: 5, rankMin: 5, rankMax: 5 })).toBe(1)
  })
})

describe('isInRange', () => {
  const range = { fileMin: 7, fileMax: 9, rankMin: 1, rankMax: 3 }
  it('内側は true / 外側は false', () => {
    expect(isInRange({ file: 8, rank: 2 }, range)).toBe(true)
    expect(isInRange({ file: 7, rank: 1 }, range)).toBe(true)
    expect(isInRange({ file: 6, rank: 2 }, range)).toBe(false)
    expect(isInRange({ file: 8, rank: 4 }, range)).toBe(false)
  })
})

describe('randomCellInRange', () => {
  it('常に範囲内のマスを返す（多数試行）', () => {
    const range = { fileMin: 3, fileMax: 6, rankMin: 2, rankMax: 5 }
    for (let i = 0; i < 500; i++) {
      const cell = randomCellInRange(range)
      expect(isInRange(cell, range)).toBe(true)
    }
  })

  it('rng の両端で範囲の下限・上限に到達する', () => {
    const range = { fileMin: 2, fileMax: 8, rankMin: 3, rankMax: 7 }
    expect(randomCellInRange(range, () => 0)).toEqual({ file: 2, rank: 3 })
    // 0.999… は各次元の最大に丸められる
    expect(randomCellInRange(range, () => 0.999999)).toEqual({ file: 8, rank: 7 })
  })

  it('avoid 指定時は直前と同じマスを避ける（2マス以上ある場合）', () => {
    const range = { fileMin: 1, fileMax: 1, rankMin: 1, rankMax: 2 }
    // このレンジは 1一 と 1二 の2マス。
    // rng を [file,rank] の順で消費: 1回目 pick→{1,1}(=avoid) → 再抽選 → {1,2}
    const seq = [0, 0, 0, 0.9]
    let i = 0
    const rng = () => seq[Math.min(i++, seq.length - 1)]
    const cell = randomCellInRange(range, rng, { file: 1, rank: 1 })
    expect(cell).toEqual({ file: 1, rank: 2 })
  })

  it('1マスしかない範囲では avoid を無視してそのマスを返す', () => {
    const range = { fileMin: 5, fileMax: 5, rankMin: 5, rankMax: 5 }
    const cell = randomCellInRange(range, Math.random, { file: 5, rank: 5 })
    expect(cell).toEqual({ file: 5, rank: 5 })
  })
})
