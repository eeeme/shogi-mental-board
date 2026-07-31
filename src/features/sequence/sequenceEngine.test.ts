import { describe, it, expect } from 'vitest'
import {
  atLeastOneOn,
  generateSequence,
  judgeSequence,
  toggleChannel,
  type Channels,
} from './sequenceEngine'
import { isInRange } from '../../lib/range'
import type { Cell } from '../../lib/coords'

const ON: Channels = { board: true, symbol: true, audio: true }

describe('チャンネル制約（1つは必ずオン）', () => {
  it('atLeastOneOn', () => {
    expect(atLeastOneOn({ board: true, symbol: false, audio: false })).toBe(true)
    expect(atLeastOneOn({ board: false, symbol: false, audio: false })).toBe(false)
  })

  it('toggleChannel は通常はトグルする', () => {
    expect(toggleChannel(ON, 'audio')).toEqual({
      board: true,
      symbol: true,
      audio: false,
    })
  })

  it('最後の1つは off にできない（元の状態を返す）', () => {
    const onlyBoard: Channels = { board: true, symbol: false, audio: false }
    expect(toggleChannel(onlyBoard, 'board')).toEqual(onlyBoard)
  })

  it('2つonから1つを消すのは可能', () => {
    const two: Channels = { board: true, symbol: true, audio: false }
    expect(toggleChannel(two, 'symbol')).toEqual({
      board: true,
      symbol: false,
      audio: false,
    })
  })
})

describe('generateSequence', () => {
  const range = { fileMin: 1, fileMax: 9, rankMin: 1, rankMax: 9 }
  it('N個を範囲内で生成する', () => {
    const seq = generateSequence(5, range)
    expect(seq).toHaveLength(5)
    seq.forEach((c) => expect(isInRange(c, range)).toBe(true))
  })
  it('連続で同じマスにならない（範囲が2マス以上）', () => {
    const seq = generateSequence(30, { fileMin: 1, fileMax: 2, rankMin: 1, rankMax: 1 })
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]).not.toEqual(seq[i - 1])
    }
  })
  it('N<1 は 1 に丸める', () => {
    expect(generateSequence(0, range)).toHaveLength(1)
  })
})

describe('judgeSequence（順序も一致で正解）', () => {
  const exp: Cell[] = [
    { file: 7, rank: 6 },
    { file: 3, rank: 4 },
    { file: 5, rank: 5 },
  ]

  it('完全一致は correct=true', () => {
    const r = judgeSequence(exp, [...exp])
    expect(r).toEqual({ correct: true, matched: 3, total: 3 })
  })

  it('順序違い（同じ集合）は不正解だが matched は一致分だけ', () => {
    const shuffled: Cell[] = [
      { file: 3, rank: 4 },
      { file: 7, rank: 6 },
      { file: 5, rank: 5 },
    ]
    const r = judgeSequence(exp, shuffled)
    expect(r.correct).toBe(false)
    expect(r.matched).toBe(1) // index2 の 5五 だけ位置一致
    expect(r.total).toBe(3)
  })

  it('位置一部だけ一致は不正解', () => {
    const partial: Cell[] = [
      { file: 7, rank: 6 },
      { file: 9, rank: 9 },
      { file: 5, rank: 5 },
    ]
    const r = judgeSequence(exp, partial)
    expect(r.correct).toBe(false)
    expect(r.matched).toBe(2)
  })

  it('回答数が足りない場合は不正解', () => {
    const r = judgeSequence(exp, [{ file: 7, rank: 6 }])
    expect(r.correct).toBe(false)
    expect(r.matched).toBe(1)
  })

  it('空の出題は correct=false', () => {
    expect(judgeSequence([], []).correct).toBe(false)
  })
})
