import { describe, it, expect } from 'vitest'
import {
  BOARD_SIZE,
  CELL_COUNT,
  allCells,
  cellLabel,
  cellToIndex,
  cellYomi,
  cellsEqual,
  fileYomi,
  indexToCell,
  numYomi,
  rankYomi,
  type Cell,
} from './coords'

// テスト側で独立に持つ期待値テーブル（実装と二重化して取り違えを検知する）
const MODERN = ['イチ', 'ニー', 'サン', 'ヨン', 'ゴー', 'ロク', 'ナナ', 'ハチ', 'キュウ']
const CLASSIC = ['イチ', 'ニー', 'サン', 'シ', 'ゴー', 'ロク', 'シチ', 'ハチ', 'ク']
const KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九']

describe('numYomi / fileYomi / rankYomi', () => {
  it('modern の 1〜9 を正しく読む', () => {
    for (let n = 1; n <= 9; n++) {
      expect(numYomi(n, 'modern')).toBe(MODERN[n - 1])
      expect(fileYomi(n, 'modern')).toBe(MODERN[n - 1])
      expect(rankYomi(n, 'modern')).toBe(MODERN[n - 1])
    }
  })

  it('classic の 1〜9 を正しく読む', () => {
    for (let n = 1; n <= 9; n++) {
      expect(numYomi(n, 'classic')).toBe(CLASSIC[n - 1])
      expect(fileYomi(n, 'classic')).toBe(CLASSIC[n - 1])
      expect(rankYomi(n, 'classic')).toBe(CLASSIC[n - 1])
    }
  })

  it('流派で 4・7・9 のみが変わる', () => {
    for (let n = 1; n <= 9; n++) {
      const same = MODERN[n - 1] === CLASSIC[n - 1]
      if (n === 4 || n === 7 || n === 9) {
        expect(same).toBe(false)
      } else {
        expect(same).toBe(true)
      }
    }
  })

  it('既定は modern', () => {
    expect(numYomi(7)).toBe('ナナ')
    expect(fileYomi(4)).toBe('ヨン')
    expect(rankYomi(9)).toBe('キュウ')
  })

  it('カタカナで返す（ひらがな助詞化バグ回避）', () => {
    // 8 は必ず「ハチ」（「ワチ」にならない）
    expect(numYomi(8)).toBe('ハチ')
    // 8九 → ハチキュウ（「わちきゅう」防止）
    expect(cellYomi({ file: 8, rank: 9 })).toBe('ハチキュウ')
    // カタカナのみ（ひらがなを含まない）
    for (let n = 1; n <= 9; n++) {
      expect(numYomi(n)).not.toMatch(/[぀-ゟ]/)
    }
  })

  it('2と5は伸ばして読む（1モーラ対策・筋段両方・流派非依存）', () => {
    expect(numYomi(2, 'modern')).toBe('ニー')
    expect(numYomi(2, 'classic')).toBe('ニー')
    expect(numYomi(5, 'modern')).toBe('ゴー')
    expect(numYomi(5, 'classic')).toBe('ゴー')
    // マス読みでも反映（2五 → ニーゴー）
    expect(cellYomi({ file: 2, rank: 5 })).toBe('ニーゴー')
  })

  it('範囲外・非整数は例外', () => {
    expect(() => numYomi(0)).toThrow(RangeError)
    expect(() => numYomi(10)).toThrow(RangeError)
    expect(() => numYomi(3.5)).toThrow(RangeError)
    expect(() => fileYomi(-1)).toThrow(RangeError)
  })
})

describe('cellYomi', () => {
  it('代表例: 7六 → ナナロク', () => {
    expect(cellYomi({ file: 7, rank: 6 }, 'modern')).toBe('ナナロク')
  })

  it('流派で 4/7/9 を含むマスの読みが変わる', () => {
    expect(cellYomi({ file: 3, rank: 4 }, 'modern')).toBe('サンヨン')
    expect(cellYomi({ file: 3, rank: 4 }, 'classic')).toBe('サンシ')
    expect(cellYomi({ file: 7, rank: 9 }, 'modern')).toBe('ナナキュウ')
    expect(cellYomi({ file: 7, rank: 9 }, 'classic')).toBe('シチク')
  })

  it('全 81 マスの読みが「筋読み+段読み」に一致する（modern/classic 両方）', () => {
    for (let file = 1; file <= 9; file++) {
      for (let rank = 1; rank <= 9; rank++) {
        expect(cellYomi({ file, rank }, 'modern')).toBe(
          MODERN[file - 1] + MODERN[rank - 1],
        )
        expect(cellYomi({ file, rank }, 'classic')).toBe(
          CLASSIC[file - 1] + CLASSIC[rank - 1],
        )
      }
    }
  })

  it('既定は modern', () => {
    expect(cellYomi({ file: 4, rank: 7 })).toBe('ヨンナナ')
  })
})

