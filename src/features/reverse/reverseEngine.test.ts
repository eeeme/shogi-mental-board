import { describe, it, expect } from 'vitest'
import { judgeReverse, randomTarget } from './reverseEngine'
import { isInRange } from '../../lib/range'

describe('judgeReverse', () => {
  it('筋・段が一致で正解', () => {
    expect(judgeReverse({ file: 7, rank: 6 }, { file: 7, rank: 6 })).toBe(true)
  })
  it('筋段が入れ替わると不正解', () => {
    expect(judgeReverse({ file: 7, rank: 6 }, { file: 6, rank: 7 })).toBe(false)
  })
  it('一方でも違えば不正解', () => {
    expect(judgeReverse({ file: 3, rank: 4 }, { file: 3, rank: 5 })).toBe(false)
  })
})

describe('randomTarget', () => {
  it('範囲内のマスを返す', () => {
    const range = { fileMin: 2, fileMax: 8, rankMin: 2, rankMax: 8 }
    for (let i = 0; i < 200; i++) {
      expect(isInRange(randomTarget(range), range)).toBe(true)
    }
  })
})