describe('cellLabel', () => {
  it('筋は算用数字・段は漢数字', () => {
    expect(cellLabel({ file: 7, rank: 6 })).toBe('7六')
    expect(cellLabel({ file: 1, rank: 1 })).toBe('1一')
    expect(cellLabel({ file: 9, rank: 9 })).toBe('9九')
  })

  it('全マスで「算用数字+対応漢数字」', () => {
    for (let file = 1; file <= 9; file++) {
      for (let rank = 1; rank <= 9; rank++) {
        expect(cellLabel({ file, rank })).toBe(`${file}${KANJI[rank - 1]}`)
      }
    }
  })
})

describe('cellToIndex / indexToCell', () => {
  it('端の値（四隅と対角）', () => {
    // 先手視点: file9 が左端、file1 が右端、rank1 が上端、rank9 が下端
    expect(cellToIndex({ file: 9, rank: 1 })).toBe(0) // 左上
    expect(cellToIndex({ file: 1, rank: 1 })).toBe(8) // 右上
    expect(cellToIndex({ file: 9, rank: 9 })).toBe(72) // 左下
    expect(cellToIndex({ file: 1, rank: 9 })).toBe(80) // 右下
    expect(cellToIndex({ file: 5, rank: 5 })).toBe(40) // 中央

    expect(indexToCell(0)).toEqual({ file: 9, rank: 1 })
    expect(indexToCell(8)).toEqual({ file: 1, rank: 1 })
    expect(indexToCell(72)).toEqual({ file: 9, rank: 9 })
    expect(indexToCell(80)).toEqual({ file: 1, rank: 9 })
    expect(indexToCell(40)).toEqual({ file: 5, rank: 5 })
  })

  it('全 81 マスで cell→index→cell が往復する', () => {
    for (let file = 1; file <= 9; file++) {
      for (let rank = 1; rank <= 9; rank++) {
        const cell: Cell = { file, rank }
        const idx = cellToIndex(cell)
        expect(idx).toBeGreaterThanOrEqual(0)
        expect(idx).toBeLessThan(CELL_COUNT)
        expect(indexToCell(idx)).toEqual(cell)
      }
    }
  })

  it('全 81 index で index→cell→index が往復し、index は一意', () => {
    const seen = new Set<number>()
    for (let i = 0; i < CELL_COUNT; i++) {
      const cell = indexToCell(i)
      expect(cellToIndex(cell)).toBe(i)
      seen.add(i)
    }
    expect(seen.size).toBe(CELL_COUNT)
  })

  it('範囲外・非整数は例外', () => {
    expect(() => cellToIndex({ file: 0, rank: 1 })).toThrow(RangeError)
    expect(() => cellToIndex({ file: 1, rank: 10 })).toThrow(RangeError)
    expect(() => indexToCell(-1)).toThrow(RangeError)
    expect(() => indexToCell(CELL_COUNT)).toThrow(RangeError)
    expect(() => indexToCell(1.5)).toThrow(RangeError)
  })
})

describe('allCells / cellsEqual / 定数', () => {
  it('allCells は 81 マスを index 昇順で返す', () => {
    const cells = allCells()
    expect(cells).toHaveLength(CELL_COUNT)
    cells.forEach((cell, i) => expect(cellToIndex(cell)).toBe(i))
  })

  it('cellsEqual', () => {
    expect(cellsEqual({ file: 2, rank: 3 }, { file: 2, rank: 3 })).toBe(true)
    expect(cellsEqual({ file: 2, rank: 3 }, { file: 3, rank: 2 })).toBe(false)
  })

  it('盤サイズ定数', () => {
    expect(BOARD_SIZE).toBe(9)
    expect(CELL_COUNT).toBe(81)
  })
})
